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
      className="fixed inset-0 z-[2000] bg-black/75 backdrop-blur-sm flex flex-col items-center justify-center p-0 md:p-6 select-none animate-in fade-in duration-150 font-sansation"
      onClick={handleSaveAndClose}
    >
      <div
        className="mobile-fullscreen-dialog md:w-[94vw] md:max-w-[1300px] md:h-[88vh] md:max-h-[920px] md:rounded-none h-full w-full bg-[#141414] border border-white/10 shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="h-12 border-b border-white/10 px-4 flex items-center justify-between bg-[#181818]">
          <div className="flex items-center gap-2.5 flex-1">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-400">
              <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
            </svg>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Nome do desenho..."
              className="text-sm font-semibold text-white placeholder-zinc-500 bg-transparent border-none outline-none w-80 font-sansation"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSaveAndClose}
              disabled={saving}
              className="h-8 px-4 text-xs font-bold rounded-none bg-white text-black hover:bg-zinc-200 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              {saving ? 'Salvando...' : 'Salvar e Concluir'}
            </button>
            <button
              type="button"
              onClick={handleSaveAndClose}
              className="w-7 h-7 flex items-center justify-center rounded-none text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              title="Fechar"
              aria-label="Fechar"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
