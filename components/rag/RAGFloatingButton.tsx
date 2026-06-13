'use client';
import { useState, useEffect } from 'react';
import Image from 'next/image';

interface RAGFloatingButtonProps {
  onClick: () => void;
  selectedCount?: number;
  hasReadyConversations?: boolean;
}

export function RAGFloatingButton({
  onClick,
  selectedCount = 0,
  hasReadyConversations = false,
}: RAGFloatingButtonProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  const [onboardingHidden, setOnboardingHidden] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      const { active, ragVisible } = (e as CustomEvent).detail ?? {};
      // Hide during active onboarding unless the current step explicitly shows the button
      setOnboardingHidden(!!active && !ragVisible);
    };
    window.addEventListener('threadcub:onboarding-state', handler);
    return () => window.removeEventListener('threadcub:onboarding-state', handler);
  }, []);

  return (
    <div
      className="fixed bottom-6 right-6 z-50"
      data-onboarding-card="rag-button"
      style={onboardingHidden ? { visibility: 'hidden', pointerEvents: 'none' } : undefined}
    >
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50%       { transform: translateY(-5px); }
        }
        @keyframes bounceClick {
          0%   { transform: scale(1); }
          40%  { transform: scale(0.88); }
          70%  { transform: scale(1.08); }
          100% { transform: scale(1); }
        }
        .coda-float {
          animation: float 3s ease-in-out infinite;
        }
        .coda-pressed {
          animation: bounceClick 0.35s ease-out both;
        }
      `}</style>

      {/* Tooltip */}
      {isHovered && (
        <div className="absolute bottom-full right-0 mb-3 w-max max-w-xs pointer-events-none">
          <div style={{
            backgroundColor: 'hsl(var(--foreground))',
            color: 'hsl(var(--background))',
            fontSize: 'var(--font-size-xs)',
            fontFamily: 'var(--font-family-primary)',
            padding: '6px 12px',
            borderRadius: 'var(--border-radius-base)',
            boxShadow: 'var(--shadow-card-hover)',
            whiteSpace: 'nowrap',
            position: 'relative',
          }}>
            {selectedCount >= 2
              ? `Analyze ${selectedCount} conversations`
              : hasReadyConversations
                ? 'Ask ThreadCub'
                : 'Import conversations to get started'
            }
            <div style={{
              position: 'absolute',
              top: '100%',
              right: '20px',
              width: 0, height: 0,
              borderLeft: '4px solid transparent',
              borderRight: '4px solid transparent',
              borderTop: '4px solid hsl(var(--foreground))',
            }} />
          </div>
        </div>
      )}

      {/* Badge */}
      {selectedCount > 0 && (
        <div className="absolute -top-1.5 -right-1.5 bg-indigo-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center shadow z-10">
          {selectedCount}
        </div>
      )}

      {/* Button */}
      <button
        onClick={() => {
          if (!hasReadyConversations) return;
          setIsPressed(true);
          setTimeout(() => setIsPressed(false), 350);
          onClick();
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        disabled={!hasReadyConversations}
        className={`
        relative w-20 h-20
        ${hasReadyConversations ? 'cursor-pointer' : 'opacity-50 cursor-not-allowed'}
      `}
        aria-label="Open ThreadCub chat"
      >
        <div className={`w-full h-full flex items-center justify-center ${isPressed ? 'coda-pressed' : 'coda-float'}`}>

          {/* Default pose */}
          <Image
            src="/coda-default.svg"
            alt="ThreadCub"
            width={72}
            height={72}
            className={`absolute transition-opacity duration-200 ${isHovered ? 'opacity-0' : 'opacity-100'} ${isHovered ? '' : 'drop-shadow-lg'}`}
            priority
          />

          {/* Hover pose */}
          <Image
            src="/coda-hover.svg"
            alt="ThreadCub hover"
            width={72}
            height={72}
            className={`absolute transition-opacity duration-200 ${isHovered ? 'opacity-100 drop-shadow-xl' : 'opacity-0'}`}
            priority
          />
        </div>
      </button>
    </div>
  );
}