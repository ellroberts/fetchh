'use client';

import { useState, useEffect } from 'react';

interface EmbeddingStatusBadgeProps {
  hasEmbeddings: boolean;
  status?: 'pending' | 'processing' | 'completed' | 'failed' | 'outdated';
  createdAt?: string; // ISO string — used to detect "Almost ready!" window
  onGenerate?: () => void;
  isGenerating?: boolean;
  showLabel?: boolean;
}

const ALMOST_READY_WINDOW_MS = 90_000; // 90 seconds

export function EmbeddingStatusBadge({
  hasEmbeddings,
  status,
  createdAt,
  onGenerate,
  isGenerating = false,
  showLabel = false,
}: EmbeddingStatusBadgeProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const [almostReady, setAlmostReady] = useState(false);

  useEffect(() => {
    if (!createdAt) { setAlmostReady(false); return; }
    setAlmostReady(Date.now() - new Date(createdAt).getTime() < ALMOST_READY_WINDOW_MS);
  }, [createdAt]);

  const getStatusConfig = () => {
    if (isGenerating || status === 'processing') {
      return {
        icon: (
          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        ),
        label: 'Almost ready!',
        color: 'text-purple-600',
        bgColor: 'bg-purple-50',
        borderColor: 'border-purple-200',
        tooltip: 'Getting your conversation ready for analysis…',
      };
    }

    if (hasEmbeddings) {
      return {
        icon: (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ),
        label: 'Ready',
        color: 'text-green-600',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200',
        tooltip: 'Ready for multi-chat analysis',
      };
    }

    if (status === 'failed') {
      return {
        icon: (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ),
        label: 'Failed',
        color: 'text-red-600',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200',
        tooltip: 'Something went wrong. Click to retry.',
      };
    }

    // Not indexed — decide between "Almost ready!" and "On hold"
    if (almostReady) {
      return {
        icon: (
          <svg className="w-4 h-4 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ),
        label: 'Almost ready!',
        color: 'text-amber-600',
        bgColor: 'bg-amber-50',
        borderColor: 'border-amber-200',
        tooltip: 'Getting your conversation ready for analysis…',
      };
    }

    return {
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      label: 'On hold',
      color: 'text-muted-foreground',
      bgColor: 'bg-muted/50',
      borderColor: 'border-border',
      tooltip: 'Not yet indexed. Click to prepare for analysis.',
    };
  };

  const config = getStatusConfig();

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onGenerate && !hasEmbeddings && !isGenerating) {
      onGenerate();
    }
  };

  return (
    <div
      className={`relative inline-flex items-center ${
        onGenerate && !hasEmbeddings && !isGenerating ? 'cursor-pointer hover:opacity-80' : ''
      }`}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      onClick={handleClick}
    >
      <span
        className={`inline-flex items-center ${
          showLabel ? 'px-2 py-1 text-xs rounded-full' : 'p-1 rounded'
        } ${config.bgColor} ${config.color} border ${config.borderColor}`}
      >
        {config.icon}
        {showLabel && <span className="ml-1">{config.label}</span>}
      </span>

      {showTooltip && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-foreground rounded whitespace-nowrap z-10">
          {config.tooltip}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
        </div>
      )}
    </div>
  );
}

// Compact version for list views
export function EmbeddingStatusDot({
  hasEmbeddings,
  status,
  createdAt,
}: {
  hasEmbeddings: boolean;
  status?: string;
  createdAt?: string;
}) {
  const [clientAlmostReady, setClientAlmostReady] = useState(false);

  useEffect(() => {
    if (!createdAt) { setClientAlmostReady(false); return; }
    setClientAlmostReady(Date.now() - new Date(createdAt).getTime() < ALMOST_READY_WINDOW_MS);
  }, [createdAt]);

  let dotColor = 'bg-muted';
  let title = 'On hold';

  if (status === 'processing') {
    dotColor = 'bg-amber-500 animate-pulse';
    title = 'Almost ready!';
  } else if (hasEmbeddings) {
    dotColor = 'bg-green-500';
    title = 'Ready for analysis';
  } else if (status === 'failed') {
    dotColor = 'bg-red-500';
    title = 'Indexing failed';
  } else if (clientAlmostReady) {
    dotColor = 'bg-amber-400 animate-pulse';
    title = 'Almost ready!';
  }

  return <span className={`inline-block w-2 h-2 rounded-full ${dotColor}`} title={title} />;
}