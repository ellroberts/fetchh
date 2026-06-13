'use client';

import { useRef, ReactNode } from 'react';
import { ArrowUp } from 'lucide-react';

interface RagInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onStop?: () => void;
  isLoading?: boolean;
  disabled?: boolean;
  placeholder?: string;
  scopeSlot?: ReactNode;
  textareaRef?: React.RefObject<HTMLTextAreaElement>;
}

export function RagInput({
  value,
  onChange,
  onSend,
  onStop,
  isLoading = false,
  disabled = false,
  placeholder = 'Ask anything...',
  scopeSlot,
  textareaRef,
}: RagInputProps) {
  const internalRef = useRef<HTMLTextAreaElement>(null);
  const ref = textareaRef ?? internalRef;
  const canSend = !disabled && value.trim().length > 0;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = e.target.scrollHeight + 'px';
  };

  const handleClick = () => {
    if (isLoading) {
      onStop?.();
    } else {
      onSend();
    }
  };

  const sendBtnClass = canSend
    ? 'send-btn-active'
    : isLoading
    ? 'send-btn-stop'
    : 'send-btn-disabled';

  return (
    <div
      className="rounded-2xl transition-all overflow-visible"
      style={{
        border: '2px solid var(--color-primary-500)',
        backgroundColor: 'var(--color-card-hover)',
      }}
    >
      <textarea
        ref={ref}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled && !isLoading}
        className="rag-input w-full resize-none border-0 outline-none block"
        style={{
          padding: '12px 16px 4px',
          fontSize: 'var(--font-size-sm)',
          color: 'var(--color-text-body)',
          backgroundColor: 'transparent',
          borderRadius: '16px 16px 0 0',
          minHeight: '44px',
          maxHeight: '160px',
        }}
        rows={1}
      />
      <div className="flex items-center justify-between px-3 pb-3 pt-1">
        <div>{scopeSlot}</div>
        <button
          onClick={handleClick}
          disabled={!isLoading && !canSend}
          className={sendBtnClass}
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            border: 'none',
            cursor: canSend || isLoading ? 'pointer' : 'not-allowed',
            transition: 'var(--transition-base)',
          }}
        >
          {isLoading ? (
            <div
              style={{
                width: '12px',
                height: '12px',
                borderRadius: '2px',
                backgroundColor: 'var(--color-text-on-primary)',
              }}
            />
          ) : (
            <ArrowUp className="w-4 h-4" />
          )}
        </button>
      </div>
    </div>
  );
}
