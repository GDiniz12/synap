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
    <div
      className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 select-none animate-in fade-in duration-150 font-sansation"
      onClick={onClose}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose();
      }}
    >
      <div
        className="bg-[#181818] border border-white/10 rounded-none w-full max-w-md overflow-hidden shadow-2xl flex flex-col animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10 flex justify-between items-center bg-[#141414]">
          <div className="flex items-center gap-2.5 text-red-400">
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
            type="button"
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-none text-zinc-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
            aria-label="Fechar"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="p-6 flex flex-col gap-4">
          <p className="text-xs text-zinc-300 leading-relaxed">
            Tem certeza de que deseja sair de <strong className="text-white">"{workspaceNome}"</strong>?
          </p>
          <div className="p-3.5 rounded-none bg-white/5 border border-white/10 text-xs text-zinc-400 leading-relaxed">
            Você perderá o acesso às notas, pastas e conversas deste workspace até ser convidado novamente pelo proprietário.
          </div>

          {error && (
            <div className="p-3 rounded-none bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-[#141414] border-t border-white/10 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={isLeaving}
            className="h-8 px-4 text-xs font-semibold rounded-none bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 hover:text-white transition-colors cursor-pointer disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleLeave}
            disabled={isLeaving}
            className="h-8 px-4 text-xs font-bold rounded-none bg-red-500 hover:bg-red-600 text-white transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
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
