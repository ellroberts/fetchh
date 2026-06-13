'use client';

import { useMultiSelect } from './MultiSelectContext';
interface MultiSelectToolbarProps {
  onGenerateEmbeddings?: () => void;
  isGenerating?: boolean;
}

export function MultiSelectToolbar({
  onGenerateEmbeddings,
  isGenerating = false,
}: MultiSelectToolbarProps) {
  const {
    isSelecting,
    setIsSelecting,
    selectedConversations,
    clearSelection,
    getSelectedCount,
    getEmbeddingsReadyCount,
  } = useMultiSelect();

  const selectedCount = getSelectedCount();
  const embeddingsReady = getEmbeddingsReadyCount();
  const embeddingsNeeded = selectedCount - embeddingsReady;

  if (!isSelecting) {
    return (
      <button
        onClick={() => setIsSelecting(true)}
        className="inline-flex items-center px-4 py-2 border border-border rounded-md shadow-sm text-sm font-medium text-foreground/80 bg-background hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
      >
        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
        </svg>
        Select for Analysis
      </button>
    );
  }

  return (
    <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <span className="text-sm font-medium text-indigo-900">
            {selectedCount} selected
          </span>
          {selectedCount > 0 && (
            <span className="text-xs text-indigo-600">
              ({embeddingsReady} ready
              {embeddingsNeeded > 0 && `, ${embeddingsNeeded} need indexing`})
            </span>
          )}
        </div>

        <div className="flex items-center space-x-2">
          {embeddingsNeeded > 0 && selectedCount > 0 && (
            <button
              onClick={onGenerateEmbeddings}
              disabled={isGenerating}
              className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGenerating ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Indexing...
                </>
              ) : (
                <>Index {embeddingsNeeded} thread{embeddingsNeeded !== 1 ? 's' : ''}</>
              )}
            </button>
          )}

          <button
            onClick={clearSelection}
            className="inline-flex items-center px-3 py-2 border border-border rounded-md text-sm font-medium text-foreground/80 bg-background hover:bg-muted/50"
          >
            Cancel
          </button>
        </div>
      </div>

      {embeddingsNeeded > 0 && selectedCount > 0 && (
        <div className="mt-3 bg-yellow-50 border border-yellow-200 rounded p-3">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-yellow-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm text-yellow-800">
              {embeddingsNeeded} thread{embeddingsNeeded > 1 ? 's' : ''} need indexing before analysis.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}