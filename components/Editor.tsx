
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { getCodeCompletions, auditCode, refactorCode } from '../services/cloudflareService';
import { CodeCompletion, CodeIssue } from '../types';

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
  const [issues, setIssues] = useState<CodeIssue[]>([]);
  const [showIssuePanel, setShowIssuePanel] = useState(false);
  const [refactorSuggestion, setRefactorSuggestion] = useState<{ original: string, modified: string, explanation: string } | null>(null);
  const [isAuditing, setIsAuditing] = useState(false);
  const [isRefactoring, setIsRefactoring] = useState(false);

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

  const handleAudit = async () => {
    if (!content || isAuditing) return;
    setIsAuditing(true);
    try {
      const results = await auditCode(content, filename);
      setIssues(results);
      setShowIssuePanel(results.length > 0);
    } finally {
      setIsAuditing(false);
    }
  };

  const handleRefactor = async () => {
    if (!content || isRefactoring) return;
    setIsRefactoring(true);
    try {
      const suggestion = await refactorCode(content, filename);
      setRefactorSuggestion(suggestion);
    } finally {
      setIsRefactoring(false);
    }
  };

  const applyRefactor = () => {
    if (refactorSuggestion) {
      onChange(refactorSuggestion.modified);
      setRefactorSuggestion(null);
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
                      className={`w-full text-left px-5 py-3 font-mono text-[11px] flex flex-col border-b border-cyan-900/20 last:border-0 transition-colors ${selectedIndex === i ? 'bg-cyan-600/30 text-white border-l-4 border-l-cyan-400' : 'text-slate-400 hover:bg-cyan-900/40'
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

            {showIssuePanel && (
              <div className="absolute bottom-4 left-4 right-4 z-[110] bg-[#0a1222]/95 border border-cyan-500/20 rounded-2xl shadow-2xl backdrop-blur-2xl animate-in slide-in-from-bottom-4 duration-300">
                <div className="px-6 py-3 border-b border-cyan-900/40 flex justify-between items-center">
                  <span className="text-[10px] font-black uppercase text-cyan-400 tracking-widest">Neural Code Audit: {issues.length} Issues Found</span>
                  <button onClick={() => setShowIssuePanel(false)} className="text-slate-500 hover:text-white transition-colors">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
                <div className="max-h-[150px] overflow-y-auto p-4 space-y-2 no-scrollbar">
                  {issues.map((issue, i) => (
                    <div key={i} className="flex items-start space-x-3 p-3 bg-cyan-950/20 rounded-xl border border-cyan-500/10">
                      <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${issue.severity === 'error' ? 'bg-rose-500' : issue.severity === 'warning' ? 'bg-amber-500' : 'bg-cyan-500'}`}></div>
                      <div>
                        <p className="text-[11px] text-cyan-50 font-bold">{issue.message}</p>
                        <p className="text-[9px] text-slate-500 font-medium">Line {issue.line}: {issue.codeSnippet}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {refactorSuggestion && (
              <div className="absolute inset-4 z-[120] bg-[#0a1222]/98 border border-cyan-500/40 rounded-[2.5rem] shadow-[0_0_100px_rgba(0,242,255,0.2)] backdrop-blur-3xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
                <div className="px-10 py-6 border-b border-cyan-900/40 flex justify-between items-center bg-cyan-950/20">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black uppercase text-cyan-400 tracking-widest">Neural Refactor Suggestion</span>
                    <span className="text-[9px] text-slate-500 mt-1 uppercase font-black uppercase tracking-widest">Optimization Sequence Alpha</span>
                  </div>
                  <div className="flex space-x-4">
                    <button onClick={() => setRefactorSuggestion(null)} className="px-6 py-2 border border-cyan-900/40 rounded-xl text-[9px] font-black uppercase tracking-widest text-slate-400 hover:bg-white/5 hover:text-white transition-all">Dismiss</button>
                    <button onClick={applyRefactor} className="px-8 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition-all shadow-lg shadow-cyan-500/20">Commit Changes</button>
                  </div>
                </div>
                <div className="flex-1 p-10 overflow-hidden flex flex-col space-y-8">
                  <div className="p-6 bg-cyan-900/10 border border-cyan-500/10 rounded-3xl">
                    <p className="text-[12px] font-medium text-cyan-50 leading-relaxed italic">"{refactorSuggestion.explanation}"</p>
                  </div>
                  <div className="flex-1 grid grid-cols-2 gap-8 overflow-hidden">
                    <div className="flex flex-col space-y-3">
                      <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest px-2">Original Context</span>
                      <div className="flex-1 bg-black/40 rounded-3xl p-6 font-mono text-[11px] text-rose-300/60 overflow-y-auto no-scrollbar border border-rose-500/5 line-through">
                        {refactorSuggestion.original}
                      </div>
                    </div>
                    <div className="flex flex-col space-y-3">
                      <span className="text-[9px] font-black uppercase text-cyan-500 tracking-widest px-2">Neural Optimized Output</span>
                      <div className="flex-1 bg-cyan-600/5 rounded-3xl p-6 font-mono text-[11px] text-cyan-50 overflow-y-auto no-scrollbar border border-cyan-500/20">
                        {refactorSuggestion.modified}
                      </div>
                    </div>
                  </div>
                </div>
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
            <button
              onClick={handleAudit}
              disabled={isAuditing}
              className={`p-2 rounded-lg transition-all ${isAuditing ? 'bg-amber-500/20 text-amber-500 animate-pulse' : issues.length > 0 ? 'bg-amber-500/10 text-amber-400 animate-pulse hover:bg-amber-500/20' : 'text-slate-500 hover:bg-white/5 hover:text-white'}`}
              title="Antigravity Code Audit"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
            </button>
            <button
              onClick={handleRefactor}
              disabled={isRefactoring}
              className={`p-2 rounded-lg transition-all ${isRefactoring ? 'bg-cyan-500/20 text-cyan-400 animate-pulse' : 'text-slate-500 hover:bg-white/5 hover:text-white'}`}
              title="Antigravity Neural Refactor"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            </button>
            <div className="w-px h-6 bg-cyan-900/30 mx-2"></div>
            <span className="text-cyan-600/80">HOT-SWAP READY</span>
            <div className="w-2 h-2 rounded-full bg-cyan-500 animate-ping"></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Editor;
