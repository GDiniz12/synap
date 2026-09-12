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
  const [isCollaborative, setIsCollaborative] = useState(false);
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
      if (showToast) showToast('Não foi possível enviar a imagem. Tente uma URL ou emoji.', 'error');
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
          isCollaborative,
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
    setIsCollaborative(false);
    setIsPickerOpen(false);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-smooth-fade"
      onClick={handleClose}
    >
      <div
        className="w-full max-w-[440px] bg-[var(--discord-canvas)] border border-[var(--discord-border)] rounded-lg shadow-2xl overflow-visible flex flex-col animate-smooth-pop relative select-none"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 flex flex-col gap-5">
          {/* Header */}
          <div className="text-center flex flex-col gap-1.5">
            <h2 className="text-xl font-bold text-[var(--foreground)] tracking-tight">
              Personalize seu Workspace
            </h2>
            <p className="text-xs text-[var(--discord-text-muted)] leading-relaxed">
              Dê personalidade ao seu novo espaço com um nome e um emoji ou foto de identificação.
            </p>
          </div>

          {/* Icon Selector / Notion Popover Area */}
          <div className="flex flex-col items-center gap-2 relative">
            <div
              onClick={() => setIsPickerOpen(!isPickerOpen)}
              className="w-20 h-20 rounded-full border-2 border-dashed border-[var(--discord-border)] hover:border-[var(--brand)] hover:scale-105 transition-all duration-200 flex flex-col items-center justify-center cursor-pointer bg-[var(--discord-input)] relative overflow-hidden group shadow-inner"
              title="Clique para escolher um emoji ou foto"
            >
              {iconPreview ? (
                <WorkspaceIcon
                  icone={iconPreview}
                  nome={name || 'Novo Workspace'}
                  size={42}
                  className="w-full h-full"
                  emojiClassName="text-3xl"
                />
              ) : (
                <div className="flex flex-col items-center text-[var(--discord-text-muted)] group-hover:text-[var(--foreground)] transition-colors">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M8 14s1.5 2 4 2 4-2 4-2" />
                    <line x1="9" y1="9" x2="9.01" y2="9" />
                    <line x1="15" y1="9" x2="15.01" y2="9" />
                  </svg>
                  <span className="text-[9px] font-bold uppercase tracking-wider mt-1 font-mono">ÍCONE</span>
                </div>
              )}

              {/* Hover overlay */}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white transition-opacity">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                </svg>
                <span className="text-[9px] font-mono mt-0.5 font-semibold">ESCOLHER</span>
              </div>

              {isUploading && (
                <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                  <span className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                </div>
              )}
            </div>

            {/* Hidden native file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />

            {/* Helper label */}
            <button
              type="button"
              onClick={() => setIsPickerOpen(!isPickerOpen)}
              className="text-[11px] text-[var(--discord-text-muted)] hover:text-[var(--foreground)] transition-colors cursor-pointer border-none bg-transparent flex items-center gap-1"
            >
              <span>{iconPreview ? 'Trocar emoji ou foto' : 'Escolher emoji ou foto'}</span>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>

            {/* Floating Notion-style popover */}
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
              <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--accents-5)] font-mono">
                NOME DO WORKSPACE
              </label>
              <input
                type="text"
                required
                placeholder="Ex: Ciência da Computação, Projeto Final..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full h-9 px-3 text-xs bg-[var(--background)] border border-[var(--discord-border)] focus:border-[#20b8cd] text-[var(--accents-6)] rounded-[4px] outline-none transition-colors"
                autoFocus
              />
            </div>

            {/* Collaborative Checkbox */}
            <label className="flex items-center gap-2.5 cursor-pointer select-none p-3 rounded-[6px] border border-[var(--discord-border)] bg-[var(--background)] hover:bg-[var(--accents-2)] transition-colors">
              <input
                type="checkbox"
                checked={isCollaborative}
                onChange={(e) => setIsCollaborative(e.target.checked)}
                className="w-4 h-4 rounded border-[var(--discord-border)] text-[#20b8cd] focus:ring-0 cursor-pointer"
              />
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-white">Workspace Colaborativo</span>
                <span className="text-[11px] text-[var(--accents-5)]">Permitir convidar outros membros em tempo real</span>
              </div>
            </label>
          </form>
        </div>

        {/* Discord Action Footer Bar */}
        <div className="bg-[var(--background)] border-t border-[var(--discord-border)] px-6 py-3.5 flex items-center justify-between rounded-b-lg">
          <button
            type="button"
            onClick={handleClose}
            className="h-9 px-4 text-xs font-medium rounded-[4px] bg-[var(--accents-2)] hover:bg-[var(--discord-border)] border border-[var(--discord-border)] text-[var(--accents-6)] hover:text-white transition-colors cursor-pointer"
            disabled={isSubmitting}
          >
            Voltar
          </button>
          <button
            type="submit"
            form="create-workspace-form"
            className="h-9 px-5 text-xs font-semibold rounded-[4px] bg-[#20b8cd] hover:bg-[#1ba2b4] text-white shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            disabled={!name.trim() || isSubmitting}
          >
            {isSubmitting ? 'Criando...' : 'Criar Workspace'}
          </button>
        </div>
      </div>

      {/* Image Cropper Modal for Workspace Icon */}
      {cropperImage && (
        <ImageCropperModal
          isOpen={!!cropperImage}
          imageSrc={cropperImage}
          cropShape="squircle"
          title="Recortar Ícone do Workspace"
          onConfirm={handleCroppedIconConfirm}
          onClose={() => setCropperImage(null)}
        />
      )}
    </div>
  );
}
