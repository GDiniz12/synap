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
      className="w-[72px] min-w-[72px] h-full flex flex-col items-center py-3 select-none z-40 shrink-0 border-r relative"
      style={{ background: 'var(--discord-rail)', borderColor: 'var(--discord-border)' }}
      aria-label="Workspaces Rail"
    >
      {/* 1. TOP DIRECT / HOME LOGO BUTTON */}
      <div
        className="relative flex items-center justify-center w-full py-1"
        onMouseEnter={(e) => handleMouseEnter('home', 'Painel Principal', e)}
        onMouseLeave={handleMouseLeave}
      >
        {/* Left Indicator Pill */}
        <div
          className={`absolute left-0 w-1 bg-[var(--foreground)] rounded-r-full transition-all duration-200 ${
            isHomeActive
              ? 'h-10'
              : hoveredTooltip?.id === 'home'
              ? 'h-5'
              : 'h-0'
          }`}
        />

        {/* Squircle Button */}
        <button
          type="button"
          onClick={() => {
            if (onGoHome) onGoHome();
          }}
          className={`w-12 h-12 flex items-center justify-center transition-all duration-200 cursor-pointer overflow-hidden border-none ${
            isHomeActive
              ? 'rounded-[16px] bg-[var(--discord-sidebar)] ring-2 ring-[var(--brand)] shadow-lg'
              : 'rounded-[24px] bg-[var(--discord-sidebar)] hover:rounded-[16px] hover:bg-[#35373c]'
          }`}
          aria-label="Painel Principal"
        >
          <SynapLogo size={36} priority />
        </button>
      </div>

      {/* Separator */}
      <div className="w-8 h-[2px] rounded-full mx-auto my-2 shrink-0" style={{ background: 'var(--discord-border)' }} />

      {/* 2. SCROLLABLE WORKSPACE ICONS LIST */}
      <div className="flex-1 w-full overflow-y-auto overflow-x-hidden no-scrollbar flex flex-col items-center gap-2 py-1">
        {workspaces.map((ws) => {
          const isActive = ws.id === activeWorkspaceId && !isHomeActive;
          const isHovered = hoveredTooltip?.id === ws.id;

          return (
            <div
              key={ws.id}
              className="relative flex items-center justify-center w-full py-0.5"
              onMouseEnter={(e) => handleMouseEnter(ws.id, ws.nome, e, ws.isCollaborative ? 'Colab' : undefined)}
              onMouseLeave={handleMouseLeave}
            >
              {/* Left Indicator Pill */}
              <div
                className={`absolute left-0 w-1 bg-[var(--foreground)] rounded-r-full transition-all duration-200 ${
                  isActive
                    ? 'h-10'
                    : isHovered
                    ? 'h-5'
                    : 'h-0'
                }`}
              />

              {/* Workspace Squircle Button */}
              <button
                type="button"
                onClick={() => onSelectWorkspace(ws.id)}
                className={`w-12 h-12 flex items-center justify-center font-bold text-sm tracking-wide select-none transition-all duration-200 cursor-pointer overflow-hidden border-none ${
                  isActive
                    ? 'rounded-[16px] bg-[var(--brand)] text-white shadow-md'
                    : 'rounded-[24px] bg-[var(--discord-sidebar)] text-[var(--discord-text-muted)] hover:rounded-[16px] hover:bg-[var(--brand)] hover:text-white'
                }`}
                aria-label={ws.nome}
              >
                <WorkspaceIcon
                  icone={ws.icone}
                  nome={ws.nome}
                  size={24}
                  className="w-full h-full"
                  emojiClassName="text-xl"
                  fallbackClassName="text-xs"
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
          {/* Left Pill on Hover */}
          <div
            className={`absolute left-0 w-1 bg-[var(--foreground)] rounded-r-full transition-all duration-200 ${
              hoveredTooltip?.id === 'add' ? 'h-5' : 'h-0'
            }`}
          />

          <button
            type="button"
            onClick={onOpenCreateModal}
            className="w-12 h-12 flex items-center justify-center text-emerald-400 rounded-[24px] bg-[var(--discord-sidebar)] hover:rounded-[16px] hover:bg-[#23a55a] hover:text-white transition-all duration-200 cursor-pointer border-none shadow-sm"
            aria-label="Criar Workspace"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
        </div>
      </div>

      {/* 4. BOTTOM AREA: WHEN SIDEBAR IS CLOSED, SHOW ONLY USER PHOTO */}
      {!isSidebarOpen && (
        <div
          className="relative flex items-center justify-center w-full pt-2 shrink-0 border-t"
          style={{ borderColor: 'var(--discord-border)' }}
          onMouseEnter={(e) => handleMouseEnter('user-avatar', currentUser?.username ? `@${currentUser.username}` : (currentUser?.name || 'Minha Conta'), e, 'Ctrl+D')}
          onMouseLeave={handleMouseLeave}
        >
          <button
            type="button"
            onClick={() => {
              if (onOpenSettingsModal) onOpenSettingsModal();
            }}
            className="w-10 h-10 rounded-full bg-[var(--discord-sidebar)] text-[var(--discord-text-primary)] font-bold text-xs flex items-center justify-center select-none shadow-sm cursor-pointer hover:ring-2 hover:ring-[var(--brand)] transition-all border border-[var(--discord-border)] overflow-hidden"
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

      {/* 5. GLOBAL FIXED FLOATING DISCORD TOOLTIP (NEVER CLIPPED) */}
      {hoveredTooltip && (
        <div
          style={{
            top: `${hoveredTooltip.top}px`,
            transform: 'translateY(-50%)',
          }}
          className="fixed left-[80px] z-[9999] px-3 py-1.5 rounded-[6px] text-xs font-semibold whitespace-nowrap bg-[#111114] text-[#ededed] border border-[var(--accents-3)] shadow-2xl pointer-events-none flex items-center gap-2 animate-smooth-pop select-none"
        >
          <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-2 h-2 bg-[#111114] border-l border-b border-[var(--accents-3)] rotate-45" />
          <span className="max-w-[220px] truncate">{hoveredTooltip.label}</span>
          {hoveredTooltip.badge && (
            <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-[var(--accents-3)] text-emerald-400">
              {hoveredTooltip.badge}
            </span>
          )}
        </div>
      )}
    </aside>
  );
}
