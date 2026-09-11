'use client';

import React, { useState } from 'react';

export interface DiscordToolsSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  isGraphViewOpen: boolean;
  isFlashcardsOpen: boolean;
  isAiChatOpen: boolean;
  isTerminalOpen: boolean;
  onToggleGraph: () => void;
  onToggleFlashcards: () => void;
  onToggleAiChat: () => void;
  onToggleTerminal: () => void;
}

export default function DiscordToolsSidebar({
  isOpen,
  onClose,
  isGraphViewOpen,
  isFlashcardsOpen,
  isAiChatOpen,
  isTerminalOpen,
  onToggleGraph,
  onToggleFlashcards,
  onToggleAiChat,
  onToggleTerminal,
}: DiscordToolsSidebarProps) {
  const [tooltip, setTooltip] = useState<{ text: string; x: number; y: number } | null>(null);

  const showTooltip = (e: React.MouseEvent, text: string) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltip({
      text,
      x: rect.left - 8,
      y: rect.top + rect.height / 2,
    });
  };

  const hideTooltip = () => setTooltip(null);

  if (!isOpen) return null;

  return (
    <aside
      className="w-[220px] min-w-[220px] h-full flex flex-col justify-between select-none z-20 shrink-0 border-l animate-in slide-in-from-right duration-150"
      style={{ background: 'var(--discord-sidebar)', borderColor: 'var(--discord-border)' }}
      aria-label="Barra Lateral de Ferramentas"
    >
      {/* 1. HEADER: Title + Close Button */}
      <div className="h-12 min-h-[48px] px-3.5 flex items-center justify-between border-b shrink-0" style={{ borderColor: 'var(--discord-border)' }}>
        <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--discord-text-muted)] font-mono">
          Ferramentas
        </span>

        <button
          type="button"
          onClick={onClose}
          onMouseEnter={(e) => showTooltip(e, 'Fechar Ferramentas')}
          onMouseLeave={hideTooltip}
          className="w-7 h-7 flex items-center justify-center rounded-[4px] hover:bg-[var(--discord-hover)] text-[var(--discord-text-muted)] hover:text-[var(--discord-text-primary)] transition-colors cursor-pointer border-none bg-transparent"
          aria-label="Fechar Ferramentas"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* 2. TOOLS LIST */}
      <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-1 no-scrollbar">
        {/* Visualização em gráfico */}
        <button
          type="button"
          onClick={onToggleGraph}
          onMouseEnter={(e) => showTooltip(e, 'Grafo Neural Interativo')}
          onMouseLeave={hideTooltip}
          className={`flex items-center gap-2.5 px-2.5 h-[34px] rounded-[4px] text-xs transition-all cursor-pointer border-none text-left select-none ${
            isGraphViewOpen
              ? 'bg-[var(--discord-active)] text-white font-medium shadow-xs'
              : 'text-[var(--discord-text-channel)] hover:text-[var(--discord-text-primary)] hover:bg-[var(--discord-hover)]'
          }`}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[var(--brand)] shrink-0">
            <circle cx="6" cy="6" r="3" />
            <circle cx="18" cy="18" r="3" />
            <circle cx="18" cy="6" r="3" />
            <line x1="8.5" y1="7.5" x2="15.5" y2="16.5" />
            <line x1="8.5" y1="6" x2="15.5" y2="6" />
          </svg>
          <span className="truncate">Visualização em gráfico</span>
        </button>

        {/* Flashcards */}
        <button
          type="button"
          onClick={onToggleFlashcards}
          onMouseEnter={(e) => showTooltip(e, 'Flashcards (Repetição Espaçada)')}
          onMouseLeave={hideTooltip}
          className={`flex items-center gap-2.5 px-2.5 py-2 rounded-md text-xs transition-all cursor-pointer border-none text-left select-none ${
            isFlashcardsOpen
              ? 'bg-[var(--accents-2)] text-[var(--foreground)] font-semibold shadow-xs'
              : 'text-[var(--accents-5)] hover:text-[var(--foreground)] hover:bg-[var(--accents-2)]/50'
          }`}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-emerald-400 shrink-0">
            <rect x="2" y="4" width="20" height="16" rx="2" />
            <path d="M7 15h10" />
            <path d="M7 9h10" />
          </svg>
          <span className="truncate">Flashcards</span>
        </button>

        {/* Synap AI */}
        <button
          type="button"
          onClick={onToggleAiChat}
          onMouseEnter={(e) => showTooltip(e, 'Synap AI Assistant')}
          onMouseLeave={hideTooltip}
          className={`flex items-center gap-2.5 px-2.5 py-2 rounded-md text-xs transition-all cursor-pointer border-none text-left select-none ${
            isAiChatOpen
              ? 'bg-[var(--accents-2)] text-[var(--foreground)] font-semibold shadow-xs'
              : 'text-[var(--accents-5)] hover:text-[var(--foreground)] hover:bg-[var(--accents-2)]/50'
          }`}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-purple-400 shrink-0">
            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
          </svg>
          <span className="truncate">Synap AI</span>
        </button>

        {/* Terminal */}
        <button
          type="button"
          onClick={onToggleTerminal}
          onMouseEnter={(e) => showTooltip(e, 'Terminal de Comandos')}
          onMouseLeave={hideTooltip}
          className={`flex items-center gap-2.5 px-2.5 py-2 rounded-md text-xs transition-all cursor-pointer border-none text-left select-none ${
            isTerminalOpen
              ? 'bg-[var(--accents-2)] text-[var(--foreground)] font-semibold shadow-xs'
              : 'text-[var(--accents-5)] hover:text-[var(--foreground)] hover:bg-[var(--accents-2)]/50'
          }`}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-amber-400 shrink-0">
            <polyline points="4 17 10 11 4 5" />
            <line x1="12" y1="19" x2="20" y2="19" />
          </svg>
          <span className="truncate">Terminal</span>
        </button>
      </div>

      {/* 3. GLOBAL FLOATING UNCLIPPED TOOLTIP */}
      {tooltip && (
        <div
          className="fixed z-9999 px-2.5 py-1 rounded-md text-xs font-medium text-[var(--foreground)] bg-[var(--background)] border border-[var(--accents-2)] shadow-xl pointer-events-none whitespace-nowrap animate-smooth-pop"
          style={{
            left: `${tooltip.x}px`,
            top: `${tooltip.y}px`,
            transform: 'translate(-100%, -50%)',
          }}
        >
          {tooltip.text}
        </div>
      )}
    </aside>
  );
}
