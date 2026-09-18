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
      className="fixed inset-0 z-[2500] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 select-none animate-in fade-in duration-150 font-sansation"
      onClick={onClose}
    >
      <div
        className="bg-[#181818] border border-white/10 rounded-none shadow-2xl w-full max-w-[480px] max-h-[520px] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-white/10 flex items-center justify-between bg-[#141414]">
          <div className="flex items-center gap-2.5">
            {type === 'nota' ? (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-400">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
              </svg>
            ) : (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-400">
                <rect width="18" height="14" x="3" y="5" rx="2"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
            )}
            <h3 className="m-0 text-sm font-bold text-white leading-tight">
              {type === 'nota' ? 'Inserir Nota no Desenho' : 'Inserir Flashcard no Desenho'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-6 h-6 flex items-center justify-center rounded-none text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Fechar"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Search Bar */}
        <div className="px-4 py-3 border-b border-white/5 bg-[#141414]">
          <div className="flex items-center gap-2 px-2.5 h-8 bg-[#121212] border border-white/10 focus-within:border-white/30 rounded-none transition-colors">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-zinc-500 shrink-0">
              <circle cx="11" cy="11" r="8"/>
              <line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              type="text"
              placeholder={type === 'nota' ? 'Pesquisar notas...' : 'Pesquisar flashcards...'}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
              className="w-full bg-transparent border-none outline-none text-xs text-white placeholder-zinc-500 font-sansation"
            />
          </div>
        </div>

        {/* List of Items */}
        <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-1.5 no-scrollbar max-h-[320px]">
          {type === 'card' ? (
            loadingCards ? (
              <div className="py-8 px-4 text-center text-zinc-500 text-xs italic">
                Carregando flashcards...
              </div>
            ) : filteredCards.length === 0 ? (
              <div className="py-8 px-4 text-center text-zinc-500 text-xs italic">
                Nenhum flashcard encontrado.
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
                  className="flex flex-col items-start gap-1 p-2.5 rounded-none bg-[#121212] hover:bg-white/5 border border-white/10 cursor-pointer text-left transition-colors group"
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="text-xs font-semibold text-zinc-200 group-hover:text-white truncate">
                      {card.frente || 'Card sem pergunta'}
                    </span>
                    <span className="text-[10px] font-mono text-zinc-400 border border-white/10 px-1.5 py-0.2 bg-white/5 shrink-0 ml-2">
                      Card
                    </span>
                  </div>
                  {card.verso && (
                    <p className="m-0 text-[11px] text-zinc-500 group-hover:text-zinc-400 truncate w-full">
                      {card.verso}
                    </p>
                  )}
                </button>
              ))
            )
          ) : (
            filteredNotas.length === 0 ? (
              <div className="py-8 px-4 text-center text-zinc-500 text-xs italic">
                Nenhuma nota encontrada.
              </div>
            ) : (
              filteredNotas.map((nota) => {
                let preview = '';
                if (nota.conteudo) {
                  preview = nota.conteudo.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 95);
                }

                return (
                  <button
                    key={nota.id}
                    type="button"
                    onClick={() => {
                      onSelect(nota);
                      onClose();
                    }}
                    className="flex flex-col items-start gap-1 p-2.5 rounded-none bg-[#121212] hover:bg-white/5 border border-white/10 cursor-pointer text-left transition-colors group"
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-xs font-semibold text-zinc-200 group-hover:text-white truncate">
                        {nota.titulo || 'Sem Título'}
                      </span>
                      <span className="text-[10px] font-mono text-zinc-400 border border-white/10 px-1.5 py-0.2 bg-white/5 shrink-0 ml-2">
                        Nota
                      </span>
                    </div>
                    {preview && (
                      <p className="m-0 text-[11px] text-zinc-500 group-hover:text-zinc-400 truncate w-full">
                        {preview}
                      </p>
                    )}
                  </button>
                );
              })
            )
          )}
        </div>

        {/* Footer */}
        <div className="bg-[#121212] border-t border-white/10 px-4 py-2.5 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="h-7 px-3 text-xs font-medium rounded-none bg-transparent hover:bg-white/5 border border-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
