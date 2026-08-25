'use client';

import React from 'react';

interface LogoutConfirmModalProps {
  onConfirm: () => void;
  onClose: () => void;
}

export default function LogoutConfirmModal({ onConfirm, onClose }: LogoutConfirmModalProps) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 2000,
        background: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        userSelect: 'none',
      }}
      onClick={onClose}
    >
      <div
        className="mobile-bottom-sheet md:max-w-[400px] w-full"
        style={{
          background: 'var(--background)',
          border: '1px solid var(--accents-2)',
          borderRadius: '12px',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              background: 'rgba(238, 0, 0, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--error)',
              flexShrink: 0,
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
          </div>
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: 'var(--foreground)' }}>
            Encerrar Sessão
          </h3>
        </div>

        <p style={{ margin: 0, fontSize: '13.5px', lineHeight: '1.5', color: 'var(--accents-5)' }}>
          Tem certeza de que deseja sair da sua conta do Synap?
        </p>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
          <button
            type="button"
            onClick={onClose}
            className="geist-button-secondary"
            style={{ height: '34px', padding: '0 14px', fontSize: '12px', borderRadius: '6px', cursor: 'pointer' }}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            style={{
              height: '34px',
              padding: '0 16px',
              fontSize: '12px',
              borderRadius: '6px',
              cursor: 'pointer',
              background: 'var(--error)',
              color: '#ffffff',
              border: 'none',
              fontWeight: 500,
            }}
          >
            Sair da Conta
          </button>
        </div>
      </div>
    </div>
  );
}
