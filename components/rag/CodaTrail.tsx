'use client';

import { PawPrint, ChevronDown } from 'lucide-react';
import { RagSource } from '../../lib/rag-types';
import { CrumbBlock } from './CrumbBlock';

function formatTimestamp(ts: string): string {
  const d = new Date(ts);
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
    + ' '
    + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

interface CodaTrailProps {
  sources: RagSource[];
  isExpanded: boolean;
  onToggle: () => void;
  timestamp?: string;
}

export function CodaTrail({ sources, isExpanded, onToggle, timestamp }: CodaTrailProps) {
  return (
    <div className="mt-2">
      <button
        onClick={onToggle}
        className="group"
        style={{
          display: 'flex', alignItems: 'flex-start', gap: '8px',
          padding: '4px', borderRadius: 'var(--border-radius-base)',
          border: 'none', background: 'none', cursor: 'pointer',
          transition: 'var(--transition-base)',
        }}
      >
        <PawPrint className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#A26635' }} />
        <div className="flex flex-col items-start">
          <div className="flex items-center gap-1">
            <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', fontWeight: 'var(--font-weight-medium)' }}>
              Coda's trail
            </span>
            <ChevronDown
              className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
              style={{ width: '14px', height: '14px', color: 'var(--color-text-muted)', opacity: 0.7 }}
            />
          </div>
          <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', opacity: 0.7 }}>
            {sources.length} crumb{sources.length !== 1 ? 's' : ''} found
          </span>
          {timestamp && (
            <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', opacity: 0.5, marginTop: '2px' }}>
              {formatTimestamp(timestamp)}
            </span>
          )}
        </div>
      </button>

      {isExpanded && (
        <div className="mt-2 space-y-1.5 pl-1">
          {sources.map((source, idx) => (
            <CrumbBlock key={idx} source={source} />
          ))}
        </div>
      )}
    </div>
  );
}
