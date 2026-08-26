'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import Link from 'next/link';
import Image from 'next/image';
import SettingsModal from '@/components/SettingsModal';
import LogoutConfirmModal from '@/components/LogoutConfirmModal';
import LoadingScreen from '@/components/LoadingScreen';

export default function DashboardPage() {
  const [workspaces, setWorkspaces] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [isCollaborative, setIsCollaborative] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const loadInitialData = async () => {
    setIsLoading(true);
    setError('');
    try {
      const [userData, workspacesData] = await Promise.all([
        api('/auth/me'),
        api('/workspaces'),
      ]);
      setCurrentUser(userData);
      setWorkspaces(workspacesData || []);
    } catch (err: any) {
      console.error('Failed to load initial dashboard data', err);
      setError(err.message);
      if (
        err.message === 'Token is invalid' ||
        err.message === 'Token is missing' ||
        err.message === 'User no longer exists'
      ) {
        localStorage.removeItem('token');
        router.push('/login');
        return;
      }
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

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadWorkspaces = async () => {
    try {
      const data = await api('/workspaces');
      setWorkspaces(data || []);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWorkspaceName) return;

    try {
      await api('/workspaces', {
        method: 'POST',
        body: JSON.stringify({ nome: newWorkspaceName, isCollaborative }),
      });
      setNewWorkspaceName('');
      loadWorkspaces();
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (isLoading) {
    return <LoadingScreen onRetry={loadInitialData} />;
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--accents-1)' }}>
      {/* Vercel-like header */}
      <header style={{ borderBottom: '1px solid var(--accents-2)', background: 'var(--background)' }}>
        <div className="geist-container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '64px' }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <Image 
              src="/synap-logo-symbol-name.png" 
              alt="Synap Logo" 
              width={200} 
              height={56} 
              style={{ objectFit: 'contain', height: '40px', width: 'auto' }}
              className="dark:invert-0 invert"
              priority
            />
          </div>

          {/* User Profile Area with Hover / Click Dropdown Menu */}
          {currentUser && (
            <div
              ref={dropdownRef}
              style={{ position: 'relative' }}
              onMouseEnter={() => setIsDropdownOpen(true)}
              onMouseLeave={() => setIsDropdownOpen(false)}
            >
              <button
                type="button"
                onClick={() => setIsDropdownOpen((prev) => !prev)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '6px 12px',
                  background: isDropdownOpen ? 'var(--accents-2)' : 'var(--accents-1)',
                  border: '1px solid var(--accents-2)',
                  borderRadius: '24px',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <div style={{ width: 26, height: 26, background: 'var(--foreground)', color: 'var(--background)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 600, flexShrink: 0 }}>
                  {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : currentUser.email.charAt(0).toUpperCase()}
                </div>
                <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--foreground)' }}>
                  {currentUser.name || 'User'}
                </span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.6, transform: isDropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s ease' }}>
                  <path d="m6 9 6 6 6-6"/>
                </svg>
              </button>

              {/* Floating Dropdown Menu */}
              {isDropdownOpen && (
                <div
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 4px)',
                    right: 0,
                    width: '220px',
                    background: 'var(--background)',
                    border: '1px solid var(--accents-2)',
                    borderRadius: '8px',
                    boxShadow: '0 12px 30px rgba(0, 0, 0, 0.25)',
                    padding: '6px',
                    zIndex: 100,
                  }}
                  className="animate-in fade-in zoom-in-95 duration-100"
                >
                  <div style={{ padding: '8px 10px', borderBottom: '1px solid var(--accents-2)', marginBottom: '4px' }}>
                    <p style={{ margin: 0, fontSize: '12px', fontWeight: 600, color: 'var(--foreground)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {currentUser.name || 'Usuário'}
                    </p>
                    <p style={{ margin: 0, fontSize: '11px', color: 'var(--accents-5)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {currentUser.email}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setIsDropdownOpen(false);
                      setIsSettingsOpen(true);
                    }}
                    className="hover:bg-[var(--accents-2)]"
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 10px',
                      border: 'none',
                      background: 'transparent',
                      borderRadius: '6px',
                      fontSize: '12.5px',
                      fontWeight: 500,
                      color: 'var(--foreground)',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="3"/>
                      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                    </svg>
                    <span>Configurações</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsDropdownOpen(false);
                      setIsLogoutConfirmOpen(true);
                    }}
                    className="hover:bg-[rgba(238,0,0,0.1)]"
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 10px',
                      border: 'none',
                      background: 'transparent',
                      borderRadius: '6px',
                      fontSize: '12.5px',
                      fontWeight: 500,
                      color: 'var(--error)',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                      <polyline points="16 17 21 12 16 7"/>
                      <line x1="21" y1="12" x2="9" y2="12"/>
                    </svg>
                    <span>Sair da Conta</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </header>

      <main className="geist-container" style={{ padding: '24px 16pt 48px' }}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <h1 style={{ fontSize: '28px', fontWeight: 700, letterSpacing: '-0.04em', margin: 0 }}>Workspaces</h1>
          
          <form onSubmit={handleCreateWorkspace} className="flex flex-col gap-2 w-full md:w-auto">
            <div className="flex gap-2">
              <input 
                type="text" 
                placeholder="Nome da workspace..." 
                value={newWorkspaceName}
                onChange={(e) => setNewWorkspaceName(e.target.value)}
                className="geist-input flex-1 md:w-[240px]"
              />
              <button type="submit" className="geist-button shrink-0">Criar</button>
            </div>
            <label className="flex items-center gap-2 text-xs text-[var(--accents-5)]">
              <input 
                type="checkbox" 
                checked={isCollaborative} 
                onChange={(e) => setIsCollaborative(e.target.checked)}
              />
              Workspace Colaborativa (WebSockets)
            </label>
          </form>
        </div>

        {error && <p style={{ color: 'var(--error)', marginBottom: '24px' }}>{error}</p>}
        
        {workspaces.length === 0 ? (
          <div className="geist-card" style={{ padding: '48px', textAlign: 'center' }}>
            <h3 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '8px' }}>No workspaces found</h3>
            <p className="geist-text-secondary" style={{ marginBottom: '24px' }}>Create a workspace to start organizing your notes and folders.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
            {workspaces.map((workspace) => (
              <Link key={workspace.id} href={`/workspaces/${workspace.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                <div className="geist-card" style={{ padding: '24px', height: '100%', display: 'flex', flexDirection: 'column', cursor: 'pointer' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 600, margin: '0 0 8px 0' }}>{workspace.nome}</h3>
                  <div className="geist-text-secondary" style={{ fontSize: '14px', marginTop: 'auto' }}>
                    Created {new Date(workspace.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>

      {/* Global Settings Modal */}
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
    </div>
  );
}
