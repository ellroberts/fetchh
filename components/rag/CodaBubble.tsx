'use client';

import React, { memo, useState, type ReactNode, type JSX } from 'react';
import { Copy, ThumbsUp, ThumbsDown } from 'lucide-react';
import ReactMarkdown, { type Components } from 'react-markdown';
import { RagSource } from '../../lib/rag-types';
import { CodaTrail } from './CodaTrail';
import { createSupabaseClient } from '../../lib/supabase';
import { IconButton } from '@/components/IconButton';
import { PositiveFeedbackModal } from '@/components/PositiveFeedbackModal';
import { NegativeFeedbackModal } from '@/components/NegativeFeedbackModal';
import { type SavedHighlight } from '@/lib/highlight-utils';

// ---------------------------------------------------------------------------
// Highlight injection — pure React, no DOM, no string manipulation
// Supports highlights that span multiple nodes (e.g. normal → bold → normal)
// ---------------------------------------------------------------------------

/** A text leaf collected during the first pass */
interface TextLeaf {
  text: string;
  /** character position of this leaf's first char in the flattened string */
  start: number;
}

/** A highlight range located in the flattened string */
interface HighlightRange {
  id: string;
  start: number;
  end: number; // exclusive
}

// ---------------------------------------------------------------------------
// Pass 1: flatten all string leaves from a React children tree into one string
// and record the position of each leaf so we can map back later.
// ---------------------------------------------------------------------------
function collectLeaves(node: ReactNode, leaves: TextLeaf[], cursor: { pos: number }) {
  if (typeof node === 'string') {
    leaves.push({ text: node, start: cursor.pos });
    cursor.pos += node.length;
    return;
  }
  if (Array.isArray(node)) {
    for (const child of node) collectLeaves(child, leaves, cursor);
    return;
  }
  if (node !== null && node !== undefined && typeof node === 'object' && 'props' in node) {
    const el = node as React.ReactElement;
    if (el.props?.children !== undefined) {
      collectLeaves(el.props.children, leaves, cursor);
    }
  }
}

// ---------------------------------------------------------------------------
// Pass 2: find where each highlight text sits in the flattened string.
// Returns ranges sorted by start position.
// ---------------------------------------------------------------------------
function locateHighlights(full: string, highlights: SavedHighlight[]): HighlightRange[] {
  const ranges: HighlightRange[] = [];
  for (const h of highlights) {
    if (!h.text) continue;
    const idx = full.indexOf(h.text);
    if (idx !== -1) {
      ranges.push({ id: h.id, start: idx, end: idx + h.text.length });
    }
  }
  return ranges.sort((a, b) => a.start - b.start);
}

// ---------------------------------------------------------------------------
// Pass 3: walk the children tree, slicing string leaves according to which
// highlight ranges they overlap, wrapping matched segments in <mark>.
// Non-string nodes are recursed into so their own string leaves get sliced too.
// ---------------------------------------------------------------------------

const MARK_STYLE: React.CSSProperties = {
  backgroundColor: '#F6DB77',
  color: 'inherit',
  borderRadius: '2px',
  padding: '0 1px',
};

function reconstructNode(
  node: ReactNode,
  ranges: HighlightRange[],
  cursor: { pos: number },
  keyPrefix: string,
): ReactNode {
  if (typeof node === 'string') {
    const leafStart = cursor.pos;
    const leafEnd = cursor.pos + node.length;
    cursor.pos = leafEnd;

    // Find all ranges that overlap this leaf
    const overlapping = ranges.filter(r => r.start < leafEnd && r.end > leafStart);
    if (overlapping.length === 0) return node;

    // Slice the leaf into segments, wrapping overlapping parts in <mark>
    const segments: ReactNode[] = [];
    let localPos = leafStart;

    for (const r of overlapping) {
      const sliceStart = Math.max(r.start, leafStart);
      const sliceEnd = Math.min(r.end, leafEnd);

      // Text before this highlight segment
      if (localPos < sliceStart) {
        segments.push(node.slice(localPos - leafStart, sliceStart - leafStart));
      }

      // The highlighted segment
      segments.push(
        <mark
          key={`${keyPrefix}-${r.id}-${sliceStart}`}
          data-highlight-id={r.id}
          style={MARK_STYLE}
        >
          {node.slice(sliceStart - leafStart, sliceEnd - leafStart)}
        </mark>,
      );

      localPos = sliceEnd;
    }

    // Any remaining text after the last highlight
    if (localPos < leafEnd) {
      segments.push(node.slice(localPos - leafStart));
    }

    return segments;
  }

  if (Array.isArray(node)) {
    return node.map((child, i) =>
      reconstructNode(child, ranges, cursor, `${keyPrefix}-${i}`),
    );
  }

  if (node !== null && node !== undefined && typeof node === 'object' && 'props' in node) {
    const el = node as React.ReactElement;
    if (el.props?.children === undefined) return node;
    const newChildren = reconstructNode(el.props.children, ranges, cursor, keyPrefix);
    // Only clone if children actually changed to preserve referential stability
    return newChildren === el.props.children ? node : React.cloneElement(el, {}, newChildren);
  }

  return node;
}

