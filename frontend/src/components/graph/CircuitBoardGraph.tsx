'use client';

import React, { useEffect, useState, useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  Edge,
  Node,
  Handle,
  Position,
  BackgroundVariant,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import ELK from 'elkjs/lib/elk.bundled.js';
import { resolveNodeColor, GraphGroup } from '../GraphView';

interface CircuitBoardGraphProps {
  notas: any[];
  links: any[];
  groups?: GraphGroup[];
  folderColorMap?: Record<string, string>;
  hoveredNodeId?: string | null;
  onHoverNode?: (nota: any | null) => void;
  onOpenNota: (nota: any) => void;
}

// Custom Node for PCB Microchips
const MicrochipNode = ({ data }: any) => {
  const { title, color, isHovered, isDimmed } = data;
  
  // Neon fallbacks for the PCB aesthetic
  const traceColor = color !== '#525252' && color !== '#737373' ? color : '#0070f3'; // Matrix/PCB Green

  return (
    <div 
      className={`relative px-4 py-3 bg-[#111111] border-2 rounded-sm shadow-2xl transition-all duration-200 min-w-[160px] max-w-[200px] flex items-center justify-center ${
        isHovered ? 'z-50 scale-105' : 'z-10'
      } ${isDimmed ? 'opacity-20' : 'opacity-100'}`}
      style={{
        borderColor: isHovered ? traceColor : '#333333',
        boxShadow: isHovered ? `0 0 15px ${traceColor}40` : '0 4px 6px rgba(0,0,0,0.5)',
      }}
    >
      {/* Decorative Metallic Pins (Top & Bottom) */}
      <div className="absolute -top-[6px] left-2 right-2 flex justify-between px-1">
        {[1,2,3,4,5].map(i => <div key={i} className="w-1.5 h-1.5 bg-[#888] border border-[#222]" />)}
      </div>
      <div className="absolute -bottom-[6px] left-2 right-2 flex justify-between px-1">
        {[1,2,3,4,5].map(i => <div key={i} className="w-1.5 h-1.5 bg-[#888] border border-[#222]" />)}
      </div>

      {/* Actual Connection Handles (Left & Right) styled as pins */}
      <Handle 
        type="target" 
        position={Position.Left} 
        style={{ background: '#b87333', width: '8px', height: '12px', border: '1px solid #222', borderRadius: '1px', left: '-8px' }} 
      />
      
      <div className="flex flex-col items-center gap-1 w-full overflow-hidden">
        {/* Chip Label */}
        <div 
          className="text-[10px] font-bold text-center w-full truncate font-mono tracking-widest"
          style={{ color: isHovered ? traceColor : '#aaaaaa' }}
        >
          {title.toUpperCase()}
        </div>
        {/* Decorative Chip Indentation */}
        <div className="w-4 h-4 rounded-full bg-[#0a0a0a] shadow-inner absolute bottom-1 right-1 opacity-50" />
      </div>

      <Handle 
        type="source" 
        position={Position.Right} 
        style={{ background: '#b87333', width: '8px', height: '12px', border: '1px solid #222', borderRadius: '1px', right: '-8px' }} 
      />
    </div>
  );
};

const nodeTypes = {
  microchip: MicrochipNode,
};

const elk = new ELK();

export default function CircuitBoardGraph({
  notas = [],
  links = [],
  groups = [],
  folderColorMap = {},
  hoveredNodeId = null,
  onHoverNode = () => {},
  onOpenNota = () => {},
}: Partial<CircuitBoardGraphProps>) {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);

  // Compute Layout when data changes
  useEffect(() => {
    if (notas.length === 0) return;

    const computeLayout = async () => {
      // Create hierarchical structure based on groups
      const rootChildren: any[] = [];
      const nodeToParentMap = new Map<string, string>();
      
      // Determine which group (if any) each node belongs to
      const groupContainers = new Map<string, any>();
      
      notas.forEach((n) => {
        const color = resolveNodeColor(n, groups, folderColorMap);
        const isGrouped = color !== '#525252' && color !== '#737373';
        
        let parentId = 'root';
        if (isGrouped) {
          // Use the color as the group ID for clustering
          const groupId = `cluster-${color.replace('#', '')}`;
          parentId = groupId;
          
          if (!groupContainers.has(groupId)) {
            groupContainers.set(groupId, {
              id: groupId,
              layoutOptions: {
                'elk.algorithm': 'layered',
                'elk.direction': 'RIGHT',
                'elk.spacing.nodeNode': '40',
              },
              children: [],
            });
          }
          
          groupContainers.get(groupId).children.push({
            id: n.id,
            width: 180,
            height: 60,
          });
        } else {
          // Ungrouped nodes go to root
          rootChildren.push({
            id: n.id,
            width: 180,
            height: 60,
          });
        }
        nodeToParentMap.set(n.id, parentId);
      });

      // Add all group containers to root
      groupContainers.forEach((container) => {
        rootChildren.push(container);
      });

      const graph = {
        id: 'root',
        layoutOptions: {
          'elk.algorithm': 'layered',
          'elk.direction': 'RIGHT',
          'elk.edgeRouting': 'ORTHOGONAL',
          'elk.spacing.nodeNode': '80',
          'elk.layered.spacing.nodeNodeBetweenLayers': '100',
          'elk.layered.nodePlacement.strategy': 'BRANDES_KOEPF',
        },
        children: rootChildren,
        edges: links.map((l, i) => ({
          id: `edge-${i}`,
          sources: [l.source],
          targets: [l.target],
        })),
      };

      try {
        const layouted = await elk.layout(graph);
        
        const flowNodes: Node[] = [];
        
        // Flatten the hierarchy to send to React Flow (React Flow doesn't need to know about the ELK hierarchy for simple rendering, we just want the absolute positions computed by ELK)
        // ELK returns relative positions for children, so we must calculate absolute
        const processElkNode = (elkNode: any, offsetX = 0, offsetY = 0) => {
          const absX = offsetX + (elkNode.x || 0);
          const absY = offsetY + (elkNode.y || 0);
          
          // If it has children, it's a container. Recursively process children.
          if (elkNode.children && elkNode.children.length > 0) {
            elkNode.children.forEach((child: any) => processElkNode(child, absX, absY));
          } else {
            // It's a real leaf node (a note)
            const rawNota = notas.find((n) => n.id === elkNode.id);
            if (rawNota) {
              const color = resolveNodeColor(rawNota, groups, folderColorMap);
              flowNodes.push({
                id: elkNode.id,
                type: 'microchip',
                position: { x: absX, y: absY },
                data: { 
                  title: rawNota?.titulo || 'Nota',
                  color,
                  rawNota,
                  isHovered: false,
                  isDimmed: false,
                },
                draggable: false, // Strict Auto-Layout
              });
            }
          }
        };

        (layouted.children || []).forEach((child: any) => processElkNode(child));

        const flowEdges: Edge[] = links.map((l, i) => ({
          id: `e-${l.source}-${l.target}-${i}`,
          source: l.source,
          target: l.target,
          type: 'step',
          animated: false,
          style: { stroke: '#444444', strokeWidth: 2 },
        }));

        setNodes(flowNodes);
        setEdges(flowEdges);
      } catch (err) {
        console.error('ELK Layout error', err);
      }
    };

    computeLayout();
  }, [notas, links, groups, folderColorMap]);

  // Update visual states (Hover / Color) without recalculating layout
  const activeNodes = useMemo(() => {
    return nodes.map((n) => {
      const color = resolveNodeColor(n.data.rawNota, groups, folderColorMap);
      let isHovered = false;
      let isDimmed = false;

      if (hoveredNodeId) {
        const isSelf = n.id === hoveredNodeId;
        const isNeighbor = links.some(
          (l) => (l.source === n.id && l.target === hoveredNodeId) || (l.target === n.id && l.source === hoveredNodeId)
        );
        isHovered = isSelf;
        isDimmed = !isSelf && !isNeighbor;
      }

      return {
        ...n,
        data: { ...n.data, color, isHovered, isDimmed },
      };
    });
  }, [nodes, groups, folderColorMap, hoveredNodeId, links]);

  const activeEdges = useMemo(() => {
    return edges.map((e) => {
      let isHighlighted = false;
      let isDimmed = false;
      let traceColor = '#444444'; // default copper/dark trace

      if (hoveredNodeId) {
        if (e.source === hoveredNodeId || e.target === hoveredNodeId) {
          isHighlighted = true;
          // Find source node color to glow the trace
          const sourceNode = activeNodes.find(n => n.id === e.source);
          if (sourceNode && sourceNode.data.color && sourceNode.data.color !== '#525252' && sourceNode.data.color !== '#737373') {
             traceColor = sourceNode.data.color;
          } else {
             traceColor = '#0070f3'; // Project Blue glow
          }
        } else {
          isDimmed = true;
        }
      }

      return {
        ...e,
        animated: isHighlighted, // Flowing energy effect
        style: {
          stroke: isHighlighted ? traceColor : isDimmed ? '#222222' : '#444444',
          strokeWidth: isHighlighted ? 3 : 2,
          opacity: isDimmed ? 0.1 : 1,
          filter: isHighlighted ? `drop-shadow(0 0 5px ${traceColor})` : 'none',
          transition: 'stroke 0.2s, stroke-width 0.2s, opacity 0.2s',
        },
      };
    });
  }, [edges, hoveredNodeId, activeNodes]);

  if (notas.length === 0) {
    return <div className="w-full h-full flex items-center justify-center text-[#444] font-mono">NO SIGNAL.</div>;
  }

  return (
    <div className="w-full h-full bg-[#050505]">
      <ReactFlow
        nodes={activeNodes}
        edges={activeEdges}
        nodeTypes={nodeTypes}
        fitView
        onNodeMouseEnter={(_, node) => onHoverNode((node.data as any).rawNota)}
        onNodeMouseLeave={() => onHoverNode(null)}
        onNodeClick={(_, node) => onOpenNota((node.data as any).rawNota)}
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} color="#1a1a1a" gap={24} size={2} />
        <Controls showInteractive={false} className="bg-[#111] border border-[#333] fill-[#888]" />
      </ReactFlow>
    </div>
  );
}
