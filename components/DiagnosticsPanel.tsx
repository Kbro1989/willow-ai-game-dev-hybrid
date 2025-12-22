import React from 'react';

const DiagnosticsPanel: React.FC = () => {
  return (
    <div className="flex flex-col h-full bg-[#050a15] text-cyan-50 p-8 border-l border-cyan-900/30 overflow-y-auto">
      <h2 className="text-xl font-black uppercase tracking-widest text-cyan-400 mb-6">System Diagnostics</h2>

      <div className="space-y-4">
        <div className="p-4 bg-cyan-950/20 border border-cyan-500/20 rounded-xl">
          <div className="text-xs uppercase tracking-widest text-cyan-500 mb-2">Engine Status</div>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
            <span className="text-sm font-mono">ONLINE - 144 FPS</span>
          </div>
        </div>

        <div className="p-4 bg-cyan-950/20 border border-cyan-500/20 rounded-xl">
          <div className="text-xs uppercase tracking-widest text-cyan-500 mb-2">Memory Usage</div>
          <div className="w-full bg-cyan-900/50 h-2 rounded-full overflow-hidden">
            <div className="bg-cyan-400 h-full w-[45%]"></div>
          </div>
          <div className="text-right text-xs font-mono mt-1 text-cyan-300">4.2 GB / 16 GB</div>
        </div>

        <div className="p-4 bg-cyan-950/20 border border-cyan-500/20 rounded-xl">
          <div className="text-xs uppercase tracking-widest text-cyan-500 mb-2">Active Nodes</div>
          <div className="text-2xl font-black font-mono">842</div>
        </div>
      </div>
    </div>
  );
};

export default DiagnosticsPanel;
