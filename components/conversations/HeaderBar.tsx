'use client'

import React, { useState } from 'react';
import Image from 'next/image';

type IconButtonProps = {
  icon: string;
  onClick: () => void;
  isActive?: boolean;
  ariaLabel: string;
  tooltip: string;
};

function IconButton({ icon, onClick, isActive = false, ariaLabel, tooltip }: IconButtonProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const [buttonPosition, setButtonPosition] = useState({ x: 0 });

  const handleMouseEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setButtonPosition({ x: rect.left + rect.width / 2 });
    setShowTooltip(true);
  };

  const handleMouseLeave = () => {
    setShowTooltip(false);
  };

  return (
    <>
      <button
        onClick={onClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        aria-label={ariaLabel}
        className={`
          w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200
          ${isActive 
            ? 'bg-[#4C596E] text-white' 
            : showTooltip 
              ? 'bg-[#EDEDED] text-[#4C596E]' 
              : 'bg-background text-[#4C596E]'
          }
        `}
      >
        <i className={`fas ${icon} text-sm`} />
      </button>

      {/* Tooltip positioned under the specific button */}
      {showTooltip && (
        <div 
          className="fixed top-16 bg-[#4C596E] text-white shadow z-10 flex justify-center transform -translate-x-1/2 rounded-sm"
          style={{ left: buttonPosition.x }}
        >
          <div style={{ paddingLeft: '6px', paddingRight: '6px', paddingTop: '3px', paddingBottom: '3px' }} className="text-xs font-karla">
            {tooltip.toUpperCase()}
          </div>
        </div>
      )}
    </>
  );
}

type HeaderBarProps = {
  onPrintClick?: () => void;
  onEditClick?: () => void;
  onFormatClick?: () => void;
  onDownloadClick?: () => void;
  onShareClick?: () => void;
  onUploadClick?: () => void;
  isPrintActive?: boolean;
  isEditActive?: boolean;
  isFormatActive?: boolean;
  isDownloadActive?: boolean;
  isShareActive?: boolean;
  isUploadActive?: boolean;
};

export default function HeaderBar({
  onPrintClick = () => {},
  onEditClick = () => {},
  onFormatClick = () => {},
  onDownloadClick = () => {},
  onShareClick = () => {},
  onUploadClick = () => {},
  isPrintActive = false,
  isEditActive = false,
  isFormatActive = false,
  isDownloadActive = false,
  isShareActive = false,
  isUploadActive = false,
}: HeaderBarProps) {
  return (
    <div className="fixed top-0 left-0 w-full bg-background border-b border-border shadow-sm z-20">
      <div className="w-full max-w-4xl mx-auto flex items-center justify-between px-6 h-14">
        {/* Left side - Logo */}
        <div className="flex items-center gap-3">
          <Image 
            src="/threadcub.svg" 
            alt="Threadcub Logo" 
            width={32} 
            height={32} 
            className="flex-shrink-0"
          />
          <div className="flex flex-col">
            <span className="text-[20px] font-bold text-[#6F3F11] font-averia leading-none">
              Threadcub
            </span>
            <span className="text-[10px] font-semibold text-[#333044] font-karla leading-none">
              Little bear. Big memory.
            </span>
          </div>
        </div>

        {/* Right side - Icon buttons */}
        <div className="flex items-center gap-3">
          <IconButton
            icon="fa-upload"
            onClick={onUploadClick}
            isActive={isUploadActive}
            ariaLabel="Upload New File"
            tooltip="Upload"
          />
          <IconButton
            icon="fa-print"
            onClick={onPrintClick}
            isActive={isPrintActive}
            ariaLabel="Print"
            tooltip="Print"
          />
          <IconButton
            icon="fa-edit"
            onClick={onEditClick}
            isActive={isEditActive}
            ariaLabel="Edit"
            tooltip="Edit"
          />
          <IconButton
            icon="fa-list"
            onClick={onFormatClick}
            isActive={isFormatActive}
            ariaLabel="Format"
            tooltip="Format"
          />
          <IconButton
            icon="fa-download"
            onClick={onDownloadClick}
            isActive={isDownloadActive}
            ariaLabel="Download"
            tooltip="Download"
          />
          <IconButton
            icon="fa-share"
            onClick={onShareClick}
            isActive={isShareActive}
            ariaLabel="Share"
            tooltip="Share"
          />
        </div>
      </div>
    </div>
  );
}