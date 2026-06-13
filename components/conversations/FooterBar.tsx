'use client'

import React, { useState, useEffect } from 'react';
import { useEditMode } from './EditModeContext';

type Props = {
  onRemoveSelected: () => void;
  onDownload: () => void;
  onFormatClick: () => void;
  undoAvailable: boolean;
  onUndo: () => void;
  hideEditMode?: boolean;
  onPrint?: () => void;
  onShare?: () => void;
  showPrintShare?: boolean;
};

export default function FooterBar({
  onRemoveSelected,
  onDownload,
  onFormatClick,
  undoAvailable,
  onUndo,
  hideEditMode = false,
  onPrint,
  onShare,
  showPrintShare = false,
}: Props) {
  const { editMode, setEditMode, selectedIndexes } = useEditMode();
  const hasSelection = selectedIndexes && selectedIndexes.size > 0;

  const [justRemovedCount, setJustRemovedCount] = useState<number>(0);

  const handleRemove = () => {
    setJustRemovedCount(selectedIndexes.size);
    onRemoveSelected();
  };

  useEffect(() => {
    if (justRemovedCount > 0) {
      const timer = setTimeout(() => setJustRemovedCount(0), 5000);
      return () => clearTimeout(timer);
    }
  }, [justRemovedCount]);

  return (
    <div className="fixed bottom-0 left-0 w-full bg-background border-t shadow z-10 flex justify-center">
      <div className="w-full max-w-4xl flex items-center justify-between px-6 py-3">
        {/* Left side */}
        <div className="flex items-center gap-4">
          {!hideEditMode && (
            <label className="flex items-center gap-2 text-sm font-medium text-foreground/80">
              <input
                type="checkbox"
                checked={editMode}
                onChange={(e) => setEditMode(e.target.checked)}
                className="w-5 h-5 text-purple-600 border-border rounded accent-purple-600"
              />
              Edit
            </label>
          )}

          {editMode && justRemovedCount > 0 ? (
            <div className="text-sm text-red-700 flex items-center gap-2">
              {justRemovedCount} item{justRemovedCount > 1 ? 's' : ''} removed
              <button
                onClick={onUndo}
                className="px-2 py-0.5 text-xs font-medium bg-muted text-foreground rounded hover:bg-muted"
              >
                UNDO
              </button>
            </div>
          ) : (
            editMode &&
            hasSelection && (
              <button
                onClick={handleRemove}
                className="text-sm px-3 py-1.5 rounded"
                style={{ backgroundColor: '#ED6A6A', color: '#FFFFFF' }}
              >
                Remove ({selectedIndexes.size})
              </button>
            )
          )}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2">
          {showPrintShare && onPrint && (
            <button
              onClick={onPrint}
              className="text-sm border border-border px-3 py-1.5 rounded hover:bg-muted flex items-center gap-2 text-foreground/80"
            >
              Print
              <i className="fas fa-print text-foreground/80" />
            </button>
          )}
          {showPrintShare && onShare && (
            <button
              onClick={onShare}
              className="text-sm border border-border px-3 py-1.5 rounded hover:bg-muted flex items-center gap-2 text-foreground/80"
            >
              Share
              <i className="fas fa-share text-foreground/80" />
            </button>
          )}
          <button
            onClick={onFormatClick}
            className="text-sm border border-border px-3 py-1.5 rounded hover:bg-muted flex items-center gap-2 text-foreground/80"
          >
            Format
            <i className="fas fa-list text-foreground/80" />
          </button>
          <button
            onClick={onDownload}
            className="bg-purple-600 text-white text-sm px-3 py-1.5 rounded hover:bg-purple-700 flex items-center gap-2"
          >
            Download
            <i className="fas fa-download text-white" />
          </button>
        </div>
      </div>
    </div>
  );
}