'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { translations, Language } from '@/lib/i18n';

interface SettingsModalProps {
  currentUser: any;
  workspace: any;
  notas: any[];
  onUpdateUser: (user: any) => void;
  onClose: () => void;
}

export type SettingsTab = 'account' | 'general' | 'appearance' | 'editor' | 'shortcuts' | 'backup' | 'danger';

export default function SettingsModal({
  currentUser,
  workspace,
  notas,
  onUpdateUser,
  onClose,
}: SettingsModalProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<SettingsTab>('account');

  // Language State
  const [currentLang, setCurrentLang] = useState<Language>('pt-BR');
  const t = (key: keyof typeof translations['pt-BR']) => translations[currentLang][key] || key;

  useEffect(() => {
    const saved = (localStorage.getItem('synap_language') as Language) || 'pt-BR';
    setCurrentLang(saved);
  }, []);

  // Account State
  const [nome, setNome] = useState(currentUser?.name || currentUser?.nome || '');
  const [email, setEmail] = useState(currentUser?.email || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [accountMsg, setAccountMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [savingAccount, setSavingAccount] = useState(false);

  // General State (Stored in localStorage)
  const [language, setLanguage] = useState('pt-BR');
  const [startupBehavior, setStartupBehavior] = useState('last_note');

  // Appearance State
  const [theme, setTheme] = useState('dark');
  const [fontSize, setFontSize] = useState('15px');
  const [fontFamily, setFontFamily] = useState('Geist Sans');

  // Editor State
  const [editorWidth, setEditorWidth] = useState('800px');
  const [slashMenuEnabled, setSlashMenuEnabled] = useState(true);
  const [wikilinksEnabled, setWikilinksEnabled] = useState(true);
  const [codeTheme, setCodeTheme] = useState('vscode-dark');

  // Shortcut search filter
  const [shortcutSearch, setShortcutSearch] = useState('');

  // Backup & export status
  const [exporting, setExporting] = useState(false);

  // Danger Zone: Workspaces list & Delete confirmation
  const [allWorkspaces, setAllWorkspaces] = useState<any[]>([]);
  const [loadingWorkspaces, setLoadingWorkspaces] = useState(false);
  const [deletingWorkspaceId, setDeletingWorkspaceId] = useState<string | null>(null);
  const [workspaceToDelete, setWorkspaceToDelete] = useState<any | null>(null);
  const [dangerMsg, setDangerMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Load local settings on mount
  useEffect(() => {
    try {
      const savedLang = localStorage.getItem('synap_language') || 'pt-BR';
      const savedStartup = localStorage.getItem('synap_startup_behavior') || 'last_note';
      const savedTheme = localStorage.getItem('synap_theme') || 'dark';
      const savedFontSize = localStorage.getItem('synap_font_size') || '15px';
      const savedFontFamily = localStorage.getItem('synap_font_family') || 'Geist Sans';
      const savedEditorWidth = localStorage.getItem('synap_editor_width') || '800px';
      const savedSlash = localStorage.getItem('synap_slash_menu') !== 'false';
      const savedWiki = localStorage.getItem('synap_wikilinks') !== 'false';
      const savedCodeTheme = localStorage.getItem('synap_code_theme') || 'vscode-dark';

      setLanguage(savedLang);
      setStartupBehavior(savedStartup);
      setTheme(savedTheme);
      setFontSize(savedFontSize);
      setFontFamily(savedFontFamily);
      setEditorWidth(savedEditorWidth);
      setSlashMenuEnabled(savedSlash);
      setWikilinksEnabled(savedWiki);
      setCodeTheme(savedCodeTheme);
    } catch {}
  }, []);

  // Fetch workspaces when Danger Zone tab is opened
  useEffect(() => {
    if (activeTab === 'danger') {
      setLoadingWorkspaces(true);
      setDangerMsg(null);
      api('/workspaces')
        .then((data) => {
          if (Array.isArray(data)) setAllWorkspaces(data);
        })
        .catch((err) => console.error('Erro ao carregar workspaces', err))
        .finally(() => setLoadingWorkspaces(false));
    }
  }, [activeTab]);

  const handleSaveGeneral = (key: string, value: any) => {
    try {
      localStorage.setItem(`synap_${key}`, value);
    } catch {}
  };

  const handleUpdateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingAccount(true);
    setAccountMsg(null);

    try {
      const body: any = { name: nome, email };
      if (newPassword) {
        body.password = newPassword;
      }

      const updated = await api('/auth/me', {
        method: 'PUT',
        body: JSON.stringify(body),
      });

      onUpdateUser(updated);
      setAccountMsg({ type: 'success', text: t('profile_updated') });
      setCurrentPassword('');
      setNewPassword('');
    } catch (err: any) {
      setAccountMsg({ type: 'error', text: err.message || 'Erro ao atualizar conta.' });
    } finally {
      setSavingAccount(false);
    }
  };

  const handleDeleteWorkspace = async (targetWs: any) => {
    setDeletingWorkspaceId(targetWs.id);
    setDangerMsg(null);

    try {
      await api(`/workspaces/${targetWs.id}`, {
        method: 'DELETE',
      });

      setAllWorkspaces((prev) => prev.filter((w) => w.id !== targetWs.id));
      setWorkspaceToDelete(null);
      setDangerMsg({ type: 'success', text: t('workspace_deleted_success') });

      // If user deleted the workspace they are currently inside, redirect to dashboard
      if (targetWs.id === workspace?.id) {
        setTimeout(() => {
          onClose();
          router.push('/dashboard');
        }, 800);
      }
    } catch (err: any) {
      setDangerMsg({ type: 'error', text: err.message || 'Erro ao excluir workspace.' });
    } finally {
      setDeletingWorkspaceId(null);
    }
  };

  const handleExportMarkdown = () => {
    setExporting(true);
    try {
      notas.forEach((nota, index) => {
        setTimeout(() => {
          const content = nota.conteudo ? nota.conteudo.replace(/<[^>]*>?/gm, '\n') : '';
          const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `${nota.titulo || 'nota'}.md`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
        }, index * 200);
      });
    } catch (err) {
      console.error('Erro ao exportar notas', err);
    } finally {
      setTimeout(() => setExporting(false), notas.length * 200 + 500);
    }
  };

  const shortcutsList = [
    { key: 'Ctrl + D', desc: 'Abrir ou recolher a barra lateral (Sidebar)', category: 'Navegação' },
    { key: 'Ctrl + J', desc: 'Abrir ou recolher o Terminal integrado', category: 'Navegação' },
    { key: 'Ctrl + N', desc: 'Criar uma nova nota de texto imediatamente', category: 'Criação' },
    { key: 'Ctrl + G', desc: 'Abrir ou fechar a visualização do Grafo de Conexões', category: 'Navegação' },
    { key: 'Ctrl + 1..9', desc: 'Navegar diretamente entre as abas abertas no topo', category: 'Navegação' },
    { key: 'Ctrl + B', desc: 'Formatar texto selecionado como Negrito', category: 'Editor' },
    { key: 'Ctrl + I', desc: 'Formatar texto selecionado como Itálico', category: 'Editor' },
    { key: 'Ctrl + U', desc: 'Formatar texto selecionado como Sublinhado', category: 'Editor' },
    { key: 'Ctrl + K', desc: 'Inserir link externo no texto', category: 'Editor' },
    { key: '/', desc: 'Abrir menu suspenso de comandos e blocos rápidos', category: 'Editor' },
    { key: '[[', desc: 'Criar ou vincular Wikilink a outra nota do workspace', category: 'Editor' },
    { key: '::', desc: 'Criar ou conectar um Flashcard direto na frase', category: 'Editor' },
    { key: 'V / 1', desc: 'Ferramenta de Seleção / Mover (Canvas)', category: 'Desenho' },
    { key: 'H / Espaço', desc: 'Ferramenta Mão (Arrastar tela no Canvas)', category: 'Desenho' },
    { key: 'P / 2', desc: 'Ferramenta Caneta / Traço livre (Canvas)', category: 'Desenho' },
    { key: 'R / 3', desc: 'Ferramenta Retângulo (Canvas)', category: 'Desenho' },
    { key: 'O / 4', desc: 'Ferramenta Elipse / Círculo (Canvas)', category: 'Desenho' },
    { key: 'A / 5', desc: 'Ferramenta Seta conectora (Canvas)', category: 'Desenho' },
    { key: 'L / 6', desc: 'Ferramenta Linha reta (Canvas)', category: 'Desenho' },
    { key: 'T / 7', desc: 'Ferramenta Texto no Canvas', category: 'Desenho' },
    { key: 'E / 8', desc: 'Ferramenta Borracha (Canvas)', category: 'Desenho' },
    { key: 'Del / Backspace', desc: 'Excluir elementos selecionados no Canvas', category: 'Desenho' },
  ];

  const filteredShortcuts = shortcutsList.filter(
    (s) =>
      s.key.toLowerCase().includes(shortcutSearch.toLowerCase()) ||
      s.desc.toLowerCase().includes(shortcutSearch.toLowerCase()) ||
      s.category.toLowerCase().includes(shortcutSearch.toLowerCase())
  );

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 2000,
        background: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        userSelect: 'none',
      }}
      onClick={onClose}
    >
      <div
        className="mobile-fullscreen-dialog md:max-w-[860px] md:h-[620px] h-[95vh] w-full animate-smooth-pop"
        style={{
          background: 'var(--background)',
          border: '1px solid var(--accents-2)',
          borderRadius: '12px',
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.4)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col md:flex-row h-full w-full overflow-hidden">
          {/* Left / Top Navigation Bar */}
          <div
            className="w-full md:w-[210px] bg-[var(--accents-1)] border-b md:border-b-0 md:border-r border-[var(--accents-2)] flex flex-col justify-between p-3 md:p-4 shrink-0"
          >
            <div>
              <div className="flex items-center justify-between md:justify-start gap-2 pb-2 md:pb-4">
                <div className="flex items-center gap-2">
                  <div className="w-[22px] h-[22px] rounded-[5px] bg-[var(--foreground)] flex items-center justify-center">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--background)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="3"/>
                      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                    </svg>
                  </div>
                  <span className="text-[13px] font-semibold text-[var(--foreground)] tracking-tight">
                    {t('settings_title')}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={onClose}
                  className="md:hidden geist-button-secondary w-7 h-7 flex items-center justify-center p-0 rounded"
                >
                  ✕
                </button>
              </div>

              <nav className="flex flex-row md:flex-col gap-1 overflow-x-auto no-scrollbar py-1">
              {[
                {
                  id: 'account',
                  label: t('tab_account'),
                  icon: (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                      <circle cx="12" cy="7" r="4"/>
                    </svg>
                  ),
                },
                {
                  id: 'general',
                  label: t('tab_general'),
                  icon: (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"/>
                      <line x1="2" y1="12" x2="22" y2="12"/>
                      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
                    </svg>
                  ),
                },
                {
                  id: 'appearance',
                  label: t('tab_appearance'),
                  icon: (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="4"/>
                      <path d="M12 2v2"/>
                      <path d="M12 20v2"/>
                      <path d="m4.93 4.93 1.41 1.41"/>
                      <path d="m17.66 17.66 1.41 1.41"/>
                      <path d="M2 12h2"/>
                      <path d="M20 12h2"/>
                      <path d="m6.34 17.66-1.41 1.41"/>
                      <path d="m19.07 4.93-1.41 1.41"/>
                    </svg>
                  ),
                },
                {
                  id: 'editor',
                  label: t('tab_editor'),
                  icon: (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
                    </svg>
                  ),
                },
                {
                  id: 'shortcuts',
                  label: t('tab_shortcuts'),
                  icon: (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect width="20" height="14" x="2" y="5" rx="2"/>
                      <line x1="6" y1="10" x2="6" y2="10"/>
                      <line x1="10" y1="10" x2="10" y2="10"/>
                      <line x1="14" y1="10" x2="14" y2="10"/>
                      <line x1="18" y1="10" x2="18" y2="10"/>
                      <line x1="7" y1="15" x2="17" y2="15"/>
                    </svg>
                  ),
                },
                {
                  id: 'backup',
                  label: t('tab_backup'),
                  icon: (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                      <polyline points="7 10 12 15 17 10"/>
                      <line x1="12" y1="15" x2="12" y2="3"/>
                    </svg>
                  ),
                },
                {
                  id: 'danger',
                  label: t('tab_danger'),
                  isDanger: true,
                  icon: (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                      <line x1="12" y1="9" x2="12" y2="13"/>
                      <line x1="12" y1="17" x2="12.01" y2="17"/>
                    </svg>
                  ),
                },
              ].map((item) => {
                const isActive = activeTab === item.id;
                const isDanger = item.isDanger;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveTab(item.id as SettingsTab)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      fontSize: '12.5px',
                      fontWeight: isActive ? 600 : 500,
                      background: isActive
                        ? isDanger
                          ? 'rgba(238, 0, 0, 0.1)'
                          : 'var(--background)'
                        : 'transparent',
                      color: isDanger
                        ? isActive
                          ? 'var(--error)'
                          : 'rgba(238, 0, 0, 0.8)'
                        : isActive
                        ? 'var(--foreground)'
                        : 'var(--accents-5)',
                      border: isActive
                        ? isDanger
                          ? '1px solid rgba(238, 0, 0, 0.3)'
                          : '1px solid var(--accents-2)'
                        : '1px solid transparent',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          <div style={{ padding: '8px', fontSize: '11px', color: 'var(--accents-4)', borderTop: '1px solid var(--accents-2)' }}>
            Synap v1.0.0 • Pro
          </div>
        </div>

        {/* Right Content Panel */}
        <div className="flex-1 p-4 md:p-8 overflow-y-auto flex flex-col">
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', paddingBottom: '14px', borderBottom: '1px solid var(--accents-2)' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '17px', fontWeight: 600, color: activeTab === 'danger' ? 'var(--error)' : 'var(--foreground)' }}>
                {activeTab === 'account' && t('tab_account')}
                {activeTab === 'general' && t('tab_general')}
                {activeTab === 'appearance' && t('tab_appearance')}
                {activeTab === 'editor' && t('tab_editor')}
                {activeTab === 'shortcuts' && t('tab_shortcuts')}
                {activeTab === 'backup' && t('tab_backup')}
                {activeTab === 'danger' && t('tab_danger')}
              </h2>
              <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--accents-5)' }}>
                {activeTab === 'account' && t('desc_account')}
                {activeTab === 'general' && t('desc_general')}
                {activeTab === 'appearance' && t('desc_appearance')}
                {activeTab === 'editor' && t('desc_editor')}
                {activeTab === 'shortcuts' && t('desc_shortcuts')}
                {activeTab === 'backup' && t('desc_backup')}
                {activeTab === 'danger' && t('desc_danger')}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="hidden md:flex geist-button-secondary w-7 h-7 items-center justify-center p-0 rounded cursor-pointer"
            >
              ✕
            </button>
          </div>

          {/* 1. Account Settings */}
          {activeTab === 'account' && (
            <form onSubmit={handleUpdateAccount} style={{ display: 'flex', flexDirection: 'column', gap: '18px', maxWidth: '420px' }}>
              {accountMsg && (
                <div
                  style={{
                    padding: '8px 12px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    background: accountMsg.type === 'success' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(238, 0, 0, 0.1)',
                    color: accountMsg.type === 'success' ? '#22c55e' : 'var(--error)',
                    border: `1px solid ${accountMsg.type === 'success' ? 'rgba(34, 197, 94, 0.3)' : 'rgba(238, 0, 0, 0.3)'}`,
                  }}
                >
                  {accountMsg.text}
                </div>
              )}

              <div>
                <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--accents-6)', display: 'block', marginBottom: '6px' }}>
                  {t('full_name')}
                </label>
                <input
                  type="text"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  className="geist-input"
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--accents-6)', display: 'block', marginBottom: '6px' }}>
                  {t('email')}
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="geist-input"
                  required
                />
              </div>

              <div style={{ paddingTop: '12px', borderTop: '1px solid var(--accents-2)' }}>
                <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--accents-6)', display: 'block', marginBottom: '6px' }}>
                  {t('new_password')}
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder={t('new_password_placeholder')}
                  className="geist-input"
                />
              </div>

              <button
                type="submit"
                disabled={savingAccount}
                className="geist-button"
                style={{ width: 'fit-content', marginTop: '6px' }}
              >
                {savingAccount ? t('saving_btn') : t('save_changes')}
              </button>
            </form>
          )}

          {/* 2. General Settings */}
          {activeTab === 'general' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '22px', maxWidth: '520px' }}>
              <div>
                <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--foreground)', display: 'block', marginBottom: '4px' }}>
                  {t('interface_language')}
                </label>
                <p style={{ fontSize: '12px', color: 'var(--accents-5)', margin: '0 0 8px' }}>
                  {t('interface_language_desc')}
                </p>
                <select
                  value={language}
                  onChange={(e) => {
                    const newLang = e.target.value;
                    setLanguage(newLang);
                    setCurrentLang(newLang as Language);
                    handleSaveGeneral('language', newLang);
                    window.dispatchEvent(new Event('synap_language_changed'));
                  }}
                  className="geist-input"
                  style={{ width: '260px' }}
                >
                  <option value="pt-BR">{t('lang_pt')}</option>
                  <option value="en-US">{t('lang_en')}</option>
                </select>
              </div>

              <div style={{ paddingTop: '16px', borderTop: '1px solid var(--accents-2)' }}>
                <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--foreground)', display: 'block', marginBottom: '4px' }}>
                  {t('on_open_workspace')}
                </label>
                <p style={{ fontSize: '12px', color: 'var(--accents-5)', margin: '0 0 8px' }}>
                  {t('on_open_workspace_desc')}
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--foreground)', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="startupBehavior"
                      value="last_note"
                      checked={startupBehavior === 'last_note'}
                      onChange={(e) => {
                        setStartupBehavior(e.target.value);
                        handleSaveGeneral('startup_behavior', e.target.value);
                      }}
                    />
                    {t('reopen_last_note')}
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--foreground)', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="startupBehavior"
                      value="empty"
                      checked={startupBehavior === 'empty'}
                      onChange={(e) => {
                        setStartupBehavior(e.target.value);
                        handleSaveGeneral('startup_behavior', e.target.value);
                      }}
                    />
                    {t('open_empty_screen')}
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* 3. Appearance Settings */}
          {activeTab === 'appearance' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '22px', maxWidth: '520px' }}>
              <div>
                <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--foreground)', display: 'block', marginBottom: '4px' }}>
                  Tema Visual
                </label>
                <p style={{ fontSize: '12px', color: 'var(--accents-5)', margin: '0 0 8px' }}>
                  Alterne entre modo escuro (Dark Vercel) ou modo claro.
                </p>
                <div style={{ display: 'flex', gap: '10px' }}>
                  {[
                    { id: 'dark', label: 'Dark Mode (Padrão)' },
                    { id: 'light', label: 'Light Mode (Em breve)', disabled: true },
                  ].map((tItem) => (
                    <button
                      key={tItem.id}
                      type="button"
                      disabled={tItem.disabled}
                      onClick={() => {
                        if (!tItem.disabled) {
                          setTheme(tItem.id);
                          handleSaveGeneral('theme', tItem.id);
                        }
                      }}
                      className={theme === tItem.id ? 'geist-button' : 'geist-button-secondary'}
                      style={{ fontSize: '12px', height: '32px', padding: '0 12px' }}
                    >
                      {tItem.label}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ paddingTop: '16px', borderTop: '1px solid var(--accents-2)' }}>
                <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--foreground)', display: 'block', marginBottom: '4px' }}>
                  Tamanho da Fonte do Editor
                </label>
                <select
                  value={fontSize}
                  onChange={(e) => {
                    setFontSize(e.target.value);
                    handleSaveGeneral('font_size', e.target.value);
                  }}
                  className="geist-input"
                  style={{ width: '200px' }}
                >
                  <option value="13px">13px - Compacto</option>
                  <option value="14px">14px - Padrão</option>
                  <option value="15px">15px - Médio</option>
                  <option value="16px">16px - Amplo</option>
                </select>
              </div>

              <div style={{ paddingTop: '16px', borderTop: '1px solid var(--accents-2)' }}>
                <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--foreground)', display: 'block', marginBottom: '4px' }}>
                  Família da Fonte
                </label>
                <select
                  value={fontFamily}
                  onChange={(e) => {
                    setFontFamily(e.target.value);
                    handleSaveGeneral('font_family', e.target.value);
                  }}
                  className="geist-input"
                  style={{ width: '240px' }}
                >
                  <option value="Geist Sans">Geist Sans (Vercel Style)</option>
                  <option value="Inter">Inter</option>
                  <option value="Segoe UI">Segoe UI</option>
                  <option value="Fira Code">Fira Code (Monospace)</option>
                </select>
              </div>
            </div>
          )}

          {/* 4. Editor Settings */}
          {activeTab === 'editor' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '520px' }}>
              <div>
                <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--foreground)', display: 'block', marginBottom: '4px' }}>
                  Largura Máxima do Documento
                </label>
                <p style={{ fontSize: '12px', color: 'var(--accents-5)', margin: '0 0 8px' }}>
                  Escolha o limite horizontal do texto para leitura confortável.
                </p>
                <select
                  value={editorWidth}
                  onChange={(e) => {
                    setEditorWidth(e.target.value);
                    handleSaveGeneral('editor_width', e.target.value);
                  }}
                  className="geist-input"
                  style={{ width: '220px' }}
                >
                  <option value="720px">720px - Focado / Livro</option>
                  <option value="800px">800px - Padrão Synap</option>
                  <option value="960px">960px - Amplo</option>
                  <option value="100%">100% - Largura Total</option>
                </select>
              </div>

              <div style={{ paddingTop: '16px', borderTop: '1px solid var(--accents-2)' }}>
                <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--foreground)', display: 'block', marginBottom: '8px' }}>
                  Comportamentos & Automações
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--foreground)', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={slashMenuEnabled}
                      onChange={(e) => {
                        setSlashMenuEnabled(e.target.checked);
                        handleSaveGeneral('slash_menu', e.target.checked);
                      }}
                    />
                    Habilitar menu suspenso de comandos ao digitar "/"
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--foreground)', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={wikilinksEnabled}
                      onChange={(e) => {
                        setWikilinksEnabled(e.target.checked);
                        handleSaveGeneral('wikilinks', e.target.checked);
                      }}
                    />
                    Habilitar links de notas bidirecionais ao digitar "[["
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* 5. Shortcuts Settings */}
          {activeTab === 'shortcuts' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', height: '100%' }}>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  placeholder="Pesquisar atalho ou ação..."
                  value={shortcutSearch}
                  onChange={(e) => setShortcutSearch(e.target.value)}
                  className="geist-input"
                  style={{ height: '34px', fontSize: '12.5px', paddingLeft: '32px' }}
                />
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--accents-4)' }}
                >
                  <circle cx="11" cy="11" r="8"/>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
              </div>

              <div style={{ flex: 1, overflowY: 'auto', border: '1px solid var(--accents-2)', borderRadius: '8px' }} className="no-scrollbar">
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
                  <thead>
                    <tr style={{ background: 'var(--accents-1)', borderBottom: '1px solid var(--accents-2)' }}>
                      <th style={{ padding: '8px 12px', fontWeight: 600, color: 'var(--accents-5)' }}>Comando</th>
                      <th style={{ padding: '8px 12px', fontWeight: 600, color: 'var(--accents-5)' }}>Atalho</th>
                      <th style={{ padding: '8px 12px', fontWeight: 600, color: 'var(--accents-5)' }}>Categoria</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredShortcuts.map((s, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid var(--accents-2)' }}>
                        <td style={{ padding: '10px 12px', color: 'var(--foreground)' }}>{s.desc}</td>
                        <td style={{ padding: '10px 12px' }}>
                          <kbd
                            style={{
                              background: 'var(--accents-1)',
                              border: '1px solid var(--accents-2)',
                              borderRadius: '4px',
                              padding: '2px 6px',
                              fontSize: '11px',
                              fontFamily: 'var(--font-mono)',
                              color: 'var(--foreground)',
                            }}
                          >
                            {s.key}
                          </kbd>
                        </td>
                        <td style={{ padding: '10px 12px', color: 'var(--accents-4)' }}>{s.category}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 6. Backup & Storage Settings */}
          {activeTab === 'backup' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '22px', maxWidth: '520px' }}>
              <div>
                <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--foreground)', display: 'block', marginBottom: '4px' }}>
                  {t('export_md_title')}
                </label>
                <p style={{ fontSize: '12px', color: 'var(--accents-5)', margin: '0 0 12px', lineHeight: '1.5' }}>
                  {t('export_md_desc')}
                </p>
                <button
                  type="button"
                  onClick={handleExportMarkdown}
                  disabled={exporting || notas.length === 0}
                  className="geist-button"
                  style={{ height: '34px', padding: '0 16px', fontSize: '12px', borderRadius: '6px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="7 10 12 15 17 10"/>
                    <line x1="12" y1="15" x2="12" y2="3"/>
                  </svg>
                  <span>{exporting ? t('exporting_btn') : t('export_btn')}</span>
                </button>
              </div>

              <div style={{ paddingTop: '18px', borderTop: '1px solid var(--accents-2)' }}>
                <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--foreground)', display: 'block', marginBottom: '4px' }}>
                  {t('workspace_stats')}
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginTop: '10px' }}>
                  <div style={{ padding: '12px', background: 'var(--accents-1)', border: '1px solid var(--accents-2)', borderRadius: '8px' }}>
                    <div style={{ fontSize: '11px', color: 'var(--accents-4)' }}>{t('total_notes')}</div>
                    <div style={{ fontSize: '20px', fontWeight: 600, color: 'var(--foreground)', marginTop: '2px' }}>
                      {notas.filter((n) => n.tipo !== 'desenho').length}
                    </div>
                  </div>
                  <div style={{ padding: '12px', background: 'var(--accents-1)', border: '1px solid var(--accents-2)', borderRadius: '8px' }}>
                    <div style={{ fontSize: '11px', color: 'var(--accents-4)' }}>{t('drawings_count')}</div>
                    <div style={{ fontSize: '20px', fontWeight: 600, color: '#38bdf8', marginTop: '2px' }}>
                      {notas.filter((n) => n.tipo === 'desenho').length}
                    </div>
                  </div>
                  <div style={{ padding: '12px', background: 'var(--accents-1)', border: '1px solid var(--accents-2)', borderRadius: '8px' }}>
                    <div style={{ fontSize: '11px', color: 'var(--accents-4)' }}>Workspace ID</div>
                    <div style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--accents-5)', marginTop: '6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {workspace?.id?.slice(0, 10)}...
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 7. Danger Zone: Delete Workspaces */}
          {activeTab === 'danger' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '560px' }}>
              {dangerMsg && (
                <div
                  style={{
                    padding: '8px 12px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    background: dangerMsg.type === 'success' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(238, 0, 0, 0.1)',
                    color: dangerMsg.type === 'success' ? '#22c55e' : 'var(--error)',
                    border: `1px solid ${dangerMsg.type === 'success' ? 'rgba(34, 197, 94, 0.3)' : 'rgba(238, 0, 0, 0.3)'}`,
                  }}
                >
                  {dangerMsg.text}
                </div>
              )}

              <div style={{ padding: '14px 16px', background: 'rgba(238, 0, 0, 0.06)', border: '1px solid rgba(238, 0, 0, 0.25)', borderRadius: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--error)', fontWeight: 600, fontSize: '13px', marginBottom: '4px' }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                    <line x1="12" y1="9" x2="12" y2="13"/>
                    <line x1="12" y1="17" x2="12.01" y2="17"/>
                  </svg>
                  <span>{t('delete_workspace_title')}</span>
                </div>
                <p style={{ margin: 0, fontSize: '12px', color: 'var(--accents-5)', lineHeight: '1.5' }}>
                  {t('delete_workspace_desc')}
                </p>
              </div>

              <div>
                <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--foreground)', display: 'block', marginBottom: '10px' }}>
                  Workspaces Registradas
                </label>

                {loadingWorkspaces ? (
                  <div style={{ padding: '24px', textAlign: 'center', color: 'var(--accents-4)', fontSize: '13px' }}>
                    Carregando workspaces...
                  </div>
                ) : allWorkspaces.length === 0 ? (
                  <div style={{ padding: '24px', textAlign: 'center', color: 'var(--accents-4)', fontSize: '13px' }}>
                    {t('no_workspaces_to_delete')}
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {allWorkspaces.map((ws) => {
                      const isCurrent = ws.id === workspace?.id;

                      return (
                        <div
                          key={ws.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '10px 14px',
                            background: 'var(--accents-1)',
                            border: '1px solid var(--accents-2)',
                            borderRadius: '8px',
                          }}
                        >
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--foreground)' }}>
                                {ws.nome || 'Workspace sem nome'}
                              </span>
                              {isCurrent && (
                                <span style={{ fontSize: '10px', color: '#38bdf8', background: 'rgba(56, 189, 248, 0.1)', border: '1px solid rgba(56, 189, 248, 0.3)', padding: '1px 6px', borderRadius: '4px' }}>
                                  Atual
                                </span>
                              )}
                            </div>
                            <span style={{ fontSize: '11px', color: 'var(--accents-4)', fontFamily: 'var(--font-mono)' }}>
                              ID: {ws.id}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => setWorkspaceToDelete(ws)}
                            disabled={deletingWorkspaceId === ws.id}
                            className="hover:bg-[rgba(238,0,0,0.15)] text-[var(--accents-5)] hover:text-[var(--error)]"
                            style={{
                              height: '28px',
                              padding: '0 10px',
                              fontSize: '11.5px',
                              fontWeight: 500,
                              borderRadius: '6px',
                              border: '1px solid rgba(238,0,0,0.25)',
                              background: 'transparent',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              transition: 'all 0.15s ease',
                            }}
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M3 6h18"/>
                              <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
                              <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
                            </svg>
                            <span>{t('delete_workspace_btn')}</span>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        </div>
      </div>

      {/* Danger Zone Delete Confirmation Modal */}
      {workspaceToDelete && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 3000,
            background: 'rgba(0, 0, 0, 0.85)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
          onClick={(e) => {
            e.stopPropagation();
            setWorkspaceToDelete(null);
          }}
        >
          <div
            style={{
              background: 'var(--background)',
              border: '1px solid rgba(238, 0, 0, 0.4)',
              borderRadius: '12px',
              boxShadow: '0 24px 60px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(238, 0, 0, 0.2)',
              width: '100%',
              maxWidth: '420px',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(238, 0, 0, 0.1)', border: '1px solid rgba(238, 0, 0, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--error)', flexShrink: 0 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                  <line x1="12" y1="9" x2="12" y2="13"/>
                  <line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
              </div>

              <div>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: 'var(--foreground)' }}>
                  Excluir Workspace Definitivamente?
                </h3>
                <p style={{ margin: '6px 0 0', fontSize: '13px', color: 'var(--accents-5)', lineHeight: '1.5' }}>
                  {t('delete_workspace_confirm')}{' '}
                  <strong style={{ color: 'var(--foreground)' }}>"{workspaceToDelete.nome}"</strong>?
                </p>
              </div>
            </div>

            <div style={{ padding: '10px 12px', background: 'rgba(238, 0, 0, 0.06)', borderRadius: '6px', border: '1px solid rgba(238, 0, 0, 0.2)', fontSize: '12px', color: 'var(--error)', lineHeight: '1.4' }}>
              ⚠️ Esta ação apagará permanentemente todas as pastas, notas, flashcards e desenhos dentro deste workspace e não poderá ser desfeita.
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
              <button
                type="button"
                onClick={() => setWorkspaceToDelete(null)}
                className="geist-button-secondary"
                style={{ height: '32px', fontSize: '12px', padding: '0 12px', borderRadius: '6px', cursor: 'pointer' }}
              >
                {t('cancel')}
              </button>
              <button
                type="button"
                onClick={() => handleDeleteWorkspace(workspaceToDelete)}
                disabled={deletingWorkspaceId === workspaceToDelete.id}
                style={{
                  height: '32px',
                  fontSize: '12px',
                  padding: '0 14px',
                  borderRadius: '6px',
                  background: 'var(--error)',
                  color: '#ffffff',
                  border: 'none',
                  fontWeight: 500,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                {deletingWorkspaceId === workspaceToDelete.id ? 'Excluindo...' : 'Sim, Excluir Workspace'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
