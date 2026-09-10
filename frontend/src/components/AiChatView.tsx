'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '@/lib/api';
import katex from 'katex';

export interface AiChatThread {
  id: string;
  titulo: string;
  workspaceId: string;
  createdAt: string;
  updatedAt: string;
  _count?: {
    mensagens: number;
  };
}

export interface AiChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  conteudo: string;
  metadata?: any;
  createdAt?: string;
}

interface AiChatViewProps {
  workspaceId: string;
  activeNote?: { id: string; titulo: string; conteudo?: string } | null;
  onOpenNota?: (nota: any) => void;
  onRefreshWorkspace?: () => void;
  onClose: () => void;
  isDrawer?: boolean;
  onToggleDrawerMode?: () => void;
}

// Markdown and LaTeX Formatter Component
function FormattedAiContent({ content, onOpenNoteById }: { content: string; onOpenNoteById?: (noteId: string) => void }) {
  const renderFormattedText = (text: string) => {
    // 1. Split code blocks (```lang ... ```)
    const codeBlockRegex = /```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g;
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match;

    while ((match = codeBlockRegex.exec(text)) !== null) {
      const precedingText = text.substring(lastIndex, match.index);
      if (precedingText) {
        parts.push(renderTextAndMath(precedingText, `text-${lastIndex}`));
      }

      const lang = match[1] || 'plaintext';
      const codeContent = match[2];
      const blockKey = `code-${match.index}`;

      parts.push(
        <div
          key={blockKey}
          className="my-3 rounded border border-[var(--accents-2)] bg-[var(--accents-1)] overflow-hidden font-mono text-xs"
        >
          <div className="flex items-center justify-between px-3 py-1.5 bg-[var(--accents-2)]/40 border-b border-[var(--accents-2)] text-[var(--accents-5)] text-[11px]">
            <span>{lang}</span>
            <button
              onClick={() => navigator.clipboard.writeText(codeContent)}
              className="flex items-center gap-1 hover:text-[var(--foreground)] transition-colors cursor-pointer px-1.5 py-0.5 rounded hover:bg-[var(--accents-2)]"
              title="Copiar código"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
              Copiar
            </button>
          </div>
          <pre className="p-3 overflow-x-auto text-[var(--foreground)] leading-relaxed whitespace-pre font-mono">
            <code>{codeContent}</code>
          </pre>
        </div>
      );

      lastIndex = match.index + match[0].length;
    }

    const remainingText = text.substring(lastIndex);
    if (remainingText) {
      parts.push(renderTextAndMath(remainingText, `text-${lastIndex}`));
    }

    return parts;
  };

  const renderTextAndMath = (plainText: string, keyPrefix: string): React.ReactNode => {
    // Split block math $$...$$
    const blockMathRegex = /\$\$([\s\S]*?)\$\$/g;
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match;

    while ((match = blockMathRegex.exec(plainText)) !== null) {
      const preceding = plainText.substring(lastIndex, match.index);
      if (preceding) {
        parts.push(renderInlineFormatting(preceding, `${keyPrefix}-pre-${lastIndex}`));
      }

      const mathSource = match[1];
      let html = '';
      try {
        html = katex.renderToString(mathSource, { displayMode: true, throwOnError: false });
      } catch {
        html = mathSource;
      }

      parts.push(
        <div
          key={`${keyPrefix}-math-block-${match.index}`}
          className="my-3 overflow-x-auto py-2 text-center text-[var(--foreground)]"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      );

      lastIndex = match.index + match[0].length;
    }

    const remaining = plainText.substring(lastIndex);
    if (remaining) {
      parts.push(renderInlineFormatting(remaining, `${keyPrefix}-post-${lastIndex}`));
    }

    return <div key={keyPrefix}>{parts}</div>;
  };

  const renderInlineFormatting = (chunk: string, key: string): React.ReactNode => {
    // Process markdown headers, bold, italics, inline code, and inline math ($...$)
    const lines = chunk.split('\n');

    return (
      <div key={key} className="space-y-2">
        {lines.map((line, lineIdx) => {
          if (!line.trim()) {
            return <div key={lineIdx} className="h-2" />;
          }

          // Headers
          if (line.startsWith('### ')) {
            return (
              <h3 key={lineIdx} className="text-sm font-semibold text-[var(--foreground)] mt-3 mb-1">
                {parseInlineSpans(line.replace('### ', ''))}
              </h3>
            );
          }
          if (line.startsWith('## ')) {
            return (
              <h2 key={lineIdx} className="text-base font-bold text-[var(--foreground)] mt-4 mb-1.5 border-b border-[var(--accents-2)] pb-1">
                {parseInlineSpans(line.replace('## ', ''))}
              </h2>
            );
          }
          if (line.startsWith('# ')) {
            return (
              <h1 key={lineIdx} className="text-lg font-bold text-[var(--foreground)] mt-4 mb-2">
                {parseInlineSpans(line.replace('# ', ''))}
              </h1>
            );
          }

          // Bullet lists
          if (line.startsWith('- ') || line.startsWith('* ')) {
            return (
              <div key={lineIdx} className="flex items-start gap-2 pl-2 text-sm text-[var(--foreground)] leading-relaxed">
                <span className="text-[var(--accents-4)] mt-1">•</span>
                <span className="flex-1">{parseInlineSpans(line.substring(2))}</span>
              </div>
            );
          }

          // Numbered lists
          const numMatch = line.match(/^(\d+)\.\s+(.*)$/);
          if (numMatch) {
            return (
              <div key={lineIdx} className="flex items-start gap-2 pl-2 text-sm text-[var(--foreground)] leading-relaxed">
                <span className="text-[var(--accents-5)] font-mono text-xs min-w-[18px]">{numMatch[1]}.</span>
                <span className="flex-1">{parseInlineSpans(numMatch[2])}</span>
              </div>
            );
          }

          // Blockquote
          if (line.startsWith('> ')) {
            return (
              <blockquote
                key={lineIdx}
                className="border-l-2 border-[var(--accents-4)] pl-3 py-0.5 text-sm text-[var(--accents-6)] italic"
              >
                {parseInlineSpans(line.replace('> ', ''))}
              </blockquote>
            );
          }

          // Regular paragraph
          return (
            <p key={lineIdx} className="text-sm text-[var(--foreground)] leading-relaxed">
              {parseInlineSpans(line)}
            </p>
          );
        })}
      </div>
    );
  };

  const parseInlineSpans = (text: string): React.ReactNode[] => {
    // Regex for inline math $...$, inline code `...`, bold **...**, italic *...*
    const tokens = text.split(/(\$[^\$]+?\$|`[^`]+?`|\*\*[^\*]+?\*\*|\*[^\*]+?\*)/g);

    return tokens.map((token, idx) => {
      if (token.startsWith('$') && token.endsWith('$') && token.length > 2) {
        const mathSource = token.slice(1, -1);
        let html = '';
        try {
          html = katex.renderToString(mathSource, { displayMode: false, throwOnError: false });
        } catch {
          html = mathSource;
        }
        return (
          <span
            key={idx}
            className="inline-math px-0.5"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        );
      }

      if (token.startsWith('`') && token.endsWith('`') && token.length > 2) {
        return (
          <code
            key={idx}
            className="font-mono text-xs px-1.5 py-0.5 rounded bg-[var(--accents-2)] text-[var(--foreground)] border border-[var(--accents-3)]"
          >
            {token.slice(1, -1)}
          </code>
        );
      }

      if (token.startsWith('**') && token.endsWith('**') && token.length > 4) {
        return (
          <strong key={idx} className="font-semibold text-[var(--foreground)]">
            {token.slice(2, -2)}
          </strong>
        );
      }

      if (token.startsWith('*') && token.endsWith('*') && token.length > 2) {
        return (
          <em key={idx} className="italic">
            {token.slice(1, -1)}
          </em>
        );
      }

      return <span key={idx}>{token}</span>;
    });
  };

  return <div className="space-y-1">{renderFormattedText(content)}</div>;
}

