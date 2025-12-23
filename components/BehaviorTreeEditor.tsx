
import React, { useState, useRef, useCallback } from 'react';

interface BehaviorNode {
  id: string;
  type: 'root' | 'selector' | 'sequence' | 'action' | 'condition' | 'decorator';
  label: string;
  position: { x: number; y: number };
  children: string[];
  status: 'idle' | 'running' | 'success' | 'failure';
  config?: Record<string, any>;
}

interface BehaviorTreeEditorProps {
  onSave: (tree: BehaviorNode[]) => void;
  onDebug: (nodeId: string) => void;
}

const NODE_COLORS: Record<string, string> = {
  root: 'bg-purple-600/20 border-purple-500/40',
  selector: 'bg-amber-600/20 border-amber-500/40',
  sequence: 'bg-cyan-600/20 border-cyan-500/40',
  action: 'bg-emerald-600/20 border-emerald-500/40',
  condition: 'bg-rose-600/20 border-rose-500/40',
  decorator: 'bg-indigo-600/20 border-indigo-500/40',
};

const STATUS_COLORS: Record<string, string> = {
  idle: 'bg-slate-500',
  running: 'bg-amber-500 animate-pulse',
  success: 'bg-emerald-500',
  failure: 'bg-rose-500',
};

const BehaviorTreeEditor: React.FC<BehaviorTreeEditorProps> = ({ onSave, onDebug }) => {
  const [nodes, setNodes] = useState<BehaviorNode[]>([
    { id: 'root', type: 'root', label: 'Root', position: { x: 300, y: 50 }, children: ['sel1'], status: 'idle' },
    { id: 'sel1', type: 'selector', label: 'Selector', position: { x: 300, y: 150 }, children: ['seq1', 'act1'], status: 'idle' },
    { id: 'seq1', type: 'sequence', label: 'Patrol Sequence', position: { x: 150, y: 280 }, children: ['cond1', 'act2'], status: 'idle' },
    { id: 'cond1', type: 'condition', label: 'Can See Target?', position: { x: 50, y: 400 }, children: [], status: 'idle' },
    { id: 'act2', type: 'action', label: 'Move To Target', position: { x: 200, y: 400 }, children: [], status: 'idle' },
    { id: 'act1', type: 'action', label: 'Idle Animation', position: { x: 450, y: 280 }, children: [], status: 'idle' },
  ]);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [draggingNode, setDraggingNode] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isSimulating, setIsSimulating] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = (nodeId: string, e: React.MouseEvent) => {
    const node = nodes.find(n => n.id === nodeId);
    if (node) {
      setDraggingNode(nodeId);
      setDragOffset({ x: e.clientX - node.position.x, y: e.clientY - node.position.y });
      setSelectedNode(nodeId);
    }
  };

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (draggingNode) {
      setNodes(prev => prev.map(n =>
        n.id === draggingNode
          ? { ...n, position: { x: e.clientX - dragOffset.x, y: e.clientY - dragOffset.y } }
          : n
      ));
    }
  }, [draggingNode, dragOffset]);

  const handleMouseUp = () => {
    setDraggingNode(null);
  };

  const addNode = (type: BehaviorNode['type']) => {
    const newNode: BehaviorNode = {
      id: `node_${Date.now()}`,
      type,
      label: `New ${type}`,
      position: { x: 200, y: 200 },
      children: [],
      status: 'idle'
    };
    setNodes(prev => [...prev, newNode]);
  };

  const simulateStep = () => {
    // Simple simulation: randomly update node statuses
    setNodes(prev => prev.map(n => ({
      ...n,
      status: ['idle', 'running', 'success', 'failure'][Math.floor(Math.random() * 4)] as any
    })));
  };

  const toggleSimulation = () => {
    setIsSimulating(!isSimulating);
    if (!isSimulating) {
      // Start simulation loop
      const interval = setInterval(() => {
        simulateStep();
      }, 1000);
      setTimeout(() => clearInterval(interval), 10000); // Auto-stop after 10s
    }
  };

  return (
    <div className="h-full flex flex-col bg-[#050a15] overflow-hidden">
      {/* Toolbar */}
      <div className="h-14 bg-[#0a1222] border-b border-cyan-900/40 px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-4">
          <span className="text-[10px] font-black uppercase tracking-widest text-cyan-400">Behavior Tree Editor</span>
          <div className="w-px h-6 bg-cyan-900/40"></div>
          <div className="flex space-x-2">
            {(['selector', 'sequence', 'action', 'condition', 'decorator'] as const).map(type => (
              <button
                key={type}
                onClick={() => addNode(type)}
                className={`px-3 py-1.5 border rounded-lg text-[9px] font-black uppercase transition-all ${NODE_COLORS[type]} hover:opacity-80`}
              >
                + {type}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <button
            onClick={toggleSimulation}
            className={`px-6 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${isSimulating ? 'bg-rose-600 hover:bg-rose-500 text-white' : 'bg-emerald-600 hover:bg-emerald-500 text-white'
              }`}
          >
            {isSimulating ? 'Stop Debug' : 'Start Debug'}
          </button>
          <button
            onClick={() => onSave(nodes)}
            className="px-6 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition-all shadow-lg shadow-cyan-500/30"
          >
            Save Tree
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div
        ref={canvasRef}
        className="flex-1 relative overflow-hidden"
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{
          backgroundImage: 'radial-gradient(circle, #0a1222 1px, transparent 1px)',
          backgroundSize: '20px 20px'
        }}
      >
        {/* Edges */}
        <svg className="absolute inset-0 pointer-events-none">
          {nodes.map(node =>
            node.children.map(childId => {
              const child = nodes.find(n => n.id === childId);
              if (!child) return null;
              return (
                <path
                  key={`${node.id}-${childId}`}
                  d={`M ${node.position.x + 80} ${node.position.y + 60} L ${child.position.x + 80} ${child.position.y}`}
                  stroke="#00f2ff"
                  strokeWidth={2}
                  fill="none"
                  opacity={0.4}
                  strokeDasharray={node.status === 'running' ? '5,5' : 'none'}
                />
              );
            })
          )}
        </svg>

        {/* Nodes */}
        {nodes.map(node => (
          <div
            key={node.id}
            onMouseDown={(e) => handleMouseDown(node.id, e)}
            onClick={() => onDebug(node.id)}
            className={`absolute w-40 border rounded-2xl shadow-2xl backdrop-blur-xl cursor-move transition-all ${NODE_COLORS[node.type]} ${selectedNode === node.id ? 'ring-2 ring-cyan-500 shadow-[0_0_30px_rgba(0,242,255,0.3)]' : ''
              }`}
            style={{ left: node.position.x, top: node.position.y }}
          >
            <div className="px-4 py-3 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${STATUS_COLORS[node.status]}`}></div>
                <span className="text-[9px] font-black uppercase text-cyan-50 tracking-wide">{node.label}</span>
              </div>
            </div>
            <div className="px-4 py-2 border-t border-white/5">
              <span className="text-[8px] text-slate-500 uppercase font-black tracking-widest">{node.type}</span>
            </div>
          </div>
        ))}

        {/* Legend */}
        <div className="absolute bottom-6 left-6 bg-[#0a1222]/90 backdrop-blur-xl p-4 rounded-2xl border border-cyan-900/40 space-y-2">
          <span className="text-[8px] font-black uppercase text-slate-500 tracking-widest block mb-2">Node Status</span>
          {Object.entries(STATUS_COLORS).map(([status, color]) => (
            <div key={status} className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${color}`}></div>
              <span className="text-[9px] text-slate-400 uppercase font-black">{status}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default BehaviorTreeEditor;
