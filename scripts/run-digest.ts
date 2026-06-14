#!/usr/bin/env tsx
/**
 * run-digest.ts
 * Usage: npm run digest -- <email>
 *
 * Reads the digest_signups row for the given email, fetches the last 7 days
 * of videos from each channel via Supadata, extracts transcripts, runs the
 * v2 extraction prompt through Claude Sonnet, and writes a markdown digest
 * to output/digest-<email>-<date>.md.
 */

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'
import { EXTRACTION_PROMPT } from '../lib/extraction-prompt'

// ── Config ────────────────────────────────────────────────────────────────────

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY!
const SUPADATA_API_KEY = process.env.SUPADATA_API_KEY!

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages'
const SUPADATA_BASE = 'https://api.supadata.ai/v1'
const MODEL = 'claude-sonnet-4-20250514'

// Fetch up to this many recent video IDs per channel to look for last-7-days videos
const CHANNEL_VIDEO_FETCH_LIMIT = 30
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000

// ── Helpers ───────────────────────────────────────────────────────────────────

function supafetch(path: string, opts?: RequestInit) {
  return fetch(`${SUPADATA_BASE}${path}`, {
    ...opts,
    headers: { 'x-api-key': SUPADATA_API_KEY, 'Content-Type': 'application/json', ...opts?.headers },
  })
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

interface VideoMeta {
  id: string
  title: string
  uploadDate: string | null
  channelName: string
}

async function getVideoMeta(videoId: string): Promise<VideoMeta | null> {
  const res = await supafetch(`/youtube/video?id=${encodeURIComponent(videoId)}`)
  if (!res.ok) return null
  const data = await res.json()
  return {
    id: videoId,
    title: data.title ?? videoId,
    uploadDate: data.uploadDate ?? null,
    channelName: data.channel?.name ?? 'Unknown channel',
  }
}

async function getTranscript(videoId: string): Promise<string | null> {
  const params = new URLSearchParams({ videoId, text: 'true' })
  const res = await supafetch(`/youtube/transcript?${params}`)
  if (!res.ok) return null
  const data = await res.json()
  if (typeof data.content === 'string' && data.content.trim()) return data.content
  return null
}

async function extractWithClaude(transcript: string, channelName: string, videoTitle: string): Promise<string> {
  const userContent = `${EXTRACTION_PROMPT}\n\n---\n\nChannel: ${channelName}\nVideo: ${videoTitle}\n\nTranscript:\n${transcript}`

  const res = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
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

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const email = process.argv[2]?.trim()
  if (!email) {
    console.error('Usage: npm run digest -- <email>')
    process.exit(1)
  }

  for (const [name, val] of [
    ['NEXT_PUBLIC_SUPABASE_URL', SUPABASE_URL],
    ['SUPABASE_SERVICE_ROLE_KEY', SUPABASE_SERVICE_KEY],
    ['ANTHROPIC_API_KEY', ANTHROPIC_API_KEY],
    ['SUPADATA_API_KEY', SUPADATA_API_KEY],
  ] as const) {
    if (!val) { console.error(`Missing env var: ${name}`); process.exit(1) }
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

  // 1. Read signup row
  const { data: signup, error } = await supabase
    .from('digest_signups')
    .select('email, channels')
    .eq('email', email.toLowerCase())
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (error || !signup) {
    console.error(`No signup found for ${email}`)
    process.exit(1)
  }

  const channels: string[] = signup.channels ?? []
  if (channels.length === 0) {
    console.error('Signup row has no channel URLs.')
    process.exit(1)
  }

  console.log(`\n▶ Digest for ${email} — ${channels.length} channel(s)\n`)

  const cutoff = Date.now() - SEVEN_DAYS_MS
  const cards: Array<{ channelUrl: string; channelName: string; videoTitle: string; card: string }> = []

  // 2. Per channel: get videos, filter by date, fetch transcripts, extract
  for (const channelUrl of channels) {
    console.log(`Channel: ${channelUrl}`)

    let videoIds: string[]
    try {
      videoIds = await getChannelVideoIds(channelUrl)
    } catch (err) {
      console.warn(`  ⚠ Could not fetch video list: ${(err as Error).message}`)
      continue
    }

    console.log(`  ${videoIds.length} recent video IDs fetched`)

    // Fetch metadata for all IDs in parallel, filter to last 7 days
    const metas = await Promise.all(videoIds.map(getVideoMeta))
    const recentVideos = metas.filter((m): m is VideoMeta => {
      if (!m || !m.uploadDate) return false
      return new Date(m.uploadDate).getTime() >= cutoff
    })

    console.log(`  ${recentVideos.length} video(s) in the last 7 days`)

    if (recentVideos.length === 0) continue

    for (const video of recentVideos) {
      console.log(`  → "${video.title}"`)

      const transcript = await getTranscript(video.id)
      if (!transcript) {
        console.log(`    ⚠ No transcript — skipping`)
        continue
      }

      console.log(`    Transcript: ${transcript.length.toLocaleString()} chars — extracting…`)

      let card: string
      try {
        card = await extractWithClaude(transcript, video.channelName, video.title)
      } catch (err) {
        console.warn(`    ⚠ Claude extraction failed: ${(err as Error).message}`)
        continue
      }

      cards.push({ channelUrl, channelName: video.channelName, videoTitle: video.title, card })
      console.log(`    ✓ Card extracted`)
    }
  }

  if (cards.length === 0) {
    console.log('\nNo cards generated — no transcribable videos in the last 7 days.')
    process.exit(0)
  }

  // 3. Write output file
  const dateStr = new Date().toISOString().slice(0, 10)
  const safeEmail = email.replace(/[^a-zA-Z0-9._-]/g, '_')
  const outputDir = path.join(process.cwd(), 'output')
  fs.mkdirSync(outputDir, { recursive: true })
  const outputPath = path.join(outputDir, `digest-${safeEmail}-${dateStr}.md`)

  // Group cards by channel name
  const byChannel = new Map<string, typeof cards>()
  for (const c of cards) {
    const key = c.channelName
    if (!byChannel.has(key)) byChannel.set(key, [])
    byChannel.get(key)!.push(c)
  }

  const lines: string[] = [
    `# Niche Digest — ${dateStr}`,
    `**For:** ${email}  `,
    `**Period:** Last 7 days  `,
    `**Videos processed:** ${cards.length}`,
    '',
    '---',
    '',
  ]

  for (const [channelName, channelCards] of byChannel) {
    lines.push(`## ${channelName}`, '')
    for (const { videoTitle, card } of channelCards) {
      lines.push(`### ${videoTitle}`, '', card, '', '---', '')
    }
  }

  fs.writeFileSync(outputPath, lines.join('\n'), 'utf8')
  console.log(`\n✅ Digest written to: ${outputPath}\n`)
}

main().catch((err) => {
  console.error('Fatal:', err)
  process.exit(1)
})
