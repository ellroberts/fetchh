/**
 * digest-pipeline.ts
 *
 * Core digest logic shared between the CLI script (scripts/run-digest.ts)
 * and the Vercel cron route (app/api/cron/digest/route.ts).
 *
 * runDigestForUser() fetches last-7-days videos for each channel, extracts
 * transcripts, runs the v2 prompt through Claude, and sends the email.
 * It does NOT write to disk — that's CLI-only behaviour kept in the script.
 */

import { Resend } from 'resend'
import { EXTRACTION_PROMPT_DESIGNERS } from './extraction-prompt'

// ── Config ────────────────────────────────────────────────────────────────────

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages'
const SUPADATA_BASE = 'https://api.supadata.ai/v1'
const MODEL = 'claude-sonnet-4-6'
const CHANNEL_VIDEO_FETCH_LIMIT = 30
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000
const RETRY_DELAYS_MS = [1000, 3000]

// ── Types ─────────────────────────────────────────────────────────────────────

export interface DigestCard {
  channelUrl: string
  channelName: string
  videoId: string
  videoTitle: string
  card: string
}

export interface DigestResult {
  email: string
  dateStr: string
  cards: DigestCard[]
  byChannel: Map<string, Array<{ videoTitle: string; videoId?: string; card: string }>>
}

export interface VideoMeta {
  id: string
  title: string
  uploadDate: string | null
  channelName: string
}

export type MetaResult =
  | { ok: true; meta: VideoMeta }
  | { ok: false; reason: 'not-found' }
  | { ok: false; reason: 'fetch-failed'; videoId: string; status: number }

export type TranscriptResult =
  | { ok: true; text: string }
  | { ok: false; reason: 'no-transcript' }
  | { ok: false; reason: 'fetch-failed'; status: number }

// ── Helpers ───────────────────────────────────────────────────────────────────

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms))
}

function supafetch(path: string) {
  const key = process.env.SUPADATA_API_KEY
  return fetch(`${SUPADATA_BASE}${path}`, {
    headers: { 'x-api-key': key!, 'Content-Type': 'application/json' },
  })
}

async function fetchWithRetry(url: string): Promise<Response> {
  let lastRes: Response | undefined
  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    if (attempt > 0) await sleep(RETRY_DELAYS_MS[attempt - 1])
    const res = await supafetch(url)
    if (res.ok || res.status === 404) return res
    lastRes = res
  }
  return lastRes!
}

async function getChannelVideoIds(channelUrl: string): Promise<string[]> {
  const params = new URLSearchParams({
    id: channelUrl,
    limit: String(CHANNEL_VIDEO_FETCH_LIMIT),
    type: 'video',
  })
  const res = await supafetch(`/youtube/channel/videos?${params}`)
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`channel/videos failed (${res.status}): ${body}`)
  }
  const data = await res.json() as { videoIds: string[]; shortIds: string[]; liveIds: string[] }
  return data.videoIds ?? []
}

export async function getVideoMeta(videoId: string): Promise<MetaResult> {
  const res = await fetchWithRetry(`/youtube/video?id=${encodeURIComponent(videoId)}`)
  if (res.status === 404) return { ok: false, reason: 'not-found' }
  if (!res.ok) return { ok: false, reason: 'fetch-failed', videoId, status: res.status }
  const data = await res.json()
  return {
    ok: true,
    meta: {
      id: videoId,
      title: data.title ?? videoId,
      uploadDate: data.uploadDate ?? null,
      channelName: data.channel?.name ?? 'Unknown channel',
    },
  }
}

async function getRecentVideoMetas(
  videoIds: string[],
  cutoff: number,
  log: (msg: string) => void,
): Promise<{ recent: VideoMeta[]; failed: Array<{ videoId: string; status: number }> }> {
  const recent: VideoMeta[] = []
  const failed: Array<{ videoId: string; status: number }> = []

  for (let i = 0; i < videoIds.length; i++) {
    if (i > 0) await sleep(300)
    const result = await getVideoMeta(videoIds[i])

    if (!result.ok) {
      if (result.reason === 'fetch-failed') {
        failed.push({ videoId: result.videoId, status: result.status })
        log(`  ⚠ Metadata fetch failed for ${result.videoId} (HTTP ${result.status}) — skipped`)
      }
      continue
    }

    const { meta } = result
    if (!meta.uploadDate) continue

    if (new Date(meta.uploadDate).getTime() < cutoff) break
    recent.push(meta)
  }

  return { recent, failed }
}

