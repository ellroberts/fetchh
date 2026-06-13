'use client';

import { useState, useEffect } from 'react';
import {
  PinnedInsight,
  DisplayStyle,
  SectionType,
  SECTION_TYPE_LABELS,
  DISPLAY_STYLE_LABELS,
} from '../../lib/pinned-insights-types';

interface PinnedInsightsProps {
  conversationId: string;
  onRefresh?: () => void;
}

export function PinnedInsights({ conversationId, onRefresh }: PinnedInsightsProps) {
  const [insights, setInsights] = useState<PinnedInsight[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingTitleId, setEditingTitleId] = useState<string | null>(null);
  const [editingTitleValue, setEditingTitleValue] = useState('');
  const [expandedInsights, setExpandedInsights] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchInsights();
  }, [conversationId]);

  const fetchInsights = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/pinned-insights?conversation_id=${conversationId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch insights');
      }

      setInsights(data.insights || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (insightId: string) => {
    if (!confirm('Are you sure you want to unpin this insight?')) return;

    try {
      const response = await fetch(`/api/pinned-insights/${insightId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete insight');
      }

      // Remove from local state
      setInsights((prev) => prev.filter((i) => i.id !== insightId));
      if (onRefresh) onRefresh();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  const handleMoveUp = async (index: number) => {
    if (index === 0) return;

    const newInsights = [...insights];
    [newInsights[index - 1], newInsights[index]] = [newInsights[index], newInsights[index - 1]];
    setInsights(newInsights);

    await reorderInsights(newInsights);
  };

  const handleMoveDown = async (index: number) => {
    if (index === insights.length - 1) return;

    const newInsights = [...insights];
    [newInsights[index], newInsights[index + 1]] = [newInsights[index + 1], newInsights[index]];
    setInsights(newInsights);

    await reorderInsights(newInsights);
  };

  const reorderInsights = async (orderedInsights: PinnedInsight[]) => {
    try {
      const response = await fetch('/api/pinned-insights/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversation_id: conversationId,
          insight_ids: orderedInsights.map((i) => i.id),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to reorder insights');
      }
    } catch (err: any) {
      alert(`Error: ${err.message}`);
      // Refresh to get correct order from server
      fetchInsights();
    }
  };

  const handleUpdateDisplayStyle = async (insightId: string, displayStyle: DisplayStyle) => {
    try {
      const response = await fetch(`/api/pinned-insights/${insightId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ display_style: displayStyle }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update display style');
      }

      const data = await response.json();
      setInsights((prev) =>
        prev.map((i) => (i.id === insightId ? data.insight : i))
      );
      if (onRefresh) onRefresh();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  const handleStartEditTitle = (insight: PinnedInsight) => {
    setEditingTitleId(insight.id);
    setEditingTitleValue(insight.custom_title || SECTION_TYPE_LABELS[insight.section_type]);
  };

  const handleSaveTitle = async (insightId: string) => {
    try {
      const response = await fetch(`/api/pinned-insights/${insightId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ custom_title: editingTitleValue.trim() || null }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update title');
      }

      const data = await response.json();
      setInsights((prev) =>
        prev.map((i) => (i.id === insightId ? data.insight : i))
      );
      setEditingTitleId(null);
      if (onRefresh) onRefresh();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  const handleCancelEditTitle = () => {
    setEditingTitleId(null);
    setEditingTitleValue('');
  };

  const toggleExpanded = (insightId: string) => {
    const newSet = new Set(expandedInsights);
    if (newSet.has(insightId)) {
      newSet.delete(insightId);
    } else {
      newSet.add(insightId);
    }
    setExpandedInsights(newSet);
  };

  const getDisplayTitle = (insight: PinnedInsight) => {
    return insight.custom_title || SECTION_TYPE_LABELS[insight.section_type];
  };

  const renderInsight = (insight: PinnedInsight, index: number) => {
    const isExpanded = expandedInsights.has(insight.id) || insight.display_style !== 'collapsed';
    const displayTitle = getDisplayTitle(insight);

    const baseClasses = 'rounded-lg border transition';
    const styleClasses = {
      card: 'bg-background border-border shadow-sm p-4',
      list: 'bg-muted/50 border-border p-3',
      highlight: 'bg-yellow-50 border-yellow-300 p-4',
      collapsed: 'bg-background border-border p-3',
    };

    return (
      <div key={insight.id} className={`${baseClasses} ${styleClasses[insight.display_style]}`}>
        {/* Header */}
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1">
            {editingTitleId === insight.id ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={editingTitleValue}
                  onChange={(e) => setEditingTitleValue(e.target.value)}
                  className="flex-1 px-2 py-1 text-sm border border-border rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  autoFocus
                />
                <button
                  onClick={() => handleSaveTitle(insight.id)}
                  className="text-green-600 hover:text-green-700"
                  title="Save"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </button>
                <button
                  onClick={handleCancelEditTitle}
                  className="text-red-600 hover:text-red-700"
                  title="Cancel"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-semibold text-foreground">{displayTitle}</h4>
                <button
                  onClick={() => handleStartEditTitle(insight)}
                  className="text-muted-foreground/70 hover:text-muted-foreground"
                  title="Edit title"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                    />
                  </svg>
                </button>
              </div>
            )}
            {insight.source_question && (
              <p className="text-xs text-muted-foreground mt-1 italic">
                From: "{insight.source_question.length > 80 ? insight.source_question.substring(0, 80) + '...' : insight.source_question}"
              </p>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1 ml-2">
            {/* Move up/down */}
            <button
              onClick={() => handleMoveUp(index)}
              disabled={index === 0}
              className="p-1 text-muted-foreground/70 hover:text-muted-foreground disabled:opacity-30 disabled:cursor-not-allowed"
              title="Move up"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
            </button>
            <button
              onClick={() => handleMoveDown(index)}
              disabled={index === insights.length - 1}
              className="p-1 text-muted-foreground/70 hover:text-muted-foreground disabled:opacity-30 disabled:cursor-not-allowed"
              title="Move down"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Collapse/expand for collapsed style */}
            {insight.display_style === 'collapsed' && (
              <button
                onClick={() => toggleExpanded(insight.id)}
                className="p-1 text-muted-foreground/70 hover:text-muted-foreground"
                title={isExpanded ? 'Collapse' : 'Expand'}
              >
                <svg
                  className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            )}

            {/* Delete */}
            <button
              onClick={() => handleDelete(insight.id)}
              className="p-1 text-muted-foreground/70 hover:text-red-600"
              title="Unpin"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        {isExpanded && (
          <div className="text-sm text-foreground/80 whitespace-pre-wrap">
            {insight.display_style === 'list' ? (
              <ul className="list-disc list-inside space-y-1">
                {insight.content.split('\n').map((line, i) => (
                  <li key={i}>{line}</li>
                ))}
              </ul>
            ) : (
              insight.content
            )}
          </div>
        )}

        {/* Display style selector */}
        <div className="mt-3 pt-3 border-t border-border flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Display as:</span>
          {(Object.keys(DISPLAY_STYLE_LABELS) as DisplayStyle[]).map((style) => (
            <button
              key={style}
              onClick={() => handleUpdateDisplayStyle(insight.id, style)}
              className={`text-xs px-2 py-1 rounded transition ${
                insight.display_style === style
                  ? 'bg-indigo-100 text-indigo-700 font-medium'
                  : 'bg-muted text-muted-foreground hover:bg-muted'
              }`}
            >
              {DISPLAY_STYLE_LABELS[style]}
            </button>
          ))}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="bg-background rounded-lg border border-border p-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
          <span className="ml-3 text-muted-foreground">Loading insights...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-700 text-sm">Error loading insights: {error}</p>
      </div>
    );
  }

  if (insights.length === 0) {
    return (
      <div className="bg-muted/50 border-2 border-dashed border-border rounded-lg p-8 text-center">
        <svg
          className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
          />
        </svg>
        <h3 className="text-lg font-medium text-foreground mb-1">No insights pinned yet</h3>
        <p className="text-muted-foreground text-sm">
          Ask questions below and pin the responses you want to keep.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">Pinned Insights</h3>
        <span className="text-sm text-muted-foreground">{insights.length} pinned</span>
      </div>
      {insights.map((insight, index) => renderInsight(insight, index))}
    </div>
  );
}
