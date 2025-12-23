/**
 * RSMV Model Browser - Browse, view, and understand RuneScape 3D models
 * Integrates with RSMV (RuneApps Model Viewer) for cache access
 */

import React, { useState, useEffect, useRef, useMemo, useCallback, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Environment, PerspectiveCamera, Html, Float, Sky } from '@react-three/drei';
import * as THREE from 'three';

// =============================================================================
// TYPES
// =============================================================================

export type ModelCategory = 'items' | 'npcs' | 'objects' | 'models' | 'animations';

export interface RSMVModelEntry {
  id: number;
  name: string;
  category: ModelCategory;
  thumbnailUrl?: string;
  vertexCount?: number;
  materialCount?: number;
  boneCount?: number;
  description?: string;
  tags?: string[];
  examine?: string;
}

export interface RSMVBrowserProps {
  onSelectModel?: (model: RSMVModelEntry) => void;
  onImportModel?: (model: RSMVModelEntry) => void;
  initialCategory?: ModelCategory;
}

// =============================================================================
// MOCK DATA (Replace with RSMV cache loading in production)
// =============================================================================

const MOCK_MODELS: RSMVModelEntry[] = [
  // Items
  { id: 4151, name: 'Abyssal whip', category: 'items', vertexCount: 342, materialCount: 2, tags: ['weapon', 'melee', 'slayer'], examine: 'A weapon from the abyss.' },
  { id: 11694, name: 'Armadyl godsword', category: 'items', vertexCount: 1024, materialCount: 3, tags: ['weapon', 'melee', 'godsword'], examine: 'A very powerful godsword.' },
  { id: 1050, name: 'Santa hat', category: 'items', vertexCount: 128, materialCount: 1, tags: ['holiday', 'rare'], examine: 'Ho ho ho!' },
  { id: 11286, name: 'Draconic visage', category: 'items', vertexCount: 512, materialCount: 2, tags: ['rare', 'dragon'], examine: 'This could be attached to an anti-dragon shield.' },
  { id: 995, name: 'Coins', category: 'items', vertexCount: 64, materialCount: 1, tags: ['currency'], examine: 'Lovely money!' },
  { id: 6585, name: 'Amulet of fury', category: 'items', vertexCount: 256, materialCount: 2, tags: ['jewelry', 'amulet'], examine: 'A dragonstone amulet with fury enchantment.' },
  { id: 11832, name: 'Bandos chestplate', category: 'items', vertexCount: 768, materialCount: 3, tags: ['armor', 'melee', 'bandos'], examine: 'Bandos blessed this armor.' },
  { id: 4708, name: 'Ahrim\'s hood', category: 'items', vertexCount: 384, materialCount: 2, tags: ['armor', 'magic', 'barrows'], examine: 'A magic hood from Barrows.' },

  // NPCs
  { id: 2881, name: 'Dagannoth Supreme', category: 'npcs', vertexCount: 2048, materialCount: 4, boneCount: 32, tags: ['boss', 'slayer'], description: 'The magic-based Dagannoth King.' },
  { id: 494, name: 'King Black Dragon', category: 'npcs', vertexCount: 4096, materialCount: 6, boneCount: 48, tags: ['boss', 'dragon'], description: 'A fearsome three-headed dragon.' },
  { id: 2042, name: 'Zulrah', category: 'npcs', vertexCount: 3072, materialCount: 5, boneCount: 24, tags: ['boss', 'snake'], description: 'The solo boss snake.' },
  { id: 3127, name: 'TzTok-Jad', category: 'npcs', vertexCount: 5120, materialCount: 8, boneCount: 56, tags: ['boss', 'tzhaar'], description: 'The fire cape guardian.' },
  { id: 319, name: 'Corporeal Beast', category: 'npcs', vertexCount: 6144, materialCount: 10, boneCount: 64, tags: ['boss', 'spirit'], description: 'A powerful spirit beast.' },
  { id: 2215, name: 'General Graardor', category: 'npcs', vertexCount: 2560, materialCount: 5, boneCount: 40, tags: ['boss', 'bandos', 'gwd'], description: 'The Bandos general.' },

  // Objects
  { id: 10063, name: 'Crystal tree', category: 'objects', vertexCount: 1536, materialCount: 3, tags: ['woodcutting', 'crystal'], description: 'A magical crystalline tree.' },
  { id: 11744, name: 'Bank booth', category: 'objects', vertexCount: 512, materialCount: 2, tags: ['banking', 'furniture'], description: 'Access your bank here.' },
  { id: 2883, name: 'Altar', category: 'objects', vertexCount: 384, materialCount: 2, tags: ['prayer', 'church'], description: 'An altar for recharging prayer.' },
  { id: 11758, name: 'Grand Exchange booth', category: 'objects', vertexCount: 768, materialCount: 3, tags: ['trading', 'ge'], description: 'Buy and sell items here.' },
  { id: 8389, name: 'Portal', category: 'objects', vertexCount: 256, materialCount: 2, tags: ['teleport', 'magic'], description: 'A magical portal.' },

  // Raw Models
  { id: 1000, name: 'Model 1000', category: 'models', vertexCount: 256, materialCount: 1, tags: ['raw'] },
  { id: 2500, name: 'Model 2500', category: 'models', vertexCount: 512, materialCount: 2, tags: ['raw'] },
  { id: 5000, name: 'Model 5000', category: 'models', vertexCount: 1024, materialCount: 3, tags: ['raw'] },
];

