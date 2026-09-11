'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import Link from 'next/link';
import WorkspaceRail from '@/components/WorkspaceRail';
import CreateWorkspaceModal from '@/components/CreateWorkspaceModal';
import SettingsModal from '@/components/SettingsModal';
import LogoutConfirmModal from '@/components/LogoutConfirmModal';
import LoadingScreen from '@/components/LoadingScreen';
import SynapLogo from '@/components/SynapLogo';
import WorkspaceIcon from '@/components/WorkspaceIcon';
import ToastContainer, { ToastMessage } from '@/components/Toast';

export default function DashboardPage() {
  const [workspaces, setWorkspaces] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const router = useRouter();

  const showToast = (message: string, type: 'error' | 'success' | 'info' = 'error') => {
    const toastId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    setToasts((prev) => [...prev, { id: toastId, message, type }]);
  };

  const dismissToast = (toastId: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== toastId));
  };

  const loadInitialData = async () => {
    setIsLoading(true);
    setError('');
    try {
      const [userData, workspacesData] = await Promise.all([
        api('/auth/me'),
        api('/workspaces'),
      ]);
      setCurrentUser(userData);
      const wsList = workspacesData || [];
      setWorkspaces(wsList);
    } catch (err: any) {
      console.error('Failed to load initial dashboard data', err);
      if (
        err.message === 'Token is invalid' ||
        err.message === 'Token is missing' ||
        err.message === 'User no longer exists'
      ) {
        localStorage.removeItem('token');
        router.push('/login');
        return;
      }
      setError('Não foi possível carregar as informações do dashboard.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }
    loadInitialData();
  }, [router]);

  const handleWorkspaceCreated = (newWs: any) => {
    setWorkspaces((prev) => [...prev, newWs]);
    router.push(`/workspaces/${newWs.id}`);
  };

  if (isLoading) {
    return <LoadingScreen onRetry={loadInitialData} />;
  }

  return (
    <div className="flex flex-row h-screen w-screen overflow-hidden bg-[var(--background)]">
      {/* 1. LEFT DISCORD WORKSPACE RAIL */}
      <WorkspaceRail
        workspaces={workspaces}
        isHomeActive={true}
        currentUser={currentUser}
        isSidebarOpen={false}
        onSelectWorkspace={(wsId) => router.push(`/workspaces/${wsId}`)}
        onOpenCreateModal={() => setIsCreateModalOpen(true)}
        onOpenSettingsModal={() => setIsSettingsOpen(true)}
        onGoHome={() => {}}
      />

      {/* 2. MAIN DASHBOARD CONTENT AREA */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-[var(--background)]">
        {/* Top Minimal Discord Header */}
        <header className="h-12 min-h-[48px] px-6 border-b border-[var(--accents-2)] bg-[var(--background)] flex items-center justify-between z-10 shrink-0 select-none">
          <div className="flex items-center gap-3">
            <SynapLogo size={26} priority />
            <div className="w-[1px] h-4 bg-[var(--accents-2)]" />
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--accents-5)] font-mono">
              PAINEL DE CONTROLE
            </span>
          </div>

          <div className="flex items-center gap-3">
            {currentUser && (
              <div
                onClick={() => setIsSettingsOpen(true)}
                className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-[var(--accents-1)] transition-colors cursor-pointer"
                title="Configurações de Usuário"
              >
                <div className="w-6 h-6 rounded-full bg-[var(--brand)] text-white font-bold text-xs flex items-center justify-center overflow-hidden border border-[var(--accents-2)]">
                  {currentUser.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={currentUser.avatarUrl}
                      alt={currentUser.username || currentUser.name || 'User'}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span>{currentUser.username?.[0]?.toUpperCase() || currentUser.name?.[0]?.toUpperCase() || currentUser.email?.[0]?.toUpperCase() || 'U'}</span>
                  )}
                </div>
                <span className="text-xs font-semibold text-[var(--foreground)] hidden sm:inline">
                  {currentUser.username ? `@${currentUser.username}` : (currentUser.name || currentUser.email)}
                </span>
              </div>
            )}
          </div>
        </header>

        {/* Scrollable Dashboard Body */}
        <main className="flex-1 overflow-y-auto p-6 md:p-10 max-w-6xl w-full mx-auto flex flex-col gap-8">
          {/* Welcome Banner */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-[var(--accents-1)] via-[var(--accents-2)]/30 to-transparent border border-[var(--accents-2)]">
            <div className="flex flex-col gap-1.5">
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-[var(--foreground)]">
                Olá, {currentUser?.name?.split(' ')[0] || 'Usuário'}
              </h1>
              <p className="text-xs md:text-sm text-[var(--accents-5)]">
                Selecione um workspace na barra à esquerda ou crie um novo espaço de trabalho.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsCreateModalOpen(true)}
              className="geist-button h-10 px-5 text-xs font-semibold flex items-center gap-2 self-start md:self-auto shadow-md"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              <span>Novo Workspace</span>
            </button>
          </div>

          {error && (
            <div className="p-3 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg">
              {error}
            </div>
          )}

          {/* Workspaces Section */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-[var(--accents-2)] pb-2">
              <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--accents-4)] font-mono">
                SEUS WORKSPACES ({workspaces.length})
              </h2>
            </div>

            {workspaces.length === 0 ? (
              <div className="p-12 text-center rounded-xl border border-dashed border-[var(--accents-2)] bg-[var(--accents-1)]/30 flex flex-col items-center gap-3">
                <SynapLogo size={40} className="opacity-40 mb-1" />
                <h3 className="text-sm font-semibold text-[var(--foreground)]">Nenhum workspace encontrado</h3>
                <p className="text-xs text-[var(--accents-5)] max-w-sm">
                  Crie seu primeiro espaço de anotações, desenhos, grafos e flashcards.
                </p>
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(true)}
                  className="geist-button text-xs h-9 px-4 mt-2"
                >
                  Criar Primeiro Workspace
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {workspaces.map((ws) => (
                  <Link
                    key={ws.id}
                    href={`/workspaces/${ws.id}`}
                    className="group p-4 rounded-xl border border-[var(--accents-2)] bg-[var(--background)] hover:border-[var(--brand)] hover:shadow-lg transition-all duration-200 flex items-center justify-between text-decoration-none"
                  >
                    <div className="flex items-center gap-3.5 overflow-hidden">
                      {/* Avatar */}
                      <div className="w-12 h-12 rounded-[16px] bg-[var(--accents-2)] text-[var(--foreground)] group-hover:bg-[var(--brand)] group-hover:text-white transition-colors flex items-center justify-center font-bold text-sm overflow-hidden shrink-0">
                        <WorkspaceIcon
                          icone={ws.icone}
                          nome={ws.nome}
                          size={24}
                          className="w-full h-full"
                          emojiClassName="text-xl"
                          fallbackClassName="text-sm"
                        />
                      </div>

                      <div className="flex flex-col overflow-hidden">
                        <span className="text-sm font-semibold text-[var(--foreground)] truncate">
                          {ws.nome}
                        </span>
                        <span className="text-[11px] text-[var(--accents-5)] font-mono">
                          {ws.isCollaborative ? 'Colaborativo' : 'Pessoal'}
                        </span>
                      </div>
                    </div>

                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className="text-[var(--accents-4)] group-hover:text-[var(--brand)] group-hover:translate-x-1 transition-all shrink-0"
                    >
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Create Workspace Modal */}
      <CreateWorkspaceModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onWorkspaceCreated={handleWorkspaceCreated}
        showToast={showToast}
      />

      {/* Settings Modal */}
      {isSettingsOpen && (
        <SettingsModal
          currentUser={currentUser}
          workspace={null}
          notas={[]}
          onUpdateUser={(updated) => setCurrentUser(updated)}
          onClose={() => setIsSettingsOpen(false)}
        />
      )}

      {/* Logout Confirmation Modal */}
      {isLogoutConfirmOpen && (
        <LogoutConfirmModal
          onConfirm={() => {
            setIsLogoutConfirmOpen(false);
            localStorage.removeItem('token');
            router.push('/login');
          }}
          onClose={() => setIsLogoutConfirmOpen(false)}
        />
      )}

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
