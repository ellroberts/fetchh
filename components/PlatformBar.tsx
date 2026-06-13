import React from 'react'

function getPlatformColor(platform: string): string {
  const p = platform.toLowerCase()
  if (p.includes('claude') || p.includes('anthropic')) return 'var(--color-accent-teal)'
  if (p.includes('chatgpt') || p.includes('openai')) return 'var(--color-accent-green)'
  if (p.includes('gemini') || p.includes('google')) return 'var(--color-accent-blue)'
  if (p.includes('grok')) return 'var(--color-text-secondary)'
  if (p.includes('perplexity')) return 'var(--color-accent-rose)'
  return 'var(--color-accent-amber)'
}

function getPlatformLabel(platform: string): string {
  const p = platform.toLowerCase()
  if (p.includes('claude') || p.includes('anthropic')) return 'Claude.ai'
  if (p.includes('chatgpt') || p.includes('openai')) return 'ChatGPT'
  if (p.includes('gemini') || p.includes('google')) return 'Gemini'
  if (p.includes('grok')) return 'Grok'
  if (p.includes('perplexity')) return 'Perplexity'
  return platform
}

interface PlatformBarProps {
  platform: string
  count: number
  total: number
}

export function PlatformBar({ platform, count, total }: PlatformBarProps) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0
  const color = getPlatformColor(platform)
  const label = getPlatformLabel(platform)

  return (
    <div className="flex items-center gap-3">
      <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', width: '60px', flexShrink: 0 }}>{label}</span>
      <div style={{ flex: 1, backgroundColor: 'var(--color-border-subtle)', borderRadius: '999px', height: '8px' }}>
        <div style={{ height: '8px', borderRadius: '999px', transition: 'all 0.5s', width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)', color: 'var(--color-text-title)', width: '32px', textAlign: 'right' }}>{count}</span>
    </div>
  )
}

export default PlatformBar