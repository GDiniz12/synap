'use client';

import React, { useState, useEffect, useRef } from 'react';

export interface FolderModalData {
  mode: 'create' | 'rename';
  folderId?: string | null;
  parentId?: string | null;
  initialName?: string;
  parentFolderName?: string | null;
}

interface FolderModalProps {
  isOpen: boolean;
  data: FolderModalData | null;
  onClose: () => void;
  onConfirm: (name: string, data: FolderModalData) => Promise<void>;
}

export default function FolderModal({ isOpen, data, onClose, onConfirm }: FolderModalProps) {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && data) {
      const initial = data.initialName || '';
      setName(initial);
      setError('');
      setLoading(false);

      // Focus and select text after render
      const timer = setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          if (data.mode === 'rename') {
            inputRef.current.select();
          }
        }
      }, 50);

      return () => clearTimeout(timer);
    } else {
      setName('');
      setError('');
      setLoading(false);
    }
  }, [isOpen, data]);

  if (!isOpen || !data) return null;

  const isRename = data.mode === 'rename';
  const title = isRename
    ? 'Renomear Pasta'
    : data.parentFolderName
    ? 'Nova Subpasta'
    : 'Nova Pasta';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError('O nome da pasta não pode ficar vazio.');
      if (inputRef.current) inputRef.current.focus();
      return;
    }

    if (isRename && trimmed === data.initialName?.trim()) {
      onClose();
      return;
    }

    try {
      setLoading(true);
      setError('');
      await onConfirm(trimmed, data);
      onClose();
    } catch (err: any) {
      console.error('Erro ao processar pasta:', err);
      setError(err.message || 'Ocorreu um erro. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-[2000] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 select-none animate-in fade-in duration-150"
      onClick={onClose}
      onKeyDown={handleKeyDown}
    >
      <div
        className="w-full max-w-[420px] bg-[var(--accents-1)] border border-[var(--discord-border)] rounded-xl shadow-2xl overflow-hidden flex flex-col animate-smooth-pop"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 flex flex-col gap-4">
          {/* Header */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#20b8cd]/15 text-[#20b8cd] border border-[#20b8cd]/30 flex items-center justify-center shrink-0">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-1.22-1.8A2 2 0 0 0 8.53 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" />
              </svg>
            </div>
            <div>
              <h3 className="text-base font-semibold text-white leading-tight">
                {title}
              </h3>
              {data.parentFolderName && !isRename && (
                <span className="text-xs text-[var(--accents-5)] block mt-0.5">
                  Dentro de: <strong className="text-white">{data.parentFolderName}</strong>
                </span>
              )}
            </div>
          </div>

          {/* Form */}
          <form id="folder-modal-form" onSubmit={handleSubmit} className="flex flex-col gap-3">
            <div>
              <label
                htmlFor="folder-name-input"
                className="block text-[11px] font-mono font-semibold uppercase tracking-wider text-[var(--accents-5)] mb-1.5"
              >
                Nome da Pasta
              </label>
              <input
                id="folder-name-input"
                ref={inputRef}
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (error) setError('');
                }}
                placeholder="Ex: Projetos, Estudos, Ideias..."
                disabled={loading}
                className="w-full h-9 px-3 text-xs bg-[var(--background)] border border-[var(--discord-border)] focus:border-[#20b8cd] rounded-[4px] outline-none text-[var(--accents-6)] placeholder-[var(--accents-5)] transition-colors"
              />
              {error && (
                <span className="block text-[var(--error)] text-xs mt-1.5 font-medium">
                  {error}
                </span>
              )}
            </div>
          </form>
        </div>

        {/* Discord Action Footer */}
        <div className="bg-[var(--background)] border-t border-[var(--discord-border)] px-6 py-3.5 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="h-9 px-4 text-xs font-medium rounded-[4px] bg-[var(--accents-2)] hover:bg-[var(--discord-border)] border border-[var(--discord-border)] text-[var(--accents-6)] hover:text-white transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="folder-modal-form"
            disabled={loading || !name.trim()}
            className="h-9 px-5 text-xs font-semibold rounded-[4px] bg-[#20b8cd] hover:bg-[#1ba2b4] text-white shadow-sm transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (isRename ? 'Salvando...' : 'Criando...') : isRename ? 'Salvar' : 'Criar Pasta'}
          </button>
        </div>
      </div>
    </div>
  );
}
