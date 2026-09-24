'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, ThreeEvent, useFrame, useThree } from '@react-three/fiber';
import { Edges, Line, OrbitControls, OrthographicCamera } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import * as THREE from 'three';
import { useTheme } from './ThemeProvider';

export type Point3 = [number, number, number];

export interface MockGraphNode {
  id: string;
  size: number;
  position: Point3;
}

export interface MockGraphLink {
  source: string;
  target: string;
}

const DEFAULT_NODES: MockGraphNode[] = [
  { id: '1', size: 5.5, position: [0, 0, 0] },
  { id: '2', size: 4.8, position: [-22, 14, -12] },
  { id: '3', size: 5.0, position: [24, 12, -18] },
  { id: '4', size: 4.6, position: [-26, -18, 16] },
  { id: '5', size: 4.4, position: [22, -16, 20] },
  { id: '6', size: 5.2, position: [0, 26, 18] },
  { id: '7', size: 4.2, position: [-16, 22, 24] },
  { id: '8', size: 4.8, position: [18, -24, -16] },
];

const DEFAULT_LINKS: MockGraphLink[] = [
  { source: '1', target: '2' },
  { source: '1', target: '3' },
  { source: '1', target: '4' },
  { source: '1', target: '5' },
  { source: '1', target: '6' },
  { source: '2', target: '7' },
  { source: '3', target: '6' },
  { source: '3', target: '8' },
  { source: '4', target: '7' },
  { source: '5', target: '8' },
  { source: '6', target: '7' },
];

function TesseractFrame({ extent, color }: { extent: number; color: string }) {
  const segments = useMemo(() => {
    const vertices: Point3[] = [];
    for (const x of [-1, 1]) {
      for (const y of [-1, 1]) {
        for (const z of [-1, 1]) {
          vertices.push([x * extent, y * extent, z * extent]);
        }
      }
    }
    const points: Point3[] = [];
    // Outer and inner hypercube frames
    for (const scale of [1, 0.48]) {
      vertices.forEach((a, i) => {
        vertices.forEach((b, j) => {
          if (j > i && a.filter((v, axis) => v !== b[axis]).length === 1) {
            points.push([a[0] * scale, a[1] * scale, a[2] * scale], [b[0] * scale, b[1] * scale, b[2] * scale]);
          }
        });
      });
    }
    // 4D projection connector edges
    vertices.forEach(p => points.push(p, [p[0] * 0.48, p[1] * 0.48, p[2] * 0.48]));
    return points;
  }, [extent]);

  return <Line points={segments} segments color={color} lineWidth={1} transparent opacity={0.28} raycast={() => null} />;
}

function Synapse({
  start,
  end,
  color,
  highlighted,
  dimmed,
  phase,
  reducedMotion,
}: {
  start: Point3;
  end: Point3;
  color: string;
  highlighted: boolean;
  dimmed: boolean;
  phase: number;
  reducedMotion: boolean;
}) {
  const forward = useRef<THREE.Mesh>(null);
  const backward = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (reducedMotion) return;
    const t = (clock.elapsedTime / (5 + phase * 3) + phase) % 1;
    const move = (mesh: THREE.Mesh | null, progress: number) =>
      mesh?.position.set(
        start[0] + (end[0] - start[0]) * progress,
        start[1] + (end[1] - start[1]) * progress,
        start[2] + (end[2] - start[2]) * progress
      );
    move(forward.current, t);
    move(backward.current, 1 - t);
  });

  return (
    <group>
      <Line
        points={[start, end]}
        color={color}
        lineWidth={highlighted ? 1.7 : 0.8}
        transparent
        opacity={dimmed ? 0.06 : highlighted ? 0.85 : 0.24}
        raycast={() => null}
      />
      {!reducedMotion && (
        <mesh ref={forward} position={start} raycast={() => null}>
          <sphereGeometry args={[highlighted ? 0.55 : 0.35, 8, 6]} />
          <meshBasicMaterial color={color} transparent opacity={dimmed ? 0.08 : highlighted ? 1 : 0.65} depthWrite={false} />
        </mesh>
      )}
      {!reducedMotion && (
        <mesh ref={backward} position={end} raycast={() => null}>
          <sphereGeometry args={[highlighted ? 0.55 : 0.35, 8, 6]} />
          <meshBasicMaterial color={color} transparent opacity={dimmed ? 0.08 : highlighted ? 1 : 0.65} depthWrite={false} />
        </mesh>
      )}
    </group>
  );
}

