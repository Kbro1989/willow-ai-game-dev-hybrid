
import React, { useState, useCallback, useMemo } from 'react';
import ReactFlow, {
    Node, Edge, Controls, Background, Connection,
    addEdge, applyNodeChanges, applyEdgeChanges,
    NodeChange, EdgeChange, Handle, Position
} from 'reactflow';
import 'reactflow/dist/style.css';
import { NODE_DEFINITIONS, NodeType, NodeDefinition } from './services/n8n/nodeDefinitions';
import { workflowEngine, Workflow } from './services/n8n/workflowEngine';
import { Play, Save, Plus, Trash2, Settings, Terminal } from 'lucide-react';

interface CustomNodeProps {
    data: {
        label: string,
        type: NodeType,
        parameters: any,
        onParameterChange: (key: string, value: any) => void
    }
}

const CustomNodeComponent = ({ data }: CustomNodeProps) => {
    const def = NODE_DEFINITIONS[data.type];

    return (
        <div className="px-4 py-2 shadow-xl rounded-md bg-[#0a1222] border border-cyan-500/30 min-w-[150px]">
            <div className="flex items-center border-b border-cyan-500/20 pb-2 mb-2">
                <div className="text-xl mr-2">{def.icon}</div>
                <div>
                    <div className="text-sm font-bold text-cyan-400">{data.label}</div>
                    <div className="text-[10px] text-slate-500 uppercase">{def.type}</div>
                </div>
            </div>

            {/* Dynamic Inputs */}
            {def.inputs.map((input, idx) => (
                <div key={`in-${idx}`} className="relative h-6 flex items-center text-[10px] text-slate-400">
                    <Handle
                        type="target"
                        position={Position.Left}
                        id={input.name}
                        style={{ background: '#06b6d4', width: '8px', height: '8px' }}
                    />
                    <span className="ml-3">{input.name}</span>
                </div>
            ))}

            {/* Dynamic Outputs */}
            {def.outputs.map((output, idx) => (
                <div key={`out-${idx}`} className="relative h-6 flex items-center justify-end text-[10px] text-slate-400">
                    <span className="mr-3">{output.name}</span>
                    <Handle
                        type="source"
                        position={Position.Right}
                        id={output.name}
                        style={{ background: '#10b981', width: '8px', height: '8px' }}
                    />
                </div>
            ))}
        </div>
    );
};

const nodeTypes = {
    custom: CustomNodeComponent
};

