'use client';

import React, { useState } from 'react';
import { api } from '@/lib/api';

interface DrawingEmbedModalProps {
  workspaceId?: string;
  notas: any[];
  onSelectDrawing: (drawingNota: any) => void;
  onCreateNewDrawing: (newDrawingNota: any) => void;
  onClose: () => void;
}

export default function DrawingEmbedModal({
  workspaceId,
  notas,
  onSelectDrawing,
  onCreateNewDrawing,
  onClose,
}: DrawingEmbedModalProps) {
  const [tab, setTab] = useState<'create' | 'existing'>('create');
  const [drawingTitle, setDrawingTitle] = useState('');
  const [creating, setCreating] = useState(false);

  const existingDrawings = notas.filter((n) => n.tipo === 'desenho');

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspaceId) return;

    try {
      setCreating(true);
      const title = drawingTitle.trim() || 'Desenho sem título';
      const created = await api('/notas', {
        method: 'POST',
        body: JSON.stringify({
          titulo: title,
          tipo: 'desenho',
          conteudo: JSON.stringify([]),
          workspaceId,
        }),
      });
      onCreateNewDrawing(created);
      onClose();
    } catch (err) {
      console.error('Erro ao criar desenho embutido:', err);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1001,
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
        style={{
          background: 'var(--background)',
          border: '1px solid var(--accents-2)',
          borderRadius: '10px',
          width: '100%',
          maxWidth: '480px',
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
              <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
            </svg>
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: 'var(--foreground)' }}>
              Inserir Desenho / Canvas
            </h3>
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

        {/* Tab Selector */}
        <div style={{ display: 'flex', gap: '6px', padding: '3px', background: 'var(--accents-1)', border: '1px solid var(--accents-2)', borderRadius: '6px', marginBottom: '16px' }}>
          <button
            type="button"
            onClick={() => setTab('create')}
            style={{
              flex: 1,
              height: '28px',
              fontSize: '12px',
              fontWeight: tab === 'create' ? 600 : 500,
              background: tab === 'create' ? 'var(--background)' : 'transparent',
              color: tab === 'create' ? 'var(--foreground)' : 'var(--accents-5)',
              border: tab === 'create' ? '1px solid var(--accents-2)' : 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            Novo Desenho
          </button>
          <button
            type="button"
            onClick={() => setTab('existing')}
            style={{
              flex: 1,
              height: '28px',
              fontSize: '12px',
              fontWeight: tab === 'existing' ? 600 : 500,
              background: tab === 'existing' ? 'var(--background)' : 'transparent',
              color: tab === 'existing' ? 'var(--foreground)' : 'var(--accents-5)',
              border: tab === 'existing' ? '1px solid var(--accents-2)' : 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            Desenho Existente ({existingDrawings.length})
          </button>
        </div>

        {tab === 'create' ? (
          <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 500, color: 'var(--accents-5)', display: 'block', marginBottom: '6px' }}>
                Título do Desenho
              </label>
              <input
                type="text"
                value={drawingTitle}
                onChange={(e) => setDrawingTitle(e.target.value)}
                placeholder="Ex: Diagrama de Arquitetura, Rascunho..."
                autoFocus
                style={{
                  width: '100%',
                  height: '36px',
                  padding: '0 10px',
                  background: 'var(--background)',
                  border: '1px solid var(--accents-2)',
                  borderRadius: '6px',
                  fontSize: '13px',
                  color: 'var(--foreground)',
                  outline: 'none',
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '4px' }}>
              <button
                type="button"
                onClick={onClose}
                className="geist-button-secondary"
                style={{ height: '32px', padding: '0 12px', fontSize: '12px', borderRadius: '6px', cursor: 'pointer' }}
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={creating}
                className="geist-button"
                style={{ height: '32px', padding: '0 14px', fontSize: '12px', borderRadius: '6px', cursor: 'pointer' }}
              >
                {creating ? 'Criando...' : 'Criar e Inserir'}
              </button>
            </div>
          </form>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ maxHeight: '240px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {existingDrawings.length === 0 ? (
                <div style={{ padding: '24px 0', textAlign: 'center', fontSize: '12px', color: 'var(--accents-4)' }}>
                  Nenhum desenho encontrado no workspace.
                </div>
              ) : (
                existingDrawings.map((drawing) => (
                  <div
                    key={drawing.id}
                    onClick={() => {
                      onSelectDrawing(drawing);
                      onClose();
                    }}
                    className="hover:bg-[var(--accents-2)]"
                    style={{
                      padding: '10px 12px',
                      borderRadius: '6px',
                      border: '1px solid var(--accents-2)',
                      background: 'var(--accents-1)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#38bdf8' }}>
                        <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
                      </svg>
                      <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--foreground)' }}>
                        {drawing.titulo}
                      </span>
                    </div>
                    <span style={{ fontSize: '11px', color: 'var(--accents-4)' }}>
                      Selecionar →
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
