// components/QuickSummary.tsx
'use client';

import { useState, useEffect } from 'react';
import { Button } from './Button';
function estimateReadingTime(messageCount: number): number {
  const exchanges = Math.ceil(messageCount / 2);
  return Math.max(1, exchanges * 2);
}

interface QuickSummaryData {
  overview: string;
  problems_solved: string[];
  key_topics: string[];
  reading_time_minutes: number;
}

interface QuickSummaryProps {
  conversationId: string;
  messageCount: number;
  existingSummary?: QuickSummaryData | null;
  onUpgrade?: () => void;
  onSummaryGenerated?: (summary: QuickSummaryData) => void;
  showUpgradeButton?: boolean;
}

export default function QuickSummary({
  conversationId,
  messageCount,
  existingSummary,
  onUpgrade,
  onSummaryGenerated,
  showUpgradeButton = true,
}: QuickSummaryProps) {
  const [summary, setSummary] = useState<QuickSummaryData | null>(existingSummary || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (existingSummary) {
      setSummary(existingSummary);
    } else {
      generateQuickSummary();
    }
  }, [conversationId, existingSummary]);

  const generateQuickSummary = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/quick-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `Server error: ${response.status}`);
      }

      const { summary: newSummary } = await response.json();
      setSummary(newSummary);

      // Notify parent component
      if (onSummaryGenerated) {
        onSummaryGenerated(newSummary);
      }
    } catch (err: any) {
      console.error('Quick summary failed:', err);
      setError(err.message || 'Failed to generate summary');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-background dark:bg-foreground/10 rounded-lg shadow-md p-6">
        <div className="flex items-center gap-3">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          <p className="text-sm text-muted-foreground dark:text-muted-foreground/70">
            Generating quick summary...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded-lg p-6">
        <p className="text-sm text-red-800 dark:text-red-200 mb-3">{error}</p>
        <Button variant="secondary" size="sm" onClick={generateQuickSummary}>
          Retry
        </Button>
      </div>
    );
  }

  if (!summary) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header - only shown when showUpgradeButton is true */}
      {showUpgradeButton && (
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-gray-800 dark:to-gray-900 rounded-lg p-6 border border-blue-200 dark:border-blue-800">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-foreground dark:text-white mb-2">
                ⚡ Quick Summary (Free)
              </h2>
              <p className="text-sm text-muted-foreground dark:text-muted-foreground/70">
                Want deeper insights? Unlock comprehensive analysis with problems solved, decisions, action items, and key moments.
              </p>
            </div>
            <Button
              variant="primary"
              size="md"
              onClick={onUpgrade || (() => {})}
              className="whitespace-nowrap"
            >
              🔓 Unlock Deep Analysis
            </Button>
          </div>
        </div>
      )}

      {/* Overview Section */}
      <div className="bg-background dark:bg-foreground/10 rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold mb-3 text-foreground dark:text-white flex items-center gap-2">
          <span>📋</span>
          Overview
        </h3>
        <p className="text-base text-foreground/80 dark:text-muted-foreground/50 leading-relaxed">
          {summary.overview}
        </p>
      </div>

      {/* Key Topics */}
      {summary.key_topics && summary.key_topics.length > 0 && (
        <div className="bg-background dark:bg-foreground/10 rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold mb-3 text-foreground dark:text-white flex items-center gap-2">
            <span>🏷️</span>
            Key Topics
          </h3>
          <div className="flex flex-wrap gap-2">
            {summary.key_topics.map((topic, idx) => (
              <span
                key={idx}
                className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
              >
                {topic}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Problems Solved (High-level) */}
      {summary.problems_solved && summary.problems_solved.length > 0 && (
        <div className="bg-background dark:bg-foreground/10 rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold mb-3 text-foreground dark:text-white flex items-center gap-2">
            <span>🔧</span>
            Problems Addressed
          </h3>
          <ul className="space-y-2">
            {summary.problems_solved.map((problem, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="text-green-500 mt-1">✓</span>
                <span className="text-foreground/80 dark:text-muted-foreground/50">{problem}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Reading Time */}
      <div className="bg-background dark:bg-foreground/10 rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-foreground dark:text-white mb-1">
              Estimated Reading Time
            </h3>
            <p className="text-xs text-muted-foreground dark:text-muted-foreground/70">
              Based on {messageCount} messages
            </p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {summary.reading_time_minutes}
            </p>
            <p className="text-sm text-muted-foreground dark:text-muted-foreground/70">
              minutes
            </p>
          </div>
        </div>
      </div>

      {/* Upgrade Prompt - only shown when showUpgradeButton is true */}
      {showUpgradeButton && (
        <div className="bg-purple-50 dark:bg-purple-900 border-2 border-purple-200 dark:border-purple-700 rounded-lg p-6">
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-800 rounded-full flex items-center justify-center">
                <span className="text-2xl">💎</span>
              </div>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-foreground dark:text-white mb-1">
                Want More Insights?
              </h3>
              <p className="text-sm text-foreground/80 dark:text-muted-foreground/50">
                Deep Analysis includes: detailed problem-solution pairs, key decisions, action items, insights, and important conversation moments.
              </p>
            </div>
            <Button
              variant="primary"
              size="lg"
              onClick={onUpgrade || (() => {})}
              className="whitespace-nowrap"
            >
              Upgrade Now
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
