
import React, { useState } from 'react';
import { Extension } from '../types';

interface ExtensionRegistryProps {
  extensions: Extension[];
  onUninstall?: (id: string) => void;
}

const ExtensionRegistry: React.FC<ExtensionRegistryProps> = ({ extensions, onUninstall }) => {
  const [search, setSearch] = useState('');

  const filtered = extensions.filter(ext => 
    ext.identifier.id.toLowerCase().includes(search.toLowerCase()) || 
    ext.metadata.publisherDisplayName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full space-y-4">
      <div className="px-1">
        <input 
          type="text" 
          placeholder="Filter extensions..." 
          value={search} 
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-[#050a15] border border-cyan-900/30 rounded-2xl px-4 py-3 text-[11px] text-cyan-100 outline-none focus:border-cyan-500/50 transition-all shadow-inner placeholder:text-slate-700"
        />
      </div>

      <div className="flex-1 overflow-y-auto space-y-3 pr-2 no-scrollbar">
        {filtered.length === 0 && (
          <div className="text-center py-10 opacity-30">
            <p className="text-[10px] uppercase font-black tracking-widest">No extensions found</p>
          </div>
        )}
        {filtered.map((ext) => (
          <div 
            key={ext.identifier.uuid || ext.identifier.id} 
            className="group bg-[#0a1222]/50 border border-cyan-900/20 rounded-[1.5rem] p-4 hover:border-cyan-500/30 transition-all relative overflow-hidden"
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-lg bg-cyan-600/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                </div>
                <div className="flex flex-col">
                  <span className="text-[12px] font-bold text-slate-100 leading-tight">
                    {ext.identifier.id.split('.').pop()}
                  </span>
                  <span className="text-[9px] text-cyan-400 uppercase font-black tracking-widest opacity-60">
                    {ext.metadata.publisherDisplayName}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-mono text-cyan-500/60 bg-cyan-500/5 px-2 py-0.5 rounded-full border border-cyan-500/10">
                  v{ext.version}
                </span>
              </div>
            </div>

            <p className="text-[10px] text-slate-500 mb-3 truncate" title={ext.identifier.id}>
              {ext.identifier.id}
            </p>

            <div className="flex items-center justify-between mt-auto">
              <div className="flex space-x-2">
                {ext.metadata.pinned && (
                   <span className="text-[8px] bg-cyan-600/20 text-cyan-400 px-2 py-0.5 rounded uppercase font-black tracking-widest">Pinned</span>
                )}
                <span className="text-[8px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded uppercase font-black tracking-widest">
                  {ext.metadata.targetPlatform}
                </span>
              </div>
              {onUninstall && (
                <button 
                  onClick={() => onUninstall(ext.identifier.id)}
                  className="opacity-0 group-hover:opacity-100 p-2 text-rose-500 hover:bg-rose-500/10 rounded-lg transition-all"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              )}
            </div>

            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-500/0 group-hover:bg-cyan-500/20 transition-all"></div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ExtensionRegistry;
