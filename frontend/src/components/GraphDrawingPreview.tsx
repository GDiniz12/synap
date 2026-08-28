'use client';

import React, { useEffect, useRef } from 'react';

interface GraphDrawingPreviewProps {
  conteudoJson?: string;
}

export default function GraphDrawingPreview({ conteudoJson }: GraphDrawingPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let elements: any[] = [];
    if (conteudoJson) {
      try {
        const parsed = JSON.parse(conteudoJson);
        if (Array.isArray(parsed)) elements = parsed;
      } catch {}
    }

    const dpr = window.devicePixelRatio || 1;
    const width = 300;
    const height = 200;

    canvas.width = width * dpr;
    canvas.height = height * dpr;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.fillStyle = '#121212';
    ctx.fillRect(0, 0, width, height);

    // Dot grid
    const gridSize = 20;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    for (let x = 0; x < width; x += gridSize) {
      for (let y = 0; y < height; y += gridSize) {
        ctx.fillRect(x, y, 1.5, 1.5);
      }
    }

    if (elements.length > 0) {
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      elements.forEach((el) => {
        if (el.points && el.points.length > 0) {
          el.points.forEach((p: any) => {
            minX = Math.min(minX, p.x);
            minY = Math.min(minY, p.y);
            maxX = Math.max(maxX, p.x);
            maxY = Math.max(maxY, p.y);
          });
        } else {
          minX = Math.min(minX, el.x);
          minY = Math.min(minY, el.y);
          maxX = Math.max(maxX, el.x + (el.width || 60));
          maxY = Math.max(maxY, el.y + (el.height || 40));
        }
      });

      const drawWidth = maxX - minX || 1;
      const drawHeight = maxY - minY || 1;
      const scale = Math.min(1.2, Math.min((width - 32) / drawWidth, (height - 32) / drawHeight));
      const offsetX = (width - drawWidth * scale) / 2 - minX * scale;
      const offsetY = (height - drawHeight * scale) / 2 - minY * scale;

      ctx.translate(offsetX, offsetY);
      ctx.scale(scale, scale);

      elements.forEach((el) => {
        ctx.save();
        ctx.strokeStyle = el.strokeColor || '#ffffff';
        ctx.fillStyle = el.fillColor || 'transparent';
        ctx.lineWidth = el.strokeWidth || 2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        if (el.type === 'pencil' && el.points && el.points.length > 0) {
          ctx.beginPath();
          ctx.moveTo(el.points[0].x, el.points[0].y);
          for (let i = 1; i < el.points.length; i++) {
            ctx.lineTo(el.points[i].x, el.points[i].y);
          }
          ctx.stroke();
        } else if (el.type === 'rectangle') {
          if (el.fillColor && el.fillColor !== 'transparent') ctx.fillRect(el.x, el.y, el.width || 0, el.height || 0);
          ctx.strokeRect(el.x, el.y, el.width || 0, el.height || 0);
        } else if (el.type === 'ellipse') {
          const cx = el.x + (el.width || 0) / 2;
          const cy = el.y + (el.height || 0) / 2;
          const rx = Math.abs(el.width || 0) / 2;
          const ry = Math.abs(el.height || 0) / 2;
          if (rx > 0 && ry > 0) {
            ctx.beginPath();
            ctx.ellipse(cx, cy, rx, ry, 0, 0, 2 * Math.PI);
            if (el.fillColor && el.fillColor !== 'transparent') ctx.fill();
            ctx.stroke();
          }
        } else if (el.type === 'line' && el.points && el.points.length >= 2) {
          ctx.beginPath();
          ctx.moveTo(el.points[0].x, el.points[0].y);
          ctx.lineTo(el.points[1].x, el.points[1].y);
          ctx.stroke();
        } else if (el.type === 'arrow' && el.points && el.points.length >= 2) {
          const p1 = el.points[0];
          const p2 = el.points[1];
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.stroke();
          const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
          const headlen = 12;
          ctx.beginPath();
          ctx.moveTo(p2.x, p2.y);
          ctx.lineTo(p2.x - headlen * Math.cos(angle - Math.PI / 6), p2.y - headlen * Math.sin(angle - Math.PI / 6));
          ctx.moveTo(p2.x, p2.y);
          ctx.lineTo(p2.x - headlen * Math.cos(angle + Math.PI / 6), p2.y - headlen * Math.sin(angle + Math.PI / 6));
          ctx.stroke();
        } else if (el.type === 'text' && el.text) {
          ctx.font = '14px "Short Stack", "Virgil", cursive, sans-serif';
          ctx.fillStyle = el.strokeColor || '#ffffff';
          const lines = el.text.split('\n');
          lines.forEach((line: string, idx: number) => {
            ctx.fillText(line, el.x, el.y + idx * 18);
          });
        }
        ctx.restore();
      });
    }

    ctx.restore();
  }, [conteudoJson]);

  return (
    <div style={{ width: '100%', height: '200px', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--accents-2)' }}>
      <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />
    </div>
  );
}
