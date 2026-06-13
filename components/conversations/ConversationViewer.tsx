'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Pencil } from 'lucide-react';
import { useEditMode } from './EditModeContext';

interface ConversationViewerProps {
  messages: string[];
  platform: string;
  fileName: string;
  title: string;
  setTitle: (title: string) => void;
  onRemove: () => void;
  currentFormat?: 'full' | 'summary' | 'structured';
}

export default function ConversationViewer({
  messages,
  platform,
  fileName,
  title,
  setTitle,
  onRemove,
  currentFormat = 'full',
}: ConversationViewerProps) {
  const { editMode, selectedIndexes, toggleIndex } = useEditMode();
  const [isEditing, setIsEditing] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [draftTitle, setDraftTitle] = useState(title);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  const handleSave = () => {
    setTitle(draftTitle.trim() || 'Untitled Chat');
    setIsEditing(false);
    setHovered(false);
  };

  const handleCancel = () => {
    setDraftTitle(title);
    setIsEditing(false);
    setHovered(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleSave();
    if (e.key === 'Escape') handleCancel();
  };

  const getRoleFromMessage = (msg: string) => {
    if (msg.startsWith('user:')) return 'user';
    if (msg.startsWith('assistant:')) return 'assistant';
    return 'unknown';
  };

  const stripRole = (msg: string) => {
    return msg.replace(/^user:\s*|^assistant:\s*/i, '');
  };

  const getFormatDisplayName = (format: string) => {
    switch (format) {
      case 'summary': return 'High-Level';
      case 'structured': return 'Structured';
      default: return 'Full Chat';
    }
  };

  return (
    <div className="w-full max-w-4xl mb-10 text-left">
      {/* Title Section - No background */}
      <div className="mb-4">
        <div className="flex items-start justify-between w-full">
          {/* Left side - Title and File name */}
          <div className="flex flex-col items-start flex-1">
            {/* Title with edit functionality */}
            <div
              className="flex items-center gap-2 mb-2 relative"
              onMouseEnter={() => setHovered(true)}
              onMouseLeave={() => setHovered(false)}
            >
              {!isEditing ? (
                <div
                  className={`inline-flex items-center gap-2 cursor-pointer border rounded transition px-1 ${
                    hovered ? 'border-border' : 'border-transparent'
                  }`}
                  onClick={() => setIsEditing(true)}
                >
                  <span className="text-[32px] font-bold font-averia text-foreground">{title}</span>
                  <Pencil size={16} className="text-muted-foreground/70 hover:text-muted-foreground opacity-80" />
                  
                  {/* Tooltip for edit title */}
                  {hovered && (
                    <div className="absolute top-full left-0 mt-2 bg-[#4C596E] text-white shadow z-10 rounded-sm">
                      <div style={{ paddingLeft: '6px', paddingRight: '6px', paddingTop: '3px', paddingBottom: '3px' }} className="text-xs font-karla">
                        EDIT TITLE
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="inline-flex items-center gap-2">
                  <div className="inline-block border border-border/80 rounded px-1">
                    <input
                      ref={inputRef}
                      value={draftTitle}
                      onChange={(e) => setDraftTitle(e.target.value)}
                      onKeyDown={handleKeyDown}
                      className="text-[32px] font-bold font-averia bg-transparent border-none outline-none w-[300px] text-foreground"
                    />
                  </div>
                  <button
                    onClick={handleCancel}
                    className="text-sm px-3 py-1 border border-border rounded hover:bg-muted"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    className="text-sm px-3 py-1 bg-purple-600 text-white rounded hover:bg-purple-700"
                  >
                    Save
                  </button>
                </div>
              )}
            </div>

            {/* File name */}
            <p className="text-sm text-muted-foreground">
              <span className="uppercase tracking-wide text-xs text-muted-foreground mr-1">File:</span>
              {fileName}
            </p>
          </div>

          {/* Right side - Badges */}
          <div className="flex items-center gap-2 flex-shrink-0 ml-4">
            {/* Format badge */}
            <span className="text-xs font-bold bg-purple-100 text-purple-700 px-2 py-1 rounded-full">
              {getFormatDisplayName(currentFormat)}
            </span>
            
            {/* Platform badge */}
            <span className="text-xs font-bold bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
              {platform}
            </span>
          </div>
        </div>
      </div>

      {/* Message List - Direct content, no wrapper styling */}
      <div className="space-y-0.5">
        {messages.map((msg, idx) => {
          const role = getRoleFromMessage(msg);
          const text = stripRole(msg);
          const isUser = role === 'user';
          const isSelected = selectedIndexes.has(idx);

          return (
            <div key={idx} className="text-sm text-foreground">
              {isUser ? (
                <div className={`w-full rounded px-4 py-4 flex items-center gap-3 ${
                  editMode && isSelected ? 'bg-[#FDF0F0]' : editMode ? 'bg-[#F0EEE7]' : 'bg-[#F0EEE7]'
                }`}>
                  {editMode && (
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleIndex(idx)}
                      className="w-5 h-5 text-red-600 border-red-300 rounded-sm focus:ring-red-500 focus:ring-2 flex-shrink-0"
                      style={{
                        accentColor: '#dc2626',
                        width: '20px',
                        height: '20px',
                        borderRadius: '2px'
                      }}
                    />
                  )}
                  <div className="w-8 h-8 flex items-center justify-center rounded-full bg-background flex-shrink-0">
                    <i className="fas fa-user text-[#4C596E] text-sm" />
                  </div>
                  <p className="text-[#4C596E] font-medium leading-relaxed">{text}</p>
                </div>
              ) : (
                <div className={`flex items-start gap-3 p-4 rounded ${
                  editMode && isSelected ? 'bg-[#FDF0F0]' : ''
                }`}>
                  {editMode && (
                    <div className="flex items-center h-8">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleIndex(idx)}
                        className="w-5 h-5 text-red-600 border-red-300 rounded-sm focus:ring-red-500 focus:ring-2"
                        style={{
                          accentColor: '#dc2626',
                          width: '20px',
                          height: '20px',
                          borderRadius: '2px'
                        }}
                      />
                    </div>
                  )}
                  <div className="w-8 h-8 flex items-center justify-center rounded-full bg-[#BDE5FA] flex-shrink-0">
                    <i className="fas fa-robot text-[#5690CE] text-sm" />
                  </div>
                  <p className="text-[#4C596E] leading-relaxed">{text}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}