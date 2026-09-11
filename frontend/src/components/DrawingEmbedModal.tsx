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
      className="fixed inset-0 z-[2000] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 select-none animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[480px] bg-[#2b2d31] border border-[#383a40] rounded-xl shadow-2xl overflow-hidden flex flex-col animate-smooth-pop"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#383a40] bg-[#1e1f22] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#20b8cd]/15 text-[#20b8cd] border border-[#20b8cd]/30 flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 19l7-7 3 3-7 7-3-3z" />
                <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white leading-tight">
                Inserir Canvas / Desenho
              </h3>
              <span className="text-xs text-[#949ba4]">
                Crie um novo desenho vetorial ou incorpore um existente
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-[4px] text-[#949ba4] hover:text-white hover:bg-[#35373c] transition-colors cursor-pointer"
            aria-label="Fechar"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Tab Selector */}
        <div className="p-5 pb-0">
          <div className="flex gap-1.5 p-1 bg-[#1e1f22] border border-[#383a40] rounded-lg">
            <button
              type="button"
              onClick={() => setTab('create')}
              className={`flex-1 h-8 text-xs font-medium rounded transition-colors cursor-pointer ${
                tab === 'create'
                  ? 'bg-[#20b8cd] text-white shadow-xs font-semibold'
                  : 'text-[#949ba4] hover:text-[#dbdee1] hover:bg-[#2b2d31]'
              }`}
            >
              Novo Desenho
            </button>
            <button
              type="button"
              onClick={() => setTab('existing')}
              className={`flex-1 h-8 text-xs font-medium rounded transition-colors cursor-pointer ${
                tab === 'existing'
                  ? 'bg-[#20b8cd] text-white shadow-xs font-semibold'
                  : 'text-[#949ba4] hover:text-[#dbdee1] hover:bg-[#2b2d31]'
              }`}
            >
              Desenho Existente ({existingDrawings.length})
            </button>
          </div>
        </div>

        {/* Body Content */}
        <div className="p-5">
          {tab === 'create' ? (
            <form onSubmit={handleCreate} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-mono font-semibold uppercase tracking-wider text-[#949ba4]">
                  Título do Desenho
                </label>
                <input
                  type="text"
                  value={drawingTitle}
                  onChange={(e) => setDrawingTitle(e.target.value)}
                  placeholder="Ex: Diagrama Conceitual, Rascunho de Ideias..."
                  autoFocus
                  className="w-full h-9 px-3 text-xs bg-[#1e1f22] border border-[#383a40] focus:border-[#20b8cd] rounded-[4px] outline-none text-[#dbdee1] placeholder-[#949ba4] transition-colors"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#383a40]">
                <button
                  type="button"
                  onClick={onClose}
                  className="h-8 px-4 text-xs font-medium rounded-[4px] bg-[#313338] hover:bg-[#383a40] border border-[#383a40] text-[#dbdee1] hover:text-white transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="h-8 px-4 text-xs font-semibold rounded-[4px] bg-[#20b8cd] hover:bg-[#1ba2b4] text-white shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  {creating ? 'Criando...' : 'Criar e Inserir'}
                </button>
              </div>
            </form>
          ) : (
            <div className="flex flex-col gap-2">
              <div className="max-h-[260px] overflow-y-auto flex flex-col gap-1.5 no-scrollbar pr-1">
                {existingDrawings.length === 0 ? (
                  <div className="py-8 text-center text-xs text-[#949ba4]">
                    Nenhum desenho encontrado neste workspace.
                  </div>
                ) : (
                  existingDrawings.map((drawing) => (
                    <div
                      key={drawing.id}
                      onClick={() => {
                        onSelectDrawing(drawing);
                        onClose();
                      }}
                      className="p-3 rounded-lg border border-[#383a40] bg-[#1e1f22] hover:bg-[#35373c] hover:border-[#20b8cd]/50 cursor-pointer flex items-center justify-between transition-all group"
                    >
                      <div className="flex items-center gap-2.5 overflow-hidden">
                        <div className="w-6 h-6 rounded bg-[#2b2d31] border border-[#383a40] flex items-center justify-center text-[#949ba4] group-hover:text-[#20b8cd] shrink-0 transition-colors">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 19l7-7 3 3-7 7-3-3z" />
                            <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
                          </svg>
                        </div>
                        <span className="text-xs font-medium text-white truncate">
                          {drawing.titulo || 'Desenho sem título'}
                        </span>
                      </div>
                      <span className="text-[11px] font-medium text-[#20b8cd] shrink-0 flex items-center gap-1 opacity-80 group-hover:opacity-100">
                        Selecionar →
                      </span>
                    </div>
                  ))
                )}
              </div>
              <div className="flex justify-end pt-3 border-t border-[#383a40]">
                <button
                  type="button"
                  onClick={onClose}
                  className="h-8 px-4 text-xs font-medium rounded-[4px] bg-[#313338] hover:bg-[#383a40] border border-[#383a40] text-[#dbdee1] hover:text-white transition-colors cursor-pointer"
                >
                  Fechar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
