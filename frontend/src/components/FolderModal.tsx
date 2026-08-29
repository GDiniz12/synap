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
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 2000,
        background: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
      onClick={onClose}
      onKeyDown={handleKeyDown}
    >
      <div
        className="mobile-bottom-sheet md:max-w-[420px] w-full"
        style={{
          background: 'var(--background)',
          border: '1px solid var(--accents-2)',
          borderRadius: '12px',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              background: 'var(--accents-1)',
              border: '1px solid var(--accents-2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--foreground)',
              flexShrink: 0,
            }}
          >
            <svg
              width="18"
              height="18"
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
            <h3
              style={{
                margin: 0,
                fontSize: '16px',
                fontWeight: 600,
                color: 'var(--foreground)',
                lineHeight: 1.2,
              }}
            >
              {title}
            </h3>
            {data.parentFolderName && !isRename && (
              <span
                style={{
                  fontSize: '12px',
                  color: 'var(--accents-5)',
                  display: 'block',
                  marginTop: '2px',
                }}
              >
                Dentro de: <strong style={{ color: 'var(--foreground)' }}>{data.parentFolderName}</strong>
              </span>
            )}
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label
              htmlFor="folder-name-input"
              style={{
                display: 'block',
                fontSize: '12px',
                fontWeight: 500,
                color: 'var(--accents-6)',
                marginBottom: '6px',
              }}
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
              className="geist-input"
              style={{
                width: '100%',
                height: '38px',
                padding: '0 12px',
                fontSize: '13px',
                borderRadius: '6px',
                outline: 'none',
              }}
            />
            {error && (
              <span
                style={{
                  display: 'block',
                  color: 'var(--error)',
                  fontSize: '12px',
                  marginTop: '6px',
                }}
              >
                {error}
              </span>
            )}
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '4px' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="geist-button-secondary"
              style={{
                height: '34px',
                padding: '0 14px',
                fontSize: '13px',
                borderRadius: '6px',
                cursor: 'pointer',
              }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="geist-button"
              style={{
                height: '34px',
                padding: '0 16px',
                fontSize: '13px',
                borderRadius: '6px',
                cursor: loading || !name.trim() ? 'not-allowed' : 'pointer',
                opacity: loading || !name.trim() ? 0.6 : 1,
              }}
            >
              {loading ? (isRename ? 'Salvando...' : 'Criando...') : isRename ? 'Salvar' : 'Criar Pasta'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
