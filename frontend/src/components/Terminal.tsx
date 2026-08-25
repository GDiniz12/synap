'use client';

import React, { useState, useRef, useEffect } from 'react';
import { api } from '@/lib/api';

interface TerminalProps {
  workspace: any;
  pastas: any[];
  notas: any[];
  currentUserId?: string;
  onRefreshData: () => Promise<void>;
  onOpenNota: (nota: any) => void;
  onClose: () => void;
}

interface OutputLine {
  id: string;
  type: 'command' | 'output' | 'error' | 'info';
  content: string | React.ReactNode;
}

export default function Terminal({
  workspace,
  pastas,
  notas,
  onRefreshData,
  onOpenNota,
  onClose,
}: TerminalProps) {
  // Navigation / virtual path state: currentFolderId === null means root (~)
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [inputVal, setInputVal] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [historyIdx, setHistoryIdx] = useState<number>(-1);
  const [output, setOutput] = useState<OutputLine[]>([
    {
      id: 'welcome-1',
      type: 'info',
      content: `Synap Terminal v1.0.0 (x86_64-pc-linux-gnu)`,
    },
    {
      id: 'welcome-2',
      type: 'info',
      content: `Workspace: "${workspace?.nome || 'Principal'}". Digite 'help' para ver os comandos disponíveis.`,
    },
  ]);

  const [height, setHeight] = useState(260);
  const [isMaximized, setIsMaximized] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const isResizingRef = useRef(false);

  // Auto focus input when terminal mounts
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Auto scroll to bottom on new output
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [output]);

  // Resizing handle
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizingRef.current) return;
      const newHeight = window.innerHeight - e.clientY;
      if (newHeight >= 140 && newHeight <= window.innerHeight * 0.8) {
        setHeight(newHeight);
      }
    };
    const handleMouseUp = () => {
      isResizingRef.current = false;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  // Compute current folder breadcrumb path
  const getFolderPath = (folderId: string | null): string => {
    if (!folderId) return '~';
    const folder = pastas.find((p) => p.id === folderId);
    if (!folder) return '~';
    if (!folder.parentId) return `~/${folder.nome}`;
    return `${getFolderPath(folder.parentId)}/${folder.nome}`;
  };

  // Helper: Find folder by relative path
  const resolveFolderPath = (pathStr: string, startFolderId: string | null): string | null | 'NOT_FOUND' => {
    const trimmed = pathStr.trim();
    if (!trimmed || trimmed === '.' || trimmed === './') return startFolderId;
    if (trimmed === '/' || trimmed === '~' || trimmed === '~/') return null;

    let segments = trimmed.split('/').filter(Boolean);
    let curr = startFolderId;

    if (trimmed.startsWith('/') || trimmed.startsWith('~')) {
      curr = null;
      if (trimmed.startsWith('~')) segments = segments.slice(1);
    }

    for (const segment of segments) {
      if (segment === '.') continue;
      if (segment === '..') {
        if (!curr) {
          // Already at root
          curr = null;
        } else {
          const currentFolderObj = pastas.find((p) => p.id === curr);
          curr = currentFolderObj?.parentId || null;
        }
      } else {
        const found = pastas.find((p) => p.parentId === curr && p.nome.toLowerCase() === segment.toLowerCase());
        if (!found) return 'NOT_FOUND';
        curr = found.id;
      }
    }
    return curr;
  };

  // Resolve file/item: returns { type: 'pasta' | 'nota', item: any, parentId: string | null } or null
  const resolveItem = (pathStr: string) => {
    const trimmed = pathStr.trim();
    if (!trimmed) return null;

    const parts = trimmed.split('/');
    const itemName = parts.pop()!;
    const dirPart = parts.join('/');

    const parentId = dirPart ? resolveFolderPath(dirPart, currentFolderId) : currentFolderId;
    if (parentId === 'NOT_FOUND') return null;

    const foundPasta = pastas.find((p) => p.parentId === parentId && p.nome.toLowerCase() === itemName.toLowerCase());
    if (foundPasta) return { type: 'pasta' as const, item: foundPasta, parentId };

    const foundNota = notas.find((n) => n.pastaId === parentId && n.titulo.toLowerCase() === itemName.toLowerCase());
    if (foundNota) return { type: 'nota' as const, item: foundNota, parentId };

    return null;
  };

  // Execute terminal command
  const handleCommand = async (rawCmd: string) => {
    const trimmed = rawCmd.trim();
    if (!trimmed) {
      setOutput((prev) => [
        ...prev,
        {
          id: Math.random().toString(),
          type: 'command',
          content: `${getFolderPath(currentFolderId)}$ `,
        },
      ]);
      return;
    }

    // Add to history
    setHistory((prev) => [...prev, rawCmd]);
    setHistoryIdx(-1);

    const promptText = `${getFolderPath(currentFolderId)}$ ${rawCmd}`;
    const newOutputLines: OutputLine[] = [
      {
        id: Math.random().toString(),
        type: 'command',
        content: promptText,
      },
    ];

    // Simple bash arguments parser (preserves quotes)
    const args: string[] = [];
    const regex = /[^\s"']+|"([^"]*)"|'([^']*)'/g;
    let match;
    while ((match = regex.exec(trimmed)) !== null) {
      args.push(match[1] || match[2] || match[0]);
    }

    const command = args[0]?.toLowerCase();
    const cmdArgs = args.slice(1);

    try {
      switch (command) {
        case 'clear':
        case 'cls':
          setOutput([]);
          return;

        case 'pwd':
          newOutputLines.push({
            id: Math.random().toString(),
            type: 'output',
            content: `/workspace/${workspace?.nome || 'default'}${getFolderPath(currentFolderId).replace('~', '')}`,
          });
          break;

        case 'help':
          newOutputLines.push({
            id: Math.random().toString(),
            type: 'output',
            content: (
              <div className="flex flex-col gap-1 text-xs">
                <span className="text-[var(--foreground)] font-semibold mb-1">Comandos Disponíveis:</span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1">
                  <div><span className="text-[var(--success)] font-mono">ls [-l | -a]</span> - Lista arquivos e pastas</div>
                  <div><span className="text-[var(--success)] font-mono">cd &lt;caminho&gt;</span> - Navega entre pastas (ex: cd .., cd Pasta)</div>
                  <div><span className="text-[var(--success)] font-mono">pwd</span> - Exibe o diretório atual</div>
                  <div><span className="text-[var(--success)] font-mono">mkdir &lt;nome&gt;</span> - Cria nova pasta</div>
                  <div><span className="text-[var(--success)] font-mono">touch &lt;nome&gt;</span> - Cria e abre nova nota</div>
                  <div><span className="text-[var(--success)] font-mono">cat &lt;nome&gt;</span> - Exibe conteúdo da nota</div>
                  <div><span className="text-[var(--success)] font-mono">mv &lt;origem&gt; &lt;destino&gt;</span> - Move ou renomeia</div>
                  <div><span className="text-[var(--success)] font-mono">cp &lt;origem&gt; &lt;destino&gt;</span> - Duplica nota</div>
                  <div><span className="text-[var(--success)] font-mono">rm [-r] &lt;alvo&gt;</span> - Remove nota ou pasta</div>
                  <div><span className="text-[var(--success)] font-mono">clear</span> - Limpa a tela do terminal</div>
                </div>
              </div>
            ),
          });
          break;

        case 'cd': {
          const target = cmdArgs[0] || '~';
          const resolved = resolveFolderPath(target, currentFolderId);
          if (resolved === 'NOT_FOUND') {
            newOutputLines.push({
              id: Math.random().toString(),
              type: 'error',
              content: `cd: diretório não encontrado: ${target}`,
            });
          } else {
            setCurrentFolderId(resolved);
          }
          break;
        }

        case 'ls': {
          const targetPath = cmdArgs.find((a) => !a.startsWith('-')) || '.';
          const resolved = resolveFolderPath(targetPath, currentFolderId);

          if (resolved === 'NOT_FOUND') {
            newOutputLines.push({
              id: Math.random().toString(),
              type: 'error',
              content: `ls: não foi possível acessar '${targetPath}': Diretório não encontrado`,
            });
          } else {
            const childPastas = pastas.filter((p) => p.parentId === resolved);
            const childNotas = notas.filter((n) => n.pastaId === resolved);

            if (childPastas.length === 0 && childNotas.length === 0) {
              newOutputLines.push({
                id: Math.random().toString(),
                type: 'info',
                content: '(diretório vazio)',
              });
            } else {
              const isLong = cmdArgs.includes('-l') || cmdArgs.includes('-la') || cmdArgs.includes('-al');
              if (isLong) {
                newOutputLines.push({
                  id: Math.random().toString(),
                  type: 'output',
                  content: (
                    <div className="flex flex-col font-mono text-xs">
                      <span className="text-[var(--accents-4)]">total {childPastas.length + childNotas.length}</span>
                      {childPastas.map((p) => (
                        <div key={p.id} className="flex gap-4">
                          <span className="text-[var(--accents-4)]">drwxr-xr-x</span>
                          <span className="text-[var(--accents-5)]">folder</span>
                          <span className="text-[#38bdf8] font-semibold">{p.nome}/</span>
                        </div>
                      ))}
                      {childNotas.map((n) => (
                        <div key={n.id} className="flex gap-4">
                          <span className="text-[var(--accents-4)]">-rw-r--r--</span>
                          <span className="text-[var(--accents-5)]">{n.conteudo ? n.conteudo.length : 0}B</span>
                          <span className="text-[#e2e8f0]">{n.titulo}</span>
                        </div>
                      ))}
                    </div>
                  ),
                });
              } else {
                newOutputLines.push({
                  id: Math.random().toString(),
                  type: 'output',
                  content: (
                    <div className="flex flex-wrap gap-x-5 gap-y-1 font-mono text-xs">
                      {childPastas.map((p) => (
                        <span key={p.id} className="text-[#38bdf8] font-semibold">
                          {p.nome}/
                        </span>
                      ))}
                      {childNotas.map((n) => (
                        <span key={n.id} className="text-[#e2e8f0]">
                          {n.titulo}
                        </span>
                      ))}
                    </div>
                  ),
                });
              }
            }
          }
          break;
        }

        case 'mkdir': {
          if (cmdArgs.length === 0) {
            newOutputLines.push({
              id: Math.random().toString(),
              type: 'error',
              content: 'mkdir: operando de arquivo ausente',
            });
          } else {
            for (const folderName of cmdArgs) {
              await api('/pastas', {
                method: 'POST',
                body: JSON.stringify({
                  nome: folderName,
                  workspaceId: workspace.id,
                  parentId: currentFolderId,
                }),
              });
            }
            await onRefreshData();
            newOutputLines.push({
              id: Math.random().toString(),
              type: 'info',
              content: `Pasta(s) criada(s) com sucesso.`,
            });
          }
          break;
        }

        case 'touch':
        case 'create': {
          if (cmdArgs.length === 0) {
            newOutputLines.push({
              id: Math.random().toString(),
              type: 'error',
              content: 'touch: operando de arquivo ausente',
            });
          } else {
            let lastCreatedNota: any = null;
            for (const noteTitle of cmdArgs) {
              const newNota = await api('/notas', {
                method: 'POST',
                body: JSON.stringify({
                  titulo: noteTitle,
                  conteudo: '',
                  workspaceId: workspace.id,
                  pastaId: currentFolderId,
                }),
              });
              lastCreatedNota = newNota;
            }
            await onRefreshData();
            if (lastCreatedNota) {
              onOpenNota(lastCreatedNota);
            }
            newOutputLines.push({
              id: Math.random().toString(),
              type: 'info',
              content: `Nota '${cmdArgs[0]}' criada e aberta no editor.`,
            });
          }
          break;
        }

        case 'cat':
        case 'view': {
          if (cmdArgs.length === 0) {
            newOutputLines.push({
              id: Math.random().toString(),
              type: 'error',
              content: 'cat: operando de arquivo ausente',
            });
          } else {
            const itemObj = resolveItem(cmdArgs[0]);
            if (!itemObj || itemObj.type !== 'nota') {
              newOutputLines.push({
                id: Math.random().toString(),
                type: 'error',
                content: `cat: ${cmdArgs[0]}: Arquivo não encontrado ou é um diretório`,
              });
            } else {
              // Strip HTML tags for clean terminal text preview
              const tempDiv = document.createElement('div');
              tempDiv.innerHTML = itemObj.item.conteudo || '(Nota vazia)';
              const plainText = tempDiv.innerText || tempDiv.textContent || '';
              newOutputLines.push({
                id: Math.random().toString(),
                type: 'output',
                content: <div className="whitespace-pre-wrap font-mono text-xs text-[var(--foreground)]">{plainText}</div>,
              });
            }
          }
          break;
        }

        case 'rm': {
          const isRecursive = cmdArgs.includes('-r') || cmdArgs.includes('-rf') || cmdArgs.includes('-fr');
          const targets = cmdArgs.filter((a) => !a.startsWith('-'));

          if (targets.length === 0) {
            newOutputLines.push({
              id: Math.random().toString(),
              type: 'error',
              content: 'rm: operando ausente',
            });
          } else {
            for (const target of targets) {
              const itemObj = resolveItem(target);
              if (!itemObj) {
                newOutputLines.push({
                  id: Math.random().toString(),
                  type: 'error',
                  content: `rm: impossível remover '${target}': Arquivo ou pasta não encontrado`,
                });
              } else if (itemObj.type === 'pasta') {
                if (!isRecursive) {
                  newOutputLines.push({
                    id: Math.random().toString(),
                    type: 'error',
                    content: `rm: impossível remover '${target}': É um diretório (use 'rm -r ${target}')`,
                  });
                } else {
                  await api(`/pastas/${itemObj.item.id}`, { method: 'DELETE' });
                  newOutputLines.push({
                    id: Math.random().toString(),
                    type: 'info',
                    content: `Diretório '${target}' excluído.`,
                  });
                }
              } else {
                await api(`/notas/${itemObj.item.id}`, { method: 'DELETE' });
                newOutputLines.push({
                  id: Math.random().toString(),
                  type: 'info',
                  content: `Nota '${target}' excluída.`,
                });
              }
            }
            await onRefreshData();
          }
          break;
        }

        case 'mv': {
          if (cmdArgs.length < 2) {
            newOutputLines.push({
              id: Math.random().toString(),
              type: 'error',
              content: 'mv: operando de arquivo de destino ausente',
            });
          } else {
            const srcPath = cmdArgs[0];
            const destPath = cmdArgs[1];

            const srcObj = resolveItem(srcPath);
            if (!srcObj) {
              newOutputLines.push({
                id: Math.random().toString(),
                type: 'error',
                content: `mv: impossível obter estado de '${srcPath}': Arquivo ou pasta não encontrado`,
              });
            } else {
              // Check if dest is an existing folder
              const destFolderId = resolveFolderPath(destPath, currentFolderId);

              if (destFolderId !== 'NOT_FOUND') {
                // Moving into destination folder
                if (srcObj.type === 'pasta') {
                  await api(`/pastas/${srcObj.item.id}`, {
                    method: 'PUT',
                    body: JSON.stringify({ parentId: destFolderId }),
                  });
                } else {
                  await api(`/notas/${srcObj.item.id}`, {
                    method: 'PUT',
                    body: JSON.stringify({ pastaId: destFolderId }),
                  });
                }
                newOutputLines.push({
                  id: Math.random().toString(),
                  type: 'info',
                  content: `'${srcPath}' movido para '${destPath}'.`,
                });
              } else {
                // Renaming item
                if (srcObj.type === 'pasta') {
                  await api(`/pastas/${srcObj.item.id}`, {
                    method: 'PUT',
                    body: JSON.stringify({ nome: destPath }),
                  });
                } else {
                  await api(`/notas/${srcObj.item.id}`, {
                    method: 'PUT',
                    body: JSON.stringify({ titulo: destPath }),
                  });
                }
                newOutputLines.push({
                  id: Math.random().toString(),
                  type: 'info',
                  content: `'${srcPath}' renomeado para '${destPath}'.`,
                });
              }
              await onRefreshData();
            }
          }
          break;
        }

        case 'cp': {
          if (cmdArgs.length < 2) {
            newOutputLines.push({
              id: Math.random().toString(),
              type: 'error',
              content: 'cp: operando de arquivo de destino ausente',
            });
          } else {
            const srcObj = resolveItem(cmdArgs[0]);
            const destName = cmdArgs[1];

            if (!srcObj || srcObj.type !== 'nota') {
              newOutputLines.push({
                id: Math.random().toString(),
                type: 'error',
                content: `cp: '${cmdArgs[0]}' não encontrado ou cópia recursiva de diretórios ainda não suportada`,
              });
            } else {
              await api('/notas', {
                method: 'POST',
                body: JSON.stringify({
                  titulo: destName,
                  conteudo: srcObj.item.conteudo || '',
                  workspaceId: workspace.id,
                  pastaId: currentFolderId,
                }),
              });
              await onRefreshData();
              newOutputLines.push({
                id: Math.random().toString(),
                type: 'info',
                content: `Nota '${cmdArgs[0]}' copiada para '${destName}'.`,
              });
            }
          }
          break;
        }

        default:
          newOutputLines.push({
            id: Math.random().toString(),
            type: 'error',
            content: `synap: comando não encontrado: '${command}'. Digite 'help' para ver os comandos.`,
          });
      }
    } catch (err: any) {
      newOutputLines.push({
        id: Math.random().toString(),
        type: 'error',
        content: `Erro na execução: ${err.message || 'Falha na operação'}`,
      });
    }

    setOutput((prev) => [...prev, ...newOutputLines]);
  };

  // Keyboard navigation for History & TAB Autocomplete
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const cmd = inputVal;
      setInputVal('');
      handleCommand(cmd);
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (history.length === 0) return;
      const nextIdx = historyIdx === -1 ? history.length - 1 : Math.max(0, historyIdx - 1);
      setHistoryIdx(nextIdx);
      setInputVal(history[nextIdx] || '');
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIdx === -1) return;
      const nextIdx = historyIdx + 1;
      if (nextIdx >= history.length) {
        setHistoryIdx(-1);
        setInputVal('');
      } else {
        setHistoryIdx(nextIdx);
        setInputVal(history[nextIdx] || '');
      }
      return;
    }

    if (e.key === 'Tab') {
      e.preventDefault();
      const parts = inputVal.split(' ');
      const lastToken = parts[parts.length - 1] || '';

      if (lastToken) {
        const childPastas = pastas.filter((p) => p.parentId === currentFolderId).map((p) => p.nome);
        const childNotas = notas.filter((n) => n.pastaId === currentFolderId).map((n) => n.titulo);
        const allCandidates = [...childPastas, ...childNotas];

        const match = allCandidates.find((c) => c.toLowerCase().startsWith(lastToken.toLowerCase()));
        if (match) {
          parts[parts.length - 1] = match.includes(' ') ? `"${match}"` : match;
          setInputVal(parts.join(' '));
        }
      }
    }
  };

  return (
    <div
      ref={containerRef}
      style={{
        height: isMaximized ? 'calc(100vh - 40px)' : `${height}px`,
        transition: isResizingRef.current ? 'none' : 'height 0.15s ease',
      }}
      className="w-full bg-[#111111] text-[#e0e0e0] border-t border-[var(--accents-2)] flex flex-col font-mono text-xs shadow-2xl relative select-text"
      onClick={() => inputRef.current?.focus()}
    >
      {/* Top Resize Handle Bar */}
      {!isMaximized && (
        <div
          onMouseDown={(e) => {
            e.preventDefault();
            isResizingRef.current = true;
          }}
          className="absolute -top-1 left-0 right-0 h-2 cursor-ns-resize hover:bg-[var(--success)]/40 transition-colors z-20"
          title="Arraste para redimensionar o terminal"
        />
      )}

      {/* Terminal Title Bar */}
      <div className="flex items-center justify-between px-3 h-8 bg-[#181818] border-b border-[#2a2a2a] select-none shrink-0">
        <div className="flex items-center gap-2 text-xs font-semibold text-[#aaaaaa]">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--success)]">
            <polyline points="4 17 10 11 4 5"/>
            <line x1="12" y1="19" x2="20" y2="19"/>
          </svg>
          <span>Terminal (bash)</span>
          <span className="text-[10px] text-[#666666] font-normal hidden sm:inline">| Ctrl + ` para alternar</span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setOutput([]);
            }}
            className="px-2 py-0.5 rounded text-[11px] text-[#888888] hover:text-[#ffffff] hover:bg-[#282828] transition-colors"
            title="Limpar saída (clear)"
          >
            Limpar
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsMaximized((prev) => !prev);
            }}
            className="w-6 h-6 flex items-center justify-center rounded text-[#888888] hover:text-[#ffffff] hover:bg-[#282828] transition-colors"
            title={isMaximized ? 'Restaurar' : 'Maximizar'}
          >
            {isMaximized ? '❐' : '□'}
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="w-6 h-6 flex items-center justify-center rounded text-[#888888] hover:text-[#ff4444] hover:bg-[#282828] transition-colors"
            title="Fechar Terminal"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Terminal Scrollable Logs */}
      <div ref={scrollRef} className="flex-1 p-3 overflow-y-auto space-y-1 leading-relaxed">
        {output.map((line) => (
          <div key={line.id} className="break-all">
            {line.type === 'command' && (
              <span className="text-[#38bdf8] font-semibold">{line.content}</span>
            )}
            {line.type === 'output' && (
              <div className="text-[#e2e8f0]">{line.content}</div>
            )}
            {line.type === 'error' && (
              <span className="text-[#f87171]">{line.content}</span>
            )}
            {line.type === 'info' && (
              <span className="text-[#94a3b8]">{line.content}</span>
            )}
          </div>
        ))}

        {/* Active Input Line */}
        <div className="flex items-center gap-1.5 pt-1">
          <span className="text-[#38bdf8] font-semibold shrink-0">
            {getFolderPath(currentFolderId)}$
          </span>
          <input
            ref={inputRef}
            type="text"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent border-none outline-none text-[#e0e0e0] font-mono text-xs p-0 m-0 focus:ring-0"
            autoFocus
            spellCheck={false}
            autoComplete="off"
          />
        </div>
      </div>
    </div>
  );
}