// =============================================================================
// 3D PREVIEW COMPONENT
// =============================================================================

const ModelPreview: React.FC<{ model: RSMVModelEntry | null }> = ({ model }) => {
  const meshRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.01;
    }
  });

  if (!model) {
    return (
      <Html center>
        <div className="text-cyan-500 text-xs font-bold uppercase tracking-widest animate-pulse">
          Select a model
        </div>
      </Html>
    );
  }

  // Placeholder geometry - in production, load actual RSMV model
  const geometry = useMemo(() => {
    const geo = new THREE.IcosahedronGeometry(2, Math.min(Math.floor((model.vertexCount || 100) / 100), 4));
    return geo;
  }, [model.id, model.vertexCount]);

  const color = useMemo(() => {
    switch (model.category) {
      case 'items': return '#00f2ff';
      case 'npcs': return '#ff6b6b';
      case 'objects': return '#10b981';
      case 'models': return '#a855f7';
      default: return '#ffffff';
    }
  }, [model.category]);

  return (
    <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
      <group ref={meshRef}>
        <mesh geometry={geometry}>
          <meshStandardMaterial
            color={color}
            metalness={0.6}
            roughness={0.3}
            emissive={color}
            emissiveIntensity={0.1}
          />
        </mesh>
        <mesh geometry={geometry} scale={1.05}>
          <meshBasicMaterial color={color} transparent opacity={0.1} wireframe />
        </mesh>
      </group>
    </Float>
  );
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

