'use client';

import React from 'react';
import { RemoteCursor } from '../hooks/useCollaboration';

interface LiveCursorsProps {
  cursors: Record<string, RemoteCursor>;
  transformCoord?: (cursor: RemoteCursor) => { x: number; y: number };
}

export default function LiveCursors({ cursors, transformCoord }: LiveCursorsProps) {
  const cursorList = Object.values(cursors);

  if (cursorList.length === 0) return null;

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-50">
      {cursorList.map((cursor) => {
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
              className="absolute left-4 top-3 px-2 py-0.5 rounded-full text-[11px] font-semibold text-white tracking-wide shadow-md select-none whitespace-nowrap flex items-center gap-1"
              style={{
                backgroundColor: cursor.color,
                boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
              }}
            >
              {firstName}
            </div>
          </div>
        );
      })}
    </div>
  );
}
