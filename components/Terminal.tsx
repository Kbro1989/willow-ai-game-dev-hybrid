
import React, { useState, useRef, useEffect } from 'react';
import { TerminalLine } from '../types';

interface TerminalProps {
  history: TerminalLine[];
  onCommand: (command: string) => void;
}

const Terminal: React.FC<TerminalProps> = ({ history, onCommand }) => {
  const [input, setInput] = useState('');
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [localHistory, setLocalHistory] = useState<string[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [history]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    // PSReadLine style history management
    setLocalHistory(prev => [input, ...prev.slice(0, 49)]);
    setHistoryIndex(-1);

    onCommand(input);
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // PSReadLine style history navigation
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      const nextIndex = historyIndex + 1;
      if (nextIndex < localHistory.length) {
        setHistoryIndex(nextIndex);
        setInput(localHistory[nextIndex]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const nextIndex = historyIndex - 1;
      if (nextIndex >= 0) {
        setHistoryIndex(nextIndex);
        setInput(localHistory[nextIndex]);
      } else if (nextIndex === -1) {
        setHistoryIndex(-1);
        setInput('');
      }
    }
  };

  return (
    <div className="h-full bg-[#050a15] font-mono text-[12px] p-6 overflow-y-auto flex flex-col no-scrollbar shadow-inner" ref={scrollRef}>
      <div className="flex-1 space-y-1">
        <div className="text-cyan-600 font-bold mb-4 opacity-50">
          Windows PowerShell (PSReadLine Simulation v2.2.6)<br />
          Copyright (C) Willow Symphony. All rights reserved.
        </div>

        {history.map((line, i) => (
          <div key={i} className={`mb-1 break-all flex items-start ${line.type === 'error' ? 'text-rose-400' : line.type === 'input' ? 'text-cyan-400 text-glow-cyan' : 'text-cyan-200/60'}`}>
            <span className="mr-3 opacity-30 select-none">[{new Date(line.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}]</span>
            <span className="mr-2 opacity-50 select-none">PS C:\&gt;</span>
            <span className="flex-1">{line.text}</span>
          </div>
        ))}
      </div>
      <form onSubmit={handleSubmit} className="flex mt-6 bg-cyan-950/20 p-3 rounded-xl border border-cyan-900/30">
        <span className="text-cyan-500 mr-2 font-black select-none">PS C:\&gt;</span>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-1 bg-transparent outline-none text-cyan-50 placeholder:text-cyan-900"
          placeholder="Inject PowerShell command..."
          autoFocus
        />
      </form>
      <div className="mt-2 text-[9px] text-cyan-900 font-black uppercase tracking-widest flex justify-between px-2 opacity-40 select-none">
        <span>PSReadLine Enabled</span>
        <span>[Up/Down] History</span>
      </div>
    </div>
  );
};

export default Terminal;
