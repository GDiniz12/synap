'use client';

import { useEffect, useState, use, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import Link from 'next/link';
import Image from 'next/image';
import Editor from '@/components/Editor';
import Terminal from '@/components/Terminal';
import GraphView from '@/components/GraphView';
import DrawingCanvas from '@/components/DrawingCanvas';
import FlashcardsView from '@/components/FlashcardsView';
import CardModal from '@/components/CardModal';
import SettingsModal from '@/components/SettingsModal';
import LogoutConfirmModal from '@/components/LogoutConfirmModal';
import { translations, Language } from '@/lib/i18n';

export default function WorkspaceLayout({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  
  const [workspace, setWorkspace] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [pastas, setPastas] = useState<any[]>([]);
  const [notas, setNotas] = useState<any[]>([]);
  
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
  const [isMobile, setIsMobile] = useState(false);
  const [isTerminalOpen, setIsTerminalOpen] = useState(false);
  const [isGraphViewOpen, setIsGraphViewOpen] = useState(false);
  const [isFlashcardsOpen, setIsFlashcardsOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);

  // Detect mobile viewport and handle initial sidebar collapse
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      if (mobile) {
        setIsSidebarOpen(false);
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

  // Inline Action (Create / Rename)
  const [inlineAction, setInlineAction] = useState<{ 
    type: 'create' | 'rename',
    itemType: 'pasta' | 'nota',
    id: string, // for create: parentId (or 'root'). for rename: itemId
    value: string 
  } | null>(null);

  const inlineInputRef = useRef<HTMLInputElement>(null);

  // Auto-save logic
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [saveTimeout, setSaveTimeout] = useState<NodeJS.Timeout | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    loadUser();
    loadWorkspace();
    loadPastas();
    loadNotas();
  }, [id]);

  useEffect(() => {
    if (selectedNota) {
      setEditTitle(selectedNota.titulo);
      setEditContent(selectedNota.conteudo || '');
      setSaveStatus('idle');
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

        // Ctrl + 1..9: Switch Tab by index
        if (/^[1-9]$/.test(key)) {
          e.preventDefault();
          const tabIndex = parseInt(key, 10) - 1;
          if (openTabIds[tabIndex]) {
            const targetNoteId = openTabIds[tabIndex];
            const targetNota = notas.find((n) => n.id === targetNoteId);
            if (targetNota) {
              setSelectedNota(targetNota);
            }
          }
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
      setTimeout(() => inlineInputRef.current?.focus(), 50);
    }
  }, [inlineAction]);

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
    } catch (err: any) { setError(err.message); }
  };

  const loadPastas = async () => {
    try {
      const data = await api(`/pastas?workspaceId=${id}`);
      setPastas(data);
    } catch (err: any) { setError(err.message); }
  };

  const loadNotas = async () => {
    try {
      const data = await api(`/notas?workspaceId=${id}`);
      setNotas(data);

      // Check startup behavior from settings
      const startup = localStorage.getItem('synap_startup_behavior') || 'last_note';
      if (startup === 'last_note' && Array.isArray(data) && data.length > 0) {
        const lastVisitedId = localStorage.getItem(`synap_last_note_${id}`);
        const targetNota = data.find((n) => n.id === lastVisitedId) || data[0];
        if (targetNota) {
          openNota(targetNota);
        }
      }
    } catch (err: any) { setError(err.message); }
  };

  // Trigger Inline Creation
  const handleTriggerCreatePasta = (parentId: string | null = null) => {
    if (parentId) {
      // Expand the parent folder so the user can see the input
      setExpandedFolders(prev => ({ ...prev, [parentId]: true }));
    }
    setInlineAction({ type: 'create', itemType: 'pasta', id: parentId || 'root', value: '' });
  };

  // Perform Creation or Rename when input blurs or Enter is pressed
  const handleInlineCommit = async () => {
    if (!inlineAction) return;
    const { type, itemType, id: actionId, value } = inlineAction;
    setInlineAction(null);

    const trimmedValue = value.trim();
    if (!trimmedValue) return;

    try {
      if (type === 'create') {
        const parentId = actionId === 'root' ? null : actionId;
        await api('/pastas', {
          method: 'POST',
          body: JSON.stringify({ nome: trimmedValue, workspaceId: id, parentId }),
        });
        loadPastas();
      } else if (type === 'rename') {
        if (itemType === 'pasta') {
          await api(`/pastas/${actionId}`, {
            method: 'PUT',
            body: JSON.stringify({ nome: trimmedValue }),
          });
          loadPastas();
        } else if (itemType === 'nota') {
          const updated = await api(`/notas/${actionId}`, {
            method: 'PUT',
            body: JSON.stringify({ titulo: trimmedValue }),
          });
          setNotas(prev => prev.map(n => n.id === updated.id ? updated : n));
          if (selectedNota?.id === updated.id) {
            setSelectedNota(updated);
            setEditTitle(updated.titulo);
          }
        }
      }
    } catch (err: any) { setError(err.message); }
  };

  const handleInlineKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleInlineCommit();
    if (e.key === 'Escape') setInlineAction(null);
  };

  const handleCreateNota = async (pastaId: string | null = null, tipo: 'texto' | 'desenho' = 'texto') => {
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
      loadNotas();
      openNota(newNota);
    } catch (err: any) { setError(err.message); }
  };

  const handleCreateDesenho = async (pastaId: string | null = null) => {
    await handleCreateNota(pastaId, 'desenho');
  };

  const openNota = (nota: any) => {
    setSelectedNota(nota);
    setOpenTabIds((prev) => (prev.includes(nota.id) ? prev : [...prev, nota.id]));
    try {
      localStorage.setItem(`synap_last_note_${id}`, nota.id);
    } catch {}
  };

  const handleCloseTab = (tabId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

    setOpenTabIds((prev) => {
      const nextTabs = prev.filter((id) => id !== tabId);

      // If we are closing the currently selected note, switch active tab
      if (selectedNota?.id === tabId) {
        if (nextTabs.length === 0) {
          setSelectedNota(null);
        } else {
          const currentIndex = prev.indexOf(tabId);
          const nextActiveId = currentIndex > 0 ? prev[currentIndex - 1] : nextTabs[0];
          const nextNota = notas.find((n) => n.id === nextActiveId);
          setSelectedNota(nextNota || null);
        }
      }

      return nextTabs;
    });
  };

  const toggleFolder = (pastaId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedFolders(prev => ({ ...prev, [pastaId]: !prev[pastaId] }));
  };

  const handleContextMenu = (e: React.MouseEvent, itemId: string, type: 'pasta' | 'nota', currentName: string) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ visible: true, x: e.clientX, y: e.clientY, id: itemId, type, currentName });
  };

  const handleContextRename = () => {
    if (!contextMenu) return;
    // Set inline action up
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
        if (selectedNota && deletedFolderIds.includes(selectedNota.pastaId)) {
          setSelectedNota(null);
        }
      } else {
        await api(`/notas/${targetId}`, { method: 'DELETE' });
        loadNotas();
        if (selectedNota?.id === targetId) setSelectedNota(null);
      }
    } catch (err: any) { setError(err.message); }
  };

  const autoSaveNota = async (newTitle: string, newContent: string) => {
    if (!selectedNota) return;
    setSaveStatus('saving');
    try {
      const updated = await api(`/notas/${selectedNota.id}`, {
        method: 'PUT',
        body: JSON.stringify({ titulo: newTitle, conteudo: newContent }),
      });
      setNotas(prev => prev.map(n => n.id === updated.id ? updated : n));
      setSelectedNota(updated);
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (err: any) { 
      setError(err.message);
      setSaveStatus('idle');
    }
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setEditTitle(val);
    if (saveTimeout) clearTimeout(saveTimeout);
    setSaveStatus('saving');
    setSaveTimeout(setTimeout(() => autoSaveNota(val, editContent), 1000));
  };

  const handleContentChange = (val: string) => {
    setEditContent(val);
    if (saveTimeout) clearTimeout(saveTimeout);
    setSaveStatus('saving');
    setSaveTimeout(setTimeout(() => autoSaveNota(editTitle, val), 1000));
  };

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
      } catch (err: any) { setError(err.message); }
    } else if (type === 'pasta') {
      if (itemId === targetPastaId) return;
      try {
        await api(`/pastas/${itemId}`, {
          method: 'PUT',
          body: JSON.stringify({ parentId: targetPastaId }),
        });
        loadPastas();
        if (targetPastaId) setExpandedFolders(prev => ({ ...prev, [targetPastaId]: true }));
      } catch (err: any) { setError(err.message); }
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
          padding: '6px 4px', 
          fontSize: '13px', 
          color: selectedNota?.id === nota.id ? 'var(--foreground)' : 'var(--accents-5)',
          background: selectedNota?.id === nota.id ? 'var(--accents-2)' : 'transparent',
          borderRadius: '4px',
          cursor: 'pointer',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          display: 'flex', alignItems: 'center', gap: '8px'
        }}
        className="hover:bg-[var(--accents-2)]"
      >
        {isDrawing ? (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, color: '#38bdf8' }}>
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
    const isRenaming = inlineAction?.type === 'rename' && inlineAction.itemType === 'pasta' && inlineAction.id === pasta.id;
    const isCreatingInside = inlineAction?.type === 'create' && inlineAction.itemType === 'pasta' && inlineAction.id === pasta.id;

    return (
      <div key={pasta.id} style={{ paddingLeft: level > 0 ? '16px' : '0' }}>
        <div 
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 4px', borderRadius: '4px', background: 'transparent' }}
          onClick={(e) => toggleFolder(pasta.id, e)}
          onContextMenu={(e) => handleContextMenu(e, pasta.id, 'pasta', pasta.nome)}
          onDragOver={handleDragOver}
          onDrop={(e) => handleDropToPasta(e, pasta.id)}
          draggable
          onDragStart={(e) => handleDragStart(e, 'pasta', pasta.id)}
          className="hover:bg-[var(--accents-2)] transition-colors group"
        >
          <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--foreground)', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', width: '100%' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, transform: isExpanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s ease' }}>
              <path d="m9 18 6-6-6-6"/>
            </svg>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-1.22-1.8A2 2 0 0 0 8.53 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/></svg>
            {isRenaming ? renderInlineInput() : pasta.nome}
          </span>
        </div>
        
        {/* Children (Only shown if expanded) */}
        {isExpanded && (
          <div style={{ marginLeft: '10px', borderLeft: '1px solid var(--accents-2)', paddingLeft: '4px' }}>
            {isCreatingInside && (
              <div style={{ padding: '4px' }}>
                {renderInlineInput()}
              </div>
            )}
            {childPastas.map(p => renderPasta(p, level + 1))}
            {childNotas.map(nota => renderNota(nota))}
          </div>
        )}
      </div>
    );
  };

  if (!workspace) return <div style={{ padding: 20 }}>Carregando...</div>;

  const rootPastas = pastas.filter(p => !p.parentId);
  const notasSemPasta = notas.filter(n => !n.pastaId);
  const isCreatingRoot = inlineAction?.type === 'create' && inlineAction.id === 'root';

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', background: 'var(--background)' }}>
      
      {/* GLOBAL CONTEXT MENU */}
      {contextMenu && (
        <div style={{ position: 'fixed', top: contextMenu.y, left: contextMenu.x, zIndex: 100, background: 'var(--background)', border: '1px solid var(--accents-2)', borderRadius: '6px', boxShadow: '0 4px 14px 0 rgba(0,0,0,0.1)', padding: '4px', minWidth: '160px', fontSize: '13px', color: 'var(--foreground)' }}>
          {contextMenu.type === 'pasta' && (
            <>
              <div onClick={() => handleTriggerCreatePasta(contextMenu.id)} className="hover:bg-[var(--accents-2)]" style={{ padding: '6px 8px', borderRadius: '4px', cursor: 'pointer' }}>Nova Subpasta</div>
              <div onClick={() => handleCreateNota(contextMenu.id)} className="hover:bg-[var(--accents-2)]" style={{ padding: '6px 8px', borderRadius: '4px', cursor: 'pointer' }}>Nova Nota</div>
              <div onClick={() => handleCreateDesenho(contextMenu.id)} className="hover:bg-[var(--accents-2)]" style={{ padding: '6px 8px', borderRadius: '4px', cursor: 'pointer' }}>Novo Desenho</div>
              <div style={{ height: 1, background: 'var(--accents-2)', margin: '4px 0' }} />
            </>
          )}
          <div onClick={handleContextRename} className="hover:bg-[var(--accents-2)]" style={{ padding: '6px 8px', borderRadius: '4px', cursor: 'pointer' }}>Renomear</div>
          <div onClick={handleContextDelete} className="hover:bg-[var(--accents-2)]" style={{ padding: '6px 8px', borderRadius: '4px', cursor: 'pointer', color: 'var(--error)' }}>Excluir</div>
        </div>
      )}

      {/* CUSTOM DELETE CONFIRMATION MODAL */}
      {deleteModal && (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            background: 'rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px'
          }}
          onClick={() => setDeleteModal(null)}
        >
          <div 
            style={{
              background: 'var(--background)',
              border: '1px solid var(--accents-2)',
              borderRadius: '10px',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.2)',
              width: '100%',
              maxWidth: '420px',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                background: 'rgba(238, 0, 0, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--error)',
                flexShrink: 0
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 6h18"/>
                  <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
                  <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
                  <line x1="10" y1="11" x2="10" y2="17"/>
                  <line x1="14" y1="11" x2="14" y2="17"/>
                </svg>
              </div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: 'var(--foreground)' }}>
                Excluir {deleteModal.type === 'pasta' ? 'Pasta' : 'Nota'}
              </h3>
            </div>

            <p style={{ margin: 0, fontSize: '14px', lineHeight: '1.5', color: 'var(--accents-5)' }}>
              Tem certeza de que deseja excluir <strong style={{ color: 'var(--foreground)' }}>"{deleteModal.name}"</strong>? {deleteModal.type === 'pasta' ? 'Todas as subpastas e notas contidas nela também serão excluídas permanentemente.' : 'Esta ação não poderá ser desfeita.'}
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
              <button
                type="button"
                onClick={() => setDeleteModal(null)}
                className="geist-button-secondary"
                style={{ height: '36px', padding: '0 16px', fontSize: '13px', borderRadius: '6px', cursor: 'pointer' }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                style={{
                  height: '36px',
                  padding: '0 16px',
                  fontSize: '13px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  background: 'var(--error)',
                  color: '#ffffff',
                  border: 'none',
                  fontWeight: 500,
                  transition: 'opacity 0.2s ease'
                }}
                className="hover:opacity-90 active:opacity-80"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MOBILE BACKDROP OVERLAY FOR SIDEBAR */}
      {isMobile && isSidebarOpen && (
        <div
          onClick={() => setIsSidebarOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(3px)',
            zIndex: 90,
          }}
        />
      )}

      {/* SIDEBAR */}
      <div 
        style={{ 
          position: isMobile ? 'fixed' : 'relative',
          top: 0,
          bottom: 0,
          left: 0,
          zIndex: isMobile ? 100 : 'auto',
          width: isSidebarOpen ? (isMobile ? '82vw' : '280px') : '0px', 
          maxWidth: isMobile ? '320px' : 'none',
          minWidth: isSidebarOpen ? (isMobile ? '82vw' : '280px') : '0px', 
          background: 'var(--accents-1)', 
          borderRight: isSidebarOpen ? '1px solid var(--accents-2)' : 'none', 
          display: 'flex', 
          flexDirection: 'column', 
          overflow: 'hidden',
          transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
          whiteSpace: 'nowrap',
          boxShadow: isMobile && isSidebarOpen ? '4px 0 24px rgba(0,0,0,0.5)' : 'none',
        }}
      >
        <div style={{ width: '280px', height: '100%', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '16px 16px 12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <Link 
                href="/dashboard" 
                style={{ 
                  display: 'inline-flex', 
                  alignItems: 'center', 
                  textDecoration: 'none',
                  borderRadius: '6px',
                  transition: 'opacity 0.15s ease' 
                }} 
                className="hover:opacity-75"
                title="Voltar para o Dashboard"
              >
                <Image 
                  src="/synap-logo-unique.png" 
                  alt="Synap" 
                  width={64} 
                  height={64} 
                  style={{ objectFit: 'contain', width: '25px', height: '25px' }} 
                  className="dark:invert-0 invert"
                  priority
                />
              </Link>
              <button 
                onClick={() => setIsSidebarOpen(false)}
                className="geist-button-secondary"
                style={{ padding: 0, width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '6px' }}
                title="Recolher barra lateral (Ctrl + \)"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="18" height="18" x="3" y="3" rx="2"/>
                  <path d="M9 3v18"/>
                  <path d="m16 15-3-3 3-3"/>
                </svg>
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <h2 style={{ margin: '0', fontSize: '16px', fontWeight: 600, color: 'var(--foreground)' }}>
                {workspace.nome}
              </h2>
            </div>
          </div>

          {/* Toolbar below the line */}
          <div style={{ display: 'flex', gap: '8px', padding: '12px 16px', background: 'var(--accents-1)' }}>
            <button onClick={() => handleTriggerCreatePasta(null)} className="geist-button-secondary" style={{ padding: 0, width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '6px' }} title="Nova pasta">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-1.22-1.8A2 2 0 0 0 8.53 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/><line x1="12" y1="10" x2="12" y2="16"/><line x1="9" y1="13" x2="15" y2="13"/></svg>
            </button>
            <button onClick={() => handleCreateNota(null)} className="geist-button-secondary" style={{ padding: 0, width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '6px' }} title="Nova nota">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            </button>
            <button onClick={() => handleCreateDesenho(null)} className="geist-button-secondary" style={{ padding: 0, width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '6px' }} title="Desenho">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
              </svg>
            </button>
            <button 
              onClick={() => {
                setIsFlashcardsOpen(prev => !prev);
                if (!isFlashcardsOpen) {
                  setIsGraphViewOpen(false);
                }
              }} 
              className={`geist-button-secondary transition-colors ${isFlashcardsOpen ? 'bg-[var(--foreground)] text-[var(--background)] border-[var(--foreground)]' : ''}`}
              style={{ padding: 0, width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '6px' }} 
              title="Flashcards"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="18" height="18" x="3" y="3" rx="2"/>
                <path d="m9 12 2 2 4-4"/>
              </svg>
            </button>
            <button 
              onClick={() => {
                setIsGraphViewOpen(prev => !prev);
                if (!isGraphViewOpen) {
                  setIsFlashcardsOpen(false);
                }
              }} 
              className={`geist-button-secondary transition-colors ${isGraphViewOpen ? 'bg-[var(--foreground)] text-[var(--background)] border-[var(--foreground)]' : ''}`}
              style={{ padding: 0, width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '6px' }} 
              title="Grafo"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="18" cy="5" r="3"/>
                <circle cx="6" cy="12" r="3"/>
                <circle cx="18" cy="19" r="3"/>
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
                <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
              </svg>
            </button>
          </div>

          <div 
            style={{ flex: 1, overflowY: 'auto', padding: '12px 8px' }}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDropToPasta(e, null)} // Drop to root
          >
            {error && <div style={{ color: 'var(--error)', fontSize: '12px', marginBottom: 16, padding: '0 8px' }}>{error}</div>}

            {/* Unified Tree (Folders first, then files) */}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {isCreatingRoot && (
                <div style={{ padding: '4px' }}>
                  {renderInlineInput()}
                </div>
              )}
              {rootPastas.map(pasta => renderPasta(pasta, 0))}
              {notasSemPasta.map(nota => renderNota(nota))}
            </div>

            {!isCreatingRoot && rootPastas.length === 0 && notasSemPasta.length === 0 && (
               <div style={{ padding: '24px 8px', fontSize: '13px', color: 'var(--accents-4)', textAlign: 'center' }}>
                 Workspace vazio. Crie uma nota ou pasta acima.
               </div>
            )}
          </div>

          {/* User Profile Area */}
          {currentUser && (
            <div style={{ borderTop: '1px solid var(--accents-2)', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--background)', marginTop: 'auto' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                <div style={{ width: 28, height: 28, background: 'var(--foreground)', color: 'var(--background)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 600, flexShrink: 0 }}>
                  {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : currentUser.email.charAt(0).toUpperCase()}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                  <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--foreground)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {currentUser.name || 'User'}
                  </span>
                  <span style={{ fontSize: '11px', color: 'var(--accents-5)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {currentUser.email}
                  </span>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                <button 
                  onClick={() => setIsSettingsOpen(true)}
                  className="geist-button-secondary" 
                  style={{ padding: 0, width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '6px', flexShrink: 0 }} 
                  title="Configurações"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
                </button>
                <button 
                  onClick={() => setIsLogoutConfirmOpen(true)}
                  className="geist-button-secondary" 
                  style={{ padding: 0, width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '6px', flexShrink: 0 }} 
                  title={t('logout')}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                    <polyline points="16 17 21 12 16 7"/>
                    <line x1="21" y1="12" x2="9" y2="12"/>
                  </svg>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* MAIN CONTENT / EDITOR */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', position: 'relative' }}>
        
        {/* TOP TAB BAR (JANELAS DE NOTAS) */}
        <div 
          style={{ 
            height: '40px', 
            minHeight: '40px',
            borderBottom: '1px solid var(--accents-2)', 
            background: 'var(--accents-1)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            padding: '0 12px 0 8px',
            userSelect: 'none',
            zIndex: 10
          }}
        >
          {/* Left: Reopen Sidebar + Tabs list */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', overflowX: 'auto', flex: 1, height: '100%', paddingRight: '8px' }} className="no-scrollbar">
            {/* Reopen Sidebar Button if collapsed */}
            {!isSidebarOpen && (
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="geist-button-secondary"
                style={{
                  width: '28px',
                  height: '28px',
                  padding: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '6px',
                  marginRight: '6px',
                  flexShrink: 0,
                  cursor: 'pointer'
                }}
                title="Abrir barra lateral (Ctrl + \)"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="18" height="18" x="3" y="3" rx="2"/>
                  <path d="M9 3v18"/>
                  <path d="m14 9 3 3-3 3"/>
                </svg>
              </button>
            )}

            {/* List of open note tabs */}
            {openTabIds.map((tabId, index) => {
              const tabNota = notas.find((n) => n.id === tabId);
              const isActive = selectedNota?.id === tabId;
              const isDrawing = (isActive ? selectedNota?.tipo : tabNota?.tipo) === 'desenho';
              const title = (isActive ? editTitle : tabNota?.titulo) || tabNota?.titulo || (isDrawing ? 'Novo Desenho' : 'Sem Título');

              return (
                <div
                  key={tabId}
                  onClick={() => {
                    if (tabNota) setSelectedNota(tabNota);
                  }}
                  onAuxClick={(e) => {
                    if (e.button === 1) {
                      e.preventDefault();
                      handleCloseTab(tabId);
                    }
                  }}
                  title={`${title} (Ctrl+${index + 1})`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '0 10px',
                    height: '30px',
                    fontSize: '13px',
                    fontWeight: isActive ? 500 : 400,
                    color: isActive ? 'var(--foreground)' : 'var(--accents-5)',
                    background: isActive ? 'var(--background)' : 'transparent',
                    border: isActive ? '1px solid var(--accents-2)' : '1px solid transparent',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    flexShrink: 0,
                    maxWidth: '180px',
                    transition: 'all 0.15s ease',
                  }}
                  className={`group ${!isActive ? 'hover:bg-[var(--accents-2)] hover:text-[var(--foreground)]' : ''}`}
                >
                  {isDrawing ? (
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, opacity: isActive ? 1 : 0.7, color: '#38bdf8' }}>
                      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
                    </svg>
                  ) : (
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, opacity: isActive ? 1 : 0.7 }}>
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                      <polyline points="14 2 14 8 20 8"/>
                    </svg>
                  )}
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {title}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => handleCloseTab(tabId, e)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '16px',
                      height: '16px',
                      borderRadius: '4px',
                      border: 'none',
                      background: 'transparent',
                      cursor: 'pointer',
                      color: 'inherit',
                      padding: 0,
                      flexShrink: 0
                    }}
                    className="hover:bg-[var(--accents-3)] hover:text-[var(--foreground)] opacity-60 hover:opacity-100 transition-opacity"
                    title="Fechar aba"
                  >
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18"/>
                      <line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                  </button>
                </div>
              );
            })}

            {/* Quick New Note tab button */}
            <button
              onClick={() => handleCreateNota(null)}
              className="hover:bg-[var(--accents-2)]"
              style={{
                width: '26px',
                height: '26px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '6px',
                border: 'none',
                background: 'transparent',
                color: 'var(--accents-5)',
                cursor: 'pointer',
                flexShrink: 0
              }}
              title="Nova nota"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"/>
                <line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
            </button>
          </div>

          {/* Right: Actions (Terminal Toggle + Save Status) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
            {selectedNota && saveStatus !== 'idle' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--accents-5)' }}>
                {saveStatus === 'saving' ? (
                  <>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 1s linear infinite' }}><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                    <span>Salvando...</span>
                  </>
                ) : (
                  <>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--foreground)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                    <span>Salvo</span>
                  </>
                )}
              </div>
            )}

            {/* Graph View Toggle Button */}
            <button
              type="button"
              onClick={() => {
                setIsGraphViewOpen(prev => !prev);
                if (!isGraphViewOpen) {
                  setIsFlashcardsOpen(false);
                }
              }}
              className={`hover:bg-[var(--accents-2)] transition-colors ${isGraphViewOpen ? 'text-[var(--foreground)] bg-[var(--accents-2)] font-semibold' : 'text-[var(--accents-5)]'}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                height: '28px',
                padding: '0 8px',
                borderRadius: '6px',
                border: '1px solid var(--accents-2)',
                background: isGraphViewOpen ? 'var(--accents-2)' : 'transparent',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: 500
              }}
              title="Visualização em Grafo (Synap Graph View)"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="18" cy="5" r="3"/>
                <circle cx="6" cy="12" r="3"/>
                <circle cx="18" cy="19" r="3"/>
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
                <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
              </svg>
              <span>Grafo</span>
            </button>

            {/* VS Code Style Terminal Toggle Button */}
            <button
              type="button"
              onClick={() => setIsTerminalOpen(prev => !prev)}
              className={`hover:bg-[var(--accents-2)] transition-colors ${isTerminalOpen ? 'text-[var(--foreground)] bg-[var(--accents-2)]' : 'text-[var(--accents-5)]'}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                height: '28px',
                padding: '0 8px',
                borderRadius: '6px',
                border: '1px solid var(--accents-2)',
                background: isTerminalOpen ? 'var(--accents-2)' : 'transparent',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: 500
              }}
              title="Abrir/Fechar Terminal (Ctrl + `)"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="4 17 10 11 4 5"/>
                <line x1="12" y1="19" x2="20" y2="19"/>
              </svg>
              <span>Terminal</span>
            </button>
          </div>
        </div>
        
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
        ) : selectedNota?.tipo === 'desenho' ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
            {/* Minimal Title Header for Canvas */}
            <div style={{ padding: '8px 16px', background: 'var(--accents-1)', borderBottom: '1px solid var(--accents-2)', display: 'flex', alignItems: 'center' }}>
              <input
                value={editTitle}
                onChange={handleTitleChange}
                placeholder="Nome do Desenho..."
                style={{ fontSize: '15px', fontWeight: 600, border: 'none', background: 'transparent', outline: 'none', width: '100%', color: 'var(--foreground)' }}
              />
            </div>
            <div style={{ flex: 1, position: 'relative' }}>
              <DrawingCanvas
                key={selectedNota.id}
                initialData={editContent}
                onChange={handleContentChange}
                title={editTitle}
                notas={notas}
                workspaceId={id}
                onOpenNota={(n) => openNota(n)}
                onOpenCard={(c) => setSelectedCardModal(c)}
              />
            </div>
          </div>
        ) : (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto', position: 'relative' }}>
            {selectedNota ? (
              <div 
                style={{ 
                  padding: isMobile ? '20px 16px 80px' : '48px 64px 64px', 
                  maxWidth: '800px', 
                  width: '100%', 
                  margin: '0 auto', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  height: '100%' 
                }}
              >
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: isMobile ? '16px' : '32px' }}>
                  <input 
                    value={editTitle}
                    onChange={handleTitleChange}
                    placeholder="Sem Título"
                    style={{ 
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
                    value={editContent}
                    onChange={handleContentChange}
                    placeholder={t('editor_placeholder')}
                    notas={notas}
                    onOpenNota={(n) => openNota(n)}
                    workspaceId={workspace?.id}
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
            ) : (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--accents-4)' }}>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '16px', opacity: 0.5 }}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                <p style={{ fontSize: '14px' }}>{t('empty_workspace_select')}</p>
                <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                  <button
                    type="button"
                    onClick={() => handleCreateNota(null)}
                    className="geist-button h-8 text-xs px-3"
                  >
                    {t('new_note')}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCreateDesenho(null)}
                    className="geist-button-secondary h-8 text-xs px-3"
                  >
                    {t('new_drawing')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsGraphViewOpen(true)}
                    className="geist-button-secondary h-8 text-xs px-3"
                  >
                    Grafo
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

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

    </div>
  );
}
