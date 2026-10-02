'use client';

import React from 'react';
import { RemoteCursor } from '../hooks/useCollaboration';

interface LiveCursorsProps {
  cursors: Record<string, RemoteCursor>;
  transformCoord?: (cursor: RemoteCursor) => { x: number; y: number };
  textEditor?: HTMLElement | null;
}

export default function LiveCursors({ cursors, transformCoord, textEditor }: LiveCursorsProps) {
  const layerRef = React.useRef<HTMLDivElement>(null);
  const cursorList = Object.values(cursors);

  if (cursorList.length === 0) return null;

  return (
    <div ref={layerRef} className="absolute inset-0 pointer-events-none overflow-hidden z-50">
      {cursorList.map((cursor) => {
        if (cursor.textMode) {
          if (!cursor.active || !textEditor || typeof cursor.selectionStart !== 'number' || typeof cursor.selectionEnd !== 'number') return null;
          const start = Math.min(cursor.selectionStart, cursor.selectionEnd);
          const end = Math.max(cursor.selectionStart, cursor.selectionEnd);
          const nodes: Text[] = [];
          const walker = document.createTreeWalker(textEditor, NodeFilter.SHOW_TEXT);
          while (walker.nextNode()) nodes.push(walker.currentNode as Text);
          const locate = (offset: number): { node: Text; offset: number } | null => {
            let remaining = offset;
            for (const node of nodes) {
              if (remaining <= node.length) return { node, offset: remaining };
              remaining -= node.length;
            }
            const last = nodes[nodes.length - 1];
            return last ? { node: last, offset: last.length } : null;
          };
          const from = locate(start);
          const to = locate(end);
          const selectionRects: DOMRect[] = [];
          let caretRect: DOMRect | null = null;
          if (from && to) {
            try {
              const range = document.createRange();
              range.setStart(from.node, from.offset);
              range.setEnd(to.node, to.offset);
              selectionRects.push(...Array.from(range.getClientRects()));
              caretRect = range.getBoundingClientRect();
            } catch { /* The editor may have changed before this render. */ }
          }
          const layerRect = layerRef.current?.getBoundingClientRect();
          if (!layerRect) return null;
          const firstName = cursor.name.split(' ')[0] || cursor.name;
          return (
            <React.Fragment key={cursor.id}>
              {selectionRects.map((rect, index) => (
                <span key={`${cursor.id}-selection-${index}`} className="absolute" style={{ left: rect.left - layerRect.left, top: rect.top - layerRect.top, width: rect.width, height: rect.height, backgroundColor: `${cursor.color}45` }} />
              ))}
              {caretRect && (
                <span className="absolute" style={{ left: caretRect.left - layerRect.left, top: caretRect.top - layerRect.top, width: 2, height: Math.max(caretRect.height, 18), backgroundColor: cursor.color }}>
                  <span className="absolute left-0 top-0 -translate-y-full rounded-sm px-1.5 py-0.5 text-[10px] font-medium leading-none text-white whitespace-nowrap" style={{ backgroundColor: cursor.color }}>{firstName}</span>
                </span>
              )}
            </React.Fragment>
          );
        }
        const { x, y } = transformCoord ? transformCoord(cursor) : { x: cursor.x, y: cursor.y };
        const firstName = cursor.name.split(' ')[0] || cursor.name;

        return (
          <div
            key={cursor.id}
            className="absolute top-0 left-0 transition-[transform,opacity] duration-[60ms] ease-linear will-change-transform"
            style={{
              transform: `translate3d(${x}px, ${y}px, 0)`,
              opacity: cursor.active ? 1 : 0,
              pointerEvents: 'none',
            }}
          >
            {/* Miro/Figma Style SVG Arrow */}
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              className="drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]"
              style={{ transform: 'rotate(-20deg)', transformOrigin: 'top left' }}
            >
              <path
                d="M3 3L10.07 19.97L12.58 12.58L19.97 10.07L3 3Z"
                fill={cursor.color}
                stroke="#000000"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
            </svg>

            {/* Name Badge */}
            <div
              className="absolute left-4 top-3 px-2 py-0.5 rounded-full text-[11px] font-semibold text-white tracking-wide shadow-md select-none whitespace-nowrap flex items-center gap-1.5"
              style={{
                backgroundColor: cursor.color,
                boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
              }}
            >
              {cursor.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={cursor.avatarUrl}
                  alt=""
                  className="w-3.5 h-3.5 rounded-full object-cover border border-white/40"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              ) : null}
              <span>{firstName}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