export default function AiChatView({
  workspaceId,
  activeNote,
  onOpenNota,
  onRefreshWorkspace,
  onClose,
  isDrawer = false,
  onToggleDrawerMode,
}: AiChatViewProps) {
  const [threads, setThreads] = useState<AiChatThread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<AiChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [toolLogs, setToolLogs] = useState<Array<{ name: string; status: 'running' | 'done'; info?: string }>>([]);
  const [includeActiveNote, setIncludeActiveNote] = useState(true);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Auto-scroll to bottom
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingText, toolLogs, scrollToBottom]);

  // Load threads on mount
  const loadThreads = useCallback(async () => {
    try {
      const data = await api(`/ai/workspace/${workspaceId}/threads`);
      if (Array.isArray(data)) {
        setThreads(data);
        if (data.length > 0 && !activeThreadId) {
          setActiveThreadId(data[0].id);
        }
      }
    } catch (err: any) {
      console.error('Erro ao carregar threads de IA:', err);
    }
  }, [workspaceId, activeThreadId]);

  useEffect(() => {
    loadThreads();
  }, [loadThreads]);

  // Load messages when active thread changes
  const loadThreadMessages = useCallback(async (threadId: string) => {
    try {
      setErrorMessage(null);
      const data = await api(`/ai/threads/${threadId}`);
      if (data && Array.isArray(data.mensagens)) {
        setMessages(data.mensagens);
      }
    } catch (err: any) {
      console.error('Erro ao carregar mensagens da thread:', err);
    }
  }, []);

  useEffect(() => {
    if (activeThreadId) {
      loadThreadMessages(activeThreadId);
    } else {
      setMessages([]);
    }
  }, [activeThreadId, loadThreadMessages]);

  // Create new thread
  const handleCreateNewThread = async () => {
    try {
      const newThread = await api(`/ai/workspace/${workspaceId}/threads`, {
        method: 'POST',
        body: JSON.stringify({ titulo: 'Nova conversa de estudos' }),
      });
      if (newThread && newThread.id) {
        setThreads((prev) => [newThread, ...prev]);
        setActiveThreadId(newThread.id);
        setMessages([]);
        setErrorMessage(null);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao criar nova conversa.');
    }
  };

  // Delete thread
  const handleDeleteThread = async (threadId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await api(`/ai/threads/${threadId}`, { method: 'DELETE' });
      setThreads((prev) => prev.filter((t) => t.id !== threadId));
      if (activeThreadId === threadId) {
        const remaining = threads.filter((t) => t.id !== threadId);
        setActiveThreadId(remaining.length > 0 ? remaining[0].id : null);
      }
    } catch (err: any) {
      console.error('Erro ao deletar thread:', err);
    }
  };

  // Send message with SSE streaming
  const handleSendMessage = async (textToSend?: string) => {
    const messageText = (textToSend || inputValue).trim();
    if (!messageText || isLoading) return;

    setInputValue('');
    setErrorMessage(null);
    setIsLoading(true);
    setStreamingText('');
    setToolLogs([]);

    // Optimistically show user message
    const tempUserMsg: AiChatMessage = {
      id: `temp-${Date.now()}`,
      role: 'user',
      conteudo: messageText,
      metadata: includeActiveNote && activeNote ? { activeNoteId: activeNote.id, activeNoteTitle: activeNote.titulo } : null,
    };
    setMessages((prev) => [...prev, tempUserMsg]);

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    const rawApiUrl = process.env.NEXT_PUBLIC_API_URL || '/api';
    const baseUrl = rawApiUrl.startsWith('http')
      ? rawApiUrl.replace(/\/+$/, '').endsWith('/api')
        ? rawApiUrl.replace(/\/+$/, '')
        : `${rawApiUrl.replace(/\/+$/, '')}/api`
      : '/api';

    try {
      const response = await fetch(`${baseUrl}/ai/workspace/${workspaceId}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          threadId: activeThreadId,
          message: messageText,
          activeNote: includeActiveNote && activeNote ? activeNote : null,
        }),
        signal: abortController.signal,
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || `Erro de conexão (${response.status})`);
      }

      if (!response.body) {
        throw new Error('Streaming não suportado pelo servidor.');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';
      let currentAssistantText = '';
      let targetThreadId = activeThreadId;
      let finalEntities: any = null;

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const block of lines) {
          if (!block.trim()) continue;

          let eventType = 'message';
          let eventData = '';

          const eventLines = block.split('\n');
          for (const line of eventLines) {
            if (line.startsWith('event: ')) {
              eventType = line.replace('event: ', '').trim();
            } else if (line.startsWith('data: ')) {
              eventData = line.replace('data: ', '').trim();
            }
          }

          if (!eventData) continue;

          try {
            const parsed = JSON.parse(eventData);

            if (eventType === 'init') {
              if (parsed.threadId && parsed.threadId !== activeThreadId) {
                targetThreadId = parsed.threadId;
                setActiveThreadId(parsed.threadId);
                loadThreads();
              }
            } else if (eventType === 'delta') {
              currentAssistantText += parsed.text || '';
              setStreamingText(currentAssistantText);
            } else if (eventType === 'tool_call') {
              let label = 'Executando ação...';
              if (parsed.name === 'search_workspace_notes') {
                label = `Pesquisando notas (${parsed.args?.query || 'todas'})...`;
              } else if (parsed.name === 'get_note_details') {
                label = 'Lendo detalhes da nota...';
              } else if (parsed.name === 'create_new_note') {
                label = `Criando nota: "${parsed.args?.title}"...`;
              } else if (parsed.name === 'update_active_note') {
                label = 'Atualizando conteúdo da nota...';
              } else if (parsed.name === 'create_flashcards_deck') {
                label = `Criando baralho de flashcards: "${parsed.args?.deckTitle}" (${parsed.args?.cards?.length || 0} cartões)...`;
              }

              setToolLogs((prev) => [...prev, { name: parsed.name, status: 'running', info: label }]);
            } else if (eventType === 'tool_result') {
              setToolLogs((prev) =>
                prev.map((t) => (t.name === parsed.name ? { ...t, status: 'done' } : t))
              );
            } else if (eventType === 'done') {
              finalEntities = parsed.createdEntities;
              if (parsed.fullText) {
                currentAssistantText = parsed.fullText;
              }
              const assistantMsg: AiChatMessage = {
                id: parsed.messageId || `msg-${Date.now()}`,
                role: 'assistant',
                conteudo: currentAssistantText,
                metadata: { createdEntities: finalEntities },
              };
              setMessages((prev) => [...prev, assistantMsg]);
              setStreamingText('');
              setToolLogs([]);

              if (finalEntities?.notesCreated?.length > 0 || finalEntities?.decksCreated?.length > 0 || finalEntities?.notesUpdated?.length > 0) {
                onRefreshWorkspace?.();
              }
              loadThreads();
            } else if (eventType === 'error') {
              setErrorMessage(parsed.error || 'Erro na resposta da IA.');
            }
          } catch (parseErr) {
            console.error('Erro ao processar evento SSE:', parseErr, eventData);
          }
        }
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setErrorMessage(err.message || 'Falha ao se comunicar com o Synap AI.');
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleStopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsLoading(false);
      if (streamingText) {
        setMessages((prev) => [
          ...prev,
          {
            id: `stopped-${Date.now()}`,
            role: 'assistant',
            conteudo: streamingText,
          },
        ]);
        setStreamingText('');
      }
    }
  };

  // Quick Action Prompts
  const quickActions = [
    {
      title: 'Resumir nota atual',
      prompt: 'Faça um resumo estruturado e conciso dos pontos principais da nota atualmente aberta.',
      disabled: !activeNote,
    },
    {
      title: 'Gerar Flashcards',
      prompt: 'Analise a nota atual e crie um baralho de flashcards com perguntas e respostas eficientes para estudo ativo.',
      disabled: !activeNote,
    },
    {
      title: 'Explicar conceitos difíceis',
      prompt: 'Identifique os conceitos mais complexos nesta nota e explique-os de forma simples e intuitiva com analogias e exemplos.',
      disabled: !activeNote,
    },
    {
      title: 'Criar plano de estudos',
      prompt: 'Crie uma nova nota com um cronograma e roteiro de estudos detalhado sobre os tópicos deste workspace.',
      disabled: false,
    },
  ];

  return (
    <div
      className={`flex flex-col h-full bg-[var(--background)] text-[var(--foreground)] border-l border-[var(--accents-2)] select-text ${
        isDrawer ? 'w-full max-w-full' : 'w-full'
      }`}
    >
      {/* Top Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--accents-2)] bg-[var(--accents-1)]/60 backdrop-blur-sm shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center w-7 h-7 rounded bg-[var(--accents-2)] text-[var(--foreground)]">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold">Synap AI</span>
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-[var(--accents-2)] text-[var(--accents-6)] border border-[var(--accents-3)]">
                Gemini
              </span>
            </div>
            <p className="text-[11px] text-[var(--accents-5)] truncate max-w-[200px]">
              {threads.find((t) => t.id === activeThreadId)?.titulo || 'Assistente de Estudos'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {/* History / Threads Toggle Button */}
          <button
            onClick={() => setIsHistoryOpen((prev) => !prev)}
            className={`p-1.5 rounded text-[var(--accents-5)] hover:text-[var(--foreground)] hover:bg-[var(--accents-2)] transition-colors cursor-pointer ${
              isHistoryOpen ? 'bg-[var(--accents-2)] text-[var(--foreground)]' : ''
            }`}
            title="Histórico de conversas"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
              <path d="M12 7v5l4 2" />
            </svg>
          </button>

          {/* New Chat Button */}
          <button
            onClick={handleCreateNewThread}
            className="p-1.5 rounded text-[var(--accents-5)] hover:text-[var(--foreground)] hover:bg-[var(--accents-2)] transition-colors cursor-pointer"
            title="Nova conversa"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>

          {/* Toggle Drawer / Fullscreen Mode */}
          {onToggleDrawerMode && (
            <button
              onClick={onToggleDrawerMode}
              className="p-1.5 rounded text-[var(--accents-5)] hover:text-[var(--foreground)] hover:bg-[var(--accents-2)] transition-colors cursor-pointer"
              title={isDrawer ? 'Expandir para tela cheia' : 'Modo painel lateral'}
            >
              {isDrawer ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M15 3h6v6" />
                  <path d="M9 21H3v-6" />
                  <path d="M21 3l-7 7" />
                  <path d="M3 21l7-7" />
                </svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 14h6v6" />
                  <path d="M20 10h-6V4" />
                  <path d="M14 10l7-7" />
                  <path d="M3 21l7-7" />
                </svg>
              )}
            </button>
          )}

          {/* Close AI Chat Button */}
          <button
            onClick={onClose}
            className="p-1.5 rounded text-[var(--accents-5)] hover:text-[var(--foreground)] hover:bg-[var(--accents-2)] transition-colors cursor-pointer"
            title="Fechar Synap AI"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>

      {/* History Slide-in / Dropdown Panel */}
      {isHistoryOpen && (
        <div className="border-b border-[var(--accents-2)] bg-[var(--accents-1)] p-3 shrink-0 max-h-60 overflow-y-auto space-y-1.5 animate-fadeIn">
          <div className="flex items-center justify-between text-xs font-semibold text-[var(--accents-5)] px-1 mb-2">
            <span>Conversas salvas</span>
            <button
              onClick={handleCreateNewThread}
              className="flex items-center gap-1 text-[var(--foreground)] hover:underline text-[11px] cursor-pointer"
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Nova conversa
            </button>
          </div>

          {threads.length === 0 ? (
            <p className="text-xs text-[var(--accents-4)] py-2 text-center">Nenhuma conversa salva ainda.</p>
          ) : (
            threads.map((t) => (
              <div
                key={t.id}
                onClick={() => {
                  setActiveThreadId(t.id);
                  setIsHistoryOpen(false);
                }}
                className={`flex items-center justify-between p-2 rounded text-xs cursor-pointer transition-colors group ${
                  activeThreadId === t.id
                    ? 'bg-[var(--accents-2)] text-[var(--foreground)] font-medium'
                    : 'text-[var(--accents-6)] hover:bg-[var(--accents-2)]/60 hover:text-[var(--foreground)]'
                }`}
              >
                <div className="flex items-center gap-2 truncate pr-2">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 text-[var(--accents-4)]">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                  <span className="truncate">{t.titulo}</span>
                </div>
                <button
                  onClick={(e) => handleDeleteThread(t.id, e)}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:text-[var(--error)] transition-opacity"
                  title="Excluir conversa"
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {/* Active Note Context Pill Bar */}
      {activeNote && (
        <div className="flex items-center justify-between px-4 py-2 bg-[var(--accents-1)]/40 border-b border-[var(--accents-2)] text-xs text-[var(--accents-6)] shrink-0">
          <div className="flex items-center gap-2 truncate">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="text-[var(--accents-5)] shrink-0">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
            <span className="truncate font-medium text-[var(--foreground)]">
              {activeNote.titulo || 'Nota sem título'}
            </span>
          </div>
          <label className="flex items-center gap-1.5 cursor-pointer text-[11px] text-[var(--accents-5)] select-none hover:text-[var(--foreground)]">
            <input
              type="checkbox"
              checked={includeActiveNote}
              onChange={(e) => setIncludeActiveNote(e.target.checked)}
              className="rounded accent-[var(--foreground)] w-3.5 h-3.5 cursor-pointer"
            />
            Incluir contexto
          </label>
        </div>
      )}

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && !isLoading && (
          <div className="flex flex-col items-center justify-center h-full text-center px-4 py-8 space-y-4">
            <div className="w-12 h-12 rounded-full border border-[var(--accents-2)] bg-[var(--accents-1)] flex items-center justify-center text-[var(--foreground)] shadow-sm">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
              </svg>
            </div>
            <div className="max-w-sm">
              <h3 className="text-sm font-semibold text-[var(--foreground)]">Como posso ajudar nos seus estudos hoje?</h3>
              <p className="text-xs text-[var(--accents-5)] mt-1 leading-relaxed">
                Posso ler e sintetizar suas anotações, criar novas notas com roteiros de estudo, gerar flashcards e tirar dúvidas conceituais.
              </p>
            </div>

            {/* Quick Actions Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-md pt-2">
              {quickActions.map((action, idx) => (
                <button
                  key={idx}
                  disabled={action.disabled}
                  onClick={() => handleSendMessage(action.prompt)}
                  className={`p-2.5 text-left rounded border border-[var(--accents-2)] bg-[var(--accents-1)] hover:bg-[var(--accents-2)]/60 text-xs transition-colors flex flex-col gap-1 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed`}
                >
                  <span className="font-medium text-[var(--foreground)]">{action.title}</span>
                  <span className="text-[11px] text-[var(--accents-5)] line-clamp-1">{action.prompt}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Render Saved Messages */}
        {messages.map((msg, idx) => {
          const isUser = msg.role === 'user';
          const createdEntities = msg.metadata?.createdEntities;

          return (
            <div
              key={msg.id || idx}
              className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[90%] sm:max-w-[85%] rounded-lg p-3 text-sm leading-relaxed ${
                  isUser
                    ? 'bg-[var(--foreground)] text-[var(--background)] font-normal'
                    : 'bg-[var(--accents-1)] border border-[var(--accents-2)] text-[var(--foreground)]'
                }`}
              >
                {/* Active Note indicator badge for user message */}
                {isUser && msg.metadata?.activeNoteTitle && (
                  <div className="text-[10px] opacity-75 font-mono mb-1 flex items-center gap-1">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    </svg>
                    Nota: {msg.metadata.activeNoteTitle}
                  </div>
                )}

                {isUser ? (
                  <p className="whitespace-pre-wrap">{msg.conteudo}</p>
                ) : (
                  <FormattedAiContent
                    content={msg.conteudo}
                    onOpenNoteById={(noteId) => onOpenNota?.({ id: noteId })}
                  />
                )}

                {/* Render Created Entities Cards if any */}
                {createdEntities && (
                  <div className="mt-3 pt-3 border-t border-[var(--accents-2)] space-y-2">
                    {createdEntities.notesCreated?.map((n: any) => (
                      <div
                        key={n.id}
                        onClick={() => onOpenNota?.({ id: n.id, titulo: n.titulo })}
                        className="flex items-center justify-between p-2 rounded bg-[var(--accents-2)]/60 hover:bg-[var(--accents-2)] border border-[var(--accents-3)] cursor-pointer text-xs transition-colors"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[var(--foreground)]">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                            <polyline points="14 2 14 8 20 8" />
                          </svg>
                          <span className="font-medium text-[var(--foreground)] truncate">Nota criada: {n.titulo}</span>
                        </div>
                        <span className="text-[10px] font-mono text-[var(--accents-5)] underline shrink-0">Abrir</span>
                      </div>
                    ))}

                    {createdEntities.decksCreated?.map((d: any) => (
                      <div
                        key={d.id}
                        className="flex items-center justify-between p-2 rounded bg-[var(--accents-2)]/60 border border-[var(--accents-3)] text-xs"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[var(--foreground)]">
                            <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                            <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                          </svg>
                          <span className="font-medium text-[var(--foreground)] truncate">Deck criado: {d.nome}</span>
                        </div>
                        <span className="text-[10px] font-mono text-[var(--accents-5)] shrink-0">{d.count} cartões</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Live Streaming Assistant Message */}
        {isLoading && (
          <div className="flex flex-col items-start space-y-2">
            {/* Tool Logs */}
            {toolLogs.map((log, idx) => (
              <div
                key={idx}
                className="flex items-center gap-2 text-xs font-mono text-[var(--accents-5)] bg-[var(--accents-1)] px-3 py-1.5 rounded border border-[var(--accents-2)] animate-pulse"
              >
                {log.status === 'running' ? (
                  <div className="w-2.5 h-2.5 rounded-full border-2 border-[var(--foreground)] border-t-transparent animate-spin" />
                ) : (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
                <span>{log.info || log.name}</span>
              </div>
            ))}

            {streamingText && (
              <div className="max-w-[90%] sm:max-w-[85%] rounded-lg p-3 text-sm leading-relaxed bg-[var(--accents-1)] border border-[var(--accents-2)] text-[var(--foreground)]">
                <FormattedAiContent
                  content={streamingText}
                  onOpenNoteById={(noteId) => onOpenNota?.({ id: noteId })}
                />
              </div>
            )}

            {!streamingText && toolLogs.length === 0 && (
              <div className="flex items-center gap-2 p-3 text-xs text-[var(--accents-5)] bg-[var(--accents-1)] rounded border border-[var(--accents-2)]">
                <div className="w-3 h-3 rounded-full border-2 border-[var(--foreground)] border-t-transparent animate-spin" />
                <span>Pensando e estruturando resposta...</span>
              </div>
            )}
          </div>
        )}

        {/* Error Notification */}
        {errorMessage && (
          <div className="p-3 rounded border border-[var(--error)]/40 bg-[var(--error)]/10 text-xs text-[var(--foreground)] flex items-start gap-2">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--error)" strokeWidth="2" className="shrink-0 mt-0.5">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <div className="flex-1 leading-relaxed">
              <p className="font-semibold text-[var(--error)]">Erro na IA</p>
              <p className="mt-0.5">{errorMessage}</p>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-3 border-t border-[var(--accents-2)] bg-[var(--accents-1)]/40 shrink-0">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="relative flex flex-col rounded-lg border border-[var(--accents-2)] bg-[var(--background)] focus-within:border-[var(--accents-5)] transition-colors"
        >
          <textarea
            ref={textareaRef}
            rows={2}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            placeholder="Pergunte ou peça algo para seus estudos... (Shift+Enter para pular linha)"
            className="w-full bg-transparent px-3 pt-2.5 pb-8 text-xs sm:text-sm text-[var(--foreground)] placeholder-[var(--accents-4)] resize-none outline-none font-sans"
          />

          <div className="absolute bottom-2 right-2 flex items-center gap-1.5">
            {isLoading ? (
              <button
                type="button"
                onClick={handleStopGeneration}
                className="flex items-center gap-1 px-2.5 py-1 rounded bg-[var(--accents-2)] hover:bg-[var(--accents-3)] text-xs text-[var(--foreground)] transition-colors cursor-pointer"
              >
                <div className="w-2.5 h-2.5 bg-[var(--foreground)] rounded-sm" />
                Interromper
              </button>
            ) : (
              <button
                type="submit"
                disabled={!inputValue.trim()}
                className="p-1.5 rounded bg-[var(--foreground)] text-[var(--background)] disabled:opacity-30 disabled:cursor-not-allowed hover:opacity-90 transition-opacity cursor-pointer flex items-center justify-center"
                title="Enviar mensagem"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              </button>
            )}
          </div>
        </form>
        <div className="flex items-center justify-between text-[10px] text-[var(--accents-4)] px-1 mt-1.5 font-mono">
          <span>Gemini Flash</span>
          <span>Google AI Studio</span>
        </div>
      </div>
    </div>
  );
}
