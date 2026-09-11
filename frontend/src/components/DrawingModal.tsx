'use client';

import React, { useState } from 'react';
import DrawingCanvas from './DrawingCanvas';
import { api } from '@/lib/api';

interface DrawingModalProps {
  drawingNota: any;
  notas?: any[];
  workspaceId?: string;
  onOpenNota?: (nota: any) => void;
  onOpenCard?: (card: any) => void;
  onSave?: (updatedNota: any) => void;
  onClose: () => void;
}

export default function DrawingModal({
  drawingNota,
  notas = [],
  workspaceId,
  onOpenNota,
  onOpenCard,
  onSave,
  onClose,
}: DrawingModalProps) {
  const [title, setTitle] = useState(drawingNota.titulo || 'Desenho');
  const [content, setContent] = useState(drawingNota.conteudo || '[]');
  const [saving, setSaving] = useState(false);

  const handleSaveAndClose = async () => {
    try {
      setSaving(true);
      const updated = await api(`/notas/${drawingNota.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          titulo: title,
          conteudo: content,
        }),
      });
      if (onSave) {
        onSave(updated);
      }
      onClose();
    } catch (err) {
      console.error('Erro ao salvar desenho:', err);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[2000] bg-black/75 backdrop-blur-xs flex flex-col items-center justify-center p-0 md:p-6 select-none animate-in fade-in duration-150"
      onClick={handleSaveAndClose}
    >
      <div
        className="mobile-fullscreen-dialog md:w-[94vw] md:max-w-[1300px] md:h-[88vh] md:max-h-[920px] md:rounded-[8px] h-full w-full bg-[var(--discord-canvas)] border border-[var(--discord-border)] shadow-2xl flex flex-col overflow-hidden animate-smooth-pop"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="h-12 border-b border-[var(--discord-border)] px-4 flex items-center justify-between bg-[var(--discord-sidebar)]">
          <div className="flex items-center gap-2.5 flex-1">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--discord-text-channel)]">
              <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
            </svg>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Nome do desenho..."
              className="text-sm font-semibold text-[var(--discord-text-primary)] placeholder-[var(--discord-text-muted)] bg-transparent border-none outline-none w-80"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSaveAndClose}
              disabled={saving}
              className="h-7 px-3 text-xs font-semibold rounded-[4px] bg-[var(--brand)] hover:bg-[var(--brand-hover)] text-white shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              {saving ? 'Salvando...' : 'Salvar e Concluir'}
            </button>
            <button
              type="button"
              onClick={handleSaveAndClose}
              className="w-7 h-7 flex items-center justify-center rounded-[4px] text-[var(--discord-text-muted)] hover:text-white hover:bg-[var(--discord-hover)] transition-colors cursor-pointer"
              title="Fechar"
              aria-label="Fechar"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        {/* Full Drawing Canvas Surface */}
        <div className="flex-1 relative overflow-hidden">
          <DrawingCanvas
            initialData={content}
            onChange={(newContentJson) => setContent(newContentJson)}
            title={title}
            notas={notas}
            workspaceId={workspaceId}
            onOpenNota={onOpenNota}
            onOpenCard={onOpenCard}
          />
        </div>
      </div>
    </div>
  );
}
