'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { api } from '@/lib/api';
import WorkspaceIcon from '@/components/WorkspaceIcon';
import Editor from '@/components/Editor';
import FormattedAiContent from '@/components/FormattedAiContent';
import UnifiedGraphView, { GraphVisualizationMode } from '@/components/UnifiedGraphView';
import FlashcardsView from '@/components/FlashcardsView';
import DrawingCanvas from '@/components/DrawingCanvas';
import ShareWorkspaceModal from '@/components/ShareWorkspaceModal';
import TesseractLogo from '@/components/TesseractLogo';

type SidebarTab = 'notes' | 'graph' | 'flashcards' | 'ai';

export const GOOGLE_AI_PRO_MODELS = [
  {
    id: 'gemini-2.5-pro',
    name: 'Gemini 2.5 Pro',
    badge: 'Pro',
    desc: 'Raciocínio avançado, matemática e programação complexa',
  },
  {
    id: 'gemini-2.5-flash',
    name: 'Gemini 2.5 Flash',
    badge: 'Rápido',
    desc: 'Velocidade extrema e respostas multimodais em tempo real',
  },
  {
    id: 'gemini-2.0-flash-thinking',
    name: 'Gemini 2.0 Flash Thinking',
    badge: 'Thinking',
    desc: 'Processo de raciocínio passo a passo antes de responder',
  },
  {
    id: 'gemini-1.5-pro',
    name: 'Gemini 1.5 Pro',
    badge: '2M Tokens',
    desc: 'Janela de contexto massiva para grandes documentos',
  },
];

