#!/usr/bin/env tsx
/**
 * run-digest.ts
 * Usage:
 *   npm run digest -- <email>       run pipeline for one signup
 *   npm run digest -- --preview     render latest .md to output/preview.html
 */

import * as fs from 'fs'
import * as path from 'path'

// Load .env.local before anything else reads process.env
const envPath = path.resolve(process.cwd(), '.env.local')
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '')
    if (!(key in process.env)) process.env[key] = val
  }
}

import { createClient } from '@supabase/supabase-js'
import { runDigestForUser, buildEmailHtml } from '../lib/digest-pipeline'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

// ── Preview mode ──────────────────────────────────────────────────────────────

function parseMdFile(mdPath: string): {
  dateStr: string
  recipientEmail: string
  byChannel: Map<string, Array<{ videoTitle: string; card: string }>>
} {
  const raw = fs.readFileSync(mdPath, 'utf8')
  const lines = raw.split('\n')

  let dateStr = ''
  let recipientEmail = ''
  const byChannel = new Map<string, Array<{ videoTitle: string; card: string }>>()

  let currentChannel = ''
  let currentTitle = ''
  let cardLines: string[] = []
  let inCard = false

  const flushCard = () => {
    if (currentChannel && currentTitle && cardLines.length) {
      if (!byChannel.has(currentChannel)) byChannel.set(currentChannel, [])
      byChannel.get(currentChannel)!.push({
        videoTitle: currentTitle,
        card: cardLines.join('\n').trim(),
      })
    }
    cardLines = []
    inCard = false
  }

  for (const line of lines) {
    const dateMatch = line.match(/^# Niche Digest — (.+)/)
    if (dateMatch) { dateStr = dateMatch[1]; continue }

    const emailMatch = line.match(/^\*\*For:\*\*\s+(.+?)\s*$/)
    if (emailMatch) { recipientEmail = emailMatch[1]; continue }

    if (line.trim() === '---') { flushCard(); continue }

    if (line.startsWith('## ') && !inCard) {
      flushCard()
      currentChannel = line.slice(3).trim()
      currentTitle = ''
      continue
    }

    if (line.startsWith('### ') && !inCard) {
      flushCard()
      currentTitle = line.slice(4).trim()
      inCard = true
      continue
    }

    if (inCard) cardLines.push(line)
  }

  flushCard()
  return { dateStr, recipientEmail, byChannel }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2)

  if (args[0] === '--preview') {
    const outputDir = path.join(process.cwd(), 'output')
    const mdFiles = fs.readdirSync(outputDir)
      .filter(f => f.startsWith('digest-') && f.endsWith('.md'))
      .sort().reverse()

    if (mdFiles.length === 0) {
      console.error('No digest .md files found in output/')
      process.exit(1)
    }

    const mdPath = path.join(outputDir, mdFiles[0])
    console.log(`Rendering preview from: ${mdPath}`)

    const { dateStr, recipientEmail, byChannel } = parseMdFile(mdPath)
    const html = buildEmailHtml(dateStr, recipientEmail, byChannel)
    const previewPath = path.join(outputDir, 'preview.html')
    fs.writeFileSync(previewPath, html, 'utf8')
    console.log(`✅ Preview written to: ${previewPath}`)
    console.log(`   Open with: open ${previewPath}`)
    return
  }

  const email = args[0]?.trim()
  if (!email) {
    console.error('Usage: npm run digest -- <email>')
    console.error('       npm run digest -- --preview')
    process.exit(1)
  }

  for (const [name, val] of [
    ['NEXT_PUBLIC_SUPABASE_URL', SUPABASE_URL],
    ['SUPABASE_SERVICE_ROLE_KEY', SUPABASE_SERVICE_KEY],
    ['ANTHROPIC_API_KEY', process.env.ANTHROPIC_API_KEY],
    ['SUPADATA_API_KEY', process.env.SUPADATA_API_KEY],
  ] as const) {
    if (!val) { console.error(`Missing env var: ${name}`); process.exit(1) }
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

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

  const result = await runDigestForUser(email, channels, console.log)

  if (!result) {
    console.log('\nNo cards generated — no transcribable videos in the last 7 days.')
    process.exit(0)
  }

  // Write markdown file to output/
  const safeEmail = email.replace(/[^a-zA-Z0-9._-]/g, '_')
  const outputDir = path.join(process.cwd(), 'output')
  fs.mkdirSync(outputDir, { recursive: true })
  const outputPath = path.join(outputDir, `digest-${safeEmail}-${result.dateStr}.md`)

  const lines: string[] = [
    `# Niche Digest — ${result.dateStr}`,
    `**For:** ${email}  `,
    `**Period:** Last 7 days  `,
    `**Videos processed:** ${result.cards.length}`,
    '',
    '---',
    '',
  ]

  for (const [channelName, channelCards] of result.byChannel) {
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
