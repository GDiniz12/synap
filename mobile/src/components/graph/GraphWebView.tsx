import React, { useMemo, useRef } from 'react';
import { View, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { WebView } from 'react-native-webview';
import { Nota, GraphData, GraphNode, GraphLink } from '../../types';
import { colors } from '../../theme/tokens';

interface GraphWebViewProps {
  notas: Nota[];
  onSelectNota: (notaId: string) => void;
  showTags?: boolean;
}

export const GraphWebView: React.FC<GraphWebViewProps> = ({
  notas,
  onSelectNota,
  showTags = true,
}) => {
  const webViewRef = useRef<WebView>(null);

  // Generate graph nodes and links from notes and backlinks
  const graphData: GraphData = useMemo(() => {
    const nodes: GraphNode[] = [];
    const links: GraphLink[] = [];
    const nodeMap = new Map<string, GraphNode>();
    const tagSet = new Set<string>();

    // 1. Create note nodes
    notas.forEach((n) => {
      const node: GraphNode = {
        id: n.id,
        label: n.titulo || 'Sem título',
        type: 'nota',
        notaId: n.id,
        connectionsCount: 0,
        color: colors.primary,
        val: 6,
      };
      nodes.push(node);
      nodeMap.set(n.id, node);
      nodeMap.set(n.titulo.toLowerCase(), node);
    });

    // 2. Parse backlinks [[Link]] and tags #tag
    notas.forEach((n) => {
      const content = n.conteudo || '';
      
      // Links [[...]]
      const linkMatches = content.match(/\[\[(.*?)\]\]/g) || [];
      linkMatches.forEach((m) => {
        const targetTitle = m.replace(/\[\[|\]\]/g, '').trim().toLowerCase();
        const targetNode = nodeMap.get(targetTitle);
        if (targetNode && targetNode.notaId !== n.id) {
          links.push({
            source: n.id,
            target: targetNode.id,
            type: 'link',
          });
          const sourceNode = nodeMap.get(n.id);
          if (sourceNode) sourceNode.connectionsCount++;
          targetNode.connectionsCount++;
        }
      });

      // Tags #...
      if (showTags) {
        const tagMatches = content.match(/#([a-zA-Z0-9_-]+)/g) || [];
        tagMatches.forEach((t) => {
          const tagName = t.replace('#', '');
          const tagId = `tag_${tagName.toLowerCase()}`;
          if (!nodeMap.has(tagId)) {
            const tagNode: GraphNode = {
              id: tagId,
              label: `#${tagName}`,
              type: 'tag',
              connectionsCount: 0,
              color: colors.cyan,
              val: 4,
            };
            nodes.push(tagNode);
            nodeMap.set(tagId, tagNode);
          }
          links.push({
            source: n.id,
            target: tagId,
            type: 'tag',
          });
          const sourceNode = nodeMap.get(n.id);
          const tNode = nodeMap.get(tagId);
          if (sourceNode) sourceNode.connectionsCount++;
          if (tNode) tNode.connectionsCount++;
        });
      }
    });

    return { nodes, links };
  }, [notas, showTags]);

  const htmlContent = useMemo(() => {
    const dataJson = JSON.stringify(graphData);
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body, html {
      width: 100%;
      height: 100%;
      background: #000000;
      overflow: hidden;
      touch-action: none;
      user-select: none;
      -webkit-user-select: none;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }
    canvas {
      width: 100%;
      height: 100%;
      display: block;
    }
    #hud {
      position: absolute;
      bottom: 16px;
      left: 16px;
      color: #666666;
      font-size: 11px;
      font-family: monospace;
      pointer-events: none;
      background: rgba(10, 10, 10, 0.7);
      padding: 4px 8px;
      border-radius: 4px;
      border: 1px solid #222222;
    }
  </style>
  <script src="https://cdn.jsdelivr.net/npm/d3@7"></script>
</head>
<body>
  <canvas id="graphCanvas"></canvas>
  <div id="hud">Toque em um nó para abrir a nota</div>

  <script>
    const data = ${dataJson};
    const canvas = document.getElementById('graphCanvas');
    const ctx = canvas.getContext('2d');
    let width = window.innerWidth;
    let height = window.innerHeight;

    function resize() {
      width = window.innerWidth;
      height = window.innerHeight;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.scale(dpr, dpr);
    }
    resize();
    window.addEventListener('resize', resize);

    let transform = d3.zoomIdentity;

    const simulation = d3.forceSimulation(data.nodes)
      .force("link", d3.forceLink(data.links).id(d => d.id).distance(70))
      .force("charge", d3.forceManyBody().strength(-180))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide().radius(22))
      .on("tick", render);

    function render() {
      ctx.save();
      ctx.clearRect(0, 0, width, height);
      ctx.translate(transform.x, transform.y);
      ctx.scale(transform.k, transform.k);

      // Draw connections
      data.links.forEach(link => {
        ctx.beginPath();
        ctx.moveTo(link.source.x, link.source.y);
        ctx.lineTo(link.target.x, link.target.y);
        ctx.strokeStyle = link.type === 'tag' ? 'rgba(80, 227, 194, 0.25)' : 'rgba(255, 255, 255, 0.15)';
        ctx.lineWidth = link.type === 'tag' ? 1 : 1.5;
        ctx.stroke();
      });

      // Draw nodes
      data.nodes.forEach(node => {
        const radius = (node.val || 5) + Math.min(node.connectionsCount * 0.8, 8);
        
        // Node Glow
        ctx.beginPath();
        ctx.arc(node.x, node.y, radius + 3, 0, 2 * Math.PI);
        ctx.fillStyle = node.color ? node.color + '33' : 'rgba(0, 112, 243, 0.2)';
        ctx.fill();

        // Node Circle
        ctx.beginPath();
        ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI);
        ctx.fillStyle = node.color || '#0070f3';
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.2;
        ctx.stroke();

        // Label
        ctx.font = '10px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto';
        ctx.fillStyle = '#e1e1e1';
        ctx.textAlign = 'center';
        ctx.fillText(node.label, node.x, node.y + radius + 12);
      });

      ctx.restore();
    }

    // Zoom & Pan
    const zoom = d3.zoom()
      .scaleExtent([0.3, 4])
      .on("zoom", (event) => {
        transform = event.transform;
        render();
      });

    d3.select(canvas).call(zoom);

    // Node Tap detection
    let startX = 0, startY = 0;
    canvas.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
      }
    });

    canvas.addEventListener('touchend', (e) => {
      if (e.changedTouches.length === 1) {
        const touch = e.changedTouches[0];
        const dx = touch.clientX - startX;
        const dy = touch.clientY - startY;
        if (Math.hypot(dx, dy) < 8) {
          // Tap detected
          const clientX = touch.clientX;
          const clientY = touch.clientY;
          const invertedX = (clientX - transform.x) / transform.k;
          const invertedY = (clientY - transform.y) / transform.k;

          const clickedNode = data.nodes.find(node => {
            const r = (node.val || 5) + 12;
            return Math.hypot(node.x - invertedX, node.y - invertedY) < r;
          });

          if (clickedNode && clickedNode.notaId) {
            if (window.ReactNativeWebView) {
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'SELECT_NOTE',
                notaId: clickedNode.notaId
              }));
            }
          }
        }
      }
    });
  </script>
</body>
</html>
    `;
  }, [graphData]);

  const handleMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'SELECT_NOTE' && data.notaId) {
        onSelectNota(data.notaId);
      }
    } catch (e) {
      console.warn('WebView message parse error:', e);
    }
  };

  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        originWhitelist={['*']}
        source={{ html: htmlContent }}
        style={styles.webview}
        onMessage={handleMessage}
        scrollEnabled={false}
        bounces={false}
        renderLoading={() => (
          <View style={styles.loader}>
            <ActivityIndicator size="large" color={colors.foreground} />
          </View>
        )}
        startInLoadingState
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  webview: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loader: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
