'use client';

import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import * as d3 from 'd3-force';
import { resolveNodeColor, GraphGroup } from '../GraphView';
import { useTheme } from '../ThemeProvider';

export interface ObsidianGraphProps {
  notas: any[];
  links: any[];
  groups?: GraphGroup[];
  hoveredNodeId?: string | null;
  showLabels?: boolean;
  repulsionForce?: number;
  linkDistance?: number;
  centerForce?: number;
  nodeScale?: number;
  synapseParticlesEnabled?: boolean;
  onHoverNode?: (nota: any | null) => void;
  onOpenNota: (nota: any) => void;
}

interface D3Node extends d3.SimulationNodeDatum {
  id: string;
  title: string;
  folderId: string | null;
  color: string;
  connectionsCount: number;
  radius: number;
  rawNota: any;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;
}

interface D3Link extends d3.SimulationLinkDatum<D3Node> {
  source: any;
  target: any;
}

interface Particle {
  sourceId: string;
  targetId: string;
  progress: number;
  speed: number;
}

export default function ObsidianGraph({
  notas = [],
  links = [],
  groups = [],
  hoveredNodeId = null,
  showLabels = true,
  repulsionForce = 280,
  linkDistance = 80,
  centerForce = 0.08,
  nodeScale = 1,
  synapseParticlesEnabled = true,
  onHoverNode = () => {},
  onOpenNota = () => {},
}: ObsidianGraphProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { resolvedTheme } = useTheme();
  const isLight = resolvedTheme === 'light';

  // Camera transform: Pan & Zoom
  const [transform, setTransform] = useState({ x: 0, y: 0, k: 1 });
  const transformRef = useRef(transform);
  useEffect(() => {
    transformRef.current = transform;
  }, [transform]);

  // Simulation & node references
  const simulationRef = useRef<d3.Simulation<D3Node, D3Link> | null>(null);
  const nodesRef = useRef<D3Node[]>([]);
  const linksRef = useRef<D3Link[]>([]);
  const particlesRef = useRef<Particle[]>([]);

  // Dragging & Panning interaction states
  const isPanningRef = useRef(false);
  const startPanRef = useRef({ x: 0, y: 0 });
  const draggedNodeRef = useRef<D3Node | null>(null);
  const dragStartPosRef = useRef({ x: 0, y: 0 });
  const hasDraggedRef = useRef(false);

  // Local hovered node ID for immediate responsiveness
  const [localHoveredId, setLocalHoveredId] = useState<string | null>(null);
  const activeHoverId = hoveredNodeId || localHoveredId;

  // Compute connections map and D3 Nodes
  const { initialNodes, initialLinks, neighborMap } = useMemo(() => {
    const connMap: Record<string, number> = {};
    const neighbors: Record<string, Set<string>> = {};

    notas.forEach((n) => {
      connMap[n.id] = 0;
      neighbors[n.id] = new Set();
    });

    links.forEach((l) => {
      const s = l.source;
      const t = l.target;
      if (connMap[s] !== undefined) connMap[s] += 1;
      if (connMap[t] !== undefined) connMap[t] += 1;

      if (neighbors[s]) neighbors[s].add(t);
      if (neighbors[t]) neighbors[t].add(s);
    });

    const d3Nodes: D3Node[] = notas.map((n) => {
      const connections = connMap[n.id] || 0;
      // Obsidian-style scale: larger for high connectivity, minimum 4.5px
      const baseRadius = 4.5 + Math.sqrt(connections) * 2.2 * nodeScale;
      const radius = Math.max(4, Math.min(24, baseRadius));

      return {
        id: n.id,
        title: n.titulo || 'Sem Título',
        folderId: n.pastaId || null,
        color: resolveNodeColor(n, groups),
        connectionsCount: connections,
        radius,
        rawNota: n,
      };
    });

    const d3Links: D3Link[] = links.map((l) => ({
      source: l.source,
      target: l.target,
    }));

    return { initialNodes: d3Nodes, initialLinks: d3Links, neighborMap: neighbors };
  }, [notas, links, groups, nodeScale]);

  // Initialize or update D3 Force Simulation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || initialNodes.length === 0) return;

    const width = canvas.clientWidth || 800;
    const height = canvas.clientHeight || 600;

    // Preserve existing node positions across re-renders to prevent jarring jumps
    const existingNodeMap = new Map<string, { x?: number; y?: number; vx?: number; vy?: number }>();
    nodesRef.current.forEach((n) => {
      existingNodeMap.set(n.id, { x: n.x, y: n.y, vx: n.vx, vy: n.vy });
    });

    const simNodes: D3Node[] = initialNodes.map((n) => {
      const prev = existingNodeMap.get(n.id);
      return {
        ...n,
        x: prev?.x ?? width / 2 + (Math.random() - 0.5) * 200,
        y: prev?.y ?? height / 2 + (Math.random() - 0.5) * 200,
        vx: prev?.vx ?? 0,
        vy: prev?.vy ?? 0,
      };
    });

    const simLinks: D3Link[] = initialLinks.map((l) => ({
      source: typeof l.source === 'object' ? l.source.id : l.source,
      target: typeof l.target === 'object' ? l.target.id : l.target,
    }));

    // Create D3 Force Simulation
    const simulation = d3
      .forceSimulation<D3Node>(simNodes)
      .force(
        'link',
        d3
          .forceLink<D3Node, D3Link>(simLinks)
          .id((d) => d.id)
          .distance(linkDistance)
          .strength(0.6)
      )
      .force('charge', d3.forceManyBody().strength(-repulsionForce))
      .force('center', d3.forceCenter(width / 2, height / 2).strength(centerForce))
      .force(
        'collide',
        d3.forceCollide<D3Node>((d) => d.radius + 5).strength(0.8)
      )
      .alphaDecay(0.022);

    simulationRef.current = simulation;
    nodesRef.current = simNodes;
    linksRef.current = simLinks;

    // Initialize Synapse Particles along links
    const particles: Particle[] = [];
    simLinks.forEach((link) => {
      const sId = typeof link.source === 'object' ? link.source.id : link.source;
      const tId = typeof link.target === 'object' ? link.target.id : link.target;
      particles.push({
        sourceId: sId,
        targetId: tId,
        progress: Math.random(),
        speed: 0.003 + Math.random() * 0.005,
      });
    });
    particlesRef.current = particles;

    return () => {
      simulation.stop();
    };
  }, [initialNodes, initialLinks, repulsionForce, linkDistance, centerForce]);

  // Center view on mount or reset
  const handleCenterView = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || nodesRef.current.length === 0) return;

    const width = canvas.clientWidth || 800;
    const height = canvas.clientHeight || 600;

    let minX = Infinity,
      maxX = -Infinity,
      minY = Infinity,
      maxY = -Infinity;

    nodesRef.current.forEach((n) => {
      const x = n.x ?? width / 2;
      const y = n.y ?? height / 2;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    });

    const graphW = Math.max(maxX - minX + 160, 200);
    const graphH = Math.max(maxY - minY + 160, 200);

    const scaleX = (width - 100) / graphW;
    const scaleY = (height - 100) / graphH;
    const k = Math.min(Math.max(Math.min(scaleX, scaleY), 0.4), 1.5);

    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    setTransform({
      x: width / 2 - centerX * k,
      y: height / 2 - centerY * k,
      k,
    });
  }, []);

  // Center on first load
  const hasCenteredOnMount = useRef(false);
  useEffect(() => {
    if (!hasCenteredOnMount.current && initialNodes.length > 0) {
      hasCenteredOnMount.current = true;
      setTimeout(handleCenterView, 120);
    }
  }, [initialNodes.length, handleCenterView]);

  // Main Canvas Rendering Loop
  useEffect(() => {
    let animationFrameId: number;

    const render = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const dpr = window.devicePixelRatio || 1;
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;

      if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
        canvas.width = width * dpr;
        canvas.height = height * dpr;
      }

      ctx.save();
      ctx.scale(dpr, dpr);

      // Discord Dark Canvas Background (#191919)
      const bgColor = isLight ? '#f2f3f5' : '#191919';
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, width, height);

      // Subtle Discord dotted grid pattern
      const currentTransform = transformRef.current;
      const dotSpacing = 36 * currentTransform.k;
      if (dotSpacing > 14) {
        ctx.fillStyle = isLight ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.04)';
        const startX = ((currentTransform.x % dotSpacing) + dotSpacing) % dotSpacing;
        const startY = ((currentTransform.y % dotSpacing) + dotSpacing) % dotSpacing;
        for (let x = startX; x < width; x += dotSpacing) {
          for (let y = startY; y < height; y += dotSpacing) {
            ctx.fillRect(x, y, 1.2, 1.2);
          }
        }
      }

      // World coordinate transformation
      ctx.translate(currentTransform.x, currentTransform.y);
      ctx.scale(currentTransform.k, currentTransform.k);

      const nodes = nodesRef.current;
      const links = linksRef.current;
      const nodeMap = new Map<string, D3Node>();
      nodes.forEach((n) => nodeMap.set(n.id, n));

      // Check active hover & neighbors
      const hoveredId = activeHoverId;
      const activeNeighbors = hoveredId ? neighborMap[hoveredId] : null;

      // 1. Draw Links
      links.forEach((link) => {
        const source = typeof link.source === 'object' ? link.source : nodeMap.get(link.source);
        const target = typeof link.target === 'object' ? link.target : nodeMap.get(link.target);
        if (
          !source ||
          !target ||
          source.x === undefined ||
          target.x === undefined ||
          source.y === undefined ||
          target.y === undefined
        )
          return;

        const isConnectedToHovered =
          hoveredId && (source.id === hoveredId || target.id === hoveredId);
        const isDimmed = hoveredId && !isConnectedToHovered;

        ctx.beginPath();
        ctx.moveTo(source.x, source.y);
        ctx.lineTo(target.x, target.y);

        if (isConnectedToHovered) {
          // Highlighted link in Synap Blue
          ctx.strokeStyle = '#20b8cd';
          ctx.lineWidth = 2.2;
          ctx.globalAlpha = 0.95;
        } else if (isDimmed) {
          // Dimmed background link
          ctx.strokeStyle = isLight ? '#cbd5e1' : '#202020';
          ctx.lineWidth = 0.8;
          ctx.globalAlpha = 0.15;
        } else {
          // Normal link
          ctx.strokeStyle = isLight ? '#94a3b8' : '#2a2a2a';
          ctx.lineWidth = 1.2;
          ctx.globalAlpha = 0.55;
        }

        ctx.stroke();
      });

      // 2. Draw Synapse Particles
      if (synapseParticlesEnabled && links.length > 0) {
        particlesRef.current.forEach((p) => {
          const s = nodeMap.get(p.sourceId);
          const t = nodeMap.get(p.targetId);
          if (!s || !t || s.x === undefined || t.x === undefined || s.y === undefined || t.y === undefined) return;

          // Advance particle progress
          const isConnected = hoveredId && (s.id === hoveredId || t.id === hoveredId);
          p.progress += isConnected ? p.speed * 2.2 : p.speed;
          if (p.progress > 1) p.progress = 0;

          const px = s.x + (t.x - s.x) * p.progress;
          const py = s.y + (t.y - s.y) * p.progress;

          ctx.beginPath();
          ctx.arc(px, py, isConnected ? 2.5 : 1.6, 0, Math.PI * 2);
          ctx.fillStyle = isConnected ? '#20b8cd' : isLight ? '#64748b' : '#8a8a8a';
          ctx.globalAlpha = isConnected ? 0.9 : hoveredId ? 0.15 : 0.6;
          ctx.fill();
        });
      }

      // 3. Draw Nodes
      nodes.forEach((node) => {
        if (node.x === undefined || node.y === undefined) return;

        const isCurrentHovered = hoveredId === node.id;
        const isNeighbor = activeNeighbors ? activeNeighbors.has(node.id) : false;
        const isDimmed = hoveredId && !isCurrentHovered && !isNeighbor;

        const hasCustomGroupColor =
          node.color &&
          node.color !== '#525252' &&
          node.color !== '#737373' &&
          node.color !== '#3a3a3a' &&
          node.color !== '#80848e';

        // Default neutral color is Discord Dark Surface gray (#3a3a3a in dark / #94a3b8 in light)
        const baseColor = hasCustomGroupColor
          ? node.color
          : isLight
          ? '#94a3b8'
          : '#3a3a3a';

        // Glowing outer halo on hover
        if (isCurrentHovered) {
          ctx.beginPath();
          ctx.arc(node.x, node.y, node.radius + 6, 0, Math.PI * 2);
          ctx.fillStyle = '#20b8cd';
          ctx.globalAlpha = 0.25;
          ctx.fill();

          ctx.beginPath();
          ctx.arc(node.x, node.y, node.radius + 3, 0, Math.PI * 2);
          ctx.strokeStyle = '#20b8cd';
          ctx.lineWidth = 1.8;
          ctx.globalAlpha = 0.8;
          ctx.stroke();
        } else if (isNeighbor) {
          ctx.beginPath();
          ctx.arc(node.x, node.y, node.radius + 2, 0, Math.PI * 2);
          ctx.strokeStyle = '#20b8cd';
          ctx.lineWidth = 1.2;
          ctx.globalAlpha = 0.6;
          ctx.stroke();
        }

        // Node main circle
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);

        if (isCurrentHovered) {
          ctx.fillStyle = '#20b8cd'; // Synap Blue
          ctx.globalAlpha = 1;
        } else if (isDimmed) {
          ctx.fillStyle = baseColor;
          ctx.globalAlpha = 0.18;
        } else {
          ctx.fillStyle = baseColor;
          ctx.globalAlpha = 0.95;
        }
        ctx.fill();

        // Node crisp border
        ctx.strokeStyle = isLight ? '#ffffff' : '#202020';
        ctx.lineWidth = 1.2;
        ctx.globalAlpha = isDimmed ? 0.15 : 0.8;
        ctx.stroke();
      });

      // 4. Draw Labels
      if (showLabels) {
        nodes.forEach((node) => {
          if (node.x === undefined || node.y === undefined) return;

          const isCurrentHovered = hoveredId === node.id;
          const isNeighbor = activeNeighbors ? activeNeighbors.has(node.id) : false;
          const isDimmed = hoveredId && !isCurrentHovered && !isNeighbor;

          // Low zoom level optimization: only show high-degree hubs, hovered, and neighbors
          const shouldShowLabel =
            isCurrentHovered ||
            isNeighbor ||
            currentTransform.k > 0.75 ||
            node.connectionsCount >= 2;

          if (!shouldShowLabel) return;

          const text = node.title;
          const fontSize = isCurrentHovered ? 12 : 10;
          ctx.font = `${isCurrentHovered ? '600' : '500'} ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'top';

          const labelY = node.y + node.radius + 5;

          if (isCurrentHovered || isNeighbor) {
            // Pill background for active/neighbor labels for pristine readability
            const metrics = ctx.measureText(text);
            const textWidth = metrics.width;
            const padX = 6;
            const padY = 2;

            ctx.beginPath();
            const rx = node.x - textWidth / 2 - padX;
            const ry = labelY - 1;
            const rw = textWidth + padX * 2;
            const rh = fontSize + padY * 2;
            const radiusPill = 4;

            ctx.fillStyle = isLight ? 'rgba(255, 255, 255, 0.95)' : 'rgba(17, 18, 20, 0.92)';
            if (ctx.roundRect) {
              ctx.roundRect(rx, ry, rw, rh, radiusPill);
            } else {
              ctx.rect(rx, ry, rw, rh);
            }
            ctx.globalAlpha = 1;
            ctx.fill();

            ctx.strokeStyle = isCurrentHovered ? '#20b8cd' : isLight ? '#cbd5e1' : '#2a2a2a';
            ctx.lineWidth = 1;
            ctx.stroke();

            ctx.fillStyle = isCurrentHovered ? (isLight ? '#20b8cd' : '#ffffff') : isLight ? '#0f172a' : '#e8e8e8';
            ctx.fillText(text, node.x, labelY + 1);
          } else {
            ctx.fillStyle = isLight ? '#475569' : '#8a8a8a';
            ctx.globalAlpha = isDimmed ? 0.15 : 0.85;
            ctx.fillText(text, node.x, labelY);
          }
        });
      }

      ctx.restore();
      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animationFrameId);
  }, [activeHoverId, neighborMap, showLabels, synapseParticlesEnabled, isLight]);

  // Screen to world coordinates helper
  const screenToWorld = useCallback(
    (screenX: number, screenY: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };
      const rect = canvas.getBoundingClientRect();
      const mouseX = screenX - rect.left;
      const mouseY = screenY - rect.top;
      const currentTransform = transformRef.current;
      return {
        x: (mouseX - currentTransform.x) / currentTransform.k,
        y: (mouseY - currentTransform.y) / currentTransform.k,
      };
    },
    []
  );

  // Find node at coordinate
  const getNodeAt = useCallback(
    (worldX: number, worldY: number): D3Node | null => {
      const nodes = nodesRef.current;
      for (let i = nodes.length - 1; i >= 0; i--) {
        const node = nodes[i];
        if (node.x === undefined || node.y === undefined) continue;
        const dist = Math.hypot(node.x - worldX, node.y - worldY);
        // Hitbox includes slight padding for easy interaction
        if (dist <= node.radius + 6) {
          return node;
        }
      }
      return null;
    },
    []
  );

  // Mouse / Touch handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button !== 0) return; // Only left click

    const world = screenToWorld(e.clientX, e.clientY);
    const clickedNode = getNodeAt(world.x, world.y);

    if (clickedNode) {
      draggedNodeRef.current = clickedNode;
      dragStartPosRef.current = { x: e.clientX, y: e.clientY };
      hasDraggedRef.current = false;

      // Fix node position during drag
      clickedNode.fx = clickedNode.x;
      clickedNode.fy = clickedNode.y;
      simulationRef.current?.alphaTarget(0.3).restart();
    } else {
      isPanningRef.current = true;
      startPanRef.current = {
        x: e.clientX - transformRef.current.x,
        y: e.clientY - transformRef.current.y,
      };
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    // 1. Dragging a node
    if (draggedNodeRef.current) {
      const dist = Math.hypot(
        e.clientX - dragStartPosRef.current.x,
        e.clientY - dragStartPosRef.current.y
      );
      if (dist > 4) hasDraggedRef.current = true;

      const world = screenToWorld(e.clientX, e.clientY);
      draggedNodeRef.current.fx = world.x;
      draggedNodeRef.current.fy = world.y;
      return;
    }

    // 2. Panning the canvas
    if (isPanningRef.current) {
      setTransform((prev) => ({
        ...prev,
        x: e.clientX - startPanRef.current.x,
        y: e.clientY - startPanRef.current.y,
      }));
      return;
    }

    // 3. Hovering over nodes
    const world = screenToWorld(e.clientX, e.clientY);
    const hovered = getNodeAt(world.x, world.y);
    const newHoverId = hovered ? hovered.id : null;

    if (newHoverId !== localHoveredId) {
      setLocalHoveredId(newHoverId);
      onHoverNode(hovered ? hovered.rawNota : null);
    }
  };

  const handleMouseUp = () => {
    if (draggedNodeRef.current) {
      const node = draggedNodeRef.current;
      if (!hasDraggedRef.current) {
        // Click without significant drag -> Open note
        onOpenNota(node.rawNota);
      }

      node.fx = null;
      node.fy = null;
      draggedNodeRef.current = null;
      simulationRef.current?.alphaTarget(0);
    }
    isPanningRef.current = false;
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;

    const zoomFactor = e.deltaY < 0 ? 1.12 : 0.88;
    const newK = Math.max(0.2, Math.min(3.5, transformRef.current.k * zoomFactor));

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    setTransform((prev) => ({
      x: mouseX - (mouseX - prev.x) * (newK / prev.k),
      y: mouseY - (mouseY - prev.y) * (newK / prev.k),
      k: newK,
    }));
  };

  const handleMouseLeave = () => {
    if (draggedNodeRef.current) {
      draggedNodeRef.current.fx = null;
      draggedNodeRef.current.fy = null;
      draggedNodeRef.current = null;
      simulationRef.current?.alphaTarget(0);
    }
    isPanningRef.current = false;
    setLocalHoveredId(null);
    onHoverNode(null);
  };

  return (
    <div className="w-full h-full relative overflow-hidden bg-[#191919] select-none">
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
        onMouseLeave={handleMouseLeave}
        className="w-full h-full block cursor-grab active:cursor-grabbing"
      />
    </div>
  );
}
