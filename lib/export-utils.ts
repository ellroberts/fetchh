export type ExportFormat = 'json' | 'markdown' | 'txt'

interface Message {
  role: string
  content: string | { type: string; text?: string }[]
}

export interface ExportData {
  title: string
  platform: string
  exportDate: string
  message_count: number
  url?: string | null
  tags?: string[] | null
  summary?: string | null
  messages: Message[]
}

function getMessageText(content: Message['content']): string {
  if (typeof content === 'string') return content
  if (Array.isArray(content)) {
    return content
      .filter(b => b.type === 'text' && b.text)
      .map(b => b.text!)
      .join('\n')
  }
  return ''
}

export function convertToMarkdown(data: ExportData): string {
  const lines: string[] = []
  lines.push(`# ${data.title}`)
  lines.push('')
  lines.push(`**Platform:** ${data.platform}`)
  lines.push(`**Exported:** ${new Date(data.exportDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`)
  lines.push(`**Messages:** ${data.message_count}`)
  if (data.tags?.length) lines.push(`**Tags:** ${data.tags.join(', ')}`)
  if (data.url) lines.push(`**Source:** ${data.url}`)
  if (data.summary) {
    lines.push('')
    lines.push(`> ${data.summary}`)
  }
  lines.push('')
  lines.push('---')
  lines.push('')
  for (const msg of data.messages) {
    const role = msg.role === 'user' ? '**You**' : '**Assistant**'
    const text = getMessageText(msg.content)
    lines.push(role)
    lines.push('')
    lines.push(text)
    lines.push('')
    lines.push('---')
    lines.push('')
  }
  return lines.join('\n')
}

export function convertToPlainText(data: ExportData): string {
  const lines: string[] = []
  lines.push(data.title)
  lines.push('='.repeat(data.title.length))
  lines.push('')
  lines.push(`Platform: ${data.platform}`)
  lines.push(`Exported: ${new Date(data.exportDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`)
  lines.push(`Messages: ${data.message_count}`)
  if (data.tags?.length) lines.push(`Tags: ${data.tags.join(', ')}`)
  if (data.url) lines.push(`Source: ${data.url}`)
  if (data.summary) {
    lines.push('')
    lines.push(data.summary)
  }
  lines.push('')
  lines.push('-'.repeat(40))
  lines.push('')
  for (const msg of data.messages) {
    const role = msg.role === 'user' ? 'You' : 'Assistant'
    const text = getMessageText(msg.content)
    lines.push(`[${role}]`)
    lines.push(text)
    lines.push('')
    lines.push('-'.repeat(40))
    lines.push('')
  }
  return lines.join('\n')
}

export function triggerDownload(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export function buildExportFilename(title: string, format: ExportFormat): string {
  const slug = (title || 'conversation')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60)
  const date = new Date().toISOString().split('T')[0]
  const ext = format === 'json' ? 'json' : format === 'markdown' ? 'md' : 'txt'
  return `${slug}-${date}.${ext}`
}