/**
 * Entry point: given the React children of a block element and the active
 * highlights, returns new children with cross-node <mark> wrapping applied.
 *
 * Three-pass algorithm:
 *   1. Flatten all string leaves → one string + positional metadata
 *   2. Locate each highlight in that string → [start, end] ranges
 *   3. Reconstruct the children tree, slicing leaves at range boundaries
 */
function applyHighlightsToChildren(
  children: ReactNode,
  highlights: SavedHighlight[],
): ReactNode {
  if (!highlights.length) return children;

  // Pass 1
  const leaves: TextLeaf[] = [];
  collectLeaves(children, leaves, { pos: 0 });
  if (leaves.length === 0) return children;
  const fullText = leaves.map(l => l.text).join('');

  // Pass 2
  const ranges = locateHighlights(fullText, highlights);
  if (ranges.length === 0) return children;

  // Pass 3
  return reconstructNode(children, ranges, { pos: 0 }, 'hl');
}

// ---------------------------------------------------------------------------
// Markdown component overrides — apply highlights inside every text-bearing
// block element so we never miss a match regardless of markdown structure.
// ---------------------------------------------------------------------------

function makeComponents(highlights: SavedHighlight[]): Components {
  const wrap =
    (Tag: keyof JSX.IntrinsicElements, extraStyle?: React.CSSProperties) =>
    ({ children, ...rest }: { children?: ReactNode }) => (
      <Tag style={extraStyle} {...(rest as object)}>
        {applyHighlightsToChildren(children, highlights)}
      </Tag>
    );

  return {
    p: wrap('p', { margin: '0 0 var(--spacing-2) 0', fontSize: 'var(--font-size-sm)' }),
    h2: wrap('h2', { fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-bold)', margin: 'var(--spacing-3) 0 var(--spacing-1) 0' }),
    h3: wrap('h3', { fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-semibold)', margin: 'var(--spacing-2) 0 var(--spacing-1) 0' }),
    li: wrap('li', { marginBottom: 'var(--spacing-1)', fontSize: 'var(--font-size-sm)' }),
    strong: wrap('strong', { fontWeight: 'var(--font-weight-semibold)' }),
    ul: ({ children }) => (
      <ul style={{ paddingLeft: 'var(--spacing-4)', margin: 'var(--spacing-1) 0 var(--spacing-2) 0' }}>
        {children}
      </ul>
    ),
    hr: () => (
      <hr style={{ border: 'none', borderTop: '1px solid var(--color-border-default)', margin: 'var(--spacing-2) 0' }} />
    ),
    pre: ({ children }) => (
      <pre style={{ overflowX: 'auto', whiteSpace: 'pre-wrap', background: 'var(--color-surface-sunken, rgba(0,0,0,0.04))', borderRadius: 'var(--border-radius-base)', padding: 'var(--spacing-3)', fontSize: 'var(--font-size-xs)', lineHeight: 1.6, margin: 'var(--spacing-2) 0', maxWidth: '100%', boxSizing: 'border-box' }}>
        {children}
      </pre>
    ),
    code: ({ children, className }) => {
      const isBlock = Boolean(className);
      return isBlock
        ? <code style={{ fontFamily: 'var(--font-family-mono, monospace)', fontSize: 'var(--font-size-xs)' }}>{children}</code>
        : <code style={{ fontFamily: 'var(--font-family-mono, monospace)', fontSize: 'var(--font-size-xs)', background: 'var(--color-surface-sunken, rgba(0,0,0,0.06))', borderRadius: '3px', padding: '1px 4px' }}>{children}</code>;
    },
  };
}

// ---------------------------------------------------------------------------
// Props & component
// ---------------------------------------------------------------------------

interface CodaBubbleProps {
  content: string;
  timestamp?: string;
  sources?: RagSource[];
  onPin?: () => void;
  msgIndex?: number;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  savedHighlights?: SavedHighlight[];
}

export const CodaBubble = memo(function CodaBubble({
  content,
  timestamp,
  sources,
  msgIndex = 0,
  isExpanded,
  onToggleExpand,
  savedHighlights = [],
}: CodaBubbleProps) {
  const [internalExpanded, setInternalExpanded] = useState(false);
  const expanded = isExpanded !== undefined ? isExpanded : internalExpanded;
  const handleToggle = onToggleExpand ?? (() => setInternalExpanded((e) => !e));

  const [feedback, setFeedback] = useState<'up' | 'down' | null>(null);
  const [showPositiveModal, setShowPositiveModal] = useState(false);
  const [showNegativeModal, setShowNegativeModal] = useState(false);

  const supabase = createSupabaseClient();

  // Filter highlights to only those belonging to this message.
  // Re-computed only when savedHighlights or msgIndex changes.
  const highlights = savedHighlights.filter((h) => h.msgIndex === msgIndex);

  // Components are recreated only when the highlights for this message change.
  // For messages with no highlights this is a stable empty-array reference
  // (memo won't re-render) so there's no unnecessary work.
  const components = makeComponents(highlights);

  const saveFeedback = async (value: 'up' | 'down', category?: string, detail?: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from('rag_message_feedback').insert({
        user_id: user?.id ?? null,
        msg_index: msgIndex,
        content_snippet: content.slice(0, 200),
        feedback: value,
        category: category || null,
        detail: detail || null,
        created_at: new Date().toISOString(),
      });
    } catch (err) {
      console.error('Failed to save feedback:', err);
    }
  };

  const handlePositiveSubmit = async (detail: string) => {
    setFeedback('up');
    setShowPositiveModal(false);
    await saveFeedback('up', undefined, detail);
  };

  const handleNegativeSubmit = async (category: string, detail: string) => {
    setFeedback('down');
    setShowNegativeModal(false);
    await saveFeedback('down', category, detail);
  };

  return (
    <>
      {showPositiveModal && (
        <PositiveFeedbackModal
          onSubmit={handlePositiveSubmit}
          onCancel={() => setShowPositiveModal(false)}
        />
      )}
      {showNegativeModal && (
        <NegativeFeedbackModal
          onSubmit={handleNegativeSubmit}
          onCancel={() => setShowNegativeModal(false)}
        />
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-start', minWidth: 0 }}>
        <div style={{ width: '100%', minWidth: 0 }}>
          <div
            className="relative group"
            data-msg-role="assistant"
            data-msg-index={msgIndex}
            style={{
              backgroundColor: 'var(--color-surface-raised)',
              color: 'var(--color-text-body)',
              borderRadius: 'var(--border-radius-lg)',
              padding: '8px 16px',
              fontSize: 'var(--font-size-sm)',
              lineHeight: 1.6,
              wordBreak: 'break-word',
              overflowWrap: 'break-word',
              minWidth: 0,
              overflow: 'visible',
            }}
          >
            <ReactMarkdown components={components}>
              {content}
            </ReactMarkdown>

            <div style={{ display: 'flex', gap: 0, marginTop: 'var(--spacing-1)', justifyContent: 'flex-end', alignItems: 'center' }}>
              <IconButton size="sm" tooltip="Copy" tooltipPosition="top" onClick={() => navigator.clipboard.writeText(content)}>
                <Copy size={14} />
              </IconButton>
              <IconButton size="sm" tooltip="Good response" tooltipPosition="top" selected={feedback === 'up'} onClick={() => { if (feedback !== 'up') setShowPositiveModal(true); }}>
                <ThumbsUp size={14} />
              </IconButton>
              <IconButton size="sm" tooltip="Poor response" tooltipPosition="top" selected={feedback === 'down'} danger={feedback === 'down'} onClick={() => { if (feedback !== 'down') setShowNegativeModal(true); }}>
                <ThumbsDown size={14} />
              </IconButton>
            </div>
          </div>

          {sources && sources.length > 0 && content.length > 150 ? (
            <CodaTrail sources={sources} isExpanded={expanded} onToggle={handleToggle} timestamp={timestamp} />
          ) : timestamp ? (
            <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', opacity: 0.5, marginTop: '4px', paddingLeft: '4px' }}>
              {new Date(timestamp).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
                + ' '
                + new Date(timestamp).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
            </div>
          ) : null}
        </div>
      </div>
    </>
  );
});