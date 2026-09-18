'use client';

import React, { useState, useEffect, useRef } from 'react';
import { api } from '@/lib/api';
import ImageCropperModal from './ImageCropperModal';
import WorkspaceIcon from './WorkspaceIcon';
import WorkspaceIconPickerPopover from './WorkspaceIconPickerPopover';

interface WorkspaceSettingsModalProps {
  isOpen: boolean;
  workspace: any;
  onClose: () => void;
  onWorkspaceUpdated: (updatedWorkspace: any) => void;
  onWorkspaceDeleted: (workspaceId: string) => void;
  showToast?: (message: string, type?: 'error' | 'success' | 'info') => void;
  isOwner?: boolean;
}

export default function WorkspaceSettingsModal({
  isOpen,
  workspace,
  onClose,
  onWorkspaceUpdated,
  onWorkspaceDeleted,
  showToast,
  isOwner = true,
}: WorkspaceSettingsModalProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'collaborators' | 'danger'>('overview');
  const [nome, setNome] = useState('');
  const [icone, setIcone] = useState('');
  const [iconPreview, setIconPreview] = useState<string | null>(null);
  const [isCollaborative, setIsCollaborative] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [cropperImage, setCropperImage] = useState<string | null>(null);

  // Collaborators & Invites
  const [collaborators, setCollaborators] = useState<any[]>([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [isInviting, setIsInviting] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [loadingLink, setLoadingLink] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [confirmResetLink, setConfirmResetLink] = useState(false);
  const [isResettingLink, setIsResettingLink] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [invitingUserId, setInvitingUserId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Delete confirmation
  const [deleteConfirmName, setDeleteConfirmName] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadCollaborators = async () => {
    if (!workspace?.id) return;
    try {
      const data = await api(`/workspaces/${workspace.id}/collaborators`);
      setCollaborators(data || []);
    } catch (err) {
      console.error('Erro ao carregar colaboradores:', err);
    }
  };

  const loadInviteLink = async () => {
    if (!workspace?.id) return;
    setLoadingLink(true);
    try {
      const data = await api(`/workspaces/${workspace.id}/invite-link`, {
        method: 'POST',
      });
      if (data?.inviteCode) {
        setInviteCode(data.inviteCode);
      }
    } catch (err) {
      console.error('Erro ao carregar link de convite:', err);
    } finally {
      setLoadingLink(false);
    }
  };

  useEffect(() => {
    if (workspace && isOpen) {
      setNome(workspace.nome || '');
      setIcone(workspace.icone || '');
      setIconPreview(workspace.icone || null);
      setIsCollaborative(!!workspace.isCollaborative);
      setDeleteConfirmName('');
      setConfirmResetLink(false);
      setIsCopied(false);
      setSearchQuery('');
      setSearchResults([]);
      loadCollaborators();
      loadInviteLink();
      setIsPickerOpen(false);
    }
  }, [workspace, isOpen]);

  useEffect(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    const trimmed = searchQuery.trim();
    if (!trimmed || trimmed.length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }
    setIsSearching(true);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const users = await api(`/users/search?q=${encodeURIComponent(trimmed)}`);
        setSearchResults(users || []);
      } catch (err) {
        console.error('Erro na busca de usuários:', err);
      } finally {
        setIsSearching(false);
      }
    }, 300);
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [searchQuery]);

  if (!isOpen || !workspace) return null;

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
        setIcone(res.url);
      }
    } catch (err: any) {
      console.error('Falha ao enviar imagem:', err);
      if (showToast) showToast('Erro no upload da imagem.', 'error');
    } finally {
      setIsUploading(false);
      setCropperImage(null);
    }
  };

  const handleSaveOverview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim() || isSaving) return;

    setIsSaving(true);
    try {
      const updated = await api(`/workspaces/${workspace.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          nome: nome.trim(),
          icone: icone.trim() || null,
          isCollaborative,
        }),
      });

      if (showToast) showToast('Workspace atualizado com sucesso!', 'success');
      onWorkspaceUpdated(updated);
      onClose();
    } catch (err: any) {
      console.error('Erro ao salvar workspace:', err);
      if (showToast) showToast(err.message || 'Erro ao atualizar workspace', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopyLink = async () => {
    if (!inviteCode) return;
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const fullUrl = `${origin}/invite/${inviteCode}`;

    try {
      await navigator.clipboard.writeText(fullUrl);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2500);
      if (showToast) showToast('Link de convite copiado!', 'success');
    } catch {
      const textArea = document.createElement('textarea');
      textArea.value = fullUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2500);
      if (showToast) showToast('Link de convite copiado!', 'success');
    }
  };

  const handleResetLink = async () => {
    if (!workspace?.id) return;
    setIsResettingLink(true);
    try {
      const data = await api(`/workspaces/${workspace.id}/invite-link/reset`, {
        method: 'POST',
      });
      if (data?.inviteCode) {
        setInviteCode(data.inviteCode);
        setConfirmResetLink(false);
        if (showToast) showToast('Link de convite redefinido com sucesso!', 'success');
      }
    } catch (err: any) {
      console.error('Erro ao redefinir link:', err);
      if (showToast) showToast(err.message || 'Erro ao redefinir link.', 'error');
    } finally {
      setIsResettingLink(false);
    }
  };

  const handleInviteUser = async (userToInvite: any) => {
    if (!workspace?.id) return;
    setInvitingUserId(userToInvite.id);
    try {
      await api(`/workspaces/${workspace.id}/invite`, {
        method: 'POST',
        body: JSON.stringify({ userId: userToInvite.id }),
      });
      if (showToast) showToast(`@${userToInvite.username || userToInvite.name || userToInvite.email} adicionado!`, 'success');
      setSearchQuery('');
      setSearchResults([]);
      loadCollaborators();
    } catch (err: any) {
      console.error('Erro ao convidar usuário:', err);
      if (showToast) showToast(err.message || 'Erro ao convidar usuário', 'error');
    } finally {
      setInvitingUserId(null);
    }
  };

  const handleRemoveCollaborator = async (collabUserId: string) => {
    if (!workspace?.id) return;
    setRemovingId(collabUserId);
    try {
      await api(`/workspaces/${workspace.id}/collaborators/${collabUserId}`, {
        method: 'DELETE',
      });
      if (showToast) showToast('Colaborador removido com sucesso.', 'info');
      loadCollaborators();
    } catch (err: any) {
      console.error('Erro ao remover colaborador:', err);
      if (showToast) showToast(err.message || 'Erro ao remover colaborador.', 'error');
    } finally {
      setRemovingId(null);
    }
  };

  const handleChangeRole = async (collabUserId: string, newRole: 'MEMBER' | 'VIEWER') => {
    if (!workspace?.id) return;
    try {
      await api(`/workspaces/${workspace.id}/collaborators/${collabUserId}/role`, {
        method: 'PATCH',
        body: JSON.stringify({ role: newRole }),
      });
      if (showToast) showToast('Papel do colaborador atualizado com sucesso!', 'success');
      loadCollaborators();
    } catch (err: any) {
      console.error('Erro ao alterar papel:', err);
      if (showToast) showToast(err.message || 'Erro ao alterar papel.', 'error');
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim() || isInviting) return;

    setIsInviting(true);
    try {
      await api(`/workspaces/${workspace.id}/invite`, {
        method: 'POST',
        body: JSON.stringify({ email: inviteEmail.trim() }),
      });

      if (showToast) showToast('Convite enviado com sucesso!', 'success');
      setInviteEmail('');
      loadCollaborators();
    } catch (err: any) {
      console.error('Erro ao convidar colaborador:', err);
      if (showToast) showToast(err.message || 'Erro ao convidar usuário', 'error');
    } finally {
      setIsInviting(false);
    }
  };

  const handleDelete = async () => {
    if (deleteConfirmName !== workspace.nome || isDeleting) return;

    setIsDeleting(true);
    try {
      await api(`/workspaces/${workspace.id}`, {
        method: 'DELETE',
      });

      if (showToast) showToast('Workspace excluído com sucesso.', 'info');
      onWorkspaceDeleted(workspace.id);
      onClose();
    } catch (err: any) {
      console.error('Erro ao excluir workspace:', err);
      if (showToast) showToast(err.message || 'Erro ao excluir workspace', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150 font-sansation"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[680px] h-[520px] bg-[#181818] border border-white/10 rounded-none shadow-2xl flex overflow-hidden animate-in zoom-in-95 duration-150 relative select-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Left Settings Nav */}
        <aside className="w-[200px] min-w-[200px] bg-[#141414] border-r border-white/10 p-4 flex flex-col justify-between">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-500 px-2.5 py-1">
              {workspace.nome}
            </span>

            <button
              type="button"
              onClick={() => setActiveTab('overview')}
              className={`w-full text-left px-3 py-2 text-xs font-semibold rounded-none transition-colors flex items-center gap-2 cursor-pointer border-none ${
                activeTab === 'overview'
                  ? 'bg-white/10 text-white font-medium'
                  : 'text-zinc-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
              <span>Visão Geral</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('collaborators')}
              className={`w-full text-left px-3 py-2 text-xs font-semibold rounded-none transition-colors flex items-center gap-2 cursor-pointer border-none ${
                activeTab === 'collaborators'
                  ? 'bg-white/10 text-white font-medium'
                  : 'text-zinc-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
              <span>Colaboradores</span>
            </button>

            {isOwner && (
              <>
                <div className="h-[1px] bg-white/10 my-2" />

                <button
                  type="button"
                  onClick={() => setActiveTab('danger')}
                  className={`w-full text-left px-3 py-2 text-xs font-semibold rounded-none transition-colors flex items-center gap-2 cursor-pointer border-none ${
                    activeTab === 'danger'
                      ? 'bg-red-500/10 text-red-400 font-medium'
                      : 'text-zinc-500 hover:text-red-400 hover:bg-red-500/10'
                  }`}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 6h18" />
                    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                  </svg>
                  <span>Excluir Workspace</span>
                </button>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-full text-xs h-8 flex items-center justify-center gap-1.5 rounded-none bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 hover:text-white transition-colors cursor-pointer"
          >
            <span>Fechar (ESC)</span>
          </button>
        </aside>

        {/* Right Settings Content Area */}
        <main className="flex-1 p-6 overflow-y-auto bg-[#181818]">
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <form onSubmit={handleSaveOverview} className="flex flex-col gap-5">
              <div>
                <h3 className="text-base font-bold text-white">Visão Geral do Workspace</h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Atualize o ícone de exibição e os detalhes fundamentais.
                </p>
              </div>

              {/* Icon / Avatar preview and change */}
              <div className="flex items-center gap-4 p-4 rounded-none bg-white/[0.02] border border-white/10 relative">
                <div
                  onClick={() => setIsPickerOpen(!isPickerOpen)}
                  className="w-16 h-16 rounded-none border border-dashed border-white/20 hover:border-white/50 transition-all flex items-center justify-center cursor-pointer relative overflow-hidden group shrink-0 bg-white/5"
                  title="Alterar emoji ou foto"
                >
                  <WorkspaceIcon
                    icone={iconPreview}
                    nome={nome || workspace.nome || 'WS'}
                    size={36}
                    className="w-full h-full"
                    emojiClassName="text-2xl"
                  />

                  <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity text-[10px] font-mono font-bold">
                    TROCAR
                  </div>
                </div>

                <div className="flex flex-col gap-1.5 flex-1">
                  <span className="text-xs font-semibold text-white">Ícone do Workspace</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsPickerOpen(!isPickerOpen)}
                      className="h-7 px-2.5 text-[11px] font-semibold rounded-none bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 hover:text-white transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <path d="M8 14s1.5 2 4 2 4-2 4-2" />
                        <line x1="9" y1="9" x2="9.01" y2="9" />
                        <line x1="15" y1="9" x2="15.01" y2="9" />
                      </svg>
                      <span>{isPickerOpen ? 'Fechar Seletor' : 'Escolher Emoji ou Foto'}</span>
                    </button>
                    {icone && (
                      <button
                        type="button"
                        onClick={() => {
                          setIcone('');
                          setIconPreview(null);
                          setIsPickerOpen(false);
                        }}
                        className="text-[11px] text-zinc-500 hover:text-red-400 transition-colors cursor-pointer px-2"
                      >
                        Remover
                      </button>
                    )}
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                  <span className="text-[11px] text-zinc-500">
                    Escolha um emoji ou envie uma foto personalizada.
                  </span>
                </div>

                {isPickerOpen && (
                  <WorkspaceIconPickerPopover
                    currentIcon={iconPreview}
                    onSelectEmoji={(emoji) => {
                      setIcone(emoji);
                      setIconPreview(emoji);
                      setIsPickerOpen(false);
                    }}
                    onSelectImageUrl={(url) => {
                      setIcone(url);
                      setIconPreview(url.trim() ? url.trim() : null);
                      setIsPickerOpen(false);
                    }}
                    onTriggerFileUpload={() => {
                      setIsPickerOpen(false);
                      fileInputRef.current?.click();
                    }}
                    onRemoveIcon={() => {
                      setIcone('');
                      setIconPreview(null);
                      setIsPickerOpen(false);
                    }}
                    onClose={() => setIsPickerOpen(false)}
                    anchorPosition="bottom"
                  />
                )}
              </div>

              {/* Name */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 font-mono">
                  NOME DO WORKSPACE
                </label>
                <input
                  type="text"
                  required
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  className="w-full h-8 px-3 text-xs bg-white/5 border border-white/10 focus:border-white/30 text-white rounded-none outline-none transition-colors font-sansation"
                />
              </div>

              {/* Collaborative Status */}
              <div className="flex items-center justify-between p-3.5 rounded-none border border-white/10 bg-white/[0.02]">
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs font-semibold text-white">Colaboração e Membros</span>
                  <span className="text-[11px] text-zinc-400">
                    {isCollaborative
                      ? 'Workspace colaborativo ativo. Membros podem editar notas e desenhar em tempo real.'
                      : 'Workspace pessoal. Para torná-lo colaborativo, basta convidar membros pelo botão de compartilhamento.'}
                  </span>
                </div>
                <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-none bg-white/5 border border-white/10 text-zinc-400 shrink-0 ml-3">
                  {isCollaborative ? 'Colaborativo' : 'Pessoal'}
                </span>
              </div>

              <div className="pt-3 border-t border-white/10 flex justify-end">
                <button
                  type="submit"
                  disabled={!nome.trim() || isSaving}
                  className="bg-white text-black hover:bg-zinc-200 text-xs h-8 px-5 font-bold rounded-none transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {isSaving ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: COLLABORATORS */}
          {activeTab === 'collaborators' && (
            <div className="flex flex-col gap-5">
              <div>
                <h3 className="text-base font-bold text-white">Colaboradores do Workspace</h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Convide colegas para acessar e editar este workspace em tempo real.
                </p>
              </div>

              {/* Invite Link */}
              <div className="flex flex-col gap-2 p-3.5 rounded-none bg-white/[0.02] border border-white/10">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 font-mono">
                    LINK DE CONVITE
                  </span>
                  {inviteCode && !confirmResetLink && (
                    <button
                      type="button"
                      onClick={() => setConfirmResetLink(true)}
                      className="text-[10px] text-zinc-400 hover:text-red-400 transition-colors cursor-pointer font-mono"
                    >
                      Redefinir link
                    </button>
                  )}
                </div>

                {confirmResetLink ? (
                  <div className="p-3 rounded-none bg-white/5 border border-white/10 flex items-center justify-between gap-2">
                    <span className="text-xs text-zinc-300">
                      O link atual deixará de funcionar. Confirmar?
                    </span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={handleResetLink}
                        disabled={isResettingLink}
                        className="px-3 py-1 text-xs font-bold rounded-none bg-red-500 hover:bg-red-600 text-white transition-colors cursor-pointer disabled:opacity-50"
                      >
                        {isResettingLink ? 'Redefinindo...' : 'Sim, redefinir'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmResetLink(false)}
                        className="px-3 py-1 text-xs font-semibold rounded-none bg-white/5 text-zinc-400 hover:text-white border border-white/10 transition-colors cursor-pointer"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      readOnly
                      value={loadingLink ? 'Carregando link...' : (inviteCode ? `${typeof window !== 'undefined' ? window.location.origin : ''}/invite/${inviteCode}` : '')}
                      placeholder="Carregando link..."
                      className="flex-1 h-8 px-3 text-xs font-mono bg-white/5 border border-white/10 text-zinc-300 rounded-none outline-none select-all"
                    />
                    <button
                      type="button"
                      onClick={handleCopyLink}
                      disabled={!inviteCode || loadingLink}
                      className={`shrink-0 px-4 h-8 rounded-none font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50 ${
                        isCopied
                          ? 'bg-emerald-500 text-white'
                          : 'bg-white text-black hover:bg-zinc-200'
                      }`}
                    >
                      {isCopied ? 'Copiado!' : 'Copiar Link'}
                    </button>
                  </div>
                )}
                <span className="text-[11px] text-zinc-500">
                  Qualquer pessoa com este link pode ingressar diretamente no workspace.
                </span>
              </div>

              {/* Search User & Invite */}
              <div className="flex flex-col gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 font-mono">
                  BUSCAR OU CONVIDAR POR E-MAIL
                </span>
                <form onSubmit={handleInvite} className="flex gap-2">
                  <div className="flex-1 relative flex items-center">
                    <input
                      type="text"
                      placeholder="Buscar por @username, nome ou digitar e-mail..."
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setInviteEmail(e.target.value);
                      }}
                      className="w-full h-8 pl-3 pr-8 text-xs bg-white/5 border border-white/10 focus:border-white/30 text-white rounded-none outline-none transition-colors"
                    />
                    {isSearching && (
                      <div className="absolute right-2.5 w-3.5 h-3.5 border-2 border-zinc-500 border-t-white rounded-full animate-spin" />
                    )}
                  </div>
                  {searchQuery.trim().includes('@') && (
                    <button
                      type="submit"
                      disabled={!inviteEmail.trim() || isInviting}
                      className="bg-white hover:bg-zinc-200 text-black text-xs h-8 px-4 whitespace-nowrap font-bold rounded-none shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      {isInviting ? 'Convidando...' : 'Convidar E-mail'}
                    </button>
                  )}
                </form>

                {/* Dropdown Results */}
                {searchQuery.trim().length >= 2 && (
                  <div className="mt-1 p-1.5 rounded-none bg-[#141414] border border-white/10 shadow-2xl flex flex-col gap-1 max-h-[180px] overflow-y-auto">
                    {isSearching ? (
                      <div className="py-2 text-center text-xs text-zinc-500">
                        Buscando usuários...
                      </div>
                    ) : searchResults.length === 0 ? (
                      <div className="py-2 text-center text-xs text-zinc-500">
                        Nenhum usuário encontrado para "{searchQuery}".
                      </div>
                    ) : (
                      searchResults.map((u) => {
                        const isAlreadyMember = collaborators.some((c) => c.userId === u.id || c.user?.id === u.id);
                        const isInvitingThis = invitingUserId === u.id;
                        const displayName = u.name || (u.username ? `@${u.username}` : u.email);

                        return (
                          <div
                            key={u.id}
                            className="flex items-center justify-between p-2 rounded-none hover:bg-white/5 transition-colors gap-2"
                          >
                            <div className="flex items-center gap-2 overflow-hidden">
                              <div className="w-6 h-6 rounded-none bg-white/10 border border-white/10 flex items-center justify-center text-[10px] font-bold text-white shrink-0 overflow-hidden">
                                {u.avatarUrl ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img src={u.avatarUrl} alt={displayName} className="w-full h-full object-cover" />
                                ) : (
                                  <span>{(u.name?.[0] || u.username?.[0] || u.email[0]).toUpperCase()}</span>
                                )}
                              </div>
                              <div className="flex flex-col overflow-hidden text-left">
                                <span className="text-xs font-medium text-white truncate">{u.name || u.username}</span>
                                <span className="text-[10px] text-zinc-500 font-mono truncate">
                                  {u.username ? `@${u.username}` : u.email}
                                </span>
                              </div>
                            </div>

                            {isAlreadyMember ? (
                              <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 bg-white/5 border border-white/10 px-2 py-0.5 rounded-none">
                                Membro
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleInviteUser(u)}
                                disabled={isInvitingThis}
                                className="shrink-0 bg-white hover:bg-zinc-200 text-black px-3 py-1 rounded-none font-bold text-xs transition-colors cursor-pointer disabled:opacity-50"
                              >
                                {isInvitingThis ? 'Adicionando...' : 'Convidar'}
                              </button>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>

              {/* Active Members */}
              <div className="flex flex-col gap-2 mt-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 font-mono">
                  MEMBROS ATIVOS ({collaborators.length})
                </span>

                {collaborators.length === 0 ? (
                  <div className="text-xs text-zinc-500 p-4 text-center border border-dashed border-white/10 rounded-none">
                    Nenhum colaborador adicionado ainda.
                  </div>
                ) : (
                  <div className="flex flex-col gap-1.5 max-h-[180px] overflow-y-auto">
                    {collaborators.map((c) => {
                      const displayName = c.user?.username ? `@${c.user.username}` : (c.user?.name || c.user?.email || 'Sem Nome');
                      const targetUserId = c.userId || c.user?.id;
                      const isRemoving = removingId === targetUserId;

                      return (
                        <div
                          key={c.id}
                          className="flex items-center justify-between p-2.5 rounded-none bg-white/[0.02] border border-white/10 text-xs"
                        >
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-none bg-white/10 overflow-hidden flex items-center justify-center text-[10px] font-bold text-white border border-white/10">
                              {c.user?.avatarUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={c.user.avatarUrl}
                                  alt={displayName}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                  }}
                                />
                              ) : (
                                <span>{c.user?.name?.[0] || c.user?.username?.[0] || c.user?.email?.[0] || 'U'}</span>
                              )}
                            </div>
                            <span className="font-medium text-white truncate max-w-[200px]">
                              {displayName}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <select
                              value={c.role || 'MEMBER'}
                              onChange={(e) => handleChangeRole(targetUserId, e.target.value as 'MEMBER' | 'VIEWER')}
                              className="bg-[#181818] text-[10px] text-zinc-300 border border-white/10 rounded-none px-2 py-0.5 outline-none cursor-pointer focus:border-white/30 transition-colors"
                              title="Alterar papel do colaborador"
                            >
                              <option value="MEMBER">Membro (Edição)</option>
                              <option value="VIEWER">Visualizador (Leitura)</option>
                            </select>

                            <button
                              type="button"
                              onClick={() => handleRemoveCollaborator(targetUserId)}
                              disabled={isRemoving}
                              title="Remover colaborador"
                              className="w-6 h-6 flex items-center justify-center rounded-none text-zinc-500 hover:text-red-400 hover:bg-white/5 transition-colors cursor-pointer disabled:opacity-50"
                            >
                              {isRemoving ? (
                                <div className="w-3 h-3 border-2 border-zinc-500 border-t-red-400 rounded-full animate-spin" />
                              ) : (
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <line x1="18" y1="6" x2="6" y2="18" />
                                  <line x1="6" y1="6" x2="18" y2="18" />
                                </svg>
                              )}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: DANGER ZONE */}
          {activeTab === 'danger' && isOwner && (
            <div className="flex flex-col gap-5">
              <div>
                <h3 className="text-base font-bold text-red-500">Zona de Perigo</h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  A exclusão de um workspace é irreversível. Todas as notas, pastas, flashcards e chats de IA contidos serão excluídos permanentemente.
                </p>
              </div>

              <div className="p-4 rounded-none bg-red-500/5 border border-red-500/20 flex flex-col gap-3">
                <span className="text-xs text-white">
                  Para confirmar a exclusão, digite o nome exato do workspace: <strong className="font-mono text-red-400">"{workspace.nome}"</strong>
                </span>

                <input
                  type="text"
                  placeholder={workspace.nome}
                  value={deleteConfirmName}
                  onChange={(e) => setDeleteConfirmName(e.target.value)}
                  className="w-full h-8 px-3 text-xs bg-white/5 border border-red-500/30 focus:border-red-500 text-white rounded-none outline-none transition-colors"
                />

                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleteConfirmName !== workspace.nome || isDeleting}
                  className="h-8 px-4 text-xs font-bold rounded-none bg-red-500 hover:bg-red-600 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer border-none flex items-center justify-center gap-2 self-end mt-1"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 6h18" />
                    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                  </svg>
                  <span>{isDeleting ? 'Excluindo...' : 'Excluir Este Workspace'}</span>
                </button>
              </div>
            </div>
          )}
        </main>
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
