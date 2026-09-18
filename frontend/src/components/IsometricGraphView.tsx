'use client';

import React, { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrthographicCamera, Line, Html, OrbitControls } from '@react-three/drei';
import * as d3 from 'd3-force';
import * as THREE from 'three';
import GraphDrawingPreview from './GraphDrawingPreview';
import { ensureHtmlContent } from './Editor';

interface NoteItem {
  id: string;
  titulo?: string;
  conteudo?: string;
  pastaId?: string | null;
  tipo?: string;
  updatedAt?: string;
  createdAt?: string;
}

interface IsometricGraphViewProps {
  notas: NoteItem[];
  pastas?: any[];
  activeWorkspace?: any;
  onOpenNota: (nota: NoteItem) => void;
}

interface GraphLink {
  source: string;
  target: string;
}

// Sub-component inside Canvas to handle camera reset
function CameraController({ resetTrigger }: { resetTrigger: number }) {
  const { camera } = useThree();
  const controlsRef = useRef<any>(null);

  useEffect(() => {
    if (resetTrigger > 0) {
      camera.position.set(160, 160, 160);
      camera.lookAt(0, 0, 0);
      camera.zoom = 5.5;
      camera.updateProjectionMatrix();
      if (controlsRef.current) {
        controlsRef.current.target.set(0, 0, 0);
        controlsRef.current.update();
      }
    }
  }, [resetTrigger, camera]);

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enableDamping
      dampingFactor={0.08}
      target={[0, 0, 0]}
      maxPolarAngle={Math.PI / 2 - 0.05} // Não deixar passar para debaixo do chão
      minZoom={1.5}
      maxZoom={15}
    />
  );
}

