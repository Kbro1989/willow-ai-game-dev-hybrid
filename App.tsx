
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  FileNode, ProjectState, TerminalLine, GitCommit, TodoTask,
  TokenMetrics, BuildInfo, GameAsset, SceneObject, PhysicsConfig,
  PipelineConfig, RenderConfig, CompositingConfig, SimulationState,
  WorldConfig, SculptPoint, EngineAction, EngineLog, NeuralNode, NeuralEdge,
  Workspace, Message, UserPreferences, Extension
} from './types';
import Sidebar from './components/Sidebar';
import Editor from './components/Editor';
import Terminal from './components/Terminal';
import Chat, { ChatHandle } from './components/Chat';
import GameDashboard from './components/GameDashboard';
import DiagnosticsPanel from './components/DiagnosticsPanel';
import ApiKeyManager from './components/ApiKeyManager';
import { initialFiles } from './constants';
import { cloudlareLimiter as limiter } from './services/cloudflareService';

const DEFAULT_WORKSPACE_NAME = 'Willow Studio Professional';
const STORAGE_KEY = 'antigravity_pro_workspace_v1';

const initialExtensions: Extension[] = [
  { "identifier": { "id": "github.vscode-pull-request-github", "uuid": "69ddd764-339a-4ecc-97c1-9c4ece58e36d" }, "version": "0.118.2", "location": { "path": "/c:/Users/Destiny/.antigravity/extensions/github.vscode-pull-request-github-0.118.2-universal", "scheme": "file" }, "relativeLocation": "github.vscode-pull-request-github-0.118.2-universal", "metadata": { "installedTimestamp": 1763713687525, "pinned": false, "source": "gallery", "id": "69ddd764-339a-4ecc-97c1-9c4ece58e36d", "publisherId": "7c1c19cd-78eb-4dfb-8999-99caf7679002", "publisherDisplayName": "GitHub", "targetPlatform": "universal", "updated": false, "private": false, "isPreReleaseVersion": false, "hasPreReleaseVersion": false } },
  { "identifier": { "id": "slevesque.vscode-3dviewer", "uuid": "22074919-af0e-4e0c-928d-7149d7a68ede" }, "version": "0.2.2", "location": { "path": "/c:/Users/Destiny/.antigravity/extensions/slevesque.vscode-3dviewer-0.2.2-universal", "scheme": "file" }, "relativeLocation": "slevesque.vscode-3dviewer-0.2.2-universal", "metadata": { "installedTimestamp": 1763713800388, "pinned": false, "source": "gallery", "id": "22074919-af0e-4e0c-928d-7149d7a68ede", "publisherId": "30cbfd41-b05d-4739-9271-f782deb68b9e", "publisherDisplayName": "slevesque", "targetPlatform": "universal", "updated": false, "private": false, "isPreReleaseVersion": false, "hasPreReleaseVersion": false } },
  { "identifier": { "id": "ms-vscode.powershell", "uuid": "40d39ce9-c381-47a0-80c8-a6661f731eab" }, "version": "2025.4.0", "location": { "path": "/c:/Users/Destiny/.antigravity/extensions/ms-vscode.powershell-2025.4.0-universal", "scheme": "file" }, "relativeLocation": "ms-vscode.powershell-2025.4.0-universal", "metadata": { "installedTimestamp": 1763842466701, "source": "gallery", "id": "40d39ce9-c381-47a0-80c8-a6661f731eab", "publisherId": "5f5636e7-69ed-4afe-b5d6-8d231fb3d3ee", "publisherDisplayName": "ms-vscode", "targetPlatform": "universal", "updated": false, "private": false, "isPreReleaseVersion": false, "hasPreReleaseVersion": false } }
];

