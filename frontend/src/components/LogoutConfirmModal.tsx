'use client';

import React from 'react';

interface LogoutConfirmModalProps {
  onConfirm: () => void;
  onClose: () => void;
}

export default function LogoutConfirmModal({ onConfirm, onClose }: LogoutConfirmModalProps) {
  return (
    <div
      className="fixed inset-0 z-[2000] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 select-none animate-in fade-in duration-150 font-sansation"
      onClick={onClose}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose();
      }}
    >
      <div
        className="w-full max-w-[420px] bg-[#181818] border border-white/10 rounded-none shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-none bg-red-500/10 text-red-400 border border-red-500/20 flex items-center justify-center shrink-0">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </div>
            <div>
              <h3 className="text-base font-bold text-white leading-tight">
                Encerrar Sessão
              </h3>
              <span className="text-xs text-zinc-400 block mt-0.5">
                Confirmação de logout
              </span>
            </div>
          </div>

          <p className="text-sm text-zinc-400 leading-relaxed">
            Tem certeza de que deseja sair da sua conta do Synap neste dispositivo?
          </p>
        </div>

        <div className="bg-[#141414] border-t border-white/10 px-6 py-3.5 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="h-8 px-4 text-xs font-semibold rounded-none bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 hover:text-white transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="h-8 px-5 text-xs font-bold rounded-none bg-red-500 hover:bg-red-600 text-white transition-colors cursor-pointer"
          >
            Sair da Conta
          </button>
        </div>
      </div>
    </div>
  );
}
