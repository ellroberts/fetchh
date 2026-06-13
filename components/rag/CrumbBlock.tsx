'use client';

import { Button } from '../Button';
import { RagSource } from '../../lib/rag-types';

function getMatchLabel(similarity: number): { label: string; colour: string } {
  if (similarity >= 0.75) return { label: 'Strong match', colour: 'var(--color-status-success)' };
  if (similarity >= 0.55) return { label: 'Good match',   colour: 'var(--color-primary-500)' };
  if (similarity >= 0.4)  return { label: 'Partial match', colour: 'var(--color-status-warning)' };
  return { label: 'Loose match', colour: 'var(--color-text-muted)' };
}

function cleanSnippet(text: string): string {
  const cleaned = text
    .replace(/\[(USER|ASSISTANT)\]:\s*/gi, '')
    .replace(/^(User|Assistant):\s*/gim, '')
    .trim();
  const firstSentence = cleaned.split(/[.\n]/)[0].trim();
  if (firstSentence.length > 20) return firstSentence.slice(0, 120) + (firstSentence.length > 120 ? '…' : '');
  return cleaned.slice(0, 120) + (cleaned.length > 120 ? '…' : '');
}

interface CrumbBlockProps {
  source: RagSource;
}

export function CrumbBlock({ source }: CrumbBlockProps) {
  const { label, colour } = getMatchLabel(source.similarity);
  const snippet = cleanSnippet(source.chunk_text);

  const handleViewInThread = source.conversation_id ? () => {
    window.dispatchEvent(new CustomEvent('threadcub:open-thread', {
      detail: {
        conversationId: source.conversation_id,
        highlightText: source.chunk_text.slice(0, 200),
        conversationTitle: source.conversation_title,
        messageIndices: source.message_indices || [],
      },
    }));
  } : undefined;

  return (
    <div
      style={{
        fontSize: 'var(--font-size-xs)',
        backgroundColor: 'var(--color-surface-page)',
        border: '1px solid var(--color-border-default)',
        borderRadius: 'var(--border-radius-md)',
        padding: '12px',
      }}
    >
      <div style={{ fontWeight: 'var(--font-weight-medium)', color: 'var(--color-text-body)', marginBottom: '4px', lineHeight: 1.375 }}>
        {source.conversation_title}
      </div>
      {snippet && (
        <div style={{ color: 'var(--color-text-muted)', lineHeight: 1.625, marginBottom: '6px', fontStyle: 'italic', overflowWrap: 'break-word', wordBreak: 'break-word' }}>
          "{snippet}"
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '6px' }}>
        <span style={{ fontWeight: 'var(--font-weight-medium)', color: colour }}>{label}</span>
        {handleViewInThread && (
          <Button variant="ghost" size="sm" onClick={handleViewInThread}>
            View in thread →
          </Button>
        )}
      </div>
    </div>
  );
}
