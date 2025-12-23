import React, { useState, useEffect, useRef, useMemo, useCallback, Suspense } from 'react';
import { Canvas, useFrame, useThree, ThreeElements } from '@react-three/fiber';
import { OrbitControls, Sky, Environment, ContactShadows, PerspectiveCamera, Float, Stars, Grid, Gltf } from '@react-three/drei';
import { XR, createXRStore } from '@react-three/xr';
import * as THREE from 'three';
import {
  BuildInfo, GameAsset, SceneObject, PhysicsConfig, PipelineConfig,
  RenderConfig, CompositingConfig, SimulationState,
  WorldConfig, NeuralNode, NeuralEdge, EngineLog, SculptPoint
} from '../types';

// Augment the 'react' module's JSX namespace to include ThreeElements
declare module 'react' {
  namespace JSX {
    interface IntrinsicElements extends ThreeElements { }
  }
}

interface GameDashboardProps {
  onBuild: (prompt?: string) => void;
  buildInfo: BuildInfo;
  assets: GameAsset[];
  physics: PhysicsConfig;
  worldConfig: WorldConfig;
  sceneObjects: SceneObject[];
  pipelines: PipelineConfig[];
  renderConfig: RenderConfig;
  compositingConfig: CompositingConfig;
  simulation: SimulationState;
  onUpdatePhysics: (updates: Partial<PhysicsConfig>) => void;
  onUpdateWorld: (updates: Partial<WorldConfig>) => void;
  onUpdateSceneObject: (id: string, updates: Partial<SceneObject>) => void;
  onAddSceneObject: (obj: Omit<SceneObject, 'id'>) => void;
  onUpdateConfig: (type: 'render' | 'compositing', updates: any) => void;
  onRunAction: (action: string) => void;
  onSendVisualFeedback?: (imageData: string) => void;
  nodes: NeuralNode[];
  edges: NeuralEdge[];
  onNeuralUpdate: (payload: { nodes?: NeuralNode[], edges?: NeuralEdge[] }) => void;
  variableData?: Record<string, any>;
  engineLogs: EngineLog[];
  onImportAsset: (asset: GameAsset) => void;
  onAddAsset?: (asset: GameAsset) => void;
  sculptHistory: SculptPoint[];
  redoStack: any[];
  onSculptTerrain: (p: any) => void;
  onUndoSculpt: () => void;
  onRedoSculpt: () => void;
  onClearSculpt: () => void;
  isFullscreen?: boolean;
}

// Create XR store for VR/AR sessions
// Create XR store for VR/AR sessions
const xrStore = createXRStore();

