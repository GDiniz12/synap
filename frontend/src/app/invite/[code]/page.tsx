'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import Link from 'next/link';
import SynapLogo from '@/components/SynapLogo';
import WorkspaceIcon from '@/components/WorkspaceIcon';

interface WorkspacePreview {
  id: string;
  nome: string;
  icone: string | null;
  owner: {
    id: string;
    name: string | null;
    username: string | null;
    avatarUrl: string | null;
  };
  collaboratorCount: number;
  isMember: boolean;
  isOwner: boolean;
}

export default function InvitePage() {
  const params = useParams();
  const code = params?.code as string;
  const router = useRouter();

  const [preview, setPreview] = useState<WorkspacePreview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    setIsLoggedIn(!!token);

    if (code) {
      try {
        localStorage.setItem('pending_invite_code', code);
        sessionStorage.setItem('pending_invite_code', code);
      } catch {}

      loadPreview();
    }
  }, [code]);

  const loadPreview = async () => {
    setIsLoading(true);
    setError('');
    try {
      const data = await api(`/workspaces/join-preview/${code}`);
      setPreview(data);
    } catch (err: any) {
      console.error('Erro ao carregar prévia do convite:', err);
      setError(err.message || 'Este convite é inválido ou expirou.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!isLoggedIn) {
      router.push(`/login?inviteCode=${code}`);
      return;
    }

    setIsJoining(true);
    setError('');
    try {
      const result = await api(`/workspaces/join/${code}`, {
        method: 'POST',
      });
      localStorage.removeItem('pending_invite_code');
      sessionStorage.removeItem('pending_invite_code');

      router.push(`/workspaces/${result.id}`);
    } catch (err: any) {
      console.error('Erro ao ingressar no workspace:', err);
      setError(err.message || 'Não foi possível aceitar o convite. Tente novamente.');
      setIsJoining(false);
    }
  };

  return (
    <div className="h-full w-full min-h-screen bg-[#1e1f22] overflow-y-auto overflow-x-hidden selection:bg-[#20b8cd] selection:text-white relative font-sans flex flex-col items-center justify-center p-4">
      {/* Subtle Brand Ambient Lighting */}
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[450px] h-[450px] bg-[#20b8cd]/10 blur-[130px] rounded-full pointer-events-none -z-10" />

      <div className="w-full max-w-[420px] bg-[#2b2d31] border border-[#383a40] rounded-xl shadow-2xl p-6 sm:p-7 flex flex-col items-center text-center animate-smooth-pop relative">
        {/* Logo */}
        <Link
          href="/"
          className="inline-flex items-center justify-center transition-transform hover:scale-105 mb-4"
          title="Synap"
        >
          <SynapLogo size={46} priority />
        </Link>

        {isLoading ? (
          <div className="py-12 flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-[#383a40] border-t-[#20b8cd] rounded-full animate-spin" />
            <span className="text-xs text-[#949ba4] font-medium">Verificando convite...</span>
          </div>
        ) : error ? (
          <div className="py-6 flex flex-col items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-[#f23f43]/10 border border-[#f23f43]/30 flex items-center justify-center text-[#f23f43]">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">Convite Indisponível</h2>
              <p className="text-xs text-[#949ba4] mt-1.5 max-w-[280px]">
                {error}
              </p>
            </div>
            <Link
              href="/dashboard"
              className="mt-2 h-9 px-4 text-xs font-semibold rounded-[4px] bg-[#313338] hover:bg-[#383a40] border border-[#383a40] text-white inline-flex items-center justify-center transition-colors"
            >
              Ir para meus workspaces
            </Link>
          </div>
        ) : preview ? (
          <div className="w-full flex flex-col items-center">
            {/* Workspace Avatar */}
            <div className="w-16 h-16 rounded-2xl bg-[#1e1f22] border-2 border-[#383a40] flex items-center justify-center text-xl font-bold text-white mb-3 shadow-inner overflow-hidden">
              <WorkspaceIcon
                icone={preview.icone}
                nome={preview.nome}
                size={36}
                className="w-full h-full"
                emojiClassName="text-2xl"
                fallbackClassName="text-base"
              />
            </div>

            {/* Title and details */}
            <span className="text-[11px] font-mono uppercase tracking-wider text-[#20b8cd] font-semibold">
              Convite para Workspace
            </span>
            <h1 className="text-lg font-bold text-white tracking-tight mt-1 mb-1 truncate max-w-[320px]">
              {preview.nome}
            </h1>

            {preview.owner && (
              <p className="text-xs text-[#949ba4] mb-5">
                Criado por{' '}
                <span className="text-white font-medium">
                  {preview.owner.name || (preview.owner.username ? `@${preview.owner.username}` : 'Usuário')}
                </span>
                {preview.collaboratorCount > 0 && (
                  <span className="text-[#80848e]"> • {preview.collaboratorCount} {preview.collaboratorCount === 1 ? 'colaborador' : 'colaboradores'}</span>
                )}
              </p>
            )}

            {/* Action block */}
            {isLoggedIn ? (
              <div className="w-full flex flex-col gap-2.5">
                {preview.isMember ? (
                  <>
                    <div className="p-3 bg-[#23a55a]/10 border border-[#23a55a]/30 rounded-lg text-xs text-[#23a55a] font-medium">
                      Você já tem acesso a este workspace.
                    </div>
                    <button
                      onClick={() => router.push(`/workspaces/${preview.id}`)}
                      className="w-full h-10 bg-[#20b8cd] hover:bg-[#1ba2b4] text-white font-semibold text-xs rounded-[4px] shadow-sm transition-colors cursor-pointer"
                    >
                      Acessar Workspace
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={handleJoin}
                      disabled={isJoining}
                      className="w-full h-10 bg-[#20b8cd] hover:bg-[#1ba2b4] text-white font-semibold text-xs rounded-[4px] shadow-sm transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {isJoining ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          <span>Entrando...</span>
                        </>
                      ) : (
                        <span>Entrar no Workspace</span>
                      )}
                    </button>
                  </>
                )}
              </div>
            ) : (
              <div className="w-full flex flex-col gap-2.5">
                <p className="text-xs text-[#949ba4] mb-2">
                  Faça login ou crie uma conta para aceitar o convite e colaborar em tempo real.
                </p>

                <Link
                  href={`/login?inviteCode=${code}`}
                  className="w-full h-10 bg-[#20b8cd] hover:bg-[#1ba2b4] text-white font-semibold text-xs rounded-[4px] shadow-sm transition-colors flex items-center justify-center"
                >
                  Entrar com conta existente
                </Link>

                <Link
                  href={`/register?inviteCode=${code}`}
                  className="w-full h-10 bg-[#313338] hover:bg-[#383a40] border border-[#383a40] text-white font-semibold text-xs rounded-[4px] transition-colors flex items-center justify-center"
                >
                  Criar uma nova conta
                </Link>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