export default function MainPage() {
  const router = useRouter();
  const params = useParams();
  const routeWorkspaceId = typeof params?.id === 'string' ? params.id : Array.isArray(params?.id) ? params.id[0] : null;

  const [isExpanded, setIsExpanded] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [activeTab, setActiveTab] = useState<SidebarTab>('notes');
  const [graphMode, setGraphMode] = useState<GraphVisualizationMode>('orthogonal');

  useEffect(() => {
    try {
      const savedMode = localStorage.getItem('synap_graph_mode') as GraphVisualizationMode;
      if (savedMode === 'orthogonal' || savedMode === 'isometric') {
        setGraphMode(savedMode);
      }
    } catch {}
  }, []);
  const [hoveredTab, setHoveredTab] = useState<SidebarTab | null>(null);
  const [isWorkspaceModalOpen, setIsWorkspaceModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const workspaceContainerRef = useRef<HTMLDivElement>(null);

  // Menu "Criar" (Dropdown na aba de notas)
  const [isCreateMenuOpen, setIsCreateMenuOpen] = useState(false);
  const createMenuContainerRef = useRef<HTMLDivElement>(null);

  // Modal "Criar Pasta" no centro da tela
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [folderError, setFolderError] = useState('');
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const folderInputRef = useRef<HTMLInputElement>(null);

  // Synap AI State: Modelos e Upload
  const [selectedAiModel, setSelectedAiModel] = useState(GOOGLE_AI_PRO_MODELS[0]);
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
  const modelDropdownRef = useRef<HTMLDivElement>(null);

  // Modal de Upload de Arquivos
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [hoveredTooltip, setHoveredTooltip] = useState<{
    id: string;
    label: string;
    top: number;
    left: number;
  } | null>(null);

  const showTooltip = (id: string, label: string, e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const centerY = rect.top + rect.height / 2;
    const rightX = rect.right + 10;
    setHoveredTooltip({ id, label, top: centerY, left: rightX });
  };

  const hideTooltip = () => {
    setHoveredTooltip(null);
  };

  // Carregar preferência de sidebar trancada
  useEffect(() => {
    try {
      const savedLock = localStorage.getItem('synap_sidebar_locked');
      if (savedLock === 'true') {
        setIsLocked(true);
        setIsExpanded(true);
      }
    } catch {}
  }, []);

  // Close workspace modal on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        workspaceContainerRef.current &&
        !workspaceContainerRef.current.contains(e.target as Node)
      ) {
        setIsWorkspaceModalOpen(false);
      }
    };

    if (isWorkspaceModalOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isWorkspaceModalOpen]);

  // Close create menu on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        createMenuContainerRef.current &&
        !createMenuContainerRef.current.contains(e.target as Node)
      ) {
        setIsCreateMenuOpen(false);
      }
    };

    if (isCreateMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isCreateMenuOpen]);

  // Close model dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        modelDropdownRef.current &&
        !modelDropdownRef.current.contains(e.target as Node)
      ) {
        setIsModelDropdownOpen(false);
      }
    };

    if (isModelDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isModelDropdownOpen]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      setUploadedFiles((prev) => [...prev, ...filesArray]);
    }
  };

  const handleRemoveFile = (index: number) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // Focus input when folder modal opens
  useEffect(() => {
    if (isFolderModalOpen) {
      setNewFolderName('');
      setFolderError('');
      const timer = setTimeout(() => {
        folderInputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isFolderModalOpen]);

  // Backend data state
  const [workspaces, setWorkspaces] = useState<any[]>([]);
  const [activeWorkspace, setActiveWorkspace] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [pastas, setPastas] = useState<any[]>([]);
  const [notas, setNotas] = useState<any[]>([]);
  const [selectedNota, setSelectedNota] = useState<any>(null);
  const [openTabIds, setOpenTabIds] = useState<string[]>([]);
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});
  const [isLoadingData, setIsLoadingData] = useState<boolean>(true);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Synap AI State & Handlers
  const [aiThreads, setAiThreads] = useState<any[]>([]);
  const [selectedThread, setSelectedThread] = useState<any>(null);
  const [aiMessages, setAiMessages] = useState<any[]>([]);
  const [aiPrompt, setAiPrompt] = useState<string>('');
  const [isAiLoading, setIsAiLoading] = useState<boolean>(false);
  const [aiStreamingText, setAiStreamingText] = useState<string>('');
  const [isLoadingThreads, setIsLoadingThreads] = useState<boolean>(false);
  const [isAiFetchingThread, setIsAiFetchingThread] = useState<boolean>(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const handleCreateNewChat = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setSelectedThread(null);
    setAiMessages([]);
    setAiPrompt('');
    setAiStreamingText('');
    setIsAiLoading(false);
    setActiveTab('ai');
    setOpenTabIds((prev) => (prev.includes('tab:ai') ? prev : [...prev, 'tab:ai']));
  };

  const handleSelectThread = async (thread: any) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setSelectedThread(thread);
    setActiveTab('ai');
    setOpenTabIds((prev) => (prev.includes('tab:ai') ? prev : [...prev, 'tab:ai']));
    setIsAiLoading(false);
    setAiStreamingText('');
    setIsAiFetchingThread(true);
    try {
      const data = await api(`/ai/threads/${thread.id}`);
      if (data && Array.isArray(data.mensagens)) {
        setAiMessages(data.mensagens);
      } else {
        setAiMessages([]);
      }
    } catch (err) {
      console.error('Erro ao carregar mensagens da thread:', err);
      setAiMessages([]);
    } finally {
      setIsAiFetchingThread(false);
    }
  };

  const handleDeleteThread = async (threadId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await api(`/ai/threads/${threadId}`, { method: 'DELETE' });
      setAiThreads((prev) => prev.filter((t) => t.id !== threadId));
      if (selectedThread?.id === threadId) {
        setSelectedThread(null);
        setAiMessages([]);
        setAiStreamingText('');
        setIsAiLoading(false);
      }
    } catch (err) {
      console.error('Erro ao deletar conversa da AI:', err);
    }
  };

  const handleSendAiMessage = async () => {
    const promptToSend = aiPrompt.trim();
    if (!promptToSend || isAiLoading) return;

    // Optimistic user message
    const userMsg = {
      id: `user-${Date.now()}`,
      role: 'user',
      conteudo: promptToSend,
      createdAt: new Date().toISOString(),
    };

    setAiMessages((prev) => [...prev, userMsg]);
    setIsAiLoading(true);
    setAiStreamingText('');
    setAiPrompt('');
    setUploadedFiles([]);

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    const rawApiUrl = process.env.NEXT_PUBLIC_API_URL || '/api';
    const baseUrl = rawApiUrl.startsWith('http')
      ? rawApiUrl.replace(/\/+$/, '').endsWith('/api')
        ? rawApiUrl.replace(/\/+$/, '')
        : `${rawApiUrl.replace(/\/+$/, '')}/api`
      : '/api';

    const currentWorkspaceId = activeWorkspace?.id;
    if (!currentWorkspaceId) {
      setIsAiLoading(false);
      return;
    }

    try {
      const response = await fetch(`${baseUrl}/ai/workspace/${currentWorkspaceId}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          threadId: selectedThread?.id,
          message: promptToSend,
          activeNote: selectedNota ? { id: selectedNota.id, titulo: selectedNota.titulo } : null,
        }),
        signal: abortController.signal,
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || `Erro de conexão (${response.status})`);
      }

      if (!response.body) {
        throw new Error('Nenhum fluxo de resposta recebido da IA.');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';
      let currentStreamingAccumulator = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const lineBlock of lines) {
          if (!lineBlock.trim()) continue;

          let eventType = 'message';
          let eventData = '';

          const blockLines = lineBlock.split('\n');
          for (const bl of blockLines) {
            if (bl.startsWith('event:')) {
              eventType = bl.slice(6).trim();
            } else if (bl.startsWith('data:')) {
              eventData = bl.slice(5).trim();
            }
          }

          if (!eventData) continue;

          try {
            const parsed = JSON.parse(eventData);

            if (eventType === 'init') {
              if (parsed.threadId && parsed.threadId !== selectedThread?.id) {
                setSelectedThread({
                  id: parsed.threadId,
                  titulo: promptToSend.length > 30 ? `${promptToSend.slice(0, 30)}...` : promptToSend,
                });
                api(`/ai/workspace/${currentWorkspaceId}/threads`)
                  .then((threads) => setAiThreads(threads || []))
                  .catch(() => {});
              }
            } else if (eventType === 'delta') {
              const piece = parsed.text ?? parsed.content ?? '';
              if (piece) {
                currentStreamingAccumulator += piece;
                setAiStreamingText(currentStreamingAccumulator);
              }
            } else if (eventType === 'done') {
              const finalContent = parsed.fullText ?? parsed.content ?? parsed.text ?? currentStreamingAccumulator;
              const assistantMsg = {
                id: parsed.messageId || `ai-${Date.now()}`,
                role: 'assistant',
                conteudo: finalContent,
                createdAt: new Date().toISOString(),
                metadata: {
                  createdEntities: parsed.createdEntities,
                },
              };

              setAiMessages((prev) => [...prev, assistantMsg]);
              setAiStreamingText('');

              if (
                parsed.createdEntities?.notesCreated?.length > 0 ||
                parsed.createdEntities?.foldersCreated?.length > 0
              ) {
                api(`/notas?workspaceId=${currentWorkspaceId}`).then((n) => setNotas(n || [])).catch(() => {});
                api(`/pastas?workspaceId=${currentWorkspaceId}`).then((p) => setPastas(p || [])).catch(() => {});
              }

              api(`/ai/workspace/${currentWorkspaceId}/threads`)
                .then((threads) => setAiThreads(threads || []))
                .catch(() => {});
            } else if (eventType === 'error') {
              const errorMsg = {
                id: `error-${Date.now()}`,
                role: 'assistant',
                conteudo: `Desculpe, ocorreu um erro ao gerar a resposta: ${parsed.error || 'Erro desconhecido'}`,
                createdAt: new Date().toISOString(),
              };
              setAiMessages((prev) => [...prev, errorMsg]);
              setAiStreamingText('');
            }
          } catch (parseErr) {
            console.error('Erro ao processar evento SSE:', parseErr, eventData);
          }
        }
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        const errorMsg = {
          id: `error-${Date.now()}`,
          role: 'assistant',
          conteudo: `Falha na comunicação com o assistente: ${err.message || 'Erro inesperado'}`,
          createdAt: new Date().toISOString(),
        };
        setAiMessages((prev) => [...prev, errorMsg]);
        setAiStreamingText('');
      }
    } finally {
      setIsAiLoading(false);
      abortControllerRef.current = null;
    }
  };

  // Scroll to bottom when AI conversation updates
  useEffect(() => {
    if (activeTab === 'ai') {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [aiMessages, aiStreamingText, isAiLoading, activeTab]);

  // Lista calculada de janelas/abas abertas (suporta notas, desenhos, gráfico, flashcards e synap ai)
  const openTabsList = openTabIds
    .map((tabId) => {
      if (tabId === 'tab:graph') {
        return {
          id: 'tab:graph',
          type: 'graph' as const,
          title: 'Visualização em Gráfico',
          isActive: activeTab === 'graph',
        };
      }
      if (tabId === 'tab:flashcards') {
        return {
          id: 'tab:flashcards',
          type: 'flashcards' as const,
          title: 'Flashcards',
          isActive: activeTab === 'flashcards',
        };
      }
      if (tabId === 'tab:ai') {
        return {
          id: 'tab:ai',
          type: 'ai' as const,
          title: 'Tesseract AI',
          isActive: activeTab === 'ai',
        };
      }
      const nota = notas.find((n) => n.id === tabId);
      if (!nota) return null;
      return {
        id: nota.id,
        type: (nota.tipo === 'desenho' ? 'drawing' : 'note') as 'drawing' | 'note',
        title: nota.titulo || (nota.tipo === 'desenho' ? 'Desenho sem título' : 'Nota sem título'),
        isActive: activeTab === 'notes' && selectedNota?.id === nota.id,
        nota,
      };
    })
    .filter((tab): tab is NonNullable<typeof tab> => Boolean(tab));

  const handleSelectTab = (tab: { id: string; type: string; nota?: any }) => {
    if (tab.id === 'tab:graph') {
      setActiveTab('graph');
    } else if (tab.id === 'tab:flashcards') {
      setActiveTab('flashcards');
    } else if (tab.id === 'tab:ai') {
      setActiveTab('ai');
    } else if (tab.nota) {
      setSelectedNota(tab.nota);
      setActiveTab('notes');
    }
  };

  const handleOpenNote = (nota: any) => {
    setSelectedNota(nota);
    setActiveTab('notes');
    setOpenTabIds((prev) => (prev.includes(nota.id) ? prev : [...prev, nota.id]));
  };

  const handleCloseTab = (tabId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const isCurrentlyActive =
      (tabId === 'tab:graph' && activeTab === 'graph') ||
      (tabId === 'tab:flashcards' && activeTab === 'flashcards') ||
      (tabId === 'tab:ai' && activeTab === 'ai') ||
      (activeTab === 'notes' && selectedNota?.id === tabId);

    setOpenTabIds((prev) => {
      const next = prev.filter((id) => id !== tabId);
      if (isCurrentlyActive) {
        if (next.length > 0) {
          const closedIndex = prev.indexOf(tabId);
          const nextActiveId = next[Math.min(closedIndex, next.length - 1)];
          if (nextActiveId === 'tab:graph') {
            setActiveTab('graph');
          } else if (nextActiveId === 'tab:flashcards') {
            setActiveTab('flashcards');
          } else if (nextActiveId === 'tab:ai') {
            setActiveTab('ai');
          } else {
            const nextNote = notas.find((n) => n.id === nextActiveId);
            setSelectedNota(nextNote || null);
            setActiveTab('notes');
          }
        } else {
          setSelectedNota(null);
          setActiveTab('notes');
        }
      }
      return next;
    });
  };

  // Auto-save function for notes
  const autoSaveNota = async (titulo: string, conteudo: string, notaId: string) => {
    try {
      await api(`/notas/${notaId}`, {
        method: 'PUT',
        body: JSON.stringify({ titulo, conteudo }),
      });
    } catch (err) {
      console.error('Erro ao salvar nota:', err);
    }
  };

  const handleTitleChange = (newTitle: string) => {
    if (!selectedNota) return;
    const updated = { ...selectedNota, titulo: newTitle };
    setSelectedNota(updated);
    setNotas((prev) => prev.map((n) => (n.id === updated.id ? updated : n)));

    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    const content = updated.conteudo || '';
    const noteId = updated.id;
    saveTimeoutRef.current = setTimeout(() => {
      autoSaveNota(newTitle, content, noteId);
    }, 600);
  };

  const handleContentChange = useCallback((newContent: string) => {
    setSelectedNota((prev: any) => {
      if (!prev) return prev;
      const updated = { ...prev, conteudo: newContent };
      const title = updated.titulo || '';
      const noteId = updated.id;

      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(() => {
        autoSaveNota(title, newContent, noteId);
      }, 600);

      return updated;
    });

    setNotas((prev) =>
      prev.map((n) => (n.id === selectedNota?.id ? { ...n, conteudo: newContent } : n))
    );
  }, [selectedNota?.id]);

  // Fetch data from backend on mount
  useEffect(() => {
    const fetchData = async () => {
      setIsLoadingData(true);
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          setIsLoadingData(false);
          router.push('/login');
          return;
        }

        const [wsList, userData] = await Promise.all([
          api('/workspaces').catch(() => []),
          api('/auth/me').catch(() => null),
        ]);

        if (userData) {
          setCurrentUser(userData);
        }

        if (wsList && wsList.length > 0) {
          setWorkspaces(wsList);

          let targetWs = null;
          if (routeWorkspaceId) {
            targetWs = wsList.find((w: any) => w.id === routeWorkspaceId);
          }
          if (!targetWs) {
            const savedWsId = localStorage.getItem('synap_last_workspace_id');
            if (savedWsId) {
              targetWs = wsList.find((w: any) => w.id === savedWsId);
            }
          }
          if (!targetWs) {
            targetWs = wsList[0];
          }

          if (routeWorkspaceId !== targetWs.id) {
            router.replace(`/main/${targetWs.id}`);
          }

          setActiveWorkspace(targetWs);
          try {
            localStorage.setItem('synap_last_workspace_id', targetWs.id);
          } catch {}

          const [pastasData, notasData, threadsData] = await Promise.all([
            api(`/pastas?workspaceId=${targetWs.id}`).catch(() => []),
            api(`/notas?workspaceId=${targetWs.id}`).catch(() => []),
            api(`/ai/workspace/${targetWs.id}/threads`).catch(() => []),
          ]);

          setPastas(pastasData || []);
          setNotas(notasData || []);
          setAiThreads(threadsData || []);

          if (notasData && notasData.length > 0) {
            const firstTextNote = notasData.find((n: any) => n.tipo !== 'desenho') || notasData[0];
            setSelectedNota(firstTextNote);
            setOpenTabIds([firstTextNote.id]);
          }

          // Inicializar pastas abertas por padrão
          const expandedMap: Record<string, boolean> = {};
          (pastasData || []).forEach((p: any) => {
            expandedMap[p.id] = true;
          });
          setExpandedFolders(expandedMap);
        } else {
          router.push('/dashboard');
        }
      } catch (err) {
        console.error('Erro ao carregar dados do workspace no /main:', err);
      } finally {
        setIsLoadingData(false);
      }
    };

    fetchData();
  }, [router, routeWorkspaceId]);

  // Sync workspace if routeWorkspaceId changes (e.g. browser back/forward)
  useEffect(() => {
    if (!routeWorkspaceId || !workspaces.length) return;
    if (activeWorkspace && activeWorkspace.id === routeWorkspaceId) return;
    const targetWs = workspaces.find((w: any) => w.id === routeWorkspaceId);
    if (targetWs) {
      handleSelectWorkspace(targetWs);
    }
  }, [routeWorkspaceId, workspaces, activeWorkspace?.id]);

  const toggleFolder = (folderId: string) => {
    setExpandedFolders((prev) => ({
      ...prev,
      [folderId]: !prev[folderId],
    }));
  };

  const handleTabClick = (tab: SidebarTab) => {
    setActiveTab(tab);
    if (!isExpanded) {
      setIsExpanded(true);
    }

    if (tab === 'graph') {
      setOpenTabIds((prev) => (prev.includes('tab:graph') ? prev : [...prev, 'tab:graph']));
    } else if (tab === 'flashcards') {
      setOpenTabIds((prev) => (prev.includes('tab:flashcards') ? prev : [...prev, 'tab:flashcards']));
    } else if (tab === 'ai') {
      setOpenTabIds((prev) => (prev.includes('tab:ai') ? prev : [...prev, 'tab:ai']));
    } else if (tab === 'notes') {
      if (selectedNota) {
        setOpenTabIds((prev) => (prev.includes(selectedNota.id) ? prev : [...prev, selectedNota.id]));
      } else if (notas.length > 0) {
        const firstTextNote = notas.find((n: any) => n.tipo !== 'desenho') || notas[0];
        setSelectedNota(firstTextNote);
        setOpenTabIds((prev) => (prev.includes(firstTextNote.id) ? prev : [...prev, firstTextNote.id]));
      }
    }
  };

  const handleSelectWorkspace = async (ws: any) => {
    if (ws.id === activeWorkspace?.id) {
      setIsWorkspaceModalOpen(false);
      return;
    }
    setActiveWorkspace(ws);
    setIsWorkspaceModalOpen(false);
    try {
      localStorage.setItem('synap_last_workspace_id', ws.id);
    } catch {}
    if (routeWorkspaceId !== ws.id) {
      router.push(`/main/${ws.id}`);
    }
    setIsLoadingData(true);
    try {
      const [pastasData, notasData, threadsData] = await Promise.all([
        api(`/pastas?workspaceId=${ws.id}`).catch(() => []),
        api(`/notas?workspaceId=${ws.id}`).catch(() => []),
        api(`/ai/workspace/${ws.id}/threads`).catch(() => []),
      ]);
      setPastas(pastasData || []);
      setNotas(notasData || []);
      setAiThreads(threadsData || []);
      setSelectedThread(null);
      if (notasData && notasData.length > 0) {
        const firstTextNote = notasData.find((n: any) => n.tipo !== 'desenho') || notasData[0];
        setSelectedNota(firstTextNote);
        setOpenTabIds([firstTextNote.id]);
      } else {
        setSelectedNota(null);
        setOpenTabIds([]);
      }
      const expandedMap: Record<string, boolean> = {};
      (pastasData || []).forEach((p: any) => {
        expandedMap[p.id] = true;
      });
      setExpandedFolders(expandedMap);
    } catch (err) {
      console.error('Erro ao trocar de workspace:', err);
    } finally {
      setIsLoadingData(false);
    }
  };

  const handleFolderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newFolderName.trim();
    if (!trimmed) {
      setFolderError('O nome da pasta não pode ficar vazio.');
      folderInputRef.current?.focus();
      return;
    }
    if (!activeWorkspace?.id) {
      setFolderError('Nenhum workspace selecionado.');
      return;
    }

    try {
      setIsCreatingFolder(true);
      setFolderError('');
      const created = await api('/pastas', {
        method: 'POST',
        body: JSON.stringify({
          nome: trimmed,
          workspaceId: activeWorkspace.id,
        }),
      });

      const refreshedPastas = await api(`/pastas?workspaceId=${activeWorkspace.id}`).catch(() => []);
      setPastas(refreshedPastas || []);
      if (created?.id) {
        setExpandedFolders((prev) => ({ ...prev, [created.id]: true }));
      }
      setIsFolderModalOpen(false);
      setNewFolderName('');
    } catch (err: any) {
      console.error('Erro ao criar pasta:', err);
      setFolderError(err.message || 'Erro ao criar pasta. Tente novamente.');
    } finally {
      setIsCreatingFolder(false);
    }
  };

  const handleCreateNote = async (tipo: 'texto' | 'desenho' = 'texto') => {
    if (!activeWorkspace?.id) return;
    try {
      const defaultTitle = tipo === 'desenho' ? 'Novo Desenho' : 'Nova Nota';
      const created = await api('/notas', {
        method: 'POST',
        body: JSON.stringify({
          titulo: defaultTitle,
          conteudo: tipo === 'desenho' ? '[]' : '',
          tipo,
          workspaceId: activeWorkspace.id,
        }),
      });
      const refreshedNotas = await api(`/notas?workspaceId=${activeWorkspace.id}`).catch(() => []);
      setNotas(refreshedNotas || []);
      if (created) {
        setSelectedNota(created);
        setOpenTabIds((prev) => (prev.includes(created.id) ? prev : [...prev, created.id]));
      }
    } catch (err) {
      console.error('Erro ao criar nota/desenho:', err);
    }
  };

  // Nome real e Nome de usuário
  const rawRealName = currentUser?.name || currentUser?.nome || '';
  const rawUsername = currentUser?.username || 'usuario';
  const displayUsername = rawUsername.replace(/^@/, '');
  const displayRealFirstName = (rawRealName || displayUsername || 'Gabriel').trim().split(' ')[0].replace(/^@/, '');

  // Pastas raiz e notas sem pasta
  const rootPastas = pastas.filter((p) => !p.parentId);
  const notasSemPasta = notas.filter((n) => !n.pastaId);

  // Renderizador recursivo de pastas com padding amplo e sem cantos arredondados (rounded-none)
  const renderFolderItem = (pasta: any, depth = 0) => {
    const isFolderExpanded = !!expandedFolders[pasta.id];
    const subpastas = pastas.filter((p) => p.parentId === pasta.id);
    const notasDaPasta = notas.filter((n) => n.pastaId === pasta.id);

    return (
      <div key={pasta.id} className="flex flex-col mt-0.5">
        {/* Linha da Pasta: Texto à esquerda, seta para minimizar/expandir à direita */}
        <div
          onClick={() => toggleFolder(pasta.id)}
          style={{ paddingLeft: `${8 + depth * 12}px` }}
          className="group flex items-center justify-between py-1.5 px-2.5 rounded-none cursor-pointer select-none transition-colors duration-150 hover:bg-white/5 text-zinc-400 hover:text-zinc-200"
        >
          {/* Nome da Pasta */}
          <span className="text-xs font-semibold truncate flex-1 mr-2 text-zinc-400 group-hover:text-zinc-200">
            {pasta.nome}
          </span>

          {/* Seta para o lado e para baixo (minimizar / expandir) */}
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`transition-transform duration-200 shrink-0 ${
              isFolderExpanded ? 'rotate-90 text-zinc-200' : 'text-zinc-500 group-hover:text-zinc-300'
            }`}
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </div>

        {/* Conteúdo dentro da pasta (subpastas e notas) com espaçamento limpo */}
        {isFolderExpanded && (
          <div className="flex flex-col pl-2.5 border-l border-white/10 ml-4 my-1 gap-0.5">
            {subpastas.map((sub) => renderFolderItem(sub, depth + 1))}
            {notasDaPasta.map((nota) => renderNoteItem(nota, depth + 1))}
            {subpastas.length === 0 && notasDaPasta.length === 0 && (
              <span className="text-[11px] text-zinc-600 px-2.5 py-1 italic select-none">
                Pasta vazia
              </span>
            )}
          </div>
        )}
      </div>
    );
  };

  // Renderizador de item de nota / desenho com padding refinado e sem cantos arredondados
  const renderNoteItem = (nota: any, depth = 0) => {
    const isSelected = selectedNota?.id === nota.id;
    const isDrawing = nota.tipo === 'desenho';

    return (
      <div
        key={nota.id}
        onClick={() => handleOpenNote(nota)}
        style={{ paddingLeft: `${8 + depth * 8}px` }}
        className={`group flex items-center justify-between h-7 px-2.5 my-0.5 rounded-none cursor-pointer select-none transition-colors duration-150 ${
          isSelected
            ? 'bg-white/10 text-white font-medium'
            : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'
        }`}
      >
        <div className="flex items-center gap-2.5 overflow-hidden flex-1">
          {isDrawing ? (
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={`shrink-0 ${isSelected ? 'text-white' : 'text-zinc-500 group-hover:text-zinc-300'}`}
            >
              <path d="M12 19l7-7 3 3-7 7-3-3z" />
              <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
            </svg>
          ) : (
            <span
              className={`text-xs font-mono shrink-0 font-bold leading-none ${
                isSelected ? 'text-white' : 'text-zinc-500 group-hover:text-zinc-300'
              }`}
            >
              #
            </span>
          )}
          <span className="text-xs truncate">{nota.titulo || 'Nota sem título'}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen w-full bg-[#141414] text-white relative flex flex-col">
      {/* Top Header: Logo e Sistema de Janelas (Tabs) no topo sem bordas */}
      <header className="px-6 py-3 flex items-center gap-4 select-none z-30 font-sansation">
        {/* Logo - Desktop */}
        <Link href="/dashboard" className="hidden md:flex items-center shrink-0 text-white cursor-pointer hover:opacity-90 transition-opacity">
          <TesseractLogo size={32} />
        </Link>

        {/* Botão para abrir Sidebar no Mobile */}
        <button
          type="button"
          onClick={() => setIsExpanded((prev) => !prev)}
          className="md:hidden flex items-center justify-center w-8 h-8 rounded-none bg-white/5 hover:bg-white/10 text-white border border-white/10 cursor-pointer shrink-0 transition-colors"
          aria-label="Abrir menu lateral"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="4" x2="20" y1="12" y2="12" />
            <line x1="4" x2="20" y1="6" y2="6" />
            <line x1="4" x2="20" y1="18" y2="18" />
          </svg>
        </button>

        {/* Janelas / Tabs no topo da tela - Totalmente sem bordas */}
        <div className="flex-1 min-w-0 flex items-center gap-1 overflow-x-auto [&::-webkit-scrollbar]:h-0.5 [&::-webkit-scrollbar-thumb]:bg-white/10">
          {openTabsList.map((tab) => {
            return (
              <div
                key={tab.id}
                onClick={() => handleSelectTab(tab)}
                className={`group flex items-center gap-2 h-8 px-3 rounded-none cursor-pointer transition-colors duration-150 shrink-0 max-w-[220px] select-none ${
                  tab.isActive
                    ? 'bg-white/10 text-white font-medium'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'
                }`}
              >
                {/* Ícone da Janela */}
                {tab.type === 'drawing' ? (
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className={`shrink-0 ${tab.isActive ? 'text-white' : 'text-zinc-500 group-hover:text-zinc-300'}`}
                  >
                    <path d="M12 19l7-7 3 3-7 7-3-3z" />
                    <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
                  </svg>
                ) : tab.type === 'graph' ? (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className={`shrink-0 ${tab.isActive ? 'text-white' : 'text-zinc-500 group-hover:text-zinc-300'}`}
                  >
                    <path d="M17.055 4.533a24 24 0 00-10.11 0" />
                    <path d="M19.467 17.055a24 24 0 000-10.11" />
                    <path d="M4.533 6.945a24 24 0 000 10.11" />
                    <path d="M6.945 19.467a24 24 0 0010.11 0" />
                    <circle cx="19" cy="19" r="2" />
                    <circle cx="19" cy="5" r="2" />
                    <circle cx="5" cy="19" r="2" />
                    <circle cx="5" cy="5" r="2" />
                  </svg>
                ) : tab.type === 'flashcards' ? (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className={`shrink-0 ${tab.isActive ? 'text-white' : 'text-zinc-500 group-hover:text-zinc-300'}`}
                  >
                    <rect width="18" height="18" x="3" y="3" rx="2" />
                    <line x1="7" y1="8" x2="17" y2="8" />
                    <line x1="7" y1="12" x2="17" y2="12" />
                    <line x1="7" y1="16" x2="13" y2="16" />
                  </svg>
                ) : tab.type === 'ai' ? (
                  <TesseractLogo
                    size={14}
                    variant={tab.isActive ? 'ai' : 'default'}
                    className={`shrink-0 ${
                      tab.isActive ? 'opacity-100 text-white' : 'opacity-60 group-hover:opacity-100 text-zinc-400'
                    }`}
                  />
                ) : (
                  <span
                    className={`text-xs font-mono font-bold shrink-0 ${
                      tab.isActive ? 'text-white' : 'text-zinc-500 group-hover:text-zinc-300'
                    }`}
                  >
                    #
                  </span>
                )}

                {/* Título da Janela */}
                <span className="text-xs truncate">{tab.title}</span>

                {/* Botão de Fechar Janela (X) */}
                <button
                  type="button"
                  onClick={(e) => handleCloseTab(tab.id, e)}
                  className="w-4 h-4 rounded-none flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-white/10 text-zinc-400 hover:text-white transition-all shrink-0 ml-1 cursor-pointer"
                  aria-label={`Fechar ${tab.title}`}
                >
                  <svg
                    width="10"
                    height="10"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            );
          })}

          {/* Botão de Nova Janela (+) */}
          <button
            type="button"
            onClick={() => handleCreateNote('texto')}
            onMouseEnter={(e) => showTooltip('btn-new-tab', 'Nova janela', e)}
            onMouseLeave={hideTooltip}
            className="w-7 h-7 rounded-none flex items-center justify-center text-zinc-500 hover:text-white hover:bg-white/5 transition-colors shrink-0 cursor-pointer"
            aria-label="Nova janela"
          >
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
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
        </div>
      </header>

      {/* Backdrop no Mobile quando a Sidebar estiver Aberta */}
      {isExpanded && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-35 md:hidden transition-opacity"
          onClick={() => {
            if (!isLocked) {
              setIsExpanded(false);
              setIsCreateMenuOpen(false);
              setIsWorkspaceModalOpen(false);
            }
          }}
        />
      )}

      {/* Container Fixo na Esquerda (Centralizado verticalmente) */}
      <div
        className={`fixed top-1/2 -translate-y-1/2 z-40 flex flex-col items-start select-none transition-all duration-300 ease-in-out ${
          isExpanded ? 'left-0' : '-left-[60px] md:left-0'
        }`}
        onMouseEnter={() => {
          setIsExpanded(true);
        }}
        onMouseLeave={() => {
          if (!isLocked) {
            setIsExpanded(false);
            setIsCreateMenuOpen(false);
            setIsWorkspaceModalOpen(false);
          }
          hideTooltip();
        }}
      >
        {/* Sidebar (Retângulo puro sem bordas com fonte Sansation) */}
        <aside
          className={`bg-[#1c1c1c] font-sansation shadow-2xl transition-all duration-300 ease-in-out flex flex-col py-3 select-none overflow-hidden ${
            isExpanded ? 'w-[230px] h-[420px]' : 'w-14 h-[380px]'
          }`}
        >
          {/* Header da Sidebar com Tesseract Logo quando expandida */}
          {isExpanded && (
            <div className="px-3 pb-2.5 mb-1 border-b border-white/10 flex items-center justify-between shrink-0">
              <Link href="/dashboard" className="flex items-center gap-2 hover:opacity-90 transition-opacity">
                <TesseractLogo size={20} showText={true} />
              </Link>
              <button
                type="button"
                onClick={() => {
                  setIsExpanded(false);
                  setIsCreateMenuOpen(false);
                  setIsWorkspaceModalOpen(false);
                }}
                className="md:hidden w-6 h-6 flex items-center justify-center text-zinc-400 hover:text-white rounded-none hover:bg-white/5 cursor-pointer"
                aria-label="Fechar menu"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          )}
          {/* Seção Superior: Ícones de navegação | Linha divisória vertical | Conteúdo da aba ativa */}
          <div className="flex-1 min-h-0 flex flex-row items-stretch overflow-hidden">
            {/* Coluna Esquerda: 4 Ícones de navegação com indicador lateral */}
            <nav className="flex flex-col gap-3.5 shrink-0 w-14 items-center py-1">
              {/* 1º Ícone: Pastas, Notas, Desenhos (Square Text) */}
              <div
                className="relative w-full h-8 flex items-center justify-center"
                onMouseEnter={(e) => {
                  setHoveredTab('notes');
                  showTooltip('tab-notes', 'Pastas e Notas', e);
                }}
                onMouseLeave={() => {
                  setHoveredTab(null);
                  hideTooltip();
                }}
              >
                {/* Indicador Branco na Borda Esquerda */}
                <div
                  className={`absolute left-0 top-1/2 -translate-y-1/2 w-1 bg-white rounded-r-full transition-all duration-200 ease-out ${
                    activeTab === 'notes'
                      ? 'h-8'
                      : hoveredTab === 'notes'
                      ? 'h-4'
                      : 'h-0'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => {
                    handleTabClick('notes');
                    hideTooltip();
                  }}
                  className={`w-8 h-8 rounded-none transition-colors duration-150 flex items-center justify-center cursor-pointer ${
                    activeTab === 'notes'
                      ? 'text-white'
                      : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                  aria-label="Pastas e Notas"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="lucide lucide-square-text shrink-0"
                  >
                    <rect width="18" height="18" x="3" y="3" rx="2" />
                    <path d="M7 8h8" />
                    <path d="M7 12h10" />
                    <path d="M7 16h6" />
                  </svg>
                </button>
              </div>

              {/* 2º Ícone: Visualização em Gráfico (Vector Square) */}
              <div
                className="relative w-full h-8 flex items-center justify-center"
                onMouseEnter={(e) => {
                  setHoveredTab('graph');
                  showTooltip('tab-graph', 'Visualização em Gráfico', e);
                }}
                onMouseLeave={() => {
                  setHoveredTab(null);
                  hideTooltip();
                }}
              >
                {/* Indicador Branco na Borda Esquerda */}
                <div
                  className={`absolute left-0 top-1/2 -translate-y-1/2 w-1 bg-white rounded-r-full transition-all duration-200 ease-out ${
                    activeTab === 'graph'
                      ? 'h-8'
                      : hoveredTab === 'graph'
                      ? 'h-4'
                      : 'h-0'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => {
                    handleTabClick('graph');
                    hideTooltip();
                  }}
                  className={`w-8 h-8 rounded-none transition-colors duration-150 flex items-center justify-center cursor-pointer ${
                    activeTab === 'graph'
                      ? 'text-white'
                      : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                  aria-label="Visualização em Gráfico"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="lucide lucide-vector-square shrink-0"
                  >
                    <path d="M17.055 4.533a24 24 0 00-10.11 0" />
                    <path d="M19.467 17.055a24 24 0 000-10.11" />
                    <path d="M4.533 6.945a24 24 0 000 10.11" />
                    <path d="M6.945 19.467a24 24 0 0010.11 0" />
                    <circle cx="19" cy="19" r="2" />
                    <circle cx="19" cy="5" r="2" />
                    <circle cx="5" cy="19" r="2" />
                    <circle cx="5" cy="5" r="2" />
                  </svg>
                </button>
              </div>

              {/* 3º Ícone: Flashcards (Card SIM) */}
              <div
                className="relative w-full h-8 flex items-center justify-center"
                onMouseEnter={(e) => {
                  setHoveredTab('flashcards');
                  showTooltip('tab-flashcards', 'Flashcards', e);
                }}
                onMouseLeave={() => {
                  setHoveredTab(null);
                  hideTooltip();
                }}
              >
                {/* Indicador Branco na Borda Esquerda */}
                <div
                  className={`absolute left-0 top-1/2 -translate-y-1/2 w-1 bg-white rounded-r-full transition-all duration-200 ease-out ${
                    activeTab === 'flashcards'
                      ? 'h-8'
                      : hoveredTab === 'flashcards'
                      ? 'h-4'
                      : 'h-0'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => {
                    handleTabClick('flashcards');
                    hideTooltip();
                  }}
                  className={`w-8 h-8 rounded-none transition-colors duration-150 flex items-center justify-center cursor-pointer ${
                    activeTab === 'flashcards'
                      ? 'text-white'
                      : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                  aria-label="Flashcards"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="lucide lucide-card-sim shrink-0"
                  >
                    <path d="M12 14v4" />
                    <path d="M14.172 2a2 2 0 0 1 1.414.586l3.828 3.828A2 2 0 0 1 20 7.828V20a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z" />
                    <path d="M8 14h8" />
                    <rect x="8" y="10" width="8" height="8" rx="1" />
                  </svg>
                </button>
              </div>

              {/* 4º Ícone: Tesseract AI (Loader Pinwheel) */}
              <div
                className="relative w-full h-8 flex items-center justify-center"
                onMouseEnter={(e) => {
                  setHoveredTab('ai');
                  showTooltip('tab-ai', 'Tesseract AI', e);
                }}
                onMouseLeave={() => {
                  setHoveredTab(null);
                  hideTooltip();
                }}
              >
                {/* Indicador Branco na Borda Esquerda */}
                <div
                  className={`absolute left-0 top-1/2 -translate-y-1/2 w-1 bg-white rounded-r-full transition-all duration-200 ease-out ${
                    activeTab === 'ai'
                      ? 'h-8'
                      : hoveredTab === 'ai'
                      ? 'h-4'
                      : 'h-0'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => {
                    handleTabClick('ai');
                    hideTooltip();
                  }}
                  className={`w-8 h-8 rounded-none transition-colors duration-150 flex items-center justify-center cursor-pointer ${
                    activeTab === 'ai'
                      ? 'text-white'
                      : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                  aria-label="Tesseract AI"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="lucide lucide-loader-pinwheel shrink-0"
                  >
                    <path d="M22 12a1 1 0 0 1-10 0 1 1 0 0 0-10 0" />
                    <path d="M7 20.7a1 1 0 1 1 5-8.7 1 1 0 1 0 5-8.6" />
                    <path d="M7 3.3a1 1 0 1 1 5 8.6 1 1 0 1 0 5 8.6" />
                    <circle cx="12" cy="12" r="10" />
                  </svg>
                </button>
              </div>
            </nav>

            {/* Linha divisória vertical que separa APENAS a navegação superior do conteúdo de notas */}
            {isExpanded && (
              <div className="w-[1px] bg-white/10 self-stretch shrink-0 mr-2" />
            )}

            {/* Conteúdo da aba ativa quando aberta */}
            {isExpanded && (
              <div className="flex-1 min-h-0 overflow-y-auto pr-3 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-white/10 [&::-webkit-scrollbar-track]:bg-transparent">
                {/* ABA 1: PASTAS, NOTAS E DESENHOS */}
                {activeTab === 'notes' && (
                  <div className="flex flex-col flex-1 py-0.5">
                    {/* Botão Superior: Quadrado com + e escrito Criar ao lado */}
                    <div ref={createMenuContainerRef} className="relative mb-2 px-1">
                      <button
                        type="button"
                        onClick={() => setIsCreateMenuOpen(!isCreateMenuOpen)}
                        className="group flex items-center gap-2 px-2 py-1.5 w-full rounded-none hover:bg-white/5 cursor-pointer transition-colors text-zinc-300 hover:text-white select-none"
                        aria-label="Criar item"
                      >
                        {/* Quadrado com o símbolo + */}
                        <div className="w-5 h-5 rounded-none bg-white/5 border border-white/10 flex items-center justify-center shrink-0 text-zinc-400 group-hover:text-white group-hover:border-white/30 transition-colors">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="12"
                            height="12"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <line x1="12" y1="5" x2="12" y2="19" />
                            <line x1="5" y1="12" x2="19" y2="12" />
                          </svg>
                        </div>

                        {/* Texto "Criar" */}
                        <span className="text-xs font-semibold tracking-wide">Criar</span>
                      </button>

                      {/* Dropdown / Popover "Criar" com Pasta, Nota e Desenho */}
                      {isCreateMenuOpen && (
                        <div className="absolute top-full left-1 mt-1 z-50 w-36 bg-[#181818] border border-white/10 shadow-2xl rounded-none p-1 flex flex-col gap-0.5 font-sansation animate-in fade-in zoom-in-95 duration-150">
                          {/* Opção 1: Pasta */}
                          <button
                            type="button"
                            onClick={() => {
                              setIsCreateMenuOpen(false);
                              setIsFolderModalOpen(true);
                            }}
                            className="flex items-center gap-2.5 px-2 py-1.5 rounded-none text-xs font-medium text-zinc-300 hover:text-white hover:bg-white/5 transition-colors cursor-pointer text-left w-full"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="14"
                              height="14"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              className="text-zinc-400 shrink-0"
                            >
                              <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-1.22-1.8A2 2 0 0 0 8.53 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" />
                            </svg>
                            <span>Pasta</span>
                          </button>

                          {/* Opção 2: Nota */}
                          <button
                            type="button"
                            onClick={() => {
                              setIsCreateMenuOpen(false);
                              handleCreateNote('texto');
                            }}
                            className="flex items-center gap-2.5 px-2 py-1.5 rounded-none text-xs font-medium text-zinc-300 hover:text-white hover:bg-white/5 transition-colors cursor-pointer text-left w-full"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="14"
                              height="14"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              className="text-zinc-400 shrink-0"
                            >
                              <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                              <polyline points="14 2 14 8 20 8" />
                              <line x1="16" y1="13" x2="8" y2="13" />
                              <line x1="16" y1="17" x2="8" y2="17" />
                              <line x1="10" y1="9" x2="8" y2="9" />
                            </svg>
                            <span>Nota</span>
                          </button>

                          {/* Opção 3: Desenho */}
                          <button
                            type="button"
                            onClick={() => {
                              setIsCreateMenuOpen(false);
                              handleCreateNote('desenho');
                            }}
                            className="flex items-center gap-2.5 px-2 py-1.5 rounded-none text-xs font-medium text-zinc-300 hover:text-white hover:bg-white/5 transition-colors cursor-pointer text-left w-full"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="14"
                              height="14"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              className="text-zinc-400 shrink-0"
                            >
                              <path d="M12 19l7-7 3 3-7 7-3-3z" />
                              <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
                            </svg>
                            <span>Desenho</span>
                          </button>
                        </div>
                      )}
                    </div>

                    {isLoadingData ? (
                      <div className="p-2.5 text-xs text-zinc-500 italic">
                        Carregando notas...
                      </div>
                    ) : rootPastas.length === 0 && notasSemPasta.length === 0 ? (
                      <div className="p-2.5 text-xs text-zinc-500 italic">
                        Nenhuma nota ou pasta encontrada.
                      </div>
                    ) : (
                      <div className="flex flex-col gap-0.5">
                        {rootPastas.map((pasta) => renderFolderItem(pasta))}
                        {notasSemPasta.map((nota) => renderNoteItem(nota))}
                      </div>
                    )}
                  </div>
                )}

                {/* ABA 2: VISUALIZAÇÃO EM GRÁFICO */}
                {activeTab === 'graph' && (
                  <div className="flex flex-col flex-1 p-2.5 text-xs text-zinc-400 font-sansation">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-xs text-zinc-200 uppercase tracking-wider font-mono">Grafo</span>
                      <span className="text-[10px] font-mono px-1 py-0.2 bg-white/5 border border-white/10 text-zinc-400">
                        {notas.length} {notas.length === 1 ? 'nota' : 'notas'}
                      </span>
                    </div>

                    {/* Seletor de Modo na Sidebar */}
                    <div className="flex flex-col gap-1 mb-2.5">
                      <span className="text-[10px] uppercase font-mono font-semibold text-zinc-500">Modo de Exibição</span>
                      <div className="flex bg-[#121212] border border-white/10 p-0.5 rounded-none">
                        <button
                          type="button"
                          onClick={() => {
                            setGraphMode('orthogonal');
                            try { localStorage.setItem('synap_graph_mode', 'orthogonal'); } catch {}
                          }}
                          className={`flex-1 py-1 px-1.5 text-[11px] font-medium text-center rounded-none transition-colors cursor-pointer ${
                            graphMode === 'orthogonal'
                              ? 'bg-white text-black font-bold'
                              : 'text-zinc-400 hover:text-white hover:bg-white/5'
                          }`}
                        >
                          2D Ortogonal
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setGraphMode('isometric');
                            try { localStorage.setItem('synap_graph_mode', 'isometric'); } catch {}
                          }}
                          className={`flex-1 py-1 px-1.5 text-[11px] font-medium text-center rounded-none transition-colors cursor-pointer ${
                            graphMode === 'isometric'
                              ? 'bg-white text-black font-bold'
                              : 'text-zinc-400 hover:text-white hover:bg-white/5'
                          }`}
                        >
                          3D Isométrico
                        </button>
                      </div>
                    </div>

                    <p className="text-[11px] text-zinc-500 leading-relaxed mb-3">
                      {graphMode === 'orthogonal'
                        ? 'Visualização 2D com blocos quadrados e conexões em 90°.'
                        : 'Visualização tridimensional isométrica com torres e conexões 3D.'}
                    </p>

                    <div className="flex flex-col gap-1 pt-2 border-t border-white/5">
                      <span className="text-[10px] uppercase font-mono font-semibold text-zinc-500">Dica</span>
                      <p className="text-[11px] text-zinc-400 leading-relaxed">
                        {graphMode === 'orthogonal'
                          ? 'Arraste os nós para reposicionar. Use [[título]] para conectar.'
                          : 'Gire a câmera com o mouse e use o scroll para zoom.'}
                      </p>
                    </div>
                  </div>
                )}

                {/* ABA 3: FLASHCARDS */}
                {activeTab === 'flashcards' && (
                  <div className="flex flex-col flex-1 p-2 text-xs text-zinc-400">
                    <span className="font-medium text-zinc-300 mb-1.5">Flashcards</span>
                    <p className="text-[11px] text-zinc-500 leading-relaxed">
                      Baralhos de estudo com repetição espaçada.
                    </p>
                  </div>
                )}

                {/* ABA 4: SYNAP AI - Histórico de conversas */}
                {activeTab === 'ai' && (
                  <div className="flex flex-col flex-1 py-0.5">
                    {/* Botão Superior: Novo Chat */}
                    <div className="mb-2 px-1">
                      <button
                        type="button"
                        onClick={handleCreateNewChat}
                        className="group flex items-center gap-2 px-2 py-1.5 w-full rounded-none hover:bg-white/5 cursor-pointer transition-colors text-zinc-300 hover:text-white select-none"
                        aria-label="Novo Chat"
                      >
                        {/* Quadrado com o símbolo + */}
                        <div className="w-5 h-5 rounded-none bg-white/5 border border-white/10 flex items-center justify-center shrink-0 text-zinc-400 group-hover:text-white group-hover:border-white/30 transition-colors">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="12"
                            height="12"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <line x1="12" y1="5" x2="12" y2="19" />
                            <line x1="5" y1="12" x2="19" y2="12" />
                          </svg>
                        </div>

                        {/* Texto "Novo Chat" */}
                        <span className="text-xs font-semibold tracking-wide">Novo Chat</span>
                      </button>
                    </div>

                    {/* Lista do Histórico de Conversas */}
                    {isLoadingThreads ? (
                      <div className="p-2.5 text-xs text-zinc-500 italic">
                        Carregando histórico...
                      </div>
                    ) : aiThreads.length === 0 ? (
                      <div className="p-2.5 text-xs text-zinc-500 italic select-none">
                        Nenhum chat recente.
                      </div>
                    ) : (
                      <div className="flex flex-col gap-0.5">
                        {aiThreads.map((thread) => {
                          const isSelected = selectedThread?.id === thread.id;
                          return (
                            <div
                              key={thread.id}
                              onClick={() => handleSelectThread(thread)}
                              className={`group flex items-center justify-between h-7 px-2.5 my-0.5 rounded-none cursor-pointer select-none transition-colors duration-150 ${
                                isSelected
                                  ? 'bg-white/10 text-white font-medium'
                                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'
                              }`}
                            >
                              <div className="flex items-center gap-2 overflow-hidden flex-1 min-w-0">
                                <svg
                                  width="13"
                                  height="13"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  className={`shrink-0 ${
                                    isSelected ? 'text-white' : 'text-zinc-500 group-hover:text-zinc-300'
                                  }`}
                                >
                                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                                </svg>
                                <span className="text-xs truncate">
                                  {thread.titulo || 'Nova Conversa'}
                                </span>
                              </div>

                              {/* Botão de Deletar Conversa */}
                              <button
                                type="button"
                                onClick={(e) => handleDeleteThread(thread.id, e)}
                                className="w-4 h-4 rounded-none flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-white/10 text-zinc-500 hover:text-red-400 transition-all shrink-0 ml-1 cursor-pointer"
                                aria-label="Deletar conversa"
                              >
                                <svg
                                  width="11"
                                  height="11"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                >
                                  <path d="M3 6h18" />
                                  <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                                  <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                                </svg>
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Linha divisória horizontal entre a parte superior e a seção do workspace */}
          <div ref={workspaceContainerRef} className="border-t border-white/10 pt-2.5 mt-2 shrink-0 relative">
            {/* Modal de Workspaces que abre para cima (sem bordas arredondadas) */}
            {isWorkspaceModalOpen && (
              <div
                className={`absolute bottom-[54px] z-50 bg-[#161616] border border-white/10 shadow-2xl rounded-none p-1.5 flex flex-col gap-1 select-none animate-in fade-in slide-in-from-bottom-2 duration-150 ${
                  isExpanded ? 'left-3 right-3' : 'left-0 w-[220px]'
                }`}
              >
                <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-500 select-none">
                  Workspaces
                </div>
                <div className="flex flex-col gap-0.5 max-h-[200px] overflow-y-auto [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-white/10">
                  {workspaces.map((ws) => {
                    const isActive = ws.id === activeWorkspace?.id;
                    return (
                      <button
                        key={ws.id}
                        type="button"
                        onClick={() => handleSelectWorkspace(ws)}
                        className={`w-full flex items-center gap-2.5 px-2 py-1.5 rounded-none cursor-pointer transition-colors text-left group ${
                          isActive
                            ? 'bg-white/10 text-white font-medium'
                            : 'text-zinc-400 hover:text-white hover:bg-white/5'
                        }`}
                      >
                        {/* Foto da Workspace */}
                        <div className="w-6 h-6 rounded-none bg-zinc-800 border border-white/10 flex items-center justify-center shrink-0 overflow-hidden">
                          <WorkspaceIcon
                            icone={ws.icone}
                            nome={ws.nome || 'WS'}
                            size={20}
                            className="w-full h-full text-[10px]"
                          />
                        </div>

                        {/* Nome da Workspace */}
                        <span className="text-sm font-semibold truncate flex-1">
                          {ws.nome || 'Workspace sem nome'}
                        </span>

                        {/* Indicador de ativo */}
                        {isActive && (
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="shrink-0 text-white"
                          >
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Seção do Workspace: Conjunto clicável com Foto + Nome/Usuário + Setas <> que abre o modal */}
            <div className={`flex items-center ${isExpanded ? 'justify-between px-3 gap-2 w-full' : 'justify-center w-14'}`}>
              {/* Conjunto Unificado: Foto + Nome/Usuário + Setas <> */}
              <div
                onClick={() => {
                  setIsWorkspaceModalOpen(!isWorkspaceModalOpen);
                  hideTooltip();
                }}
                onMouseEnter={(e) => {
                  if (!isExpanded) {
                    showTooltip('ws-photo', activeWorkspace?.nome || 'Workspace', e);
                  } else {
                    showTooltip('ws-selector', 'Trocar workspace', e);
                  }
                }}
                onMouseLeave={hideTooltip}
                className={`flex items-center min-w-0 overflow-hidden cursor-pointer select-none transition-colors rounded-none ${
                  isExpanded
                    ? 'flex-1 gap-2.5 p-1 -m-1 hover:bg-white/5 group'
                    : 'justify-center'
                }`}
                aria-label="Trocar workspace"
              >
                {/* Foto Quadrada */}
                <div
                  className={`w-8 h-8 rounded-none bg-zinc-800 border border-white/10 flex items-center justify-center shrink-0 overflow-hidden transition-colors ${
                    isExpanded
                      ? 'group-hover:border-white/30'
                      : 'hover:border-white/30'
                  }`}
                >
                  <WorkspaceIcon
                    icone={activeWorkspace?.icone}
                    nome={activeWorkspace?.nome || 'WS'}
                    size={28}
                    className="w-full h-full text-xs"
                  />
                </div>

                {/* Nome do Workspace e Usuário + Setas <> viradas (integradas no mesmo bloco clicável) */}
                {isExpanded && (
                  <>
                    <div className="flex flex-col min-w-0 overflow-hidden flex-1">
                      <span className="text-sm font-bold text-white truncate leading-tight group-hover:text-zinc-100 tracking-wide">
                        {activeWorkspace?.nome || 'Workspace'}
                      </span>
                      <span className="text-[10px] text-zinc-400 truncate leading-tight mt-0.5">
                        {displayUsername}
                      </span>
                    </div>

                    {/* Setas <> viradas integradas no conjunto */}
                    <div className="text-zinc-500 group-hover:text-white transition-colors p-0.5 shrink-0 flex items-center justify-center">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className={`lucide lucide-chevrons-up-down transition-transform duration-200 ${
                          isWorkspaceModalOpen ? 'rotate-180 text-white' : ''
                        }`}
                      >
                        <path d="m7 15 5 5 5-5" />
                        <path d="m7 9 5-5 5 5" />
                      </svg>
                    </div>
                  </>
                )}
              </div>

              {/* Botões de Ação à Direita: Trava/Cadeado e Configurações */}
              {isExpanded && (
                <div className="flex items-center gap-0.5 shrink-0">
                  {/* Botão Cadeado (Fixar/Trancar Sidebar) */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      const next = !isLocked;
                      setIsLocked(next);
                      try {
                        localStorage.setItem('synap_sidebar_locked', String(next));
                      } catch {}
                      showTooltip(
                        'sidebar-lock',
                        next ? 'Destrancar sidebar' : 'Trancar sidebar',
                        e
                      );
                    }}
                    onMouseEnter={(e) =>
                      showTooltip(
                        'sidebar-lock',
                        isLocked ? 'Destrancar sidebar' : 'Trancar sidebar',
                        e
                      )
                    }
                    onMouseLeave={hideTooltip}
                    aria-label={isLocked ? 'Destrancar sidebar' : 'Trancar sidebar'}
                    className={`p-1.5 rounded-none transition-colors cursor-pointer flex items-center justify-center ${
                      isLocked
                        ? 'text-white bg-white/10 hover:bg-white/15'
                        : 'text-zinc-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    {isLocked ? (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="lucide lucide-lock text-white"
                      >
                        <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                      </svg>
                    ) : (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="lucide lucide-lock-open text-zinc-400"
                      >
                        <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0 1 9.9-1" />
                      </svg>
                    )}
                  </button>

                  {/* Botão de Convidar Pessoas para o Workspace */}
                  {activeWorkspace?.isOwner && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsShareModalOpen(true);
                      }}
                      onMouseEnter={(e) => showTooltip('ws-share', 'Convidar pessoas', e)}
                      onMouseLeave={hideTooltip}
                      aria-label="Convidar pessoas"
                      className="p-1.5 text-zinc-400 hover:text-white hover:bg-white/5 rounded-none transition-colors cursor-pointer flex items-center justify-center"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                        <circle cx="8.5" cy="7" r="4" />
                        <line x1="20" y1="8" x2="20" y2="14" />
                        <line x1="23" y1="11" x2="17" y2="11" />
                      </svg>
                    </button>
                  )}

                  {/* Botão de Configurações do Workspace */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                    }}
                    onMouseEnter={(e) => showTooltip('ws-settings', 'Configurações do workspace', e)}
                    onMouseLeave={hideTooltip}
                    aria-label="Configurações do workspace"
                    className="p-1.5 text-zinc-400 hover:text-white hover:bg-white/5 rounded-none transition-colors cursor-pointer flex items-center justify-center"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="lucide lucide-settings"
                    >
                      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  </button>
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>

      {/* Tooltip Global Flutuante: Retângulo preto com fonte branca e setinha < indicando a origem */}
      {hoveredTooltip && (
        <div
          style={{
            top: `${hoveredTooltip.top}px`,
            left: `${hoveredTooltip.left}px`,
            transform: 'translateY(-50%)',
          }}
          className="fixed z-[9999] px-2.5 py-1 text-xs font-sansation font-medium whitespace-nowrap bg-black text-white border border-white/15 rounded-none shadow-2xl pointer-events-none select-none flex items-center transition-opacity duration-150 animate-in fade-in-50"
        >
          {/* Setinha < apontando para a esquerda */}
          <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-2 h-2 bg-black border-l border-b border-white/15 rotate-45" />
          <span className="relative z-10 text-xs tracking-wide">{hoveredTooltip.label}</span>
        </div>
      )}

      {/* Modal de Criação de Pasta no Centro da Tela (Estilização Minimalista Geist) */}
      {isFolderModalOpen && (
        <div
          className="fixed inset-0 z-[2000] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 select-none animate-in fade-in duration-150 font-sansation"
          onClick={() => setIsFolderModalOpen(false)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setIsFolderModalOpen(false);
          }}
        >
          <div
            className="w-full max-w-[380px] bg-[#181818] border border-white/10 rounded-none shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 flex flex-col gap-4">
              {/* Header do Modal */}
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-none bg-white/5 text-white border border-white/10 flex items-center justify-center shrink-0">
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
                  <h3 className="text-sm font-bold text-white leading-tight">
                    Nova Pasta
                  </h3>
                  <span className="text-[11px] text-zinc-400 block mt-0.5">
                    Organize suas notas e desenhos
                  </span>
                </div>
              </div>

              {/* Formulário */}
              <form
                id="create-folder-form"
                onSubmit={handleFolderSubmit}
                className="flex flex-col gap-3"
              >
                <div>
                  <label
                    htmlFor="folder-name-input"
                    className="block text-[10px] font-mono font-semibold uppercase tracking-wider text-zinc-400 mb-1.5"
                  >
                    Nome da Pasta
                  </label>
                  <input
                    id="folder-name-input"
                    ref={folderInputRef}
                    type="text"
                    value={newFolderName}
                    onChange={(e) => {
                      setNewFolderName(e.target.value);
                      if (folderError) setFolderError('');
                    }}
                    placeholder="Ex: Projetos, Estudos, Ideias..."
                    disabled={isCreatingFolder}
                    className="w-full h-9 px-3 text-xs bg-[#121212] border border-white/15 focus:border-white rounded-none outline-none text-white placeholder-zinc-500 font-sansation transition-colors"
                  />
                  {folderError && (
                    <span className="block text-red-400 text-xs mt-1.5 font-medium">
                      {folderError}
                    </span>
                  )}
                </div>
              </form>
            </div>

            {/* Footer de Ações */}
            <div className="bg-[#121212] border-t border-white/10 px-5 py-3 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsFolderModalOpen(false)}
                disabled={isCreatingFolder}
                className="h-8 px-3.5 text-xs font-medium rounded-none bg-transparent hover:bg-white/5 border border-white/10 text-zinc-300 hover:text-white transition-colors cursor-pointer font-sansation"
              >
                Cancelar
              </button>
              <button
                type="submit"
                form="create-folder-form"
                disabled={isCreatingFolder || !newFolderName.trim()}
                className="h-8 px-4 text-xs font-bold rounded-none bg-white text-black hover:bg-zinc-200 transition-colors cursor-pointer font-sansation disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isCreatingFolder ? 'Criando...' : 'Criar Pasta'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main
        className={`flex-1 flex flex-col items-center min-h-0 ${
          activeTab === 'graph' ||
          activeTab === 'flashcards' ||
          (activeTab === 'notes' && selectedNota?.tipo === 'desenho')
            ? 'p-0 overflow-hidden w-full h-full'
            : 'px-6 sm:px-12 py-6 sm:py-10 overflow-y-auto'
        }`}
      >
        {activeTab === 'graph' ? (
          <UnifiedGraphView
            notas={notas}
            pastas={pastas}
            activeWorkspace={activeWorkspace}
            graphMode={graphMode}
            onGraphModeChange={(mode) => {
              setGraphMode(mode);
              try { localStorage.setItem('synap_graph_mode', mode); } catch {}
            }}
            onOpenNota={(nota) => {
              handleOpenNote(nota);
            }}
          />
        ) : activeTab === 'flashcards' ? (
          <div className="w-full flex-1 flex relative overflow-hidden">
            <FlashcardsView
              workspace={activeWorkspace}
              notas={notas}
              onOpenNota={(nota) => {
                handleOpenNote(nota);
              }}
              onClose={() => {
                handleCloseTab('tab:flashcards');
              }}
            />
          </div>
        ) : activeTab === 'ai' ? (
          aiMessages.length === 0 && !isAiLoading && !isAiFetchingThread ? (
            /* Tela Inicial Synap AI: Retângulo grande no meio da tela (levemente rebaixado) */
            <div className="w-full max-w-2xl flex-1 flex flex-col items-center justify-center pt-24 pb-12 font-sansation animate-in fade-in duration-200">
              {/* Header com estilo da imagem de referência (Olá, Primeiro Nome. + O que você quer aprender hoje?) */}
              <div className="mb-8 text-center select-none">
                <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold font-sansation text-white tracking-tight leading-tight">
                  Olá, {displayRealFirstName}.
                </h1>
                <p className="text-2xl sm:text-3xl md:text-4xl font-bold font-sansation text-zinc-400 tracking-tight mt-1 leading-tight">
                  O que você quer aprender hoje?
                </p>
              </div>

              {/* Retângulo Grande de Prompt (Sem bordas arredondadas, tema minimalista) */}
              <div className="w-full bg-[#181818] border border-white/10 focus-within:border-white/30 rounded-none shadow-2xl p-3.5 sm:p-4 flex flex-col gap-3 transition-colors">
                {/* Arquivos Anexados (se houver) */}
                {uploadedFiles.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pb-1 border-b border-white/5">
                    {uploadedFiles.map((file, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-1.5 px-2 py-1 bg-white/5 border border-white/10 text-xs text-zinc-300 font-sansation rounded-none"
                      >
                        <svg
                          width="11"
                          height="11"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="text-zinc-400 shrink-0"
                        >
                          <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                          <polyline points="14 2 14 8 20 8" />
                        </svg>
                        <span className="max-w-[140px] truncate text-[11px]">{file.name}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveFile(idx)}
                          className="text-zinc-500 hover:text-white p-0.5 cursor-pointer"
                          aria-label={`Remover ${file.name}`}
                        >
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Textarea do Prompt */}
                <textarea
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder="Pergunte algo, solicite uma análise ou comece um novo estudo..."
                  rows={4}
                  className="w-full bg-transparent text-sm sm:text-base font-sansation text-white placeholder-zinc-500 outline-none border-none resize-none leading-relaxed"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendAiMessage();
                    }
                  }}
                />

                {/* Barra Inferior dentro do Retângulo de Prompt */}
                <div className="flex items-center justify-between pt-2 border-t border-white/5 select-none">
                  {/* Lado Inferior Esquerdo: Botão + (Upload) e Seletor de Modelos Google AI Pro */}
                  <div className="flex items-center gap-2">
                    {/* Botão + para abrir o modal de carregar arquivos */}
                    <button
                      type="button"
                      onClick={() => setIsUploadModalOpen(true)}
                      onMouseEnter={(e) => showTooltip('ai-upload-btn', 'Carregar arquivos', e)}
                      onMouseLeave={hideTooltip}
                      className="w-7 h-7 rounded-none bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-400 hover:text-white transition-colors flex items-center justify-center cursor-pointer"
                      aria-label="Carregar arquivos"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="13"
                        height="13"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <line x1="12" y1="5" x2="12" y2="19" />
                        <line x1="5" y1="12" x2="19" y2="12" />
                      </svg>
                    </button>

                    {/* Seletor de Modelos Google AI Pro */}
                    <div ref={modelDropdownRef} className="relative">
                      <button
                        type="button"
                        onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)}
                        className="h-7 px-2.5 rounded-none bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-sansation text-zinc-200 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
                        aria-label="Selecionar modelo de IA"
                      >
                        <span className="font-semibold text-[11px] sm:text-xs">{selectedAiModel.name}</span>
                        <svg
                          width="11"
                          height="11"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className={`text-zinc-400 transition-transform duration-150 ${
                            isModelDropdownOpen ? 'rotate-180 text-white' : ''
                          }`}
                        >
                          <polyline points="6 9 12 15 18 9" />
                        </svg>
                      </button>

                      {/* Popover Menu de Modelos Google AI Pro */}
                      {isModelDropdownOpen && (
                        <div className="absolute bottom-full left-0 mb-1.5 w-72 bg-[#181818] border border-white/10 shadow-2xl rounded-none p-1 z-50 flex flex-col gap-0.5 font-sansation animate-in fade-in zoom-in-95 duration-150">
                          <div className="px-2 py-1 text-[10px] font-mono font-semibold uppercase tracking-wider text-zinc-500 select-none">
                            Google AI Pro Models
                          </div>
                          {GOOGLE_AI_PRO_MODELS.map((model) => {
                            const isSelected = selectedAiModel.id === model.id;
                            return (
                              <button
                                key={model.id}
                                type="button"
                                onClick={() => {
                                  setSelectedAiModel(model);
                                  setIsModelDropdownOpen(false);
                                }}
                                className={`w-full flex flex-col items-start px-2.5 py-1.5 rounded-none cursor-pointer transition-colors text-left group ${
                                  isSelected
                                    ? 'bg-white/10 text-white font-medium'
                                    : 'text-zinc-400 hover:text-white hover:bg-white/5'
                                }`}
                              >
                                <div className="flex items-center justify-between w-full">
                                  <span className="text-xs font-semibold">{model.name}</span>
                                  <span className="text-[9px] font-mono px-1 py-0.2 rounded-none bg-white/10 text-zinc-300">
                                    {model.badge}
                                  </span>
                                </div>
                                <span className="text-[10px] text-zinc-500 group-hover:text-zinc-400 leading-tight mt-0.5">
                                  {model.desc}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Botão de Envio (Seta para cima) */}
                  <button
                    type="button"
                    onClick={handleSendAiMessage}
                    disabled={!aiPrompt.trim() || isAiLoading}
                    className="w-7 h-7 rounded-none bg-white text-black hover:bg-zinc-200 transition-colors flex items-center justify-center cursor-pointer disabled:opacity-20 disabled:cursor-not-allowed"
                    aria-label="Enviar prompt"
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <line x1="12" y1="19" x2="12" y2="5" />
                      <polyline points="5 12 12 5 19 12" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Tela Ativa de Conversa Synap AI: Chat fluído sem bordas com navegação vertical */
            <div className="w-full max-w-3xl flex-1 flex flex-col min-h-0 font-sansation animate-in fade-in duration-200">
              {/* Área de mensagens com rolagem vertical */}
              {isAiFetchingThread ? (
                <div className="flex-1 flex items-center justify-center">
                  <div className="flex items-center gap-2.5 text-zinc-400 text-sm">
                    <TesseractLogo size={18} variant="ai" className="text-zinc-300 shrink-0" />
                    <span>Carregando conversa...</span>
                  </div>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto w-full py-4 flex flex-col gap-6 pr-1">
                  {aiMessages.map((msg) => {
                    const isUser = msg.role === 'user';
                    return (
                      <div
                        key={msg.id}
                        className={`w-full flex ${isUser ? 'justify-end' : 'justify-start'}`}
                      >
                        {isUser ? (
                          /* Mensagem do Usuário: À Direita, fluída, sem bordas pesadas */
                          <div className="max-w-[85%] sm:max-w-[75%] px-4 py-3 bg-[#202020] text-zinc-100 text-sm sm:text-base leading-relaxed select-text font-sansation rounded-none shadow-sm">
                            <p className="whitespace-pre-wrap break-words">{msg.conteudo}</p>
                          </div>
                        ) : (
                          /* Mensagem da IA: À Esquerda, limpa e fluída direto na tela */
                          <div className="w-full text-zinc-100 text-sm sm:text-base leading-relaxed select-text font-sansation">
                            <FormattedAiContent content={msg.conteudo} />
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Estado "Pensando...": Novo ícone do Tesseract pulsando */}
                  {isAiLoading && !aiStreamingText && (
                    <div className="w-full flex justify-start">
                      <div className="flex items-center gap-2.5 text-zinc-400 select-none py-2 animate-in fade-in duration-200">
                        <TesseractLogo size={18} variant="ai" className="text-zinc-300 shrink-0" />
                        <span className="text-sm font-sansation text-zinc-400 font-medium tracking-wide">
                          Pensando...
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Fluxo de Resposta em tempo real (Streaming) */}
                  {isAiLoading && aiStreamingText && (
                    <div className="w-full flex justify-start">
                      <div className="w-full text-zinc-100 text-sm sm:text-base leading-relaxed select-text font-sansation">
                        <FormattedAiContent content={aiStreamingText} />
                      </div>
                    </div>
                  )}

                  <div ref={chatEndRef} />
                </div>
              )}

              {/* Barra de Prompt Inferior Fixa no Chat */}
              <div className="w-full pt-3 pb-2 shrink-0">
                <div className="w-full bg-[#181818] border border-white/10 focus-within:border-white/30 rounded-none shadow-2xl p-3 sm:p-3.5 flex flex-col gap-2.5 transition-colors">
                  {/* Arquivos Anexados (se houver) */}
                  {uploadedFiles.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pb-1 border-b border-white/5">
                      {uploadedFiles.map((file, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-1.5 px-2 py-1 bg-white/5 border border-white/10 text-xs text-zinc-300 font-sansation rounded-none"
                        >
                          <svg
                            width="11"
                            height="11"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="text-zinc-400 shrink-0"
                          >
                            <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                            <polyline points="14 2 14 8 20 8" />
                          </svg>
                          <span className="max-w-[140px] truncate text-[11px]">{file.name}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveFile(idx)}
                            className="text-zinc-500 hover:text-white p-0.5 cursor-pointer"
                            aria-label={`Remover ${file.name}`}
                          >
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <line x1="18" y1="6" x2="6" y2="18" />
                              <line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Textarea do Prompt */}
                  <textarea
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    placeholder="Envie uma mensagem para o Tesseract AI..."
                    rows={2}
                    className="w-full bg-transparent text-sm sm:text-[15px] font-sansation text-white placeholder-zinc-500 outline-none border-none resize-none leading-relaxed"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendAiMessage();
                      }
                    }}
                  />

                  {/* Barra de Controles Inferior */}
                  <div className="flex items-center justify-between pt-1.5 border-t border-white/5 select-none">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setIsUploadModalOpen(true)}
                        onMouseEnter={(e) => showTooltip('ai-upload-btn-chat', 'Carregar arquivos', e)}
                        onMouseLeave={hideTooltip}
                        className="w-7 h-7 rounded-none bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-400 hover:text-white transition-colors flex items-center justify-center cursor-pointer"
                        aria-label="Carregar arquivos"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="13"
                          height="13"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <line x1="12" y1="5" x2="12" y2="19" />
                          <line x1="5" y1="12" x2="19" y2="12" />
                        </svg>
                      </button>

                      {/* Seletor de Modelo */}
                      <div ref={modelDropdownRef} className="relative">
                        <button
                          type="button"
                          onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)}
                          className="h-7 px-2.5 rounded-none bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-sansation text-zinc-200 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
                          aria-label="Selecionar modelo de IA"
                        >
                          <span className="font-semibold text-[11px] sm:text-xs">{selectedAiModel.name}</span>
                          <svg
                            width="11"
                            height="11"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className={`text-zinc-400 transition-transform duration-150 ${
                              isModelDropdownOpen ? 'rotate-180 text-white' : ''
                            }`}
                          >
                            <polyline points="6 9 12 15 18 9" />
                          </svg>
                        </button>

                        {isModelDropdownOpen && (
                          <div className="absolute bottom-full left-0 mb-1.5 w-72 bg-[#181818] border border-white/10 shadow-2xl rounded-none p-1 z-50 flex flex-col gap-0.5 font-sansation animate-in fade-in zoom-in-95 duration-150">
                            <div className="px-2 py-1 text-[10px] font-mono font-semibold uppercase tracking-wider text-zinc-500 select-none">
                              Google AI Pro Models
                            </div>
                            {GOOGLE_AI_PRO_MODELS.map((model) => {
                              const isSelected = selectedAiModel.id === model.id;
                              return (
                                <button
                                  key={model.id}
                                  type="button"
                                  onClick={() => {
                                    setSelectedAiModel(model);
                                    setIsModelDropdownOpen(false);
                                  }}
                                  className={`w-full flex flex-col items-start px-2.5 py-1.5 rounded-none cursor-pointer transition-colors text-left group ${
                                    isSelected
                                      ? 'bg-white/10 text-white font-medium'
                                      : 'text-zinc-400 hover:text-white hover:bg-white/5'
                                  }`}
                                >
                                  <div className="flex items-center justify-between w-full">
                                    <span className="text-xs font-semibold">{model.name}</span>
                                    <span className="text-[9px] font-mono px-1 py-0.2 rounded-none bg-white/10 text-zinc-300">
                                      {model.badge}
                                    </span>
                                  </div>
                                  <span className="text-[10px] text-zinc-500 group-hover:text-zinc-400 leading-tight mt-0.5">
                                    {model.desc}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleSendAiMessage}
                      disabled={!aiPrompt.trim() || isAiLoading}
                      className="w-7 h-7 rounded-none bg-white text-black hover:bg-zinc-200 transition-colors flex items-center justify-center cursor-pointer disabled:opacity-20 disabled:cursor-not-allowed"
                      aria-label="Enviar prompt"
                    >
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <line x1="12" y1="19" x2="12" y2="5" />
                        <polyline points="5 12 12 5 19 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )
        ) : selectedNota ? (
          selectedNota.tipo === 'desenho' ? (
            <div className="w-full h-full flex-1 flex flex-col relative overflow-hidden font-sansation">
              {/* Minimalist Drawing Title Header */}
              <div className="px-6 py-2.5 border-b border-white/10 bg-[#141414] flex items-center justify-between shrink-0 z-10">
                <input
                  type="text"
                  value={selectedNota.titulo || ''}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  placeholder="Nome do Desenho..."
                  className="bg-transparent text-base sm:text-lg font-bold font-sansation text-white placeholder-zinc-700 outline-none border-none px-0 leading-tight w-full select-text"
                />
              </div>

              {/* Drawing Canvas Area */}
              <div className="flex-1 w-full h-full relative overflow-hidden">
                <DrawingCanvas
                  key={selectedNota.id}
                  notaId={selectedNota.id}
                  initialData={selectedNota.conteudo || '[]'}
                  onChange={handleContentChange}
                  title={selectedNota.titulo || ''}
                  notas={notas}
                  workspaceId={activeWorkspace?.id}
                  isCollaborative={activeWorkspace?.isCollaborative}
                  onOpenNota={(nota) => handleOpenNote(nota)}
                />
              </div>
            </div>
          ) : (
            <div className="w-full max-w-3xl flex flex-col flex-1 min-h-0 font-sansation animate-in fade-in duration-200">
              {/* Título da Nota: Texto direto na tela, sem bordas */}
              <input
                type="text"
                value={selectedNota.titulo || ''}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="Nota sem título"
                className="w-full bg-transparent text-3xl sm:text-4xl font-bold font-sansation text-white placeholder-zinc-700 outline-none border-none mb-6 px-0 leading-tight select-text"
              />

              {/* Conteúdo da Nota: Editor rico integrado à tela sem molduras */}
              <div className="flex-1 w-full font-sansation">
                <Editor
                  key={selectedNota.id}
                  notaId={selectedNota.id}
                  value={selectedNota.conteudo || ''}
                  onChange={handleContentChange}
                  placeholder="Comece a escrever sua nota... Digite '/' para comandos"
                  fontFamily="'Sansation', sans-serif"
                  fontSize="16px"
                  notas={notas}
                  workspaceId={activeWorkspace?.id}
                  isCollaborative={activeWorkspace?.isCollaborative}
                  onOpenNota={(nota) => handleOpenNote(nota)}
                  onUpdateNota={(updated) => {
                    setNotas((prev) => prev.map((n) => (n.id === updated.id ? updated : n)));
                    if (selectedNota?.id === updated.id) {
                      setSelectedNota(updated);
                    }
                  }}
                />
              </div>
            </div>
          )
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 select-none font-sansation">
            <div className="w-12 h-12 rounded-none bg-white/5 border border-white/10 flex items-center justify-center text-zinc-500 mb-4">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <line x1="10" y1="9" x2="8" y2="9" />
              </svg>
            </div>
            <h2 className="text-base font-bold text-zinc-300 mb-1">Nenhuma nota selecionada</h2>
            <p className="text-xs text-zinc-500 max-w-sm mb-4">
              Selecione uma nota na barra lateral ou crie uma nova para começar a escrever.
            </p>
            <button
              type="button"
              onClick={() => handleCreateNote('texto')}
              className="h-8 px-4 text-xs font-bold rounded-none bg-white text-black hover:bg-zinc-200 transition-colors cursor-pointer font-sansation"
            >
              Criar Nova Nota
            </button>
          </div>
        )}
      </main>

      {/* Modal de Upload de Arquivos para Synap AI */}
      {isUploadModalOpen && (
        <div
          className="fixed inset-0 z-[2000] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 select-none animate-in fade-in duration-150 font-sansation"
          onClick={() => setIsUploadModalOpen(false)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setIsUploadModalOpen(false);
          }}
        >
          <div
            className="w-full max-w-[440px] bg-[#181818] border border-white/10 rounded-none shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 flex flex-col gap-4">
              {/* Header do Modal */}
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-none bg-white/5 text-white border border-white/10 flex items-center justify-center shrink-0">
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
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white leading-tight">
                    Carregar Arquivos
                  </h3>
                  <span className="text-[11px] text-zinc-400 block mt-0.5">
                    Adicione documentos, PDFs ou imagens para análise
                  </span>
                </div>
              </div>

              {/* Área de Drop / Seleção de Arquivo */}
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={handleFileSelect}
              />
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border border-dashed border-white/15 hover:border-white/40 p-6 flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors bg-[#121212] group rounded-none"
              >
                <div className="w-8 h-8 rounded-none bg-white/5 flex items-center justify-center text-zinc-400 group-hover:text-white transition-colors">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="12" y1="18" x2="12" y2="12" />
                    <line x1="9" y1="15" x2="15" y2="15" />
                  </svg>
                </div>
                <span className="text-xs font-semibold text-zinc-300 group-hover:text-white">
                  Clique ou arraste arquivos aqui
                </span>
                <span className="text-[10px] text-zinc-500 font-mono">
                  PDF, DOCX, TXT, PNG, JPG (até 50MB)
                </span>
              </div>

              {/* Lista de Arquivos Selecionados */}
              {uploadedFiles.length > 0 && (
                <div className="flex flex-col gap-1 max-h-[140px] overflow-y-auto [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-white/10">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">
                    Arquivos Anexados ({uploadedFiles.length})
                  </span>
                  {uploadedFiles.map((file, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2 bg-[#121212] border border-white/10 text-xs rounded-none"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className="text-zinc-300 truncate text-[11px]">{file.name}</span>
                        <span className="text-zinc-500 text-[10px] font-mono">
                          {(file.size / 1024).toFixed(0)} KB
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveFile(idx)}
                        className="text-zinc-500 hover:text-red-400 p-1 cursor-pointer"
                        aria-label={`Remover ${file.name}`}
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <line x1="18" y1="6" x2="6" y2="18" />
                          <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer de Ações */}
            <div className="bg-[#121212] border-t border-white/10 px-5 py-3 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsUploadModalOpen(false)}
                className="h-8 px-3.5 text-xs font-medium rounded-none bg-transparent hover:bg-white/5 border border-white/10 text-zinc-300 hover:text-white transition-colors cursor-pointer font-sansation"
              >
                Fechar
              </button>
              <button
                type="button"
                onClick={() => setIsUploadModalOpen(false)}
                className="h-8 px-4 text-xs font-bold rounded-none bg-white text-black hover:bg-zinc-200 transition-colors cursor-pointer font-sansation"
              >
                Concluir
              </button>
            </div>
          </div>
        </div>
      )}

      {activeWorkspace && isShareModalOpen && (
        <ShareWorkspaceModal
          workspaceId={activeWorkspace.id}
          isOpen={isShareModalOpen}
          onClose={async () => {
            setIsShareModalOpen(false);
            try {
              const refreshed = await api(`/workspaces/${activeWorkspace.id}`);
              if (refreshed) {
                setActiveWorkspace(refreshed);
                setWorkspaces((prev) => prev.map((w) => (w.id === refreshed.id ? refreshed : w)));
              }
            } catch {}
          }}
        />
      )}
    </div>
  );
}
