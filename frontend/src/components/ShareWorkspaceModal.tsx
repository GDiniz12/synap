'use client';

import { useState, useEffect, useRef } from 'react';
import { api } from '@/lib/api';
import TesseractLogo from './TesseractLogo';

interface ShareWorkspaceModalProps {
  workspaceId: string;
  isOpen: boolean;
  onClose: () => void;
}

interface SearchedUser {
  id: string;
  name: string | null;
  username: string | null;
  email: string;
  avatarUrl: string | null;
}

interface Collaborator {
  id: string;
  userId: string;
  role: 'MEMBER' | 'VIEWER';
  user: {
    id: string;
    name: string | null;
    username: string | null;
    email: string;
    avatarUrl: string | null;
  };
}

export default function ShareWorkspaceModal({ workspaceId, isOpen, onClose }: ShareWorkspaceModalProps) {
  // Invite link state
  const [inviteCode, setInviteCode] = useState<string>('');
  const [loadingLink, setLoadingLink] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isResettingLink, setIsResettingLink] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  // Search & Invite state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchedUser[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isInvitingId, setIsInvitingId] = useState<string | null>(null);

  // Collaborators
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [removingId, setRemovingId] = useState<string | null>(null);

  // Status feedback
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      loadCollaborators();
      loadInviteLink();
    } else {
      setSearchQuery('');
      setSearchResults([]);
      setError('');
      setSuccess('');
      setConfirmReset(false);
      setIsCopied(false);
    }
  }, [isOpen, workspaceId]);

  // Debounced search
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

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
        console.error('Erro na pesquisa de usuários:', err);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery]);

  const loadCollaborators = async () => {
    try {
      const data = await api(`/workspaces/${workspaceId}/collaborators`);
      setCollaborators(data || []);
    } catch (err: any) {
      console.error('Erro ao carregar colaboradores:', err);
    }
  };

  const loadInviteLink = async () => {
    setLoadingLink(true);
    try {
      const data = await api(`/workspaces/${workspaceId}/invite-link`, {
        method: 'POST',
      });
      if (data?.inviteCode) {
        setInviteCode(data.inviteCode);
      }
    } catch (err: any) {
      console.error('Erro ao carregar link de convite:', err);
    } finally {
      setLoadingLink(false);
    }
  };

  const handleResetLink = async () => {
    setIsResettingLink(true);
    setError('');
    setSuccess('');
    try {
      const data = await api(`/workspaces/${workspaceId}/invite-link/reset`, {
        method: 'POST',
      });
      if (data?.inviteCode) {
        setInviteCode(data.inviteCode);
        setSuccess('Link de convite redefinido com sucesso!');
        setConfirmReset(false);
      }
    } catch (err: any) {
      console.error('Erro ao redefinir link:', err);
      setError(err.message || 'Erro ao redefinir link.');
    } finally {
      setIsResettingLink(false);
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
    } catch {
      // Fallback
      const textArea = document.createElement('textarea');
      textArea.value = fullUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2500);
    }
  };

  const handleInviteUser = async (userToInvite: SearchedUser) => {
    setIsInvitingId(userToInvite.id);
    setError('');
    setSuccess('');

    try {
      await api(`/workspaces/${workspaceId}/invite`, {
        method: 'POST',
        body: JSON.stringify({ userId: userToInvite.id }),
      });
      setSuccess(`@${userToInvite.username || userToInvite.name || userToInvite.email} foi adicionado como colaborador!`);
      setSearchQuery('');
      setSearchResults([]);
      loadCollaborators();
    } catch (err: any) {
      console.error('Erro ao convidar usuário:', err);
      setError(err.message || 'Não foi possível convidar o usuário.');
    } finally {
      setIsInvitingId(null);
    }
  };

  const handleInviteEmailDirectly = async (e: React.FormEvent) => {
    e.preventDefault();
    const emailToInvite = searchQuery.trim();
    if (!emailToInvite || !emailToInvite.includes('@')) return;

    setIsInvitingId('email-direct');
    setError('');
    setSuccess('');

    try {
      await api(`/workspaces/${workspaceId}/invite`, {
        method: 'POST',
        body: JSON.stringify({ email: emailToInvite }),
      });
      setSuccess(`Convite enviado para ${emailToInvite}!`);
      setSearchQuery('');
      setSearchResults([]);
      loadCollaborators();
    } catch (err: any) {
      console.error('Erro ao convidar por email:', err);
      setError(err.message || 'Não foi possível convidar por e-mail.');
    } finally {
      setIsInvitingId(null);
    }
  };

  const handleRemoveCollaborator = async (collabUserId: string) => {
    setRemovingId(collabUserId);
    setError('');
    setSuccess('');
    try {
      await api(`/workspaces/${workspaceId}/collaborators/${collabUserId}`, {
        method: 'DELETE',
      });
      setSuccess('Colaborador removido com sucesso.');
      loadCollaborators();
    } catch (err: any) {
      console.error('Erro ao remover colaborador:', err);
      setError(err.message || 'Erro ao remover colaborador.');
    } finally {
      setRemovingId(null);
    }
  };

  const handleChangeRole = async (collabUserId: string, newRole: 'MEMBER' | 'VIEWER') => {
    setError('');
    setSuccess('');
    try {
      await api(`/workspaces/${workspaceId}/collaborators/${collabUserId}/role`, {
        method: 'PATCH',
        body: JSON.stringify({ role: newRole }),
      });
      setSuccess('Papel do colaborador atualizado!');
      loadCollaborators();
    } catch (err: any) {
      console.error('Erro ao alterar papel:', err);
      setError(err.message || 'Erro ao alterar papel do colaborador.');
    }
  };

  if (!isOpen) return null;

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const fullInviteUrl = inviteCode ? `${origin}/invite/${inviteCode}` : '';
  const isInputEmail = searchQuery.trim().includes('@') && searchQuery.trim().includes('.');

  return (
    <div
      className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 select-none animate-in fade-in duration-150 font-sansation"
      onClick={onClose}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose();
      }}
    >
      <div
        className="bg-[#181818] border border-white/10 rounded-none w-full max-w-lg overflow-hidden shadow-2xl flex flex-col animate-in zoom-in-95 duration-150 max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10 flex justify-between items-center bg-[#141414]">
          <div className="flex items-center gap-3">
            <TesseractLogo size={24} />
            <div>
              <h2 className="text-sm font-bold text-white tracking-tight leading-tight">Compartilhar Workspace</h2>
              <span className="text-xs text-zinc-400 block mt-0.5">Convide pessoas para colaborar em tempo real</span>
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

        {/* Content */}
        <div className="p-6 flex flex-col gap-5 overflow-y-auto">
          {/* Alerts */}
          {error && (
            <div className="p-3 rounded-none bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3 rounded-none bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span>{success}</span>
            </div>
          )}

          {/* Section 1: Invite Link */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-semibold uppercase tracking-wider font-mono text-zinc-400">
                Link de Convite
              </label>
              {inviteCode && !confirmReset && (
                <button
                  type="button"
                  onClick={() => setConfirmReset(true)}
                  className="text-[10px] text-zinc-400 hover:text-red-400 transition-colors cursor-pointer font-mono"
                >
                  Redefinir link
                </button>
              )}
            </div>

            {confirmReset ? (
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
                    onClick={() => setConfirmReset(false)}
                    className="px-3 py-1 text-xs font-semibold rounded-none bg-white/5 text-zinc-400 hover:text-white border border-white/10 transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex gap-2">
                <div className="flex-1 relative flex items-center">
                  <input
                    type="text"
                    readOnly
                    value={loadingLink ? 'Gerando link...' : fullInviteUrl}
                    placeholder="Gerando link de convite..."
                    className="w-full h-8 pl-3 pr-8 text-xs font-mono bg-white/5 border border-white/10 text-zinc-300 rounded-none outline-none select-all"
                  />
                  <div className="absolute right-2.5 text-zinc-500 pointer-events-none">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                    </svg>
                  </div>
                </div>

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
                  {isCopied ? (
                    <>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      <span>Copiado!</span>
                    </>
                  ) : (
                    <>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                      </svg>
                      <span>Copiar Link</span>
                    </>
                  )}
                </button>
              </div>
            )}
            <span className="text-[11px] text-zinc-500">
              Qualquer pessoa com este link pode acessar e colaborar no workspace.
            </span>
          </div>

          <div className="h-[1px] bg-white/10 my-1" />

          {/* Section 2: Search and Direct Invite */}
          <div className="flex flex-col gap-2 relative" ref={dropdownRef}>
            <label className="text-[11px] font-semibold uppercase tracking-wider font-mono text-zinc-400">
              Buscar Usuário ou Convidar por E-mail
            </label>

            <form onSubmit={handleInviteEmailDirectly} className="flex gap-2">
              <div className="flex-1 relative flex items-center">
                <input
                  type="text"
                  placeholder="Pesquisar por @username, nome ou e-mail..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-8 pl-8 pr-3 text-xs bg-white/5 border border-white/10 focus:border-white/30 text-white rounded-none outline-none transition-colors"
                />
                <div className="absolute left-2.5 text-zinc-500 pointer-events-none">
                  {isSearching ? (
                    <div className="w-3.5 h-3.5 border-2 border-zinc-500 border-t-white rounded-full animate-spin" />
                  ) : (
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="11" cy="11" r="8" />
                      <line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                  )}
                </div>
              </div>

              {isInputEmail && (
                <button
                  type="submit"
                  disabled={isInvitingId === 'email-direct'}
                  className="shrink-0 bg-white hover:bg-zinc-200 text-black px-4 h-8 rounded-none font-bold text-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isInvitingId === 'email-direct' ? 'Enviando...' : 'Convidar E-mail'}
                </button>
              )}
            </form>

            {/* Live Search Results Dropdown */}
            {searchQuery.trim().length >= 2 && (
              <div className="mt-1 p-1.5 rounded-none bg-[#141414] border border-white/10 shadow-2xl flex flex-col gap-1 max-h-[190px] overflow-y-auto">
                {isSearching ? (
                  <div className="py-3 text-center text-xs text-zinc-500">
                    Pesquisando usuários...
                  </div>
                ) : searchResults.length === 0 ? (
                  <div className="py-3 text-center text-xs text-zinc-500">
                    Nenhum usuário encontrado para "{searchQuery}".
                    {isInputEmail && (
                      <div className="mt-1 text-[11px] text-zinc-400">
                        Pressione "Convidar E-mail" para enviar o convite diretamente.
                      </div>
                    )}
                  </div>
                ) : (
                  searchResults.map((u) => {
                    const isAlreadyMember = collaborators.some((c) => c.userId === u.id);
                    const isInvitingThis = isInvitingId === u.id;
                    const displayName = u.name || (u.username ? `@${u.username}` : u.email);

                    return (
                      <div
                        key={u.id}
                        className="flex items-center justify-between p-2 rounded-none hover:bg-white/5 transition-colors gap-2"
                      >
                        <div className="flex items-center gap-2.5 overflow-hidden">
                          <div className="w-7 h-7 rounded-none bg-white/10 border border-white/10 flex items-center justify-center text-xs font-bold text-white shrink-0 overflow-hidden">
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

          <div className="h-[1px] bg-white/10 my-1" />

          {/* Section 3: Current Collaborators */}
          <div className="flex flex-col gap-2">
            <h3 className="text-[11px] font-semibold uppercase tracking-wider font-mono text-zinc-400">
              Colaboradores Ativos ({collaborators.length})
            </h3>
            
            {collaborators.length === 0 ? (
              <div className="text-xs text-zinc-500 italic py-3 text-center border border-dashed border-white/10 rounded-none">
                Nenhum colaborador adicionado ainda.
              </div>
            ) : (
              <ul className="flex flex-col gap-1.5 max-h-[160px] overflow-y-auto pr-1">
                {collaborators.map((c) => {
                  const displayName = c.user?.username ? `@${c.user.username}` : (c.user?.name || c.user?.email || 'Sem Nome');
                  const isRemovingThis = removingId === c.user.id;

                  return (
                    <li key={c.id} className="flex items-center justify-between p-2.5 rounded-none bg-white/[0.02] border border-white/10">
                      <div className="flex items-center gap-2.5 overflow-hidden">
                        <div className="w-7 h-7 rounded-none bg-white/10 overflow-hidden flex items-center justify-center text-xs font-bold text-white uppercase shrink-0 border border-white/10">
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
                            <span>{(c.user?.name?.[0] || c.user?.username?.[0] || c.user?.email?.[0] || 'U').toUpperCase()}</span>
                          )}
                        </div>
                        <div className="flex flex-col overflow-hidden text-left">
                          <span className="text-xs font-medium text-white truncate">{displayName}</span>
                          <span className="text-[10px] text-zinc-500 font-mono truncate">{c.user?.email}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <select
                          value={c.role || 'MEMBER'}
                          onChange={(e) => handleChangeRole(c.user.id, e.target.value as 'MEMBER' | 'VIEWER')}
                          className="bg-[#181818] text-[11px] text-zinc-300 border border-white/10 rounded-none px-2 py-1 outline-none cursor-pointer focus:border-white/30 transition-colors"
                          title="Alterar papel do colaborador"
                        >
                          <option value="MEMBER">Membro (Edição)</option>
                          <option value="VIEWER">Visualizador (Leitura)</option>
                        </select>

                        <button
                          type="button"
                          onClick={() => handleRemoveCollaborator(c.user.id)}
                          disabled={isRemovingThis}
                          title="Remover colaborador"
                          className="w-7 h-7 flex items-center justify-center rounded-none text-zinc-500 hover:text-red-400 hover:bg-white/5 transition-colors cursor-pointer shrink-0 disabled:opacity-50"
                        >
                          {isRemovingThis ? (
                            <div className="w-3.5 h-3.5 border-2 border-zinc-500 border-t-red-400 rounded-full animate-spin" />
                          ) : (
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <line x1="18" y1="6" x2="6" y2="18" />
                              <line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                          )}
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-[#141414] border-t border-white/10 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="h-8 px-4 text-xs font-semibold rounded-none bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 hover:text-white transition-colors cursor-pointer"
          >
            Concluído
          </button>
        </div>
      </div>
    </div>
  );
}
