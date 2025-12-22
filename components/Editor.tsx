
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { getCodeCompletions } from '../services/geminiService';
import { CodeCompletion } from '../types';

interface EditorProps {
  content: string;
  filename: string;
  onChange: (content: string) => void;
  lastSaved?: number;
  isSyncing?: boolean;
}

const Editor: React.FC<EditorProps> = ({ content, filename, onChange, lastSaved, isSyncing }) => {
  const [completions, setCompletions] = useState<CodeCompletion[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [showMenu, setShowMenu] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });
  const [isLoading, setIsLoading] = useState(false);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const debounceTimer = useRef<number | null>(null);

  const triggerCompletion = useCallback(async () => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const selectionStart = textarea.selectionStart;
    const prefix = content.slice(0, selectionStart);
    const suffix = content.slice(selectionStart);

    if (prefix.trim().length < 2) return;

    setIsLoading(true);
    const suggestions = await getCodeCompletions(prefix, suffix, filename);
    
    if (suggestions && suggestions.length > 0) {
      setCompletions(suggestions);
      setSelectedIndex(0);
      setShowMenu(true);
      
      const lines = prefix.split('\n');
      const currentLine = lines.length;
      const currentCol = lines[lines.length - 1].length;
      
      setMenuPos({
        top: Math.min(textarea.offsetHeight - 150, currentLine * 24 + 10),
        left: Math.min(textarea.offsetWidth - 250, currentCol * 8.5 + 55)
      });
    } else {
      setShowMenu(false);
    }
    setIsLoading(false);
  }, [content, filename]);

  const applyCompletion = (completion: CodeCompletion) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const newContent = content.slice(0, start) + completion.text + content.slice(start);
    onChange(newContent);
    setShowMenu(false);
    
    setTimeout(() => {
      textarea.focus();
      const newCursorPos = start + completion.text.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showMenu) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % completions.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + completions.length) % completions.length);
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        applyCompletion(completions[selectedIndex]);
      } else if (e.key === 'Escape') {
        setShowMenu(false);
      }
    }
    
    if (e.ctrlKey && e.code === 'Space') {
      e.preventDefault();
      triggerCompletion();
    }
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newVal = e.target.value;
    onChange(newVal);
    
    if (debounceTimer.current) window.clearTimeout(debounceTimer.current);
    
    const cursor = textareaRef.current?.selectionStart || 0;
    const lastChar = newVal[cursor - 1];
    
    if (/[a-zA-Z0-9_$.({]/.test(lastChar)) {
      debounceTimer.current = window.setTimeout(() => {
        triggerCompletion();
      }, 300);
    } else {
      setShowMenu(false);
    }
  };

  if (!filename) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-cyan-900 bg-[#050a15]">
        <svg className="w-16 h-16 mb-4 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
        <p className="text-sm font-black uppercase tracking-widest opacity-40">Initialize core binary file</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-[#050a15] relative group/editor">
      <div className="flex-1 relative">
        <div className="absolute inset-0 flex overflow-auto no-scrollbar">
          <div className="w-12 bg-[#050a15] border-r border-cyan-900/20 py-4 flex flex-col items-end px-2 text-cyan-900 select-none font-mono text-[10px] font-bold shrink-0">
            {content.split('\n').map((_, i) => (
              <div key={i} className="h-6 leading-6">{i + 1}</div>
            ))}
          </div>
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={content}
              onChange={handleTextChange}
              onKeyDown={handleKeyDown}
              spellCheck={false}
              className="w-full h-full bg-transparent text-cyan-50 p-4 font-mono text-[13px] leading-6 resize-none outline-none focus:ring-0 placeholder-cyan-950 whitespace-pre"
              placeholder="Binary input stream..."
            />

            {showMenu && (
              <div 
                className="absolute z-[100] bg-[#0a1222]/95 border border-cyan-500/40 shadow-[0_0_50px_rgba(0,242,255,0.3)] rounded-2xl overflow-hidden min-w-[320px] backdrop-blur-2xl animate-in fade-in zoom-in-95 duration-100"
                style={{ top: `${menuPos.top}px`, left: `${menuPos.left}px` }}
              >
                <div className="max-h-[300px] overflow-y-auto no-scrollbar">
                  {completions.map((item, i) => (
                    <button
                      key={i}
                      onClick={() => applyCompletion(item)}
                      onMouseEnter={() => setSelectedIndex(i)}
                      className={`w-full text-left px-5 py-3 font-mono text-[11px] flex flex-col border-b border-cyan-900/20 last:border-0 transition-colors ${
                        selectedIndex === i ? 'bg-cyan-600/30 text-white border-l-4 border-l-cyan-400' : 'text-slate-400 hover:bg-cyan-900/40'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold tracking-tight text-cyan-50">{item.text}</span>
                        <span className="text-[8px] bg-cyan-950 px-2 py-0.5 rounded text-cyan-600 font-black uppercase">Suggest</span>
                      </div>
                      {item.description && (
                        <span className={`text-[9px] mt-1 italic ${selectedIndex === i ? 'text-cyan-200/60' : 'text-cyan-900'}`}>
                          {item.description}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
                <div className="bg-[#050a15] px-4 py-2 text-[8px] text-cyan-400/50 uppercase font-black tracking-widest flex justify-between border-t border-cyan-900/40 shadow-inner">
                  <div className="flex items-center space-x-3">
                    <span className="text-white bg-cyan-900/40 px-1.5 py-0.5 rounded">Enter</span>
                    <span>Accept</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse"></div>
                    <span>Neural Link Active</span>
                  </div>
                </div>
              </div>
            )}
            
            {(isLoading || showMenu) && (
               <div className="absolute top-4 right-8 bg-cyan-950/40 text-cyan-400/60 text-[9px] px-4 py-1.5 rounded-full border border-cyan-500/20 backdrop-blur-md font-black tracking-[0.2em] shadow-[0_0_15px_rgba(0,242,255,0.1)] uppercase">
                 {isLoading ? 'Streaming suggestions...' : 'Binary Buffer Loaded'}
               </div>
            )}
          </div>
        </div>
      </div>
      
      <div className="h-10 border-t border-cyan-900/30 bg-[#0a1222] px-8 flex items-center justify-between text-[10px] text-slate-500 uppercase font-black tracking-[0.4em] shrink-0">
         <div className="flex items-center space-x-8">
           <div className="flex items-center space-x-2">
             <span className="w-2 h-2 rounded-full bg-cyan-600 shadow-[0_0_10px_#00f2ff]"></span>
             <span className="text-cyan-500/80">Symphony v4.2 PRO</span>
           </div>
           <span className="opacity-40">{filename}</span>
           <div className="flex items-center space-x-2">
             <span className={`w-1.5 h-1.5 rounded-full ${isSyncing ? 'bg-amber-500 animate-ping' : 'bg-emerald-500'} shadow-[0_0_8px_currentColor]`}></span>
             <span className={`${isSyncing ? 'text-amber-500' : 'text-emerald-500/80'}`}>
               {isSyncing ? 'Neural Persistence Syncing...' : `Saved ${lastSaved ? new Date(lastSaved).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'Now'}`}
             </span>
           </div>
         </div>
         <div className="flex items-center space-x-6">
           <div className="flex flex-col items-end opacity-40">
             <span className="text-[8px] tracking-[0.2em]">Auto-Save</span>
             <span className="font-mono text-cyan-400">AGGRESSIVE</span>
           </div>
           <div className="w-px h-6 bg-cyan-900/30 mx-2"></div>
           <div className="flex items-center space-x-3">
             <span className="text-cyan-600/80">HOT-SWAP READY</span>
             <div className="w-2 h-2 rounded-full bg-cyan-500 animate-ping"></div>
           </div>
         </div>
      </div>
    </div>
  );
};

export default Editor;
