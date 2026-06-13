'use client';

interface UserBubbleProps {
  content: string;
  timestamp?: string;
}

function formatTimestamp(ts: string): string {
  const d = new Date(ts);
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
    + ' '
    + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

export function UserBubble({ content, timestamp }: UserBubbleProps) {
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
      <div style={{ maxWidth: '85%' }}>
        <div
          style={{
            backgroundColor: 'var(--color-surface-primary-subtle)',
            color: 'var(--color-text-body)',
            borderRadius: 'var(--border-radius-lg)',
            padding: '8px 16px',
            fontSize: 'var(--font-size-sm)',
            lineHeight: 1.6,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            overflowWrap: 'break-word',
          }}
        >
          {content}
        </div>
        {timestamp && (
          <div
            style={{
              fontSize: 'var(--font-size-xs)',
              color: 'var(--color-text-muted)',
              opacity: 0.7,
              marginTop: '4px',
              textAlign: 'right',
            }}
          >
            {formatTimestamp(timestamp)}
          </div>
        )}
      </div>
    </div>
  );
}
