'use client';

import React, { useState, useRef, useEffect } from 'react';
import { jsPDF } from 'jspdf';
import Image from 'next/image';
import { Pencil, Upload } from 'lucide-react';
import { EditModeProvider, useEditMode } from '@/components/conversations/EditModeContext';
import ConversationViewer from '@/components/conversations/ConversationViewer';
import FooterBar from '@/components/conversations/FooterBar';
import FormatPickerModal from '@/components/conversations/FormatPickerModal';
import HeaderBar from '@/components/conversations/HeaderBar';

export default function PdfPageWrapper() {
  return (
    <EditModeProvider>
      <PdfPage />
    </EditModeProvider>
  );
}

function PdfPage() {
  const [title, setTitle] = useState<string>('Untitled Chat');
  const [fileName, setFileName] = useState<string>('AI_Conversation');
  const [parsedChat, setParsedChat] = useState<string[]>([]);
  const [fullChat, setFullChat] = useState<string[]>([]);
  const [summary, setSummary] = useState<string>('');
  const [structuredSummary, setStructuredSummary] = useState<any[] | null>(null);
  const [platform, setPlatform] = useState<string>('chatGPT');
  const [renderTime, setRenderTime] = useState<number | null>(null);
  const [removedItems, setRemovedItems] = useState<{ idx: number; text: string }[]>([]);
  const [formatModalOpen, setFormatModalOpen] = useState(false);
  const [currentFormat, setCurrentFormat] = useState<'full' | 'summary' | 'structured'>('full');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [lastAttemptedFormat, setLastAttemptedFormat] = useState<'summary' | 'structured' | null>(null);
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());
  const [isEditing, setIsEditing] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [draftTitle, setDraftTitle] = useState(title);
  const inputRef = useRef<HTMLInputElement>(null);
  const { selectedIndexes, clearSelection, editMode, setEditMode } = useEditMode();

  useEffect(() => {
    setDraftTitle(title);
  }, [title]);

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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const start = performance.now();
    const text = await file.text();
    setFileName(file.name);

    let parsed: string[] = [];
    try {
      const json = JSON.parse(text);
      if (json.mapping) {
        // ChatGPT mapping format
        parsed = Object.values(json.mapping)
          .map((msg: any) => msg.message?.content?.parts?.[0])
          .filter(Boolean);
        setPlatform('chatGPT');
      } else if (Array.isArray(json.messages)) {
        // Claude format
        parsed = json.messages.map((msg: any) => `${msg.role}: ${msg.content}`);
        setPlatform('Claude');
      } else if (Array.isArray(json)) {
        // Handle both 'role' and 'speaker' field formats
        parsed = json.map((msg: any) => {
          const role = msg.role || msg.speaker || 'unknown';
          const content = msg.content || msg.message?.content || msg.message || '[No content]';
          return `${role}: ${content}`;
        });
        
        // Detect platform based on structure
        if (json.some((msg: any) => msg.speaker)) {
          setPlatform('ChatGPT'); // Has 'speaker' field
        } else if (json.some((msg: any) => msg.role)) {
          setPlatform('Copilot'); // Has 'role' field
        } else {
          setPlatform('Unknown');
        }
      }
    } catch {
      parsed = text.split(/\n\n+/).filter(Boolean);
    }

    setParsedChat(parsed);
    setFullChat(parsed);
    const end = performance.now();
    setRenderTime(parseFloat(((end - start) / 1000).toFixed(2)));
  };

  const handleFormatSelect = async (mode: 'full' | 'summary' | 'structured') => {
    if (parsedChat.length === 0) {
      alert("Please upload a conversation file before selecting a format.");
      return;
    }

    setCurrentFormat(mode);
    setFormatModalOpen(false);
    setError(null); // Clear any previous errors

    if (mode === 'full') {
      setParsedChat(fullChat);
      setLastAttemptedFormat(null);
      return;
    }

    // Store the attempted format for retry functionality
    setLastAttemptedFormat(mode);

    // Set loading state with appropriate message
    setIsLoading(true);
    if (mode === 'summary') {
      setLoadingMessage('🧠 AI is analyzing your conversation and creating a high-level summary...');
    } else {
      setLoadingMessage('🧩 AI is building a comprehensive structured analysis...');
    }

    try {
      const res = await fetch('/api/summarise-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat: fullChat, structured: mode === 'structured' }),
      });

      if (!res.ok) {
        throw new Error(`API request failed with status ${res.status}`);
      }

      const data = await res.json();
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      if (mode === 'summary') {
        if (data.summary) {
          setSummary(data.summary);
          setParsedChat([`assistant: ${data.summary}`]);
        } else {
          throw new Error('No summary data received from API');
        }
      }
      
      if (mode === 'structured') {
        if (data.structured_summary) {
          // Handle different possible data structures
          let summaryData = data.structured_summary;
          
          // If it's a string, try to parse it as JSON
          if (typeof summaryData === 'string') {
            try {
              summaryData = JSON.parse(summaryData);
            } catch (parseError) {
              console.error('Failed to parse structured summary JSON:', parseError);
              throw new Error('Invalid structured summary format received');
            }
          }
          
          // Ensure it's an array
          if (!Array.isArray(summaryData)) {
            console.error('Structured summary is not an array:', summaryData);
            throw new Error('Structured summary should be an array of sections');
          }
          
          const formatted = summaryData.map((item: any) => {
            const bullets = item.bullets || item.items || [];
            const bulletText = Array.isArray(bullets) ? bullets.join('\n') : '';
            return `assistant: ${item.heading}\n${bulletText}`;
          });
          
          setStructuredSummary(summaryData);
          setParsedChat(formatted);
        } else {
          throw new Error('No structured summary data received from API');
        }
      }
    } catch (err) {
      console.error('Summary generation error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(`Failed to generate ${mode === 'summary' ? 'summary' : 'structured analysis'}: ${errorMessage}`);
      // Revert to full view on error
      setCurrentFormat('full');
      setParsedChat(fullChat);
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  };

  const handleRetryFormat = () => {
    if (lastAttemptedFormat) {
      handleFormatSelect(lastAttemptedFormat);
    }
  };

  const handleDownloadPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(12);
    let y = 20;

    parsedChat.forEach((msg, idx) => {
      const lines = doc.splitTextToSize(msg, 180);
      if (y + lines.length * 7 > 280) {
        doc.addPage();
        y = 20;
      }
      doc.text(lines, 10, y);
      y += lines.length * 7 + 10;
    });

    doc.save(`${fileName.replace(/\.[^/.]+$/, '')}.pdf`);
  };

  const handleRemoveSelected = () => {
    const toRemove = Array.from(selectedIndexes).map((idx) => ({ idx, text: parsedChat[idx] }));
    const updated = parsedChat.filter((_, idx) => !selectedIndexes.has(idx));
    setParsedChat(updated);
    setRemovedItems(toRemove);
    clearSelection();
  };

  const handleUndo = () => {
    const restored = [...parsedChat];
    removedItems.forEach(({ idx, text }) => {
      restored.splice(idx, 0, text);
    });
    setParsedChat(restored);
    setRemovedItems([]);
  };

  const handlePrintSummary = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    const completedCount = Array.from(checkedItems).length;
    const totalItems = document.querySelectorAll('input[type="checkbox"]').length;
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${title} - Summary</title>
          <style>
            body { 
              font-family: system-ui, -apple-system, sans-serif; 
              max-width: 800px; 
              margin: 0 auto; 
              padding: 40px 20px;
              line-height: 1.6;
              color: #333;
            }
            .header { 
              text-align: center; 
              margin-bottom: 40px; 
              border-bottom: 3px solid #333; 
              padding-bottom: 20px; 
            }
            .header h1 {
              font-size: 28px;
              margin-bottom: 10px;
              color: #333;
            }
            .progress { 
              background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
              padding: 20px; 
              border-radius: 12px; 
              margin-bottom: 30px;
              border-left: 5px solid #0ea5e9;
              box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            .progress h3 {
              margin: 0 0 10px 0;
              color: #0369a1;
              font-size: 18px;
            }
            .progress-bar {
              width: 100%;
              height: 8px;
              background: #e2e8f0;
              border-radius: 4px;
              overflow: hidden;
            }
            .progress-fill {
              height: 100%;
              background: linear-gradient(90deg, #10b981, #059669);
              transition: width 0.3s ease;
            }
            .section { 
              margin-bottom: 30px; 
              page-break-inside: avoid;
            }
            .section-title { 
              font-size: 20px; 
              font-weight: bold; 
              margin-bottom: 15px; 
              color: #1f2937;
              display: flex;
              align-items: center;
              gap: 8px;
            }
            .what-worked { color: #059669; }
            .outstanding { color: #d97706; }
            .next-steps { 
              color: #2563eb; 
              background: #eff6ff;
              padding: 20px;
              border-radius: 8px;
              border-left: 4px solid #2563eb;
            }
            .item { 
              margin: 12px 0; 
              display: flex; 
              align-items: flex-start;
              padding: 8px 0;
            }
            .checkbox-container { 
              margin-right: 12px; 
              margin-top: 2px; 
            }
            .checkbox-container input {
              width: 16px;
              height: 16px;
              accent-color: #059669;
            }
            .bullet {
              margin-right: 12px;
              margin-top: 2px;
              font-weight: bold;
            }
            .completed { 
              text-decoration: line-through; 
              color: #6b7280; 
            }
            .item-text {
              flex: 1;
              line-height: 1.5;
            }
            .objective {
              background: #fef3c7;
              padding: 20px;
              border-radius: 8px;
              border-left: 4px solid #f59e0b;
              margin-bottom: 30px;
            }
            @media print { 
              .no-print { display: none; }
              body { font-size: 12px; }
              .header h1 { font-size: 24px; }
              .section-title { font-size: 16px; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${title}</h1>
            <p><strong>Generated:</strong> ${new Date().toLocaleDateString()}</p>
          </div>
          <div class="progress">
            <h3>📊 Progress Overview</h3>
            <p><strong>${completedCount} of ${totalItems} items completed</strong></p>
            <div class="progress-bar">
              <div class="progress-fill" style="width: ${totalItems > 0 ? (completedCount / totalItems) * 100 : 0}%"></div>
            </div>
          </div>
          ${document.querySelector('.prose')?.innerHTML || ''}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const handleShareSummary = async () => {
    const completedCount = Array.from(checkedItems).length;
    const totalItems = document.querySelectorAll('input[type="checkbox"]').length;
    
    const shareText = `${title} - Progress Summary\n\n` +
      `Progress: ${completedCount}/${totalItems} completed\n\n` +
      `Generated: ${new Date().toLocaleDateString()}\n\n` +
      `View full details in Threadcub summary.`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${title} - Summary`,
          text: shareText,
          url: window.location.href
        });
      } catch (err) {
        // User cancelled or share failed - don't auto-copy
        if (err instanceof Error && err.name !== 'AbortError') {
          // Only copy if there was an actual error, not user cancellation
          const shouldCopy = confirm('Share failed. Would you like to copy the summary to clipboard instead?');
          if (shouldCopy) {
            navigator.clipboard.writeText(shareText);
            alert('Summary copied to clipboard!');
          }
        }
      }
    } else {
      // No native share available - ask user what they want to do
      const shouldCopy = confirm('Native sharing not available. Would you like to copy the summary to clipboard?');
      if (shouldCopy) {
        navigator.clipboard.writeText(shareText);
        alert('Summary copied to clipboard!');
      }
    }
  };

  const handleCheckboxChange = (itemId: string) => {
    const newCheckedItems = new Set(checkedItems);
    if (newCheckedItems.has(itemId)) {
      newCheckedItems.delete(itemId);
    } else {
      newCheckedItems.add(itemId);
    }
    setCheckedItems(newCheckedItems);
  };

  const formatSummaryText = (text: string) => {
    let itemCounter = 0;
    
    // Split into paragraphs and process each one
    return text.split('\n\n').map((para, idx) => {
      const trimmedPara = para.trim();
      
      // Skip empty paragraphs
      if (!trimmedPara) return null;
      
      // Handle sections with bullet points
      if (trimmedPara.includes('•') || trimmedPara.includes('- ')) {
        const lines = trimmedPara.split('\n');
        const header = lines[0];
        const bullets = lines.slice(1).filter(line => line.trim() && (line.includes('•') || line.includes('- ')));
        
        // Determine section type for styling and auto-checking
        const isNextSteps = header.toLowerCase().includes('next steps');
        const isWhatWorked = header.toLowerCase().includes('what worked');
        const isOutstanding = header.toLowerCase().includes('outstanding');
        
        return (
          <div key={idx} className={`mb-6 ${isNextSteps ? 'bg-blue-50 border-l-4 border-blue-400 pl-6 py-4 rounded-r-lg' : ''}`}>
            {header && !header.includes('•') && !header.includes('- ') && (
              <h4 
                className={`font-semibold text-lg mb-3 ${
                  isNextSteps ? 'text-blue-900 flex items-center gap-2' : 
                  isWhatWorked ? 'text-green-900' :
                  isOutstanding ? 'text-orange-900' :
                  'text-foreground'
                }`}
                dangerouslySetInnerHTML={{
                  __html: (isNextSteps ? '🚀 ' : isWhatWorked ? '✅ ' : isOutstanding ? '⚠️ ' : '') + header.replace(/\*\*(.*?)\*\*/g, '$1')
                }}
              />
            )}
            {bullets.length > 0 && (
              <ul className="space-y-3 ml-0">
                {bullets.map((bullet, bulletIdx) => {
                  const itemId = `item-${itemCounter++}`;
                  const bulletText = bullet.replace(/^[•\-]\s*/, '').trim();
                  
                  // Auto-check logic: What Worked = checked, Next Steps & Outstanding = unchecked
                  const shouldBeChecked = isWhatWorked;
                  const isChecked = checkedItems.has(itemId) !== undefined ? checkedItems.has(itemId) : shouldBeChecked;
                  
                  return (
                    <li key={bulletIdx} className="flex items-start group">
                      <div className="flex items-center mr-3 mt-0.5">
                        <input
                          type="checkbox"
                          id={itemId}
                          checked={isChecked}
                          onChange={() => handleCheckboxChange(itemId)}
                          className={`w-4 h-4 rounded border-2 ${
                            isNextSteps 
                              ? 'text-blue-600 border-blue-300 focus:ring-blue-500' 
                              : isWhatWorked
                                ? 'text-green-600 border-green-300 focus:ring-green-500'
                                : isOutstanding
                                  ? 'text-orange-600 border-orange-300 focus:ring-orange-500'
                                  : 'text-muted-foreground border-border focus:ring-gray-500'
                          } focus:ring-2 focus:ring-offset-0`}
                        />
                      </div>
                      <div className="flex items-start flex-1">
                        <span className={`mr-3 mt-1 text-sm ${
                          isNextSteps ? 'text-blue-600' : 
                          isWhatWorked ? 'text-green-600' :
                          isOutstanding ? 'text-orange-600' :
                          'text-purple-600'
                        }`}>
                          {isNextSteps ? '→' : isWhatWorked ? '✓' : isOutstanding ? '!' : '•'}
                        </span>
                        <label 
                          htmlFor={itemId}
                          className={`leading-relaxed cursor-pointer transition-all duration-200 ${
                            isChecked 
                              ? 'text-muted-foreground line-through' 
                              : isNextSteps 
                                ? 'text-blue-800 font-medium' 
                                : isWhatWorked
                                  ? 'text-green-800'
                                  : isOutstanding
                                    ? 'text-orange-800'
                                    : 'text-foreground'
                          } ${!isChecked ? 'hover:text-foreground' : ''}`}
                        >
                          {bulletText}
                        </label>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        );
      }
      
      // Handle bold headers with special styling
      if (trimmedPara.includes('**')) {
        const isNextSteps = trimmedPara.toLowerCase().includes('next steps');
        const isWhatWorked = trimmedPara.toLowerCase().includes('what worked');
        const isOutstanding = trimmedPara.toLowerCase().includes('outstanding');
        
        return (
          <div 
            key={idx} 
            className={`mb-4 ${isNextSteps ? 'bg-blue-50 border-l-4 border-blue-400 pl-6 py-4 rounded-r-lg' : ''}`}
            dangerouslySetInnerHTML={{
              __html: trimmedPara.replace(/\*\*(.*?)\*\*/g, `<h4 class="font-semibold text-lg ${
                isNextSteps ? 'text-blue-900' : 
                isWhatWorked ? 'text-green-900' :
                isOutstanding ? 'text-orange-900' :
                'text-foreground'
              } mb-2">${
                isNextSteps ? '🚀 ' : 
                isWhatWorked ? '✅ ' : 
                isOutstanding ? '⚠️ ' : ''
              }$1</h4>`)
            }}
          />
        );
      }
      
      // Regular paragraphs
      return (
        <p key={idx} className="mb-4 text-foreground leading-relaxed">
          {trimmedPara}
        </p>
      );
    }).filter(Boolean);
  };

  return (
    <>
      {/* HeaderBar - only show when we have content */}
      {parsedChat.length > 0 && (
        <>
          <HeaderBar
            onPrintClick={handlePrintSummary}
            onEditClick={() => setEditMode(!editMode)}
            onFormatClick={() => setFormatModalOpen(true)}
            onDownloadClick={handleDownloadPDF}
            onShareClick={handleShareSummary}
            onUploadClick={() => {
              // Trigger file input click to open file explorer
              const fileInput = document.getElementById('header-file-input') as HTMLInputElement;
              if (fileInput) {
                fileInput.click();
              }
            }}
            isPrintActive={false}
            isEditActive={editMode}
            isFormatActive={formatModalOpen}
            isDownloadActive={false}
            isShareActive={false}
            isUploadActive={false}
          />
          
          {/* Hidden file input for header upload button */}
          <input
            id="header-file-input"
            type="file"
            accept=".json,.txt,.md"
            onChange={handleFileUpload}
            className="hidden"
          />
        </>
      )}

      <main className={`min-h-screen bg-[#FAF9F7] flex flex-col items-center justify-start px-4 text-center ${parsedChat.length > 0 ? 'pt-20' : 'pt-12'}`}>
        {parsedChat.length === 0 && (
          <>
            <Image src="/threadcub.svg" alt="Threadcub Logo" width={96} height={96} className="mb-4" />
            <h1 className="text-[56px] font-bold text-[#6F3F11] font-averia">Threadcub</h1>
            <p className="text-[16px] text-[#333044] font-karla font-normal mb-4">Little bear. Big memory.</p>
            <p className="text-[24px] font-bold font-averia text-[#333044] mt-[32px] mb-6 leading-snug max-w-xl">
              Let's turn that super long AI chat into a <br />
              <span className="text-[#333044]">Paw-fessional PDF</span>
            </p>
            <label className="inline-block bg-purple-600 hover:bg-purple-700 text-white text-sm font-bold py-2 px-4 rounded cursor-pointer transition">
              CHOOSE A FILE
              <input
                type="file"
                accept=".json,.txt,.md"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </>
        )}

        {parsedChat.length > 0 && (
          <>
            {renderTime !== null && (
              <p className="text-sm text-muted-foreground mb-4 text-center">
                Generated in {renderTime}s
              </p>
            )}

            {/* Error State */}
            {error && (
              <div className="bg-background shadow-md rounded-xl p-8 border border-red-200 max-w-4xl text-center mb-6">
                <div className="flex flex-col items-center gap-4">
                  <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                    <span className="text-2xl">⚠️</span>
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold text-red-800">Summary Generation Failed</h3>
                    <p className="text-red-600">{error}</p>
                    <p className="text-sm text-muted-foreground">This might be due to API limits, network issues, or conversation complexity</p>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={handleRetryFormat}
                      className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition"
                    >
                      🔄 Retry {lastAttemptedFormat === 'summary' ? 'Summary' : 'Structured Analysis'}
                    </button>
                    <button
                      onClick={() => {
                        setError(null);
                        setCurrentFormat('full');
                        setParsedChat(fullChat);
                      }}
                      className="border border-border text-foreground/80 px-4 py-2 rounded hover:bg-muted/50 transition"
                    >
                      View Full Transcript
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Loading State */}
            {isLoading && (
              <div className="fixed inset-0 bg-background/50 backdrop-blur-sm flex items-center justify-center z-50">
                <div className="text-center">
                  {/* Bear Character */}
                  <div className="mb-6 flex justify-center">
                    <img 
                      src="/coda_cheeky.svg" 
                      alt="Threadcub Bear" 
                      className="w-24 h-24"
                    />
                  </div>
                  
                  {/* Loading Message */}
                  <div className="mb-6">
                    {lastAttemptedFormat === 'summary' ? (
                      <>
                        <h3 className="text-xl font-semibold text-foreground/80 mb-2">
                          Highlights are almost ready... <br></br>Bear with me.
                        </h3>
                      </>
                    ) : (
                      <>
                        <h3 className="text-xl font-semibold text-foreground/80 mb-2">
                          This shouldn't take too long. <br></br>I've got a thread to follow
                        </h3>
                      </>
                    )}
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="w-80 bg-muted rounded-full h-3">
                    <div className="bg-purple-600 h-3 rounded-full animate-pulse" style={{width: '60%'}}></div>
                  </div>
                </div>
              </div>
            )}

            {/* Summary Content - New styled version */}
            {!isLoading && !error && currentFormat === 'summary' && summary && (
              <div className="w-full max-w-4xl mb-10 text-left">
                {/* Title Section - Same as ConversationViewer */}
                <div className="mb-6">
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
                        High level
                      </span>
                      
                      {/* Platform badge */}
                      <span className="text-xs font-bold bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                        {platform}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Overview Section - Styled to match design */}
                <div className="mb-8">
                  <div className="w-full bg-[#F0EEE7] border-8 border-white rounded-lg p-6">
                    <h2 className="text-[20px] font-bold font-averia text-[#4C596E] mb-4">Overview</h2>
                    <div className="text-[#4C596E] leading-relaxed">
                      {/* Extract just the main objective/goal for overview */}
                      {(() => {
                        const summaryLines = summary.split('\n\n');
                        
                        // Find the main objective/goal (first substantial paragraph without sections)
                        const objectiveSection = summaryLines.find(line => {
                          const lower = line.toLowerCase();
                          return (lower.includes('objective') || lower.includes('aimed') || lower.includes('wanted')) &&
                                 !lower.includes('what worked') && 
                                 !lower.includes('outstanding') && 
                                 !lower.includes('next steps') &&
                                 line.length > 50;
                        });
                        
                        if (objectiveSection) {
                          // Clean up and extract just the main goal
                          let cleanObjective = objectiveSection
                            .replace(/\*\*(What Worked|What's Outstanding|Next Steps):.*$/s, '') // Remove section content
                            .replace(/^.*?(objective|aimed|wanted):?\s*/i, '') // Remove prefix
                            .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold formatting
                            .split('.')[0] + '.'; // Take just first sentence
                          
                          // If still too long, truncate at reasonable point
                          if (cleanObjective.length > 200) {
                            const sentences = cleanObjective.split(/[.!?]+/);
                            cleanObjective = sentences[0] + '.';
                          }
                          
                          return (
                            <p className="text-[18px] font-medium font-karla">{cleanObjective.trim()}</p>
                          );
                        }
                        
                        // Fallback - take first sentence of first substantial paragraph
                        const firstParagraph = summaryLines.find(line => 
                          line.length > 30 && 
                          !line.toLowerCase().includes('what worked') &&
                          !line.toLowerCase().includes('outstanding') &&
                          !line.toLowerCase().includes('next steps')
                        );
                        
                        if (firstParagraph) {
                          const firstSentence = firstParagraph.split(/[.!?]+/)[0] + '.';
                          return <p className="text-[18px] font-medium font-karla">{firstSentence}</p>;
                        }
                        
                        return <p className="text-[18px] font-medium font-karla">Project overview summary.</p>;
                      })()}
                    </div>
                  </div>
                </div>

                {/* Checkbox Sections */}
                <div className="space-y-0">
                  {(() => {
                    let itemCounter = 0;
                    const sections = [];
                    
                    // Parse the summary with improved section extraction
                    const summaryText = summary;
                    
                    // Extract explicit sections first
                    const sectionPatterns = [
                      { 
                        pattern: /\*\*What Worked:\*\*(.*?)(?=\*\*(?:What's Outstanding|Next Steps):\*\*|$)/s,
                        title: 'What Worked',
                        type: 'outcome',
                        autoCheck: true
                      },
                      { 
                        pattern: /\*\*What's Outstanding:\*\*(.*?)(?=\*\*Next Steps:\*\*|$)/s,
                        title: "What's Outstanding",
                        type: 'outstanding',
                        autoCheck: false
                      },
                      { 
                        pattern: /\*\*Next Steps:\*\*(.*?)$/s,
                        title: 'Next Steps',
                        type: 'next',
                        autoCheck: false
                      },
                      {
                        pattern: /\*\*Process:\*\*(.*?)(?=\*\*(?:Outcome|Results|What Worked):\*\*|$)/s,
                        title: 'Process',
                        type: 'process',
                        autoCheck: false
                      },
                      {
                        pattern: /\*\*(Outcome|Results):\*\*(.*?)(?=\*\*Next Steps:\*\*|$)/s,
                        title: 'Outcome',
                        type: 'outcome',
                        autoCheck: true
                      }
                    ];
                    
                    // Extract sections using patterns
                    sectionPatterns.forEach(({ pattern, title, type, autoCheck }) => {
                      const match = summaryText.match(pattern);
                      if (match) {
                        const content = match[1] || match[2] || '';
                        const items: string[] = [];
                        
                        // Parse bullet points or sentences from content
                        if (content.includes('•') || content.includes('- ')) {
                          const bullets = content.split('\n').filter(line => {
                            const clean = line.trim();
                            return clean && (clean.includes('•') || clean.includes('- '));
                          });
                          
                          bullets.forEach(bullet => {
                            const text = bullet.replace(/^[•\-]\s*/, '').trim();
                            if (text.length > 10) {
                              items.push(text);
                            }
                          });
                        } else {
                          // Split into sentences for non-bullet content
                          const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 15);
                          sentences.forEach(sentence => {
                            const clean = sentence.trim();
                            if (clean) {
                              items.push(clean + '.');
                            }
                          });
                        }
                        
                        if (items.length > 0) {
                          sections.push({
                            title,
                            items,
                            type,
                            isNextSteps: type === 'next',
                            isWhatWorked: type === 'outcome',
                            isOutstanding: type === 'outstanding',
                            autoCheck
                          });
                        }
                      }
                    });
                    
                    // If no explicit sections found, create smart categorization
                    if (sections.length === 0) {
                      const summaryParts = summary.split('\n\n').filter(part => {
                        const trimmed = part.trim().toLowerCase();
                        return trimmed.length > 20 && 
                               !trimmed.includes('overview') && 
                               !trimmed.includes('objective');
                      });
                      
                      const processItems: string[] = [];
                      const outcomeItems: string[] = [];
                      const nextStepsItems: string[] = [];
                      
                      summaryParts.forEach(part => {
                        const sentences = part.split(/[.!?]+/).filter(s => s.trim().length > 15);
                        
                        sentences.forEach(sentence => {
                          const clean = sentence.trim();
                          const lower = clean.toLowerCase();
                          
                          if (lower.includes('should') || lower.includes('need') || 
                              lower.includes('requested') || lower.includes('delegate') ||
                              lower.includes('handover') || lower.includes('create a json')) {
                            nextStepsItems.push(clean + '.');
                          } else if (lower.includes('successfully') || lower.includes('completed') || 
                                     lower.includes('added') || lower.includes('updated') || 
                                     lower.includes('provided') || lower.includes('fixed') ||
                                     lower.includes('guided')) {
                            outcomeItems.push(clean + '.');
                          } else if (lower.includes('assistant') || lower.includes('user') || 
                                     lower.includes('identified') || lower.includes('changed mind')) {
                            processItems.push(clean + '.');
                          }
                        });
                      });
                      
                      if (processItems.length > 0) {
                        sections.push({
                          title: 'Process',
                          items: processItems,
                          type: 'process',
                          isNextSteps: false,
                          isWhatWorked: false,
                          isOutstanding: false,
                          autoCheck: false
                        });
                      }
                      
                      if (outcomeItems.length > 0) {
                        sections.push({
                          title: 'What Worked',
                          items: outcomeItems,
                          type: 'outcome',
                          isNextSteps: false,
                          isWhatWorked: true,
                          isOutstanding: false,
                          autoCheck: true
                        });
                      }
                      
                      if (nextStepsItems.length > 0) {
                        sections.push({
                          title: 'Next Steps',
                          items: nextStepsItems,
                          type: 'next',
                          isNextSteps: true,
                          isWhatWorked: false,
                          isOutstanding: true,
                          autoCheck: false
                        });
                      }
                    }
                    
                    // Render sections with purple checkboxes
                    return sections.map((section, sectionIdx) => (
                      <div key={sectionIdx}>
                        {/* Section Title */}
                        <div className="pt-6 pb-6">
                          <h3 className="text-[20px] font-bold font-averia text-[#4C596E] mb-6">
                            {section.title}
                          </h3>
                          
                          {/* Section Items with Purple Checkboxes */}
                          <div className="space-y-2">
                            {section.items.map((item, itemIdx) => {
                              const itemId = `item-${itemCounter++}`;
                              
                              // Auto-check logic based on section type
                              const shouldBeChecked = section.autoCheck || section.isWhatWorked;
                              const isChecked = checkedItems.has(itemId) !== undefined ? checkedItems.has(itemId) : shouldBeChecked;
                              
                              return (
                                <div key={itemIdx} className="flex items-start gap-3">
                                  <input
                                    type="checkbox"
                                    id={itemId}
                                    checked={isChecked}
                                    onChange={() => handleCheckboxChange(itemId)}
                                    className="w-5 h-5 mt-0.5 text-purple-600 border-purple-300 rounded-sm focus:ring-purple-500 focus:ring-2"
                                    style={{
                                      accentColor: '#9333ea',
                                      width: '20px',
                                      height: '20px',
                                      borderRadius: '2px'
                                    }}
                                  />
                                  <label 
                                    htmlFor={itemId}
                                    className={`text-[18px] font-medium font-karla leading-relaxed cursor-pointer transition-all duration-200 flex-1 ${
                                      isChecked 
                                        ? 'text-muted-foreground line-through' 
                                        : 'text-[#4C596E] hover:text-foreground'
                                    }`}
                                  >
                                    {item}
                                  </label>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                        
                        {/* 1px divider line between sections (except last) */}
                        {sectionIdx < sections.length - 1 && (
                          <div className="border-b border-[#E0DBCC]" style={{ borderWidth: '1px' }}></div>
                        )}
                      </div>
                    ));
                  })()}
                </div>
              </div>
            )}

            {!isLoading && !error && currentFormat === 'structured' && structuredSummary && (
              <div className="w-full max-w-4xl mb-10 text-left">
                {/* Title Section - Same as other views */}
                <div className="mb-6">
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
                        Structured
                      </span>
                      
                      {/* Platform badge */}
                      <span className="text-xs font-bold bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                        {platform}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Overview Section */}
                <div className="mb-8">
                  <div className="w-full bg-[#F0EEE7] border-8 border-white rounded-lg p-6">
                    <h2 className="text-[20px] font-bold font-averia text-[#4C596E] mb-4">Overview</h2>
                    <div className="text-[#4C596E] leading-relaxed">
                      <p className="text-[18px] font-medium font-karla">
                        Comprehensive structured analysis of the conversation broken down into organized sections with priorities and actionable insights.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Structured Sections */}
                <div className="space-y-0">
                  {structuredSummary.map((section, sectionIdx) => {
                    // Import icons from Lucide at component level
                    const { Target, Settings, CheckCircle, AlertTriangle, TrendingUp, Lightbulb, FileText, Zap } = require('lucide-react');
                    
                    const sectionIcons: Record<string, any> = {
                      'project overview': Target,
                      'project context': Target,
                      'technical implementation': Settings,
                      'completed work': CheckCircle,
                      'challenges & solutions': AlertTriangle,
                      'current status': TrendingUp,
                      'current challenges': AlertTriangle,
                      'risk assessment': AlertTriangle,
                      'next steps': Zap,
                      'immediate next steps': Zap,
                      'future considerations': Lightbulb,
                      'handover notes': FileText
                    };
                    
                    const sectionKey = section.heading.toLowerCase();
                    const iconKey = Object.keys(sectionIcons).find(key => sectionKey.includes(key));
                    const IconComponent = iconKey ? sectionIcons[iconKey] : FileText;
                    
                    // Determine if this section should have items auto-checked
                    const isCompletedWork = sectionKey.includes('completed') || sectionKey.includes('what worked');
                    
                    return (
                      <div key={sectionIdx}>
                        {/* Section Title with Icon */}
                        <div className="pt-6 pb-6">
                          <div className="flex items-center gap-3 mb-2">
                            <IconComponent size={24} className="text-[#4C596E]" />
                            <h3 className="text-[20px] font-bold font-averia text-[#4C596E]">
                              {section.heading}
                            </h3>
                            {section.priority && (
                              <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                section.priority === 'High' ? 'bg-red-100 text-red-800' :
                                section.priority === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-green-100 text-green-800'
                              }`}>
                                {section.priority} Priority
                              </span>
                            )}
                          </div>
                          
                          {section.description && (
                            <p className="text-[16px] font-medium font-karla text-[#4C596E] mb-6 italic">
                              {section.description}
                            </p>
                          )}
                          
                          {/* Section Items with Checkboxes */}
                          <div className="space-y-2">
                            {(section.bullets || section.items || []).map((item: any, itemIdx: number) => {
                              const itemId = `struct-item-${sectionIdx}-${itemIdx}`;
                              const itemText = typeof item === 'string' ? item : item.text || item.description || item;
                              const itemPriority = typeof item === 'object' ? item.priority : null;
                              const itemStatus = typeof item === 'object' ? item.status : null;
                              
                              // Auto-check completed work items
                              const shouldBeChecked = isCompletedWork;
                              const isChecked = checkedItems.has(itemId) !== undefined ? checkedItems.has(itemId) : shouldBeChecked;
                              
                              return (
                                <div key={itemIdx} className="flex items-start gap-3">
                                  <input
                                    type="checkbox"
                                    id={itemId}
                                    checked={isChecked}
                                    onChange={() => handleCheckboxChange(itemId)}
                                    className="w-5 h-5 mt-0.5 text-purple-600 border-purple-300 rounded-sm focus:ring-purple-500 focus:ring-2"
                                    style={{
                                      accentColor: '#9333ea',
                                      width: '20px',
                                      height: '20px',
                                      borderRadius: '2px'
                                    }}
                                  />
                                  <div className="flex-1">
                                    <label 
                                      htmlFor={itemId}
                                      className={`text-[18px] font-medium font-karla leading-relaxed cursor-pointer transition-all duration-200 block ${
                                        isChecked 
                                          ? 'text-muted-foreground line-through' 
                                          : 'text-[#4C596E] hover:text-foreground'
                                      }`}
                                    >
                                      {itemText}
                                    </label>
                                    
                                    {/* Priority and Status badges */}
                                    {(itemPriority || itemStatus) && (
                                      <div className="flex gap-2 mt-2">
                                        {itemPriority && (
                                          <span className={`px-2 py-1 text-xs font-medium rounded ${
                                            itemPriority === 'High' ? 'bg-red-50 text-red-700 border border-red-200' :
                                            itemPriority === 'Medium' ? 'bg-yellow-50 text-yellow-700 border border-yellow-200' :
                                            'bg-green-50 text-green-700 border border-green-200'
                                          }`}>
                                            {itemPriority}
                                          </span>
                                        )}
                                        {itemStatus && (
                                          <span className={`px-2 py-1 text-xs font-medium rounded ${
                                            itemStatus === 'Complete' ? 'bg-green-50 text-green-700 border border-green-200' :
                                            itemStatus === 'In Progress' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                                            'bg-muted/50 text-foreground/80 border border-border'
                                          }`}>
                                            {itemStatus}
                                          </span>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                        
                        {/* 1px divider line between sections (except last) */}
                        {sectionIdx < structuredSummary.length - 1 && (
                          <div className="border-b border-[#E0DBCC]" style={{ borderWidth: '1px' }}></div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {!isLoading && !error && currentFormat === 'full' && (
              <ConversationViewer
                messages={parsedChat}
                platform={platform}
                fileName={fileName}
                title={title}
                setTitle={setTitle}
                onRemove={handleRemoveSelected}
                currentFormat={currentFormat}
              />
            )}

            {/* Show simplified FooterBar when items are selected OR when showing undo */}
            {currentFormat === 'full' && editMode && (selectedIndexes.size > 0 || removedItems.length > 0) && (
              <div className="fixed bottom-0 left-0 w-full bg-background border-t shadow z-10 flex justify-center">
                <div className="w-full max-w-4xl flex items-center justify-center px-6 py-3">
                  {removedItems.length > 0 ? (
                    // Undo state: show confirmation and undo button
                    <div className="flex items-center gap-3">
                      <div className="bg-green-100 text-green-800 text-sm px-4 py-2 rounded">
                        {removedItems.length} ITEM{removedItems.length > 1 ? 'S' : ''} REMOVED
                      </div>
                      <button
                        onClick={handleUndo}
                        className="border border-border text-foreground/80 text-sm px-4 py-2 rounded hover:bg-muted/50 transition"
                      >
                        UNDO
                      </button>
                    </div>
                  ) : (
                    // Remove state: show remove button
                    <button
                      onClick={handleRemoveSelected}
                      className="bg-red-500 text-white text-sm px-6 py-2 rounded hover:bg-red-600 transition"
                    >
                      REMOVE {selectedIndexes.size} ITEM{selectedIndexes.size > 1 ? 'S' : ''}
                    </button>
                  )}
                </div>
              </div>
            )}

            <FormatPickerModal
              open={formatModalOpen}
              onClose={() => setFormatModalOpen(false)}
              onFormatSelect={handleFormatSelect}
              selectedFormat={currentFormat}
            />
          </>
        )}
      </main>
    </>
  );
}