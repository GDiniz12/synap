'use client';

import React from 'react';

interface LogoutConfirmModalProps {
  onConfirm: () => void;
  onClose: () => void;
}

export default function LogoutConfirmModal({ onConfirm, onClose }: LogoutConfirmModalProps) {
  return (
    <div
      className="fixed inset-0 z-[2000] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 select-none animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[420px] bg-[var(--accents-1)] border border-[var(--discord-border)] rounded-xl shadow-2xl overflow-hidden flex flex-col animate-smooth-pop"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[var(--error)]/15 text-[var(--error)] border border-[var(--error)]/30 flex items-center justify-center shrink-0">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
            </div>
            <div>
              <h3 className="text-base font-semibold text-white leading-tight">
                Encerrar Sessão
              </h3>
              <span className="text-xs text-[var(--accents-5)]">
                Confirmação de logout
              </span>
            </div>
          </div>

          <p className="text-sm text-[var(--accents-5)] leading-relaxed">
            Tem certeza de que deseja sair da sua conta do Synap neste dispositivo?
          </p>
        </div>

        <div className="bg-[var(--background)] border-t border-[var(--discord-border)] px-6 py-3.5 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="h-9 px-4 text-xs font-medium rounded-[4px] bg-[var(--accents-2)] hover:bg-[var(--discord-border)] border border-[var(--discord-border)] text-[var(--accents-6)] hover:text-white transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="h-9 px-5 text-xs font-semibold rounded-[4px] bg-[var(--error)] hover:bg-[var(--error)] text-white shadow-sm transition-colors cursor-pointer"
          >
            Sair da Conta
          </button>
        </div>
      </div>
    </div>
  );
}
