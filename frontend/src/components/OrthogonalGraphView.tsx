'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
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

interface OrthogonalGraphViewProps {
  notas: NoteItem[];
  pastas?: any[];
  activeWorkspace?: any;
  onOpenNota: (nota: NoteItem) => void;
}

interface GraphLink {
  source: string;
  target: string;
}

const NODE_SIZE = 16; // Tamanho do pequeno quadrado cinza (16x16px)
const HITBOX_SIZE = 38; // Área ampla de hover e clique (38x38px) para interação suave

export default function OrthogonalGraphView({
  notas = [],
  pastas = [],
  onOpenNota,
}: OrthogonalGraphViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Transform / Canvas Viewport
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  // Posições dos nós
  const [nodePositions, setNodePositions] = useState<Record<string, { x: number; y: number }>>({});
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // Hover
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

  // 1. Extração de conexões entre as notas (Wikilinks [[...]] e data-note-id)
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

      // Match [[Title]]
      const wikiRegex = /\[\[(.*?)\]\]/g;
      while ((m = wikiRegex.exec(content)) !== null) {
        const targetTitle = m[1].toLowerCase().trim();
        const targetId = titleToIdMap.get(targetTitle);
        if (targetId && targetId !== sourceNota.id) {
          extracted.push({ source: sourceNota.id, target: targetId });
        }
      }
    });

    // Fallback: conecta notas da mesma pasta caso não haja links explícitos
    if (extracted.length === 0 && notas.length > 1) {
      const folderGroups: Record<string, string[]> = {};
      notas.forEach((n) => {
        const fId = n.pastaId || 'root';
        if (!folderGroups[fId]) folderGroups[fId] = [];
        folderGroups[fId].push(n.id);
      });

      Object.values(folderGroups).forEach((groupNoteIds) => {
        for (let i = 0; i < groupNoteIds.length - 1; i++) {
          extracted.push({ source: groupNoteIds[i], target: groupNoteIds[i + 1] });
        }
      });
    }

    // Deduplicação
    const uniqueMap = new Map<string, GraphLink>();
    extracted.forEach((l) => {
      const key = `${l.source}__${l.target}`;
      const revKey = `${l.target}__${l.source}`;
      if (!uniqueMap.has(key) && !uniqueMap.has(revKey)) {
        uniqueMap.set(key, l);
      }
    });

    return Array.from(uniqueMap.values());
  }, [notas]);

  // Contagem de conexões por nota
  const connectionCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    links.forEach((l) => {
      counts[l.source] = (counts[l.source] || 0) + 1;
      counts[l.target] = (counts[l.target] || 0) + 1;
    });
    return counts;
  }, [links]);

  // Nós conectados ao nó sob hover
  const connectedNodeIds = useMemo(() => {
    if (!hoveredNodeId) return new Set<string>();
    const set = new Set<string>();
    set.add(hoveredNodeId);
    links.forEach((l) => {
      if (l.source === hoveredNodeId) set.add(l.target);
      if (l.target === hoveredNodeId) set.add(l.source);
    });
    return set;
  }, [hoveredNodeId, links]);

  // Nota atualmente sob hover
  const hoveredNota = useMemo(() => {
    if (!hoveredNodeId) return null;
    return notas.find((n) => n.id === hoveredNodeId) || null;
  }, [hoveredNodeId, notas]);

  // Posição calculada na tela do nó sob hover (para renderização precisa da prévia grande)
  const hoveredScreenCoords = useMemo(() => {
    if (!hoveredNodeId || !nodePositions[hoveredNodeId]) return null;
    const pos = nodePositions[hoveredNodeId];
    const screenX = transform.x + (pos.x + NODE_SIZE / 2) * transform.scale;
    const screenY = transform.y + (pos.y + NODE_SIZE / 2) * transform.scale;
    return { screenX, screenY };
  }, [hoveredNodeId, nodePositions, transform]);

  // Lista de todos os IDs de notas para checagem rápida de colisão
  const allNoteIds = useMemo(() => notas.map((n) => n.id), [notas]);

  // 2. Cálculo do Layout Inteligente: Evita cruzamento de linhas e afasta nós isolados das ligações
  useEffect(() => {
    if (!notas || notas.length === 0) return;

    setNodePositions((prev) => {
      // Se todas as posições já existem e nenhuma nota foi adicionada/removida, preserva
      const currentIds = Object.keys(prev);
      const noteIds = notas.map((n) => n.id);
      const isSameSet =
        currentIds.length === noteIds.length &&
        noteIds.every((id) => prev[id] !== undefined);

      if (isSameSet && currentIds.length > 0) {
        return prev;
      }

      // 1. Mapeamento de adjacência e graus de conexão
      const adj = new Map<string, Set<string>>();
      const degrees = new Map<string, number>();
      notas.forEach((n) => {
        adj.set(n.id, new Set());
        degrees.set(n.id, 0);
      });

      links.forEach((l) => {
        if (adj.has(l.source) && adj.has(l.target) && l.source !== l.target) {
          adj.get(l.source)!.add(l.target);
          adj.get(l.target)!.add(l.source);
          degrees.set(l.source, (degrees.get(l.source) || 0) + 1);
          degrees.set(l.target, (degrees.get(l.target) || 0) + 1);
        }
      });

      // 2. Separação de Componentes Conectados vs Nós Isolados
      const visited = new Set<string>();
      const connectedComponents: string[][] = [];
      const isolatedNodes: string[] = [];

      notas.forEach((n) => {
        const deg = degrees.get(n.id) || 0;
        if (deg === 0) {
          isolatedNodes.push(n.id);
          visited.add(n.id);
        }
      });

      notas.forEach((n) => {
        if (!visited.has(n.id)) {
          const comp: string[] = [];
          const queue = [n.id];
          visited.add(n.id);

          while (queue.length > 0) {
            const curr = queue.shift()!;
            comp.push(curr);
            const neighbors = adj.get(curr) || new Set();
            neighbors.forEach((nbr) => {
              if (!visited.has(nbr)) {
                visited.add(nbr);
                queue.push(nbr);
              }
            });
          }
          connectedComponents.push(comp);
        }
      });

      const nextPositions: Record<string, { x: number; y: number }> = {};

      // 3. Layout de cada Componente Conectado (Hierarquia BFS + Relaxação Planar sem Cruzamentos)
      const componentLayouts: {
        nodeIds: string[];
        positions: Record<string, { x: number; y: number }>;
        width: number;
        height: number;
      }[] = [];

      connectedComponents.forEach((comp) => {
        const compPositions: Record<string, { x: number; y: number }> = {};
        const compLinks = links.filter(
          (l) => comp.includes(l.source) && comp.includes(l.target)
        );

        if (comp.length === 2) {
          compPositions[comp[0]] = { x: -80, y: 0 };
          compPositions[comp[1]] = { x: 80, y: 0 };
        } else {
          // Escolhe o nó com mais conexões como raiz da árvore BFS
          const root = comp.reduce(
            (maxNode, node) =>
              (degrees.get(node) || 0) > (degrees.get(maxNode) || 0)
                ? node
                : maxNode,
            comp[0]
          );

          const levelMap = new Map<string, number>();
          const order: string[] = [];
          const q: { id: string; lvl: number }[] = [{ id: root, lvl: 0 }];
          const seen = new Set<string>([root]);

          while (q.length > 0) {
            const { id, lvl } = q.shift()!;
            levelMap.set(id, lvl);
            order.push(id);
            const nbrs = Array.from(adj.get(id) || []);
            nbrs.forEach((nbr) => {
              if (!seen.has(nbr) && comp.includes(nbr)) {
                seen.add(nbr);
                q.push({ id: nbr, lvl: lvl + 1 });
              }
            });
          }

          // Distribuição inicial por níveis
          const levelGroups: Record<number, string[]> = {};
          order.forEach((id) => {
            const lvl = levelMap.get(id) || 0;
            if (!levelGroups[lvl]) levelGroups[lvl] = [];
            levelGroups[lvl].push(id);
          });

          Object.entries(levelGroups).forEach(([lvlStr, group]) => {
            const lvl = Number(lvlStr);
            const count = group.length;
            group.forEach((id, idx) => {
              const x = (idx - (count - 1) / 2) * 150;
              const y = lvl * 130;
              compPositions[id] = { x, y };
            });
          });

          // Simulação de forças para evitar cruzamento de linhas e colisões
          const iterations = 80;
          const kRepulse = 18000;
          const kSpring = 0.06;
          const idealLength = 140;

          for (let iter = 0; iter < iterations; iter++) {
            const forces: Record<string, { fx: number; fy: number }> = {};
            comp.forEach((id) => (forces[id] = { fx: 0, fy: 0 }));

            // Repulsão entre pares de nós
            for (let i = 0; i < comp.length; i++) {
              for (let j = i + 1; j < comp.length; j++) {
                const id1 = comp[i];
                const id2 = comp[j];
                const p1 = compPositions[id1];
                const p2 = compPositions[id2];
                const dx = p2.x - p1.x;
                const dy = p2.y - p1.y;
                const dist = Math.sqrt(dx * dx + dy * dy) || 1;
                const f = kRepulse / (dist * dist);
                const fx = (dx / dist) * f;
                const fy = (dy / dist) * f;

                forces[id1].fx -= fx;
                forces[id1].fy -= fy;
                forces[id2].fx += fx;
                forces[id2].fy += fy;
              }
            }

            // Atração tipo mola nas conexões existentes
            compLinks.forEach((l) => {
              const p1 = compPositions[l.source];
              const p2 = compPositions[l.target];
              if (!p1 || !p2) return;
              const dx = p2.x - p1.x;
              const dy = p2.y - p1.y;
              const dist = Math.sqrt(dx * dx + dy * dy) || 1;
              const delta = dist - idealLength;
              const f = kSpring * delta;
              const fx = (dx / dist) * f;
              const fy = (dy / dist) * f;

              forces[l.source].fx += fx;
              forces[l.source].fy += fy;
              forces[l.target].fx -= fx;
              forces[l.target].fy -= fy;
            });

            // Repulsão de nós contra segmentos de linha (evita nós em cima/perto de linhas)
            comp.forEach((nodeId) => {
              const np = compPositions[nodeId];
              compLinks.forEach((l) => {
                if (l.source === nodeId || l.target === nodeId) return;
                const p1 = compPositions[l.source];
                const p2 = compPositions[l.target];
                if (!p1 || !p2) return;

                const segDx = p2.x - p1.x;
                const segDy = p2.y - p1.y;
                const segLenSq = segDx * segDx + segDy * segDy || 1;
                const t = Math.max(
                  0,
                  Math.min(
                    1,
                    ((np.x - p1.x) * segDx + (np.y - p1.y) * segDy) / segLenSq
                  )
                );
                const projX = p1.x + t * segDx;
                const projY = p1.y + t * segDy;
                const distDx = np.x - projX;
                const distDy = np.y - projY;
                const dist = Math.sqrt(distDx * distDx + distDy * distDy) || 1;

                if (dist < 80) {
                  const f = (80 - dist) * 1.5;
                  forces[nodeId].fx += (distDx / dist) * f;
                  forces[nodeId].fy += (distDy / dist) * f;
                }
              });
            });

            // Aplicação com amortecimento
            const damping = Math.max(0.2, 1 - iter / iterations);
            comp.forEach((id) => {
              compPositions[id].x += Math.max(
                -25,
                Math.min(25, forces[id].fx * damping)
              );
              compPositions[id].y += Math.max(
                -25,
                Math.min(25, forces[id].fy * damping)
              );
            });
          }
        }

        // Medição e centralização do componente
        let minX = Infinity,
          maxX = -Infinity,
          minY = Infinity,
          maxY = -Infinity;
        comp.forEach((id) => {
          const p = compPositions[id];
          minX = Math.min(minX, p.x);
          maxX = Math.max(maxX, p.x);
          minY = Math.min(minY, p.y);
          maxY = Math.max(maxY, p.y);
        });

        const width = Math.max(60, maxX - minX);
        const height = Math.max(60, maxY - minY);
        const centerX = (minX + maxX) / 2;
        const centerY = (minY + maxY) / 2;

        comp.forEach((id) => {
          compPositions[id].x = Math.round(compPositions[id].x - centerX);
          compPositions[id].y = Math.round(compPositions[id].y - centerY);
        });

        componentLayouts.push({
          nodeIds: comp,
          positions: compPositions,
          width,
          height,
        });
      });

      // 4. Posicionamento dos Componentes Conectados na Área Central
      let compMinX = Infinity,
        compMaxX = -Infinity,
        compMinY = Infinity,
        compMaxY = -Infinity;

      if (componentLayouts.length === 1) {
        const c = componentLayouts[0];
        c.nodeIds.forEach((id) => {
          nextPositions[id] = { ...c.positions[id] };
          compMinX = Math.min(compMinX, nextPositions[id].x);
          compMaxX = Math.max(compMaxX, nextPositions[id].x);
          compMinY = Math.min(compMinY, nextPositions[id].y);
          compMaxY = Math.max(compMaxY, nextPositions[id].y);
        });
      } else if (componentLayouts.length > 1) {
        const cols = Math.ceil(Math.sqrt(componentLayouts.length));
        let curX = 0;
        let curY = 0;
        let rowMaxH = 0;

        componentLayouts.forEach((c, idx) => {
          if (idx > 0 && idx % cols === 0) {
            curX = 0;
            curY += rowMaxH + 260;
            rowMaxH = 0;
          }

          const offsetX = curX + c.width / 2;
          const offsetY = curY + c.height / 2;

          c.nodeIds.forEach((id) => {
            nextPositions[id] = {
              x: Math.round(c.positions[id].x + offsetX),
              y: Math.round(c.positions[id].y + offsetY),
            };
            compMinX = Math.min(compMinX, nextPositions[id].x);
            compMaxX = Math.max(compMaxX, nextPositions[id].x);
            compMinY = Math.min(compMinY, nextPositions[id].y);
            compMaxY = Math.max(compMaxY, nextPositions[id].y);
          });

          curX += c.width + 260;
          rowMaxH = Math.max(rowMaxH, c.height);
        });

        // Re-centraliza todos os componentes
        const totalW = compMaxX - compMinX || 1;
        const totalH = compMaxY - compMinY || 1;
        const shiftX = Math.round(compMinX + totalW / 2);
        const shiftY = Math.round(compMinY + totalH / 2);

        connectedComponents.forEach((comp) => {
          comp.forEach((id) => {
            nextPositions[id].x -= shiftX;
            nextPositions[id].y -= shiftY;
          });
        });

        compMinX -= shiftX;
        compMaxX -= shiftX;
        compMinY -= shiftY;
        compMaxY -= shiftY;
      }

      // 5. Posicionamento de Nós Isolados (0 conexões) BEM DISTANTES das linhas e clusters
      if (isolatedNodes.length > 0) {
        const totalIsolated = isolatedNodes.length;

        if (connectedComponents.length === 0) {
          // Sem conexões: constelação espaçada e orgânica
          const cols = Math.ceil(Math.sqrt(totalIsolated * 1.3));
          isolatedNodes.forEach((id, idx) => {
            const col = idx % cols;
            const row = Math.floor(idx / cols);

            let hash = 0;
            for (let i = 0; i < id.length; i++) {
              hash = (hash * 31 + id.charCodeAt(i)) % 10007;
            }

            const jitterX = (hash % 30) - 15;
            const jitterY = ((hash * 7) % 30) - 15;

            const posX = (col - (cols - 1) / 2) * 130 + jitterX;
            const posY =
              (row - Math.floor((totalIsolated - 1) / cols) / 2) * 130 +
              jitterY;

            nextPositions[id] = {
              x: Math.round(posX),
              y: Math.round(posY),
            };
          });
        } else {
          // Há conexões: nós isolados são colocados num anel orbital externo com distância segura >= 280px
          const compRadius = Math.max(
            Math.max(Math.abs(compMinX), Math.abs(compMaxX)),
            Math.max(Math.abs(compMinY), Math.abs(compMaxY))
          );
          const safeOrbitRadius = compRadius + 280;

          isolatedNodes.forEach((id, idx) => {
            let hash = 0;
            for (let i = 0; i < id.length; i++) {
              hash = (hash * 37 + id.charCodeAt(i)) % 10009;
            }

            const angle = (idx / totalIsolated) * 2 * Math.PI + 0.3;
            const rJitter = (hash % 60) - 30;
            const r = safeOrbitRadius + rJitter;

            const posX = Math.cos(angle) * r;
            const posY = Math.sin(angle) * r;

            nextPositions[id] = {
              x: Math.round(posX),
              y: Math.round(posY),
            };
          });
        }
      }

      return nextPositions;
    });
  }, [notas, links]);

  // 3. Centralização inicial
  useEffect(() => {
    if (containerRef.current) {
      const { clientWidth, clientHeight } = containerRef.current;
      setTransform({
        x: clientWidth / 2,
        y: clientHeight / 2,
        scale: 1,
      });
    }
  }, []);

  // 4. Zoom com scroll
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
    setTransform((prev) => ({
      ...prev,
      scale: Math.min(Math.max(prev.scale * zoomFactor, 0.3), 3),
    }));
  };

  // 5. Pan do Canvas
  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (e.target !== containerRef.current) return;
    setIsPanning(true);
    setPanStart({ x: e.clientX - transform.x, y: e.clientY - transform.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      setTransform((prev) => ({
        ...prev,
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y,
      }));
    } else if (draggingNodeId) {
      const newX = (e.clientX - transform.x) / transform.scale - dragOffset.x;
      const newY = (e.clientY - transform.y) / transform.scale - dragOffset.y;

      setNodePositions((prev) => ({
        ...prev,
        [draggingNodeId]: { x: newX, y: newY },
      }));
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
    setDraggingNodeId(null);
  };

  // 6. Arrastar quadrado
  const handleNodeMouseDown = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    const pos = nodePositions[nodeId] || { x: 0, y: 0 };
    const mouseCanvasX = (e.clientX - transform.x) / transform.scale;
    const mouseCanvasY = (e.clientY - transform.y) / transform.scale;

    setDraggingNodeId(nodeId);
    setDragOffset({
      x: mouseCanvasX - pos.x,
      y: mouseCanvasY - pos.y,
    });
  };

  // 7. Roteamento Ortogonal Inteligente (linhas retas 90 graus sem colisões com outros nós)
  const calculateOrthogonalPath = useCallback(
    (sourceId: string, targetId: string) => {
      const p1 = nodePositions[sourceId];
      const p2 = nodePositions[targetId];
      if (!p1 || !p2) return null;

      const c1X = p1.x + NODE_SIZE / 2;
      const c1Y = p1.y + NODE_SIZE / 2;
      const c2X = p2.x + NODE_SIZE / 2;
      const c2Y = p2.y + NODE_SIZE / 2;

      const dx = c2X - c1X;
      const dy = c2Y - c1Y;

      // Linha 100% reta se os eixos estiverem alinhados
      if (Math.abs(dx) < 6) {
        const startY = dy > 0 ? p1.y + NODE_SIZE : p1.y;
        const endY = dy > 0 ? p2.y : p2.y + NODE_SIZE;
        return `M ${c1X} ${startY} V ${endY}`;
      }
      if (Math.abs(dy) < 6) {
        const startX = dx > 0 ? p1.x + NODE_SIZE : p1.x;
        const endX = dx > 0 ? p2.x : p2.x + NODE_SIZE;
        return `M ${startX} ${c1Y} H ${endX}`;
      }

      const isHorizDominant = Math.abs(dx) >= Math.abs(dy);

      if (isHorizDominant) {
        // Saída e entrada horizontal
        const startX = dx > 0 ? p1.x + NODE_SIZE : p1.x;
        const startY = c1Y;
        const endX = dx > 0 ? p2.x : p2.x + NODE_SIZE;
        const endY = c2Y;

        let bestMidX = (startX + endX) / 2;
        const padding = NODE_SIZE + 14;

        // Função de checagem de colisão com outros nós no trajeto
        const hasCollision = (mx: number) => {
          for (let i = 0; i < allNoteIds.length; i++) {
            const id = allNoteIds[i];
            if (id === sourceId || id === targetId) continue;
            const pos = nodePositions[id];
            if (!pos) continue;
            const nx = pos.x + NODE_SIZE / 2;
            const ny = pos.y + NODE_SIZE / 2;

            const minY = Math.min(startY, endY) - padding;
            const maxY = Math.max(startY, endY) + padding;
            if (Math.abs(nx - mx) < padding && ny >= minY && ny <= maxY) {
              return true;
            }

            const minX1 = Math.min(startX, mx) - padding;
            const maxX1 = Math.max(startX, mx) + padding;
            if (Math.abs(ny - startY) < padding && nx >= minX1 && nx <= maxX1) {
              return true;
            }

            const minX2 = Math.min(mx, endX) - padding;
            const maxX2 = Math.max(mx, endX) + padding;
            if (Math.abs(ny - endY) < padding && nx >= minX2 && nx <= maxX2) {
              return true;
            }
          }
          return false;
        };

        if (hasCollision(bestMidX)) {
          const minAllowed = Math.min(startX, endX) + 12;
          const maxAllowed = Math.max(startX, endX) - 12;
          const offsets = [24, -24, 48, -48, 72, -72];
          for (const off of offsets) {
            const testX = bestMidX + off;
            if (
              testX >= minAllowed &&
              testX <= maxAllowed &&
              !hasCollision(testX)
            ) {
              bestMidX = testX;
              break;
            }
          }
        }

        return `M ${startX} ${startY} H ${bestMidX} V ${endY} H ${endX}`;
      } else {
        // Saída e entrada vertical
        const startX = c1X;
        const startY = dy > 0 ? p1.y + NODE_SIZE : p1.y;
        const endX = c2X;
        const endY = dy > 0 ? p2.y : p2.y + NODE_SIZE;

        let bestMidY = (startY + endY) / 2;
        const padding = NODE_SIZE + 14;

        const hasCollision = (my: number) => {
          for (let i = 0; i < allNoteIds.length; i++) {
            const id = allNoteIds[i];
            if (id === sourceId || id === targetId) continue;
            const pos = nodePositions[id];
            if (!pos) continue;
            const nx = pos.x + NODE_SIZE / 2;
            const ny = pos.y + NODE_SIZE / 2;

            const minX = Math.min(startX, endX) - padding;
            const maxX = Math.max(startX, endX) + padding;
            if (Math.abs(ny - my) < padding && nx >= minX && nx <= maxX) {
              return true;
            }

            const minY1 = Math.min(startY, my) - padding;
            const maxY1 = Math.max(startY, my) + padding;
            if (Math.abs(nx - startX) < padding && ny >= minY1 && ny <= maxY1) {
              return true;
            }

            const minY2 = Math.min(my, endY) - padding;
            const maxY2 = Math.max(my, endY) + padding;
            if (Math.abs(nx - endX) < padding && ny >= minY2 && ny <= maxY2) {
              return true;
            }
          }
          return false;
        };

        if (hasCollision(bestMidY)) {
          const minAllowed = Math.min(startY, endY) + 12;
          const maxAllowed = Math.max(startY, endY) - 12;
          const offsets = [24, -24, 48, -48, 72, -72];
          for (const off of offsets) {
            const testY = bestMidY + off;
            if (
              testY >= minAllowed &&
              testY <= maxAllowed &&
              !hasCollision(testY)
            ) {
              bestMidY = testY;
              break;
            }
          }
        }

        return `M ${startX} ${startY} V ${bestMidY} H ${endX} V ${endY}`;
      }
    },
    [nodePositions, allNoteIds]
  );

  return (
    <div
      ref={containerRef}
      onMouseDown={handleCanvasMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onWheel={handleWheel}
      className="w-full h-full relative overflow-hidden bg-[#141414] select-none cursor-grab active:cursor-grabbing flex-1"
      style={{ touchAction: 'none' }}
    >
      {/* Canvas Workspace (Pan & Zoom) */}
      <div
        className="absolute inset-0 origin-top-left"
        style={{
          transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
          transition: isPanning || draggingNodeId ? 'none' : 'transform 0.1s ease-out',
        }}
      >
        {/* Camada SVG: Linhas 100% Ortogonais (90 graus) */}
        <svg
          className="absolute overflow-visible pointer-events-none"
          style={{ width: 1, height: 1, left: 0, top: 0 }}
        >
          {links.map((link) => {
            const key = `${link.source}->${link.target}`;
            const pathData = calculateOrthogonalPath(link.source, link.target);
            if (!pathData) return null;

            const isHighlighted =
              hoveredNodeId === link.source || hoveredNodeId === link.target;
            const isDimmed = hoveredNodeId !== null && !isHighlighted;

            return (
              <path
                key={key}
                d={pathData}
                fill="none"
                stroke={
                  isHighlighted
                    ? '#ffffff'
                    : isDimmed
                    ? 'rgba(255, 255, 255, 0.05)'
                    : 'rgba(255, 255, 255, 0.2)'
                }
                strokeWidth={isHighlighted ? 2 : 1.2}
                strokeLinecap="square"
                strokeLinejoin="miter"
                className="transition-colors duration-150"
              />
            );
          })}
        </svg>

        {/* Camada de Nós: Quadrados simples e pequenos cinzas com área de hover confortável */}
        {notas.map((nota) => {
          const pos = nodePositions[nota.id] || { x: 0, y: 0 };
          const isHovered = hoveredNodeId === nota.id;
          const isConnected = connectedNodeIds.has(nota.id);
          const isDimmed = hoveredNodeId !== null && !isHovered && !isConnected;

          // Offset para centralizar a hitbox ampla de 38x38px sobre a posição exata (pos.x, pos.y) do nó
          const hitboxOffsetX = (HITBOX_SIZE - NODE_SIZE) / 2;
          const hitboxOffsetY = (HITBOX_SIZE - NODE_SIZE) / 2;

          return (
            <div
              key={nota.id}
              onMouseDown={(e) => handleNodeMouseDown(e, nota.id)}
              onMouseEnter={() => setHoveredNodeId(nota.id)}
              onMouseLeave={() => setHoveredNodeId(null)}
              onClick={(e) => {
                e.stopPropagation();
                onOpenNota(nota);
              }}
              style={{
                transform: `translate(${pos.x - hitboxOffsetX}px, ${pos.y - hitboxOffsetY}px)`,
                width: `${HITBOX_SIZE}px`,
                height: `${HITBOX_SIZE}px`,
              }}
              className={`absolute top-0 left-0 flex items-center justify-center cursor-pointer select-none ${
                isHovered ? 'z-40' : isConnected ? 'z-30' : 'z-10'
              }`}
            >
              {/* O Quadrado Visual Cinza (16x16px) */}
              <div
                style={{
                  width: `${NODE_SIZE}px`,
                  height: `${NODE_SIZE}px`,
                }}
                className={`rounded-none transition-all duration-150 ${
                  isHovered
                    ? 'bg-white scale-125 shadow-[0_0_14px_rgba(255,255,255,0.6)]'
                    : isConnected
                    ? 'bg-zinc-300'
                    : 'bg-[#52525b] hover:bg-zinc-300'
                } ${isDimmed ? 'opacity-20' : 'opacity-100'}`}
              />
            </div>
          );
        })}
      </div>

      {/* Prévia Grande Completa da Nota / Desenho (Renderizada no topo da tela sem distorção de zoom) */}
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
                <p className="text-xs text-zinc-500 italic py-6 text-center">Nota sem conteúdo textual.</p>
              )}
            </div>

            {/* Rodapé: Dica de clique para abrir no editor */}
            <div className="pt-2.5 border-t border-white/5 flex items-center justify-between text-[10px] font-mono text-zinc-500">
              <span>Prévia da Nota</span>
              <span className="text-zinc-300 font-medium">Clique no quadrado para abrir ↵</span>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