function CameraController({ extent }: { extent: number }) {
  const get = useThree(state => state.get);
  const size = useThree(state => state.size);
  const controls = useRef<OrbitControlsImpl>(null);

  useEffect(() => {
    const { camera } = get();
    const radius = extent;
    camera.position.set(radius * 3.6, radius * 3.4, radius * 3.8);
    camera.lookAt(0, 0, 0);
    camera.zoom = Math.max(0.1, Math.min(size.width, size.height) / (radius * 4.2));
    camera.updateProjectionMatrix();
    controls.current?.target.set(0, 0, 0);
    controls.current?.update();
  }, [get, size.width, size.height, extent]);

  return (
    <OrbitControls
      ref={controls}
      makeDefault
      autoRotate
      autoRotateSpeed={0.8}
      enableDamping
      dampingFactor={0.08}
      minZoom={0.05}
      maxZoom={20}
    />
  );
}

export default function LandingTesseractGraph() {
  const { resolvedTheme } = useTheme();
  const light = resolvedTheme === 'light';
  const neutralColor = light ? '#52525b' : '#a1a1aa';

  const [hovered, setHovered] = useState<string | null>(null);
  const [reducedMotion, setReducedMotion] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(query.matches);
    update();
    query.addEventListener('change', update);
    return () => {
      query.removeEventListener('change', update);
    };
  }, []);

  const nodes = DEFAULT_NODES;
  const links = DEFAULT_LINKS;
  const extent = 52;

  const nodeMap = useMemo(() => new Map(nodes.map(node => [node.id, node])), [nodes]);

  const connectedIds = useMemo(() => {
    if (!hovered) return new Set<string>();
    return new Set(
      links.flatMap(link =>
        link.source === hovered ? [link.target] : link.target === hovered ? [link.source] : []
      )
    );
  }, [hovered, links]);

  const handlePointerOver = (nodeId: string, event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();
    setHovered(nodeId);
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full flex-1 overflow-hidden bg-[var(--background)] text-[var(--foreground)] select-none"
    >
      <Canvas
        aria-label="Grafo 3D Tesseract"
        className="cursor-grab active:cursor-grabbing w-full h-full"
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: true }}
        onPointerMissed={() => setHovered(null)}
      >
        <OrthographicCamera makeDefault position={[300, 300, 300]} near={0.1} far={1000000} />
        <CameraController extent={extent} />

        <ambientLight intensity={light ? 1.5 : 0.8} />
        <directionalLight position={[100, 200, 150]} intensity={2} />
        <directionalLight position={[-100, -50, -100]} intensity={0.5} />

        {/* 4D Tesseract Outer Wireframe */}
        <TesseractFrame extent={extent} color={neutralColor} />

        {/* Dynamic Synaptic Links */}
        {links.map((link, index) => {
          const sourceNode = nodeMap.get(link.source);
          const targetNode = nodeMap.get(link.target);
          if (!sourceNode || !targetNode) return null;

          const isHighlighted = link.source === hovered || link.target === hovered;
          const isDimmed = hovered !== null && !isHighlighted;

          return (
            <Synapse
              key={`${link.source}-${link.target}`}
              start={sourceNode.position}
              end={targetNode.position}
              color={neutralColor}
              highlighted={isHighlighted}
              dimmed={isDimmed}
              phase={(index * 0.61803398875) % 1}
              reducedMotion={reducedMotion}
            />
          );
        })}

        {/* 3D Cubes (sem nomes nas notas) */}
        {nodes.map(node => {
          const isHovered = hovered === node.id;
          const isRelated = connectedIds.has(node.id);
          const isDimmed = hovered !== null && !isHovered && !isRelated;

          return (
            <mesh
              key={node.id}
              position={node.position}
              onPointerOver={event => handlePointerOver(node.id, event)}
              onPointerOut={() => setHovered(null)}
            >
              <boxGeometry args={[node.size, node.size, node.size]} />
              <meshStandardMaterial
                color={neutralColor}
                emissive={neutralColor}
                emissiveIntensity={isHovered ? 0.4 : isRelated ? 0.18 : 0.04}
                roughness={0.48}
                metalness={0.12}
                transparent={isDimmed}
                opacity={isDimmed ? 0.18 : 1}
              />
              <Edges
                color={isHovered ? (light ? '#000000' : '#ffffff') : neutralColor}
                transparent
                opacity={isDimmed ? 0.15 : 0.65}
                raycast={() => null}
              />
            </mesh>
          );
        })}
      </Canvas>
    </div>
  );
}
