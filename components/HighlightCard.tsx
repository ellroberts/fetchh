'use client'

import { MessageSquare, ExternalLink, Calendar } from 'lucide-react'

interface HighlightCardProps {
  id: string
  highlightedText: string
  tags?: string[]
  sourcePlatform: string
  sourceUrl: string
  sourceTitle?: string
  createdAt: string
  onClick?: () => void
}

function getPlatformIcon(platform: string) {
  const p = platform.toLowerCase()
  if (p.includes('claude')) {
    return (
      <div style={{
        width: 32, height: 32, borderRadius: '50%',
        background: 'linear-gradient(135deg, hsl(263, 70%, 57%), hsl(300, 60%, 50%))',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'white', fontSize: '11px', fontWeight: 700,
      }}>C</div>
    )
  }
  if (p.includes('chatgpt') || p.includes('openai')) {
    return (
      <div style={{
        width: 32, height: 32, borderRadius: '50%',
        background: 'linear-gradient(135deg, hsl(142, 70%, 45%), hsl(160, 60%, 40%))',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'white', fontSize: '9px', fontWeight: 700,
      }}>GPT</div>
    )
  }
  if (p.includes('gemini')) {
    return (
      <div style={{
        width: 32, height: 32, borderRadius: '50%',
        background: 'linear-gradient(135deg, hsl(217, 85%, 57%), hsl(240, 60%, 50%))',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'white', fontSize: '11px', fontWeight: 700,
      }}>G</div>
    )
  }
  return (
    <div style={{
      width: 32, height: 32, borderRadius: '50%',
      background: 'linear-gradient(135deg, hsl(220, 9%, 40%), hsl(220, 9%, 55%))',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <MessageSquare size={14} color="white" />
    </div>
  )
}

function getPlatformBadgeStyle(platform: string): React.CSSProperties {
  const p = platform.toLowerCase()
  if (p.includes('claude')) return { backgroundColor: 'var(--color-alert-info-bg)', color: 'var(--color-info)', border: '1px solid var(--color-info-border, var(--color-info))' }
  if (p.includes('chatgpt') || p.includes('openai')) return { backgroundColor: 'var(--color-alert-success-bg)', color: 'var(--color-success)', border: '1px solid var(--color-success)' }
  if (p.includes('gemini')) return { backgroundColor: 'var(--color-alert-warning-bg)', color: 'var(--color-warning)', border: '1px solid var(--color-warning)' }
  return { backgroundColor: 'hsl(var(--muted))', color: 'hsl(var(--muted-foreground))', border: '1px solid hsl(var(--border))' }
}

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffDays = Math.ceil(Math.abs(now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
  if (diffDays === 1) return 'Today'
  if (diffDays === 2) return 'Yesterday'
  if (diffDays <= 7) return `${diffDays} days ago`
  if (diffDays <= 30) return `${Math.ceil(diffDays / 7)} weeks ago`
  return date.toLocaleDateString('en-GB', {
    month: 'short', day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  })
}

export const HighlightCard = ({
  id,
  highlightedText,
  tags = [],
  sourcePlatform,
  sourceUrl,
  sourceTitle,
  createdAt,
  onClick,
}: HighlightCardProps) => {
  const isClickable = !!onClick

  const handleCardClick = (e: React.MouseEvent) => {
    if (onClick) { e.preventDefault(); onClick() }
  }

  return (
    <div
      onClick={handleCardClick}
      style={{
        backgroundColor: 'hsl(var(--card))',
        border: '1px solid hsl(var(--border))',
        borderRadius: 'var(--border-radius-lg)',
        boxShadow: 'var(--shadow-card)',
        fontFamily: 'var(--font-family-primary)',
        transition: 'all 0.2s ease',
        cursor: isClickable ? 'pointer' : 'default',
        overflow: 'hidden',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = 'var(--shadow-card-hover)'
        e.currentTarget.style.transform = 'translateY(-1px)'
        if (isClickable) e.currentTarget.style.backgroundColor = 'hsl(var(--muted))'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = 'var(--shadow-card)'
        e.currentTarget.style.transform = 'translateY(0)'
        if (isClickable) e.currentTarget.style.backgroundColor = 'hsl(var(--card))'
      }}
    >
      <div style={{ padding: 'var(--spacing-5, 20px)' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 'var(--spacing-4, 16px)' }}>
          {getPlatformIcon(sourcePlatform)}
          <a
            href={sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            title="Open original conversation"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 32, height: 32, borderRadius: 'var(--border-radius-base)',
              color: 'hsl(var(--muted-foreground))',
              transition: 'all 0.2s ease',
              textDecoration: 'none',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'hsl(var(--muted))' }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent' }}
          >
            <ExternalLink size={14} />
          </a>
        </div>

        {/* Highlighted text */}
        <blockquote style={{ margin: '0 0 var(--spacing-4, 16px)' }}>
          <p style={{
            fontSize: 'var(--font-size-sm)',
            color: 'hsl(var(--foreground))',
            lineHeight: 'var(--line-height-normal)',
            margin: 0,
            display: '-webkit-box',
            WebkitLineClamp: 6,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}>
            "{highlightedText}"
          </p>
        </blockquote>

        {/* Source title */}
        {sourceTitle && (
          <div style={{ marginBottom: 'var(--spacing-3, 12px)' }}>
            <p style={{
              fontSize: 'var(--font-size-xs)',
              color: 'hsl(var(--muted-foreground))',
              fontFamily: 'var(--font-family-primary)',
              margin: 0,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              From: {sourceTitle}
            </p>
          </div>
        )}

        {/* Tags */}
        {tags.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 'var(--spacing-3, 12px)' }}>
            {tags.slice(0, 3).map((tag, i) => (
              <span
                key={i}
                onClick={(e) => e.stopPropagation()}
                style={{
                  padding: '2px 8px',
                  backgroundColor: 'var(--color-alert-info-bg)',
                  color: 'var(--color-info)',
                  fontSize: 'var(--font-size-xs)',
                  borderRadius: '999px',
                  border: '1px solid var(--color-info)',
                  fontFamily: 'var(--font-family-primary)',
                  cursor: 'default',
                }}
              >
                #{tag}
              </span>
            ))}
            {tags.length > 3 && (
              <span style={{
                padding: '2px 8px',
                backgroundColor: 'hsl(var(--muted))',
                color: 'hsl(var(--muted-foreground))',
                fontSize: 'var(--font-size-xs)',
                borderRadius: '999px',
                border: '1px solid hsl(var(--border))',
                fontFamily: 'var(--font-family-primary)',
              }}>
                +{tags.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Footer */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          paddingTop: 'var(--spacing-3, 12px)',
          borderTop: '1px solid hsl(var(--border))',
        }}>
          <span style={{
            padding: '2px 8px',
            borderRadius: '999px',
            fontSize: 'var(--font-size-xs)',
            fontWeight: 'var(--font-weight-medium)',
            fontFamily: 'var(--font-family-primary)',
            ...getPlatformBadgeStyle(sourcePlatform),
          }}>
            {sourcePlatform}
          </span>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 4,
            fontSize: 'var(--font-size-xs)',
            color: 'hsl(var(--muted-foreground))',
            fontFamily: 'var(--font-family-primary)',
          }}>
            <Calendar size={12} />
            {formatDate(createdAt)}
          </div>
        </div>

      </div>
    </div>
  )
}