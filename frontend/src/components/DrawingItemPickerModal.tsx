'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';

interface DrawingItemPickerModalProps {
  type: 'nota' | 'card';
  notas: any[];
  workspaceId?: string;
  onSelect: (item: any) => void;
  onClose: () => void;
}

export default function DrawingItemPickerModal({
  type,
  notas,
  workspaceId,
  onSelect,
  onClose,
}: DrawingItemPickerModalProps) {
  const [search, setSearch] = useState('');
  const [cards, setCards] = useState<any[]>([]);
  const [loadingCards, setLoadingCards] = useState(false);

  // Fetch flashcards from workspace if type === 'card'
  useEffect(() => {
    if (type === 'card' && workspaceId) {
      setLoadingCards(true);
      api(`/flashcards/cards/workspace?workspaceId=${workspaceId}`)
        .then((data) => {
          if (Array.isArray(data)) setCards(data);
        })
        .catch((err) => console.error('Erro ao carregar flashcards', err))
        .finally(() => setLoadingCards(false));
    }
  }, [type, workspaceId]);

  // Filter text notes or flashcards
  const textNotas = notas.filter((n) => n.tipo !== 'desenho');

  const filteredNotas = textNotas.filter((n) =>
    (n.titulo || '').toLowerCase().includes(search.toLowerCase()) ||
    (n.conteudo || '').toLowerCase().includes(search.toLowerCase())
  );

  const filteredCards = cards.filter((c) =>
    (c.frente || '').toLowerCase().includes(search.toLowerCase()) ||
    (c.verso || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div
      className="fixed inset-0 z-[2500] bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 select-none animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-[var(--discord-canvas)] border border-[var(--discord-border)] rounded-[8px] shadow-2xl w-full max-w-[480px] max-h-[520px] flex flex-col overflow-hidden animate-smooth-pop"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-[var(--discord-border)] flex items-center justify-between bg-[var(--discord-sidebar)]">
          <div className="flex items-center gap-2.5">
            {type === 'nota' ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--discord-text-channel)]">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--discord-text-channel)]">
                <rect width="18" height="14" x="3" y="5" rx="2"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
            )}
            <h3 className="m-0 text-sm font-semibold text-[var(--discord-text-primary)]">
              {type === 'nota' ? 'Inserir Nota no Desenho' : 'Inserir Flashcard no Desenho'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-[4px] text-[var(--discord-text-muted)] hover:text-white hover:bg-[var(--discord-hover)] transition-colors cursor-pointer"
            aria-label="Fechar"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Search Bar */}
        <div className="px-4 py-3 border-b border-[var(--discord-border)] bg-[var(--discord-sidebar)]">
          <div className="flex items-center gap-2 px-2.5 h-9 bg-[var(--discord-input)] border border-[var(--discord-border)] focus-within:border-[var(--brand)] rounded-[4px] transition-colors">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[var(--discord-text-muted)]">
              <circle cx="11" cy="11" r="8"/>
              <line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              type="text"
              placeholder={type === 'nota' ? 'Pesquisar por título ou conteúdo...' : 'Pesquisar por pergunta ou resposta...'}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
              className="w-full bg-transparent border-none outline-none text-xs text-[var(--discord-text-primary)] placeholder-[var(--discord-text-muted)]"
            />
          </div>
        </div>

        {/* List of Items */}
        <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-1.5 no-scrollbar">
          {type === 'card' ? (
            loadingCards ? (
              <div className="py-9 px-4 text-center text-[var(--discord-text-muted)] text-xs">
                Carregando flashcards...
              </div>
            ) : filteredCards.length === 0 ? (
              <div className="py-9 px-4 text-center text-[var(--discord-text-muted)] text-xs">
                Nenhum flashcard encontrado. Crie cards na aba Flashcards primeiro.
              </div>
            ) : (
              filteredCards.map((card) => (
                <button
                  key={card.id}
                  type="button"
                  onClick={() => {
                    onSelect(card);
                    onClose();
                  }}
                  className="flex flex-col items-start gap-1 p-2.5 rounded-[6px] bg-[var(--discord-sidebar)] hover:bg-[var(--discord-hover)] border border-[var(--discord-border)] cursor-pointer text-left transition-colors"
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="text-xs font-semibold text-[var(--discord-text-primary)]">
                      {card.frente || 'Card sem pergunta'}
                    </span>
                    <span className="text-[10px] font-mono text-[var(--discord-text-muted)] border border-[var(--discord-border)] px-1.5 py-0.5 rounded-[3px] bg-[var(--discord-input)]">
                      Card
                    </span>
                  </div>
                  {card.verso && (
                    <p className="m-0 text-[11px] text-[var(--discord-text-muted)] overflow-hidden text-ellipsis whitespace-nowrap w-full">
                      {card.verso}
                    </p>
                  )}
                </button>
              ))
            )
          ) : (
            filteredNotas.length === 0 ? (
              <div className="py-9 px-4 text-center text-[var(--discord-text-muted)] text-xs">
                Nenhuma nota encontrada.
              </div>
            ) : (
              filteredNotas.map((nota) => {
                let preview = '';
                if (nota.conteudo) {
                  const div = document.createElement('div');
                  div.innerHTML = nota.conteudo;
                  preview = (div.innerText || div.textContent || '').slice(0, 95);
                }

                return (
                  <button
                    key={nota.id}
                    type="button"
                    onClick={() => {
                      onSelect(nota);
                      onClose();
                    }}
                    className="flex flex-col items-start gap-1 p-2.5 rounded-[6px] bg-[var(--discord-sidebar)] hover:bg-[var(--discord-hover)] border border-[var(--discord-border)] cursor-pointer text-left transition-colors"
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-xs font-semibold text-[var(--discord-text-primary)]">
                        {nota.titulo || 'Sem Título'}
                      </span>
                      <span className="text-[10px] font-mono text-[var(--discord-text-muted)] border border-[var(--discord-border)] px-1.5 py-0.5 rounded-[3px] bg-[var(--discord-input)]">
                        Nota
                      </span>
                    </div>
                    {preview && (
                      <p className="m-0 text-[11px] text-[var(--discord-text-muted)] overflow-hidden text-ellipsis whitespace-nowrap w-full">
                        {preview}
                      </p>
                    )}
                  </button>
                );
              })
            )
          )}
        </div>
      </div>
    </div>
  );
}
