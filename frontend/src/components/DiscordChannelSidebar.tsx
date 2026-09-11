'use client';

import React, { useState } from 'react';
import WorkspaceIcon from '@/components/WorkspaceIcon';

export interface DiscordChannelSidebarProps {
  workspace: any;
  pastas: any[];
  notas: any[];
  currentUser: any;
  selectedNota: any;
  isGraphViewOpen: boolean;
  isFlashcardsOpen: boolean;
  isAiChatOpen: boolean;
  isTerminalOpen: boolean;
  sidebarSearch: string;
  setSidebarSearch: (s: string) => void;
  expandedFolders: Record<string, boolean>;
  toggleFolder: (folderId: string) => void;
  onSelectNota: (nota: any) => void;
  onOpenGraph: () => void;
  onOpenFlashcards: () => void;
  onOpenAiChat: () => void;
  onOpenTerminal: () => void;
  onOpenWorkspaceSettings: () => void;
  onOpenUserSettings: () => void;
  onOpenLogoutConfirm: () => void;
  onOpenShareModal: () => void;
  onOpenLeaveWorkspace?: () => void;
  isOwner?: boolean;
  currentUserRole?: 'OWNER' | 'MEMBER' | 'VIEWER' | null;
  onToggleSidebar?: () => void;
  onTriggerCreatePasta: (parentId?: string) => void;
  onTriggerCreateNota: (pastaId?: string) => void;
  onTriggerCreateDesenho: (pastaId?: string) => void;
  onContextMenu: (e: React.MouseEvent, id: string, type: 'pasta' | 'nota', currentName: string) => void;
  onDragStart?: (e: React.DragEvent, type: 'pasta' | 'nota', itemId: string) => void;
  onDropToPasta?: (e: React.DragEvent, targetPastaId: string | null) => void;
  inlineAction: {
    type: 'create' | 'rename';
    itemType: 'pasta' | 'nota';
    id: string;
    value: string;
  } | null;
  setInlineAction: (action: any) => void;
  onInlineSubmit: (e: React.FormEvent) => void;
  inlineInputRef: React.RefObject<HTMLInputElement | null>;
}

