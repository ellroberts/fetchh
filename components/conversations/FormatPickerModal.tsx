'use client'

import React, { useState, useEffect } from 'react';

type Props = {
  open: boolean;
  onClose: () => void;
  onFormatSelect: (mode: 'full' | 'summary' | 'structured') => void;
  selectedFormat: 'full' | 'summary' | 'structured';
};

export default function FormatPickerModal({ open, onClose, onFormatSelect, selectedFormat }: Props) {
  const [choice, setChoice] = useState(selectedFormat);

  const options = [
    {
      key: 'full',
      title: 'Full chat',
      desc: '(all messages, unfiltered)',
    },
    {
      key: 'summary',
      title: 'High-Level checklist',
      desc: '1–2 paragraphs, themes + takeaways)',
    },
    {
      key: 'structured',
      title: 'Structured summary',
      desc: 'What Worked, Next Steps, etc',
    },
  ] as const;

  const hasChanged = choice !== selectedFormat;

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null;

  return (
    <div onClick={onClose} className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
      <div onClick={e => e.stopPropagation()} className="bg-background rounded-lg p-6 shadow-xl w-full max-w-md">
        <h2 className="text-3xl font-semibold font-averia text-left mb-4">
          Document format
        </h2>

        <div className="space-y-0.5 mb-6">
          {options.map((opt) => (
            <label
              key={opt.key}
              className={`flex items-start gap-3 cursor-pointer px-4 py-3 rounded transition-colors ${
                choice === opt.key 
                  ? 'bg-muted' 
                  : 'hover:bg-muted/50'
              }`}
            >
              <input
                type="radio"
                name="format"
                checked={choice === opt.key}
                onChange={() => setChoice(opt.key)}
                className="w-5 h-5 mt-1 accent-purple-600"
              />
              <div className="text-left w-full">
                <div className="font-medium">{opt.title}</div>
                <div className="text-sm text-muted-foreground">{opt.desc}</div>
              </div>
            </label>
          ))}
        </div>

        <div className="flex justify-between">
          <button
            onClick={onClose}
            className="text-sm border border-border text-foreground/80 px-4 py-2 rounded hover:bg-muted transition"
          >
            CLOSE
          </button>
          <button
            onClick={() => onFormatSelect(choice)}
            disabled={!hasChanged}
            className={`px-4 py-2 text-sm rounded transition ${
              hasChanged
                ? 'bg-purple-600 text-white hover:bg-purple-700'
                : 'bg-muted text-muted-foreground/70 cursor-not-allowed'
            }`}
          >
            UPDATE
          </button>
        </div>
      </div>
    </div>
  );
}