const RSMVBrowser: React.FC<RSMVBrowserProps> = ({
  onSelectModel,
  onImportModel,
  initialCategory = 'items'
}) => {
  const [category, setCategory] = useState<ModelCategory>(initialCategory);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedModel, setSelectedModel] = useState<RSMVModelEntry | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isLoading, setIsLoading] = useState(false);
  const [models, setModels] = useState<RSMVModelEntry[]>(MOCK_MODELS);

  // Filter models
  const filteredModels = useMemo(() => {
    return models.filter(m => {
      const matchesCategory = m.category === category;
      const matchesSearch = !searchQuery ||
        m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.id.toString().includes(searchQuery) ||
        m.tags?.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesCategory && matchesSearch;
    });
  }, [models, category, searchQuery]);

  const handleSelectModel = (model: RSMVModelEntry) => {
    setSelectedModel(model);
    onSelectModel?.(model);
  };

  const handleImportModel = () => {
    if (selectedModel) {
      onImportModel?.(selectedModel);
    }
  };

  const categories: { key: ModelCategory; label: string; icon: string }[] = [
    { key: 'items', label: 'Items', icon: '🎒' },
    { key: 'npcs', label: 'NPCs', icon: '👹' },
    { key: 'objects', label: 'Objects', icon: '🏠' },
    { key: 'models', label: 'Raw Models', icon: '📦' },
  ];

  return (
    <div className="flex h-full bg-[#050a15] text-white">
      {/* Sidebar - Categories & Search */}
      <div className="w-72 border-r border-cyan-900/30 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-cyan-900/30 bg-gradient-to-r from-cyan-950/50 to-transparent">
          <h2 className="text-lg font-black uppercase tracking-widest text-cyan-400 flex items-center gap-2">
            <span>🗃️</span> RSMV Browser
          </h2>
          <p className="text-[9px] text-slate-500 uppercase tracking-wider mt-1">RuneScape Model Viewer</p>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-cyan-900/30">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, ID, or tag..."
              className="w-full bg-[#0a1222] border border-cyan-900/40 rounded-xl px-4 py-3 text-xs text-cyan-50 placeholder-slate-600 outline-none focus:border-cyan-500 transition-all"
            />
            <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        {/* Categories */}
        <div className="p-4 space-y-2">
          <h3 className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-3">Categories</h3>
          {categories.map(cat => (
            <button
              key={cat.key}
              onClick={() => setCategory(cat.key)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all ${category === cat.key
                  ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-500/20'
                  : 'bg-cyan-950/30 text-slate-400 hover:bg-cyan-950/50 hover:text-cyan-400'
                }`}
            >
              <span className="text-lg">{cat.icon}</span>
              <span className="text-xs font-bold uppercase tracking-wider">{cat.label}</span>
              <span className="ml-auto text-[9px] bg-black/30 px-2 py-1 rounded-full">
                {models.filter(m => m.category === cat.key).length}
              </span>
            </button>
          ))}
        </div>

        {/* Model List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2 no-scrollbar border-t border-cyan-900/30">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[9px] font-black uppercase tracking-widest text-slate-500">
              Results ({filteredModels.length})
            </h3>
            <div className="flex gap-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-lg ${viewMode === 'grid' ? 'bg-cyan-600 text-white' : 'text-slate-500 hover:text-cyan-400'}`}
              >
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 16 16"><path d="M1 2.5A1.5 1.5 0 0 1 2.5 1h3A1.5 1.5 0 0 1 7 2.5v3A1.5 1.5 0 0 1 5.5 7h-3A1.5 1.5 0 0 1 1 5.5v-3zm8 0A1.5 1.5 0 0 1 10.5 1h3A1.5 1.5 0 0 1 15 2.5v3A1.5 1.5 0 0 1 13.5 7h-3A1.5 1.5 0 0 1 9 5.5v-3zm-8 8A1.5 1.5 0 0 1 2.5 9h3A1.5 1.5 0 0 1 7 10.5v3A1.5 1.5 0 0 1 5.5 15h-3A1.5 1.5 0 0 1 1 13.5v-3zm8 0A1.5 1.5 0 0 1 10.5 9h3a1.5 1.5 0 0 1 1.5 1.5v3a1.5 1.5 0 0 1-1.5 1.5h-3A1.5 1.5 0 0 1 9 13.5v-3z" /></svg>
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-lg ${viewMode === 'list' ? 'bg-cyan-600 text-white' : 'text-slate-500 hover:text-cyan-400'}`}
              >
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 16 16"><path d="M2.5 12a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5z" /></svg>
              </button>
            </div>
          </div>

          {viewMode === 'grid' ? (
            <div className="grid grid-cols-2 gap-2">
              {filteredModels.map(model => (
                <button
                  key={`${model.category}-${model.id}`}
                  onClick={() => handleSelectModel(model)}
                  className={`p-3 rounded-xl text-left transition-all border ${selectedModel?.id === model.id && selectedModel?.category === model.category
                      ? 'border-cyan-500 bg-cyan-950/50 shadow-lg shadow-cyan-500/10'
                      : 'border-cyan-900/30 bg-cyan-950/20 hover:border-cyan-700/50'
                    }`}
                >
                  <div className="text-[9px] text-cyan-600 font-mono mb-1">#{model.id}</div>
                  <div className="text-[10px] font-bold text-cyan-50 truncate">{model.name}</div>
                </button>
              ))}
            </div>
          ) : (
            <div className="space-y-1">
              {filteredModels.map(model => (
                <button
                  key={`${model.category}-${model.id}`}
                  onClick={() => handleSelectModel(model)}
                  className={`w-full p-3 rounded-xl text-left transition-all flex items-center gap-3 border ${selectedModel?.id === model.id && selectedModel?.category === model.category
                      ? 'border-cyan-500 bg-cyan-950/50'
                      : 'border-transparent hover:bg-cyan-950/30'
                    }`}
                >
                  <div className="text-[9px] text-cyan-600 font-mono w-12">#{model.id}</div>
                  <div className="text-[10px] font-bold text-cyan-50 flex-1 truncate">{model.name}</div>
                  <div className="text-[8px] text-slate-500">{model.vertexCount}v</div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main Content - 3D Preview */}
      <div className="flex-1 flex flex-col">
        {/* 3D Viewer */}
        <div className="flex-1 relative">
          <Canvas shadows>
            <PerspectiveCamera makeDefault position={[5, 5, 5]} fov={50} />
            <OrbitControls makeDefault enableDamping dampingFactor={0.05} />
            <Environment preset="night" />
            <ambientLight intensity={0.3} />
            <pointLight position={[10, 10, 10]} intensity={1} castShadow />
            <spotLight position={[-5, 5, 5]} angle={0.5} intensity={0.5} penumbra={1} />

            <Suspense fallback={null}>
              <ModelPreview model={selectedModel} />
            </Suspense>

            <gridHelper args={[20, 20, '#00f2ff', '#0a1222']} />
          </Canvas>

          {/* Overlay Controls */}
          <div className="absolute top-4 right-4 flex flex-col gap-2">
            <button className="p-3 bg-[#0a1222]/90 backdrop-blur-lg border border-cyan-900/30 rounded-xl text-cyan-400 hover:bg-cyan-600 hover:text-white transition-all" title="Reset View">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
            </button>
            <button className="p-3 bg-[#0a1222]/90 backdrop-blur-lg border border-cyan-900/30 rounded-xl text-cyan-400 hover:bg-cyan-600 hover:text-white transition-all" title="Wireframe">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" /></svg>
            </button>
          </div>
        </div>

        {/* Model Info Panel */}
        <div className="h-64 border-t border-cyan-900/30 bg-[#0a1222]/50 p-6 overflow-y-auto no-scrollbar">
          {selectedModel ? (
            <div className="grid grid-cols-2 gap-6">
              {/* Left - Details */}
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-black text-cyan-50">{selectedModel.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[9px] bg-cyan-950 px-2 py-1 rounded text-cyan-400 font-bold uppercase">{selectedModel.category}</span>
                    <span className="text-[9px] text-cyan-600 font-mono">ID: {selectedModel.id}</span>
                  </div>
                </div>

                {selectedModel.examine && (
                  <p className="text-sm text-slate-400 italic">"{selectedModel.examine}"</p>
                )}

                {selectedModel.description && (
                  <p className="text-xs text-slate-500">{selectedModel.description}</p>
                )}

                {selectedModel.tags && selectedModel.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {selectedModel.tags.map(tag => (
                      <span key={tag} className="text-[8px] bg-cyan-950/50 border border-cyan-900/30 px-2 py-1 rounded-full text-cyan-500 uppercase">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Right - Metrics */}
              <div className="space-y-3">
                <h4 className="text-[9px] font-black uppercase tracking-widest text-slate-500">Model Metrics</h4>
                <div className="grid grid-cols-3 gap-2">
                  <div className="p-3 bg-cyan-950/30 rounded-xl border border-cyan-900/20 text-center">
                    <div className="text-xl font-black text-cyan-400">{selectedModel.vertexCount?.toLocaleString() || '?'}</div>
                    <div className="text-[8px] text-slate-500 uppercase tracking-wider">Vertices</div>
                  </div>
                  <div className="p-3 bg-cyan-950/30 rounded-xl border border-cyan-900/20 text-center">
                    <div className="text-xl font-black text-emerald-400">{selectedModel.materialCount || '?'}</div>
                    <div className="text-[8px] text-slate-500 uppercase tracking-wider">Materials</div>
                  </div>
                  {selectedModel.boneCount !== undefined && (
                    <div className="p-3 bg-cyan-950/30 rounded-xl border border-cyan-900/20 text-center">
                      <div className="text-xl font-black text-purple-400">{selectedModel.boneCount}</div>
                      <div className="text-[8px] text-slate-500 uppercase tracking-wider">Bones</div>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={handleImportModel}
                    className="flex-1 py-3 bg-gradient-to-r from-cyan-600 to-emerald-600 hover:from-cyan-500 hover:to-emerald-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-cyan-500/20"
                  >
                    📥 Import to Scene
                  </button>
                  <button className="px-4 py-3 bg-cyan-950/50 hover:bg-cyan-950 text-cyan-400 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border border-cyan-900/30">
                    📋 Copy ID
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-slate-500 text-sm">
              Select a model to view details
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RSMVBrowser;
