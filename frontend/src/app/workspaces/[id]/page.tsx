'use client';

import { useEffect, useState, use, useRef, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import Link from 'next/link';
import Image from 'next/image';
import Editor from '@/components/Editor';
import Terminal from '@/components/Terminal';
import GraphView from '@/components/GraphView';
import DrawingCanvas from '@/components/DrawingCanvas';
import FlashcardsView from '@/components/FlashcardsView';
import AiChatView from '@/components/AiChatView';
import CardModal from '@/components/CardModal';
import SettingsModal from '@/components/SettingsModal';
import LogoutConfirmModal from '@/components/LogoutConfirmModal';
import ShareWorkspaceModal from '@/components/ShareWorkspaceModal';
import FolderModal, { FolderModalData } from '@/components/FolderModal';
import LoadingScreen from '@/components/LoadingScreen';
import ToastContainer, { ToastMessage } from '@/components/Toast';
import SynapLogo from '@/components/SynapLogo';
import WorkspaceRail from '@/components/WorkspaceRail';
import DiscordChannelSidebar from '@/components/DiscordChannelSidebar';
import DiscordChannelHeader from '@/components/DiscordChannelHeader';
import DiscordToolsSidebar from '@/components/DiscordToolsSidebar';
import CreateWorkspaceModal from '@/components/CreateWorkspaceModal';
import WorkspaceSettingsModal from '@/components/WorkspaceSettingsModal';
import LeaveWorkspaceModal from '@/components/LeaveWorkspaceModal';
import { translations, Language } from '@/lib/i18n';
import { useTheme } from '@/components/ThemeProvider';

export const TOP_FONTS = [
  { id: 'geist', name: 'Geist Sans', family: "var(--font-sans), 'Geist Sans', sans-serif", category: 'Sans-Serif' },
  { id: 'inter', name: 'Inter', family: "'Inter', sans-serif", category: 'Sans-Serif' },
  { id: 'roboto', name: 'Roboto', family: "'Roboto', sans-serif", category: 'Sans-Serif' },
  { id: 'open-sans', name: 'Open Sans', family: "'Open Sans', sans-serif", category: 'Sans-Serif' },
  { id: 'source-sans', name: 'Source Sans 3', family: "'Source Sans 3', sans-serif", category: 'Sans-Serif' },
  { id: 'lora', name: 'Lora', family: "'Lora', serif", category: 'Serif' },
  { id: 'merriweather', name: 'Merriweather', family: "'Merriweather', serif", category: 'Serif' },
  { id: 'playfair', name: 'Playfair Display', family: "'Playfair Display', serif", category: 'Serif' },
  { id: 'jetbrains', name: 'JetBrains Mono', family: "'JetBrains Mono', monospace", category: 'Monospace' },
  { id: 'fira-code', name: 'Fira Code', family: "'Fira Code', monospace", category: 'Monospace' },
];

export const FONT_SIZES = [
  { label: 'Pequeno (13px)', value: '13px' },
  { label: 'Padrão (15px)', value: '15px' },
  { label: 'Médio (17px)', value: '17px' },
  { label: 'Grande (19px)', value: '19px' },
  { label: 'Extra Grande (22px)', value: '22px' },
];

export default function WorkspaceLayout({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { theme, setTheme } = useTheme();
  
  const [workspace, setWorkspace] = useState<any>(null);
  const [allWorkspaces, setAllWorkspaces] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [pastas, setPastas] = useState<any[]>([]);
  const [notas, setNotas] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isCreateWorkspaceModalOpen, setIsCreateWorkspaceModalOpen] = useState(false);
  const [isWorkspaceSettingsModalOpen, setIsWorkspaceSettingsModalOpen] = useState(false);
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const isOwner = Boolean(workspace?.isOwner ?? (workspace?.userId && currentUser?.id && workspace.userId === currentUser.id));
  const currentUserRole = workspace?.currentUserRole || (isOwner ? 'OWNER' : 'MEMBER');

  // Editor Typography & Actions Menu State
  const [editorFontFamily, setEditorFontFamily] = useState<string>("var(--font-sans), 'Geist Sans', sans-serif");
  const [editorFontSize, setEditorFontSize] = useState<string>("15px");
  const [editorWidth, setEditorWidth] = useState<string>("800px");
  const [slashMenuEnabled, setSlashMenuEnabled] = useState<boolean>(true);
  const [wikilinksEnabled, setWikilinksEnabled] = useState<boolean>(true);
  const [isActionsMenuOpen, setIsActionsMenuOpen] = useState<boolean>(false);
  const [activeSubmenu, setActiveSubmenu] = useState<'none' | 'font' | 'size'>('none');
  const actionsMenuRef = useRef<HTMLDivElement>(null);
  const [sidebarSearch, setSidebarSearch] = useState<string>('');
  const sidebarSearchInputRef = useRef<HTMLInputElement>(null);

  const showToast = useCallback((message: string, type: 'error' | 'success' | 'info' = 'error') => {
    const toastId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    setToasts((prev) => [...prev, { id: toastId, message, type }]);
  }, []);

  const dismissToast = useCallback((toastId: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== toastId));
  }, []);
  
  // Language State
  const [currentLang, setCurrentLang] = useState<Language>('pt-BR');
  const t = (key: keyof typeof translations['pt-BR']) => translations[currentLang][key] || key;

  useEffect(() => {
    const updateLang = () => {
      const saved = (localStorage.getItem('synap_language') as Language) || 'pt-BR';
      setCurrentLang(saved);
    };
    updateLang();
    window.addEventListener('synap_language_changed', updateLang);
    return () => window.removeEventListener('synap_language_changed', updateLang);
  }, []);
  
  const [selectedNota, setSelectedNota] = useState<any>(null);
  const [selectedCardModal, setSelectedCardModal] = useState<any | null>(null);
  const [openTabIds, setOpenTabIds] = useState<string[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [isTerminalOpen, setIsTerminalOpen] = useState(false);
  const [isGraphViewOpen, setIsGraphViewOpen] = useState(false);
  const [isFlashcardsOpen, setIsFlashcardsOpen] = useState(false);
  const [isAiChatOpen, setIsAiChatOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);
  const [isMobileFilesSheetOpen, setIsMobileFilesSheetOpen] = useState(false);

  // Detect mobile viewport and handle initial sidebar collapse
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      if (mobile) {
        setIsSidebarOpen(false);
        setIsRightSidebarOpen(false);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Folder state
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});

  // Context Menu
  const [contextMenu, setContextMenu] = useState<{ visible: boolean, x: number, y: number, id: string, type: 'pasta' | 'nota', currentName: string } | null>(null);

  // Custom Delete Modal State
  const [deleteModal, setDeleteModal] = useState<{ visible: boolean, id: string, type: 'pasta' | 'nota', name: string } | null>(null);

  // Folder Modal State (Create / Rename)
  const [folderModal, setFolderModal] = useState<FolderModalData | null>(null);

  // Inline Action (Create / Rename)
  const [inlineAction, setInlineAction] = useState<{ 
    type: 'create' | 'rename',
    itemType: 'pasta' | 'nota',
    id: string, // for create: parentId (or 'root'). for rename: itemId
    value: string 
  } | null>(null);

  const inlineInputRef = useRef<HTMLInputElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const shouldSelectTitleRef = useRef<boolean>(false);

  // Auto-save logic
  const [editTitle, setEditTitle] = useState('');
  const [currentContent, setCurrentContent] = useState('');
  const [currentLine, setCurrentLine] = useState(1);
  const editTitleRef = useRef('');
  const editContentRef = useRef('');
  const selectedNotaRef = useRef<any>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  useEffect(() => {
    selectedNotaRef.current = selectedNota;
  }, [selectedNota]);

  useEffect(() => {
    editTitleRef.current = editTitle;
  }, [editTitle]);

  // Real-time note statistics (words, characters, links, and bidirectional connections)
  const noteStats = useMemo(() => {
    if (!selectedNota || selectedNota.tipo === 'desenho') {
      return { words: 0, chars: 0, links: 0, connections: 0 };
    }

    const content = currentContent || '';

    // 1. Text extraction (stripping HTML tags, styles, scripts and entities)
    const plainText = content
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/gi, "'")
      .replace(/\s+/g, ' ')
      .trim();

    const words = plainText.length > 0 ? plainText.split(/\s+/).filter(Boolean).length : 0;
    const chars = plainText.length;

    // 2. Count internal & external links in note content
    const aTagCount = (content.match(/<a\b[^>]*>/gi) || []).length;
    const standaloneWikiCount = (content.replace(/<a\b[^>]*>[\s\S]*?<\/a>/gi, '').match(/\[\[(.*?)\]\]/g) || []).length;
    const linksCount = aTagCount + standaloneWikiCount;

    // 3. Bidirectional connections calculation (outgoing note links + incoming backlinks)
    const currentNoteId = selectedNota.id;
    const currentTitle = (editTitle || selectedNota.titulo || '').toLowerCase().trim();
    const noteIdSet = new Set(notas.map((n) => n.id));
    const titleToIdMap = new Map(notas.map((n) => [(n.titulo || '').toLowerCase().trim(), n.id]));

    const connectedNoteIds = new Set<string>();

    // Outgoing note links from current note
    const dataIdRegex = /data-note-id=["']([^"']+)["']/g;
    let m;
    while ((m = dataIdRegex.exec(content)) !== null) {
      const targetId = m[1];
      if (targetId && targetId !== currentNoteId && noteIdSet.has(targetId)) {
        connectedNoteIds.add(targetId);
      }
    }
    const wikiRegex = /\[\[(.*?)\]\]/g;
    while ((m = wikiRegex.exec(content)) !== null) {
      const targetTitle = m[1].toLowerCase().trim();
      const targetId = titleToIdMap.get(targetTitle);
      if (targetId && targetId !== currentNoteId) {
        connectedNoteIds.add(targetId);
      }
    }

    // Incoming backlinks from other notes in workspace
    notas.forEach((otherNota) => {
      if (otherNota.id === currentNoteId) return;
      const otherContent = otherNota.conteudo || '';
      if (
        otherContent.includes(`data-note-id="${currentNoteId}"`) ||
        otherContent.includes(`data-note-id='${currentNoteId}'`)
      ) {
        connectedNoteIds.add(otherNota.id);
      } else if (currentTitle && otherContent.toLowerCase().includes(`[[${currentTitle}]]`)) {
        connectedNoteIds.add(otherNota.id);
      }
    });

    return {
      words,
      chars,
      links: Math.max(linksCount, connectedNoteIds.size),
      connections: connectedNoteIds.size,
    };
  }, [selectedNota, currentContent, editTitle, notas]);

  const filteredNotasBySearch = useMemo(() => {
    if (!sidebarSearch.trim()) return null;
    const query = sidebarSearch.toLowerCase().trim();
    return notas.filter((n) => (n.titulo || '').toLowerCase().includes(query));
  }, [notas, sidebarSearch]);

  const openTabsList = useMemo(() => {
    return openTabIds
      .map((tabId) => notas.find((n) => n.id === tabId))
      .filter(Boolean);
  }, [openTabIds, notas]);

  // Load preferences from currentUser
  useEffect(() => {
    if (currentUser?.preferences) {
      if (currentUser.preferences.editorFontFamily) {
        setEditorFontFamily(currentUser.preferences.editorFontFamily);
      }
      if (currentUser.preferences.editorFontSize) {
        setEditorFontSize(currentUser.preferences.editorFontSize);
      }
      if (currentUser.preferences.editorWidth) {
        setEditorWidth(currentUser.preferences.editorWidth);
      }
      if (currentUser.preferences.slashMenuEnabled !== undefined) {
        setSlashMenuEnabled(currentUser.preferences.slashMenuEnabled);
      }
      if (currentUser.preferences.wikilinksEnabled !== undefined) {
        setWikilinksEnabled(currentUser.preferences.wikilinksEnabled);
      }
      
      // Sync theme if different
      if (currentUser.preferences.theme && currentUser.preferences.theme !== theme) {
        setTheme(currentUser.preferences.theme);
      }
      
      // Sync language if different
      if (currentUser.preferences.language) {
        const currentLang = localStorage.getItem('synap_language');
        if (currentLang !== currentUser.preferences.language) {
          localStorage.setItem('synap_language', currentUser.preferences.language);
          window.dispatchEvent(new Event('synap_language_changed'));
        }
      }
    }
  }, [currentUser, theme, setTheme]);

  // Update & persist user preferences
  const handleUpdatePreference = async (key: 'editorFontFamily' | 'editorFontSize', value: string) => {
    if (key === 'editorFontFamily') setEditorFontFamily(value);
    if (key === 'editorFontSize') setEditorFontSize(value);

    const newPrefs = {
      ...(currentUser?.preferences || {}),
      [key]: value,
    };

    setCurrentUser((prev: any) => (prev ? { ...prev, preferences: newPrefs } : prev));

    try {
      await api('/auth/me', {
        method: 'PUT',
        body: JSON.stringify({ preferences: newPrefs }),
      });
    } catch (err) {
      console.error('Erro ao salvar preferências de editor:', err);
    }
  };

  // Close actions menu when clicking outside
  useEffect(() => {
    if (!isActionsMenuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (!target || !document.contains(target)) return;
      if (actionsMenuRef.current && !actionsMenuRef.current.contains(target)) {
        setIsActionsMenuOpen(false);
        setActiveSubmenu('none');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isActionsMenuOpen]);

  // Export note to PDF formatted document
  const handleExportPDF = () => {
    if (!selectedNota) return;
    setIsActionsMenuOpen(false);
    setActiveSubmenu('none');

    const printWindow = window.open('', '_blank');
    const title = editTitle || selectedNota.titulo || 'Nota Sem Título';
    const content = editContentRef.current || selectedNota.conteudo || '';
    const dateStr = new Date().toLocaleDateString('pt-BR', { dateStyle: 'long' });

    if (!printWindow) {
      window.print();
      return;
    }

    printWindow.document.write(`<!DOCTYPE html>
<html>
  <head>
    <title>${title}</title>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;500&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&family=Lora:ital,wght@0,400;0,600;1,400&family=Merriweather:ital,wght@0,300;0,400;0,700&family=Open+Sans:wght@400;600;700&family=Playfair+Display:ital,wght@0,400;0,600&family=Roboto:wght@400;500;700&family=Source+Sans+3:wght@400;600;700&display=swap" rel="stylesheet">
    <style>
      @page { margin: 20mm; size: A4; }
      * { box-sizing: border-box; }
      body {
        font-family: ${editorFontFamily}, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: ${editorFontSize || '15px'};
        line-height: 1.75;
        color: #111113;
        background: #ffffff;
        max-width: ${editorWidth === '100%' ? '100%' : editorWidth};
        margin: 0 auto;
        padding: 32px 24px;
      }
      h1.note-title {
        font-size: 28px;
        font-weight: 700;
        margin: 0 0 8px 0;
        letter-spacing: -0.03em;
        color: #000000;
      }
      .meta-info {
        font-size: 11px;
        color: #71717a;
        margin-bottom: 28px;
        padding-bottom: 12px;
        border-bottom: 1px solid #e4e4e7;
        font-family: ui-monospace, SFMono-Regular, monospace;
      }
      .note-body {
        color: #18181b;
      }
      img { max-width: 100%; height: auto; border-radius: 6px; }
      a { color: #0070f3; text-decoration: underline; }
      blockquote {
        border-left: 3px solid #d4d4d8;
        margin: 16px 0;
        padding-left: 16px;
        color: #52525b;
        font-style: italic;
      }
      pre {
        background: #f4f4f5;
        padding: 12px;
        border-radius: 6px;
        font-family: ui-monospace, SFMono-Regular, monospace;
        font-size: 13px;
        overflow-x: auto;
      }
      table { width: 100%; border-collapse: collapse; margin: 16px 0; }
      th, td { border: 1px solid #e4e4e7; padding: 8px 12px; text-align: left; }
      th { background: #fafafa; font-weight: 600; }
      @media print {
        body { padding: 0; }
      }
    </style>
  </head>
  <body>
    <h1 class="note-title">${title}</h1>
    <div class="meta-info">Synap • ${dateStr}</div>
    <div class="note-body">${content}</div>
    <script>
      window.onload = function() {
        setTimeout(function() {
          window.print();
        }, 250);
      };
    </script>
  </body>
</html>`);
    printWindow.document.close();
  };

  const [error, setError] = useState('');
  const router = useRouter();

  const loadInitialWorkspaceData = async () => {
    setIsLoading(true);
    setError('');
    try {
      const [userData, workspaceData, pastasData, notasData, allWorkspacesData] = await Promise.all([
        api('/auth/me').catch(() => null),
        api(`/workspaces/${id}`),
        api(`/pastas?workspaceId=${id}`),
        api(`/notas?workspaceId=${id}`),
        api('/workspaces').catch(() => []),
      ]);

      if (userData) setCurrentUser(userData);
      if (workspaceData) setWorkspace(workspaceData);
      if (allWorkspacesData) setAllWorkspaces(allWorkspacesData);
      if (pastasData) setPastas(pastasData);
      if (notasData) {
        setNotas(notasData);

        // Check startup behavior from settings
        const startup = userData?.preferences?.startupBehavior || 'last_note';
        if (startup === 'last_note' && Array.isArray(notasData) && notasData.length > 0) {
          const lastVisitedId = localStorage.getItem(`synap_last_note_${id}`);
          const targetNota = notasData.find((n: any) => n.id === lastVisitedId) || notasData[0];
          if (targetNota) {
            openNota(targetNota);
          }
        }
      }
    } catch (err: any) {
      console.error('Failed to load workspace data', err);
      if (
        err.message === 'Token is invalid' ||
        err.message === 'Token is missing' ||
        err.message === 'User no longer exists'
      ) {
        localStorage.removeItem('token');
        router.push('/login');
        return;
      }
      showToast('Não foi possível carregar os dados do workspace. Verifique sua conexão.', 'error');
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
    loadInitialWorkspaceData();
  }, [id]);

  useEffect(() => {
    if (selectedNota) {
      if (shouldSelectTitleRef.current || selectedNota.titulo === '') {
        shouldSelectTitleRef.current = false;
        setTimeout(() => {
          if (titleInputRef.current) {
            titleInputRef.current.focus();
            titleInputRef.current.select();
          }
        }, 50);
      }
    }
  }, [selectedNota?.id]);

  // Click outside context menu to close it
  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  // Global keyboard shortcuts:
  // Ctrl + D: abrir/fechar barra lateral
  // Ctrl + J: abrir/fechar terminal
  // Ctrl + N: criar nova nota rápida
  // Ctrl + G: acessar/fechar grafo
  // Ctrl + 1..9: navegar entre as abas abertas
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (deleteModal) setDeleteModal(null);
        if (contextMenu) setContextMenu(null);
      }

      if (e.ctrlKey || e.metaKey) {
        const key = e.key.toLowerCase();

        // Ctrl + D: Toggle Sidebar
        if (key === 'd') {
          e.preventDefault();
          setIsSidebarOpen((prev) => !prev);
          return;
        }

        // Ctrl + J: Toggle Terminal
        if (key === 'j') {
          e.preventDefault();
          setIsTerminalOpen((prev) => !prev);
          return;
        }

        // Ctrl + N: Create New Note
        if (key === 'n') {
          e.preventDefault();
          handleCreateNota(null);
          return;
        }

        // Ctrl + G: Toggle Graph View
        if (key === 'g') {
          e.preventDefault();
          setIsGraphViewOpen((prev) => !prev);
          return;
        }

        // Ctrl + J: Toggle Synap AI Assistant
        if (key === 'j') {
          e.preventDefault();
          setIsAiChatOpen((prev) => !prev);
          return;
        }

        // Ctrl + 1..9: Switch Tab by index
        if (/^[1-9]$/.test(key)) {
          e.preventDefault();
          const tabIndex = parseInt(key, 10) - 1;
          if (openTabIds[tabIndex]) {
            const targetNoteId = openTabIds[tabIndex];
            const targetNota = notas.find((n) => n.id === targetNoteId);
            if (targetNota) {
              openNota(targetNota);
            }
          }
          return;
        }

        if (e.key.toLowerCase() === 'k') {
          e.preventDefault();
          setIsSidebarOpen(true);
          setTimeout(() => {
            if (sidebarSearchInputRef.current) {
              sidebarSearchInputRef.current.focus();
              sidebarSearchInputRef.current.select();
            }
          }, 50);
          return;
        }

        // Keep existing legacy toggle shortcuts
        if (e.key === '\\') {
          e.preventDefault();
          setIsSidebarOpen((prev) => !prev);
          return;
        }
        if (e.key === '`' || e.key === "'") {
          e.preventDefault();
          setIsTerminalOpen((prev) => !prev);
          return;
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [deleteModal, contextMenu, openTabIds, notas]);

  const refreshData = async () => {
    await Promise.all([loadPastas(), loadNotas()]);
  };

  // Focus inline input automatically
  useEffect(() => {
    if (inlineAction) {
      setTimeout(() => {
        if (inlineInputRef.current) {
          inlineInputRef.current.focus();
          inlineInputRef.current.select();
        }
      }, 50);
    }
  }, [inlineAction?.id, inlineAction?.type]);

  const loadUser = async () => {
    try {
      const data = await api('/auth/me');
      setCurrentUser(data);
    } catch (err: any) { console.error('Failed to load user', err); }
  };

  const loadWorkspace = async () => {
    try {
      const data = await api(`/workspaces/${id}`);
      setWorkspace(data);
    } catch (err: any) {
      console.error('Erro ao carregar workspace:', err);
      showToast('Não foi possível carregar os dados do workspace.', 'error');
    }
  };

  const loadPastas = async () => {
    try {
      const data = await api(`/pastas?workspaceId=${id}`);
      setPastas(data);
    } catch (err: any) {
      console.error('Erro ao carregar pastas:', err);
      showToast('Não foi possível carregar as pastas.', 'error');
    }
  };

  const loadNotas = async () => {
    try {
      const data = await api(`/notas?workspaceId=${id}`);
      setNotas(data);

      // Check startup behavior from settings
      const startup = currentUser?.preferences?.startupBehavior || 'last_note';
      if (startup === 'last_note' && Array.isArray(data) && data.length > 0) {
        const lastVisitedId = localStorage.getItem(`synap_last_note_${id}`);
        const targetNota = data.find((n) => n.id === lastVisitedId) || data[0];
        if (targetNota) {
          openNota(targetNota);
        }
      }
    } catch (err: any) {
      console.error('Erro ao carregar notas:', err);
      showToast('Não foi possível carregar as notas.', 'error');
    }
  };

  // Trigger Folder Modal Creation
  const handleTriggerCreatePasta = (parentId: string | null = null) => {
    if (parentId) {
      // Expand the parent folder so the user can see the created folder afterwards
      setExpandedFolders(prev => ({ ...prev, [parentId]: true }));
    }
    const parentFolder = parentId ? pastas.find(p => p.id === parentId) : null;
    setFolderModal({
      mode: 'create',
      parentId: parentId || null,
      initialName: '',
      parentFolderName: parentFolder ? parentFolder.nome : null,
    });
    if (contextMenu) setContextMenu(null);
  };

  // Confirm Folder Modal (Create / Rename)
  const handleConfirmFolderModal = async (name: string, data: FolderModalData) => {
    const trimmedValue = name.trim();
    if (!trimmedValue) return;

    try {
      if (data.mode === 'create') {
        const parentId = data.parentId || null;
        await api('/pastas', {
          method: 'POST',
          body: JSON.stringify({ nome: trimmedValue, workspaceId: id, parentId }),
        });
        await loadPastas();
        showToast('Pasta criada com sucesso!', 'success');
      } else if (data.mode === 'rename' && data.folderId) {
        await api(`/pastas/${data.folderId}`, {
          method: 'PUT',
          body: JSON.stringify({ nome: trimmedValue }),
        });
        await loadPastas();
        showToast('Pasta renomeada com sucesso!', 'success');
      }
    } catch (err: any) {
      console.error('Erro ao processar pasta:', err);
      const actionDesc = data.mode === 'create' ? 'criar a pasta' : 'renomear a pasta';
      showToast(`Não foi possível ${actionDesc}. Tente novamente.`, 'error');
      throw err;
    }
  };

  // Perform Note Inline Rename when input blurs or Enter is pressed
  const handleInlineCommit = async () => {
    if (!inlineAction) return;
    const { type, itemType, id: actionId, value } = inlineAction;
    setInlineAction(null);

    const trimmedValue = value.trim();
    if (!trimmedValue) return;

    try {
      if (type === 'rename' && itemType === 'nota') {
        const updated = await api(`/notas/${actionId}`, {
          method: 'PUT',
          body: JSON.stringify({ titulo: trimmedValue }),
        });
        setNotas(prev => prev.map(n => n.id === updated.id ? updated : n));
        if (selectedNotaRef.current?.id === updated.id) {
          selectedNotaRef.current = updated;
          editTitleRef.current = updated.titulo;
          setSelectedNota(updated);
          setEditTitle(updated.titulo);
        }
      }
    } catch (err: any) {
      console.error('Erro na ação inline:', err);
      showToast('Não foi possível renomear a nota. Tente novamente.', 'error');
    }
  };

  const handleInlineKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleInlineCommit();
    if (e.key === 'Escape') setInlineAction(null);
  };

  const handleCreateNota = async (pastaId: string | null = null, tipo: 'texto' | 'desenho' = 'texto') => {
    setIsGraphViewOpen(false);
    if (pastaId) {
      setExpandedFolders(prev => ({ ...prev, [pastaId]: true }));
    }
    try {
      const defaultTitle = tipo === 'desenho' ? 'Novo Desenho' : 'Nova Nota';
      const newNota = await api('/notas', {
        method: 'POST',
        body: JSON.stringify({ 
          titulo: defaultTitle, 
          conteudo: tipo === 'desenho' ? '[]' : '',
          tipo,
          workspaceId: id,
          pastaId 
        }),
      });
      shouldSelectTitleRef.current = true;
      loadNotas();
      openNota(newNota, true);
    } catch (err: any) {
      console.error('Erro ao criar nota:', err);
      const itemDesc = tipo === 'desenho' ? 'o desenho' : 'a nota';
      showToast(`Não foi possível criar ${itemDesc}. Tente novamente.`, 'error');
    }
  };

  const handleCreateDesenho = async (pastaId: string | null = null) => {
    await handleCreateNota(pastaId, 'desenho');
  };

  const openNota = (nota: any, autoSelectTitle: boolean = false) => {
    if (!nota) return;

    // If clicking on the currently selected note, don't overwrite current unsaved edits in state
    if (selectedNotaRef.current?.id === nota.id) {
      if (autoSelectTitle) {
        shouldSelectTitleRef.current = true;
        setTimeout(() => {
          if (titleInputRef.current) {
            titleInputRef.current.focus();
            titleInputRef.current.select();
          }
        }, 50);
      }
      return;
    }

    // Flush any pending auto-save for the previously open note
    if (saveTimeoutRef.current && selectedNotaRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
      const prevId = selectedNotaRef.current.id;
      const prevTitle = editTitleRef.current;
      const prevContent = editContentRef.current;

      api(`/notas/${prevId}`, {
        method: 'PUT',
        body: JSON.stringify({ titulo: prevTitle, conteudo: prevContent }),
      }).then((updated) => {
        setNotas(prev => prev.map(n => n.id === updated.id ? updated : n));
      }).catch(() => {});
    }

    if (autoSelectTitle) {
      shouldSelectTitleRef.current = true;
    }

    const nextTitle = nota.titulo ?? (nota.tipo === 'desenho' ? 'Novo Desenho' : '');
    const nextContent = nota.conteudo ?? (nota.tipo === 'desenho' ? '[]' : '');

    selectedNotaRef.current = nota;
    editTitleRef.current = nextTitle;
    editContentRef.current = nextContent;

    setSelectedNota(nota);
    setIsAiChatOpen(false);
    setIsGraphViewOpen(false);
    setIsFlashcardsOpen(false);
    setEditTitle(nextTitle);
    setCurrentContent(nextContent);
    setCurrentLine(1);
    setSaveStatus('idle');
    setOpenTabIds((prev) => (prev.includes(nota.id) ? prev : [...prev, nota.id]));
    try {
      localStorage.setItem(`synap_last_note_${id}`, nota.id);
    } catch {}

    if (autoSelectTitle) {
      setTimeout(() => {
        if (titleInputRef.current) {
          titleInputRef.current.focus();
          titleInputRef.current.select();
        }
      }, 50);
    }
  };

  const handleCloseTab = (tabId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

    // If closing the active note and it had pending changes, flush save
    if (selectedNotaRef.current?.id === tabId && saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
      const prevId = selectedNotaRef.current.id;
      const prevTitle = editTitleRef.current;
      const prevContent = editContentRef.current;

      api(`/notas/${prevId}`, {
        method: 'PUT',
        body: JSON.stringify({ titulo: prevTitle, conteudo: prevContent }),
      }).then((updated) => {
        setNotas(prev => prev.map(n => n.id === updated.id ? updated : n));
      }).catch(() => {});
    }

    setOpenTabIds((prev) => {
      const nextTabs = prev.filter((id) => id !== tabId);

      // If we are closing the currently selected note, switch active tab
      if (selectedNotaRef.current?.id === tabId) {
        if (nextTabs.length === 0) {
          selectedNotaRef.current = null;
          editTitleRef.current = '';
          editContentRef.current = '';
          setSelectedNota(null);
          setEditTitle('');
        } else {
          const currentIndex = prev.indexOf(tabId);
          const nextActiveId = currentIndex > 0 ? prev[currentIndex - 1] : nextTabs[0];
          const nextNota = notas.find((n) => n.id === nextActiveId);
          if (nextNota) {
            openNota(nextNota);
          } else {
            selectedNotaRef.current = null;
            editTitleRef.current = '';
            editContentRef.current = '';
            setSelectedNota(null);
            setEditTitle('');
          }
        }
      }

      return nextTabs;
    });
  };

  const toggleFolder = (pastaId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setExpandedFolders(prev => ({ ...prev, [pastaId]: !prev[pastaId] }));
  };

  const handleContextMenu = (e: React.MouseEvent, itemId: string, type: 'pasta' | 'nota', currentName: string) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ visible: true, x: e.clientX, y: e.clientY, id: itemId, type, currentName });
  };

  const handleExportNota = async (notaId: string) => {
    const nota = notas.find(n => n.id === notaId) || selectedNota;
    if (!nota) return;
    setContextMenu(null);

    if (typeof window !== 'undefined' && window.synapDesktop?.saveNoteToFile) {
      await window.synapDesktop.saveNoteToFile({
        defaultTitle: nota.titulo,
        content: nota.conteudo || '',
        extension: 'md',
      });
    } else {
      const blob = new Blob([nota.conteudo || ''], { type: 'text/markdown;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${(nota.titulo || 'nota').replace(/[\\/:*?"<>|]/g, '_')}.md`;
      link.click();
      URL.revokeObjectURL(url);
    }
  };

  const handleContextRename = () => {
    if (!contextMenu) return;
    if (contextMenu.type === 'pasta') {
      const targetPasta = pastas.find(p => p.id === contextMenu.id);
      setFolderModal({
        mode: 'rename',
        folderId: contextMenu.id,
        initialName: contextMenu.currentName || targetPasta?.nome || '',
      });
      setContextMenu(null);
      return;
    }
    // Set inline action up for note
    setInlineAction({
      type: 'rename',
      itemType: contextMenu.type,
      id: contextMenu.id,
      value: contextMenu.currentName
    });
    setContextMenu(null);
  };

  const handleContextDelete = () => {
    if (!contextMenu) return;
    const { id: targetId, type, currentName } = contextMenu;
    setContextMenu(null);
    setDeleteModal({
      visible: true,
      id: targetId,
      type,
      name: currentName,
    });
  };

  const handleConfirmDelete = async () => {
    if (!deleteModal) return;
    const { id: targetId, type } = deleteModal;
    setDeleteModal(null);

    try {
      if (type === 'pasta') {
        // Collect all subfolder IDs recursively to deselect note if open
        const getSubfolderIds = (pId: string): string[] => {
          const children = pastas.filter(p => p.parentId === pId);
          let ids = children.map(c => c.id);
          for (const child of children) {
            ids = ids.concat(getSubfolderIds(child.id));
          }
          return ids;
        };
        const deletedFolderIds = [targetId, ...getSubfolderIds(targetId)];

        await api(`/pastas/${targetId}`, { method: 'DELETE' });
        loadPastas();
        loadNotas();
        if (selectedNotaRef.current && deletedFolderIds.includes(selectedNotaRef.current.pastaId)) {
          if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
            saveTimeoutRef.current = null;
          }
          selectedNotaRef.current = null;
          editTitleRef.current = '';
          editContentRef.current = '';
          setSelectedNota(null);
          setEditTitle('');
        }
      } else {
        if (saveTimeoutRef.current && selectedNotaRef.current?.id === targetId) {
          clearTimeout(saveTimeoutRef.current);
          saveTimeoutRef.current = null;
        }
        await api(`/notas/${targetId}`, { method: 'DELETE' });
        loadNotas();
        if (selectedNotaRef.current?.id === targetId) {
          selectedNotaRef.current = null;
          editTitleRef.current = '';
          editContentRef.current = '';
          setSelectedNota(null);
          setEditTitle('');
        }
      }
    } catch (err: any) {
      console.error('Erro ao excluir item:', err);
      const itemDesc = type === 'pasta' ? 'a pasta' : 'a nota';
      showToast(`Não foi possível excluir ${itemDesc}. Tente novamente.`, 'error');
    }
  };

  const autoSaveNota = async (newTitle: string, newContent: string, noteIdToSave: string) => {
    if (currentUserRole === 'VIEWER') return;
    setSaveStatus('saving');
    try {
      const updated = await api(`/notas/${noteIdToSave}`, {
        method: 'PUT',
        body: JSON.stringify({ titulo: newTitle, conteudo: newContent }),
      });
      setNotas(prev => prev.map(n => n.id === updated.id ? updated : n));
      
      setSelectedNota((currentSelected: any) => {
        if (currentSelected?.id === updated.id) {
          selectedNotaRef.current = updated;
          return updated;
        }
        return currentSelected;
      });
      
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (err: any) { 
      console.error('Falha ao salvar nota automaticamente:', err);
      setSaveStatus('idle');
    }
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (currentUserRole === 'VIEWER') return;
    const val = e.target.value;
    setEditTitle(val);
    editTitleRef.current = val;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    setSaveStatus('saving');
    const currentNoteId = selectedNotaRef.current?.id;
    if (currentNoteId) {
      saveTimeoutRef.current = setTimeout(() => autoSaveNota(val, editContentRef.current, currentNoteId), 1000);
    }
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedNota?.tipo === 'texto') {
        const editorDiv = document.getElementById(`synap-editor-${selectedNota.id}`);
        if (editorDiv) {
          editorDiv.focus();
          const range = document.createRange();
          range.selectNodeContents(editorDiv);
          range.collapse(false);
          const sel = window.getSelection();
          sel?.removeAllRanges();
          sel?.addRange(range);
        }
      } else {
        e.currentTarget.blur();
      }
    }
  };

  const handleContentChange = useCallback((val: string) => {
    if (currentUserRole === 'VIEWER') return;
    editContentRef.current = val;
    setCurrentContent(val);
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    setSaveStatus('saving');
    const currentNoteId = selectedNotaRef.current?.id;
    const currentTitle = editTitleRef.current;
    if (currentNoteId) {
      saveTimeoutRef.current = setTimeout(() => autoSaveNota(currentTitle, val, currentNoteId), 1000);
    }
  }, [currentUserRole]);

  // DRAG AND DROP LOGIC
  const handleDragStart = (e: React.DragEvent, type: 'pasta' | 'nota', itemId: string) => {
    e.stopPropagation();
    e.dataTransfer.setData('type', type);
    e.dataTransfer.setData('itemId', itemId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDropToPasta = async (e: React.DragEvent, targetPastaId: string | null) => {
    e.preventDefault();
    e.stopPropagation();
    const type = e.dataTransfer.getData('type');
    const itemId = e.dataTransfer.getData('itemId');

    if (!itemId) return;

    if (type === 'nota') {
      const nota = notas.find(n => n.id === itemId);
      if (nota && nota.pastaId === targetPastaId) return;
      try {
        await api(`/notas/${itemId}`, {
          method: 'PUT',
          body: JSON.stringify({ pastaId: targetPastaId }),
        });
        loadNotas();
        if (targetPastaId) setExpandedFolders(prev => ({ ...prev, [targetPastaId]: true }));
      } catch (err: any) {
        console.error('Erro ao mover nota:', err);
        showToast('Não foi possível mover a nota. Tente novamente.', 'error');
      }
    } else if (type === 'pasta') {
      if (itemId === targetPastaId) return;
      try {
        await api(`/pastas/${itemId}`, {
          method: 'PUT',
          body: JSON.stringify({ parentId: targetPastaId }),
        });
        loadPastas();
        if (targetPastaId) setExpandedFolders(prev => ({ ...prev, [targetPastaId]: true }));
      } catch (err: any) {
        console.error('Erro ao mover pasta:', err);
        showToast('Não foi possível mover a pasta. Tente novamente.', 'error');
      }
    }
  };

  const renderInlineInput = () => {
    return (
      <input
        ref={inlineInputRef}
        value={inlineAction?.value || ''}
        onChange={(e) => setInlineAction(prev => prev ? { ...prev, value: e.target.value } : null)}
        onBlur={handleInlineCommit}
        onKeyDown={handleInlineKeyDown}
        placeholder="Nome..."
        style={{
          width: '100%',
          padding: '4px 8px',
          fontSize: '13px',
          background: 'var(--background)',
          border: '1px solid var(--accents-5)',
          borderRadius: '4px',
          outline: 'none',
          color: 'var(--foreground)'
        }}
      />
    );
  };

  const renderNota = (nota: any) => {
    const isRenaming = inlineAction?.type === 'rename' && inlineAction.itemType === 'nota' && inlineAction.id === nota.id;
    const isDrawing = nota.tipo === 'desenho';
    return (
      <div 
        key={nota.id} 
        onClick={(e) => { e.stopPropagation(); openNota(nota); }}
        onContextMenu={(e) => handleContextMenu(e, nota.id, 'nota', nota.titulo)}
        draggable
        onDragStart={(e) => handleDragStart(e, 'nota', nota.id)}
        style={{ 
          padding: '6px 8px', 
          fontSize: '13px', 
          color: selectedNota?.id === nota.id ? 'var(--foreground)' : 'var(--accents-5)',
          background: selectedNota?.id === nota.id ? 'var(--brand-dim)' : 'transparent',
          boxShadow: selectedNota?.id === nota.id ? 'inset 2px 0 0 var(--brand)' : 'none',
          borderRadius: '5px',
          cursor: 'pointer',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          display: 'flex', alignItems: 'center', gap: '8px',
          transition: 'all var(--duration-smooth) var(--ease-smooth)',
        }}
        className="hover:bg-[var(--accents-2)] hover:text-[var(--foreground)] active:scale-[0.99]"
      >
        {isDrawing ? (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
            <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
          </svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
        )}
        {isRenaming ? renderInlineInput() : nota.titulo}
      </div>
    );
  };

  const renderPasta = (pasta: any, level: number = 0) => {
    const childPastas = pastas.filter(p => p.parentId === pasta.id);
    const childNotas = notas.filter(n => n.pastaId === pasta.id);
    const isExpanded = expandedFolders[pasta.id];

    return (
      <div key={pasta.id} style={{ paddingLeft: level > 0 ? '16px' : '0' }}>
        <div 
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 8px', borderRadius: '5px', background: 'transparent', transition: 'all var(--duration-smooth) var(--ease-smooth)' }}
          onClick={(e) => toggleFolder(pasta.id, e)}
          onContextMenu={(e) => handleContextMenu(e, pasta.id, 'pasta', pasta.nome)}
          onDragOver={handleDragOver}
          onDrop={(e) => handleDropToPasta(e, pasta.id)}
          draggable
          onDragStart={(e) => handleDragStart(e, 'pasta', pasta.id)}
          className="hover:bg-[var(--accents-2)] active:scale-[0.99] group"
        >
          <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--foreground)', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', width: '100%' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, transform: isExpanded ? 'rotate(90deg)' : 'none', transition: 'transform var(--duration-smooth) var(--ease-smooth)' }}>
              <path d="m9 18 6-6-6-6"/>
            </svg>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-1.22-1.8A2 2 0 0 0 8.53 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/></svg>
            {pasta.nome}
          </span>
        </div>
        
        {/* Children (Only shown if expanded) */}
        {isExpanded && (
          <div style={{ marginLeft: '10px', borderLeft: '1px solid var(--accents-2)', paddingLeft: '4px' }}>
            {childPastas.map(p => renderPasta(p, level + 1))}
            {childNotas.map(nota => renderNota(nota))}
          </div>
        )}
      </div>
    );
  };

  if (isLoading || !workspace) {
    return <LoadingScreen onRetry={loadInitialWorkspaceData} />;
  }

  const rootPastas = pastas.filter(p => !p.parentId);
  const notasSemPasta = notas.filter(n => !n.pastaId);

  const renderFileTree = () => (
    <div 
      style={{ flex: 1, overflowY: 'auto', padding: '6px 8px' }}
      className="no-scrollbar"
      onDragOver={handleDragOver}
      onDrop={(e) => handleDropToPasta(e, null)} // Drop to root
    >
      {filteredNotasBySearch ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <div style={{ padding: '6px 8px', fontSize: '11px', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--accents-5)' }}>
            Resultados da busca ({filteredNotasBySearch.length})
          </div>
          {filteredNotasBySearch.length === 0 ? (
            <div style={{ padding: '16px 8px', fontSize: '12px', color: 'var(--accents-4)', textAlign: 'center' }}>
              Nenhum documento encontrado.
            </div>
          ) : (
            filteredNotasBySearch.map((nota) => renderNota(nota))
          )}
        </div>
      ) : (
        /* Unified Tree (Folders first, then files) */
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {rootPastas.map(pasta => renderPasta(pasta, 0))}
          {notasSemPasta.map(nota => renderNota(nota))}
        </div>
      )}
    </div>
  );

  const handleWorkspaceCreated = (newWs: any) => {
    setAllWorkspaces((prev) => [...prev, newWs]);
    router.push(`/workspaces/${newWs.id}`);
  };

  const handleWorkspaceUpdated = (updatedWs: any) => {
    setWorkspace(updatedWs);
    setAllWorkspaces((prev) => prev.map((w) => (w.id === updatedWs.id ? updatedWs : w)));
  };

  const handleWorkspaceDeleted = (deletedId: string) => {
    const remaining = allWorkspaces.filter((w) => w.id !== deletedId);
    setAllWorkspaces(remaining);
    if (remaining.length > 0) {
      router.push(`/workspaces/${remaining[0].id}`);
    } else {
      router.push('/dashboard');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%', flex: 1, minHeight: 0, overflow: 'hidden', background: 'var(--discord-rail)' }}>
      
      {/* GLOBAL CONTEXT MENU */}
      {contextMenu && (
        <div style={{ position: 'fixed', top: contextMenu.y, left: contextMenu.x, zIndex: 100, background: 'var(--discord-sidebar)', border: '1px solid var(--discord-border)', borderRadius: '6px', boxShadow: '0 8px 24px rgba(0,0,0,0.3)', padding: '4px', minWidth: '160px', fontSize: '13px', color: 'var(--discord-text-primary)' }}>
          {currentUserRole !== 'VIEWER' && contextMenu.type === 'pasta' && (
            <>
              <div onClick={() => handleTriggerCreatePasta(contextMenu.id)} className="hover:bg-[var(--discord-hover)] text-[var(--discord-text-primary)]" style={{ padding: '6px 8px', borderRadius: '4px', cursor: 'pointer' }}>Nova Subpasta</div>
              <div onClick={() => handleCreateNota(contextMenu.id)} className="hover:bg-[var(--discord-hover)] text-[var(--discord-text-primary)]" style={{ padding: '6px 8px', borderRadius: '4px', cursor: 'pointer' }}>Nova Nota</div>
              <div onClick={() => handleCreateDesenho(contextMenu.id)} className="hover:bg-[var(--discord-hover)] text-[var(--discord-text-primary)]" style={{ padding: '6px 8px', borderRadius: '4px', cursor: 'pointer' }}>Novo Desenho</div>
              <div style={{ height: 1, background: 'var(--discord-border)', margin: '4px 0' }} />
            </>
          )}
          {contextMenu.type === 'nota' && (
            <>
              <div onClick={() => handleExportNota(contextMenu.id)} className="hover:bg-[var(--discord-hover)] text-[var(--discord-text-primary)]" style={{ padding: '6px 8px', borderRadius: '4px', cursor: 'pointer' }}>Exportar (.md)</div>
              {currentUserRole !== 'VIEWER' && <div style={{ height: 1, background: 'var(--discord-border)', margin: '4px 0' }} />}
            </>
          )}
          {currentUserRole !== 'VIEWER' && (
            <>
              <div onClick={handleContextRename} className="hover:bg-[var(--discord-hover)] text-[var(--discord-text-primary)]" style={{ padding: '6px 8px', borderRadius: '4px', cursor: 'pointer' }}>Renomear</div>
              <div onClick={handleContextDelete} className="hover:bg-[var(--discord-hover)]" style={{ padding: '6px 8px', borderRadius: '4px', cursor: 'pointer', color: 'var(--error)' }}>Excluir</div>
            </>
          )}
        </div>
      )}

      {/* CUSTOM DELETE CONFIRMATION MODAL */}
      {/* CUSTOM DELETE CONFIRMATION MODAL */}
      {deleteModal && (
        <div 
          className="fixed inset-0 z-[2000] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 select-none animate-in fade-in duration-150"
          onClick={() => setDeleteModal(null)}
        >
          <div 
            className="w-full max-w-[420px] bg-[var(--accents-1)] border border-[var(--discord-border)] rounded-lg shadow-lg overflow-hidden flex flex-col animate-smooth-pop"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[var(--error)]/12 text-[var(--error)] border border-[var(--error)]/20 flex items-center justify-center shrink-0">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 6h18"/>
                    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
                    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
                    <line x1="10" y1="11" x2="10" y2="17"/>
                    <line x1="14" y1="11" x2="14" y2="17"/>
                  </svg>
                </div>
                <div>
                  <h3 className="text-base font-semibold text-white leading-tight">
                    Excluir {deleteModal.type === 'pasta' ? 'Pasta' : 'Nota'}
                  </h3>
                  <span className="text-xs text-[var(--accents-5)]">
                    Esta ação é irreversível
                  </span>
                </div>
              </div>

              <p className="text-sm text-[var(--accents-5)] leading-relaxed">
                Tem certeza de que deseja excluir <strong className="text-white">"{deleteModal.name}"</strong>? {deleteModal.type === 'pasta' ? 'Todas as subpastas e notas contidas nela também serão excluídas permanentemente.' : 'Esta ação não poderá ser desfeita.'}
              </p>
            </div>

            <div className="bg-[var(--background)] border-t border-[var(--discord-border)] px-6 py-3.5 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setDeleteModal(null)}
                className="h-9 px-4 text-xs font-medium rounded-[4px] bg-[var(--accents-2)] hover:bg-[var(--accents-3)] border border-[var(--discord-border)] text-[var(--accents-6)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="h-9 px-5 text-xs font-semibold rounded-[4px] bg-[var(--error)] hover:opacity-90 text-white transition-colors cursor-pointer"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────
          DISCORD UNIFIED 3-COLUMN LAYOUT
          ───────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'row', height: '100%', width: '100%', minHeight: 0, overflow: 'hidden', position: 'relative' }}>
        
        {/* COLUMN 1: DISCORD WORKSPACE RAIL (72px) */}
        <WorkspaceRail
          workspaces={allWorkspaces}
          activeWorkspaceId={id}
          currentUser={currentUser}
          isSidebarOpen={isSidebarOpen}
          onSelectWorkspace={(wsId) => router.push(`/workspaces/${wsId}`)}
          onOpenCreateModal={() => setIsCreateWorkspaceModalOpen(true)}
          onOpenSettingsModal={() => setIsSettingsOpen(true)}
          onGoHome={() => router.push('/dashboard')}
        />

        {/* COLUMN 2: DISCORD CHANNEL SIDEBAR (240px) */}
        {(!isMobile || isSidebarOpen) && isSidebarOpen && (
          <DiscordChannelSidebar
            workspace={workspace}
            pastas={pastas}
            notas={notas}
            currentUser={currentUser}
            isOwner={isOwner}
            currentUserRole={currentUserRole}
            onOpenLeaveWorkspace={() => setIsLeaveModalOpen(true)}
            selectedNota={selectedNota}
            isGraphViewOpen={isGraphViewOpen}
            isFlashcardsOpen={isFlashcardsOpen}
            isAiChatOpen={isAiChatOpen}
            isTerminalOpen={isTerminalOpen}
            sidebarSearch={sidebarSearch}
            setSidebarSearch={setSidebarSearch}
            expandedFolders={expandedFolders}
            toggleFolder={toggleFolder}
            onSelectNota={openNota}
            onOpenGraph={() => {
              setIsGraphViewOpen(true);
              setIsFlashcardsOpen(false);
              setIsAiChatOpen(false);
            }}
            onOpenFlashcards={() => {
              setIsFlashcardsOpen(true);
              setIsGraphViewOpen(false);
              setIsAiChatOpen(false);
            }}
            onOpenAiChat={() => {
              setIsAiChatOpen((prev) => !prev);
              setIsGraphViewOpen(false);
              setIsFlashcardsOpen(false);
            }}
            onOpenTerminal={() => setIsTerminalOpen((prev) => !prev)}
            onOpenWorkspaceSettings={() => setIsWorkspaceSettingsModalOpen(true)}
            onOpenUserSettings={() => setIsSettingsOpen(true)}
            onOpenLogoutConfirm={() => setIsLogoutConfirmOpen(true)}
            onOpenShareModal={() => setIsShareModalOpen(true)}
            onToggleSidebar={() => setIsSidebarOpen(false)}
            onTriggerCreatePasta={handleTriggerCreatePasta}
            onTriggerCreateNota={handleCreateNota}
            onTriggerCreateDesenho={handleCreateDesenho}
            onDragStart={handleDragStart}
            onDropToPasta={handleDropToPasta}
            onContextMenu={(e, itemId, itemType, currentName) => {
              setContextMenu({
                visible: true,
                x: Math.min(e.clientX, window.innerWidth - 180),
                y: Math.min(e.clientY, window.innerHeight - 200),
                id: itemId,
                type: itemType,
                currentName,
              });
            }}
            inlineAction={inlineAction}
            setInlineAction={setInlineAction}
            onInlineSubmit={handleInlineCommit}
            inlineInputRef={inlineInputRef}
          />
        )}

        {/* COLUMN 3: MAIN WORKSPACE CONTENT CONTAINER (HEADER + VIEWS) */}
        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, overflow: 'hidden', position: 'relative', background: 'var(--discord-canvas)', paddingBottom: isMobile ? '64px' : '0' }}>
          
          {/* DISCORD CHANNEL TOP HEADER */}
          {!isAiChatOpen && (
            <DiscordChannelHeader
              selectedNota={selectedNota}
              isGraphViewOpen={isGraphViewOpen}
              isFlashcardsOpen={isFlashcardsOpen}
              isAiChatOpen={isAiChatOpen}
              isTerminalOpen={isTerminalOpen}
              openTabs={openTabsList}
              onSelectTab={openNota}
              onCloseTab={(e, tabId) => handleCloseTab(tabId, e)}
              onNewTab={() => handleCreateNota()}
              saveStatus={saveStatus}
              editTitle={editTitle}
              setEditTitle={setEditTitle}
              pastaName={pastas.find((p) => p.id === selectedNota?.pastaId)?.nome}
              onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
              isSidebarOpen={isSidebarOpen}
              onToggleRightSidebar={() => setIsRightSidebarOpen((prev) => !prev)}
              isRightSidebarOpen={isRightSidebarOpen}
              onToggleGraph={() => {
                setIsGraphViewOpen((prev) => !prev);
                if (!isGraphViewOpen) setIsFlashcardsOpen(false);
              }}
              onToggleFlashcards={() => {
                setIsFlashcardsOpen((prev) => !prev);
                if (!isFlashcardsOpen) setIsGraphViewOpen(false);
              }}
              onToggleAiChat={() => setIsAiChatOpen((prev) => !prev)}
              onOpenShareModal={() => setIsShareModalOpen(true)}
            />
          )}
          
          {/* CSS for spinner */}
          <style dangerouslySetInnerHTML={{__html: `
            @keyframes spin { 100% { transform: rotate(360deg); } }
          `}} />

        {/* Main Content: Flashcards View OR Graph View OR Drawing Canvas OR Note Editor */}
        {isFlashcardsOpen ? (
          <div style={{ flex: 1, display: 'flex', position: 'relative', overflow: 'hidden' }}>
            <FlashcardsView
              workspace={workspace}
              notas={notas}
              onOpenNota={(nota) => {
                openNota(nota);
                setIsFlashcardsOpen(false);
              }}
              onClose={() => setIsFlashcardsOpen(false)}
            />
          </div>
        ) : isGraphViewOpen ? (
          <div style={{ flex: 1, display: 'flex', position: 'relative', overflow: 'hidden' }}>
            <GraphView
              workspace={workspace}
              pastas={pastas}
              notas={notas}
              onOpenNota={(nota) => {
                openNota(nota);
                setIsGraphViewOpen(false);
              }}
              onClose={() => setIsGraphViewOpen(false)}
              onUpdateWorkspace={(updated) => setWorkspace(updated)}
            />
          </div>
        ) : isAiChatOpen ? (
          <div style={{ flex: 1, display: 'flex', position: 'relative', overflow: 'hidden' }}>
            <AiChatView
              workspaceId={id}
              notas={notas}
              pastas={pastas}
              currentUser={currentUser}
              activeNote={selectedNota}
              onOpenNota={(nota) => {
                openNota(nota);
                setIsAiChatOpen(false);
              }}
              onRefreshWorkspace={refreshData}
              onClose={() => setIsAiChatOpen(false)}
              onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
              isSidebarOpen={isSidebarOpen}
            />
          </div>
        ) : (
          <div style={{ flex: 1, display: 'flex', position: 'relative', overflow: 'hidden' }}>
            {selectedNota?.tipo === 'desenho' ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
            {/* Minimal Title Header for Canvas */}
            <div style={{ padding: '8px 16px', background: 'var(--discord-sidebar)', borderBottom: '1px solid var(--discord-border)', display: 'flex', alignItems: 'center' }}>
              <input
                ref={titleInputRef}
                value={editTitle}
                onChange={handleTitleChange}
                onKeyDown={handleTitleKeyDown}
                placeholder="Nome do Desenho..."
                readOnly={currentUserRole === 'VIEWER'}
                style={{ fontSize: '15px', fontWeight: 600, border: 'none', background: 'transparent', outline: 'none', width: '100%', color: 'var(--foreground)' }}
              />
            </div>
            <div style={{ flex: 1, position: 'relative' }}>
              <DrawingCanvas
                key={selectedNota.id}
                notaId={selectedNota?.id}
                initialData={editContentRef.current}
                onChange={handleContentChange}
                title={editTitle}
                notas={notas}
                workspaceId={id}
                isCollaborative={workspace?.isCollaborative}
                onOpenNota={(n) => openNota(n)}
                onOpenCard={(c) => setSelectedCardModal(c)}
              />
            </div>
            {/* Bottom-Right Floating Status Pill for Canvas */}
            <div 
              className="absolute bottom-4 right-4 z-20 flex items-center gap-2.5 px-3.5 py-1.5 bg-[var(--discord-sidebar)]/90 backdrop-blur-md border border-[var(--discord-border)] rounded-full shadow-lg shadow-black/25 text-[11px] font-mono text-[var(--discord-text-muted)] select-none pointer-events-auto"
            >
              <div className="flex items-center gap-1.5 text-[var(--accents-5)]">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 19l7-7 3 3-7 7-3-3z"/>
                  <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/>
                  <path d="M2 2l7.586 7.586"/>
                  <circle cx="11" cy="11" r="2"/>
                </svg>
                <span>Canvas</span>
              </div>

              <span className="text-[var(--accents-3)] select-none">•</span>

              <div className="flex items-center gap-1.5 whitespace-nowrap">
                {saveStatus === 'saving' ? (
                  <div className="flex items-center gap-1 text-[var(--accents-5)]">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 1s linear infinite' }}><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                    <span>Salvando...</span>
                  </div>
                ) : saveStatus === 'saved' ? (
                  <div className="flex items-center gap-1 text-[var(--foreground)]">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                    <span>Salvo</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 text-[var(--accents-4)] opacity-70">
                    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/></svg>
                    <span>Sincronizado</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
            {selectedNota ? (
              <>
                <div style={{ flex: 1, overflowY: 'auto' }}>
                  <div 
                    style={{ 
                      padding: isMobile ? '20px 16px 80px' : '48px 64px 80px', 
                      maxWidth: editorWidth, 
                      width: '100%', 
                      margin: '0 auto', 
                      display: 'flex', 
                      flexDirection: 'column', 
                      minHeight: '100%' 
                    }}
                  >
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: isMobile ? '16px' : '32px' }}>
                      <input 
                        ref={titleInputRef}
                        value={editTitle}
                        onChange={handleTitleChange}
                        onKeyDown={handleTitleKeyDown}
                        placeholder="Sem Título"
                        readOnly={currentUserRole === 'VIEWER'}
                        style={{ 
                          fontFamily: editorFontFamily || 'inherit',
                          fontSize: isMobile ? '24px' : '32px', 
                          fontWeight: 600, 
                          letterSpacing: '-0.04em', 
                          border: 'none', 
                          background: 'transparent', 
                          outline: 'none', 
                          width: '100%', 
                          color: 'var(--foreground)' 
                        }}
                      />
                    </div>

                    <div style={{ flex: 1 }}>
                      <Editor 
                        key={selectedNota?.id}
                        notaId={selectedNota?.id}
                        value={editContentRef.current}
                        onChange={handleContentChange}
                        readOnly={currentUserRole === 'VIEWER'}
                        onCursorLineChange={setCurrentLine}
                        fontFamily={editorFontFamily}
                        fontSize={editorFontSize}
                        slashMenuEnabled={slashMenuEnabled}
                        wikilinksEnabled={wikilinksEnabled}
                        placeholder={t('editor_placeholder')}
                        notas={notas}
                        onOpenNota={(n) => openNota(n)}
                        workspaceId={workspace?.id}
                        isCollaborative={workspace?.isCollaborative}
                        onOpenCard={(c) => setSelectedCardModal(c)}
                        onUpdateNota={(updated) => {
                          setNotas((prev) => {
                            const exists = prev.some((n) => n.id === updated.id);
                            if (exists) {
                              return prev.map((n) => (n.id === updated.id ? updated : n));
                            }
                            return [...prev, updated];
                          });
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Bottom-Right Floating Status & Statistics Pill */}
                <div 
                  className="absolute bottom-4 right-4 z-20 flex items-center gap-2.5 px-3.5 py-1.5 bg-[var(--discord-sidebar)]/90 backdrop-blur-md border border-[var(--discord-border)] rounded-full shadow-lg shadow-black/25 text-[11px] font-mono text-[var(--discord-text-muted)] select-none pointer-events-auto"
                >
                  {/* Active Cursor Line */}
                  <div className="flex items-center gap-1 text-[var(--foreground)] font-medium whitespace-nowrap" title="Linha atual onde o cursor está posicionado">
                    <span>Ln {currentLine}</span>
                  </div>

                  <span className="text-[var(--accents-3)] select-none">•</span>

                  {/* Words count */}
                  <div className="flex items-center gap-1 whitespace-nowrap" title="Quantidade de palavras na nota">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
                      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
                    </svg>
                    <span>{noteStats.words} {noteStats.words === 1 ? 'palavra' : 'palavras'}</span>
                  </div>

                  <span className="text-[var(--accents-3)] select-none">•</span>

                  {/* Characters count */}
                  <div className="flex items-center gap-1 whitespace-nowrap" title="Quantidade de caracteres na nota">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="4 7 4 4 20 4 20 7"/>
                      <line x1="9" y1="20" x2="15" y2="20"/>
                      <line x1="12" y1="4" x2="12" y2="20"/>
                    </svg>
                    <span>{noteStats.chars} {noteStats.chars === 1 ? 'caractere' : 'caracteres'}</span>
                  </div>

                  <span className="text-[var(--accents-3)] select-none">•</span>

                  {/* Links count */}
                  <div className="flex items-center gap-1 whitespace-nowrap" title="Total de links presentes no documento">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                    </svg>
                    <span>{noteStats.links} {noteStats.links === 1 ? 'link' : 'links'}</span>
                  </div>

                  <span className="text-[var(--accents-3)] select-none">•</span>

                  {/* Connections count */}
                  <div className="flex items-center gap-1 whitespace-nowrap" title="Conexões bidirecionais no grafo (links + backlinks)">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="18" cy="5" r="3"/>
                      <circle cx="6" cy="12" r="3"/>
                      <circle cx="18" cy="19" r="3"/>
                      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
                      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
                    </svg>
                    <span>{noteStats.connections} {noteStats.connections === 1 ? 'conexão' : 'conexões'}</span>
                  </div>

                  <span className="text-[var(--accents-3)] select-none">•</span>

                  {/* Save status indicator */}
                  <div className="flex items-center gap-1.5 whitespace-nowrap">
                    {saveStatus === 'saving' ? (
                      <div className="flex items-center gap-1 text-[var(--accents-5)]">
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 1s linear infinite' }}><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                        <span>Salvando...</span>
                      </div>
                    ) : saveStatus === 'saved' ? (
                      <div className="flex items-center gap-1 text-[var(--foreground)]">
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                        <span>Salvo</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-[var(--accents-4)] opacity-70">
                        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/></svg>
                        <span>Sincronizado</span>
                      </div>
                    )}
                  </div>

                  <span className="text-[var(--accents-3)] select-none">•</span>

                  {/* 3-Dots Actions Menu Container */}
                  <div className="relative flex items-center" ref={actionsMenuRef}>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setIsActionsMenuOpen((prev) => !prev);
                        setActiveSubmenu('none');
                      }}
                      className={`p-1 rounded-md transition-all duration-150 cursor-pointer flex items-center justify-center ${
                        isActionsMenuOpen
                          ? 'bg-[var(--accents-2)] text-[var(--foreground)]'
                          : 'text-[var(--accents-5)] hover:text-[var(--foreground)] hover:bg-[var(--accents-2)]'
                      }`}
                      title="Mais opções da nota (Tipografia, Tamanho, PDF, Excluir)"
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="1.5"/>
                        <circle cx="19" cy="12" r="1.5"/>
                        <circle cx="5" cy="12" r="1.5"/>
                      </svg>
                    </button>

                    {/* Popover Dropdown (Opens upwards) */}
                    {isActionsMenuOpen && (
                      <div
                        className="absolute bottom-full right-0 mb-2 w-64 bg-[var(--discord-sidebar)]/95 border border-[var(--discord-border)] rounded-lg shadow-2xl p-1.5 backdrop-blur-md animate-smooth-pop text-xs text-[var(--discord-text-primary)] z-50 select-none font-sans"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {activeSubmenu === 'none' && (
                          <div className="flex flex-col gap-0.5">
                            {/* Font Choice */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setActiveSubmenu('font');
                              }}
                              className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-md hover:bg-[var(--accents-1)] transition-colors cursor-pointer text-left"
                            >
                              <div className="flex items-center gap-2">
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--accents-5)]">
                                  <polyline points="4 7 4 4 20 4 20 7"/>
                                  <line x1="9" y1="20" x2="15" y2="20"/>
                                  <line x1="12" y1="4" x2="12" y2="20"/>
                                </svg>
                                <span className="font-medium">Fonte do editor</span>
                              </div>
                              <div className="flex items-center gap-1 text-[11px] text-[var(--accents-4)] font-mono">
                                <span>{TOP_FONTS.find(f => f.family === editorFontFamily)?.name || 'Geist Sans'}</span>
                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                              </div>
                            </button>

                            {/* Font Size Choice */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setActiveSubmenu('size');
                              }}
                              className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-md hover:bg-[var(--accents-1)] transition-colors cursor-pointer text-left"
                            >
                              <div className="flex items-center gap-2">
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--accents-5)]">
                                  <path d="M4 12h16"/>
                                  <path d="M4 6h16"/>
                                  <path d="M4 18h16"/>
                                </svg>
                                <span className="font-medium">Tamanho da fonte</span>
                              </div>
                              <div className="flex items-center gap-1 text-[11px] text-[var(--accents-4)] font-mono">
                                <span>{editorFontSize}</span>
                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                              </div>
                            </button>

                            {/* Export PDF */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleExportPDF();
                              }}
                              className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-md hover:bg-[var(--accents-1)] transition-colors cursor-pointer text-left"
                            >
                              <div className="flex items-center gap-2">
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--accents-5)]">
                                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                                  <polyline points="14 2 14 8 20 8"/>
                                  <line x1="16" y1="13" x2="8" y2="13"/>
                                  <line x1="16" y1="17" x2="8" y2="17"/>
                                  <polyline points="10 9 9 9 8 9"/>
                                </svg>
                                <span className="font-medium">Exportar para PDF</span>
                              </div>
                              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--accents-4)]">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                                <polyline points="7 10 12 15 17 10"/>
                                <line x1="12" y1="15" x2="12" y2="3"/>
                              </svg>
                            </button>

                            <div className="w-full h-[1px] bg-[var(--accents-2)] my-1" />

                            {/* Delete Note */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setIsActionsMenuOpen(false);
                                setDeleteModal({
                                  visible: true,
                                  id: selectedNota.id,
                                  type: 'nota',
                                  name: selectedNota.titulo || 'Sem Título',
                                });
                              }}
                              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-[var(--error)] hover:bg-[var(--accents-1)] transition-colors cursor-pointer text-left"
                            >
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="3 6 5 6 21 6"/>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                              </svg>
                              <span className="font-medium">Excluir nota</span>
                            </button>
                          </div>
                        )}

                        {activeSubmenu === 'font' && (
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-1.5 px-1 py-1 border-b border-[var(--accents-2)] mb-1">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setActiveSubmenu('none');
                                }}
                                className="p-1 rounded hover:bg-[var(--accents-2)] transition-colors cursor-pointer text-[var(--accents-5)] hover:text-[var(--foreground)]"
                              >
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
                              </button>
                              <span className="font-medium text-xs text-[var(--foreground)]">Escolha a fonte</span>
                            </div>
                            <div className="max-h-[220px] overflow-y-auto no-scrollbar flex flex-col gap-0.5">
                              {TOP_FONTS.map((font) => {
                                const isSelected = editorFontFamily === font.family;
                                return (
                                  <button
                                    key={font.id}
                                    type="button"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      handleUpdatePreference('editorFontFamily', font.family);
                                    }}
                                    className={`w-full flex items-center justify-between px-2 py-1.5 rounded-md text-left transition-colors cursor-pointer ${
                                      isSelected
                                        ? 'bg-[var(--accents-2)] text-[var(--foreground)]'
                                        : 'hover:bg-[var(--accents-1)] text-[var(--accents-6)]'
                                    }`}
                                  >
                                    <div className="flex flex-col">
                                      <span style={{ fontFamily: font.family }} className="text-[13px] font-medium leading-tight">
                                        {font.name}
                                      </span>
                                      <span className="text-[10px] text-[var(--accents-4)]">
                                        {font.category}
                                      </span>
                                    </div>
                                    {isSelected && (
                                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--foreground)]">
                                        <polyline points="20 6 9 17 4 12"/>
                                      </svg>
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {activeSubmenu === 'size' && (
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-1.5 px-1 py-1 border-b border-[var(--accents-2)] mb-1">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setActiveSubmenu('none');
                                }}
                                className="p-1 rounded hover:bg-[var(--accents-2)] transition-colors cursor-pointer text-[var(--accents-5)] hover:text-[var(--foreground)]"
                              >
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
                              </button>
                              <span className="font-medium text-xs text-[var(--foreground)]">Tamanho da fonte</span>
                            </div>
                            <div className="flex flex-col gap-0.5">
                              {FONT_SIZES.map((size) => {
                                const isSelected = editorFontSize === size.value;
                                return (
                                  <button
                                    key={size.value}
                                    type="button"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      handleUpdatePreference('editorFontSize', size.value);
                                    }}
                                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-left transition-colors cursor-pointer ${
                                      isSelected
                                        ? 'bg-[var(--accents-2)] text-[var(--foreground)]'
                                        : 'hover:bg-[var(--accents-1)] text-[var(--accents-6)]'
                                    }`}
                                  >
                                    <span style={{ fontSize: size.value }} className="font-medium">
                                      {size.label}
                                    </span>
                                    {isSelected && (
                                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--foreground)]">
                                        <polyline points="20 6 9 17 4 12"/>
                                      </svg>
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--accents-5)', padding: '24px', textAlign: 'center', userSelect: 'none' }}>
                <div style={{ opacity: 0.85, marginBottom: '24px', transition: 'opacity 0.2s ease' }} className="hover:opacity-100">
                  <SynapLogo size={56} />
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center' }}>
                  <button
                    type="button"
                    onClick={() => handleCreateNota(null)}
                    className="geist-button-secondary"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      height: '32px',
                      padding: '0 14px',
                      fontSize: '12.5px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                    }}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                      <polyline points="14 2 14 8 20 8"/>
                    </svg>
                    <span>Nova Nota</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleCreateDesenho(null)}
                    className="geist-button-secondary"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      height: '32px',
                      padding: '0 14px',
                      fontSize: '12.5px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                    }}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
                    </svg>
                    <span>Novo Desenho</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleTriggerCreatePasta(null)}
                    className="geist-button-secondary"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      height: '32px',
                      padding: '0 14px',
                      fontSize: '12.5px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                    }}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-1.22-1.8A2 2 0 0 0 8.53 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/>
                    </svg>
                    <span>Nova Pasta</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

      </div>
    )}
        </main>

        {/* COLUMN 4: DISCORD RIGHT TOOLS SIDEBAR (220px) */}
        {!isMobile && (
          <DiscordToolsSidebar
            isOpen={isRightSidebarOpen}
            onClose={() => setIsRightSidebarOpen(false)}
            isGraphViewOpen={isGraphViewOpen}
            isFlashcardsOpen={isFlashcardsOpen}
            isAiChatOpen={isAiChatOpen}
            isTerminalOpen={isTerminalOpen}
            onToggleGraph={() => {
              setIsGraphViewOpen((prev) => !prev);
              if (!isGraphViewOpen) {
                setIsFlashcardsOpen(false);
                setIsAiChatOpen(false);
              }
            }}
            onToggleFlashcards={() => {
              setIsFlashcardsOpen((prev) => !prev);
              if (!isFlashcardsOpen) {
                setIsGraphViewOpen(false);
                setIsAiChatOpen(false);
              }
            }}
            onToggleAiChat={() => {
              setIsAiChatOpen((prev) => !prev);
              if (!isAiChatOpen) {
                setIsGraphViewOpen(false);
                setIsFlashcardsOpen(false);
              }
            }}
            onToggleTerminal={() => setIsTerminalOpen((prev) => !prev)}
          />
        )}
      </div>

        {/* Retractable Bottom Terminal Drawer (VS Code style) */}
        {isTerminalOpen && (
          <Terminal
            workspace={workspace}
            pastas={pastas}
            notas={notas}
            currentUserId={currentUser?.id}
            onRefreshData={refreshData}
            onOpenNota={(nota) => openNota(nota)}
            onClose={() => setIsTerminalOpen(false)}
          />
        )}

        {/* Interactive Connected Card Preview Modal */}
        {selectedCardModal && (
          <CardModal
            card={selectedCardModal}
            onClose={() => setSelectedCardModal(null)}
          />
        )}

        {/* Global Settings Modal */}
        {isSettingsOpen && (
          <SettingsModal
            currentUser={currentUser}
            workspace={workspace}
            notas={notas}
            onUpdateUser={(updated) => setCurrentUser(updated)}
            onClose={() => setIsSettingsOpen(false)}
          />
        )}

        {/* Share Workspace Modal */}
        {workspace?.isCollaborative && isOwner && (
          <ShareWorkspaceModal
            workspaceId={workspace.id}
            isOpen={isShareModalOpen}
            onClose={() => setIsShareModalOpen(false)}
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

        {/* Folder Modal (Create / Rename) */}
        <FolderModal
          isOpen={Boolean(folderModal)}
          data={folderModal}
          onClose={() => setFolderModal(null)}
          onConfirm={handleConfirmFolderModal}
        />

        {/* Discord Create Workspace Modal */}
        <CreateWorkspaceModal
          isOpen={isCreateWorkspaceModalOpen}
          onClose={() => setIsCreateWorkspaceModalOpen(false)}
          onWorkspaceCreated={handleWorkspaceCreated}
          showToast={showToast}
        />

        {/* Discord Workspace Settings Modal */}
        <WorkspaceSettingsModal
          isOpen={isWorkspaceSettingsModalOpen}
          workspace={workspace}
          isOwner={isOwner}
          onClose={() => setIsWorkspaceSettingsModalOpen(false)}
          onWorkspaceUpdated={handleWorkspaceUpdated}
          onWorkspaceDeleted={handleWorkspaceDeleted}
          showToast={showToast}
        />

        {/* Leave Workspace Modal */}
        <LeaveWorkspaceModal
          isOpen={isLeaveModalOpen}
          workspaceId={workspace?.id || ''}
          workspaceNome={workspace?.nome || ''}
          onClose={() => setIsLeaveModalOpen(false)}
        />

      {/* MOBILE BOTTOM NAVIGATION */}
      {isMobile && (
        <div 
          style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            height: '64px',
            background: 'var(--background)',
            borderTop: '1px solid var(--discord-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-around',
            zIndex: 100,
            paddingBottom: 'env(safe-area-inset-bottom)'
          }}
        >
          <button 
            onClick={() => setIsMobileFilesSheetOpen(true)}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', background: 'transparent', border: 'none', color: isMobileFilesSheetOpen ? '#20b8cd' : 'var(--accents-5)', cursor: 'pointer' }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-1.22-1.8A2 2 0 0 0 8.53 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/></svg>
            <span style={{ fontSize: '10px', fontWeight: 500 }}>Arquivos</span>
          </button>
          
          <button 
            onClick={() => {
              setIsGraphViewOpen(false);
              setIsFlashcardsOpen(false);
            }}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', background: 'transparent', border: 'none', color: !isGraphViewOpen && !isFlashcardsOpen && !isAiChatOpen ? '#20b8cd' : 'var(--accents-5)', cursor: 'pointer' }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
            <span style={{ fontSize: '10px', fontWeight: 500 }}>Notas</span>
          </button>

          <button 
            onClick={() => {
              setIsGraphViewOpen(true);
              setIsFlashcardsOpen(false);
              setIsAiChatOpen(false);
            }}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', background: 'transparent', border: 'none', color: isGraphViewOpen ? '#20b8cd' : 'var(--accents-5)', cursor: 'pointer' }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="3" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
            <span style={{ fontSize: '10px', fontWeight: 500 }}>Grafo</span>
          </button>

          <button 
            onClick={() => {
              setIsFlashcardsOpen(true);
              setIsGraphViewOpen(false);
              setIsAiChatOpen(false);
            }}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', background: 'transparent', border: 'none', color: isFlashcardsOpen ? '#20b8cd' : 'var(--accents-5)', cursor: 'pointer' }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="m9 12 2 2 4-4"/></svg>
            <span style={{ fontSize: '10px', fontWeight: 500 }}>Cards</span>
          </button>

          <button 
            onClick={() => {
              setIsAiChatOpen(prev => !prev);
              setIsFlashcardsOpen(false);
              setIsGraphViewOpen(false);
            }}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', background: 'transparent', border: 'none', color: isAiChatOpen ? '#20b8cd' : 'var(--accents-5)', cursor: 'pointer' }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
            </svg>
            <span style={{ fontSize: '10px', fontWeight: 500 }}>IA</span>
          </button>
        </div>
      )}

      {/* MOBILE BOTTOM SHEET FOR FILES */}
      {isMobile && isMobileFilesSheetOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 110, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
          {/* Backdrop */}
          <div 
            onClick={() => setIsMobileFilesSheetOpen(false)}
            style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
          />
          {/* Sheet */}
          <div style={{ 
            position: 'relative', 
            background: 'var(--accents-1)', 
            height: '75vh', 
            borderTopLeftRadius: '16px', 
            borderTopRightRadius: '16px',
            borderTop: '1px solid var(--discord-border)',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 -4px 24px rgba(0,0,0,0.4)',
            animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
          }}>
            {/* Drag Handle / Header */}
            <div 
              onClick={() => setIsMobileFilesSheetOpen(false)}
              style={{ padding: '12px', display: 'flex', justifyContent: 'center', cursor: 'pointer' }}
            >
              <div style={{ width: '40px', height: '4px', background: 'var(--accents-3)', borderRadius: '2px' }} />
            </div>
            
            <div style={{ padding: '0 16px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--discord-border)' }}>
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: '#ffffff' }}>Arquivos</h3>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button 
                  onClick={() => handleTriggerCreatePasta(null)} 
                  className="w-7 h-7 flex items-center justify-center rounded-[6px] bg-[var(--accents-2)] hover:bg-[#3f4147] border border-[var(--discord-border)] text-[var(--accents-6)] hover:text-white transition-colors cursor-pointer" 
                  title="Nova pasta"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-1.22-1.8A2 2 0 0 0 8.53 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/><line x1="12" y1="10" x2="12" y2="16"/><line x1="9" y1="13" x2="15" y2="13"/></svg>
                </button>
                <button 
                  onClick={() => handleCreateNota(null)} 
                  className="w-7 h-7 flex items-center justify-center rounded-[6px] bg-[var(--accents-2)] hover:bg-[#3f4147] border border-[var(--discord-border)] text-[var(--accents-6)] hover:text-white transition-colors cursor-pointer" 
                  title="Nova nota"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                </button>
              </div>
            </div>
            
            {/* Tree Container */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
              {renderFileTree()}
            </div>
          </div>
        </div>
      )}

      {/* Global Toast Notifications */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
