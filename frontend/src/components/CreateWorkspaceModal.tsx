'use client';

import React, { useState, useRef } from 'react';
import { api } from '@/lib/api';
import ImageCropperModal from './ImageCropperModal';
import WorkspaceIcon from './WorkspaceIcon';
import WorkspaceIconPickerPopover from './WorkspaceIconPickerPopover';

interface CreateWorkspaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onWorkspaceCreated: (newWorkspace: any) => void;
  showToast?: (message: string, type?: 'error' | 'success' | 'info') => void;
}

export default function CreateWorkspaceModal({
  isOpen,
  onClose,
  onWorkspaceCreated,
  showToast,
}: CreateWorkspaceModalProps) {
  const [name, setName] = useState('');
  const [iconUrl, setIconUrl] = useState('');
  const [iconPreview, setIconPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [cropperImage, setCropperImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      if (showToast) showToast('Por favor, selecione um arquivo de imagem válido.', 'error');
      return;
    }

    const localUrl = URL.createObjectURL(file);
    setCropperImage(localUrl);
    setIsPickerOpen(false);
    e.target.value = '';
  };

  const handleCroppedIconConfirm = async (croppedBlob: Blob, previewUrl: string) => {
    setIconPreview(previewUrl);
    setIsUploading(true);

    try {
      const croppedFile = new File([croppedBlob], 'workspace-icon.webp', { type: 'image/webp' });
      const formData = new FormData();
      formData.append('file', croppedFile);

      const res = await api('/upload', {
        method: 'POST',
        body: formData,
      });

      if (res?.url) {
        setIconUrl(res.url);
      }
    } catch (err: any) {
      console.error('Falha ao enviar imagem do workspace:', err);
      if (showToast) showToast('Não foi possível enviar a imagem. Tente novamente.', 'error');
    } finally {
      setIsUploading(false);
      setCropperImage(null);
    }
  };

  const handleSelectEmoji = (emoji: string) => {
    setIconUrl(emoji);
    setIconPreview(emoji);
    setIsPickerOpen(false);
  };

  const handleSelectImageUrl = (url: string) => {
    setIconUrl(url);
    setIconPreview(url.trim() ? url.trim() : null);
    setIsPickerOpen(false);
  };

  const handleRemoveIcon = () => {
    setIconUrl('');
    setIconPreview(null);
    setIsPickerOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const created = await api('/workspaces', {
        method: 'POST',
        body: JSON.stringify({
          nome: name.trim(),
          icone: iconUrl.trim() || null,
        }),
      });

      if (showToast) showToast('Workspace criado com sucesso!', 'success');
      onWorkspaceCreated(created);
      handleClose();
    } catch (err: any) {
      console.error('Erro ao criar workspace:', err);
      if (showToast) showToast(err.message || 'Erro ao criar workspace', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setName('');
    setIconUrl('');
    setIconPreview(null);
    setIsPickerOpen(false);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150 font-sansation select-none"
      onClick={handleClose}
      onKeyDown={(e) => {
        if (e.key === 'Escape') handleClose();
      }}
    >
      <div
        className="w-full max-w-[440px] bg-[#181818] border border-white/10 rounded-none shadow-2xl overflow-visible flex flex-col animate-in zoom-in-95 duration-150 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 flex flex-col gap-5">
          {/* Header */}
          <div className="text-left flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-white tracking-tight">
                Novo Workspace
              </h2>
              <button
                type="button"
                onClick={handleClose}
                className="text-zinc-500 hover:text-white transition-colors cursor-pointer p-1"
                aria-label="Fechar"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Crie um novo espaço de trabalho para organizar notas, grafos e flashcards.
            </p>
          </div>

          {/* Icon Selector */}
          <div className="flex flex-col items-center gap-2 relative">
            <div
              onClick={() => setIsPickerOpen(!isPickerOpen)}
              className="w-16 h-16 rounded-none border border-dashed border-white/20 hover:border-white/50 transition-all duration-150 flex flex-col items-center justify-center cursor-pointer bg-white/5 relative overflow-hidden group"
              title="Clique para escolher um ícone ou foto"
            >
              {iconPreview ? (
                <WorkspaceIcon
                  icone={iconPreview}
                  nome={name || 'Novo Workspace'}
                  size={32}
                  className="w-full h-full"
                  emojiClassName="text-2xl"
                />
              ) : (
                <div className="flex flex-col items-center text-zinc-400 group-hover:text-white transition-colors">
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="3" y="3" width="18" height="18" rx="0" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <polyline points="21 15 16 10 5 21" />
                  </svg>
                  <span className="text-[9px] font-mono mt-1 text-zinc-500">ÍCONE</span>
                </div>
              )}

              {/* Hover overlay */}
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white transition-opacity">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                </svg>
                <span className="text-[8px] font-mono mt-0.5">ALTERAR</span>
              </div>

              {isUploading && (
                <div className="absolute inset-0 bg-black/80 flex items-center justify-center">
                  <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-none animate-spin" />
                </div>
              )}
            </div>

            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />

            <button
              type="button"
              onClick={() => setIsPickerOpen(!isPickerOpen)}
              className="text-[11px] text-zinc-400 hover:text-white transition-colors cursor-pointer border-none bg-transparent flex items-center gap-1 font-sansation"
            >
              <span>{iconPreview ? 'Trocar ícone' : 'Escolher ícone'}</span>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>

            {/* Icon picker popover */}
            {isPickerOpen && (
              <WorkspaceIconPickerPopover
                currentIcon={iconPreview}
                onSelectEmoji={handleSelectEmoji}
                onSelectImageUrl={handleSelectImageUrl}
                onTriggerFileUpload={() => fileInputRef.current?.click()}
                onRemoveIcon={handleRemoveIcon}
                onClose={() => setIsPickerOpen(false)}
                anchorPosition="bottom"
              />
            )}
          </div>

          {/* Form */}
          <form id="create-workspace-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 font-mono">
                NOME DO WORKSPACE
              </label>
              <input
                type="text"
                required
                placeholder="Ex: Ciência da Computação, Engenharia, Projeto..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full h-9 px-3 text-xs bg-white/5 border border-white/10 focus:border-white/30 text-white rounded-none outline-none transition-colors font-sansation placeholder-zinc-600"
                autoFocus
              />
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="bg-[#141414] border-t border-white/10 px-6 py-3.5 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={handleClose}
            className="h-8 px-4 text-xs font-semibold rounded-none bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 hover:text-white transition-colors cursor-pointer"
            disabled={isSubmitting}
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="create-workspace-form"
            className="h-8 px-5 text-xs font-bold rounded-none bg-white text-black hover:bg-zinc-200 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            disabled={!name.trim() || isSubmitting}
          >
            {isSubmitting ? 'Criando...' : 'Criar Workspace'}
          </button>
        </div>
      </div>

      {cropperImage && (
        <ImageCropperModal
          isOpen={!!cropperImage}
          imageSrc={cropperImage}
          cropShape="square"
          title="Recortar Ícone do Workspace"
          onConfirm={handleCroppedIconConfirm}
          onClose={() => setCropperImage(null)}
        />
      )}
    </div>
  );
}
