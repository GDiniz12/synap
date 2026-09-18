'use client';

import React, { useState, useEffect } from 'react';
import OrthogonalGraphView from './OrthogonalGraphView';
import IsometricGraphView from './IsometricGraphView';

export type GraphVisualizationMode = 'orthogonal' | 'isometric';

interface UnifiedGraphViewProps {
  notas: any[];
  pastas?: any[];
  activeWorkspace?: any;
  onOpenNota: (nota: any) => void;
  graphMode?: GraphVisualizationMode;
  onGraphModeChange?: (mode: GraphVisualizationMode) => void;
}

export default function UnifiedGraphView({
  notas = [],
  pastas = [],
  activeWorkspace,
  onOpenNota,
  graphMode: externalMode,
  onGraphModeChange,
}: UnifiedGraphViewProps) {
  const [internalMode, setInternalMode] = useState<GraphVisualizationMode>('orthogonal');

  useEffect(() => {
    try {
      const saved = localStorage.getItem('synap_graph_mode') as GraphVisualizationMode;
      if (saved === 'orthogonal' || saved === 'isometric') {
        setInternalMode(saved);
      }
    } catch {}
  }, []);

  const currentMode = externalMode !== undefined ? externalMode : internalMode;

  const handleModeChange = (mode: GraphVisualizationMode) => {
    if (onGraphModeChange) {
      onGraphModeChange(mode);
    } else {
      setInternalMode(mode);
    }
    try {
      localStorage.setItem('synap_graph_mode', mode);
    } catch {}
  };

  return (
    <div className="w-full h-full relative overflow-hidden bg-[#141414] select-none flex-1 flex flex-col font-sansation">
      {/* Floating Top-Center Mode Switcher Bar */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40 flex items-center bg-[#181818]/95 backdrop-blur-sm border border-white/10 p-1 rounded-none shadow-2xl font-sansation select-none">
        {/* Botão 2D Ortogonal */}
        <button
          type="button"
          onClick={() => handleModeChange('orthogonal')}
          className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-none cursor-pointer transition-all duration-150 ${
            currentMode === 'orthogonal'
              ? 'bg-white text-black shadow-md'
              : 'text-zinc-400 hover:text-white hover:bg-white/5'
          }`}
          aria-label="Modo 2D Ortogonal"
        >
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="shrink-0"
          >
            <rect width="7" height="7" x="3" y="3" />
            <rect width="7" height="7" x="14" y="14" />
            <path d="M10 6.5h7v7" />
          </svg>
          <span>2D Ortogonal</span>
        </button>

        {/* Botão 3D Isométrico */}
        <button
          type="button"
          onClick={() => handleModeChange('isometric')}
          className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-none cursor-pointer transition-all duration-150 ${
            currentMode === 'isometric'
              ? 'bg-white text-black shadow-md'
              : 'text-zinc-400 hover:text-white hover:bg-white/5'
          }`}
          aria-label="Modo 3D Isométrico"
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
            className="shrink-0"
          >
            <path d="m21.12 6.4-9-5a2 2 0 0 0-2.24 0l-9 5A2 2 0 0 0 0 8.13v7.74a2 2 0 0 0 1 1.73l9 5a2 2 0 0 0 2 0l9-5a2 2 0 0 0 1-1.73V8.13a2 2 0 0 0-.88-1.73z" />
            <path d="M12 22V12" />
            <path d="m21.12 6.4-9.12 5.6-9.12-5.6" />
          </svg>
          <span>3D Isométrico</span>
        </button>
      </div>

      {/* Renderização Condicional da Visualização Ativa */}
      {currentMode === 'orthogonal' ? (
        <OrthogonalGraphView
          notas={notas}
          pastas={pastas}
          activeWorkspace={activeWorkspace}
          onOpenNota={onOpenNota}
        />
      ) : (
        <IsometricGraphView
          notas={notas}
          pastas={pastas}
          activeWorkspace={activeWorkspace}
          onOpenNota={onOpenNota}
        />
      )}
    </div>
  );
}
