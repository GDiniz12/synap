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
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-100 select-none"
      onClick={onClose}
    >
      <div
        className="bg-[var(--accents-2)] border border-[var(--discord-border)] rounded-[10px] w-full max-w-[480px] p-5 sm:p-6 shadow-2xl flex flex-col text-[var(--accents-6)] transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header (Discord style) */}
        <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-[var(--discord-border)]">
          <div className="flex items-center gap-2 overflow-hidden">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[#20b8cd] shrink-0">
              <rect width="18" height="18" x="3" y="3" rx="2" />
              <path d="m9 12 2 2 4-4" />
            </svg>
            <span className="text-xs sm:text-sm font-semibold text-white truncate">
              Flashcard Conectado {card.deck ? `• ${card.deck.nome}` : ''}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-6 h-6 flex items-center justify-center rounded-[4px] text-[var(--accents-5)] hover:text-white hover:bg-[var(--accents-2)] transition-colors cursor-pointer shrink-0"
            title="Fechar"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Card interactive flip area */}
        <div
          onClick={() => setIsFlipped((prev) => !prev)}
          className="min-h-[200px] bg-[var(--accents-1)] hover:border-[var(--accents-3)] border border-[var(--discord-border)] rounded-[8px] p-5 flex flex-col justify-between cursor-pointer text-center transition-all shadow-md"
        >
          <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-wider">
            <span className="px-2 py-0.5 rounded-[4px] bg-[var(--background)] border border-[var(--discord-border)] text-[var(--accents-5)]">
              {card.tipo === 'nota' ? 'Nota' : 'Card'}
            </span>
            <span className={isFlipped ? 'text-[var(--success)] font-semibold' : 'text-[#20b8cd] font-semibold'}>
              {isFlipped ? 'Verso (Resposta)' : 'Frente (Pergunta)'}
            </span>
          </div>

          <div className="my-4">
            <p className="text-base sm:text-lg font-medium text-white leading-relaxed m-0">
              {card.frente}
            </p>

            {isFlipped && (
              <div className="mt-4 pt-4 border-t border-[var(--discord-border)] animate-in fade-in duration-150">
                <p className="text-sm text-[var(--accents-6)] leading-relaxed m-0 whitespace-pre-wrap">
                  {card.verso}
                </p>
              </div>
            )}
          </div>

          <div className="text-[11px] text-[#80848e]">
            {!isFlipped ? 'Toque para revelar a resposta' : 'Toque para virar novamente'}
          </div>
        </div>

        {/* Card SRS Metadata Stats */}
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-[var(--discord-border)] text-[11px] text-[var(--accents-5)] font-mono">
          <span>Intervalo: <strong className="text-[var(--accents-6)] font-semibold">{card.interval}d</strong></span>
          <span>Facilidade: <strong className="text-[var(--accents-6)] font-semibold">{card.easeFactor}x</strong></span>
          <span>Repetições: <strong className="text-[var(--accents-6)] font-semibold">{card.reps}</strong></span>
        </div>
      </div>
    </div>
  );
}
