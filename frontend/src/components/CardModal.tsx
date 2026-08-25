'use client';

import React from 'react';

export interface CardModalData {
  id: string;
  frente: string;
  verso: string;
  tipo: string;
  reps: number;
  interval: number;
  easeFactor: number;
  proximaRevisao: string;
  deck?: {
    id: string;
    nome: string;
  };
}

interface CardModalProps {
  card: CardModalData | null;
  onClose: () => void;
}

export default function CardModal({ card, onClose }: CardModalProps) {
  const [isFlipped, setIsFlipped] = React.useState(false);

  if (!card) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        background: 'rgba(0, 0, 0, 0.5)',
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
        className="mobile-bottom-sheet md:max-w-[480px] w-full"
        style={{
          background: 'var(--background)',
          border: '1px solid var(--accents-2)',
          borderRadius: '10px',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.2)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect width="18" height="18" x="3" y="3" rx="2"/>
              <path d="m9 12 2 2 4-4"/>
            </svg>
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--foreground)' }}>
              Flashcard Conectado {card.deck ? `• ${card.deck.nome}` : ''}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="geist-button-secondary"
            style={{ width: '24px', height: '24px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '4px', cursor: 'pointer' }}
          >
            ✕
          </button>
        </div>

        {/* Card interactive flip area */}
        <div
          onClick={() => setIsFlipped((prev) => !prev)}
          style={{
            minHeight: '200px',
            background: 'var(--accents-1)',
            border: '1px solid var(--accents-2)',
            borderRadius: '8px',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            cursor: 'pointer',
            textAlign: 'center',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px', color: 'var(--accents-4)' }}>
            <span>{card.tipo === 'nota' ? 'Nota' : 'Card'}</span>
            <span>{isFlipped ? 'Verso (Resposta)' : 'Frente (Pergunta)'}</span>
          </div>

          <div style={{ margin: '16px 0' }}>
            <p style={{ fontSize: '16px', fontWeight: 500, color: 'var(--foreground)', lineHeight: '1.6', margin: 0 }}>
              {card.frente}
            </p>

            {isFlipped && (
              <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--accents-2)' }}>
                <p style={{ fontSize: '14px', color: 'var(--foreground)', lineHeight: '1.6', margin: 0, whiteSpace: 'pre-wrap' }}>
                  {card.verso}
                </p>
              </div>
            )}
          </div>

          <div style={{ fontSize: '11px', color: 'var(--accents-4)' }}>
            {!isFlipped ? 'Clique para ver a resposta' : 'Clique para voltar'}
          </div>
        </div>

        {/* Card SRS Metadata Stats */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '16px', paddingTop: '12px', borderTop: '1px solid var(--accents-2)', fontSize: '11px', color: 'var(--accents-5)', fontFamily: 'var(--font-mono)' }}>
          <span>Intervalo: {card.interval}d</span>
          <span>Facilidade: {card.easeFactor}x</span>
          <span>Repetições: {card.reps}</span>
        </div>
      </div>
    </div>
  );
}
