'use client';

import React, { useState, useEffect } from 'react';
import OrthogonalGraphView from './OrthogonalGraphView';
import TesseractGraphView from './TesseractGraphView';

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
    <div className="w-full h-full relative overflow-hidden bg-[var(--background)] select-none flex-1 flex flex-col">
      {/* Floating Top-Center Mode Switcher Bar */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40 flex items-center bg-[var(--background)] backdrop-blur-sm border border-[var(--accents-2)] p-1 rounded-[var(--radius)] shadow-sm select-none">
        {/* Botão 2D Ortogonal */}
        <button
          type="button"
          onClick={() => handleModeChange('orthogonal')}
          className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-[var(--radius)] cursor-pointer transition-all duration-150 ${
            currentMode === 'orthogonal'
              ? 'bg-[var(--foreground)] text-[var(--background)]'
              : 'text-[var(--accents-5)] hover:text-[var(--foreground)] hover:bg-[var(--accents-1)]'
          }`}
          aria-label="Modo 2D Ortogonal"
        >
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
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
          className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-[var(--radius)] cursor-pointer transition-all duration-150 ${
            currentMode === 'isometric'
              ? 'bg-[var(--foreground)] text-[var(--background)]'
              : 'text-[var(--accents-5)] hover:text-[var(--foreground)] hover:bg-[var(--accents-1)]'
          }`}
          aria-label="Modo Tesseract 3D"
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
            <rect x="3" y="3" width="18" height="18" />
            <rect x="8" y="8" width="8" height="8" />
            <path d="m3 3 5 5m13-5-5 5m5 13-5-5M3 21l5-5" />
          </svg>
          <span>Tesseract 3D</span>
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
        <TesseractGraphView
          notas={notas}
          pastas={pastas}
          activeWorkspace={activeWorkspace}
          onOpenNota={onOpenNota}
        />
      )}
    </div>
  );
}