const LiveObject: React.FC<{ obj: SceneObject, isSelected: boolean, onSelect: () => void, isPlaying: boolean }> = ({ obj, isSelected, onSelect, isPlaying }) => {
  const meshRef = useRef<THREE.Group>(null);
  const targetRef = useRef<THREE.Vector3>(new THREE.Vector3(Math.random() * 10 - 5, 0, Math.random() * 10 - 5));
  const triggerActiveRef = useRef(false);

  useFrame((state) => {
    if (!meshRef.current || !isPlaying) return;

    // Spin behavior
    if (obj.behaviors?.includes('spin')) {
      meshRef.current.rotation.y += 0.01;
    }

    // Float behavior
    if (obj.behaviors?.includes('float')) {
      meshRef.current.position.y = obj.position[1] + Math.sin(state.clock.elapsedTime) * 0.5;
    }

    // Pathfind behavior: Move toward target, pick new target when reached
    if (obj.behaviors?.includes('pathfind')) {
      const current = meshRef.current.position;
      const target = targetRef.current;
      const direction = target.clone().sub(current).normalize();
      const speed = 0.02;

      if (current.distanceTo(target) > 0.5) {
        meshRef.current.position.add(direction.multiplyScalar(speed));
        meshRef.current.lookAt(target);
      } else {
        // Arrived, pick new random target
        targetRef.current.set(Math.random() * 20 - 10, obj.position[1], Math.random() * 20 - 10);
      }
    }

    // Reactive behavior: React to environment (wind effect simulation)
    if (obj.behaviors?.includes('reactive')) {
      const windStrength = Math.sin(state.clock.elapsedTime * 0.5) * 0.1;
      meshRef.current.rotation.z = windStrength;
      meshRef.current.position.x = obj.position[0] + Math.sin(state.clock.elapsedTime * 2) * 0.05;
    }

    // Trigger behavior: Pulse when activated
    if (obj.behaviors?.includes('trigger')) {
      const pulseScale = 1 + Math.sin(state.clock.elapsedTime * 4) * 0.1;
      if (triggerActiveRef.current) {
        meshRef.current.scale.setScalar(pulseScale);
      }
    }
  });

  const getGeometry = () => {
    if (obj.modelUrl) {
      return (
        <Suspense fallback={<mesh><boxGeometry args={[1, 1, 1]} /><meshStandardMaterial wireframe color="#00f2ff" opacity={0.3} transparent /></mesh>}>
          <Gltf src={obj.modelUrl} />
        </Suspense>
      );
    }

    switch (obj.type) {
      case 'mesh': return <mesh><boxGeometry args={[1, 1, 1]} /><meshStandardMaterial
        color={obj.material?.baseColor || '#ffffff'}
        metalness={obj.material?.metallic || 0}
        roughness={obj.material?.roughness || 1}
        emissive={obj.material?.baseColor || '#000000'}
        emissiveIntensity={obj.material?.emissive || 0}
      /></mesh>;
      case 'light': return <mesh><sphereGeometry args={[0.2, 16, 16]} /><meshStandardMaterial emissive="#ffff00" emissiveIntensity={2} /></mesh>;
      case 'camera': return <mesh><coneGeometry args={[0.5, 0.5, 4]} /><meshStandardMaterial color="#333" /></mesh>;
      default: return <mesh><boxGeometry args={[1, 1, 1]} /></mesh>;
    }
  };

  return (
    <group
      ref={meshRef}
      position={obj.position}
      rotation={obj.rotation.map(r => THREE.MathUtils.degToRad(r)) as [number, number, number]}
      scale={obj.scale}
      onClick={(e) => { e.stopPropagation(); onSelect(); if (obj.behaviors?.includes('trigger')) triggerActiveRef.current = !triggerActiveRef.current; }}
      visible={obj.visible}
    >
      {getGeometry()}
      {isSelected && (
        <>
          <mesh scale={[1.1, 1.1, 1.1]}>
            <boxGeometry args={[1, 1, 1]} />
            <meshBasicMaterial color="#00f2ff" wireframe transparent opacity={0.5} />
          </mesh>
          {/* Enhanced Gizmo: Axis indicators */}
          <group>
            <mesh position={[0.8, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
              <coneGeometry args={[0.08, 0.2, 8]} />
              <meshBasicMaterial color="#ff4444" />
            </mesh>
            <mesh position={[0, 0.8, 0]}>
              <coneGeometry args={[0.08, 0.2, 8]} />
              <meshBasicMaterial color="#44ff44" />
            </mesh>
            <mesh position={[0, 0, 0.8]} rotation={[Math.PI / 2, 0, 0]}>
              <coneGeometry args={[0.08, 0.2, 8]} />
              <meshBasicMaterial color="#4444ff" />
            </mesh>
          </group>
        </>
      )}
    </group>
  );
};

const GameDashboard: React.FC<GameDashboardProps> = ({
  onBuild, buildInfo, assets, physics, worldConfig, sceneObjects, pipelines,
  renderConfig, compositingConfig, simulation, onUpdatePhysics, onUpdateWorld,
  onUpdateSceneObject, onAddSceneObject, onUpdateConfig, onRunAction, onSendVisualFeedback,
  nodes, edges, onNeuralUpdate, variableData = {}, engineLogs,
  onImportAsset, onAddAsset, sculptHistory, redoStack, onSculptTerrain, onUndoSculpt, onRedoSculpt, onClearSculpt,
  isFullscreen = false
}) => {
  const [activeWorkspace, setActiveWorkspace] = useState<'layout' | 'shading' | 'world' | 'data' | 'rendering' | 'pipelines'>('layout');
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [telemetry, setTelemetry] = useState({ fps: 144, history: Array(30).fill(144) });
  const [localPipelines, setLocalPipelines] = useState(pipelines);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-select first object on mount if available
  useEffect(() => {
    if (sceneObjects.length > 0 && !selectedObjectId) {
      setSelectedObjectId(sceneObjects[0].id);
    }
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setTelemetry(prev => {
        const next = simulation.status === 'playing' ? 140 + Math.random() * 8 : 144;
        return { fps: next, history: [...prev.history.slice(1), next] };
      });
    }, 300);
    return () => clearInterval(interval);
  }, [simulation.status]);

  const handleImport = (asset: GameAsset) => {
    onImportAsset(asset);
    if (asset.type === 'mesh') {
      onAddSceneObject({
        name: asset.name,
        type: 'mesh',
        position: [0, 5, 0],
        rotation: [0, 0, 0],
        scale: [2, 2, 2],
        visible: true,
        modelUrl: asset.url,
        material: {
          baseColor: asset.name.includes('Geometry') ? '#00f2ff' : '#ffffff',
          metallic: 0.8,
          roughness: 0.2,
          emissive: 0.05
        }
      });
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onAddAsset) {
      // Create local URL for preview
      const url = URL.createObjectURL(file);

      // Save to local filesystem via bridge
      const { saveAssetToLocal } = await import('../services/bridgeService');
      const result = await saveAssetToLocal(file.name, file);

      if (result.success) {
        console.log('[BRIDGE] Asset saved locally:', result.output);
      } else {
        console.warn('[BRIDGE] Failed to save locally, using blob URL:', result.error);
      }

      const newAsset: GameAsset = {
        id: `imported-${Date.now()}`,
        name: file.name,
        type: 'mesh',
        status: result.success ? 'optimized' : 'raw',
        url: url
      };
      onAddAsset(newAsset);
    }
  };

  const handleRunTest = () => {
    onRunAction('RUN_TEST_SUITE');
    onBuild('Stress test: Verify binary-to-spatial sync.');
  };

  const handleAddPipeline = () => {
    const newPipeline: PipelineConfig = {
      id: `p-${Date.now()}`,
      name: `Neural_Node_${localPipelines.length + 1}`,
      provider: 'Local',
      status: 'online',
      endpoints: ['/local/compute'],
      latency: 0
    };
    setLocalPipelines(prev => [...prev, newPipeline]);
  };

  const renderSidebarContent = () => {
    switch (activeWorkspace) {
      case 'layout':
      case 'shading':
        return (
          <>
            <div className="p-6 border-b border-cyan-900/40 flex items-center justify-between">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-cyan-400">Asset Registry</h4>
              <button onClick={() => fileInputRef.current?.click()} className="p-2 hover:bg-cyan-500/10 rounded-lg text-cyan-400 transition-all" title="Import Local Model (.glb, .gltf)"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg></button>
              <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".glb,.gltf" />
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3 no-scrollbar">
              {assets.map(asset => (
                <div key={asset.id} className="p-4 bg-cyan-950/20 border border-cyan-500/10 rounded-2xl group hover:border-cyan-500/40 transition-all">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-[11px] font-bold text-cyan-50 truncate w-3/4">{asset.name}</span>
                    <span className="text-[8px] bg-cyan-950 px-1.5 py-0.5 rounded text-cyan-600 font-black uppercase">{asset.type}</span>
                  </div>
                  {asset.url && <div className="mb-2 text-[8px] text-emerald-500 font-black uppercase tracking-tighter flex items-center"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-2 animate-pulse"></div>Local Source Ready</div>}
                  <button onClick={() => handleImport(asset)} className="w-full py-2 bg-cyan-600/10 hover:bg-cyan-600 text-cyan-400 hover:text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition-all">Inject</button>
                </div>
              ))}
            </div>
          </>
        );
      case 'world':
        return (
          <div className="p-6 space-y-8 overflow-y-auto no-scrollbar h-full">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-cyan-400 border-b border-white/5 pb-2">Procedural Generation</h4>
            <div className="space-y-4">
              <div>
                <label className="text-[9px] font-black uppercase text-slate-500 block mb-2">World Seed</label>
                <div className="flex space-x-2">
                  <input type="number" value={worldConfig.seed} onChange={(e) => onUpdateWorld({ seed: parseInt(e.target.value) || 0 })} className="flex-1 bg-[#050a15] border border-cyan-900/40 rounded-xl p-3 text-center text-xs font-mono text-cyan-400 outline-none focus:border-cyan-500" />
                  <button onClick={() => onUpdateWorld({ seed: Math.floor(Math.random() * 999999) })} className="px-4 bg-cyan-600/20 hover:bg-cyan-600 text-cyan-400 hover:text-white rounded-xl text-[9px] font-black uppercase transition-all">Random</button>
                </div>
              </div>
              <div>
                <label className="text-[9px] font-black uppercase text-slate-500 block mb-2">Biome</label>
                <select value={worldConfig.biome} onChange={(e) => onUpdateWorld({ biome: e.target.value as any })} className="w-full bg-[#050a15] border border-cyan-900/40 rounded-xl p-3 text-xs text-cyan-400 outline-none">
                  <option value="temperate">🌲 Temperate Forest</option>
                  <option value="arid">🏜️ Arid Desert</option>
                  <option value="arctic">❄️ Arctic Tundra</option>
                  <option value="volcanic">🌋 Volcanic</option>
                  <option value="cyber">🌆 Cyberpunk</option>
                  <option value="urban">🏙️ Urban</option>
                </select>
              </div>
              <div>
                <label className="text-[9px] font-black uppercase text-slate-500 block mb-2">Terrain Complexity <span className="text-cyan-600">{Math.round(worldConfig.terrainScale * 10)}/10</span></label>
                <input type="range" min="0.1" max="1" step="0.1" value={worldConfig.terrainScale} onChange={(e) => onUpdateWorld({ terrainScale: parseFloat(e.target.value) })} className="w-full accent-cyan-500" />
              </div>
              <div>
                <label className="text-[9px] font-black uppercase text-slate-500 block mb-2">Vegetation Density <span className="text-emerald-500">{Math.round(worldConfig.vegetationDensity * 100)}%</span></label>
                <input type="range" min="0" max="1" step="0.05" value={worldConfig.vegetationDensity} onChange={(e) => onUpdateWorld({ vegetationDensity: parseFloat(e.target.value) })} className="w-full accent-emerald-500" />
              </div>
              <div>
                <label className="text-[9px] font-black uppercase text-slate-500 block mb-2">Water Level <span className="text-blue-400">{Math.round(worldConfig.waterLevel * 100)}%</span></label>
                <input type="range" min="0" max="1" step="0.05" value={worldConfig.waterLevel} onChange={(e) => onUpdateWorld({ waterLevel: parseFloat(e.target.value) })} className="w-full accent-blue-500" />
              </div>
            </div>

            <h4 className="text-[10px] font-black uppercase tracking-widest text-cyan-400 border-b border-white/5 pb-2 pt-4">Environment</h4>
            <div className="space-y-4">
              <div>
                <label className="text-[9px] font-black uppercase text-slate-500 block mb-2">Atmosphere Density</label>
                <input type="range" min="0" max="1" step="0.01" value={worldConfig.atmosphereDensity} onChange={(e) => onUpdateWorld({ atmosphereDensity: parseFloat(e.target.value) })} className="w-full accent-cyan-500" />
              </div>
              <div>
                <label className="text-[9px] font-black uppercase text-slate-500 block mb-2">Physics Time Scale</label>
                <input type="range" min="0" max="2" step="0.1" value={physics.timeScale} onChange={(e) => onUpdatePhysics({ timeScale: parseFloat(e.target.value) })} className="w-full accent-cyan-500" />
              </div>
              <div>
                <label className="text-[9px] font-black uppercase text-slate-500 block mb-2">Gravity</label>
                <input type="number" value={physics.gravity} onChange={(e) => onUpdatePhysics({ gravity: parseFloat(e.target.value) })} className="w-full bg-[#050a15] border border-cyan-900/40 rounded-xl p-3 text-center text-xs font-mono text-cyan-400 outline-none focus:border-cyan-500" />
              </div>
            </div>

            <h4 className="text-[10px] font-black uppercase tracking-widest text-cyan-400 border-b border-white/5 pb-2 pt-4">Terrain Sculpting</h4>
            <div className="grid grid-cols-3 gap-2">
              {['raise', 'lower', 'smooth'].map(tool => (
                <button key={tool} onClick={() => onUpdateWorld({ activeTool: tool as any })} className={`py-2 rounded-xl text-[9px] font-black uppercase ${worldConfig.activeTool === tool ? 'bg-cyan-600 text-white' : 'bg-cyan-900/20 text-slate-500'}`}>{tool}</button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3 mt-4">
              <div>
                <label className="text-[9px] font-black uppercase text-slate-500 block mb-2">Brush Size</label>
                <input type="range" min="1" max="10" step="1" value={worldConfig.brushSize} onChange={(e) => onUpdateWorld({ brushSize: parseInt(e.target.value) })} className="w-full accent-cyan-500" />
              </div>
              <div>
                <label className="text-[9px] font-black uppercase text-slate-500 block mb-2">Brush Strength</label>
                <input type="range" min="0.1" max="1" step="0.1" value={worldConfig.brushStrength} onChange={(e) => onUpdateWorld({ brushStrength: parseFloat(e.target.value) })} className="w-full accent-cyan-500" />
              </div>
            </div>

            <button
              onClick={() => onRunAction('GENERATE_WORLD')}
              className="w-full py-4 bg-gradient-to-r from-cyan-600 to-emerald-600 hover:from-cyan-500 hover:to-emerald-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-cyan-500/20 mt-4"
            >
              🌍 Generate World
            </button>
          </div>
        );
      case 'data':
        return (
          <div className="p-6 space-y-6 overflow-y-auto no-scrollbar h-full">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-cyan-400 border-b border-white/5 pb-2">Neural Variables</h4>
            <div className="space-y-2">
              {Object.entries(variableData).length === 0 ? (
                <div className="text-[10px] text-slate-500 italic p-4 text-center border border-dashed border-cyan-900/30 rounded-xl">No global variables synced.</div>
              ) : Object.entries(variableData).map(([k, v]) => (
                <div key={k} className="flex justify-between items-center bg-[#0a1222] p-3 rounded-xl border border-cyan-900/30 shadow-sm">
                  <span className="text-[10px] font-mono text-cyan-400">{k}</span>
                  <span className="text-[10px] text-slate-300">{String(v)}</span>
                </div>
              ))}
            </div>

            <h4 className="text-[10px] font-black uppercase tracking-widest text-cyan-400 border-b border-white/5 pb-2 pt-4">Runtime State</h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 bg-cyan-950/20 rounded-2xl border border-cyan-500/10">
                <div className="text-[8px] uppercase text-slate-500 mb-1 font-black tracking-widest">Entities</div>
                <div className="text-2xl font-black text-cyan-50">{sceneObjects.length}</div>
              </div>
              <div className="p-4 bg-cyan-950/20 rounded-2xl border border-cyan-500/10">
                <div className="text-[8px] uppercase text-slate-500 mb-1 font-black tracking-widest">Sim Time</div>
                <div className="text-2xl font-black text-cyan-50">{simulation.time.toFixed(1)}s</div>
              </div>
            </div>
          </div>
        );
      case 'rendering':
        return (
          <div className="p-6 space-y-8 overflow-y-auto no-scrollbar h-full">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-cyan-400 border-b border-white/5 pb-2">Render Engine</h4>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-black uppercase text-slate-500">Bloom</span>
                <input type="checkbox" checked={compositingConfig.bloom > 0} onChange={(e) => onUpdateConfig('compositing', { bloom: e.target.checked ? 1.5 : 0 })} className="accent-cyan-500" />
              </div>
              <div>
                <label className="text-[9px] font-black uppercase text-slate-500 block mb-2">Exposure</label>
                <input type="range" min="0" max="3" step="0.1" value={compositingConfig.exposure} onChange={(e) => onUpdateConfig('compositing', { exposure: parseFloat(e.target.value) })} className="w-full accent-cyan-500" />
              </div>
              <div>
                <label className="text-[9px] font-black uppercase text-slate-500 block mb-2">Resolution</label>
                <select value={renderConfig.resolution} onChange={(e) => onUpdateConfig('render', { resolution: e.target.value })} className="w-full bg-[#050a15] border border-cyan-900/40 rounded-xl p-2 text-xs text-cyan-400 outline-none">
                  <option value="720p">720p (Performance)</option>
                  <option value="1080p">1080p (Balanced)</option>
                  <option value="4K">4K (Ultra)</option>
                </select>
              </div>
            </div>
          </div>
        );
      case 'pipelines':
        return (
          <div className="p-6 space-y-4 overflow-y-auto no-scrollbar h-full">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-cyan-400 border-b border-white/5 pb-2">CI/CD Pipelines</h4>
            {localPipelines.map(p => (
              <div key={p.id} className="p-4 bg-[#050a15] border border-cyan-900/30 rounded-2xl shadow-sm">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[10px] font-black text-cyan-50">{p.name}</span>
                  <div className={`w-2 h-2 rounded-full ${p.status === 'online' ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' : 'bg-rose-500'}`}></div>
                </div>
                <div className="flex justify-between text-[9px] text-slate-500 uppercase tracking-widest">
                  <span>{p.provider}</span>
                  <span>{p.latency}ms</span>
                </div>
              </div>
            ))}
            <button
              onClick={handleAddPipeline}
              className="w-full p-4 rounded-2xl border border-dashed border-cyan-500/20 text-center text-cyan-600 text-[10px] font-black uppercase tracking-widest hover:bg-cyan-500/5 hover:border-cyan-500/40 transition-all"
            >
              + Add New Pipeline
            </button>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className={`h-full flex flex-col bg-[#050a15] text-white overflow-hidden font-sans transition-all duration-700 ${isFullscreen ? 'fixed inset-0 z-[1000]' : 'border-t border-cyan-900/30'}`}>
      {!isFullscreen && (
        <div className="flex items-center h-14 bg-[#0a1222]/95 backdrop-blur-3xl px-8 border-b border-cyan-900/40 space-x-2 shrink-0 z-50">
          <div className="flex items-center space-x-4 mr-12">
            <div className={`w-2 h-2 rounded-full ${simulation.status === 'playing' ? 'bg-cyan-500 shadow-[0_0_10px_#00f2ff] animate-pulse' : 'bg-slate-700'}`}></div>
            <span className="text-[10px] font-black uppercase tracking-[0.5em] text-cyan-100/50">Matrix PRO Runtime</span>
          </div>

          <div className="flex-1 flex items-center space-x-1 h-full">
            {['layout', 'shading', 'world', 'data', 'rendering', 'pipelines'].map((ws) => (
              <button
                key={ws}
                onClick={() => setActiveWorkspace(ws as any)}
                className={`px-8 h-full text-[9px] font-black uppercase transition-all flex items-center border-b-2 tracking-widest ${activeWorkspace === ws ? 'text-cyan-400 border-cyan-500 bg-cyan-600/5' : 'text-slate-600 hover:text-cyan-400 border-transparent'
                  }`}
              >
                {ws}
              </button>
            ))}
          </div>

          <div className="flex items-center space-x-4">
            <button onClick={handleRunTest} className="px-6 py-2 bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-emerald-600 hover:text-white transition-all">Run Logic Tests</button>
            <button onClick={() => onRunAction('PRESENT_BUILD')} className="p-2 bg-cyan-900/20 border border-cyan-500/20 rounded-xl text-cyan-400 hover:bg-cyan-500 hover:text-white transition-all" title="Presentation Mode"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg></button>
            <button onClick={() => { setIsCapturing(true); setTimeout(() => { onSendVisualFeedback?.(`Runtime Snapshot: Entities=${sceneObjects.length} FPS=${telemetry.fps.toFixed(0)}`); setIsCapturing(false); }, 600); }} className="bg-cyan-600 px-6 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-cyan-500 transition-all shadow-[0_0_15px_rgba(0,242,255,0.3)]">{isCapturing ? 'TRANSMITTING' : 'DIRECTOR SNAPSHOT'}</button>
          </div>
        </div>
      )}

      <div className="flex-1 flex overflow-hidden relative">
        {(!isFullscreen) && (
          <div className="w-64 bg-[#0a1222] border-r border-cyan-900/40 flex flex-col shrink-0 transition-all duration-300">
            {renderSidebarContent()}
          </div>
        )}

        <div className="flex-1 relative bg-[#000000]">
          {isFullscreen && (
            <div className="absolute top-10 left-10 z-50 flex items-center space-x-6">
              <button onClick={() => onRunAction('EXIT_PRESENTATION')} className="p-4 bg-black/40 backdrop-blur-md border border-white/10 rounded-2xl text-white hover:bg-cyan-600 transition-all group">
                <svg className="w-6 h-6 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" /></svg>
              </button>
              <div className="flex flex-col">
                <span className="text-[10px] font-black uppercase tracking-[0.4em] text-cyan-400">Presentation Active</span>
                <span className="text-2xl font-black text-white uppercase tracking-widest drop-shadow-lg">Runtime: v{buildInfo.lastBuild ? 'Final' : 'Live'}</span>
              </div>
            </div>
          )}

          <Suspense fallback={<div className="flex items-center justify-center h-full text-cyan-500 animate-pulse uppercase text-xs font-black tracking-widest">Waking Runtime Engine...</div>}>
            <button onClick={() => xrStore.enterVR()} className="absolute top-4 left-4 z-50 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition-all shadow-lg">Enter VR</button>
            <button onClick={() => xrStore.enterAR()} className="absolute top-4 left-24 z-50 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition-all shadow-lg">Enter AR</button>
            <Canvas
              shadows
              gl={{
                antialias: true,
                preserveDrawingBuffer: true,
                powerPreference: "high-performance"
              }}
              dpr={[1, 2]}
            >
              <XR store={xrStore}>

                <PerspectiveCamera makeDefault position={[15, 15, 15]} fov={45} />
                <OrbitControls makeDefault />
                <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
                <Sky sunPosition={[100, worldConfig.atmosphereDensity * 50, 100]} />
                <Environment preset="night" />
                <ambientLight intensity={0.5} />
                <pointLight position={[10, 10, 10]} intensity={1} castShadow />

                {sceneObjects.map(obj => (
                  <LiveObject
                    key={obj.id}
                    obj={obj}
                    isSelected={selectedObjectId === obj.id}
                    onSelect={() => setSelectedObjectId(obj.id)}
                    isPlaying={simulation.status === 'playing' || isFullscreen}
                  />
                ))}

                {!isFullscreen && <Grid renderOrder={-1} position={[0, -0.01, 0]} infiniteGrid cellSize={1} sectionSize={5} sectionColor="#00f2ff" cellColor="#0a1222" fadeDistance={50} />}

                <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]}>
                  <planeGeometry args={[200, 200]} />
                  <meshStandardMaterial color="#0a1222" roughness={1} metalness={0.1} />
                </mesh>
              </XR>
            </Canvas>
          </Suspense>

          <div className={`absolute bottom-10 right-10 flex flex-col space-y-6 z-40 transition-opacity duration-500 ${isFullscreen ? 'opacity-30' : 'opacity-100'}`}>
            {/* Bridge Connection Manager */}
            <div className="bg-[#0a1222]/90 backdrop-blur-3xl p-6 rounded-[2rem] border border-cyan-500/20 shadow-2xl min-w-[360px] space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black uppercase text-cyan-600 tracking-widest">Neural Link</span>
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${ws?.readyState === 1 ? 'bg-emerald-500 shadow-[0_0_10px_#10b981]' : 'bg-red-500 animate-pulse'}`}></div>
                  <span className="text-[9px] font-bold text-slate-400 uppercase">{ws?.readyState === 1 ? 'Connected' : 'Offline'}</span>
                </div>
              </div>
              <input
                className="w-full bg-[#050a15] border border-slate-700 focus:border-cyan-500 rounded-lg px-3 py-2 text-[10px] text-cyan-400 font-mono outline-none transition-colors placeholder:text-slate-700"
                placeholder="Enter Tunnel URL (e.g., https://xyz.trycloudflare.com)"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const url = e.currentTarget.value;
                    if (url) {
                      // Dynamic Import to avoid SSR issues if any
                      import('../services/cloudflareService').then(({ setBridgeUrl }) => {
                        setBridgeUrl(url);
                        // Force reconnect logic here if setup
                        const newWs = new WebSocket(url.replace('http', 'ws'));
                        newWs.onopen = () => setWs(newWs);
                      });
                    }
                  }
                }}
              />
            </div>

            <div className="bg-[#0a1222]/90 backdrop-blur-3xl p-8 rounded-[2.5rem] border border-cyan-500/20 shadow-2xl min-w-[360px]">
              <div className="flex justify-between items-end mb-8">
                <div className="flex flex-col">
                  <span className="text-[9px] font-black uppercase text-cyan-600 tracking-widest mb-1">PRO TELEMETRY</span>
                  <span className="text-4xl font-black text-cyan-50 tabular-nums">{telemetry.fps.toFixed(0)} <span className="text-xs opacity-30">FPS</span></span>
                </div>
                <div className="h-10 w-32 flex items-end space-x-1">
                  {telemetry.history.map((h, i) => (
                    <div key={i} className="flex-1 bg-cyan-500/30 rounded-t-sm" style={{ height: `${(h / 144) * 100}%` }}></div>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 border-t border-white/5 pt-6 text-[9px] font-black uppercase text-slate-500 tracking-widest">
                <div className="flex flex-col"><span className="opacity-40">Pipeline</span><span className="text-emerald-400">WebGPU / Live</span></div>
                <div className="flex flex-col text-right"><span className="opacity-40">Memory</span><span className="text-cyan-400">0.4 GB</span></div>
              </div>
            </div>
          </div>
        </div>

        {(!isFullscreen) && (
          <div className="w-[420px] bg-[#0a1222] border-l border-cyan-900/40 p-10 space-y-10 shrink-0 overflow-y-auto no-scrollbar">
            <h3 className="text-xl font-black uppercase tracking-[0.3em] text-cyan-50 border-b border-white/5 pb-8">Matrix Inspector</h3>
            {selectedObjectId ? (
              <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
                <div className="p-8 bg-[#050a15] rounded-[2rem] border border-cyan-500/10">
                  <span className="text-[10px] font-black text-cyan-600 uppercase tracking-widest block mb-2">Selected Entity</span>
                  <span className="text-lg font-black text-cyan-50 uppercase tracking-widest">{sceneObjects.find(o => o.id === selectedObjectId)?.name}</span>
                </div>
                {['position', 'rotation', 'scale'].map(prop => (
                  <div key={prop} className="space-y-4">
                    <span className="text-[9px] font-black uppercase text-slate-600 tracking-widest px-2">{prop} Modulation</span>
                    <div className="grid grid-cols-3 gap-3">
                      {[0, 1, 2].map(i => (
                        <input
                          key={i} type="number" step="0.1"
                          value={((sceneObjects.find(o => o.id === selectedObjectId) as any)[prop])[i]}
                          onChange={(e) => {
                            const obj = sceneObjects.find(o => o.id === selectedObjectId);
                            if (!obj) return;
                            const next = [...(obj as any)[prop]];
                            next[i] = parseFloat(e.target.value) || 0;
                            onUpdateSceneObject(obj.id, { [prop]: next as any });
                          }}
                          className="w-full bg-[#050a15] border border-cyan-900/40 rounded-xl p-3 text-center text-xs font-mono text-cyan-400 outline-none focus:border-cyan-500"
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full opacity-20 text-center space-y-6">
                <svg className="w-12 h-12 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" /></svg>
                <p className="text-[10px] font-black uppercase tracking-[0.3em]">Awaiting Entity Handshake</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default GameDashboard;