const App: React.FC = () => {
  const [userPrefs, setUserPrefs] = useState<UserPreferences>({
    codingStyle: ['Functional React', 'TailwindCSS'],
    forbiddenPatterns: ['placeholders', 'TODO comments', 'entire file rewrites'],
    architecturalDecisions: ['Micro-component architecture'],
    lastLearningUpdate: Date.now()
  });

  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(null);
  const [isWorkspaceSwitcherOpen, setIsWorkspaceSwitcherOpen] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(360);
  const [bottomHeight, setBottomHeight] = useState(480);
  const [isResizingSidebar, setIsResizingSidebar] = useState(false);
  const [isResizingBottom, setIsResizingBottom] = useState(false);
  const [lastSaved, setLastSaved] = useState<number>(Date.now());
  const [isSyncing, setIsSyncing] = useState(false);
  const [isPresenting, setIsPresenting] = useState(false);

  const [project, setProject] = useState<ProjectState>({ id: 'init', name: 'Init', files: initialFiles, activeFile: 'src/App.tsx' });
  const [simulation, setSimulation] = useState<SimulationState>({ status: 'playing', time: 0, activeBehaviors: [] });
  const [sceneObjects, setSceneObjects] = useState<SceneObject[]>([]);
  const [physics, setPhysics] = useState<PhysicsConfig>({ gravity: -9.81, friction: 0.6, atmosphere: 'normal', timeScale: 1.0 });
  const [showApiKeyManager, setShowApiKeyManager] = useState(false);
  const [worldConfig, setWorldConfig] = useState<WorldConfig>({ seed: 999, terrainScale: 1.0, biome: 'cyber', vegetationDensity: 0.8, waterLevel: 0.1, atmosphereDensity: 0.2, brushSize: 20.0, brushStrength: 0.7, activeTool: 'none' });
  const [renderConfig, setRenderConfig] = useState<RenderConfig>({ engine: 'WebGPU', resolution: '4K', samples: 128, denoising: true, shadowMapRes: 2048 });
  const [compositingConfig, setCompositingConfig] = useState<CompositingConfig>({ bloom: 2.0, exposure: 1.2, vignette: 0.6, chromaticAberration: 0.15, tonemapping: 'ACES' });
  const [nodes, setNodes] = useState<NeuralNode[]>([]);
  const [edges, setEdges] = useState<NeuralEdge[]>([]);
  const [terminalHistory, setTerminalHistory] = useState<TerminalLine[]>([]);
  const [tasks, setTasks] = useState<TodoTask[]>([]);
  const [stagedFiles, setStagedFiles] = useState<string[]>([]);
  const [commitHistory, setCommitHistory] = useState<GitCommit[]>([]);
  const [engineLogs, setEngineLogs] = useState<EngineLog[]>([]);
  const [sculptHistory, setSculptHistory] = useState<SculptPoint[]>([]);
  const [chatMessages, setChatMessages] = useState<Message[]>([
    {
      id: 'init-1',
      role: 'assistant',
      content: "All systems nominal. Neural Overwatch is active and listening.\n\nI'm ready to architect your game. Just tell me what you want to build—I'll handle the files, the code, and the logic.",
      timestamp: Date.now(),
      model: 'Director Core'
    }
  ]);
  const [variableData, setVariableData] = useState<Record<string, any>>({});
  const [extensions, setExtensions] = useState<Extension[]>(initialExtensions);
  const [projectVersion, setProjectVersion] = useState<string>('v1.0');
  const [pipelines, setPipelines] = useState<PipelineConfig[]>([
    { id: 'p1', name: 'Willow_Hyper_Relay', provider: 'Cloudflare', status: 'online', endpoints: ['/relay/willow-high'], latency: 1 },
    { id: 'p2', name: 'Neural_Runtime_Engine', provider: 'Custom', status: 'online', endpoints: ['/compute/live'], latency: 4 },
  ]);

  const [isOverwatchActive, setIsOverwatchActive] = useState(true);
  const [tokenMetrics, setTokenMetrics] = useState<TokenMetrics>(limiter.getMetrics());
  const [buildInfo, setBuildInfo] = useState<BuildInfo>({ status: 'idle', progress: 0 });
  const [assets, setAssets] = useState<GameAsset[]>([
    { id: 'a1', name: 'Neural_Geometry_Core', type: 'mesh', status: 'optimized' },
    { id: 'a2', name: 'Overwatch_LUT', type: 'texture', status: 'optimized' },
  ]);

  const [bottomPanel, setBottomPanel] = useState<'terminal' | 'chat' | 'dashboard' | 'diagnostics'>('chat');
  const chatRef = useRef<ChatHandle>(null);
  const lastSimTimeRef = useRef<number>(Date.now());
  const saveTimeoutRef = useRef<number | null>(null);

  // Auto-Save Aggressive Logic
  const performAutoSave = useCallback(() => {
    if (!activeWorkspaceId) return;
    setIsSyncing(true);
    const currentWorkspace: Workspace = {
      id: activeWorkspaceId,
      name: workspaces.find(ws => ws.id === activeWorkspaceId)?.name || DEFAULT_WORKSPACE_NAME,
      project, sceneObjects, physics, worldConfig, renderConfig, compositingConfig,
      simulation, nodes, edges, terminalHistory, tasks, stagedFiles, commitHistory, engineLogs,
      messages: chatMessages, sculptHistory, variableData, extensions, projectVersion
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(currentWorkspace));
    setLastSaved(Date.now());
    setTimeout(() => setIsSyncing(false), 800);
  }, [activeWorkspaceId, workspaces, project, sceneObjects, physics, worldConfig, renderConfig, compositingConfig, simulation, nodes, edges, terminalHistory, tasks, stagedFiles, commitHistory, engineLogs, chatMessages, sculptHistory, variableData, extensions, projectVersion]);

  useEffect(() => {
    if (saveTimeoutRef.current) window.clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = window.setTimeout(performAutoSave, 2000); // Debounce save every 2 seconds of change
    return () => { if (saveTimeoutRef.current) window.clearTimeout(saveTimeoutRef.current); };
  }, [project, sceneObjects, worldConfig, tasks, chatMessages, performAutoSave]);

  useEffect(() => {
    const createInitialWorkspace = () => {
      // Recovery logic
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          const recovered = JSON.parse(saved) as Workspace;
          setWorkspaces([recovered]);
          setActiveWorkspaceId(recovered.id);
          loadWorkspace(recovered);
          addLog("Neural session recovered from local buffer.", "success", "Persistence");
          return;
        } catch (e) {
          console.error("Persistence recovery fault:", e);
        }
      }

      const id = Math.random().toString(36).substring(7);
      const newWs: Workspace = {
        id,
        name: DEFAULT_WORKSPACE_NAME,
        project: { id: `proj-${id}`, name: DEFAULT_WORKSPACE_NAME, files: initialFiles, activeFile: 'src/App.tsx' },
        sceneObjects: [
          { id: 'cam-master', name: 'Willow_Director_Cam', type: 'camera', position: [0, 25, 50], rotation: [-0.6, 0, 0], scale: [1, 1, 1], visible: true, behaviors: [] },
          { id: 'sun-master', name: 'Neural_Global_Source', type: 'light', position: [60, 100, 60], rotation: [1.1, 0.8, 0], scale: [1, 1, 1], visible: true, behaviors: [] },
          { id: 'floor-master', name: 'Runtime_Base_Plane', type: 'mesh', position: [0, -1, 0], rotation: [0, 0, 0], scale: [150, 1, 150], visible: true, behaviors: [], material: { baseColor: '#0a1222', metallic: 1.0, roughness: 0.05, emissive: 0.08 } },
        ],
        physics: { gravity: -9.81, friction: 0.6, atmosphere: 'normal', timeScale: 1.0 },
        worldConfig: { seed: 999, terrainScale: 1.0, biome: 'cyber', vegetationDensity: 0.8, waterLevel: 0.1, atmosphereDensity: 0.2, brushSize: 20.0, brushStrength: 0.7, activeTool: 'none' },
        renderConfig: { engine: 'WebGPU', resolution: '4K', samples: 128, denoising: true, shadowMapRes: 2048 },
        compositingConfig: { bloom: 2.0, exposure: 1.2, vignette: 0.6, chromaticAberration: 0.15, tonemapping: 'ACES' },
        simulation: { status: 'stopped', time: 0, activeBehaviors: [] },
        nodes: [], edges: [],
        terminalHistory: [{ text: 'Willow Workspace Initialized.', type: 'system', timestamp: Date.now() }],
        tasks: [], stagedFiles: [], commitHistory: [], engineLogs: [], messages: [], sculptHistory: [], variableData: {},
        extensions: initialExtensions,
        projectVersion: 'v1.0'
      };
      setWorkspaces([newWs]);
      setActiveWorkspaceId(id);
      loadWorkspace(newWs);
    };
    if (workspaces.length === 0) createInitialWorkspace();
  }, []);

  const loadWorkspace = (ws: Workspace) => {
    setProject(ws.project);
    setSceneObjects(ws.sceneObjects);
    setPhysics(ws.physics);
    setWorldConfig(ws.worldConfig);
    setRenderConfig(ws.renderConfig);
    setCompositingConfig(ws.compositingConfig);
    setSimulation(ws.simulation);
    setNodes(ws.nodes);
    setEdges(ws.edges);
    setTerminalHistory(ws.terminalHistory);
    setTasks(ws.tasks);
    setStagedFiles(ws.stagedFiles);
    setCommitHistory(ws.commitHistory);
    setEngineLogs(ws.engineLogs);
    setChatMessages(ws.messages.length > 0 ? ws.messages : [
      {
        id: 'init-1',
        role: 'assistant',
        content: "All systems nominal. Neural Overwatch is active and listening.\n\nI'm ready to architect your game. Just tell me what you want to build—I'll handle the files, the code, and the logic.",
        timestamp: Date.now(),
        model: 'Director Core'
      }
    ]);
    setSculptHistory(ws.sculptHistory);
    setVariableData(ws.variableData || {});
    setExtensions(ws.extensions || initialExtensions);
    setProjectVersion(ws.projectVersion || 'v1.0');
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isResizingSidebar) setSidebarWidth(Math.max(200, Math.min(800, e.clientX)));
      if (isResizingBottom) setBottomHeight(Math.max(200, Math.min(window.innerHeight - 100, window.innerHeight - e.clientY)));
    };
    const handleMouseUp = () => { setIsResizingSidebar(false); setIsResizingBottom(false); };
    if (isResizingSidebar || isResizingBottom) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizingSidebar, isResizingBottom]);

  useEffect(() => {
    let frameId: number;
    const loop = () => {
      if (simulation.status === 'playing') {
        const now = Date.now();
        const dt = (now - lastSimTimeRef.current) / 1000;
        lastSimTimeRef.current = now;
        setSimulation(prev => ({ ...prev, time: prev.time + dt * physics.timeScale }));
      } else lastSimTimeRef.current = Date.now();
      frameId = requestAnimationFrame(loop);
    };
    frameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frameId);
  }, [simulation.status, physics.timeScale]);

  const handleFileChange = useCallback((newContent: string) => {
    if (!project.activeFile) return;
    const updateFiles = (nodes: FileNode[]): FileNode[] => nodes.map(node => {
      if (node.path === project.activeFile) return { ...node, content: newContent };
      if (node.children) return { ...node, children: updateFiles(node.children) };
      return node;
    });
    setProject(prev => ({ ...prev, files: updateFiles(prev.files) }));
  }, [project.activeFile]);

  const addLog = (message: string, type: EngineLog['type'] = 'info', source: string = 'Engine') => {
    const log: EngineLog = { id: Math.random().toString(36), message, type, timestamp: Date.now(), source };
    setEngineLogs(prev => [...prev.slice(-199), log]);
    setTerminalHistory(prev => [...prev, { text: `[${source}] ${message}`, type: type === 'error' ? 'error' : 'output', timestamp: Date.now() }]);
  };

  const handleUpdateSceneObject = useCallback((id: string, updates: Partial<SceneObject>) => {
    setSceneObjects(prev => prev.map(obj => obj.id === id ? { ...obj, ...updates } : obj));
  }, []);

  const handleAddSceneObject = useCallback((o: Omit<SceneObject, 'id'>) => {
    setSceneObjects(prev => [...prev, {
      position: [0, 0, 0],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
      ...o,
      id: `obj-${Math.random().toString(36).slice(2, 8)}`
    } as any]);
  }, []);

  const handleNeuralUpdate = useCallback((payload: { nodes?: NeuralNode[], edges?: NeuralEdge[] }) => {
    if (payload.nodes) setNodes(payload.nodes);
    if (payload.edges) setEdges(payload.edges);
  }, []);

  const handleCreateNode = useCallback((parentPath: string | null, name: string, type: 'file' | 'dir') => {
    const newNodePath = parentPath ? `${parentPath}/${name}` : name;
    const newNode: FileNode = {
      name,
      type,
      path: newNodePath,
      ...(type === 'file' ? { content: `// Binary Source: ${name}` } : { children: [] })
    };
    const insertNode = (nodes: FileNode[]): FileNode[] => {
      if (parentPath === null) return [...nodes, newNode];
      return nodes.map(node => {
        if (node.path === parentPath && node.type === 'dir') {
          return { ...node, children: [...(node.children || []), newNode] };
        }
        if (node.children) {
          return { ...node, children: insertNode(node.children) };
        }
        return node;
      });
    };
    setProject(prev => ({
      ...prev,
      files: insertNode(prev.files),
      activeFile: type === 'file' ? newNodePath : prev.activeFile
    }));
    addLog(`Node manifest updated: ${newNodePath} synthesized.`, 'success', 'Kernel');
  }, [project.files, addLog]);

  const handleInjectScript = useCallback((path: string, content: string) => {
    addLog(`Neural File Mutation: ${path}`, 'success', 'Kernel');
    setProject(prev => {
      const pathParts = path.split('/');
      const fileName = pathParts.pop() || 'untitled.ts';
      const updateTree = (nodes: FileNode[], parts: string[]): FileNode[] => {
        if (parts.length === 0) {
          const existingFile = nodes.find(n => n.name === fileName && n.type === 'file');
          return existingFile ? nodes.map(n => n === existingFile ? { ...n, content } : n) : [...nodes, { name: fileName, type: 'file', path: path, content }];
        }
        const currentDirName = parts[0];
        const remainingParts = parts.slice(1);
        const existingDir = nodes.find(n => n.name === currentDirName && n.type === 'dir');
        if (existingDir) return nodes.map(n => n === existingDir ? { ...n, children: updateTree(n.children || [], remainingParts) } : n);
        const newDirPath = pathParts.slice(0, pathParts.length - remainingParts.length).join('/');
        return [...nodes, { name: currentDirName, type: 'dir', path: newDirPath, children: updateTree([], remainingParts) }];
      };
      return { ...prev, files: updateTree(prev.files, pathParts), activeFile: path };
    });
  }, []);

  const handleSyncVariableData = useCallback((data: Record<string, any>) => {
    setVariableData(prev => ({ ...prev, ...data }));
    addLog(`Logic Sync: ${Object.keys(data).join(', ')}`, 'success', 'Genesis');
  }, []);

  const handleBuild = useCallback((prompt?: string) => {
    if (buildInfo.status === 'building') return;
    setBuildInfo({ status: 'building', progress: 0, buildPrompt: prompt });
    addLog('Relay Provisioning...', 'info', 'Overwatch');

    // Switch to dashboard view if not already
    if (!isPresenting) setBottomPanel('dashboard');

    let prog = 0;
    const interval = setInterval(() => {
      prog += 25;
      if (prog >= 100) {
        clearInterval(interval);
        setBuildInfo({ status: 'success', progress: 100, lastBuild: Date.now(), buildPrompt: prompt });
        addLog('Runtime Optimized.', 'success', 'Director');
      } else setBuildInfo(prev => ({ ...prev, progress: prog }));
    }, 50);
  }, [buildInfo.status, isPresenting]);

  const handleUninstallExtension = (id: string) => {
    setExtensions(prev => prev.filter(e => e.identifier.id !== id));
    addLog(`Extension De-provisioned: ${id}`, 'warn', 'Registry');
  };

  const activeFileNode = project.activeFile ? (function findFile(nodes: FileNode[], path: string): FileNode | undefined {
    for (const node of nodes) {
      if (node.path === path) return node;
      if (node.children) { const found = findFile(node.children, path); if (found) return found; }
    }
    return undefined;
  })(project.files, project.activeFile) : null;

  const activeFileContent = activeFileNode?.content || '';

  // Determine dashboard visibility and styling for persistence
  const showDashboard = bottomPanel === 'dashboard' || isPresenting;
  const dashboardStyle: React.CSSProperties = isPresenting
    ? { position: 'fixed', inset: 0, zIndex: 50, width: '100vw', height: '100vh' }
    : { position: 'absolute', bottom: 0, right: 0, left: `${sidebarWidth}px`, height: `${bottomHeight}px`, zIndex: 5 };

  return (
    <div className={`flex h-screen w-full bg-[#050a15] text-white/90 overflow-hidden font-sans select-none transition-all duration-700 ${isPresenting ? 'presentation-active' : ''}`}>
      {!isPresenting && (
        <div style={{ width: `${sidebarWidth}px` }} className="flex flex-col z-20 relative shrink-0 transition-transform duration-500">
          <Sidebar
            isOpen={true} setIsOpen={() => { }} files={project.files} activeFile={project.activeFile}
            onSelectFile={(p) => setProject(prev => ({ ...prev, activeFile: p }))}
            onCreateNode={handleCreateNode}
            stagedFiles={stagedFiles} onStage={(p) => setStagedFiles(prev => [...prev, p])} onUnstage={(p) => setStagedFiles(prev => prev.filter(f => f !== p))}
            onCommit={(m) => setCommitHistory(prev => [{ id: Date.now().toString(), message: m, author: 'Willow Master', timestamp: Date.now() }, ...prev])}
            commitHistory={commitHistory} tasks={tasks}
            onToggleTask={(id) => setTasks(prev => prev.map(t => t.id === id ? { ...t, completed: !t.completed } : t))}
            onAddTasks={(nt) => setTasks(prev => [...prev, ...nt.map(t => ({ ...t, id: Math.random().toString(36), completed: false }))])}
            tokenMetrics={tokenMetrics} sceneObjects={sceneObjects} userPrefs={userPrefs} extensions={extensions} onUninstallExtension={handleUninstallExtension}
          />
          <div onMouseDown={() => setIsResizingSidebar(true)} className="absolute top-0 -right-1 w-2 h-full cursor-col-resize z-50 group">
            <div className="w-px h-full bg-cyan-500/10 group-hover:bg-cyan-400 transition-colors mx-auto shadow-[0_0_10px_#00f2ff]"></div>
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {!isPresenting && (
          <header className="h-20 bg-[#0a1222] border-b border-cyan-900/30 flex items-center justify-between px-10 shrink-0 z-20 shadow-[0_10px_50px_rgba(0,0,0,0.5)]">
            <div className="flex items-center space-x-6">
              <div>
                <h1 className="text-2xl font-black uppercase tracking-[0.3em] text-cyan-50" style={{ textShadow: '0 0 20px rgba(0,242,255,0.5)' }}>Willow Symphony</h1>
                <p className="text-[9px] uppercase tracking-[0.3em] text-slate-600 mt-0.5">Neural Game Director</p>
              </div>
              <div className="h-12 w-px bg-cyan-900/40" />
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2 bg-emerald-500/10 px-4 py-2 rounded-full border border-emerald-500/20">
                  <div className="w-3 h-3 rounded-full bg-cyan-500 shadow-[0_0_15px_#00f2ff] animate-pulse"></div>
                  <span className="text-[10px] font-black uppercase text-emerald-400 tracking-widest">Agent Active</span>
                </div>
                {/* API Key Manager Button */}
                <button
                  onClick={() => setShowApiKeyManager(true)}
                  className="p-2 bg-slate-800/50 hover:bg-cyan-600/20 border border-slate-700 hover:border-cyan-500/50 rounded-lg transition-all group"
                  title="API Key Manager"
                >
                  <svg className="w-5 h-5 text-slate-400 group-hover:text-cyan-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-[11px]">
                <span className="text-slate-600 uppercase tracking-widest font-black">v{projectVersion}</span>
                <div className={`w-2 h-2 rounded-full ${buildInfo.status === 'building' ? 'bg-yellow-500 animate-pulse' : buildInfo.status === 'success' ? 'bg-emerald-500' : buildInfo.status === 'error' ? 'bg-red-500' : 'bg-slate-600'}`}></div>
              </div>
              <div className="h-12 w-px bg-cyan-900/40" />
              <div className="flex items-center space-x-3">
                <div className="flex flex-col items-end">
                  <div className="flex items-center space-x-2">
                    <span className="text-[9px] uppercase tracking-widest text-slate-600 font-black">Diagnostic</span>
                    <div className="w-3 h-3 rounded-full bg-cyan-500 shadow-[0_0_15px_#00f2ff] animate-pulse"></div>
                  </div>
                </div>
              </div>
              <button onClick={() => handleBuild()} className="relative overflow-hidden group px-12 py-3.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-2xl text-[13px] font-black uppercase tracking-widest transition-all shadow-[0_0_20px_rgba(0,242,255,0.4)]">Push & Hot-Swap</button>
            </div>
          </header>
        )}

        {/* API Key Manager Modal */}
        {showApiKeyManager && (
          <ApiKeyManager onClose={() => setShowApiKeyManager(false)} />
        )}

        <div className={`flex-1 relative overflow-hidden bg-[#050a15] ${isPresenting ? 'isPresenting' : ''}`}>
          {!isPresenting && (
            <Editor content={activeFileContent} onChange={handleFileChange} filename={project.activeFile || ''} lastSaved={lastSaved} isSyncing={isSyncing} />
          )}
          {/* GameDashboard is now hoisted out to the root layer for persistence */}
        </div>

        {!isPresenting && (
          <div style={{ height: `${bottomHeight}px` }} className="border-t border-cyan-900/30 flex flex-col bg-[#0a1222] z-10 relative shrink-0 shadow-[0_-10px_50px_rgba(0,0,0,0.8)] transition-all duration-500">
            <div onMouseDown={() => setIsResizingBottom(true)} className="absolute -top-1 left-0 w-full h-2 cursor-row-resize z-50 group">
              <div className="h-px w-full bg-cyan-500/10 group-hover:bg-cyan-400 transition-colors my-auto shadow-[0_0_10px_#00f2ff]"></div>
            </div>
            <div className="flex items-center space-x-2 px-10 h-16 border-b border-cyan-900/20 bg-[#050a15]/60 backdrop-blur-3xl shrink-0">
              {['chat', 'dashboard', 'terminal', 'diagnostics'].map(tab => (
                <button key={tab} onClick={() => setBottomPanel(tab as any)} className={`px-10 text-[11px] font-black uppercase h-full border-b-2 transition-all ${bottomPanel === tab ? 'border-cyan-500 text-cyan-400 bg-cyan-500/5' : 'border-transparent text-slate-500 hover:text-cyan-400'}`}>
                  {tab === 'chat' ? 'Neural Director' : tab === 'dashboard' ? 'Matrix View' : tab === 'terminal' ? 'Binary Console' : 'Audit Control'}
                </button>
              ))}
            </div>
            <div className="flex-1 overflow-hidden relative bg-[#050a15]">
              {bottomPanel === 'terminal' && <Terminal history={terminalHistory} onCommand={(c) => addLog(`Exec: ${c}`, 'info', 'Binary')} />}
              {bottomPanel === 'diagnostics' && <DiagnosticsPanel />}
              {bottomPanel === 'chat' && (
                <Chat
                  ref={chatRef} project={project} sceneObjects={sceneObjects} physics={physics} worldConfig={worldConfig}
                  renderConfig={renderConfig} compositingConfig={compositingConfig} simulation={simulation}
                  isOverwatchActive={isOverwatchActive} messages={chatMessages} setMessages={setChatMessages}
                  userPrefs={userPrefs} onFileUpdate={handleFileChange}
                  onAddSceneObject={handleAddSceneObject}
                  onUpdateSceneObject={handleUpdateSceneObject} onUpdatePhysics={(u) => setPhysics(p => ({ ...p, ...u }))}
                  onUpdateWorld={(u) => setWorldConfig(p => ({ ...p, ...u }))}
                  onUpdateConfig={(t, u) => { if (t === 'render') setRenderConfig(p => ({ ...p, ...u })); else setCompositingConfig(p => ({ ...p, ...u })); }}
                  onRemoveSceneObject={(id) => setSceneObjects(prev => prev.filter(o => o.id !== id))}
                  onInjectScript={handleInjectScript} onSyncVariableData={handleSyncVariableData}
                  extensions={extensions} projectVersion={projectVersion} onUpdateVersion={setProjectVersion}
                  onTriggerBuild={() => handleBuild('Agent Directive Mutation')}
                  onTriggerPresentation={() => setIsPresenting(true)}
                />
              )}
              {/* GameDashboard is NOT rendered here conditionally to avoid unmounting. It's handled by the persistent layer below. */}
            </div>
          </div>
        )}
      </div>

      {/* Persistent GameDashboard Layer - Never unmounts to preserve WebGL Context */}
      <div
        className={`transition-all duration-500 ease-in-out bg-black ${showDashboard ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none delay-200'}`}
        style={dashboardStyle}
      >
        <GameDashboard
          onBuild={handleBuild} buildInfo={buildInfo} assets={assets} physics={physics} worldConfig={worldConfig} sceneObjects={sceneObjects}
          pipelines={pipelines} renderConfig={renderConfig} compositingConfig={compositingConfig} simulation={simulation}
          onUpdatePhysics={(u) => setPhysics(prev => ({ ...prev, ...u }))} onUpdateWorld={(u) => setWorldConfig(p => ({ ...p, ...u }))}
          onImportAsset={(a) => addLog(`Linked: ${a.name}`, 'success', 'Neural')} onUpdateSceneObject={handleUpdateSceneObject}
          onAddSceneObject={handleAddSceneObject}
          onUpdateConfig={(t, u) => { if (t === 'render') setRenderConfig(p => ({ ...p, ...u })); else setCompositingConfig(p => ({ ...p, ...u })); }}
          onRunAction={(c) => {
            if (c === 'PRESENT_BUILD') setIsPresenting(true);
            else if (c === 'EXIT_PRESENTATION') setIsPresenting(false);
            else if (c === 'RUN_TEST_SUITE') {
              setBottomPanel('chat');
              chatRef.current?.sendMessage("Director, initiate full runtime test suite.");
              addLog(`Command: ${c}`, 'info', 'Director');
            }
            else addLog(`Event: ${c}`, 'info', 'Director');
          }}
          onSendVisualFeedback={(img) => { setBottomPanel('chat'); chatRef.current?.addAnnotatedMessage(img); }}
          sculptHistory={sculptHistory} redoStack={[]} onSculptTerrain={(p) => setSculptHistory(prev => [...prev, { ...p, brushSize: worldConfig.brushSize, brushStrength: worldConfig.brushStrength }])}
          onUndoSculpt={() => setSculptHistory(prev => prev.slice(0, -1))} onRedoSculpt={() => { }} onClearSculpt={() => setSculptHistory([])}
          nodes={nodes} edges={edges} onNeuralUpdate={handleNeuralUpdate} variableData={variableData} engineLogs={engineLogs}
          onAddAsset={(newAsset) => setAssets(prev => [...prev, newAsset])}
          isFullscreen={isPresenting}
        />
      </div>
    </div>
  );
};

export default App;
