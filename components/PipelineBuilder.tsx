/**
 * Visual Pipeline Builder - n8n-style workflow editor
 * Drag-and-drop node-based interface for creating AI pipelines
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { NODE_DEFINITIONS, NodeType, getNodesByCategory } from '../services/n8n/nodeDefinitions';
import { WorkflowNode, WorkflowConnection, Workflow, workflowEngine, WORKFLOW_TEMPLATES } from '../services/n8n/workflowEngine';

interface PipelineBuilderProps {
  onClose?: () => void;
}

interface CanvasNode extends WorkflowNode {
  isExecuting?: boolean;
  executionStatus?: 'pending' | 'running' | 'success' | 'error';
}

interface DragState {
  activeNodeId: string | null;
  offset: { x: number; y: number };
}

export const PipelineBuilder: React.FC<PipelineBuilderProps> = ({ onClose }) => {
  const [workflow, setWorkflow] = useState<Workflow>({
    id: 'pipeline-1',
    name: 'New Pipeline',
    nodes: [],
    connections: []
  });

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [dragState, setDragState] = useState<DragState>({ activeNodeId: null, offset: { x: 0, y: 0 } });
  const [connectionDraft, setConnectionDraft] = useState<{ sourceNode: string; sourceOutput: string; mousePos: { x: number; y: number } } | null>(null);
  const [canvasOffset, setCanvasOffset] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1.0);
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionResults, setExecutionResults] = useState<any>(null);
  const [showTemplates, setShowTemplates] = useState(false);

  const canvasRef = useRef<SVGSVGElement>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });

  useEffect(() => {
    const updateSize = () => {
      if (canvasRef.current) {
        const rect = canvasRef.current.getBoundingClientRect();
        setCanvasSize({ width: rect.width, height: rect.height });
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Add node to canvas
  const handleAddNode = useCallback((type: NodeType, position?: { x: number; y: number }) => {
    const newNode: WorkflowNode = {
      id: `node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      position: position || { x: 100 + workflow.nodes.length * 50, y: 100 + workflow.nodes.length * 50 },
      parameters: {}
    };

    // Set default parameters from definition
    const def = NODE_DEFINITIONS[type];
    def.parameters.forEach(param => {
      if (param.default !== undefined) {
        newNode.parameters[param.name] = param.default;
      }
    });

    setWorkflow(prev => ({
      ...prev,
      nodes: [...prev.nodes, newNode]
    }));
  }, [workflow.nodes.length]);

  // Node drag handlers
  const handleNodeMouseDown = useCallback((e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    const node = workflow.nodes.find(n => n.id === nodeId);
    if (!node) return;

    setDragState({
      activeNodeId: nodeId,
      offset: {
        x: e.clientX - node.position.x,
        y: e.clientY - node.position.y
      }
    });
    setSelectedNodeId(nodeId);
  }, [workflow.nodes]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (dragState.activeNodeId) {
      const newX = e.clientX - dragState.offset.x;
      const newY = e.clientY - dragState.offset.y;

      setWorkflow(prev => ({
        ...prev,
        nodes: prev.nodes.map(n =>
          n.id === dragState.activeNodeId
            ? { ...n, position: { x: newX, y: newY } }
            : n
        )
      }));
    } else if (connectionDraft) {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (rect) {
        setConnectionDraft(prev => prev ? {
          ...prev,
          mousePos: { x: e.clientX - rect.left, y: e.clientY - rect.top }
        } : null);
      }
    }
  }, [dragState, connectionDraft]);

  const handleMouseUp = useCallback(() => {
    setDragState({ activeNodeId: null, offset: { x: 0, y: 0 } });
    setConnectionDraft(null);
  }, []);

  // Connection handlers
  const handlePortMouseDown = useCallback((e: React.MouseEvent, nodeId: string, portName: string, isOutput: boolean) => {
    e.stopPropagation();
    if (isOutput) {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (rect) {
        setConnectionDraft({
          sourceNode: nodeId,
          sourceOutput: portName,
          mousePos: { x: e.clientX - rect.left, y: e.clientY - rect.top }
        });
      }
    }
  }, []);

  const handlePortMouseUp = useCallback((nodeId: string, portName: string, isInput: boolean) => {
    if (connectionDraft && isInput) {
      const newConnection: WorkflowConnection = {
        id: `conn-${Date.now()}`,
        sourceNode: connectionDraft.sourceNode,
        sourceOutput: connectionDraft.sourceOutput,
        targetNode: nodeId,
        targetInput: portName
      };

      setWorkflow(prev => ({
        ...prev,
        connections: [...prev.connections, newConnection]
      }));
    }
    setConnectionDraft(null);
  }, [connectionDraft]);

  // Execute pipeline
  const handleExecute = useCallback(async () => {
    setIsExecuting(true);
    setExecutionResults(null);

    try {
      const result = await workflowEngine.execute(workflow);
      setExecutionResults(result);
    } catch (error) {
      setExecutionResults({ success: false, error: String(error), outputs: {} });
    } finally {
      setIsExecuting(false);
    }
  }, [workflow]);

  // Load template
  const handleLoadTemplate = useCallback((templateId: string) => {
    const template = WORKFLOW_TEMPLATES[templateId];
    if (template) {
      setWorkflow(template);
      setShowTemplates(false);
    }
  }, []);

  // Clear canvas
  const handleClear = useCallback(() => {
    if (confirm('Clear entire pipeline?')) {
      setWorkflow({ id: 'pipeline-1', name: 'New Pipeline', nodes: [], connections: [] });
      setSelectedNodeId(null);
      setExecutionResults(null);
    }
  }, []);

  // Render node
  const renderNode = (node: CanvasNode) => {
    const def = NODE_DEFINITIONS[node.type];
    const isSelected = selectedNodeId === node.id;

    return (
      <g
        key={node.id}
        transform={`translate(${node.position.x}, ${node.position.y})`}
        onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
        className="cursor-move"
      >
        {/* Node body */}
        <rect
          width="180"
          height="100"
          rx="8"
          className={`transition-all ${isSelected
              ? 'fill-cyan-600 stroke-cyan-400 stroke-2'
              : node.isExecuting
                ? 'fill-yellow-600 stroke-yellow-400 stroke-2'
                : 'fill-slate-800 stroke-slate-600 stroke-1'
            }`}
        />

        {/* Node header */}
        <rect width="180" height="30" rx="8" className="fill-slate-900/50" />
        <text x="90" y="20" textAnchor="middle" className="fill-white text-xs font-bold pointer-events-none">
          {def.icon} {def.label}
        </text>

        {/* Input ports */}
        {def.inputs.map((input, idx) => (
          <g key={`in-${idx}`}>
            <circle
              cx="0"
              cy={40 + idx * 20}
              r="6"
              className="fill-cyan-500 stroke-cyan-300 stroke-2 cursor-pointer hover:fill-cyan-300"
              onMouseUp={() => handlePortMouseUp(node.id, input.name, true)}
            />
            <text x="12" y={45 + idx * 20} className="fill-slate-400 text-[10px] pointer-events-none">
              {input.name}
            </text>
          </g>
        ))}

        {/* Output ports */}
        {def.outputs.map((output, idx) => (
          <g key={`out-${idx}`}>
            <circle
              cx="180"
              cy={40 + idx * 20}
              r="6"
              className="fill-emerald-500 stroke-emerald-300 stroke-2 cursor-pointer hover:fill-emerald-300"
              onMouseDown={(e) => handlePortMouseDown(e, node.id, output.name, true)}
            />
            <text x="168" y={45 + idx * 20} textAnchor="end" className="fill-slate-400 text-[10px] pointer-events-none">
              {output.name}
            </text>
          </g>
        ))}
      </g>
    );
  };

  // Render connection
  const renderConnection = (conn: WorkflowConnection) => {
    const sourceNode = workflow.nodes.find(n => n.id === conn.sourceNode);
    const targetNode = workflow.nodes.find(n => n.id === conn.targetNode);
    if (!sourceNode || !targetNode) return null;

    const sourceDef = NODE_DEFINITIONS[sourceNode.type];
    const targetDef = NODE_DEFINITIONS[targetNode.type];
    const sourceOutputIdx = sourceDef.outputs.findIndex(o => o.name === conn.sourceOutput);
    const targetInputIdx = targetDef.inputs.findIndex(i => i.name === conn.targetInput);

    const x1 = sourceNode.position.x + 180;
    const y1 = sourceNode.position.y + 40 + sourceOutputIdx * 20;
    const x2 = targetNode.position.x;
    const y2 = targetNode.position.y + 40 + targetInputIdx * 20;

    const midX = (x1 + x2) / 2;

    return (
      <path
        key={conn.id}
        d={`M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`}
        className="stroke-cyan-500 stroke-2 fill-none"
        style={{ strokeDasharray: '5,5' }}
      />
    );
  };

  const selectedNode = selectedNodeId ? workflow.nodes.find(n => n.id === selectedNodeId) : null;
  const selectedDef = selectedNode ? NODE_DEFINITIONS[selectedNode.type] : null;

  return (
    <div className="flex h-full bg-[#050a15] text-white">
      {/* Left Sidebar - Node Palette */}
      <div className="w-64 border-r border-slate-700 flex flex-col overflow-hidden">
        <div className="p-4 border-b border-slate-700">
          <h3 className="text-sm font-black uppercase tracking-wider text-cyan-400">Node Palette</h3>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-4">
          {['input', 'ai', 'processing', 'output', 'integration'].map(category => (
            <div key={category}>
              <div className="text-[10px] font-black uppercase text-slate-500 mb-2 px-2">{category}</div>
              <div className="space-y-1">
                {getNodesByCategory(category).map(def => (
                  <button
                    key={def.type}
                    onClick={() => handleAddNode(def.type)}
                    className="w-full p-2 bg-slate-800 hover:bg-cyan-600 border border-slate-700 hover:border-cyan-500 rounded text-left text-xs transition-all group"
                  >
                    <div className="font-bold">{def.icon} {def.label}</div>
                    <div className="text-[9px] text-slate-500 group-hover:text-cyan-200">{def.description}</div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Center - Canvas */}
      <div className="flex-1 flex flex-col">
        {/* Toolbar */}
        <div className="h-16 border-b border-slate-700 flex items-center justify-between px-6 bg-[#0a1222]">
          <div className="flex items-center space-x-4">
            <input
              type="text"
              value={workflow.name}
              onChange={(e) => setWorkflow(prev => ({ ...prev, name: e.target.value }))}
              className="bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-cyan-400 w-64"
            />
            <span className="text-xs text-slate-500">{workflow.nodes.length} nodes</span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowTemplates(!showTemplates)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded text-xs font-bold uppercase"
            >
              📚 Templates
            </button>
            <button
              onClick={handleClear}
              className="px-4 py-2 bg-slate-800 hover:bg-red-600 border border-slate-700 rounded text-xs font-bold uppercase"
            >
              🗑️ Clear
            </button>
            <button
              onClick={handleExecute}
              disabled={isExecuting || workflow.nodes.length === 0}
              className="px-6 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-700 disabled:text-slate-500 rounded text-xs font-black uppercase transition-all"
            >
              {isExecuting ? '⚙️ Running...' : '▶️ Run Pipeline'}
            </button>
          </div>
        </div>

        {/* Canvas */}
        <div className="flex-1 relative overflow-hidden bg-[#050a15]">
          <svg
            ref={canvasRef}
            className="w-full h-full"
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            style={{ cursor: dragState.activeNodeId ? 'grabbing' : 'default' }}
          >
            {/* Grid pattern */}
            <defs>
              <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                <circle cx="1" cy="1" r="1" fill="rgba(100,116,139,0.1)" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />

            {/* Connections */}
            {workflow.connections.map(renderConnection)}

            {/* Draft connection */}
            {connectionDraft && (() => {
              const sourceNode = workflow.nodes.find(n => n.id === connectionDraft.sourceNode);
              if (!sourceNode) return null;
              const sourceDef = NODE_DEFINITIONS[sourceNode.type];
              const outputIdx = sourceDef.outputs.findIndex(o => o.name === connectionDraft.sourceOutput);
              const x1 = sourceNode.position.x + 180;
              const y1 = sourceNode.position.y + 40 + outputIdx * 20;
              const x2 = connectionDraft.mousePos.x;
              const y2 = connectionDraft.mousePos.y;
              const midX = (x1 + x2) / 2;

              return (
                <path
                  d={`M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`}
                  className="stroke-cyan-400 stroke-2 fill-none opacity-50"
                />
              );
            })()}

            {/* Nodes */}
            {workflow.nodes.map(renderNode)}
          </svg>

          {/* Template Picker */}
          {showTemplates && (
            <div className="absolute inset-0 bg-black/80 flex items-center justify-center">
              <div className="bg-slate-900 border border-cyan-500 rounded-xl p-6 max-w-md">
                <h3 className="text-lg font-black uppercase text-cyan-400 mb-4">Pipeline Templates</h3>
                <div className="space-y-2">
                  {Object.entries(WORKFLOW_TEMPLATES).map(([id, template]) => (
                    <button
                      key={id}
                      onClick={() => handleLoadTemplate(id)}
                      className="w-full p-4 bg-slate-800 hover:bg-cyan-600 border border-slate-700 rounded text-left transition-all"
                    >
                      <div className="font-bold text-sm">{template.name}</div>
                      <div className="text-xs text-slate-400">{template.nodes.length} nodes</div>
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setShowTemplates(false)}
                  className="w-full mt-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded text-sm font-bold"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Execution Results */}
        {executionResults && (
          <div className="h-48 border-t border-slate-700 bg-[#0a1222] p-4 overflow-auto">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-black uppercase text-cyan-400">Execution Results</h3>
              <span className={`text-xs font-bold ${executionResults.success ? 'text-emerald-400' : 'text-red-400'}`}>
                {executionResults.success ? '✓ Success' : '✗ Failed'}
              </span>
            </div>
            <pre className="text-xs text-slate-300 font-mono bg-slate-900 p-3 rounded overflow-auto">
              {JSON.stringify(executionResults, null, 2)}
            </pre>
          </div>
        )}
      </div>

      {/* Right Sidebar - Parameter Panel */}
      {selectedNode && selectedDef && (
        <div className="w-80 border-l border-slate-700 flex flex-col overflow-hidden">
          <div className="p-4 border-b border-slate-700">
            <h3 className="text-sm font-black uppercase tracking-wider text-cyan-400">
              {selectedDef.icon} {selectedDef.label}
            </h3>
            <p className="text-[10px] text-slate-500 mt-1">{selectedDef.description}</p>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {selectedDef.parameters.map(param => (
              <div key={param.name}>
                <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">
                  {param.label}
                </label>

                {param.type === 'select' && (
                  <select
                    value={selectedNode.parameters[param.name] || param.default}
                    onChange={(e) => {
                      setWorkflow(prev => ({
                        ...prev,
                        nodes: prev.nodes.map(n =>
                          n.id === selectedNodeId
                            ? { ...n, parameters: { ...n.parameters, [param.name]: e.target.value } }
                            : n
                        )
                      }));
                    }}
                    className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-cyan-400"
                  >
                    {param.options?.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                )}

                {param.type === 'textarea' && (
                  <textarea
                    value={selectedNode.parameters[param.name] || param.default || ''}
                    onChange={(e) => {
                      setWorkflow(prev => ({
                        ...prev,
                        nodes: prev.nodes.map(n =>
                          n.id === selectedNodeId
                            ? { ...n, parameters: { ...n.parameters, [param.name]: e.target.value } }
                            : n
                        )
                      }));
                    }}
                    className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-cyan-400 font-mono h-32 resize-none"
                  />
                )}

                {param.type === 'string' && (
                  <input
                    type="text"
                    value={selectedNode.parameters[param.name] || param.default || ''}
                    onChange={(e) => {
                      setWorkflow(prev => ({
                        ...prev,
                        nodes: prev.nodes.map(n =>
                          n.id === selectedNodeId
                            ? { ...n, parameters: { ...n.parameters, [param.name]: e.target.value } }
                            : n
                        )
                      }));
                    }}
                    className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-cyan-400"
                  />
                )}

                {param.type === 'number' && (
                  <input
                    type="number"
                    value={selectedNode.parameters[param.name] || param.default || 0}
                    onChange={(e) => {
                      setWorkflow(prev => ({
                        ...prev,
                        nodes: prev.nodes.map(n =>
                          n.id === selectedNodeId
                            ? { ...n, parameters: { ...n.parameters, [param.name]: parseFloat(e.target.value) } }
                            : n
                        )
                      }));
                    }}
                    className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-cyan-400"
                  />
                )}
              </div>
            ))}
          </div>

          <div className="p-4 border-t border-slate-700">
            <button
              onClick={() => {
                setWorkflow(prev => ({
                  ...prev,
                  nodes: prev.nodes.filter(n => n.id !== selectedNodeId)
                }));
                setSelectedNodeId(null);
              }}
              className="w-full py-2 bg-red-600 hover:bg-red-500 rounded text-xs font-bold uppercase"
            >
              🗑️ Delete Node
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PipelineBuilder;
