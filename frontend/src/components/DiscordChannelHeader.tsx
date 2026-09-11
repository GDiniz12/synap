'use client';

import React, { useState } from 'react';

export interface DiscordChannelHeaderProps {
  selectedNota: any;
  isGraphViewOpen: boolean;
  isFlashcardsOpen: boolean;
  isAiChatOpen: boolean;
  isTerminalOpen: boolean;
  openTabs: any[];
  onSelectTab: (nota: any) => void;
  onCloseTab: (e: React.MouseEvent, notaId: string) => void;
  onNewTab?: () => void;
  saveStatus?: 'idle' | 'saving' | 'saved';
  editTitle: string;
  setEditTitle?: (title: string) => void;
  pastaName?: string;
  onToggleSidebar?: () => void;
  isSidebarOpen?: boolean;
  onToggleRightSidebar?: () => void;
  isRightSidebarOpen?: boolean;
  onToggleGraph?: () => void;
  onToggleFlashcards?: () => void;
  onToggleAiChat?: () => void;
  onOpenShareModal?: () => void;
  onToggleActionsMenu?: () => void;
  isActionsMenuOpen?: boolean;
}

export default function DiscordChannelHeader({
  selectedNota,
  isGraphViewOpen,
  isFlashcardsOpen,
  isAiChatOpen,
  isTerminalOpen,
  openTabs,
  onSelectTab,
  onCloseTab,
  onNewTab,
  editTitle,
  onToggleSidebar,
  isSidebarOpen,
  onToggleRightSidebar,
  isRightSidebarOpen,
  onToggleAiChat,
}: DiscordChannelHeaderProps) {
  // Floating tooltip state
  const [tooltip, setTooltip] = useState<{ text: string; x: number; y: number } | null>(null);

  const showTooltip = (e: React.MouseEvent, text: string) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltip({
      text,
      x: rect.left + rect.width / 2,
      y: rect.bottom + 6,
    });
  };

  const hideTooltip = () => setTooltip(null);

  const isSpecialView = isGraphViewOpen || isFlashcardsOpen || isAiChatOpen || isTerminalOpen;

  return (
    <header
      className="h-12 min-h-[48px] px-3 border-b flex items-center justify-between z-10 shrink-0 select-none overflow-hidden"
      style={{ background: 'var(--discord-header)', borderColor: 'var(--discord-border)' }}
    >
      {/* 1. LEFT: SIDEBAR EXPAND BUTTON (WHEN CLOSED) + DOCUMENT TABS LIST */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar flex-1 py-0.5 mr-2">
        {/* Reopen / Expand Sidebar Button (Always accessible when sidebar is closed) */}
        {!isSidebarOpen && onToggleSidebar && (
          <button
            type="button"
            onClick={onToggleSidebar}
            onMouseEnter={(e) => showTooltip(e, 'Expandir Barra Lateral (Ctrl+D)')}
            onMouseLeave={hideTooltip}
            className="p-1.5 rounded-[4px] hover:bg-[var(--discord-hover)] text-[var(--discord-text-muted)] hover:text-[var(--discord-text-primary)] transition-colors cursor-pointer border-none bg-transparent shrink-0 mr-1"
            aria-label="Expandir Barra Lateral"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect width="18" height="18" x="3" y="3" rx="2" />
              <path d="M9 3v18" />
              <path d="m14 9 3 3-3 3" />
            </svg>
          </button>
        )}

        {/* Browser / Discord Style Document Tabs */}
        {openTabs.map((tab) => {
          const isTabActive = selectedNota?.id === tab.id && !isSpecialView;
          const isDrawing = tab.tipo === 'desenho';

          return (
            <div
              key={tab.id}
              onClick={() => onSelectTab(tab)}
              className={`group relative flex items-center gap-2 h-7 px-2.5 rounded-[4px] text-xs cursor-pointer select-none transition-all shrink-0 ${
                isTabActive
                  ? 'bg-[var(--discord-active)] text-white font-medium shadow-xs'
                  : 'bg-transparent text-[var(--discord-text-muted)] hover:text-[var(--discord-text-primary)] hover:bg-[var(--discord-hover)]'
              }`}
            >
              {/* Tab Icon (NO EMOJIS) */}
              {isDrawing ? (
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className={`shrink-0 ${isTabActive ? 'text-[var(--brand)]' : 'text-[var(--accents-4)]'}`}
                >
                  <path d="M12 19l7-7 3 3-7 7-3-3z" />
                  <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
                </svg>
              ) : (
                <span className={`font-mono text-xs font-bold leading-none shrink-0 ${isTabActive ? 'text-[var(--foreground)]' : 'text-[var(--accents-4)]'}`}>
                  #
                </span>
              )}

              {/* Tab Title */}
              <span className="max-w-[140px] sm:max-w-[200px] truncate text-xs">
                {tab.id === selectedNota?.id ? (editTitle || tab.titulo || 'Sem título') : (tab.titulo || 'Sem título')}
              </span>

              {/* Close Tab Button */}
              <button
                type="button"
                onClick={(e) => onCloseTab(e, tab.id)}
                onMouseEnter={(e) => showTooltip(e, 'Fechar aba')}
                onMouseLeave={hideTooltip}
                className="opacity-0 group-hover:opacity-100 hover:text-red-400 p-0.5 rounded transition-opacity cursor-pointer border-none bg-transparent flex items-center justify-center -mr-0.5"
                aria-label="Fechar aba"
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          );
        })}

        {/* New Tab Button */}
        {onNewTab && (
          <button
            type="button"
            onClick={onNewTab}
            onMouseEnter={(e) => showTooltip(e, 'Nova Nota')}
            onMouseLeave={hideTooltip}
            className="w-7 h-7 flex items-center justify-center rounded-[4px] text-[var(--discord-text-muted)] hover:text-[var(--discord-text-primary)] hover:bg-[var(--discord-hover)] transition-colors cursor-pointer border-none bg-transparent shrink-0"
            aria-label="Nova Nota"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
        )}
      </div>

      {/* 2. RIGHT: ACTION TOOLS */}
      <div className="flex items-center gap-1 shrink-0">
        {onToggleAiChat && (
          <button
            type="button"
            onClick={onToggleAiChat}
            onMouseEnter={(e) => showTooltip(e, isAiChatOpen ? 'Fechar Synap AI' : 'Abrir Synap AI')}
            onMouseLeave={hideTooltip}
            className={`flex items-center gap-1.5 h-7 px-2 rounded-[4px] text-xs transition-colors cursor-pointer border-none ${
              isAiChatOpen
                ? 'text-white bg-[var(--discord-active)] font-medium shadow-xs'
                : 'text-[var(--discord-text-muted)] hover:text-white hover:bg-[var(--discord-hover)]'
            }`}
            aria-label="Synap AI"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[var(--brand)]">
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
            </svg>
            <span className="hidden sm:inline font-medium">Synap AI</span>
          </button>
        )}

        {onToggleRightSidebar && (
          <button
            type="button"
            onClick={onToggleRightSidebar}
            onMouseEnter={(e) => showTooltip(e, isRightSidebarOpen ? 'Ocultar Ferramentas' : 'Abrir Ferramentas')}
            onMouseLeave={hideTooltip}
            className={`p-1.5 rounded-[4px] hover:bg-[var(--discord-hover)] transition-colors cursor-pointer border-none bg-transparent shrink-0 ${
              isRightSidebarOpen
                ? 'text-white bg-[var(--discord-active)]'
                : 'text-[var(--discord-text-muted)] hover:text-[var(--discord-text-primary)]'
            }`}
            aria-label="Ferramentas"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect width="18" height="18" x="3" y="3" rx="2" />
              <path d="M15 3v18" />
              <path d="m8 9 3 3-3 3" />
            </svg>
          </button>
        )}
      </div>

      {/* 3. FLOATING TOOLTIP */}
      {tooltip && (
        <div
          className="fixed z-9999 px-2 py-0.5 rounded text-[11px] font-medium text-[var(--foreground)] bg-[var(--background)] border border-[var(--accents-2)] shadow-xl pointer-events-none whitespace-nowrap animate-smooth-pop -translate-x-1/2"
          style={{
            left: `${tooltip.x}px`,
            top: `${tooltip.y}px`,
          }}
        >
          {tooltip.text}
        </div>
      )}
    </header>
  );
}
