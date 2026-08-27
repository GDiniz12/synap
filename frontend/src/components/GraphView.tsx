'use client';

import React, { useEffect, useRef, useState, useMemo } from 'react';
import GraphDrawingPreview from './GraphDrawingPreview';
import { api } from '@/lib/api';

export type GroupRuleType = 'pasta' | 'tag' | 'titulo' | 'conteudo' | 'tipo';

export interface GraphGroup {
  id: string;
  ruleType: GroupRuleType;
  ruleValue: string;
  color: string;
  enabled: boolean;
}

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
  onUpdateWorkspace?: (workspace: any) => void;
}

export const FOLDER_PALETTE = [
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

export const PRESET_GROUP_COLORS = [
  '#ef4444', // Red
  '#f97316', // Orange
  '#f59e0b', // Amber
  '#10b981', // Emerald
  '#06b6d4', // Cyan
  '#3b82f6', // Blue
  '#6366f1', // Indigo
  '#8b5cf6', // Purple
  '#ec4899', // Pink
  '#14b8a6', // Teal
  '#eab308', // Yellow
  '#64748b', // Slate
];

export const NEUTRAL_FALLBACK_COLOR = '#525252';

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Evaluate whether a note matches an individual group rule
export function matchNoteToGroup(nota: any, group: GraphGroup): boolean {
  if (!group || !group.enabled || !nota) return false;
  const val = (group.ruleValue || '').trim().toLowerCase();

  switch (group.ruleType) {
    case 'pasta': {
      if (!val || val === 'root' || val === 'raiz') {
        return !nota.pastaId && !nota.folderId;
      }
      return (
        String(nota.pastaId || '').toLowerCase() === val ||
        String(nota.folderId || '').toLowerCase() === val ||
        (nota.folderName && String(nota.folderName).toLowerCase() === val)
      );
    }
    case 'tag': {
      if (!val) return false;
      const cleanTag = val.replace(/^#/, '').trim().toLowerCase();
      if (!cleanTag) return false;

      const title = (nota.titulo || nota.title || '').toLowerCase();
      const content = (nota.conteudo || nota.previewText || '').replace(/<[^>]*>/g, ' ').toLowerCase();

      const tagRegex = new RegExp(`(^|[^a-zA-Z0-9_])#${escapeRegex(cleanTag)}([^a-zA-Z0-9_]|$)`, 'i');
      return (
        tagRegex.test(title) ||
        tagRegex.test(content) ||
        title.includes('#' + cleanTag) ||
        content.includes('#' + cleanTag) ||
        title.includes(cleanTag) ||
        content.includes(cleanTag)
      );
    }
    case 'titulo': {
      if (!val) return false;
      const title = (nota.titulo || nota.title || '').toLowerCase();
      return title.includes(val);
    }
    case 'conteudo': {
      if (!val) return false;
      const content = (nota.conteudo || nota.previewText || '').replace(/<[^>]*>/g, ' ').toLowerCase();
      return content.includes(val);
    }
    case 'tipo': {
      const typeVal = val || 'texto';
      return (nota.tipo || 'texto').toLowerCase() === typeVal.toLowerCase();
    }
    default:
      return false;
  }
}

// Resolve note color based on active groups or default folder colors
export function resolveNodeColor(
  nota: any,
  groups: GraphGroup[],
  folderColorMap: Record<string, string>
): string {
  if (!nota) return NEUTRAL_FALLBACK_COLOR;
  const activeGroups = groups.filter((g) => g.enabled);

  if (activeGroups.length > 0) {
    for (const group of activeGroups) {
      if (matchNoteToGroup(nota, group)) {
        return group.color;
      }
    }
    return NEUTRAL_FALLBACK_COLOR;
  }

  // If no groups exist or are enabled, fallback to the folder palette
  const pastaId = nota.pastaId || nota.folderId;
  if (pastaId && folderColorMap[pastaId]) {
    return folderColorMap[pastaId];
  }
  return folderColorMap['root'] || '#737373';
}

export default function GraphView({
  workspace,
  pastas,
  notas,
  onOpenNota,
  onClose,
  onUpdateWorkspace,
}: GraphViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Folder palette mapping
  const folderColorMap = useMemo(() => {
    const map: Record<string, string> = { root: '#737373' };
    pastas.forEach((p, idx) => {
      map[p.id] = FOLDER_PALETTE[idx % FOLDER_PALETTE.length];
    });
    return map;
  }, [pastas]);

  // Groups configuration state
  const [groups, setGroups] = useState<GraphGroup[]>(() => {
    if (workspace?.graphConfig?.groups && Array.isArray(workspace.graphConfig.groups)) {
      return workspace.graphConfig.groups;
    }
    return [];
  });

  const [isGroupsOpen, setIsGroupsOpen] = useState(false);
  const [activeColorPickerGroupId, setActiveColorPickerGroupId] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Keep a ref to groups for real-time physics and canvas rendering
  const groupsRef = useRef<GraphGroup[]>(groups);
  useEffect(() => {
    groupsRef.current = groups;
  }, [groups]);

  // Sync groups when workspace prop changes externally
  useEffect(() => {
    if (workspace?.graphConfig?.groups && Array.isArray(workspace.graphConfig.groups)) {
      setGroups(workspace.graphConfig.groups);
    }
  }, [workspace?.id]);

  // Debounced save groups to backend
  const persistGroups = (newGroups: GraphGroup[]) => {
    setGroups(newGroups);
    groupsRef.current = newGroups;
    setSaveStatus('saving');

    // Instantly update color on all loaded nodes
    nodesRef.current.forEach((n) => {
      n.color = resolveNodeColor(n.rawNota || n, newGroups, folderColorMap);
    });

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await api(`/workspaces/${workspace.id}`, {
          method: 'PUT',
          body: JSON.stringify({
            graphConfig: {
              ...(workspace?.graphConfig || {}),
              groups: newGroups,
            },
          }),
        });
        setSaveStatus('saved');
        if (onUpdateWorkspace && res) {
          onUpdateWorkspace(res);
        }
        setTimeout(() => setSaveStatus('idle'), 1500);
      } catch (err) {
        console.error('Failed to save graph groups to backend', err);
        setSaveStatus('idle');
      }
    }, 500);
  };

  // Group actions
  const handleAddGroup = () => {
    const defaultColor = PRESET_GROUP_COLORS[groups.length % PRESET_GROUP_COLORS.length];
    const defaultType: GroupRuleType = pastas.length > 0 ? 'pasta' : 'tag';
    const defaultValue = defaultType === 'pasta' ? (pastas[0]?.id || 'root') : '';

    const newGroup: GraphGroup = {
      id: 'grp_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
      ruleType: defaultType,
      ruleValue: defaultValue,
      color: defaultColor,
      enabled: true,
    };
    persistGroups([...groups, newGroup]);
  };

  const handleUpdateGroup = (id: string, partial: Partial<GraphGroup>) => {
    const updated = groups.map((g) => (g.id === id ? { ...g, ...partial } : g));
    persistGroups(updated);
  };

  const handleDeleteGroup = (id: string) => {
    const updated = groups.filter((g) => g.id !== id);
    persistGroups(updated);
    if (activeColorPickerGroupId === id) setActiveColorPickerGroupId(null);
  };

  const handleMoveGroup = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= groups.length) return;
    const reordered = [...groups];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(newIndex, 0, moved);
    persistGroups(reordered);
  };

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

  // Count matching notes for each group
  const groupMatchCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    groups.forEach((g) => {
      counts[g.id] = notas.filter((n) => matchNoteToGroup(n, g)).length;
    });
    return counts;
  }, [groups, notas]);

  // Nodes reference maintained across animation loop
  const nodesRef = useRef<GraphNode[]>([]);
  const particlesRef = useRef<Particle[]>([]);

  // Initialize nodes positions and update colors
  useEffect(() => {
    const width = canvasRef.current?.width || 800;
    const height = canvasRef.current?.height || 600;

    const existingMap = new Map(nodesRef.current.map((n) => [n.id, n]));

    const initializedNodes: GraphNode[] = notas.map((nota, i) => {
      const existing = existingMap.get(nota.id);
      const connections = connectionCounts[nota.id] || 0;
      const folder = pastas.find((p) => p.id === nota.pastaId);
      const folderName = folder ? folder.nome : 'Raiz';
      const color = resolveNodeColor(nota, groups, folderColorMap);

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
  }, [notas, connectionCounts, links, pastas, groups, folderColorMap]);

  // Center initial view
  useEffect(() => {
    if (canvasRef.current) {
      const { width, height } = canvasRef.current.getBoundingClientRect();
      canvasRef.current.width = width * window.devicePixelRatio;
      canvasRef.current.height = height * window.devicePixelRatio;
      setTransform({ x: width / 2, y: height / 2, k: 1 });
    }
  }, []);

  // Filtered nodes directly derived from notas
  const filteredNodeIds = useMemo(() => {
    return new Set(
      notas
        .filter((n) => {
          const matchSearch = !searchTerm || (n.titulo || '').toLowerCase().includes(searchTerm.toLowerCase());
          const matchFolder =
            selectedFolderFilter === 'all' ||
            (selectedFolderFilter === 'root' ? !n.pastaId : n.pastaId === selectedFolderFilter);
          return matchSearch && matchFolder;
        })
        .map((n) => n.id)
    );
  }, [notas, searchTerm, selectedFolderFilter]);

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

      // Background subtle dark tone
      ctx.fillStyle = '#0a0a0a';
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

      // Draw Links
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
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2.0;
          ctx.shadowColor = 'rgba(255, 255, 255, 0.4)';
          ctx.shadowBlur = 6;
        } else if (isDimmed) {
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
          ctx.lineWidth = 1;
          ctx.shadowBlur = 0;
        } else {
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
          ctx.lineWidth = 1.2;
          ctx.shadowBlur = 0;
        }
        ctx.stroke();
        ctx.shadowBlur = 0;
      });

      // Draw Synapse Particles
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
          ctx.arc(px, py, 2, 0, 2 * Math.PI);
          ctx.fillStyle = '#ffffff';
          ctx.shadowColor = '#ffffff';
          ctx.shadowBlur = 4;
          ctx.fill();
          ctx.shadowBlur = 0;
        });
      }

      // Current live groups reference
      const currentGroups = groupsRef.current;

      // Draw Nodes
      nodes.forEach((node) => {
        const isFiltered = filteredNodeIds.has(node.id);
        const isHovered = hoveredNode?.id === node.id;
        const isNeighbor = activeNeighborIds.has(node.id);
        const isDimmed = (hoveredNode && !isNeighbor) || !isFiltered;

        // Resolve live node color dynamically
        const nodeColor = resolveNodeColor(node.rawNota || node, currentGroups, folderColorMap);
        node.color = nodeColor;

        // Glow ring for hovered node
        if (isHovered) {
          ctx.beginPath();
          ctx.arc(node.x, node.y, node.radius + 5, 0, 2 * Math.PI);
          ctx.fillStyle = `${nodeColor}33`;
          ctx.fill();
        }

        // Main Node circle
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, 0, 2 * Math.PI);
        ctx.fillStyle = isDimmed ? 'rgba(50, 50, 50, 0.3)' : nodeColor;
        if (isHovered || isNeighbor) {
          ctx.shadowColor = nodeColor;
          ctx.shadowBlur = 12;
        }
        ctx.fill();
        ctx.shadowBlur = 0;

        // Node border
        ctx.lineWidth = isHovered ? 2 : 1;
        ctx.strokeStyle = isHovered
          ? '#ffffff'
          : isDimmed
          ? 'rgba(255,255,255,0.06)'
          : 'rgba(255,255,255,0.5)';
        ctx.stroke();

        // Node Label
        if (transform.k > 0.65 || isHovered || isNeighbor) {
          ctx.font = `${isHovered ? '600 ' : '400 '}11px var(--font-sans, system-ui, sans-serif)`;
          ctx.textAlign = 'center';
          ctx.fillStyle = isDimmed ? 'rgba(255, 255, 255, 0.2)' : 'var(--foreground, #ffffff)';
          ctx.fillText(node.title, node.x, node.y + node.radius + 13);
        }
      });

      ctx.restore();
      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animationFrameId);
  }, [links, repulsionForce, linkDistance, transform, hoveredNode, filteredNodeIds, synapseParticlesEnabled, folderColorMap]);

  // Screen to world coordinates
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

  const activeGroupsCount = groups.filter((g) => g.enabled).length;

  return (
    <div className="relative w-full h-full flex flex-col bg-[var(--background)] select-none overflow-hidden font-sans">
      {/* Top Floating Control Bar */}
      <div className="absolute top-3 left-3 right-3 z-20 flex flex-wrap items-center justify-between gap-2.5 pointer-events-none">
        {/* Left: Search, Folder, and Groups toggle */}
        <div className="flex items-center gap-2 pointer-events-auto">
          {/* Search & Folder Pill */}
          <div className="flex items-center gap-1.5 bg-[var(--background)] border border-[var(--accents-2)] rounded-[var(--radius)] p-1 shadow-sm">
            {/* Search Input */}
            <div className="flex items-center gap-1.5 px-2 py-1 bg-[var(--accents-1)] rounded-[calc(var(--radius)-2px)] border border-[var(--accents-2)]">
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-[var(--accents-4)]"
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                placeholder="Buscar notas no grafo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-transparent border-none outline-none text-xs text-[var(--foreground)] placeholder-[var(--accents-4)] w-28 sm:w-40"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="text-[var(--accents-4)] hover:text-[var(--foreground)] text-xs"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Folder Select */}
            <select
              value={selectedFolderFilter}
              onChange={(e) => setSelectedFolderFilter(e.target.value)}
              className="bg-[var(--accents-1)] text-xs text-[var(--foreground)] border border-[var(--accents-2)] rounded-[calc(var(--radius)-2px)] px-2 py-1 outline-none cursor-pointer"
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

          {/* Groups Toggle Button */}
          <button
            type="button"
            onClick={() => setIsGroupsOpen((prev) => !prev)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-[var(--radius)] border text-xs font-medium transition-colors shadow-sm cursor-pointer ${
              isGroupsOpen
                ? 'bg-[var(--foreground)] text-[var(--background)] border-[var(--foreground)]'
                : 'bg-[var(--background)] text-[var(--accents-6)] hover:text-[var(--foreground)] border-[var(--accents-2)] hover:bg-[var(--accents-1)]'
            }`}
            title="Gerenciar Grupos de Cores do Grafo"
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="13.5" cy="6.5" r=".5" fill="currentColor" />
              <circle cx="17.5" cy="10.5" r=".5" fill="currentColor" />
              <circle cx="8.5" cy="7.5" r=".5" fill="currentColor" />
              <circle cx="6.5" cy="12.5" r=".5" fill="currentColor" />
              <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z" />
            </svg>
            <span>Grupos</span>
            {activeGroupsCount > 0 && (
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                  isGroupsOpen
                    ? 'bg-[var(--background)] text-[var(--foreground)]'
                    : 'bg-[var(--accents-2)] text-[var(--foreground)]'
                }`}
              >
                {activeGroupsCount}
              </span>
            )}
          </button>
        </div>

        {/* Right: View Controls & Stats */}
        <div className="flex items-center gap-2 bg-[var(--background)] border border-[var(--accents-2)] rounded-[var(--radius)] px-2.5 py-1.5 shadow-sm pointer-events-auto text-xs text-[var(--accents-5)]">
          <span className="text-[var(--foreground)] font-medium">{notas.length} notas</span>
          <span>•</span>
          <span className="text-[var(--foreground)] font-medium">{links.length} conexões</span>

          <div className="w-[1px] h-3.5 bg-[var(--accents-2)] mx-0.5" />

          {/* Toggle Synapse Particles */}
          <button
            type="button"
            onClick={() => setSynapseParticlesEnabled((prev) => !prev)}
            className={`px-2 py-1 rounded-[calc(var(--radius)-2px)] transition-colors flex items-center gap-1.5 cursor-pointer ${
              synapseParticlesEnabled
                ? 'bg-[var(--accents-2)] text-[var(--foreground)] font-medium'
                : 'text-[var(--accents-4)] hover:text-[var(--foreground)]'
            }`}
            title="Efeito Sinapse: partículas de energia fluindo nas conexões"
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
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
            </svg>
            <span className="hidden sm:inline">Sinapses</span>
          </button>

          {/* Reset Zoom */}
          <button
            type="button"
            onClick={handleResetView}
            className="px-2 py-1 rounded-[calc(var(--radius)-2px)] text-[var(--accents-4)] hover:text-[var(--foreground)] hover:bg-[var(--accents-1)] transition-colors cursor-pointer"
            title="Recentralizar visualização"
          >
            Recentralizar
          </button>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="w-5 h-5 flex items-center justify-center rounded-[calc(var(--radius)-2px)] text-[var(--accents-4)] hover:text-[var(--foreground)] hover:bg-[var(--accents-2)] transition-colors ml-0.5 cursor-pointer"
              title="Fechar Grafo"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Retractable Floating Color Groups Manager Panel (Geist Minimalist Theme) */}
      {isGroupsOpen && (
        <div className="absolute top-14 left-3 z-30 w-[350px] sm:w-[390px] max-h-[calc(100vh-120px)] bg-[var(--background)] border border-[var(--accents-2)] rounded-[var(--radius)] shadow-xl flex flex-col overflow-hidden animate-in fade-in duration-100">
          {/* Panel Header */}
          <div className="p-3 px-3.5 border-b border-[var(--accents-2)] bg-[var(--accents-1)] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-[var(--foreground)]"
              >
                <circle cx="13.5" cy="6.5" r=".5" fill="currentColor" />
                <circle cx="17.5" cy="10.5" r=".5" fill="currentColor" />
                <circle cx="8.5" cy="7.5" r=".5" fill="currentColor" />
                <circle cx="6.5" cy="12.5" r=".5" fill="currentColor" />
                <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z" />
              </svg>
              <h3 className="text-xs font-semibold text-[var(--foreground)] tracking-tight">
                Grupos de Cores
              </h3>
              <span className="text-[10px] text-[var(--accents-4)] font-mono">
                ({groups.length})
              </span>
              {saveStatus === 'saving' && (
                <span className="text-[10px] text-[var(--accents-4)]">Salvando...</span>
              )}
              {saveStatus === 'saved' && (
                <span className="text-[10px] text-[var(--foreground)]">✓ Salvo</span>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleAddGroup}
                className="px-2 py-1 bg-[var(--foreground)] text-[var(--background)] hover:opacity-90 rounded-[calc(var(--radius)-2px)] text-xs font-medium transition-opacity flex items-center gap-1 cursor-pointer"
              >
                <svg
                  width="11"
                  height="11"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                <span>Novo Grupo</span>
              </button>
              <button
                type="button"
                onClick={() => setIsGroupsOpen(false)}
                className="w-5 h-5 flex items-center justify-center rounded text-[var(--accents-4)] hover:text-[var(--foreground)] hover:bg-[var(--accents-2)] text-xs transition-colors cursor-pointer"
                title="Fechar painel"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Groups List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2 max-h-[50vh] no-scrollbar">
            {groups.length === 0 ? (
              <div className="py-6 px-4 text-center">
                <p className="text-xs text-[var(--foreground)] mb-1 font-medium">
                  Nenhum grupo de cores configurado
                </p>
                <p className="text-[11px] text-[var(--accents-4)] mb-3 leading-relaxed">
                  Crie regras para colorir notas por pasta, tags (#), palavras-chave ou tipo de nota.
                </p>
                <button
                  type="button"
                  onClick={handleAddGroup}
                  className="px-3 py-1.5 bg-[var(--foreground)] text-[var(--background)] hover:opacity-90 text-xs font-medium rounded-[var(--radius)] transition-opacity cursor-pointer inline-flex items-center gap-1.5"
                >
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                  >
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  <span>Adicionar Primeiro Grupo</span>
                </button>
              </div>
            ) : (
              groups.map((group, index) => {
                const matchCount = groupMatchCounts[group.id] || 0;
                const isColorPickerOpen = activeColorPickerGroupId === group.id;

                return (
                  <div
                    key={group.id}
                    className={`p-2.5 rounded-[var(--radius)] border transition-all ${
                      group.enabled
                        ? 'bg-[var(--accents-1)] border-[var(--accents-2)]'
                        : 'bg-[var(--background)] border-[var(--accents-2)] opacity-50'
                    }`}
                  >
                    {/* Top Row: Reorder, Enabled Toggle, Color Swatch, Criteria, Match count, Delete */}
                    <div className="flex items-center gap-2 mb-2">
                      {/* Reorder Buttons */}
                      <div className="flex flex-col gap-0.5">
                        <button
                          type="button"
                          disabled={index === 0}
                          onClick={() => handleMoveGroup(index, 'up')}
                          className="w-3.5 h-3 flex items-center justify-center text-[9px] text-[var(--accents-4)] hover:text-[var(--foreground)] disabled:opacity-20 disabled:hover:text-[var(--accents-4)] cursor-pointer"
                          title="Mover para cima"
                        >
                          ▲
                        </button>
                        <button
                          type="button"
                          disabled={index === groups.length - 1}
                          onClick={() => handleMoveGroup(index, 'down')}
                          className="w-3.5 h-3 flex items-center justify-center text-[9px] text-[var(--accents-4)] hover:text-[var(--foreground)] disabled:opacity-20 disabled:hover:text-[var(--accents-4)] cursor-pointer"
                          title="Mover para baixo"
                        >
                          ▼
                        </button>
                      </div>

                      {/* Enable Checkbox */}
                      <input
                        type="checkbox"
                        checked={group.enabled}
                        onChange={(e) => handleUpdateGroup(group.id, { enabled: e.target.checked })}
                        className="rounded cursor-pointer w-3.5 h-3.5"
                        title={group.enabled ? 'Desativar grupo' : 'Ativar grupo'}
                      />

                      {/* Color Swatch Circle */}
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() =>
                            setActiveColorPickerGroupId((prev) =>
                              prev === group.id ? null : group.id
                            )
                          }
                          className="w-5 h-5 rounded-full border border-[var(--accents-2)] flex items-center justify-center cursor-pointer transition-transform hover:scale-105"
                          style={{ backgroundColor: group.color }}
                          title="Alterar cor do grupo"
                        />

                        {/* Color Picker Palette Popover */}
                        {isColorPickerOpen && (
                          <div className="absolute top-7 left-0 z-50 p-2.5 bg-[var(--background)] border border-[var(--accents-2)] rounded-[var(--radius)] shadow-2xl w-48 animate-in fade-in duration-75">
                            <div className="text-[10px] font-medium text-[var(--accents-4)] mb-1.5 uppercase tracking-wider">
                              Paleta de Cores
                            </div>
                            <div className="grid grid-cols-6 gap-1.5 mb-2.5">
                              {PRESET_GROUP_COLORS.map((c) => (
                                <button
                                  key={c}
                                  type="button"
                                  onClick={() => {
                                    handleUpdateGroup(group.id, { color: c });
                                    setActiveColorPickerGroupId(null);
                                  }}
                                  className={`w-5 h-5 rounded-full border cursor-pointer transition-transform hover:scale-110 ${
                                    group.color.toLowerCase() === c.toLowerCase()
                                      ? 'border-[var(--foreground)] ring-2 ring-[var(--foreground)]/20 scale-105'
                                      : 'border-transparent'
                                  }`}
                                  style={{ backgroundColor: c }}
                                />
                              ))}
                            </div>
                            <div className="flex items-center gap-1.5 pt-2 border-t border-[var(--accents-2)]">
                              <span className="text-[10px] text-[var(--accents-4)]">Hex</span>
                              <input
                                type="color"
                                value={group.color}
                                onChange={(e) => handleUpdateGroup(group.id, { color: e.target.value })}
                                className="w-5 h-5 p-0 bg-transparent border-0 rounded cursor-pointer"
                              />
                              <input
                                type="text"
                                value={group.color}
                                onChange={(e) => handleUpdateGroup(group.id, { color: e.target.value })}
                                className="bg-[var(--accents-1)] text-[11px] text-[var(--foreground)] px-1.5 py-0.5 rounded border border-[var(--accents-2)] w-20 font-mono"
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Criteria Type Dropdown */}
                      <select
                        value={group.ruleType}
                        onChange={(e) => {
                          const newType = e.target.value as GroupRuleType;
                          let defaultVal = '';
                          if (newType === 'pasta') defaultVal = pastas[0]?.id || 'root';
                          if (newType === 'tipo') defaultVal = 'texto';
                          handleUpdateGroup(group.id, { ruleType: newType, ruleValue: defaultVal });
                        }}
                        className="bg-[var(--background)] text-xs text-[var(--foreground)] border border-[var(--accents-2)] rounded-[calc(var(--radius)-2px)] px-2 py-1 outline-none cursor-pointer flex-1"
                      >
                        <option value="pasta">Pasta</option>
                        <option value="tag">Tag (#)</option>
                        <option value="titulo">Título contém</option>
                        <option value="conteudo">Conteúdo contém</option>
                        <option value="tipo">Tipo de nota</option>
                      </select>

                      {/* Match Count Badge */}
                      <span
                        className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--accents-2)] text-[var(--accents-6)] whitespace-nowrap"
                        title={`${matchCount} notas correspondem`}
                      >
                        {matchCount} {matchCount === 1 ? 'nota' : 'notas'}
                      </span>

                      {/* Delete Button */}
                      <button
                        type="button"
                        onClick={() => handleDeleteGroup(group.id)}
                        className="w-5 h-5 flex items-center justify-center text-[var(--accents-4)] hover:text-red-500 hover:bg-[var(--accents-2)] rounded transition-colors text-xs cursor-pointer"
                        title="Excluir grupo"
                      >
                        ✕
                      </button>
                    </div>

                    {/* Bottom Row: Rule Value Input */}
                    <div className="pl-6">
                      {group.ruleType === 'pasta' ? (
                        <select
                          value={group.ruleValue || (pastas[0]?.id || 'root')}
                          onChange={(e) => handleUpdateGroup(group.id, { ruleValue: e.target.value })}
                          className="w-full bg-[var(--background)] text-xs text-[var(--foreground)] border border-[var(--accents-2)] rounded-[calc(var(--radius)-2px)] px-2 py-1 outline-none cursor-pointer"
                        >
                          <option value="root">Sem Pasta (Raiz)</option>
                          {pastas.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.nome}
                            </option>
                          ))}
                        </select>
                      ) : group.ruleType === 'tipo' ? (
                        <select
                          value={group.ruleValue || 'texto'}
                          onChange={(e) => handleUpdateGroup(group.id, { ruleValue: e.target.value })}
                          className="w-full bg-[var(--background)] text-xs text-[var(--foreground)] border border-[var(--accents-2)] rounded-[calc(var(--radius)-2px)] px-2 py-1 outline-none cursor-pointer"
                        >
                          <option value="texto">Nota de Texto</option>
                          <option value="desenho">Nota de Desenho / Canvas</option>
                        </select>
                      ) : group.ruleType === 'tag' ? (
                        <div className="relative flex items-center">
                          <span className="absolute left-2 text-xs text-[var(--accents-4)] font-mono">
                            #
                          </span>
                          <input
                            type="text"
                            placeholder="nome-da-tag"
                            value={(group.ruleValue || '').replace(/^#/, '')}
                            onChange={(e) =>
                              handleUpdateGroup(group.id, {
                                ruleValue: e.target.value.replace(/^#/, ''),
                              })
                            }
                            className="w-full bg-[var(--background)] text-xs text-[var(--foreground)] placeholder-[var(--accents-4)] border border-[var(--accents-2)] rounded-[calc(var(--radius)-2px)] pl-5 pr-2 py-1 outline-none focus:border-[var(--accents-5)] transition-colors"
                          />
                        </div>
                      ) : group.ruleType === 'titulo' ? (
                        <input
                          type="text"
                          placeholder="Termo no título..."
                          value={group.ruleValue || ''}
                          onChange={(e) => handleUpdateGroup(group.id, { ruleValue: e.target.value })}
                          className="w-full bg-[var(--background)] text-xs text-[var(--foreground)] placeholder-[var(--accents-4)] border border-[var(--accents-2)] rounded-[calc(var(--radius)-2px)] px-2 py-1 outline-none focus:border-[var(--accents-5)] transition-colors"
                        />
                      ) : (
                        <input
                          type="text"
                          placeholder="Termo no conteúdo..."
                          value={group.ruleValue || ''}
                          onChange={(e) => handleUpdateGroup(group.id, { ruleValue: e.target.value })}
                          className="w-full bg-[var(--background)] text-xs text-[var(--foreground)] placeholder-[var(--accents-4)] border border-[var(--accents-2)] rounded-[calc(var(--radius)-2px)] px-2 py-1 outline-none focus:border-[var(--accents-5)] transition-colors"
                        />
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Panel Footer */}
          {groups.length > 0 && (
            <div className="p-2.5 px-3.5 bg-[var(--accents-1)] border-t border-[var(--accents-2)] flex items-center justify-between text-[11px] text-[var(--accents-4)]">
              <span>Notas sem grupo: <strong className="text-[var(--accents-5)] font-normal">Cinza Neutro</strong></span>
              <button
                type="button"
                onClick={handleAddGroup}
                className="text-[var(--foreground)] hover:underline cursor-pointer font-medium"
              >
                + Outro grupo
              </button>
            </div>
          )}
        </div>
      )}

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

      {/* Side Preview Card */}
      {hoveredNode && hoveredNode.rawNota && (
        <div
          className="animate-in fade-in duration-100 fixed md:absolute bottom-3 md:bottom-16 left-3 md:left-auto right-3 md:right-4 top-auto md:top-16 md:w-[320px] max-h-[60vh] md:max-h-none"
          style={{
            background: 'var(--background)',
            border: '1px solid var(--accents-2)',
            borderRadius: 'var(--radius)',
            boxShadow: '0 16px 36px rgba(0, 0, 0, 0.35)',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 30,
            overflow: 'hidden',
            pointerEvents: 'none',
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '12px 16px',
              borderBottom: '1px solid var(--accents-2)',
              background: 'var(--accents-1)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '6px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: hoveredNode.color,
                    display: 'inline-block',
                  }}
                />
                <span style={{ fontSize: '11px', color: 'var(--accents-4)', fontWeight: 500 }}>
                  {hoveredNode.folderName}
                </span>
              </div>
              <span style={{ fontSize: '10px', color: 'var(--accents-4)', fontFamily: 'var(--font-mono)' }}>
                {hoveredNode.connectionsCount}{' '}
                {hoveredNode.connectionsCount === 1 ? 'conexão' : 'conexões'}
              </span>
            </div>

            <h3
              style={{
                margin: 0,
                fontSize: '14px',
                fontWeight: 600,
                color: 'var(--foreground)',
                letterSpacing: '-0.02em',
                lineHeight: '1.4',
              }}
            >
              {hoveredNode.title || 'Sem Título'}
            </h3>
          </div>

          {/* Content Preview Surface */}
          <div
            style={{ flex: 1, padding: '14px 16px', overflowY: 'auto' }}
            className="no-scrollbar"
          >
            {hoveredNode.rawNota.tipo === 'desenho' ? (
              <div>
                <GraphDrawingPreview conteudoJson={hoveredNode.rawNota.conteudo} />
                <p
                  style={{
                    fontSize: '11px',
                    color: 'var(--accents-4)',
                    textAlign: 'center',
                    marginTop: '10px',
                  }}
                >
                  Nota de Desenho / Canvas
                </p>
              </div>
            ) : hoveredNode.rawNota.conteudo && hoveredNode.rawNota.conteudo.trim() ? (
              <div
                className="notion-editor text-[13px] leading-[1.6] text-[var(--foreground)]"
                dangerouslySetInnerHTML={{ __html: hoveredNode.rawNota.conteudo }}
                style={{ wordBreak: 'break-word', userSelect: 'none', pointerEvents: 'none' }}
              />
            ) : (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '100%',
                  color: 'var(--accents-4)',
                  fontSize: '12px',
                  fontStyle: 'italic',
                }}
              >
                Nota vazia
              </div>
            )}
          </div>

          {/* Footer */}
          <div
            style={{
              padding: '8px 16px',
              borderTop: '1px solid var(--accents-2)',
              background: 'var(--accents-1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span style={{ fontSize: '11px', color: 'var(--accents-4)' }}>Pré-visualização</span>
            <span style={{ fontSize: '11px', color: 'var(--accents-4)' }}>Clique no nó para abrir</span>
          </div>
        </div>
      )}

      {/* Bottom Right Physics Sliders */}
      <div className="absolute bottom-3 right-3 z-20 hidden md:flex items-center gap-3.5 bg-[var(--background)] border border-[var(--accents-2)] rounded-[var(--radius)] px-3 py-1.5 shadow-sm text-xs text-[var(--accents-4)]">
        <div className="flex items-center gap-2">
          <span>Repulsão</span>
          <input
            type="range"
            min="100"
            max="600"
            value={repulsionForce}
            onChange={(e) => setRepulsionForce(Number(e.target.value))}
            className="w-16 accent-[var(--foreground)] cursor-pointer"
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
            className="w-16 accent-[var(--foreground)] cursor-pointer"
          />
        </div>
      </div>
    </div>
  );
}