export default function DiscordChannelSidebar({
  workspace,
  pastas,
  notas,
  currentUser,
  selectedNota,
  isGraphViewOpen,
  isFlashcardsOpen,
  isAiChatOpen,
  isTerminalOpen,
  sidebarSearch,
  setSidebarSearch,
  expandedFolders,
  toggleFolder,
  onSelectNota,
  onOpenGraph,
  onOpenFlashcards,
  onOpenAiChat,
  onOpenTerminal,
  onOpenWorkspaceSettings,
  onOpenUserSettings,
  onOpenLogoutConfirm,
  onOpenShareModal,
  onOpenLeaveWorkspace,
  isOwner = true,
  currentUserRole = 'OWNER',
  onToggleSidebar,
  onTriggerCreatePasta,
  onTriggerCreateNota,
  onTriggerCreateDesenho,
  onContextMenu,
  onDragStart,
  onDropToPasta,
  inlineAction,
  setInlineAction,
  onInlineSubmit,
  inlineInputRef,
}: DiscordChannelSidebarProps) {
  // Drag over tracking
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null);

  // Floating unclipped tooltip state
  const [tooltip, setTooltip] = useState<{ text: string; x: number; y: number; position?: 'right' | 'top' } | null>(null);

  const showTooltip = (e: React.MouseEvent, text: string, position: 'right' | 'top' = 'right') => {
    const rect = e.currentTarget.getBoundingClientRect();
    if (position === 'top') {
      setTooltip({
        text,
        x: rect.left + rect.width / 2,
        y: rect.top - 8,
        position: 'top',
      });
    } else {
      setTooltip({
        text,
        x: rect.right + 10,
        y: rect.top + rect.height / 2,
        position: 'right',
      });
    }
  };

  const hideTooltip = () => setTooltip(null);

  // Tree computation
  const rootPastas = pastas.filter((p) => !p.parentId);
  const notasSemPasta = notas.filter((n) => !n.pastaId);

  // Filtered search (pastas and notas)
  const isSearching = !!sidebarSearch.trim();
  const searchLower = sidebarSearch.toLowerCase().trim();
  const filteredNotas = isSearching
    ? notas.filter((n) => (n.titulo || '').toLowerCase().includes(searchLower))
    : [];
  const filteredPastas = isSearching
    ? pastas.filter((p) => (p.nome || '').toLowerCase().includes(searchLower))
    : [];

  // Recursive folder renderer (Discord category look: Left: Name with exact casing, Right: Arrow)
  const renderFolderItem = (pasta: any, depth = 0) => {
    const isExpanded = !!expandedFolders[pasta.id];
    const subpastas = pastas.filter((p) => p.parentId === pasta.id);
    const notasDaPasta = notas.filter((n) => n.pastaId === pasta.id);
    const isInlineEditing = inlineAction?.type === 'rename' && inlineAction?.id === pasta.id;
    const isInlineCreatingHere = inlineAction?.type === 'create' && inlineAction?.id === pasta.id;
    const isDragTarget = dragOverFolderId === pasta.id;

    return (
      <div
        key={pasta.id}
        className="flex flex-col mt-1"
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setDragOverFolderId(pasta.id);
        }}
        onDragLeave={(e) => {
          e.stopPropagation();
          if (dragOverFolderId === pasta.id) setDragOverFolderId(null);
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setDragOverFolderId(null);
          if (onDropToPasta) onDropToPasta(e, pasta.id);
        }}
      >
        {/* Folder Category Header Row: Left is Name, Right is Minimize/Maximize Arrow */}
        <div
          onClick={() => toggleFolder(pasta.id)}
          onContextMenu={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onContextMenu(e, pasta.id, 'pasta', pasta.nome);
          }}
          draggable
          onDragStart={(e) => {
            if (onDragStart) onDragStart(e, 'pasta', pasta.id);
          }}
          style={{ paddingLeft: `${8 + depth * 10}px` }}
          className={`group flex items-center justify-between py-1.5 px-2.5 rounded-md cursor-pointer select-none transition-all duration-150 ${
            isDragTarget
              ? 'bg-[var(--brand)]/15 border border-dashed border-[var(--brand)] text-[var(--foreground)]'
              : 'hover:bg-[var(--accents-2)]/60 text-[var(--accents-5)] hover:text-[var(--foreground)] border border-transparent'
          }`}
        >
          {/* Left: Folder Name (Faithfully respects user's typed casing) */}
          <div className="flex items-center overflow-hidden flex-1 mr-2">
            {isInlineEditing ? (
              <form onSubmit={onInlineSubmit} className="flex-1" onClick={(e) => e.stopPropagation()}>
                <input
                  ref={inlineInputRef}
                  value={inlineAction.value}
                  onChange={(e) => setInlineAction({ ...inlineAction, value: e.target.value })}
                  onBlur={() => setInlineAction(null)}
                  autoFocus
                  className="geist-input w-full h-5 text-xs px-1 py-0 bg-[var(--background)] border border-[var(--brand)]"
                />
              </form>
            ) : (
              <span className="text-xs font-semibold truncate text-[var(--accents-5)] group-hover:text-[var(--foreground)]">
                {pasta.nome}
              </span>
            )}
          </div>

          {/* Right: Minimize / Maximize Chevron Arrow */}
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            className={`transition-transform duration-200 shrink-0 ${
              isExpanded ? 'rotate-90 text-[var(--foreground)]' : 'text-[var(--accents-4)] group-hover:text-[var(--foreground)]'
            }`}
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </div>

        {/* Folder Children (Indented) */}
        {isExpanded && (
          <div className="flex flex-col pl-2 border-l border-[var(--accents-2)]/40 ml-3.5 my-0.5">
            {/* Inline creation input inside this folder */}
            {isInlineCreatingHere && (
              <form
                onSubmit={onInlineSubmit}
                className="py-1 pr-2"
                onClick={(e) => e.stopPropagation()}
              >
                <input
                  ref={inlineInputRef}
                  placeholder={`Nome da nova ${inlineAction.itemType}...`}
                  value={inlineAction.value}
                  onChange={(e) => setInlineAction({ ...inlineAction, value: e.target.value })}
                  onBlur={() => setInlineAction(null)}
                  autoFocus
                  className="geist-input w-full h-6 text-xs px-1.5 py-0 bg-[var(--background)] border border-[var(--brand)]"
                />
              </form>
            )}

            {/* Nested Subfolders */}
            {subpastas.map((sub) => renderFolderItem(sub, depth + 1))}

            {/* Nested Notes */}
            {notasDaPasta.map((nota) => renderNoteItem(nota, depth + 1))}

            {subpastas.length === 0 && notasDaPasta.length === 0 && !isInlineCreatingHere && (
              <span className="text-[11px] text-[var(--accents-4)] px-2 py-1 italic">
                Pasta vazia (arraste arquivos aqui)
              </span>
            )}
          </div>
        )}
      </div>
    );
  };

  // Note channel renderer (Draggable)
  const renderNoteItem = (nota: any, depth = 0) => {
    const isActive =
      selectedNota?.id === nota.id &&
      !isGraphViewOpen &&
      !isFlashcardsOpen &&
      !isAiChatOpen &&
      !isTerminalOpen;
    const isDrawing = nota.tipo === 'desenho';
    const isInlineEditing = inlineAction?.type === 'rename' && inlineAction?.id === nota.id;

    return (
      <div
        key={nota.id}
        onClick={() => onSelectNota(nota)}
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onContextMenu(e, nota.id, 'nota', nota.titulo);
        }}
        draggable
        onDragStart={(e) => {
          if (onDragStart) onDragStart(e, 'nota', nota.id);
        }}
        className={`group flex items-center justify-between h-[34px] px-2 mx-1 rounded-[4px] cursor-pointer select-none transition-all duration-150 ${
          isActive
            ? 'bg-[var(--discord-active)] text-white font-medium'
            : 'text-[var(--discord-text-channel)] hover:text-[var(--discord-text-primary)] hover:bg-[var(--discord-hover)]'
        }`}
      >
        <div className="flex items-center gap-2 overflow-hidden flex-1 mr-1">
          {isDrawing ? (
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className={`shrink-0 ${isActive ? 'text-[var(--brand)]' : 'text-[var(--discord-text-muted)] group-hover:text-[var(--discord-text-primary)]'}`}
            >
              <path d="M12 19l7-7 3 3-7 7-3-3z" />
              <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
            </svg>
          ) : (
            <span
              className={`text-sm font-mono shrink-0 font-bold leading-none ${
                isActive ? 'text-white' : 'text-[var(--discord-text-muted)] group-hover:text-[var(--discord-text-primary)]'
              }`}
            >
              #
            </span>
          )}

          {isInlineEditing ? (
            <form onSubmit={onInlineSubmit} className="flex-1" onClick={(e) => e.stopPropagation()}>
              <input
                ref={inlineInputRef}
                value={inlineAction.value}
                onChange={(e) => setInlineAction({ ...inlineAction, value: e.target.value })}
                onBlur={() => setInlineAction(null)}
                autoFocus
                className="w-full h-6 text-xs px-1.5 py-0 bg-[var(--discord-input)] text-[var(--discord-text-primary)] border border-[var(--brand)] rounded-[4px] outline-none"
              />
            </form>
          ) : (
            <span className="text-xs truncate">{nota.titulo || 'Nota sem título'}</span>
          )}
        </div>
      </div>
    );
  };

  return (
    <nav
      className="w-[240px] min-w-[240px] h-full flex flex-col justify-between select-none z-20 shrink-0 border-r relative"
      style={{ background: 'var(--discord-sidebar)', borderColor: 'var(--discord-border)' }}
      aria-label="Workspace Channel Sidebar"
    >
      {/* 1. WORKSPACE HEADER: Name + Direct Invite (👤+) + Settings (⚙️) + Close Sidebar */}
      <div className="h-12 px-4 flex items-center justify-between border-b shrink-0 shadow-xs" style={{ borderColor: 'var(--discord-border)' }}>
        {/* Workspace Name & Icon */}
        <div className="flex items-center gap-2 overflow-hidden mr-2">
          {workspace?.icone && (
            <div className="w-5 h-5 rounded-[4px] shrink-0 flex items-center justify-center overflow-hidden">
              <WorkspaceIcon
                icone={workspace.icone}
                nome={workspace.nome || ''}
                size={16}
                className="w-full h-full"
                emojiClassName="text-sm"
              />
            </div>
          )}
          <span className="font-bold text-sm text-[var(--discord-text-primary)] truncate tracking-tight">
            {workspace?.nome || 'Workspace'}
          </span>
        </div>

        {/* Header Action Buttons: Invite + Settings (Owner only) OR Leave (Collaborators) */}
        <div className="flex items-center gap-0.5 shrink-0 text-[var(--accents-5)]">
          {isOwner ? (
            <>
              {/* Invite / Share Button */}
              <button
                type="button"
                onClick={onOpenShareModal}
                onMouseEnter={(e) => showTooltip(e, 'Convidar Pessoas')}
                onMouseLeave={hideTooltip}
                className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-[var(--accents-2)] hover:text-[var(--foreground)] transition-colors cursor-pointer border-none bg-transparent"
                aria-label="Convidar Pessoas"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="8.5" cy="7" r="4" />
                  <line x1="20" y1="8" x2="20" y2="14" />
                  <line x1="23" y1="11" x2="17" y2="11" />
                </svg>
              </button>

              {/* Workspace Settings Gear */}
              <button
                type="button"
                onClick={onOpenWorkspaceSettings}
                onMouseEnter={(e) => showTooltip(e, 'Configurações do Workspace')}
                onMouseLeave={hideTooltip}
                className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-[var(--accents-2)] hover:text-[var(--foreground)] transition-colors cursor-pointer border-none bg-transparent"
                aria-label="Configurações do Workspace"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                </svg>
              </button>
            </>
          ) : (
            onOpenLeaveWorkspace && (
              /* Leave Workspace Button */
              <button
                type="button"
                onClick={onOpenLeaveWorkspace}
                onMouseEnter={(e) => showTooltip(e, 'Sair do Workspace')}
                onMouseLeave={hideTooltip}
                className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-[#f23f43]/15 text-[var(--accents-5)] hover:text-[#f23f43] transition-colors cursor-pointer border-none bg-transparent"
                aria-label="Sair do Workspace"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
              </button>
            )
          )}

          {/* Close Sidebar Button */}
          {onToggleSidebar && (
            <button
              type="button"
              onClick={onToggleSidebar}
              onMouseEnter={(e) => showTooltip(e, 'Recolher Barra Lateral (Ctrl+D)')}
              onMouseLeave={hideTooltip}
              className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-[var(--accents-2)] hover:text-[var(--foreground)] transition-colors cursor-pointer border-none bg-transparent"
              aria-label="Recolher Barra Lateral"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect width="18" height="18" x="3" y="3" rx="2" />
                <path d="M9 3v18" />
                <path d="m16 15-3-3 3-3" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* 2. SLEEK ACTION BUTTONS (#, Folder, Canvas) + DISCORD SEARCH BAR */}
      <div className="px-2 pt-2.5 pb-1.5 flex flex-col gap-2 shrink-0 border-b border-[var(--accents-2)]/50">
        {/* Action Row: buttons for Editor/Owner or Read-Only banner for Viewer */}
        {currentUserRole === 'VIEWER' ? (
          <div className="px-2.5 py-1.5 rounded-md bg-[var(--accents-1)] border border-[var(--accents-2)] flex items-center justify-center gap-1.5 text-[11px] text-[var(--accents-5)] font-mono">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            <span>Modo Visualizador (Leitura)</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 px-0.5">
            {/* Criar Nota (#) */}
            <button
              type="button"
              onClick={() => onTriggerCreateNota()}
              onMouseEnter={(e) => showTooltip(e, 'Criar Nota', 'top')}
              onMouseLeave={hideTooltip}
              className="flex-1 h-8 flex items-center justify-center rounded-md bg-[var(--accents-1)] hover:bg-[var(--accents-2)] text-[var(--accents-6)] hover:text-[var(--foreground)] border border-[var(--accents-2)] hover:border-[var(--accents-3)] transition-colors cursor-pointer group shadow-2xs"
              aria-label="Criar Nota"
            >
              <span className="font-mono font-bold text-sm text-[var(--foreground)] group-hover:scale-110 transition-transform">
                #
              </span>
            </button>

            {/* Criar Pasta */}
            <button
              type="button"
              onClick={() => onTriggerCreatePasta()}
              onMouseEnter={(e) => showTooltip(e, 'Criar Pasta', 'top')}
              onMouseLeave={hideTooltip}
              className="flex-1 h-8 flex items-center justify-center rounded-md bg-[var(--accents-1)] hover:bg-[var(--accents-2)] text-[var(--accents-6)] hover:text-[var(--foreground)] border border-[var(--accents-2)] hover:border-[var(--accents-3)] transition-colors cursor-pointer group shadow-2xs"
              aria-label="Criar Pasta"
            >
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="text-[var(--foreground)] group-hover:scale-110 transition-transform"
              >
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
              </svg>
            </button>

            {/* Criar Desenho */}
            <button
              type="button"
              onClick={() => onTriggerCreateDesenho()}
              onMouseEnter={(e) => showTooltip(e, 'Criar Desenho', 'top')}
              onMouseLeave={hideTooltip}
              className="flex-1 h-8 flex items-center justify-center rounded-md bg-[var(--accents-1)] hover:bg-[var(--accents-2)] text-[var(--accents-6)] hover:text-[var(--foreground)] border border-[var(--accents-2)] hover:border-[var(--accents-3)] transition-colors cursor-pointer group shadow-2xs"
              aria-label="Criar Desenho"
            >
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="text-[var(--foreground)] group-hover:scale-110 transition-transform"
              >
                <path d="M12 19l7-7 3 3-7 7-3-3z" />
                <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
              </svg>
            </button>
          </div>
        )}

        {/* Discord-style Search Bar for Pastas and Notas */}
        <div className="relative flex items-center">
          <input
            type="text"
            placeholder={workspace?.name ? `Buscar ${workspace.name}` : 'Buscar no workspace...'}
            value={sidebarSearch}
            onChange={(e) => setSidebarSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setSidebarSearch('');
                e.currentTarget.blur();
              }
            }}
            className="w-full h-8 pl-3 pr-8 rounded-[4px] bg-[#1e1f22] hover:bg-[#1e1f22]/90 focus:bg-[#1e1f22] border border-[#232428] hover:border-[#35373c] focus:border-[var(--brand)] text-[13px] font-['gg_sans','Noto_Sans','Helvetica_Neue',Helvetica,Arial,sans-serif] font-normal text-[#dbdee1] placeholder-[#949ba4] transition-colors outline-none antialiased"
          />
          {sidebarSearch ? (
            <button
              type="button"
              onClick={() => setSidebarSearch('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-[#949ba4] hover:text-[#dbdee1] transition-colors cursor-pointer border-none bg-transparent flex items-center justify-center rounded-sm"
              title="Limpar busca"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          ) : (
            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#949ba4] pointer-events-none flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="7" />
                <line x1="16.5" y1="16.5" x2="21" y2="21" />
              </svg>
            </div>
          )}
        </div>
      </div>

      {/* 3. CHANNELS LIST (SCROLLABLE & DROP ZONE FOR ROOT) */}
      <div
        className="flex-1 overflow-y-auto overflow-x-hidden p-2 flex flex-col gap-2 no-scrollbar"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          if (onDropToPasta) onDropToPasta(e, null);
        }}
      >
        {/* SEARCH RESULTS MODE */}
        {isSearching ? (
          <div className="flex flex-col gap-2">
            {/* Pastas encontradas */}
            {filteredPastas.length > 0 && (
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--accents-4)] px-2 py-0.5 font-mono">
                  PASTAS ({filteredPastas.length})
                </span>
                {filteredPastas.map((pasta) => renderFolderItem(pasta, 0))}
              </div>
            )}

            {/* Notas encontradas */}
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--accents-4)] px-2 py-0.5 font-mono">
                NOTAS ({filteredNotas.length})
              </span>
              {filteredNotas.length === 0 && filteredPastas.length === 0 ? (
                <span className="text-xs text-[var(--accents-4)] px-2 py-3 text-center">Nenhum resultado encontrado</span>
              ) : (
                filteredNotas.map((n) => renderNoteItem(n))
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-0.5">
            {/* Root inline creation input */}
              {inlineAction?.type === 'create' && inlineAction?.id === 'root' && (
                <form onSubmit={onInlineSubmit} className="py-1 px-2">
                  <input
                    ref={inlineInputRef}
                    placeholder={`Nome da nova ${inlineAction.itemType}...`}
                    value={inlineAction.value}
                    onChange={(e) => setInlineAction({ ...inlineAction, value: e.target.value })}
                    onBlur={() => setInlineAction(null)}
                    autoFocus
                    className="geist-input w-full h-6 text-xs px-1.5 py-0 bg-[var(--background)] border border-[var(--brand)]"
                  />
                </form>
              )}

              {/* Folders rendered as Discord category headers (Left: Name with exact casing, Right: Arrow) */}
              {rootPastas.map((pasta) => renderFolderItem(pasta, 0))}

              {/* Root Notes */}
              {notasSemPasta.map((nota) => renderNoteItem(nota, 0))}

              {rootPastas.length === 0 && notasSemPasta.length === 0 && (
                <div className="text-center py-6 px-3 flex flex-col items-center gap-2 text-[var(--accents-4)]">
                  <span className="text-xs">Nenhum documento ainda</span>
                  <button
                    type="button"
                    onClick={() => onTriggerCreateNota()}
                    className="text-xs text-[var(--brand)] hover:underline cursor-pointer border-none bg-transparent"
                  >
                    + Criar primeira nota
                  </button>
                </div>
              )}
            </div>
        )}
      </div>

      {/* 4. DISCORD INTEGRATED USER PROFILE DOCK */}
      <div
        className="w-full h-[52px] bg-[var(--discord-user-bar)] px-2 flex items-center justify-between border-t shrink-0 select-none z-30"
        style={{ borderColor: 'var(--discord-border)' }}
      >
        {/* User Info (Avatar + Monogram + Name) */}
        <div
          onClick={onOpenUserSettings}
          onMouseEnter={(e) => showTooltip(e, 'Configurações da Conta')}
          onMouseLeave={hideTooltip}
          className="flex items-center gap-2 p-1 -ml-0.5 rounded-[4px] hover:bg-[var(--discord-hover)] transition-colors cursor-pointer overflow-hidden flex-1 mr-1"
        >
          {/* Avatar without green dot */}
          <div className="w-8 h-8 rounded-full bg-[var(--brand)] text-white font-bold text-xs flex items-center justify-center select-none shadow-xs shrink-0 overflow-hidden border border-[var(--discord-border)]">
            {currentUser?.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={currentUser.avatarUrl}
                alt={currentUser.username || currentUser.name || 'Avatar'}
                className="w-full h-full object-cover select-none pointer-events-none"
              />
            ) : (
              <span>
                {currentUser?.username?.[0]?.toUpperCase() || currentUser?.name?.[0]?.toUpperCase() || currentUser?.email?.[0]?.toUpperCase() || 'U'}
              </span>
            )}
          </div>

          <div className="flex flex-col overflow-hidden min-w-0">
            <span className="text-xs font-semibold text-[var(--discord-text-primary)] truncate leading-tight">
              {currentUser?.username ? `@${currentUser.username}` : (currentUser?.name || currentUser?.email?.split('@')[0] || 'Usuário')}
            </span>
            <span className="text-[11px] text-[var(--discord-text-muted)] truncate leading-tight font-sans">
              {currentUser?.name || currentUser?.email || ''}
            </span>
          </div>
        </div>

        {/* Action Buttons: Settings, Logout */}
        <div className="flex items-center gap-0.5 shrink-0 text-[var(--discord-text-muted)]">
          {/* Settings Gear */}
          <button
            type="button"
            onClick={onOpenUserSettings}
            onMouseEnter={(e) => showTooltip(e, 'Configurações de Usuário', 'top')}
            onMouseLeave={hideTooltip}
            className="w-8 h-8 flex items-center justify-center rounded-[4px] hover:bg-[var(--discord-hover)] hover:text-[var(--discord-text-primary)] transition-colors cursor-pointer border-none bg-transparent"
            aria-label="Configurações de Usuário"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>

          {/* Logout */}
          <button
            type="button"
            onClick={onOpenLogoutConfirm}
            onMouseEnter={(e) => showTooltip(e, 'Sair da Conta', 'top')}
            onMouseLeave={hideTooltip}
            className="w-8 h-8 flex items-center justify-center rounded-[4px] hover:bg-red-500/15 hover:text-red-400 transition-colors cursor-pointer border-none bg-transparent"
            aria-label="Sair da Conta"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </button>
        </div>
      </div>

      {/* 5. GLOBAL FLOATING UNCLIPPED TOOLTIP */}
      {tooltip && (
        <div
          className="fixed z-9999 px-2.5 py-1 rounded-md text-xs font-medium text-[var(--foreground)] bg-[var(--background)] border border-[var(--accents-2)] shadow-xl pointer-events-none whitespace-nowrap animate-smooth-pop"
          style={{
            left: `${tooltip.x}px`,
            top: `${tooltip.y}px`,
            transform: tooltip.position === 'top' ? 'translate(-50%, -100%)' : 'translateY(-50%)',
          }}
        >
          {tooltip.text}
        </div>
      )}
    </nav>
  );
}
