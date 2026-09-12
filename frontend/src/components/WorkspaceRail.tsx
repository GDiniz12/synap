'use client';

import React, { useState } from 'react';
import SynapLogo from '@/components/SynapLogo';
import WorkspaceIcon from '@/components/WorkspaceIcon';

export interface WorkspaceRailItem {
  id: string;
  nome: string;
  icone?: string | null;
  isCollaborative?: boolean;
}

interface WorkspaceRailProps {
  workspaces: WorkspaceRailItem[];
  activeWorkspaceId?: string;
  currentUser?: any;
  isSidebarOpen?: boolean;
  onSelectWorkspace: (workspaceId: string) => void;
  onOpenCreateModal: () => void;
  onOpenSettingsModal?: () => void;
  onGoHome?: () => void;
  isHomeActive?: boolean;
}

function getInitials(name: string): string {
  if (!name) return 'WS';
  const words = name.trim().split(/\s+/);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export default function WorkspaceRail({
  workspaces,
  activeWorkspaceId,
  currentUser,
  isSidebarOpen = true,
  onSelectWorkspace,
  onOpenCreateModal,
  onOpenSettingsModal,
  onGoHome,
  isHomeActive = false,
}: WorkspaceRailProps) {
  const [hoveredTooltip, setHoveredTooltip] = useState<{
    id: string;
    label: string;
    top: number;
    badge?: string;
  } | null>(null);

  const handleMouseEnter = (id: string, label: string, e: React.MouseEvent, badge?: string) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const centerY = rect.top + rect.height / 2;
    setHoveredTooltip({ id, label, top: centerY, badge });
  };

  const handleMouseLeave = () => {
    setHoveredTooltip(null);
  };

  return (
    <aside
      className="w-[52px] min-w-[52px] h-full flex flex-col items-center py-3 select-none z-40 shrink-0 border-r relative"
      style={{ background: 'var(--background)', borderColor: 'var(--discord-border)' }}
      aria-label="Workspaces Rail"
    >
      {/* 1. HOME LOGO BUTTON */}
      <div
        className="relative flex items-center justify-center w-full py-1"
        onMouseEnter={(e) => handleMouseEnter('home', 'Painel Principal', e)}
        onMouseLeave={handleMouseLeave}
      >
        <button
          type="button"
          onClick={() => { if (onGoHome) onGoHome(); }}
          className={`w-9 h-9 flex items-center justify-center transition-colors cursor-pointer overflow-hidden border-none ${
            isHomeActive
              ? 'rounded-[8px] bg-[var(--accents-2)]'
              : 'rounded-[8px] hover:bg-[var(--accents-1)]'
          }`}
          aria-label="Painel Principal"
        >
          <SynapLogo size={28} priority />
        </button>
      </div>

      {/* Separator */}
      <div className="w-7 h-[1px] mx-auto my-2 shrink-0" style={{ background: 'var(--discord-border)' }} />

      {/* 2. SCROLLABLE WORKSPACE ICONS LIST */}
      <div className="flex-1 w-full overflow-y-auto overflow-x-hidden no-scrollbar flex flex-col items-center gap-1 py-1">
        {workspaces.map((ws) => {
          const isActive = ws.id === activeWorkspaceId && !isHomeActive;

          return (
            <div
              key={ws.id}
              className="relative flex items-center justify-center w-full py-0.5"
              onMouseEnter={(e) => handleMouseEnter(ws.id, ws.nome, e, ws.isCollaborative ? 'Colab' : undefined)}
              onMouseLeave={handleMouseLeave}
            >
              <button
                type="button"
                onClick={() => onSelectWorkspace(ws.id)}
                className={`w-9 h-9 flex items-center justify-center font-bold text-xs tracking-wide select-none transition-colors cursor-pointer overflow-hidden border-none ${
                  isActive
                    ? 'rounded-[8px] bg-[var(--accents-2)] text-[var(--foreground)]'
                    : 'rounded-[8px] bg-transparent text-[var(--accents-5)] hover:bg-[var(--accents-1)] hover:text-[var(--foreground)]'
                }`}
                aria-label={ws.nome}
              >
                <WorkspaceIcon
                  icone={ws.icone}
                  nome={ws.nome}
                  size={20}
                  className="w-full h-full"
                  emojiClassName="text-base"
                  fallbackClassName="text-[10px]"
                />
              </button>
            </div>
          );
        })}

        {/* 3. ADD WORKSPACE (+) BUTTON */}
        <div
          className="relative flex items-center justify-center w-full py-0.5"
          onMouseEnter={(e) => handleMouseEnter('add', 'Adicionar Workspace', e)}
          onMouseLeave={handleMouseLeave}
        >
          <button
            type="button"
            onClick={onOpenCreateModal}
            className="w-9 h-9 flex items-center justify-center text-[var(--accents-5)] rounded-[8px] hover:bg-[var(--accents-1)] hover:text-[var(--foreground)] transition-colors cursor-pointer border-none"
            aria-label="Criar Workspace"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
        </div>
      </div>

      {/* 4. BOTTOM AREA: USER AVATAR (when sidebar closed) */}
      {!isSidebarOpen && (
        <div
          className="relative flex items-center justify-center w-full pt-2 shrink-0 border-t"
          style={{ borderColor: 'var(--discord-border)' }}
          onMouseEnter={(e) => handleMouseEnter('user-avatar', currentUser?.username ? `@${currentUser.username}` : (currentUser?.name || 'Minha Conta'), e, 'Ctrl+D')}
          onMouseLeave={handleMouseLeave}
        >
          <button
            type="button"
            onClick={() => { if (onOpenSettingsModal) onOpenSettingsModal(); }}
            className="w-8 h-8 rounded-[6px] bg-[var(--accents-1)] text-[var(--foreground)] font-bold text-xs flex items-center justify-center select-none cursor-pointer hover:bg-[var(--accents-2)] transition-colors overflow-hidden"
            aria-label="Configurações do Usuário"
          >
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
          </button>
        </div>
      )}

      {/* 5. FLOATING TOOLTIP (clean, no arrow) */}
      {hoveredTooltip && (
        <div
          style={{
            top: `${hoveredTooltip.top}px`,
            transform: 'translateY(-50%)',
          }}
          className="fixed left-[60px] z-[9999] px-2.5 py-1 rounded-[4px] text-xs font-medium whitespace-nowrap bg-[var(--accents-3)] text-[var(--foreground)] shadow-lg pointer-events-none flex items-center gap-2 select-none"
        >
          <span className="max-w-[220px] truncate">{hoveredTooltip.label}</span>
          {hoveredTooltip.badge && (
            <span className="text-[10px] uppercase px-1.5 py-0.5 rounded bg-[var(--accents-1)] text-[var(--brand)]">
              {hoveredTooltip.badge}
            </span>
          )}
        </div>
      )}
    </aside>
  );
}
