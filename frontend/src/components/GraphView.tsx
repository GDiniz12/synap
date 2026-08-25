'use client';

import React, { useEffect, useRef, useState, useMemo } from 'react';
import GraphDrawingPreview from './GraphDrawingPreview';

export interface GraphNode {
  id: string;
  title: string;
  folderId: string | null;
  folderName: string;
  color: string;
  connectionsCount: number;
  previewText: string;
  rawNota?: any;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
}

export interface GraphLink {
  source: string;
  target: string;
}

interface Particle {
  sourceId: string;
  targetId: string;
  progress: number;
  speed: number;
  color: string;
}

interface GraphViewProps {
  workspace: any;
  pastas: any[];
  notas: any[];
  onOpenNota: (nota: any) => void;
  onClose?: () => void;
}

const FOLDER_COLORS = [
  '#3b82f6', // blue
  '#10b981', // emerald
  '#f59e0b', // amber
  '#ec4899', // pink
  '#8b5cf6', // violet
  '#06b6d4', // cyan
  '#f97316', // orange
  '#14b8a6', // teal
  '#a855f7', // purple
];

export default function GraphView({
  workspace,
  pastas,
  notas,
  onOpenNota,
  onClose,
}: GraphViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFolderFilter, setSelectedFolderFilter] = useState<string>('all');
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);

  // Simulation physics parameters
  const [repulsionForce, setRepulsionForce] = useState(300);
  const [linkDistance, setLinkDistance] = useState(90);
  const [synapseParticlesEnabled, setSynapseParticlesEnabled] = useState(true);

  // Pan & Zoom
  const [transform, setTransform] = useState({ x: 0, y: 0, k: 1 });
  const isPanningRef = useRef(false);
  const startPanRef = useRef({ x: 0, y: 0 });
  const draggedNodeRef = useRef<GraphNode | null>(null);

  // Map folderId to a distinct palette color
  const folderColorMap = useMemo(() => {
    const map: Record<string, string> = { root: '#888888' };
    pastas.forEach((p, idx) => {
      map[p.id] = FOLDER_COLORS[idx % FOLDER_COLORS.length];
    });
    return map;
  }, [pastas]);

  // Extract Links from HTML content of notes
  const links = useMemo<GraphLink[]>(() => {
    const extractedLinks: GraphLink[] = [];
    const noteIdSet = new Set(notas.map((n) => n.id));
    const titleToIdMap = new Map(notas.map((n) => [n.titulo.toLowerCase().trim(), n.id]));

    notas.forEach((sourceNota) => {
      const content = sourceNota.conteudo || '';

      // Match data-note-id="..."
      const dataIdRegex = /data-note-id=["']([^"']+)["']/g;
      let m;
      while ((m = dataIdRegex.exec(content)) !== null) {
        const targetId = m[1];
        if (targetId && targetId !== sourceNota.id && noteIdSet.has(targetId)) {
          extractedLinks.push({ source: sourceNota.id, target: targetId });
        }
      }

      // Match [[Title]] wikilinks
      const wikiRegex = /\[\[(.*?)\]\]/g;
      while ((m = wikiRegex.exec(content)) !== null) {
        const targetTitle = m[1].toLowerCase().trim();
        const targetId = titleToIdMap.get(targetTitle);
        if (targetId && targetId !== sourceNota.id) {
          extractedLinks.push({ source: sourceNota.id, target: targetId });
        }
      }
    });

    // Remove duplicates
    const unique = new Map<string, GraphLink>();
    extractedLinks.forEach((l) => {
      const key = `${l.source}->${l.target}`;
      unique.set(key, l);
    });
    return Array.from(unique.values());
  }, [notas]);

  // Connection count for each node
  const connectionCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    links.forEach((l) => {
      counts[l.source] = (counts[l.source] || 0) + 1;
      counts[l.target] = (counts[l.target] || 0) + 1;
    });
    return counts;
  }, [links]);

  // Nodes reference maintained across animation loop
  const nodesRef = useRef<GraphNode[]>([]);
  const particlesRef = useRef<Particle[]>([]);

  // Initialize nodes positions
  useEffect(() => {
    const width = canvasRef.current?.width || 800;
    const height = canvasRef.current?.height || 600;

    const existingMap = new Map(nodesRef.current.map((n) => [n.id, n]));

    const initializedNodes: GraphNode[] = notas.map((nota, i) => {
      const existing = existingMap.get(nota.id);
      const connections = connectionCounts[nota.id] || 0;
      const folder = pastas.find((p) => p.id === nota.pastaId);
      const folderName = folder ? folder.nome : 'Raiz';
      const color = folder ? (folderColorMap[folder.id] || '#888888') : '#888888';

      // Plain text preview
      let preview = '';
      if (nota.conteudo) {
        const div = document.createElement('div');
        div.innerHTML = nota.conteudo;
        preview = (div.innerText || div.textContent || '').slice(0, 140);
      }

      // Initial distributed circle
      const angle = (i / Math.max(1, notas.length)) * 2 * Math.PI;
      const radiusDist = 120 + Math.random() * 80;

      return {
        id: nota.id,
        title: nota.titulo,
        folderId: nota.pastaId || null,
        folderName,
        color,
        connectionsCount: connections,
        previewText: preview || 'Nota sem conteúdo.',
        rawNota: nota,
        x: existing ? existing.x : width / 2 + Math.cos(angle) * radiusDist,
        y: existing ? existing.y : height / 2 + Math.sin(angle) * radiusDist,
        vx: existing ? existing.vx : (Math.random() - 0.5) * 2,
        vy: existing ? existing.vy : (Math.random() - 0.5) * 2,
        radius: Math.max(6, Math.min(18, 7 + connections * 2.5)),
      };
    });

    nodesRef.current = initializedNodes;

    // Reset particles on connections change
    particlesRef.current = links.map((l) => ({
      sourceId: l.source,
      targetId: l.target,
      progress: Math.random(),
      speed: 0.004 + Math.random() * 0.006,
      color: '#38bdf8',
    }));
  }, [notas, connectionCounts, folderColorMap, links, pastas]);

  // Center initial view
  useEffect(() => {
    if (canvasRef.current) {
      const { width, height } = canvasRef.current.getBoundingClientRect();
      canvasRef.current.width = width * window.devicePixelRatio;
      canvasRef.current.height = height * window.devicePixelRatio;
      setTransform({ x: width / 2, y: height / 2, k: 1 });
    }
  }, []);

  // Filtered nodes
  const filteredNodeIds = useMemo(() => {
    return new Set(
      nodesRef.current
        .filter((n) => {
          const matchSearch = !searchTerm || n.title.toLowerCase().includes(searchTerm.toLowerCase());
          const matchFolder = selectedFolderFilter === 'all' || (selectedFolderFilter === 'root' ? !n.folderId : n.folderId === selectedFolderFilter);
          return matchSearch && matchFolder;
        })
        .map((n) => n.id)
    );
  }, [searchTerm, selectedFolderFilter]);

  // Animation Loop (Force-Directed Physics + Particle Synapses)
  useEffect(() => {
    let animationFrameId: number;

    const render = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const dpr = window.devicePixelRatio || 1;
      const width = canvas.width / dpr;
      const height = canvas.height / dpr;

      // PHYSICS STEP
      const nodes = nodesRef.current;
      const nodeMap = new Map(nodes.map((n) => [n.id, n]));

      // 1. Repulsion between all nodes
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const n1 = nodes[i];
          const n2 = nodes[j];
          const dx = n2.x - n1.x;
          const dy = n2.y - n1.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;

          if (dist < 350) {
            const force = (repulsionForce * 15) / (dist * dist);
            const fx = (dx / dist) * force;
            const fy = (dy / dist) * force;
            n1.vx -= fx;
            n1.vy -= fy;
            n2.vx += fx;
            n2.vy += fy;
          }
        }
      }

      // 2. Attraction along connected links
      for (const link of links) {
        const source = nodeMap.get(link.source);
        const target = nodeMap.get(link.target);
        if (source && target) {
          const dx = target.x - source.x;
          const dy = target.y - source.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const force = (dist - linkDistance) * 0.035;
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;

          source.vx += fx;
          source.vy += fy;
          target.vx -= fx;
          target.vy -= fy;
        }
      }

      // 3. Gentle center gravity pull
      for (const node of nodes) {
        const dx = width / 2 - node.x;
        const dy = height / 2 - node.y;
        node.vx += dx * 0.0008;
        node.vy += dy * 0.0008;

        // Apply friction/damping
        node.vx *= 0.88;
        node.vy *= 0.88;

        // Move if not currently dragged by user
        if (draggedNodeRef.current !== node) {
          node.x += node.vx;
          node.y += node.vy;
        }
      }

      // DRAW STEP
      ctx.save();
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.scale(dpr, dpr);

      // Background subtle grid
      ctx.fillStyle = '#0d0d0d';
      ctx.fillRect(0, 0, width, height);

      // Apply pan & zoom transform
      ctx.translate(transform.x, transform.y);
      ctx.scale(transform.k, transform.k);

      // Find neighbors of hovered node
      const activeNeighborIds = new Set<string>();
      if (hoveredNode) {
        activeNeighborIds.add(hoveredNode.id);
        links.forEach((l) => {
          if (l.source === hoveredNode.id) activeNeighborIds.add(l.target);
          if (l.target === hoveredNode.id) activeNeighborIds.add(l.source);
        });
      }

      // Draw Links (Synapse lines)
      links.forEach((link) => {
        const s = nodeMap.get(link.source);
        const t = nodeMap.get(link.target);
        if (!s || !t) return;

        const isHighlighted = hoveredNode && (s.id === hoveredNode.id || t.id === hoveredNode.id);
        const isDimmed = hoveredNode && !isHighlighted;

        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(t.x, t.y);

        if (isHighlighted) {
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 2.2;
          ctx.shadowColor = '#38bdf8';
          ctx.shadowBlur = 8;
        } else if (isDimmed) {
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
          ctx.lineWidth = 1;
          ctx.shadowBlur = 0;
        } else {
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
          ctx.lineWidth = 1.2;
          ctx.shadowBlur = 0;
        }
        ctx.stroke();
        ctx.shadowBlur = 0;
      });

      // Draw Animated Synapse Light Particles
      if (synapseParticlesEnabled) {
        particlesRef.current.forEach((p) => {
          const s = nodeMap.get(p.sourceId);
          const t = nodeMap.get(p.targetId);
          if (!s || !t) return;

          p.progress += p.speed;
          if (p.progress > 1) p.progress = 0;

          const px = s.x + (t.x - s.x) * p.progress;
          const py = s.y + (t.y - s.y) * p.progress;

          ctx.beginPath();
          ctx.arc(px, py, 2.5, 0, 2 * Math.PI);
          ctx.fillStyle = '#60a5fa';
          ctx.shadowColor = '#60a5fa';
          ctx.shadowBlur = 6;
          ctx.fill();
          ctx.shadowBlur = 0;
        });
      }

      // Draw Nodes
      nodes.forEach((node) => {
        const isFiltered = filteredNodeIds.has(node.id);
        const isHovered = hoveredNode?.id === node.id;
        const isNeighbor = activeNeighborIds.has(node.id);
        const isDimmed = (hoveredNode && !isNeighbor) || !isFiltered;

        // Glow ring for hovered node
        if (isHovered) {
          ctx.beginPath();
          ctx.arc(node.x, node.y, node.radius + 6, 0, 2 * Math.PI);
          ctx.fillStyle = 'rgba(56, 189, 248, 0.2)';
          ctx.fill();
        }

        // Main Node circle
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, 0, 2 * Math.PI);
        ctx.fillStyle = isDimmed ? 'rgba(80, 80, 80, 0.3)' : node.color;
        if (isHovered || isNeighbor) {
          ctx.shadowColor = node.color;
          ctx.shadowBlur = 12;
        }
        ctx.fill();
        ctx.shadowBlur = 0;

        // Node border
        ctx.lineWidth = isHovered ? 2.5 : 1.5;
        ctx.strokeStyle = isHovered ? '#ffffff' : (isDimmed ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.7)');
        ctx.stroke();

        // Node Label
        if (transform.k > 0.65 || isHovered || isNeighbor) {
          ctx.font = `${isHovered ? 'bold ' : ''}11px var(--font-sans, system-ui, sans-serif)`;
          ctx.textAlign = 'center';
          ctx.fillStyle = isDimmed ? 'rgba(255, 255, 255, 0.25)' : '#ffffff';
          ctx.fillText(node.title, node.x, node.y + node.radius + 14);
        }
      });

      ctx.restore();
      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animationFrameId);
  }, [links, repulsionForce, linkDistance, transform, hoveredNode, filteredNodeIds, synapseParticlesEnabled]);

  // Coordinate conversion screen -> canvas world
  const screenToWorld = (screenX: number, screenY: number) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    const mouseX = screenX - rect.left;
    const mouseY = screenY - rect.top;
    return {
      x: (mouseX - transform.x) / transform.k,
      y: (mouseY - transform.y) / transform.k,
    };
  };

  // Find node under mouse
  const getNodeAtPos = (worldX: number, worldY: number): GraphNode | null => {
    const hitRadiusPadding = 6;
    for (let i = nodesRef.current.length - 1; i >= 0; i--) {
      const node = nodesRef.current[i];
      const dx = node.x - worldX;
      const dy = node.y - worldY;
      if (Math.sqrt(dx * dx + dy * dy) <= node.radius + hitRadiusPadding) {
        return node;
      }
    }
    return null;
  };

  // Mouse Handlers (Pan, Zoom, Drag Node)
  const handleMouseDown = (e: React.MouseEvent) => {
    const { x, y } = screenToWorld(e.clientX, e.clientY);
    const hitNode = getNodeAtPos(x, y);

    if (hitNode) {
      draggedNodeRef.current = hitNode;
    } else {
      isPanningRef.current = true;
      startPanRef.current = { x: e.clientX - transform.x, y: e.clientY - transform.y };
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanningRef.current) {
      setTransform((prev) => ({
        ...prev,
        x: e.clientX - startPanRef.current.x,
        y: e.clientY - startPanRef.current.y,
      }));
      return;
    }

    const { x, y } = screenToWorld(e.clientX, e.clientY);

    if (draggedNodeRef.current) {
      draggedNodeRef.current.x = x;
      draggedNodeRef.current.y = y;
      draggedNodeRef.current.vx = 0;
      draggedNodeRef.current.vy = 0;
      return;
    }

    const hit = getNodeAtPos(x, y);
    setHoveredNode(hit);
  };

  const handleMouseUp = () => {
    isPanningRef.current = false;
    draggedNodeRef.current = null;
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.12 : 0.88;
    const newK = Math.max(0.3, Math.min(3.5, transform.k * zoomFactor));

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    setTransform((prev) => ({
      k: newK,
      x: mouseX - (mouseX - prev.x) * (newK / prev.k),
      y: mouseY - (mouseY - prev.y) * (newK / prev.k),
    }));
  };

  const handleNodeClick = (e: React.MouseEvent) => {
    const { x, y } = screenToWorld(e.clientX, e.clientY);
    const hit = getNodeAtPos(x, y);
    if (hit) {
      const nota = notas.find((n) => n.id === hit.id);
      if (nota) onOpenNota(nota);
    }
  };

  const handleResetView = () => {
    if (canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      setTransform({ x: rect.width / 2, y: rect.height / 2, k: 1 });
    }
  };

  return (
    <div className="relative w-full h-full flex flex-col bg-[#0d0d0d] select-none overflow-hidden font-sans">
      {/* Top Floating Control Bar */}
      <div className="absolute top-4 left-4 right-4 z-20 flex flex-wrap items-center justify-between gap-3 pointer-events-none">
        {/* Search & Folder Filter Pill */}
        <div className="flex items-center gap-2 bg-[#181818]/90 backdrop-blur-md border border-[var(--accents-2)]/60 rounded-xl p-1.5 shadow-2xl pointer-events-auto">
          {/* Search Box */}
          <div className="flex items-center gap-2 px-2.5 py-1 bg-[#242424] rounded-lg border border-[var(--accents-2)]/40">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--accents-4)]">
              <circle cx="11" cy="11" r="8"/>
              <line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              type="text"
              placeholder="Buscar notas no grafo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-transparent border-none outline-none text-xs text-white placeholder-[var(--accents-4)] w-36 sm:w-48"
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="text-[var(--accents-4)] hover:text-white text-xs">
                ✕
              </button>
            )}
          </div>

          {/* Folder Select */}
          <select
            value={selectedFolderFilter}
            onChange={(e) => setSelectedFolderFilter(e.target.value)}
            className="bg-[#242424] text-xs text-[#e0e0e0] border border-[var(--accents-2)]/40 rounded-lg px-2 py-1 outline-none cursor-pointer"
          >
            <option value="all">Todas as Pastas</option>
            <option value="root">Sem Pasta (Raiz)</option>
            {pastas.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome}
              </option>
            ))}
          </select>
        </div>

        {/* View Controls & Stats */}
        <div className="flex items-center gap-2 bg-[#181818]/90 backdrop-blur-md border border-[var(--accents-2)]/60 rounded-xl px-3 py-1.5 shadow-2xl pointer-events-auto text-xs text-[var(--accents-5)]">
          <span className="text-[#38bdf8] font-semibold">{notas.length} notas</span>
          <span>•</span>
          <span className="text-[#34d399] font-semibold">{links.length} conexões</span>

          <div className="w-[1px] h-3.5 bg-[var(--accents-2)] mx-1" />

          {/* Toggle Synapse Particles */}
          <button
            type="button"
            onClick={() => setSynapseParticlesEnabled((prev) => !prev)}
            className={`px-2 py-1 rounded-md transition-colors flex items-center gap-1.5 ${
              synapseParticlesEnabled
                ? 'bg-[#38bdf8]/20 text-[#38bdf8] font-medium'
                : 'text-[var(--accents-4)] hover:text-white'
            }`}
            title="Efeito Sinapse: partículas de energia fluindo nas conexões"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
            </svg>
            <span>Sinapses</span>
          </button>

          {/* Reset Zoom */}
          <button
            type="button"
            onClick={handleResetView}
            className="px-2 py-1 rounded-md text-[var(--accents-4)] hover:text-white hover:bg-[#242424] transition-colors"
            title="Recentralizar visualização"
          >
            Recentralizar
          </button>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="w-6 h-6 flex items-center justify-center rounded-md text-[var(--accents-4)] hover:text-white hover:bg-[#242424] transition-colors ml-1"
              title="Fechar Grafo"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Interactive Physics Canvas */}
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
        onClick={handleNodeClick}
        className="w-full h-full cursor-grab active:cursor-grabbing"
      />

      {/* Immersive Real Note Preview Side Card (Non-intrusive floating panel on the right / bottom sheet on mobile) */}
      {hoveredNode && hoveredNode.rawNota && (
        <div
          className="animate-in fade-in slide-in-from-bottom-4 md:slide-in-from-right-4 duration-150 fixed md:absolute bottom-4 md:bottom-[72px] left-4 md:left-auto right-4 md:right-6 top-auto md:top-[72px] md:w-[340px] max-h-[60vh] md:max-h-none"
          style={{
            background: 'var(--background)',
            border: '1px solid var(--accents-2)',
            borderRadius: '12px',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.45)',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 30,
            overflow: 'hidden',
            pointerEvents: 'auto',
          }}
        >
          {/* Header */}
          <div style={{ padding: '16px 18px', borderBottom: '1px solid var(--accents-2)', background: 'var(--accents-1)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span
                  style={{ width: '8px', height: '8px', borderRadius: '50%', background: hoveredNode.color, display: 'inline-block' }}
                />
                <span style={{ fontSize: '11px', color: 'var(--accents-4)', fontWeight: 500 }}>
                  {hoveredNode.folderName}
                </span>
              </div>
              <span style={{ fontSize: '10px', color: '#38bdf8', fontFamily: 'var(--font-mono)' }}>
                {hoveredNode.connectionsCount} {hoveredNode.connectionsCount === 1 ? 'conexão' : 'conexões'}
              </span>
            </div>

            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: 'var(--foreground)', letterSpacing: '-0.02em', lineHeight: '1.4' }}>
              {hoveredNode.title || 'Sem Título'}
            </h3>
          </div>

          {/* Real Content Preview Surface */}
          <div style={{ flex: 1, padding: '16px 18px', overflowY: 'auto' }} className="no-scrollbar">
            {hoveredNode.rawNota.tipo === 'desenho' ? (
              <div>
                <GraphDrawingPreview conteudoJson={hoveredNode.rawNota.conteudo} />
                <p style={{ fontSize: '11px', color: 'var(--accents-4)', textAlign: 'center', marginTop: '12px' }}>
                  Nota de Desenho / Canvas
                </p>
              </div>
            ) : hoveredNode.rawNota.conteudo && hoveredNode.rawNota.conteudo.trim() ? (
              <div
                className="notion-editor text-[13px] leading-[1.65] text-[var(--foreground)]"
                dangerouslySetInnerHTML={{ __html: hoveredNode.rawNota.conteudo }}
                style={{ wordBreak: 'break-word', userSelect: 'none', pointerEvents: 'none' }}
              />
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--accents-4)', fontSize: '12px', fontStyle: 'italic' }}>
                Nota vazia
              </div>
            )}
          </div>

          {/* Footer with Click Action */}
          <div style={{ padding: '12px 18px', borderTop: '1px solid var(--accents-2)', background: 'var(--accents-1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '11px', color: 'var(--accents-4)' }}>
              Visualização Rápida
            </span>
            <button
              type="button"
              onClick={() => onOpenNota(hoveredNode.rawNota)}
              className="geist-button"
              style={{ height: '26px', padding: '0 10px', fontSize: '11px', borderRadius: '4px', cursor: 'pointer' }}
            >
              Abrir Nota ↗
            </button>
          </div>
        </div>
      )}

      {/* Bottom Right Physics Sliders Bar */}
      <div className="absolute bottom-4 right-4 z-20 hidden md:flex items-center gap-4 bg-[#181818]/90 backdrop-blur-md border border-[var(--accents-2)]/60 rounded-xl px-3.5 py-2 shadow-2xl text-xs text-[var(--accents-4)]">
        <div className="flex items-center gap-2">
          <span>Repulsão</span>
          <input
            type="range"
            min="100"
            max="600"
            value={repulsionForce}
            onChange={(e) => setRepulsionForce(Number(e.target.value))}
            className="w-20 accent-[#38bdf8] cursor-pointer"
          />
        </div>
        <div className="flex items-center gap-2">
          <span>Distância</span>
          <input
            type="range"
            min="40"
            max="180"
            value={linkDistance}
            onChange={(e) => setLinkDistance(Number(e.target.value))}
            className="w-20 accent-[#38bdf8] cursor-pointer"
          />
        </div>
      </div>
    </div>
  );
}