export async function getTranscript(videoId: string): Promise<TranscriptResult> {
  const params = new URLSearchParams({ videoId, text: 'true' })
  const res = await fetchWithRetry(`/youtube/transcript?${params}`)
  if (res.status === 404) return { ok: false, reason: 'no-transcript' }
  if (!res.ok) return { ok: false, reason: 'fetch-failed', status: res.status }
  const data = await res.json()
  if (typeof data.content === 'string' && data.content.trim()) {
    return { ok: true, text: data.content }
  }
  return { ok: false, reason: 'no-transcript' }
}

export async function extractWithClaude(
  transcript: string,
  channelName: string,
  videoTitle: string,
  prompt: string = EXTRACTION_PROMPT_DESIGNERS,
): Promise<string> {
  const userContent = `${prompt}\n\n---\n\nChannel: ${channelName}\nVideo: ${videoTitle}\n\nTranscript:\n${transcript}`

  const res = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 2048,
      messages: [{ role: 'user', content: userContent }],
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Anthropic API error (${res.status}): ${body}`)
  }

  const data = await res.json()
  return data.content?.[0]?.text ?? ''
}

// ── Email ─────────────────────────────────────────────────────────────────────

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function inlineMarkdown(text: string): string {
  return escapeHtml(text).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
}

export function cardToHtml(cardText: string): string {
  // Strip the leading "# Channel: ..." and "## Video: ..." header lines the extraction prompt prepends
  const stripped = cardText
    .replace(/^#\s+[^\n]+\n?/, '')
    .replace(/^##\s+Video:[^\n]+\n?/m, '')
  const lines = stripped.split('\n')
  const out: string[] = []

  const LABEL_STYLE = 'margin:20px 0 4px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#666;'
  const BODY_STYLE = 'margin:4px 0;font-size:15px;color:#374151;line-height:1.6;'

  for (const raw of lines) {
    const line = raw.trimEnd()

    if (!line) { out.push('<br>'); continue }

    if (line.startsWith('### ') || line.startsWith('## ') || line.startsWith('# ')) {
      const text = line.replace(/^#{1,3}\s+/, '')
      out.push(`<p style="${LABEL_STYLE}">${inlineMarkdown(text)}</p>`)
      continue
    }
    if (/^[-*•]\s/.test(line)) {
      out.push(`<li style="margin:3px 0;font-size:15px;color:#374151;line-height:1.6;">${inlineMarkdown(line.slice(2).trim())}</li>`)
      continue
    }
    out.push(`<p style="${BODY_STYLE}">${inlineMarkdown(line)}</p>`)
  }

  return out.join('\n')
}

export function buildEmailHtml(
  dateStr: string,
  recipientEmail: string,
  byChannel: Map<string, Array<{ videoTitle: string; videoId?: string; card: string }>>,
): string {
  const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif"

  const channelSections = Array.from(byChannel.entries()).map(([channelName, channelCards]) => {
    const videoCards = channelCards.map(({ videoTitle, videoId, card }, i) => {
      const isLast = i === channelCards.length - 1
      const youtubeUrl = videoId ? `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}` : null
      const thumbnailUrl = videoId ? `https://img.youtube.com/vi/${encodeURIComponent(videoId)}/maxresdefault.jpg` : null

      const titleHtml = youtubeUrl
        ? `<a href="${youtubeUrl}" style="font-size:17px;font-weight:700;color:#111;text-decoration:none;line-height:1.3;display:block;">${escapeHtml(videoTitle)}</a>`
        : `<span style="font-size:17px;font-weight:700;color:#111;line-height:1.3;display:block;">${escapeHtml(videoTitle)}</span>`

      const thumbnailHtml = thumbnailUrl
        ? `<a href="${youtubeUrl}" style="display:block;margin-bottom:14px;"><img src="${thumbnailUrl}" alt="" width="560" style="display:block;width:100%;border-radius:4px;"></a>`
        : ''

      const divider = !isLast ? '<hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0 0;">' : ''

      return `
      <div style="padding:20px;${isLast ? '' : 'padding-bottom:0;'}">
        ${thumbnailHtml}
        <div style="margin-bottom:14px;">${titleHtml}</div>
        ${cardToHtml(card)}
        ${divider}
      </div>`
    }).join('\n')

    return `
      <div style="background:#f9f9f9;border-radius:8px;margin-bottom:24px;overflow:hidden;">
        <div style="padding:12px 20px 10px;border-bottom:1px solid #e5e7eb;">
          <p style="margin:0;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#888;">${escapeHtml(channelName)}</p>
        </div>
        ${videoCards}
      </div>`
  }).join('\n')

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#ffffff;font-family:${FONT};font-size:15px;line-height:1.6;">
  <div style="max-width:600px;margin:0 auto;padding:32px 16px;">
    <div style="background:#111;border-radius:8px 8px 0 0;padding:24px 28px;margin-bottom:0;">
      <p style="margin:0;font-size:11px;font-weight:700;letter-spacing:0.1em;color:#9ca3af;text-transform:uppercase;">Digestt</p>
      <h1 style="margin:6px 0 0;font-size:22px;font-weight:700;color:#fff;">${escapeHtml(dateStr)}</h1>
    </div>
    <div style="background:#ffffff;padding:24px 0;">
      ${channelSections}
    </div>
    <div style="padding:16px 0;text-align:center;border-top:1px solid #e5e7eb;">
      <p style="margin:0;font-size:12px;color:#9ca3af;">Sent to ${escapeHtml(recipientEmail)} · Last 7 days of videos</p>
    </div>
  </div>
