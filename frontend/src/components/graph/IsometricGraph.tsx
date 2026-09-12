'use client';

import { useMemo, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrthographicCamera, Line, Html, OrbitControls } from '@react-three/drei';
import * as d3 from 'd3-force';
import { resolveNodeColor, GraphGroup } from '../GraphView';

interface IsometricGraphProps {
  notas: any[];
  links: any[];
  groups?: GraphGroup[];
  folderColorMap?: Record<string, string>;
  hoveredNodeId?: string | null;
  showLabels?: boolean;
  onHoverNode?: (nota: any | null) => void;
  onOpenNota: (nota: any) => void;
}

import { useTheme } from '../ThemeProvider';

export default function IsometricGraph({
  notas = [],
  links = [],
  groups = [],
  folderColorMap = {},
  hoveredNodeId = null,
  showLabels = true,
  onHoverNode = () => {},
  onOpenNota = () => {},
}: Partial<IsometricGraphProps>) {
  const { resolvedTheme } = useTheme();

  const { nodes, finalLinks, positions } = useMemo(() => {
    // Compute connections count
    const connections: Record<string, number> = {};
    links.forEach(l => {
      connections[l.source] = (connections[l.source] || 0) + 1;
      connections[l.target] = (connections[l.target] || 0) + 1;
    });

    // Map workspace notes to D3 nodes
    const d3Nodes = notas.map((n) => {
      const connCount = connections[n.id] || 0;
      const contentLength = n.conteudo ? n.conteudo.length : 0;
      
      // Height based on content length (min 10, max 80)
      const height = Math.max(10, Math.min(80, 10 + (contentLength / 200)));
      
      // Thickness based on connections (min 8, max 24)
      const thickness = Math.max(8, Math.min(24, 8 + (connCount * 2.5)));

      return {
        id: n.id,
        title: n.titulo || 'Nota',
        height,
        thickness,
        rawNota: n,
      };
    });
    
    // Map links
    const d3Links = links.map((l) => ({
      source: l.source,
      target: l.target,
    }));
    
    // Run D3 Force on 2D plane (X, Y in D3, will map to X, Z in R3F)
    const simulation = d3.forceSimulation(d3Nodes as any)
      .force('charge', d3.forceManyBody().strength(-200))
      .force('link', d3.forceLink(d3Links).id((d: any) => d.id).distance(60))
      .force('center', d3.forceCenter(0, 0))
      .stop();

    // Run simulation to the end instantly
    for (let i = 0; i < 300; ++i) simulation.tick();

    // Snap to grid function
    const GRID_SIZE = 16;
    const snap = (val: number) => Math.round(val / GRID_SIZE) * GRID_SIZE;

    const posMap = new Map();
    d3Nodes.forEach((n: any) => {
      // Save X as X, Y as Z (since Z is depth in 3D)
      posMap.set(n.id, {
        x: snap(n.x || 0),
        z: snap(n.y || 0),
        height: n.height,
        thickness: n.thickness,
        title: n.title,
        color: resolveNodeColor(n.rawNota, groups),
        rawNota: n.rawNota,
      });
    });

    return { nodes: d3Nodes, finalLinks: d3Links, positions: posMap };
  }, [notas, links, groups]);

  if (nodes.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center text-[#8a8a8a] font-medium text-sm">
        Nenhuma nota no grafo.
      </div>
    );
  }

  const isLight = resolvedTheme === 'light';
  const gridColor1 = isLight ? '#e2e8f0' : '#202020';
  const gridColor2 = isLight ? '#f1f5f9' : '#202020';

  return (
    <div className="w-full h-full bg-[#191919]">
      <Canvas>
        <OrthographicCamera makeDefault position={[150, 150, 150]} zoom={6} near={-1000} far={2000} />
        <OrbitControls makeDefault enableDamping dampingFactor={0.1} target={[0, 0, 0]} />

        <ambientLight intensity={isLight ? 0.9 : 0.65} />
        <directionalLight position={[20, 50, 20]} intensity={1.6} />

        <gridHelper args={[1000, 100, gridColor1, gridColor2]} position={[0, -0.5, 0]} />

        {/* Nodes (Isometric Towers) */}
        {nodes.map((node: any) => {
          const pos = positions.get(node.id);
          if (!pos) return null;
          const isHovered = hoveredNodeId === node.id;

          // Only color if an active group matched this note! Otherwise neutral Discord gray
          const hasCustomGroupColor =
            pos.color &&
            pos.color !== '#525252' &&
            pos.color !== '#737373' &&
            pos.color !== '#3a3a3a' &&
            pos.color !== '#80848e';

          const baseColor = hasCustomGroupColor
            ? pos.color
            : isLight
            ? '#cbd5e1'
            : '#3a3a3a';

          return (
            <mesh
              key={node.id}
              position={[pos.x, pos.height / 2, pos.z]}
              onPointerOver={(e) => {
                e.stopPropagation();
                onHoverNode(pos.rawNota);
              }}
              onPointerOut={() => onHoverNode(null)}
              onClick={(e) => {
                e.stopPropagation();
                onOpenNota(pos.rawNota);
              }}
            >
              <boxGeometry args={[pos.thickness, pos.height, pos.thickness]} />
              <meshStandardMaterial
                color={isHovered ? '#20b8cd' : baseColor}
                emissive={isHovered ? '#20b8cd' : baseColor}
                emissiveIntensity={isHovered ? 0.5 : 0.08}
              />

              {/* Discord-styled Label */}
              {(showLabels || isHovered) && (
                <Html position={[0, pos.height / 2 + 3, 0]} center zIndexRange={[100, 0]}>
                  <div
                    className={`px-2 py-0.5 whitespace-nowrap font-sans text-[11px] pointer-events-none transition-colors rounded-[4px] border ${
                      isHovered
                        ? 'bg-[#20b8cd] text-white border-[#20b8cd] shadow-lg font-medium'
                        : 'bg-[#191919]/90 text-[#e8e8e8] border-[#2a2a2a]'
                    }`}
                  >
                    {pos.title}
                  </div>
                </Html>
              )}
            </mesh>
          );
        })}

        {/* Edges */}
        {finalLinks.map((link: any, i) => {
          const sourcePos = positions.get(link.source.id || link.source);
          const targetPos = positions.get(link.target.id || link.target);
          if (!sourcePos || !targetPos) return null;

          const isSourceHovered = hoveredNodeId === (link.source.id || link.source);
          const isTargetHovered = hoveredNodeId === (link.target.id || link.target);
          const isHighlighted = hoveredNodeId ? isSourceHovered || isTargetHovered : false;
          const isDimmed = hoveredNodeId && !isHighlighted;

          const highlightColor = '#20b8cd'; // Synap Blue
          const normalColor = isLight ? '#94a3b8' : '#2a2a2a';
          const dimmedColor = isLight ? '#e2e8f0' : '#202020';

          return (
            <Line
              key={i}
              points={[
                [sourcePos.x, sourcePos.height, sourcePos.z],
                [targetPos.x, targetPos.height, targetPos.z],
              ]}
              color={isHighlighted ? highlightColor : isDimmed ? dimmedColor : normalColor}
              lineWidth={isHighlighted ? 2.5 : 1.2}
              transparent
              opacity={isHighlighted ? 1 : isDimmed ? 0.15 : 0.6}
            />
          );
        })}
      </Canvas>
    </div>
  );
}
