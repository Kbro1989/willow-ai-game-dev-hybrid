
import { FileNode } from './types';

export const initialFiles: FileNode[] = [
  {
    name: 'src',
    type: 'dir',
    path: 'src',
    children: [
      {
        name: 'App.tsx',
        type: 'file',
        path: 'src/App.tsx',
        content: `import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Sky, Environment, ContactShadows, Float } from '@react-three/drei';
import Scene from './components/Scene';
import { CONFIG } from './config/game_config';

const App = () => {
  return (
    <div className="h-full w-full bg-[#050a15]">
      <Canvas 
        shadows 
        camera={{ position: [10, 10, 10], fov: 45 }}
        gl={{ antialias: true, stencil: false, depth: true }}
      >
        <color attach="background" args={['#050a15']} />
        <fog attach="fog" args={['#050a15', 10, 50]} />
        
        <Suspense fallback={null}>
          <Sky 
            sunPosition={[100, CONFIG.sunHeight || 20, 100]} 
            turbidity={0.1} 
            rayleigh={0.5} 
          />
          <ambientLight intensity={CONFIG.ambientIntensity || 0.4} />
          <spotLight 
            position={[10, 20, 10]} 
            angle={0.15} 
            penumbra={1} 
            intensity={2} 
            castShadow 
            shadow-mapSize={[2048, 2048]}
          />
          
          <Scene />
          
          <ContactShadows 
            position={[0, -0.01, 0]} 
            opacity={0.4} 
            scale={40} 
            blur={2} 
            far={10} 
          />
          <OrbitControls makeDefault minPolarAngle={0} maxPolarAngle={Math.PI / 1.75} />
          <Environment preset="night" />
        </Suspense>
      </Canvas>
    </div>
  );
};

export default App;`
      },
      {
        name: 'components',
        type: 'dir',
        path: 'src/components',
        children: [
          {
            name: 'Scene.tsx',
            type: 'file',
            path: 'src/components/Scene.tsx',
            content: `import React from 'react';
import { useFrame } from '@react-three/fiber';
import { CONFIG } from '../config/game_config';

const Scene = () => {
  const meshRef = React.useRef<any>();

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += (CONFIG.rotationSpeed || 0.01);
      meshRef.current.position.y = Math.sin(state.clock.elapsedTime) * 0.2;
    }
  });

  return (
    <group>
      <mesh ref={meshRef} castShadow position={[0, 1, 0]}>
        <boxGeometry args={[2, 2, 2]} />
        <meshStandardMaterial 
          color={CONFIG.primaryColor || "#00f2ff"} 
          emissive={CONFIG.primaryColor || "#00f2ff"} 
          emissiveIntensity={0.5}
          roughness={0.1}
          metalness={0.8}
        />
      </mesh>
      
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[100, 100]} />
        <meshStandardMaterial color="#0a1222" roughness={0.5} metalness={0.2} />
      </mesh>
    </group>
  );
};

export default Scene;`
          }
        ]
      },
      {
        name: 'config',
        type: 'dir',
        path: 'src/config',
        children: [
          {
            name: 'game_config.ts',
            type: 'file',
            path: 'src/config/game_config.ts',
            content: `export const CONFIG = {
  primaryColor: "#00f2ff",
  rotationSpeed: 0.01,
  sunHeight: 20,
  ambientIntensity: 0.4,
  gravity: -9.81,
  playerSpeed: 5.0
};`
          }
        ]
      },
      {
        name: 'behaviors',
        type: 'dir',
        path: 'src/behaviors',
        children: []
      }
    ]
  },
  {
    name: 'package.json',
    type: 'file',
    path: 'package.json',
    content: `{
  "name": "willow-pro-symphony",
  "version": "2.0.0",
  "private": true,
  "dependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "three": "^0.170.0",
    "@react-three/fiber": "^9.0.0",
    "@react-three/drei": "^9.120.0",
    "lucide-react": "^0.460.0"
  }
}`
  }
];
