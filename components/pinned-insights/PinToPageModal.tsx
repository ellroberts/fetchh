'use client';

import { useState, useEffect } from 'react';
import {
  SectionType,
  DisplayStyle,
  SECTION_TYPE_LABELS,
  DISPLAY_STYLE_LABELS,
} from '../../lib/pinned-insights-types';

interface PinToPageModalProps {
  isOpen: boolean;
  onClose: () => void;
  content: string;
  sourceQuestion: string;
  onConfirm: (sectionType: SectionType, displayStyle: DisplayStyle, customTitle: string | null) => void;
}

export function PinToPageModal({
  isOpen,
  onClose,
  content,
  sourceQuestion,
  onConfirm,
}: PinToPageModalProps) {
  const [sectionType, setSectionType] = useState<SectionType>('insights');
  const [displayStyle, setDisplayStyle] = useState<DisplayStyle>('card');
  const [customTitle, setCustomTitle] = useState('');

  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm(
      sectionType,
      displayStyle,
      sectionType === 'custom' && customTitle.trim() ? customTitle.trim() : null
    );
    // Reset form
    setSectionType('insights');
    setDisplayStyle('card');
    setCustomTitle('');
  };

  const handleClose = () => {
    setSectionType('insights');
    setDisplayStyle('card');
    setCustomTitle('');
    onClose();
  };

  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [isOpen, onClose])

  return (
    <div onClick={handleClose} className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div onClick={e => e.stopPropagation()} className="bg-background rounded-lg w-full max-w-lg shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold text-foreground">Pin to Page</h2>
          <button
            onClick={handleClose}
            className="p-1 rounded-md hover:bg-muted transition"
          >
            <svg
              className="w-5 h-5 text-muted-foreground"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-4">
          {/* Preview */}
          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-2">
              Preview
            </label>
            <div className="bg-muted/50 border border-border rounded-lg p-3 max-h-32 overflow-y-auto">
              <p className="text-sm text-foreground/80 whitespace-pre-wrap">
                {content.length > 200 ? content.substring(0, 200) + '...' : content}
              </p>
            </div>
            {sourceQuestion && (
              <p className="text-xs text-muted-foreground mt-1 italic">
                From question: "{sourceQuestion.length > 60 ? sourceQuestion.substring(0, 60) + '...' : sourceQuestion}"
              </p>
            )}
          </div>

          {/* Section Type */}
          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-2">
              Section Type
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(SECTION_TYPE_LABELS) as SectionType[]).map((type) => (
                <button
                  key={type}
                  onClick={() => setSectionType(type)}
                  className={`px-3 py-2 text-sm rounded-lg border transition ${
                    sectionType === type
                      ? 'bg-indigo-50 border-indigo-500 text-indigo-700 font-medium'
                      : 'bg-background border-border text-foreground/80 hover:bg-muted/50'
                  }`}
                >
                  {SECTION_TYPE_LABELS[type]}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Title (for custom section type) */}
          {sectionType === 'custom' && (
            <div>
              <label className="block text-sm font-medium text-foreground/80 mb-2">
                Custom Title
              </label>
              <input
                type="text"
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                placeholder="Enter a custom title..."
                className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
              />
            </div>
          )}

          {/* Display Style */}
          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-2">
              Display Style
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(DISPLAY_STYLE_LABELS) as DisplayStyle[]).map((style) => (
                <button
                  key={style}
                  onClick={() => setDisplayStyle(style)}
                  className={`px-3 py-2 text-sm rounded-lg border transition ${
                    displayStyle === style
                      ? 'bg-indigo-50 border-indigo-500 text-indigo-700 font-medium'
                      : 'bg-background border-border text-foreground/80 hover:bg-muted/50'
                  }`}
                >
                  {DISPLAY_STYLE_LABELS[style]}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 p-4 border-t bg-muted/50">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-sm text-foreground/80 bg-background border border-border rounded-lg hover:bg-muted/50 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={sectionType === 'custom' && !customTitle.trim()}
            className="px-4 py-2 text-sm text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Pin to Page
          </button>
        </div>
      </div>
    </div>
  );
}
