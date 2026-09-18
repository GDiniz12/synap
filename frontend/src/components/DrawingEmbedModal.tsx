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
      className="fixed inset-0 z-[2000] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 select-none animate-in fade-in duration-150 font-sansation"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[480px] bg-[#181818] border border-white/10 rounded-none shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10 bg-[#141414] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-none bg-white/5 text-white border border-white/10 flex items-center justify-center">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 19l7-7 3 3-7 7-3-3z" />
                <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-bold text-white leading-tight">
                Inserir Canvas / Desenho
              </h3>
              <span className="text-xs text-zinc-400 block mt-0.5">
                Crie um novo desenho vetorial ou incorpore um existente
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-none text-zinc-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
            aria-label="Fechar"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Tab Selector */}
        <div className="p-6 pb-0">
          <div className="flex gap-1 p-1 bg-[#141414] border border-white/10 rounded-none">
            <button
              type="button"
              onClick={() => setTab('create')}
              className={`flex-1 h-8 text-xs font-semibold rounded-none transition-colors cursor-pointer ${
                tab === 'create'
                  ? 'bg-white/10 text-white'
                  : 'text-zinc-400 hover:text-white hover:bg-white/5'
              }`}
            >
              Novo Desenho
            </button>
            <button
              type="button"
              onClick={() => setTab('existing')}
              className={`flex-1 h-8 text-xs font-semibold rounded-none transition-colors cursor-pointer ${
                tab === 'existing'
                  ? 'bg-white/10 text-white'
                  : 'text-zinc-400 hover:text-white hover:bg-white/5'
              }`}
            >
              Desenho Existente ({existingDrawings.length})
            </button>
          </div>
        </div>

        {/* Body Content */}
        <div className="p-6">
          {tab === 'create' ? (
            <form onSubmit={handleCreate} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-mono font-semibold uppercase tracking-wider text-zinc-400">
                  Título do Desenho
                </label>
                <input
                  type="text"
                  value={drawingTitle}
                  onChange={(e) => setDrawingTitle(e.target.value)}
                  placeholder="Ex: Diagrama Conceitual, Rascunho de Ideias..."
                  autoFocus
                  className="w-full h-8 px-3 text-xs bg-white/5 border border-white/10 focus:border-white/30 rounded-none outline-none text-white placeholder-zinc-500 transition-colors"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={onClose}
                  className="h-8 px-4 text-xs font-semibold rounded-none bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 hover:text-white transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="h-8 px-4 text-xs font-bold rounded-none bg-white text-black hover:bg-zinc-200 transition-colors cursor-pointer disabled:opacity-50"
                >
                  {creating ? 'Criando...' : 'Criar e Inserir'}
                </button>
              </div>
            </form>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="max-h-[260px] overflow-y-auto flex flex-col gap-1.5 no-scrollbar pr-1">
                {existingDrawings.length === 0 ? (
                  <div className="py-8 text-center text-xs text-zinc-500">
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
                      className="p-2.5 rounded-none border border-white/10 bg-white/[0.02] hover:bg-white/5 hover:border-white/30 cursor-pointer flex items-center justify-between transition-all group"
                    >
                      <div className="flex items-center gap-2.5 overflow-hidden">
                        <div className="w-6 h-6 rounded-none bg-white/5 border border-white/10 flex items-center justify-center text-zinc-400 group-hover:text-white shrink-0 transition-colors">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 19l7-7 3 3-7 7-3-3z" />
                            <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
                          </svg>
                        </div>
                        <span className="text-xs font-medium text-white truncate">
                          {drawing.titulo || 'Desenho sem título'}
                        </span>
                      </div>
                      <span className="text-[11px] font-mono text-zinc-400 group-hover:text-white shrink-0 flex items-center gap-1 transition-colors">
                        Selecionar →
                      </span>
                    </div>
                  ))
                )}
              </div>
              <div className="flex justify-end pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={onClose}
                  className="h-8 px-4 text-xs font-semibold rounded-none bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 hover:text-white transition-colors cursor-pointer"
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
