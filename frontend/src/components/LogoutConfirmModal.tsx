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
        className="w-full max-w-[420px] bg-[#2b2d31] border border-[#383a40] rounded-xl shadow-2xl overflow-hidden flex flex-col animate-smooth-pop"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#f23f43]/15 text-[#f23f43] border border-[#f23f43]/30 flex items-center justify-center shrink-0">
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
              <span className="text-xs text-[#949ba4]">
                Confirmação de logout
              </span>
            </div>
          </div>

          <p className="text-sm text-[#949ba4] leading-relaxed">
            Tem certeza de que deseja sair da sua conta do Synap neste dispositivo?
          </p>
        </div>

        <div className="bg-[#1e1f22] border-t border-[#383a40] px-6 py-3.5 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="h-9 px-4 text-xs font-medium rounded-[4px] bg-[#313338] hover:bg-[#383a40] border border-[#383a40] text-[#dbdee1] hover:text-white transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="h-9 px-5 text-xs font-semibold rounded-[4px] bg-[#f23f43] hover:bg-[#d83a3e] text-white shadow-sm transition-colors cursor-pointer"
          >
            Sair da Conta
          </button>
        </div>
      </div>
    </div>
  );
}
