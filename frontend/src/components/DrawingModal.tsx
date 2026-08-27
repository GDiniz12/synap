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
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 2000,
        background: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0',
        userSelect: 'none',
      }}
      onClick={handleSaveAndClose}
    >
      <div
        className="mobile-fullscreen-dialog md:w-[92vw] md:max-w-[1200px] md:h-[85vh] md:max-h-[900px] md:rounded-xl h-full w-full animate-smooth-pop"
        style={{
          background: '#0a0a0a',
          border: '1px solid var(--accents-2)',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.4)',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div
          style={{
            height: '48px',
            borderBottom: '1px solid #242424',
            padding: '0 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#141414',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--accents-5)' }}>
              <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
            </svg>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Nome do desenho..."
              style={{
                fontSize: '14px',
                fontWeight: 600,
                color: 'var(--foreground)',
                background: 'transparent',
                border: 'none',
                outline: 'none',
                width: '320px',
              }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={handleSaveAndClose}
              className="geist-button"
              style={{ height: '28px', padding: '0 12px', fontSize: '12px', borderRadius: '4px', cursor: 'pointer' }}
            >
              {saving ? 'Salvando...' : 'Salvar e Concluir'}
            </button>
            <button
              type="button"
              onClick={handleSaveAndClose}
              className="geist-button-secondary"
              style={{ width: '28px', height: '28px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '4px', cursor: 'pointer' }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Full Drawing Canvas Surface */}
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
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