</body>
</html>`
}

async function sendDigestEmail(
  recipientEmail: string,
  dateStr: string,
  byChannel: Map<string, Array<{ videoTitle: string; videoId?: string; card: string }>>,
  log: (msg: string) => void,
): Promise<void> {
  const resendKey = process.env.RESEND_API_KEY
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'

  if (!resendKey) {
    log('  ℹ RESEND_API_KEY not set — skipping email send')
    return
  }

  const resend = new Resend(resendKey)
  const html = buildEmailHtml(dateStr, recipientEmail, byChannel)
  const totalCards = Array.from(byChannel.values()).reduce((n, cards) => n + cards.length, 0)

  const { error } = await resend.emails.send({
    from: fromEmail,
    to: recipientEmail,
    subject: `Your Digestt — ${dateStr} (${totalCards} video${totalCards === 1 ? '' : 's'})`,
    html,
  })

  if (error) {
    log(`  ⚠ Email send failed: ${JSON.stringify(error)}`)
  } else {
    log(`  ✉ Email sent to ${recipientEmail}`)
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Run the full digest pipeline for one user.
 * @param email   recipient address
 * @param channels list of YouTube channel URLs from their signup row
 * @param log     logging sink — console.log for CLI, custom for cron route
 * @returns DigestResult with cards grouped by channel, or null if no cards
 */
export async function runDigestForUser(
  email: string,
  channels: string[],
  log: (msg: string) => void,
): Promise<DigestResult | null> {
  const cutoff = Date.now() - SEVEN_DAYS_MS
  const dateStr = new Date().toISOString().slice(0, 10)
  const cards: DigestCard[] = []

  for (const channelUrl of channels) {
    log(`Channel: ${channelUrl}`)

    let videoIds: string[]
    try {
      videoIds = await getChannelVideoIds(channelUrl)
    } catch (err) {
      log(`  ⚠ Could not fetch video list: ${(err as Error).message}`)
      continue
    }

    log(`  ${videoIds.length} recent video IDs fetched`)

    const { recent: recentVideos, failed: metaFailed } = await getRecentVideoMetas(videoIds, cutoff, log)

    log(`  ${recentVideos.length} video(s) in the last 7 days${metaFailed.length ? `, ${metaFailed.length} metadata fetch(es) failed` : ''}`)

    if (recentVideos.length === 0 && metaFailed.length === 0) continue

    for (const video of recentVideos) {
      log(`  → "${video.title}"`)

      const transcriptResult = await getTranscript(video.id)
      if (!transcriptResult.ok) {
        log(transcriptResult.reason === 'fetch-failed'
          ? `    ⚠ Transcript fetch failed (HTTP ${transcriptResult.status}) — skipped`
          : `    ⚠ No transcript available — skipped`)
        continue
      }

      log(`    Transcript: ${transcriptResult.text.length.toLocaleString()} chars — extracting…`)

      let card: string
      try {
        card = await extractWithClaude(transcriptResult.text, video.channelName, video.title)
      } catch (err) {
        log(`    ⚠ Claude extraction failed: ${(err as Error).message}`)
        continue
      }

      cards.push({ channelUrl, channelName: video.channelName, videoId: video.id, videoTitle: video.title, card })
      log(`    ✓ Card extracted`)
    }
  }

  if (cards.length === 0) return null

  const byChannel = new Map<string, Array<{ videoTitle: string; videoId?: string; card: string }>>()
  for (const c of cards) {
    if (!byChannel.has(c.channelName)) byChannel.set(c.channelName, [])
    byChannel.get(c.channelName)!.push({ videoTitle: c.videoTitle, videoId: c.videoId, card: c.card })
  }

  await sendDigestEmail(email, dateStr, byChannel, log)

  return { email, dateStr, cards, byChannel }
}
