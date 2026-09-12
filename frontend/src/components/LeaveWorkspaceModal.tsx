'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

interface LeaveWorkspaceModalProps {
  isOpen: boolean;
  workspaceId: string;
  workspaceNome: string;
  onClose: () => void;
}

export default function LeaveWorkspaceModal({
  isOpen,
  workspaceId,
  workspaceNome,
  onClose,
}: LeaveWorkspaceModalProps) {
  const [isLeaving, setIsLeaving] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  if (!isOpen) return null;

  const handleLeave = async () => {
    setIsLeaving(true);
    setError('');

    try {
      await api(`/workspaces/${workspaceId}/leave`, {
        method: 'POST',
      });
      onClose();
      router.push('/dashboard');
    } catch (err: any) {
      console.error('Erro ao sair do workspace:', err);
      setError(err.message || 'Não foi possível sair do workspace. Tente novamente.');
      setIsLeaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 select-none animate-in fade-in duration-150">
      <div className="bg-[var(--accents-1)] border border-[var(--discord-border)] rounded-xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col animate-smooth-pop">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[var(--discord-border)] flex justify-between items-center bg-[var(--background)]">
          <div className="flex items-center gap-2.5 text-[var(--error)]">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            <h2 className="text-sm font-bold text-white tracking-tight leading-tight">
              Sair do Workspace
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-[4px] text-[var(--accents-5)] hover:text-white hover:bg-[var(--accents-2)] transition-colors cursor-pointer"
            aria-label="Fechar"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="p-5 flex flex-col gap-4">
          <p className="text-xs text-[var(--accents-6)] leading-relaxed">
            Tem certeza de que deseja sair de <strong className="text-white">"{workspaceNome}"</strong>?
          </p>
          <div className="p-3 rounded-lg bg-[var(--background)] border border-[var(--discord-border)] text-xs text-[var(--accents-5)] leading-relaxed">
            Você perderá o acesso às notas, pastas e conversas deste workspace até ser convidado novamente pelo proprietário.
          </div>

          {error && (
            <div className="p-2.5 rounded-[6px] bg-[var(--error)]/10 border border-[var(--error)]/30 text-[var(--error)] text-xs font-medium">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 bg-[var(--background)] border-t border-[var(--discord-border)] flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isLeaving}
            className="h-8 px-4 text-xs font-medium rounded-[4px] bg-[var(--accents-2)] hover:bg-[var(--discord-border)] border border-[var(--discord-border)] text-[var(--accents-6)] hover:text-white transition-colors cursor-pointer disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleLeave}
            disabled={isLeaving}
            className="h-8 px-4 text-xs font-semibold rounded-[4px] bg-[var(--error)] hover:bg-[#da373b] text-white transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
          >
            {isLeaving ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Saindo...</span>
              </>
            ) : (
              <span>Sim, Sair</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
