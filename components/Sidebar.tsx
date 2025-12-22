
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { FileNode, GitCommit, TodoTask, TokenMetrics, UserPreferences, Extension } from '../types';
import { runProjectManagerReview } from '../services/cloudflareService';
import ExtensionRegistry from './ExtensionRegistry';

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  files: FileNode[];
  activeFile: string | null;
  onSelectFile: (path: string) => void;
  onCreateNode?: (parentPath: string | null, name: string, type: 'file' | 'dir') => void;
  stagedFiles: string[];
  onStage: (path: string) => void;
  onUnstage: (path: string) => void;
  onCommit: (message: string) => void;
  commitHistory: GitCommit[];
  tasks: TodoTask[];
  onToggleTask: (id: string) => void;
  onAddTasks: (tasks: Omit<TodoTask, 'id' | 'completed'>[]) => void;
  tokenMetrics: TokenMetrics;
  sceneObjects?: any[];
  userPrefs: UserPreferences;
  extensions: Extension[];
  onUninstallExtension: (id: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  isOpen, files, activeFile, onSelectFile, onCreateNode,
  tasks, onToggleTask, onAddTasks, tokenMetrics, sceneObjects = [],
  userPrefs, extensions, onUninstallExtension
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'files' | 'tasks' | 'memory' | 'extensions'>('files');
  const [isPMAnalyzing, setIsPMAnalyzing] = useState(false);
  const [proposedTasks, setProposedTasks] = useState<any[]>([]);

  // States for new node creation
  const [creatingNode, setCreatingNode] = useState<{ parentPath: string | null, type: 'file' | 'dir' } | null>(null);
  const [newNodeName, setNewNodeName] = useState('');
  const createInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (creatingNode && createInputRef.current) {
      createInputRef.current.focus();
    }
  }, [creatingNode]);

  const filteredFiles = useMemo(() => {
    if (!searchQuery.trim()) return files;
    const q = searchQuery.toLowerCase();
    const filter = (nodes: FileNode[]): FileNode[] => {
      return nodes.map(node => {
        if (node.type === 'dir') {
          const children = filter(node.children || []);
          if (node.name.toLowerCase().includes(q) || children.length > 0) {
            return { ...node, children };
          }
        } else if (node.name.toLowerCase().includes(q)) {
          return node;
        }
        return null;
      }).filter(Boolean) as FileNode[];
    };
    return filter(files);
  }, [files, searchQuery]);

  const handlePMReview = async () => {
    setIsPMAnalyzing(true);
    setProposedTasks([]);
    try {
      const suggestions = await runProjectManagerReview(files, sceneObjects, tasks);
      setProposedTasks(suggestions);
    } finally {
      setIsPMAnalyzing(false);
    }
  };

  const acceptProposedTasks = () => {
    onAddTasks(proposedTasks);
    setProposedTasks([]);
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newNodeName.trim() && creatingNode && onCreateNode) {
      onCreateNode(creatingNode.parentPath, newNodeName.trim(), creatingNode.type);
    }
    setCreatingNode(null);
    setNewNodeName('');
  };

  const renderTree = (nodes: FileNode[], depth = 0) => {
    return nodes.map(node => (
      <div key={node.path} className="flex flex-col">
        <div
          className={`group flex items-center py-1.5 px-4 hover:bg-cyan-900/10 transition-colors relative ${activeFile === node.path ? 'bg-cyan-600/10 text-cyan-400' : 'text-slate-400'}`}
          style={{ paddingLeft: `${(depth + 1) * 12}px` }}
        >
          <button
            onClick={() => node.type === 'file' && onSelectFile(node.path)}
            title={node.type === 'file' ? `Access binary stream for ${node.name}. Path: ${node.path}` : `Expand directory node: ${node.name}`}
            className="flex flex-1 items-center truncate"
          >
            {node.type === 'dir' ? (
              <svg className="w-3.5 h-3.5 mr-2 text-cyan-500/80 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" /></svg>
            ) : (
              <svg className="w-3.5 h-3.5 mr-2 text-cyan-500/80 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
            )}
            <span className="text-[11px] font-medium truncate tracking-tight">{node.name}</span>
          </button>

          {node.type === 'dir' && (
            <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity ml-2">
              <button
                onClick={(e) => { e.stopPropagation(); setCreatingNode({ parentPath: node.path, type: 'file' }); }}
                title="Synthesize new file in this directory node."
                className="p-1 text-cyan-500 hover:text-cyan-300 hover:bg-cyan-500/10 rounded transition-all"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setCreatingNode({ parentPath: node.path, type: 'dir' }); }}
                title="Generate new subdirectory node."
                className="p-1 text-cyan-500 hover:text-cyan-300 hover:bg-cyan-500/10 rounded transition-all"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" /></svg>
              </button>
            </div>
          )}

          {activeFile === node.path && <div className="absolute left-0 top-0 bottom-0 w-1 bg-cyan-500 shadow-[0_0_10px_#00f2ff]"></div>}
        </div>

        {creatingNode && creatingNode.parentPath === node.path && (
          <form
            onSubmit={handleCreateSubmit}
            className="flex items-center py-1 px-4 mb-1"
            style={{ paddingLeft: `${(depth + 2) * 12}px` }}
          >
            {creatingNode.type === 'dir' ? (
              <svg className="w-3.5 h-3.5 mr-2 text-cyan-500/80 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" /></svg>
            ) : (
              <svg className="w-3.5 h-3.5 mr-2 text-cyan-500/80 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
            )}
            <input
              ref={createInputRef}
              type="text"
              value={newNodeName}
              onChange={(e) => setNewNodeName(e.target.value)}
              onBlur={() => { if (!newNodeName) setCreatingNode(null); }}
              onKeyDown={(e) => { if (e.key === 'Escape') setCreatingNode(null); }}
              className="bg-[#050a15] border border-cyan-500/30 rounded px-2 py-0.5 text-[11px] text-cyan-50 outline-none w-full shadow-[0_0_10px_rgba(0,242,255,0.1)]"
              placeholder={creatingNode.type === 'file' ? "name.ts" : "folder name"}
            />
          </form>
        )}

        {node.children && renderTree(node.children, depth + 1)}
      </div>
    ));
  };

  const tokenPercent = Math.min(100, (tokenMetrics.used / tokenMetrics.limit) * 100);

  const getTabTitle = (tab: string) => {
    switch (tab) {
      case 'files': return "Binary Explorer: Navigate and manage the project's neural file architecture.";
      case 'tasks': return "Backlog Intelligence: Synchronize with the Director Core to manage roadmap milestones.";
      case 'memory': return "Cognitive Buffer: View learned developer patterns and architectural constraints.";
      case 'extensions': return "Registry Hub: Manage neural plugins and IDE extensions.";
      default: return "";
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0a1222] border-r border-cyan-900/30 shadow-2xl overflow-hidden">
      <div className="flex bg-[#050a15]/80 border-b border-cyan-900/20">
        {['files', 'tasks', 'memory', 'extensions'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            title={getTabTitle(tab)}
            className={`flex-1 py-4 text-[9px] font-black uppercase tracking-[0.2em] transition-all relative ${activeTab === tab ? 'text-cyan-400 bg-cyan-500/5' : 'text-slate-600 hover:text-cyan-300'}`}
          >
            {tab}
            {activeTab === tab && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-500 shadow-[0_0_10px_#00f2ff]"></div>}
          </button>
        ))}
      </div>

      <div className="p-5 flex flex-col space-y-5 flex-1 overflow-hidden">
        {isOpen && (
          <div className="flex items-center justify-between px-2">
            <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-cyan-400/30">
              {activeTab === 'extensions' ? 'Symphony Registry' : 'Binary Interface'}
            </h2>
            <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse shadow-[0_0_10px_#00f2ff]"></div>
          </div>
        )}

        {isOpen && activeTab === 'files' && (
          <div className="flex-1 overflow-hidden flex flex-col space-y-3">
            <div className="relative group px-1">
              <input
                type="text"
                placeholder="Neural Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                title="Execute high-speed fuzzy search across all active project nodes."
                className="w-full bg-[#050a15] border border-cyan-900/30 rounded-2xl px-4 py-3 text-[11px] text-cyan-100 outline-none focus:border-cyan-500/50 transition-all shadow-inner placeholder:text-slate-700"
              />
            </div>
            <div className="flex-1 overflow-y-auto pt-2 no-scrollbar">{renderTree(filteredFiles)}</div>
          </div>
        )}

        {isOpen && activeTab === 'tasks' && (
          <div className="flex-1 overflow-y-auto space-y-4 pr-2 no-scrollbar">
            <div className="p-5 bg-cyan-600/5 border border-cyan-500/10 rounded-[2rem] shadow-inner">
              <div className="flex items-center space-x-4 mb-5">
                <div className="w-10 h-10 rounded-2xl bg-cyan-600 flex items-center justify-center shadow-[0_0_15px_#00f2ff]">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                </div>
                <div>
                  <h3 className="text-[11px] font-black uppercase text-white tracking-widest">Symphony PM</h3>
                  <p className="text-[8px] text-cyan-400 uppercase font-black">Core active</p>
                </div>
              </div>
              <button
                onClick={handlePMReview}
                disabled={isPMAnalyzing}
                title="Synthesize project state and backlog to generate optimized architectural tasks."
                className={`w-full py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${isPMAnalyzing ? 'bg-cyan-600/10 text-cyan-400 animate-pulse' : 'bg-cyan-600 text-white hover:bg-cyan-500 shadow-[0_0_15px_rgba(0,242,255,0.4)]'}`}
              >
                {isPMAnalyzing ? 'Synthesizing...' : 'Binary Review'}
              </button>
            </div>

            {proposedTasks.length > 0 && (
              <div className="space-y-3 animate-in fade-in slide-in-from-top-4 duration-500">
                <div className="flex justify-between items-center px-2">
                  <span className="text-[9px] font-black uppercase text-cyan-400 tracking-widest">Flux Diffs</span>
                  <button
                    onClick={acceptProposedTasks}
                    title="Bulk inject all suggested milestones into the active project backlog."
                    className="text-[8px] font-black uppercase text-white bg-cyan-600 px-3 py-1.5 rounded-xl shadow-lg"
                  >
                    Inject All
                  </button>
                </div>
                {proposedTasks.map((pt, i) => (
                  <div key={i} className="bg-[#050a15] border border-cyan-500/20 p-4 rounded-[1.5rem] relative overflow-hidden group">
                    <p className="text-[11px] font-bold text-cyan-50 mb-2">{pt.text}</p>
                    <p className="text-[9px] text-slate-500 leading-relaxed font-medium">{pt.justification}</p>
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-4 pt-4">
              {tasks.map(task => (
                <div key={task.id} className={`flex flex-col p-4 rounded-[1.5rem] border transition-all ${task.completed ? 'bg-cyan-900/5 border-cyan-900/20 opacity-30' : 'bg-[#0a1222] border-cyan-900/20 hover:border-cyan-500/30 shadow-lg'}`}>
                  <div className="flex items-start space-x-4">
                    <input
                      type="checkbox"
                      checked={task.completed}
                      onChange={() => onToggleTask(task.id)}
                      title={task.completed ? "Re-open milestone logic." : "Finalize and commit this milestone completion."}
                      className="mt-1 w-5 h-5 rounded-[0.5rem] border-cyan-500/20 bg-black text-cyan-600 focus:ring-cyan-500/40"
                    />
                    <div className="flex-1">
                      <p className={`text-[12px] leading-tight font-bold ${task.completed ? 'line-through text-slate-600' : 'text-slate-200'}`}>{task.text}</p>
                      <div className="flex items-center space-x-3 mt-3">
                        <span className="text-[8px] bg-cyan-600/10 px-2.5 py-1 rounded-full uppercase font-black text-cyan-400 tracking-widest">{task.category}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {isOpen && activeTab === 'memory' && (
          <div className="flex-1 overflow-y-auto space-y-6 no-scrollbar">
            <div className="p-5 bg-cyan-600/5 border border-cyan-500/10 rounded-[2rem] shadow-inner">
              <h3 className="text-[11px] font-black uppercase text-cyan-400 tracking-[0.4em] mb-4 text-glow-cyan">Neural Memory</h3>
              <p className="text-[10px] text-slate-400 leading-relaxed font-medium">The Director core is optimizing your neural footprint to minimize flux and prevent architectural regressions.</p>
            </div>

            <div className="space-y-6">
              <div className="space-y-3">
                <h4 className="text-[9px] font-black uppercase text-slate-500 tracking-widest px-2">Binary Patterns</h4>
                <div className="flex flex-wrap gap-2 px-2">
                  {userPrefs.codingStyle.map((s, i) => (
                    <span key={i} className="bg-cyan-500/5 border border-cyan-500/10 px-3 py-1.5 rounded-xl text-[10px] text-cyan-300 font-black uppercase tracking-widest">{s}</span>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-[9px] font-black uppercase text-slate-500/40 tracking-widest px-2">Pruned Logic</h4>
                <div className="space-y-2">
                  {userPrefs.forbiddenPatterns.map((p, i) => (
                    <div key={i} className="bg-cyan-950/20 border border-cyan-500/10 p-3 rounded-xl flex items-center justify-between">
                      <span className="text-[10px] text-cyan-400/80 font-black uppercase tracking-widest">{p}</span>
                      <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 shadow-[0_0_8px_#00f2ff]"></div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {isOpen && activeTab === 'extensions' && (
          <div className="flex-1 overflow-hidden flex flex-col">
            <ExtensionRegistry
              extensions={extensions}
              onUninstall={onUninstallExtension}
            />
          </div>
        )}
      </div>

      {isOpen && (
        <div className="p-6 border-t border-cyan-900/30 bg-[#050a15]/80 backdrop-blur-3xl" title={`Context window saturation: ${Math.round(tokenPercent)}% utilized.`}>
          <div className="flex justify-between items-center mb-3">
            <span className="text-[9px] font-black uppercase tracking-[0.3em] text-cyan-400/30">Binary Payload</span>
            <span className="text-[10px] font-mono text-cyan-400">{Math.round(tokenPercent)}%</span>
          </div>
          <div className="w-full h-1.5 bg-cyan-950 rounded-full overflow-hidden shadow-inner border border-cyan-900/20">
            <div className="h-full bg-cyan-500 shadow-[0_0_10px_#00f2ff] transition-all duration-1000" style={{ width: `${tokenPercent}%` }}></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sidebar;