const N8NWorkflow: React.FC = () => {
    const [nodes, setNodes] = useState<Node[]>([]);
    const [edges, setEdges] = useState<Edge[]>([]);
    const [selectedNode, setSelectedNode] = useState<Node | null>(null);
    const [isRunning, setIsRunning] = useState(false);
    const [logs, setLogs] = useState<string[]>([]);

    const onNodesChange = useCallback((changes: NodeChange[]) => setNodes((nds) => applyNodeChanges(changes, nds)), []);
    const onEdgesChange = useCallback((changes: EdgeChange[]) => setEdges((eds) => applyEdgeChanges(changes, eds)), []);
    const onConnect = useCallback((connection: Connection) => setEdges((eds) => addEdge(connection, eds)), []);

    const onDragOver = useCallback((event: React.DragEvent) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
    }, []);

    const onDrop = useCallback(
        (event: React.DragEvent) => {
            event.preventDefault();
            const type = event.dataTransfer.getData('application/reactflow');
            if (!type) return;

            const position = { x: event.clientX - 300, y: event.clientY - 100 }; // Rough offset
            const def = NODE_DEFINITIONS[type as NodeType];

            const newNode: Node = {
                id: `node_${Date.now()}`,
                type: 'custom',
                position,
                data: {
                    label: def.label,
                    type,
                    parameters: {},
                    onParameterChange: (key: string, value: any) => {
                        // Update logic would go here if lifted up
                    }
                },
            };

            setNodes((nds) => nds.concat(newNode));
        },
        []
    );

    const handleExecute = async () => {
        setIsRunning(true);
        setLogs(prev => [...prev, 'Starting workflow execution...']);

        // Transform ReactFlow graph to Workflow engine format
        const workflow: Workflow = {
            id: 'temp-run',
            name: 'Interactive Run',
            nodes: nodes.map(n => ({
                id: n.id,
                type: n.data.type,
                position: n.position,
                parameters: n.data.parameters
            })),
            connections: edges.map(e => ({
                id: e.id,
                sourceNode: e.source,
                sourceOutput: e.sourceHandle || 'default',
                targetNode: e.target,
                targetInput: e.targetHandle || 'default'
            }))
        };

        try {
            const result = await workflowEngine.execute(workflow);
            if (result.success) {
                setLogs(prev => [...prev, 'Execution successful!', JSON.stringify(result.outputs, null, 2)]);
            } else {
                setLogs(prev => [...prev, `Execution failed: ${result.error}`]);
            }
        } catch (e) {
            setLogs(prev => [...prev, `Critical Failure: ${e}`]);
        } finally {
            setIsRunning(false);
        }
    };

    const updateNodeParam = (nodeId: string, key: string, value: any) => {
        setNodes(nds => nds.map(n => {
            if (n.id === nodeId) {
                return {
                    ...n,
                    data: {
                        ...n.data,
                        parameters: { ...n.data.parameters, [key]: value }
                    }
                };
            }
            return n;
        }));
    };

    return (
        <div className="flex h-full w-full bg-[#050a15] text-slate-300">
            {/* Sidebar / Palette */}
            <div className="w-64 border-r border-cyan-900/30 p-4 flex flex-col gap-4 overflow-y-auto">
                <div className="text-xs font-black uppercase tracking-widest text-cyan-500">Node Palette</div>
                <div className="space-y-2">
                    {Object.keys(NODE_DEFINITIONS).map(key => {
                        const def = NODE_DEFINITIONS[key as NodeType];
                        return (
                            <div
                                key={key}
                                onDragStart={(event) => event.dataTransfer.setData('application/reactflow', key)}
                                draggable
                                className="p-3 bg-[#0a1222] border border-cyan-900/40 rounded cursor-grab hover:border-cyan-500/50 flex items-center gap-3 transition-colors"
                            >
                                <span className="text-xl">{def.icon}</span>
                                <div className="text-xs font-bold">{def.label}</div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Main Canvas */}
            <div className="flex-1 relative h-full" onDrop={onDrop} onDragOver={onDragOver}>
                <div className="absolute top-4 right-4 z-10 flex gap-2">
                    <button
                        onClick={handleExecute}
                        className={`flex items-center gap-2 px-4 py-2 rounded-full font-bold uppercase tracking-widest text-xs transition-all ${isRunning ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/50 animate-pulse' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50 hover:bg-emerald-500/40'}`}
                    >
                        <Play size={14} /> {isRunning ? 'Running...' : 'Execute'}
                    </button>
                </div>

                <ReactFlow
                    nodes={nodes}
                    edges={edges}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    onConnect={onConnect}
                    nodeTypes={nodeTypes}
                    onNodeClick={(_, node) => setSelectedNode(node)}
                    fitView
                >
                    <Background color="#164e63" gap={20} size={1} />
                    <Controls />
                </ReactFlow>
            </div>

            {/* Properties Panel */}
            <div className="w-80 border-l border-cyan-900/30 flex flex-col bg-[#0a1222]">
                <div className="h-1/2 p-4 border-b border-cyan-900/30 overflow-y-auto">
                    <div className="text-xs font-black uppercase tracking-widest text-cyan-500 mb-4 flex items-center gap-2">
                        <Settings size={14} /> Properties
                    </div>
                    {selectedNode ? (
                        <div className="space-y-4">
                            <div className="text-lg font-bold text-white">{selectedNode.data.label}</div>
                            <div className="text-[10px] text-slate-500 uppercase font-mono">{selectedNode.id}</div>

                            {NODE_DEFINITIONS[selectedNode.data.type as NodeType]?.parameters.map(param => (
                                <div key={param.name} className="space-y-1">
                                    <label className="text-[10px] uppercase text-cyan-400">{param.label}</label>
                                    {param.type === 'textarea' || param.type === 'code' ? (
                                        <textarea
                                            className="w-full bg-[#050a15] border border-cyan-900/50 rounded p-2 text-xs text-slate-300 font-mono focus:border-cyan-500 outline-none min-h-[100px]"
                                            value={selectedNode.data.parameters[param.name] || ''}
                                            onChange={(e) => updateNodeParam(selectedNode.id, param.name, e.target.value)}
                                        />
                                    ) : param.type === 'select' ? (
                                        <select
                                            className="w-full bg-[#050a15] border border-cyan-900/50 rounded p-2 text-xs text-slate-300 focus:border-cyan-500 outline-none"
                                            value={selectedNode.data.parameters[param.name] || param.default}
                                            onChange={(e) => updateNodeParam(selectedNode.id, param.name, e.target.value)}
                                        >
                                            {param.options?.map(opt => (
                                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                                            ))}
                                        </select>
                                    ) : (
                                        <input
                                            type={param.type === 'number' ? 'number' : 'text'}
                                            className="w-full bg-[#050a15] border border-cyan-900/50 rounded p-2 text-xs text-slate-300 focus:border-cyan-500 outline-none"
                                            value={selectedNode.data.parameters[param.name] || ''}
                                            onChange={(e) => updateNodeParam(selectedNode.id, param.name, e.target.value)}
                                        />
                                    )}
                                </div>
                            ))}

                            <button
                                onClick={() => {
                                    setNodes(nds => nds.filter(n => n.id !== selectedNode.id));
                                    setSelectedNode(null);
                                }}
                                className="w-full py-2 bg-rose-500/20 text-rose-400 border border-rose-500/50 rounded text-xs uppercase hover:bg-rose-500/40 mt-4 flex items-center justify-center gap-2"
                            >
                                <Trash2 size={14} /> Delete Node
                            </button>
                        </div>
                    ) : (
                        <div className="text-center text-slate-600 text-xs mt-10">Select a node to edit parameters</div>
                    )}
                </div>

                <div className="flex-1 flex flex-col p-4 bg-black/20">
                    <div className="text-xs font-black uppercase tracking-widest text-emerald-500 mb-2 flex items-center gap-2">
                        <Terminal size={14} /> Execution Logs
                    </div>
                    <div className="flex-1 overflow-y-auto font-mono text-[10px] space-y-1 text-emerald-400/80">
                        {logs.map((log, i) => (
                            <div key={i} className="break-words border-b border-emerald-500/10 pb-1 mb-1 last:border-0">{log}</div>
                        ))}
                        {logs.length === 0 && <div className="text-slate-700 italic">Ready to execute...</div>}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default N8NWorkflow;