export default function IsometricGraphView({
  notas = [],
  pastas = [],
  onOpenNota,
}: IsometricGraphViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [hoveredScreenCoords, setHoveredScreenCoords] = useState<{
    screenX: number;
    screenY: number;
  } | null>(null);
  const [showLabels, setShowLabels] = useState<boolean>(true);
  const [resetCameraCount, setResetCameraCount] = useState<number>(0);

  // 1. Extração de Conexões (Wikilinks [[...]] e data-note-id)
  const links = useMemo<GraphLink[]>(() => {
    if (!notas || notas.length === 0) return [];

    const titleToIdMap = new Map<string, string>();
    const idSet = new Set<string>();

    notas.forEach((n) => {
      idSet.add(n.id);
      if (n.titulo) {
        titleToIdMap.set(n.titulo.toLowerCase().trim(), n.id);
      }
    });

    const extracted: GraphLink[] = [];

    notas.forEach((sourceNota) => {
      const content = (sourceNota.conteudo || '').toLowerCase();
      if (!content) return;

      // Match data-note-id="..."
      const dataIdRegex = /data-note-id=["']([^"']+)["']/g;
      let m;
      while ((m = dataIdRegex.exec(content)) !== null) {
        const targetId = m[1];
        if (targetId && targetId !== sourceNota.id && idSet.has(targetId)) {
          extracted.push({ source: sourceNota.id, target: targetId });
        }
      }

      // Match [[title]]
      const wikiRegex = /\[\[(.*?)\]\]/g;
      while ((m = wikiRegex.exec(content)) !== null) {
        const targetTitle = m[1].toLowerCase().trim();
        const targetId = titleToIdMap.get(targetTitle);
        if (targetId && targetId !== sourceNota.id) {
          extracted.push({ source: sourceNota.id, target: targetId });
        }
      }
    });

    // Deduplicate
    const unique = new Map<string, GraphLink>();
    extracted.forEach((l) => {
      const key = [l.source, l.target].sort().join('---');
      if (!unique.has(key)) {
        unique.set(key, l);
      }
    });

    return Array.from(unique.values());
  }, [notas]);

  // Contagem de conexões por nota
  const connectionCounts = useMemo<Record<string, number>>(() => {
    const counts: Record<string, number> = {};
    links.forEach((l) => {
      counts[l.source] = (counts[l.source] || 0) + 1;
      counts[l.target] = (counts[l.target] || 0) + 1;
    });
    return counts;
  }, [links]);

  // Nós conectados ao nó atualmente hovered
  const connectedNodeIds = useMemo<Set<string>>(() => {
    const set = new Set<string>();
    if (!hoveredNodeId) return set;
    links.forEach((l) => {
      if (l.source === hoveredNodeId) set.add(l.target);
      if (l.target === hoveredNodeId) set.add(l.source);
    });
    return set;
  }, [hoveredNodeId, links]);

  // 2. Simulação D3 2D Force mapeada para o plano 3D X/Z
  const { nodes, finalLinks, positions } = useMemo(() => {
    if (notas.length === 0) {
      return { nodes: [], finalLinks: [], positions: new Map() };
    }

    const d3Nodes = notas.map((n) => {
      const connCount = connectionCounts[n.id] || 0;
      const contentLength = n.conteudo ? n.conteudo.length : 0;
      const isDrawing = n.tipo === 'desenho';

      // Altura da torre baseada no tamanho do conteúdo (mín 14, máx 75)
      const height = isDrawing
        ? 28
        : Math.max(14, Math.min(75, 14 + contentLength / 180));

      // Espessura da torre baseada na conectividade (mín 12, máx 24)
      const thickness = Math.max(12, Math.min(24, 12 + connCount * 2.2));

      return {
        id: n.id,
        title: n.titulo || (isDrawing ? 'Desenho sem título' : 'Nota sem título'),
        height,
        thickness,
        rawNota: n,
        isDrawing,
      };
    });

    const d3Links = links.map((l) => ({
      source: l.source,
      target: l.target,
    }));

    // Simulação com boa dispersão
    const simulation = d3
      .forceSimulation(d3Nodes as any)
      .force('charge', d3.forceManyBody().strength(-360))
      .force('link', d3.forceLink(d3Links).id((d: any) => d.id).distance(80))
      .force('center', d3.forceCenter(0, 0))
      .force('collision', d3.forceCollide().radius((d: any) => d.thickness * 1.6))
      .stop();

    for (let i = 0; i < 300; ++i) simulation.tick();

    // Snap to grid
    const GRID_SIZE = 12;
    const snap = (val: number) => Math.round(val / GRID_SIZE) * GRID_SIZE;

    const posMap = new Map();
    d3Nodes.forEach((n: any) => {
      posMap.set(n.id, {
        x: snap(n.x || 0),
        z: snap(n.y || 0),
        height: n.height,
        thickness: n.thickness,
        title: n.title,
        rawNota: n.rawNota,
        isDrawing: n.isDrawing,
      });
    });

    return { nodes: d3Nodes, finalLinks: d3Links, positions: posMap };
  }, [notas, links, connectionCounts]);

  const hoveredNota = useMemo(() => {
    if (!hoveredNodeId) return null;
    return notas.find((n) => n.id === hoveredNodeId) || null;
  }, [hoveredNodeId, notas]);

  const handlePointerOver = useCallback((rawNota: NoteItem, e: any) => {
    e.stopPropagation();
    setHoveredNodeId(rawNota.id);
    if (e.nativeEvent) {
      setHoveredScreenCoords({
        screenX: e.nativeEvent.clientX,
        screenY: e.nativeEvent.clientY,
      });
    }
  }, []);

  const handlePointerMove = useCallback((e: any) => {
    if (e.nativeEvent) {
      setHoveredScreenCoords({
        screenX: e.nativeEvent.clientX,
        screenY: e.nativeEvent.clientY,
      });
    }
  }, []);

  const handlePointerOut = useCallback(() => {
    setHoveredNodeId(null);
  }, []);

  return (
    <div
      ref={containerRef}
      className="w-full h-full relative overflow-hidden bg-[#141414] select-none flex-1 font-sansation"
    >
      {/* 3D WebGL Canvas */}
      <Canvas
        className="w-full h-full cursor-grab active:cursor-grabbing"
        gl={{ antialias: true, alpha: false }}
        onPointerMissed={() => setHoveredNodeId(null)}
      >
        <color attach="background" args={['#141414']} />
        <OrthographicCamera
          makeDefault
          position={[160, 160, 160]}
          zoom={5.5}
          near={-1200}
          far={3000}
        />
        <CameraController resetTrigger={resetCameraCount} />

        {/* Iluminação Minimalista Técnica */}
        <ambientLight intensity={0.7} />
        <directionalLight position={[40, 80, 40]} intensity={1.8} />
        <directionalLight position={[-40, 30, -40]} intensity={0.4} color="#71717a" />

        {/* Grade Isométrica no Chão */}
        <gridHelper
          args={[1400, 100, '#27272a', '#18181b']}
          position={[0, -0.2, 0]}
        />

        {/* 3D Nodes (Torres Isométricas Geométricas) */}
        {nodes.map((node: any) => {
          const pos = positions.get(node.id);
          if (!pos) return null;

          const isHovered = hoveredNodeId === node.id;
          const isConnected = connectedNodeIds.has(node.id);
          const isDimmed = hoveredNodeId !== null && !isHovered && !isConnected;

          // Cores padrão Geist
          const baseColor = isHovered
            ? '#ffffff'
            : isConnected
            ? '#e4e4e7'
            : '#52525b';

          return (
            <mesh
              key={node.id}
              position={[pos.x, pos.height / 2, pos.z]}
              onPointerOver={(e) => handlePointerOver(pos.rawNota, e)}
              onPointerMove={handlePointerMove}
              onPointerOut={handlePointerOut}
              onClick={(e) => {
                e.stopPropagation();
                onOpenNota(pos.rawNota);
              }}
            >
              <boxGeometry args={[pos.thickness, pos.height, pos.thickness]} />
              <meshStandardMaterial
                color={baseColor}
                emissive={isHovered ? '#ffffff' : isConnected ? '#a1a1aa' : '#27272a'}
                emissiveIntensity={isHovered ? 0.6 : isConnected ? 0.2 : 0.05}
                roughness={0.25}
                metalness={0.15}
                transparent={isDimmed}
                opacity={isDimmed ? 0.25 : 1}
              />

              {/* Rótulo Flutuante no Topo da Torre */}
              {(showLabels || isHovered) && (
                <Html
                  position={[0, pos.height / 2 + 4, 0]}
                  center
                  zIndexRange={[50, 0]}
                >
                  <div
                    className={`px-2 py-0.5 whitespace-nowrap font-sansation text-[10px] tracking-wide pointer-events-none transition-all rounded-none border select-none ${
                      isHovered
                        ? 'bg-white text-black font-bold border-white shadow-[0_0_12px_rgba(255,255,255,0.4)]'
                        : isConnected
                        ? 'bg-[#181818]/95 text-white border-white/30 font-medium'
                        : 'bg-[#141414]/90 text-zinc-400 border-white/10'
                    }`}
                  >
                    {pos.title}
                  </div>
                </Html>
              )}
            </mesh>
          );
        })}

        {/* 3D Conexões (Linhas Retas Tridimensionais) */}
        {finalLinks.map((link: any, i) => {
          const sourceId = link.source.id || link.source;
          const targetId = link.target.id || link.target;
          const sourcePos = positions.get(sourceId);
          const targetPos = positions.get(targetId);
          if (!sourcePos || !targetPos) return null;

          const isSourceHovered = hoveredNodeId === sourceId;
          const isTargetHovered = hoveredNodeId === targetId;
          const isHighlighted = isSourceHovered || isTargetHovered;
          const isDimmed = hoveredNodeId !== null && !isHighlighted;

          return (
            <Line
              key={i}
              points={[
                [sourcePos.x, sourcePos.height, sourcePos.z],
                [targetPos.x, targetPos.height, targetPos.z],
              ]}
              color={isHighlighted ? '#ffffff' : isDimmed ? '#27272a' : '#52525b'}
              lineWidth={isHighlighted ? 2.4 : 1.2}
              transparent
              opacity={isHighlighted ? 1 : isDimmed ? 0.08 : 0.4}
            />
          );
        })}
      </Canvas>

      {/* Controles Flutuantes do Grafo Isométrico (HUD no canto inferior direito) */}
      <div className="absolute bottom-5 right-6 z-30 flex items-center gap-2 select-none">
        <button
          type="button"
          onClick={() => setShowLabels((prev) => !prev)}
          className={`h-7 px-2.5 text-xs font-medium rounded-none border transition-colors cursor-pointer flex items-center gap-1.5 ${
            showLabels
              ? 'bg-white/10 text-white border-white/20 hover:bg-white/15'
              : 'bg-[#181818] text-zinc-400 border-white/10 hover:text-white hover:bg-white/5'
          }`}
          aria-label="Alternar títulos"
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M4 7V4h16v3" />
            <path d="M9 20h6" />
            <path d="M12 4v16" />
          </svg>
          <span>{showLabels ? 'Títulos Ativos' : 'Títulos Ocultos'}</span>
        </button>

        <button
          type="button"
          onClick={() => setResetCameraCount((c) => c + 1)}
          className="h-7 px-2.5 text-xs font-medium rounded-none bg-[#181818] border border-white/10 text-zinc-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer flex items-center gap-1.5"
          aria-label="Resetar ângulo 3D"
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
            <path d="M3 3v5h5" />
          </svg>
          <span>Resetar Ângulo</span>
        </button>
      </div>

      {/* Prévia Grande Completa da Nota / Desenho (Renderizada no topo da tela com o mesmo estilo) */}
      {hoveredNota && hoveredScreenCoords && (() => {
        const containerW = containerRef.current?.clientWidth || 1000;
        const containerH = containerRef.current?.clientHeight || 700;
        const isRightHalf = hoveredScreenCoords.screenX > containerW / 2;

        const PREVIEW_WIDTH = 440;
        const PREVIEW_MAX_HEIGHT = 480;

        const leftPos = isRightHalf
          ? Math.max(16, hoveredScreenCoords.screenX - PREVIEW_WIDTH - 24)
          : Math.min(containerW - PREVIEW_WIDTH - 16, hoveredScreenCoords.screenX + 24);

        const topPos = Math.max(
          16,
          Math.min(containerH - PREVIEW_MAX_HEIGHT - 16, hoveredScreenCoords.screenY - PREVIEW_MAX_HEIGHT / 2)
        );

        const isDrawing = hoveredNota.tipo === 'desenho';
        const connCount = connectionCounts[hoveredNota.id] || 0;
        const folderName = pastas?.find((p) => p.id === hoveredNota.pastaId)?.nome;

        return (
          <div
            style={{
              left: `${leftPos}px`,
              top: `${topPos}px`,
              width: `${PREVIEW_WIDTH}px`,
            }}
            className="absolute bg-[#181818] border border-white/20 p-5 shadow-2xl pointer-events-none z-50 rounded-none animate-in fade-in zoom-in-95 duration-100 font-sansation text-left flex flex-col gap-3"
          >
            {/* Cabeçalho: Tipo, Pasta e Conexões */}
            <div className="flex items-center justify-between gap-2 border-b border-white/5 pb-2.5">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-zinc-400">
                  {isDrawing ? 'DESENHO' : 'NOTA'}
                </span>
                {folderName && (
                  <>
                    <span className="text-zinc-600">/</span>
                    <span className="text-[10px] font-mono text-zinc-400 truncate max-w-[160px]">
                      {folderName}
                    </span>
                  </>
                )}
              </div>

              {connCount > 0 && (
                <span className="text-[10px] font-mono px-1.5 py-0.5 bg-white/5 border border-white/10 text-zinc-400">
                  {connCount} {connCount === 1 ? 'conexão' : 'conexões'}
                </span>
              )}
            </div>

            {/* Título da Nota */}
            <h3 className="font-bold text-lg sm:text-xl text-white tracking-tight leading-snug">
              {hoveredNota.titulo || 'Sem Título'}
            </h3>

            {/* Visualização Completa do Conteúdo da Nota ou Canvas do Desenho */}
            <div className="w-full">
              {isDrawing ? (
                <div className="w-full mt-1">
                  <GraphDrawingPreview
                    conteudoJson={hoveredNota.conteudo}
                    height={230}
                    className="w-full h-[230px] border border-white/10 rounded-none bg-[#121212]"
                  />
                </div>
              ) : hoveredNota.conteudo && hoveredNota.conteudo.trim() ? (
                <div className="max-h-[260px] overflow-y-auto no-scrollbar pr-1 relative">
                  <div
                    className="notion-editor text-[13px] leading-relaxed text-zinc-300 select-none font-sansation"
                    dangerouslySetInnerHTML={{ __html: ensureHtmlContent(hoveredNota.conteudo) }}
                    style={{ wordBreak: 'break-word' }}
                  />
                  {/* Fade sutil na base */}
                  <div className="sticky bottom-0 inset-x-0 h-6 bg-gradient-to-t from-[#181818] to-transparent pointer-events-none" />
                </div>
              ) : (
                <p className="text-xs text-zinc-500 italic py-6 text-center">
                  Nota sem conteúdo textual.
                </p>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
