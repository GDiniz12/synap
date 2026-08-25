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
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 2500,
        background: 'rgba(0, 0, 0, 0.7)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        userSelect: 'none',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'var(--background)',
          border: '1px solid var(--accents-2)',
          borderRadius: '12px',
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.4)',
          width: '100%',
          maxWidth: '480px',
          maxHeight: '520px',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--accents-2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--accents-1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {type === 'nota' ? (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--foreground)' }}>
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
              </svg>
            ) : (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--foreground)' }}>
                <rect width="18" height="14" x="3" y="5" rx="2"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
            )}
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: 'var(--foreground)', letterSpacing: '-0.02em' }}>
              {type === 'nota' ? 'Inserir Nota no Desenho' : 'Inserir Flashcard no Desenho'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="geist-button-secondary"
            style={{ width: '26px', height: '26px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '4px', cursor: 'pointer' }}
          >
            ✕
          </button>
        </div>

        {/* Search Bar */}
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--accents-2)', background: 'var(--background)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0 10px', height: '36px', background: 'var(--accents-1)', border: '1px solid var(--accents-2)', borderRadius: '6px' }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[var(--accents-4)]">
              <circle cx="11" cy="11" r="8"/>
              <line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              type="text"
              placeholder={type === 'nota' ? 'Pesquisar por título ou conteúdo...' : 'Pesquisar por pergunta ou resposta...'}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
              style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', fontSize: '13px', color: 'var(--foreground)' }}
            />
          </div>
        </div>

        {/* List of Items */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: '6px' }} className="no-scrollbar">
          {type === 'card' ? (
            loadingCards ? (
              <div style={{ padding: '36px 16px', textAlign: 'center', color: 'var(--accents-4)', fontSize: '13px' }}>
                Carregando flashcards...
              </div>
            ) : filteredCards.length === 0 ? (
              <div style={{ padding: '36px 16px', textAlign: 'center', color: 'var(--accents-4)', fontSize: '13px' }}>
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
                  className="hover:bg-[var(--accents-2)]"
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    gap: '4px',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    background: 'var(--accents-1)',
                    border: '1px solid var(--accents-2)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--foreground)' }}>
                      {card.frente || 'Card sem pergunta'}
                    </span>
                    <span style={{ fontSize: '10px', color: 'var(--accents-5)', border: '1px solid var(--accents-2)', padding: '1px 6px', borderRadius: '4px', background: 'var(--background)' }}>
                      Card
                    </span>
                  </div>
                  {card.verso && (
                    <p style={{ margin: 0, fontSize: '11.5px', color: 'var(--accents-4)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%' }}>
                      {card.verso}
                    </p>
                  )}
                </button>
              ))
            )
          ) : (
            filteredNotas.length === 0 ? (
              <div style={{ padding: '36px 16px', textAlign: 'center', color: 'var(--accents-4)', fontSize: '13px' }}>
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
                    className="hover:bg-[var(--accents-2)]"
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'flex-start',
                      gap: '4px',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      background: 'var(--accents-1)',
                      border: '1px solid var(--accents-2)',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--foreground)' }}>
                        {nota.titulo || 'Sem Título'}
                      </span>
                      <span style={{ fontSize: '10px', color: 'var(--accents-5)', border: '1px solid var(--accents-2)', padding: '1px 6px', borderRadius: '4px', background: 'var(--background)' }}>
                        Nota
                      </span>
                    </div>
                    {preview && (
                      <p style={{ margin: 0, fontSize: '11.5px', color: 'var(--accents-4)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%' }}>
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
