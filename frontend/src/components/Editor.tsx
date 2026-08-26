'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import DrawingEmbedModal from './DrawingEmbedModal';
import DrawingModal from './DrawingModal';
import LiveCursors from './LiveCursors';

interface EditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  notas?: any[];
  onOpenNota?: (nota: any) => void;
  workspaceId?: string;
  isCollaborative?: boolean;
  onOpenCard?: (card: any) => void;
  onUpdateNota?: (updatedNota: any) => void;
  notaId?: string; // New prop for Real-time
}

interface CommandItem {
  id: string;
  title: string;
  subtitle: string;
  keywords: string[];
  icon: React.ReactNode;
  action: (editor: HTMLDivElement) => void;
}

function Editor({ 
  value, 
  onChange: parentOnChange, 
  placeholder = "Digite '/' para comandos, '[[' para notas ou '::' para cards...",
  notas = [],
  onOpenNota,
  workspaceId,
  isCollaborative,
  notaId,
  onOpenCard,
  onUpdateNota
}: EditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);

  const { users, cursors, status, broadcastChange, broadcastCursor } = require('../hooks/useCollaboration').useCollaboration(
    isCollaborative && notaId ? `${workspaceId}:${notaId}` : undefined,
    'document_change',
    (newVal: string) => {
      parentOnChange(newVal);
      if (editorRef.current && editorRef.current.innerHTML !== newVal) {
        editorRef.current.innerHTML = newVal; 
      }
    }
  );

  const onChange = useCallback((val: string) => {
    parentOnChange(val);
    broadcastChange(val);
  }, [parentOnChange, broadcastChange]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const wikiMenuRef = useRef<HTMLDivElement>(null);
  const selectionToolbarRef = useRef<HTMLDivElement>(null);
  const linkPopoverRef = useRef<HTMLDivElement>(null);
  const linkTooltipRef = useRef<HTMLDivElement>(null);
  const imagePopoverRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const wikiItemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Drag overlay & upload state
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Active resizing state (image & drawing height/width)
  const resizingRef = useRef<{
    wrapper: HTMLElement;
    startX: number;
    startY: number;
    startWidth: number;
    startHeight: number;
    type: 'image_width' | 'drawing_height';
  } | null>(null);

  // Drawing embed modal state & Drawing direct edit modal state
  const [isDrawingModalOpen, setIsDrawingModalOpen] = useState(false);
  const [activeDrawingEdit, setActiveDrawingEdit] = useState<any | null>(null);

  // Slash menu state
  const [slashMenu, setSlashMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    query: string;
    selectedIndex: number;
  }>({
    visible: false,
    x: 0,
    y: 0,
    query: '',
    selectedIndex: 0,
  });

  // Wikilink [[ menu state
  const [wikiMenu, setWikiMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    query: string;
    selectedIndex: number;
  }>({
    visible: false,
    x: 0,
    y: 0,
    query: '',
    selectedIndex: 0,
  });

  // Card Connection :: menu state
  const [cardMenu, setCardMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    query: string;
    selectedIndex: number;
  }>({
    visible: false,
    x: 0,
    y: 0,
    query: '',
    selectedIndex: 0,
  });

  const [cards, setCards] = useState<any[]>([]);
  const cardMenuRef = useRef<HTMLDivElement>(null);
  const cardItemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Load cards for card connection
  useEffect(() => {
    if (!workspaceId) return;
    api(`/flashcards/cards/workspace?workspaceId=${workspaceId}`)
      .then((data) => {
        if (Array.isArray(data)) setCards(data);
      })
      .catch((err) => console.error('Erro ao carregar cards no editor', err));
  }, [workspaceId]);

  // Floating selection toolbar state
  const [selectionToolbar, setSelectionToolbar] = useState<{
    visible: boolean;
    x: number;
    y: number;
  }>({
    visible: false,
    x: 0,
    y: 0,
  });

  // Link popover state (for inserting/editing links)
  const [linkPopover, setLinkPopover] = useState<{
    visible: boolean;
    x: number;
    y: number;
    url: string;
    text: string;
    savedRange: Range | null;
  } | null>(null);

  // Image modal/popover state (Upload / URL)
  const [imageModal, setImageModal] = useState<{
    visible: boolean;
    tab: 'upload' | 'url';
    url: string;
    savedRange: Range | null;
  } | null>(null);

  // Link tooltip preview state (when clicking an existing link)
  const [linkTooltip, setLinkTooltip] = useState<{
    visible: boolean;
    x: number;
    y: number;
    url: string;
    linkElement: HTMLAnchorElement | null;
  } | null>(null);

  const [copied, setCopied] = useState(false);
  const isKeyboardNavRef = useRef(false);
  const initialValueRef = useRef(value || '');
  const isInitializedRef = useRef(false);

  // Initialize content once on mount imperatively to keep contentEditable isolated from React reconciliation
  useEffect(() => {
    if (editorRef.current && !isInitializedRef.current) {
      editorRef.current.innerHTML = initialValueRef.current;
      isInitializedRef.current = true;
    }
  }, []);

  // Global mousemove & mouseup for image & drawing resizing
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!resizingRef.current) return;
      const { wrapper, startX, startY, startWidth, startHeight, type } = resizingRef.current;
      if (type === 'image_width') {
        const deltaX = e.clientX - startX;
        const newWidth = Math.max(120, Math.min(800, startWidth + deltaX));
        wrapper.style.width = `${newWidth}px`;
      } else if (type === 'drawing_height') {
        const deltaY = e.clientY - startY;
        const newHeight = Math.max(160, Math.min(900, startHeight + deltaY));
        wrapper.style.height = `${newHeight}px`;
        const canvas = wrapper.querySelector('canvas') as HTMLCanvasElement | null;
        if (canvas) {
          canvas.style.height = `${newHeight}px`;
        }
      }
    };

    const handleMouseUp = () => {
      if (resizingRef.current) {
        resizingRef.current = null;
        if (editorRef.current) {
          onChange(editorRef.current.innerHTML);
        }
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [onChange]);

  const handleInput = () => {
    if (!editorRef.current) return;
    onChange(editorRef.current.innerHTML);
    checkSlashTrigger();
    checkWikiTrigger();
    checkSelection();
  };

  // Helper to remove the typed slash command text (/query)
  const removeSlashText = () => {
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return;

    const range = sel.getRangeAt(0);
    const textNode = range.startContainer;

    if (textNode.nodeType === Node.TEXT_NODE && textNode.nodeValue) {
      const text = textNode.nodeValue;
      const caretOffset = range.startOffset;
      const slashIndex = text.lastIndexOf('/', caretOffset);

      if (slashIndex !== -1) {
        const newRange = document.createRange();
        newRange.setStart(textNode, slashIndex);
        newRange.setEnd(textNode, caretOffset);
        newRange.deleteContents();

        sel.removeAllRanges();
        sel.addRange(newRange);
        newRange.collapse(true);
      }
    }
  };

  // Helper to remove the typed wikilink trigger [[query
  const removeWikiTriggerText = () => {
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return;

    const range = sel.getRangeAt(0);
    const textNode = range.startContainer;

    if (textNode.nodeType === Node.TEXT_NODE && textNode.nodeValue) {
      const text = textNode.nodeValue;
      const caretOffset = range.startOffset;
      const wikiIndex = text.lastIndexOf('[[', caretOffset);

      if (wikiIndex !== -1) {
        const newRange = document.createRange();
        newRange.setStart(textNode, wikiIndex);
        newRange.setEnd(textNode, caretOffset);
        newRange.deleteContents();

        sel.removeAllRanges();
        sel.addRange(newRange);
        newRange.collapse(true);
      }
    }
  };

  // Insert connected note (wikilink badge)
  const insertNoteLink = (targetNota: any) => {
    if (!editorRef.current) return;
    editorRef.current.focus();

    removeWikiTriggerText();
    removeSlashText();

    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return;

    const range = sel.getRangeAt(0);

    const a = document.createElement('a');
    a.className = 'synap-wikilink';
    a.setAttribute('data-note-id', targetNota.id);
    a.href = `#note-${targetNota.id}`;
    a.title = `Abrir nota: ${targetNota.titulo}`;
    a.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="opacity:0.75;flex-shrink:0;"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg><span>${targetNota.titulo}</span>`;

    range.insertNode(a);

    // Space after link
    const spaceNode = document.createTextNode('\u00A0');
    a.parentNode?.insertBefore(spaceNode, a.nextSibling);

    const newRange = document.createRange();
    newRange.setStartAfter(spaceNode);
    newRange.collapse(true);
    sel.removeAllRanges();
    sel.addRange(newRange);

    setWikiMenu((prev) => ({ ...prev, visible: false }));
    setSlashMenu((prev) => ({ ...prev, visible: false }));

    onChange(editorRef.current.innerHTML);
  };

  // Helper to remove the typed card trigger ::query
  const removeCardTriggerText = () => {
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return;

    const range = sel.getRangeAt(0);
    const textNode = range.startContainer;

    if (textNode.nodeType === Node.TEXT_NODE && textNode.nodeValue) {
      const text = textNode.nodeValue;
      const caretOffset = range.startOffset;
      const cardIndex = text.lastIndexOf('::', caretOffset);

      if (cardIndex !== -1) {
        const newRange = document.createRange();
        newRange.setStart(textNode, cardIndex);
        newRange.setEnd(textNode, caretOffset);
        newRange.deleteContents();

        sel.removeAllRanges();
        sel.addRange(newRange);
        newRange.collapse(true);
      }
    }
  };

  // Insert connected flashcard (cardlink badge)
  const insertCardLink = (targetCard: any) => {
    if (!editorRef.current) return;
    editorRef.current.focus();

    removeCardTriggerText();
    removeWikiTriggerText();
    removeSlashText();

    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return;

    const range = sel.getRangeAt(0);

    const a = document.createElement('a');
    a.className = 'synap-cardlink';
    a.setAttribute('data-card-id', targetCard.id);
    a.href = `#card-${targetCard.id}`;
    a.title = `Flashcard: ${targetCard.frente}`;
    a.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="opacity:0.75;flex-shrink:0;"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="m9 12 2 2 4-4"/></svg><span>${targetCard.frente}</span>`;

    range.insertNode(a);

    // Space after link
    const spaceNode = document.createTextNode('\u00A0');
    a.parentNode?.insertBefore(spaceNode, a.nextSibling);

    const newRange = document.createRange();
    newRange.setStartAfter(spaceNode);
    newRange.collapse(true);
    sel.removeAllRanges();
    sel.addRange(newRange);

    setCardMenu((prev) => ({ ...prev, visible: false }));
    setWikiMenu((prev) => ({ ...prev, visible: false }));
    setSlashMenu((prev) => ({ ...prev, visible: false }));

    onChange(editorRef.current.innerHTML);
  };

  // Helper to render drawing snapshot on an embedded canvas
  const renderEmbeddedCanvas = (wrapper: HTMLElement, contentJson?: string) => {
    const canvas = wrapper.querySelector('canvas') as HTMLCanvasElement | null;
    if (!canvas) return;

    let elements: any[] = [];
    if (contentJson) {
      try {
        const parsed = JSON.parse(contentJson);
        if (Array.isArray(parsed)) elements = parsed;
      } catch {}
    }

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const width = rect.width || wrapper.offsetWidth || 500;
    const height = rect.height || wrapper.offsetHeight || 300;

    canvas.width = width * dpr;
    canvas.height = height * dpr;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.fillStyle = '#121212';
    ctx.fillRect(0, 0, width, height);

    // Dot grid
    const gridSize = 24;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    for (let x = 0; x < width; x += gridSize) {
      for (let y = 0; y < height; y += gridSize) {
        ctx.fillRect(x, y, 1.5, 1.5);
      }
    }

    // Auto-center drawing if elements exist
    if (elements.length > 0) {
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      elements.forEach((el) => {
        if (el.points && el.points.length > 0) {
          el.points.forEach((p: any) => {
            minX = Math.min(minX, p.x);
            minY = Math.min(minY, p.y);
            maxX = Math.max(maxX, p.x);
            maxY = Math.max(maxY, p.y);
          });
        } else {
          minX = Math.min(minX, el.x);
          minY = Math.min(minY, el.y);
          maxX = Math.max(maxX, el.x + (el.width || 60));
          maxY = Math.max(maxY, el.y + (el.height || 40));
        }
      });

      const drawWidth = maxX - minX || 1;
      const drawHeight = maxY - minY || 1;
      const scale = Math.min(1.2, Math.min((width - 40) / drawWidth, (height - 40) / drawHeight));
      const offsetX = (width - drawWidth * scale) / 2 - minX * scale;
      const offsetY = (height - drawHeight * scale) / 2 - minY * scale;

      ctx.translate(offsetX, offsetY);
      ctx.scale(scale, scale);

      elements.forEach((el) => {
        ctx.save();
        ctx.strokeStyle = el.strokeColor || '#ffffff';
        ctx.fillStyle = el.fillColor || 'transparent';
        ctx.lineWidth = el.strokeWidth || 2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        if (el.type === 'pencil' && el.points && el.points.length > 0) {
          ctx.beginPath();
          ctx.moveTo(el.points[0].x, el.points[0].y);
          for (let i = 1; i < el.points.length; i++) {
            ctx.lineTo(el.points[i].x, el.points[i].y);
          }
          ctx.stroke();
        } else if (el.type === 'rectangle') {
          if (el.fillColor && el.fillColor !== 'transparent') ctx.fillRect(el.x, el.y, el.width || 0, el.height || 0);
          ctx.strokeRect(el.x, el.y, el.width || 0, el.height || 0);
        } else if (el.type === 'ellipse') {
          const cx = el.x + (el.width || 0) / 2;
          const cy = el.y + (el.height || 0) / 2;
          const rx = Math.abs(el.width || 0) / 2;
          const ry = Math.abs(el.height || 0) / 2;
          if (rx > 0 && ry > 0) {
            ctx.beginPath();
            ctx.ellipse(cx, cy, rx, ry, 0, 0, 2 * Math.PI);
            if (el.fillColor && el.fillColor !== 'transparent') ctx.fill();
            ctx.stroke();
          }
        } else if (el.type === 'line' && el.points && el.points.length >= 2) {
          ctx.beginPath();
          ctx.moveTo(el.points[0].x, el.points[0].y);
          ctx.lineTo(el.points[1].x, el.points[1].y);
          ctx.stroke();
        } else if (el.type === 'arrow' && el.points && el.points.length >= 2) {
          const p1 = el.points[0];
          const p2 = el.points[1];
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.stroke();
          const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
          const headlen = 14;
          ctx.beginPath();
          ctx.moveTo(p2.x, p2.y);
          ctx.lineTo(p2.x - headlen * Math.cos(angle - Math.PI / 6), p2.y - headlen * Math.sin(angle - Math.PI / 6));
          ctx.moveTo(p2.x, p2.y);
          ctx.lineTo(p2.x - headlen * Math.cos(angle + Math.PI / 6), p2.y - headlen * Math.sin(angle + Math.PI / 6));
          ctx.stroke();
        } else if (el.type === 'text' && el.text) {
          ctx.font = '16px "Virgil", "Segoe UI", sans-serif';
          ctx.fillStyle = el.strokeColor || '#ffffff';
          ctx.fillText(el.text, el.x, el.y);
        }
        ctx.restore();
      });
    }

    ctx.restore();
  };

  // Re-render all embedded drawing canvases whenever editor value/notes update
  useEffect(() => {
    if (!editorRef.current) return;
    const drawingWrappers = editorRef.current.querySelectorAll('.synap-drawing-wrapper');
    drawingWrappers.forEach((wrap) => {
      const wrapperEl = wrap as HTMLElement;
      const drawingId = wrapperEl.getAttribute('data-drawing-id');
      const drawingNota = notas.find((n) => n.id === drawingId);
      renderEmbeddedCanvas(wrapperEl, drawingNota?.conteudo);
    });
  }, [value, notas]);

  const insertImageAtRange = (src: string, alt: string = 'Imagem', targetRange?: Range | null) => {
    if (!editorRef.current) return;
    editorRef.current.focus();

    const sel = window.getSelection();
    const range = targetRange || (sel && sel.rangeCount > 0 ? sel.getRangeAt(0) : null);

    const wrapper = document.createElement('div');
    wrapper.className = 'synap-image-wrapper';
    wrapper.contentEditable = 'false';
    wrapper.style.width = '100%';
    wrapper.style.maxWidth = '100%';

    wrapper.innerHTML = `
      <img src="${src}" alt="${alt}" loading="lazy" />
      <div class="synap-image-controls">
        <button type="button" class="synap-img-btn-delete" title="Excluir imagem" style="display:flex;align-items:center;justify-content:center;width:28px;height:28px;background:rgba(0,0,0,0.75);color:#fff;border-radius:6px;border:none;cursor:pointer;backdrop-filter:blur(4px);transition:all 0.15s ease;">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 6h18"/>
            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
            <line x1="10" y1="11" x2="10" y2="17"/>
            <line x1="14" y1="11" x2="14" y2="17"/>
          </svg>
        </button>
      </div>
      <div class="synap-resize-handle" title="Arraste para redimensionar"></div>
    `;

    const pAfter = document.createElement('p');
    pAfter.innerHTML = '<br>';

    if (range && editorRef.current.contains(range.commonAncestorContainer)) {
      range.deleteContents();
      range.insertNode(wrapper);
      wrapper.parentNode?.insertBefore(pAfter, wrapper.nextSibling);

      const newRange = document.createRange();
      newRange.setStart(pAfter, 0);
      newRange.collapse(true);
      sel?.removeAllRanges();
      sel?.addRange(newRange);
    } else {
      editorRef.current.appendChild(wrapper);
      editorRef.current.appendChild(pAfter);
    }

    onChange(editorRef.current.innerHTML);
  };

  // Insert Embedded Drawing Canvas block
  const insertDrawingAtRange = (drawingNota: any, targetRange?: Range | null) => {
    if (!editorRef.current) return;
    editorRef.current.focus();

    const sel = window.getSelection();
    const range = targetRange || (sel && sel.rangeCount > 0 ? sel.getRangeAt(0) : null);

    const wrapper = document.createElement('div');
    wrapper.className = 'synap-drawing-wrapper';
    wrapper.contentEditable = 'false';
    wrapper.setAttribute('data-drawing-id', drawingNota.id);
    wrapper.style.height = '320px';

    wrapper.innerHTML = `
      <div class="synap-drawing-header" style="display:flex;align-items:center;justify-content:space-between;padding:8px 12px;background:#181818;border-bottom:1px solid #282828;">
        <div style="display:flex;align-items:center;gap:6px;">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
          </svg>
          <span style="font-size:12px;font-weight:600;color:#ededed;">${drawingNota.titulo}</span>
        </div>
        <div style="display:flex;align-items:center;gap:6px;">
          <button type="button" class="synap-drawing-btn-edit" title="Editar desenho" style="display:flex;align-items:center;gap:4px;padding:3px 8px;background:#282828;color:#fff;border-radius:4px;border:1px solid #3a3a3a;font-size:11px;font-weight:500;cursor:pointer;">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
            </svg>
            <span>Editar</span>
          </button>
          <button type="button" class="synap-drawing-btn-delete" title="Remover bloco" style="display:flex;align-items:center;justify-content:center;width:22px;height:22px;background:#282828;color:#a0a0a0;border-radius:4px;border:1px solid #3a3a3a;cursor:pointer;">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 6h18"/>
              <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
            </svg>
          </button>
        </div>
      </div>
      <div class="synap-drawing-canvas-container" style="width:100%;height:calc(100% - 37px);background:#121212;position:relative;display:flex;align-items:center;justify-content:center;cursor:pointer;" title="Clique para abrir e editar o desenho">
        <canvas class="synap-embedded-canvas" style="width:100%;height:100%;display:block;"></canvas>
      </div>
      <div class="synap-drawing-resize-handle" title="Arraste para ajustar a altura"></div>
    `;

    const pAfter = document.createElement('p');
    pAfter.innerHTML = '<br>';

    if (range && editorRef.current.contains(range.commonAncestorContainer)) {
      range.deleteContents();
      range.insertNode(wrapper);
      wrapper.parentNode?.insertBefore(pAfter, wrapper.nextSibling);

      const newRange = document.createRange();
      newRange.setStart(pAfter, 0);
      newRange.collapse(true);
      sel?.removeAllRanges();
      sel?.addRange(newRange);
    } else {
      editorRef.current.appendChild(wrapper);
      editorRef.current.appendChild(pAfter);
    }

    // Render snapshot on embedded canvas
    renderEmbeddedCanvas(wrapper, drawingNota.conteudo);

    onChange(editorRef.current.innerHTML);
  };

  // Upload file to backend
  const uploadImageFile = async (file: File, targetRange?: Range | null) => {
    if (!file.type.startsWith('image/')) return;
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const data = await api('/upload', {
        method: 'POST',
        body: formData,
      });

      if (data?.url) {
        insertImageAtRange(data.url, file.name, targetRange);
      }
    } catch (err: any) {
      alert('Erro ao enviar imagem: ' + (err.message || 'Falha no upload'));
    } finally {
      setIsUploading(false);
    }
  };

  // Open Image Modal dialog
  const openImageDialog = () => {
    removeSlashText();
    setSlashMenu((prev) => ({ ...prev, visible: false }));
    setSelectionToolbar((prev) => ({ ...prev, visible: false }));

    const sel = window.getSelection();
    let savedRange: Range | null = null;
    if (sel && sel.rangeCount > 0) {
      savedRange = sel.getRangeAt(0).cloneRange();
    }

    setImageModal({
      visible: true,
      tab: 'upload',
      url: '',
      savedRange,
    });
  };

  // Transform block elements
  const transformCurrentBlockToElement = (tag: 'h1' | 'h2' | 'h3' | 'h4' | 'ul' | 'ol' | 'pre') => {
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount || !editorRef.current) return;

    if (tag === 'ul') {
      removeSlashText();
      document.execCommand('insertUnorderedList', false);
      return;
    }
    if (tag === 'ol') {
      removeSlashText();
      document.execCommand('insertOrderedList', false);
      return;
    }

    const range = sel.getRangeAt(0);
    let node: Node | null = range.startContainer;

    let blockEl: HTMLElement | null = null;
    while (node && node !== editorRef.current) {
      if (node.nodeType === Node.ELEMENT_NODE) {
        const tagName = (node as HTMLElement).tagName.toLowerCase();
        if (['div', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'blockquote', 'section', 'pre'].includes(tagName)) {
          blockEl = node as HTMLElement;
          break;
        }
      }
      node = node.parentNode;
    }

    removeSlashText();

    if (tag === 'pre') {
      const pre = document.createElement('pre');
      const code = document.createElement('code');
      pre.appendChild(code);

      if (blockEl && blockEl !== editorRef.current) {
        const rawText = blockEl.innerText.trim();
        code.innerHTML = rawText ? blockEl.innerHTML : '<br>';
        blockEl.parentNode?.replaceChild(pre, blockEl);
      } else {
        code.innerHTML = '<br>';
        if (range.startContainer === editorRef.current) {
          editorRef.current.appendChild(pre);
        } else {
          range.insertNode(pre);
        }
      }

      const newRange = document.createRange();
      newRange.selectNodeContents(code);
      newRange.collapse(false);
      sel.removeAllRanges();
      sel.addRange(newRange);
      return;
    }

    const newHeading = document.createElement(tag);

    if (blockEl && blockEl !== editorRef.current) {
      const rawText = blockEl.innerText.trim();
      if (!rawText) {
        newHeading.innerHTML = '<br>';
      } else {
        newHeading.innerHTML = blockEl.innerHTML;
      }
      blockEl.parentNode?.replaceChild(newHeading, blockEl);
    } else {
      newHeading.innerHTML = '<br>';
      if (range.startContainer === editorRef.current) {
        editorRef.current.appendChild(newHeading);
      } else {
        range.insertNode(newHeading);
      }
    }

    const newRange = document.createRange();
    newRange.selectNodeContents(newHeading);
    newRange.collapse(false);
    sel.removeAllRanges();
    sel.addRange(newRange);
  };

  const applyInlineFormat = (command: 'bold' | 'italic') => {
    removeSlashText();
    document.execCommand(command, false);
  };

  // Open Link Popover dialog
  const openLinkDialog = (initialText: string = '') => {
    const sel = window.getSelection();
    let savedRange: Range | null = null;
    let x = window.innerWidth / 2 - 160;
    let y = 200;

    if (sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      savedRange = range.cloneRange();
      const rect = range.getBoundingClientRect();
      if (rect.top || rect.left) {
        x = rect.left;
        y = rect.bottom + 8;
        if (x + 320 > window.innerWidth) x = window.innerWidth - 340;
        if (x < 20) x = 20;
      }
    }

    setSlashMenu((prev) => ({ ...prev, visible: false }));
    setSelectionToolbar((prev) => ({ ...prev, visible: false }));
    setLinkTooltip(null);

    setLinkPopover({
      visible: true,
      x,
      y,
      url: '',
      text: initialText,
      savedRange,
    });
  };

  const handleInsertLink = () => {
    if (!linkPopover || !editorRef.current) return;
    const rawUrl = linkPopover.url.trim();
    if (!rawUrl) {
      setLinkPopover(null);
      return;
    }

    let formattedUrl = rawUrl;
    if (!/^https?:\/\//i.test(formattedUrl) && !/^mailto:/i.test(formattedUrl) && !/^tel:/i.test(formattedUrl)) {
      formattedUrl = `https://${formattedUrl}`;
    }

    const displayText = linkPopover.text.trim() ? linkPopover.text.trim() : rawUrl;

    const sel = window.getSelection();
    if (linkPopover.savedRange) {
      sel?.removeAllRanges();
      sel?.addRange(linkPopover.savedRange);

      const a = document.createElement('a');
      a.href = formattedUrl;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.textContent = displayText;

      linkPopover.savedRange.deleteContents();
      linkPopover.savedRange.insertNode(a);

      const spaceNode = document.createTextNode('\u00A0');
      a.parentNode?.insertBefore(spaceNode, a.nextSibling);

      const newRange = document.createRange();
      newRange.setStartAfter(spaceNode);
      newRange.collapse(true);
      sel?.removeAllRanges();
      sel?.addRange(newRange);
    } else {
      document.execCommand('insertHTML', false, `<a href="${formattedUrl}" target="_blank" rel="noopener noreferrer">${displayText}</a>&nbsp;`);
    }

    setLinkPopover(null);
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  // Selection toolbar action handlers
  const handleSelectionHeading = (headingTag: 'h1' | 'h2' | 'h3' | 'h4') => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    document.execCommand('formatBlock', false, `<${headingTag}>`);
    onChange(editorRef.current.innerHTML);
    setTimeout(checkSelection, 50);
  };

  const handleSelectionInline = (command: 'bold' | 'italic') => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    document.execCommand(command, false);
    onChange(editorRef.current.innerHTML);
    setTimeout(checkSelection, 50);
  };

  const handleSelectionList = (type: 'ul' | 'ol') => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    document.execCommand(type === 'ul' ? 'insertUnorderedList' : 'insertOrderedList', false);
    onChange(editorRef.current.innerHTML);
    setTimeout(checkSelection, 50);
  };

  const handleSelectionCode = () => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    const sel = window.getSelection();
    if (sel && !sel.isCollapsed && sel.rangeCount > 0) {
      const selectedText = sel.toString();
      document.execCommand('insertHTML', false, `<pre><code>${selectedText}</code></pre>`);
      onChange(editorRef.current.innerHTML);
    } else {
      transformCurrentBlockToElement('pre');
    }
    setTimeout(checkSelection, 50);
  };

  // Check text selection for floating toolbar
  const checkSelection = useCallback(() => {
    if (linkPopover?.visible || imageModal?.visible || wikiMenu.visible) return;

    const sel = window.getSelection();
    if (
      !sel ||
      sel.isCollapsed ||
      !sel.rangeCount ||
      !editorRef.current ||
      !editorRef.current.contains(sel.anchorNode) ||
      !editorRef.current.contains(sel.focusNode)
    ) {
      setSelectionToolbar((prev) => (prev.visible ? { ...prev, visible: false } : prev));
      return;
    }

    const text = sel.toString().trim();
    if (!text) {
      setSelectionToolbar((prev) => (prev.visible ? { ...prev, visible: false } : prev));
      return;
    }

    const range = sel.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    if (rect.width === 0 && rect.height === 0) {
      setSelectionToolbar((prev) => (prev.visible ? { ...prev, visible: false } : prev));
      return;
    }

    let x = rect.left + rect.width / 2;
    let y = rect.top - 46;

    if (y < 60) {
      y = rect.bottom + 8;
    }

    setSelectionToolbar({
      visible: true,
      x,
      y,
    });
  }, [linkPopover, imageModal, wikiMenu.visible]);

  // Command definitions for Slash Menu
  const commands: CommandItem[] = [
    {
      id: 'connect',
      title: 'Conectar Nota',
      subtitle: 'Criar link/conexão com outra nota do workspace (wikilink)',
      keywords: ['conectar', 'conectar nota', 'link nota', 'wikilink', 'relacao', 'grafo', '[[', 'nota'],
      icon: (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
          <path d="M10 13a3 3 0 0 0 4 0"/>
        </svg>
      ),
      action: () => {
        removeSlashText();
        const sel = window.getSelection();
        if (sel && sel.rangeCount > 0) {
          const range = sel.getRangeAt(0);
          const rect = range.getBoundingClientRect();
          let x = rect.left || 40;
          let y = (rect.bottom || 100) + 8;
          setWikiMenu({
            visible: true,
            x,
            y,
            query: '',
            selectedIndex: 0,
          });
        }
      },
    },
    {
      id: 'connect_card',
      title: 'Conectar Flashcard',
      subtitle: 'Conectar badge de flashcard para revisão rápida (::)',
      keywords: ['conectar card', 'flashcard', 'card', 'anki', 'revisao', 'conectar flashcard', '::'],
      icon: (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect width="18" height="18" x="3" y="3" rx="2"/>
          <path d="m9 12 2 2 4-4"/>
        </svg>
      ),
      action: () => {
        removeSlashText();
        const sel = window.getSelection();
        if (sel && sel.rangeCount > 0) {
          const range = sel.getRangeAt(0);
          const rect = range.getBoundingClientRect();
          let x = rect.left || 40;
          let y = (rect.bottom || 100) + 8;
          setCardMenu({
            visible: true,
            x,
            y,
            query: '',
            selectedIndex: 0,
          });
        }
      },
    },
    {
      id: 'image',
      title: 'Imagem',
      subtitle: 'Upload de arquivo, arrastar ou link da web',
      keywords: ['imagem', 'image', 'foto', 'picture', 'upload', 'figura', 'img'],
      icon: (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect width="18" height="18" x="3" y="3" rx="2" ry="2"/>
          <circle cx="9" cy="9" r="2"/>
          <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
        </svg>
      ),
      action: () => openImageDialog(),
    },
    {
      id: 'drawing',
      title: 'Desenho / Canvas',
      subtitle: 'Criar ou inserir retângulo de desenho na nota',
      keywords: ['desenho', 'canvas', 'excalidraw', 'quadro', 'draw', 'esboco', 'rascunho', 'diagrama'],
      icon: (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
        </svg>
      ),
      action: () => {
        removeSlashText();
        setSlashMenu((prev) => ({ ...prev, visible: false }));
        setIsDrawingModalOpen(true);
      },
    },
    {
      id: 'h1',
      title: 'Título 1',
      subtitle: 'Título de seção grande',
      keywords: ['titulo 1', 'h1', 'heading 1', 't1', 'grande'],
      icon: (
        <span className="font-bold text-xs px-1.5 py-0.5 rounded border border-[var(--accents-3)]">
          H1
        </span>
      ),
      action: () => transformCurrentBlockToElement('h1'),
    },
    {
      id: 'h2',
      title: 'Título 2',
      subtitle: 'Título de seção médio',
      keywords: ['titulo 2', 'h2', 'heading 2', 't2', 'medio'],
      icon: (
        <span className="font-bold text-xs px-1.5 py-0.5 rounded border border-[var(--accents-3)]">
          H2
        </span>
      ),
      action: () => transformCurrentBlockToElement('h2'),
    },
    {
      id: 'h3',
      title: 'Título 3',
      subtitle: 'Título de seção pequeno',
      keywords: ['titulo 3', 'h3', 'heading 3', 't3', 'pequeno'],
      icon: (
        <span className="font-bold text-xs px-1.5 py-0.5 rounded border border-[var(--accents-3)]">
          H3
        </span>
      ),
      action: () => transformCurrentBlockToElement('h3'),
    },
    {
      id: 'h4',
      title: 'Título 4',
      subtitle: 'Título menor de subtópico',
      keywords: ['titulo 4', 'h4', 'heading 4', 't4', 'subtopico'],
      icon: (
        <span className="font-bold text-xs px-1.5 py-0.5 rounded border border-[var(--accents-3)]">
          H4
        </span>
      ),
      action: () => transformCurrentBlockToElement('h4'),
    },
    {
      id: 'ul',
      title: 'Lista com Marcadores',
      subtitle: 'Criar lista simples com bullet points',
      keywords: ['lista', 'bullet', 'marcadores', 'pontos', 'ul', 'lista com marcadores'],
      icon: (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="8" y1="6" x2="21" y2="6"/>
          <line x1="8" y1="12" x2="21" y2="12"/>
          <line x1="8" y1="18" x2="21" y2="18"/>
          <line x1="3" y1="6" x2="3.01" y2="6"/>
          <line x1="3" y1="12" x2="3.01" y2="12"/>
          <line x1="3" y1="18" x2="3.01" y2="18"/>
        </svg>
      ),
      action: () => transformCurrentBlockToElement('ul'),
    },
    {
      id: 'ol',
      title: 'Lista Numerada',
      subtitle: 'Criar lista organizada sequencial (1, 2, 3...)',
      keywords: ['lista numerada', 'numerada', 'ordenada', 'numeros', 'ol', '1.'],
      icon: (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="10" y1="6" x2="21" y2="6"/>
          <line x1="10" y1="12" x2="21" y2="12"/>
          <line x1="10" y1="18" x2="21" y2="18"/>
          <path d="M4 6h1v4"/>
          <path d="M4 10h2"/>
          <path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1"/>
        </svg>
      ),
      action: () => transformCurrentBlockToElement('ol'),
    },
    {
      id: 'code',
      title: 'Bloco de Código',
      subtitle: 'Área para código de programação (estilo VS Code)',
      keywords: ['codigo', 'code', 'bloco de codigo', 'programacao', 'linguagem', 'pre', 'script', 'dev'],
      icon: (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="16 18 22 12 16 6"/>
          <polyline points="8 6 2 12 8 18"/>
        </svg>
      ),
      action: () => transformCurrentBlockToElement('pre'),
    },
    {
      id: 'bold',
      title: 'Negrito',
      subtitle: 'Texto em destaque forte',
      keywords: ['negrito', 'bold', 'forte', 'b'],
      icon: (
        <span className="font-bold text-sm px-1.5 py-0.5 rounded border border-[var(--accents-3)]">
          B
        </span>
      ),
      action: () => applyInlineFormat('bold'),
    },
    {
      id: 'italic',
      title: 'Itálico',
      subtitle: 'Texto inclinado para ênfase',
      keywords: ['italico', 'italic', 'inclinado', 'i', 'enfase'],
      icon: (
        <span className="italic font-serif text-sm px-1.5 py-0.5 rounded border border-[var(--accents-3)]">
          I
        </span>
      ),
      action: () => applyInlineFormat('italic'),
    },
    {
      id: 'link',
      title: 'Link Web',
      subtitle: 'Adicionar link ou hiperlink externo',
      keywords: ['link', 'url', 'hiperlink', 'site', 'adicionar link'],
      icon: (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
        </svg>
      ),
      action: () => {
        removeSlashText();
        openLinkDialog('');
      },
    },
  ];

  const filteredCommands = commands.filter((cmd) => {
    if (!slashMenu.query) return true;
    const q = slashMenu.query.toLowerCase().trim();
    return (
      cmd.title.toLowerCase().includes(q) ||
      cmd.subtitle.toLowerCase().includes(q) ||
      cmd.keywords.some((k) => k.toLowerCase().includes(q))
    );
  });

  // Filter notes for [[ Wikilinks menu
  const filteredWikiNotas = notas.filter((n) => {
    if (!wikiMenu.query) return true;
    const q = wikiMenu.query.toLowerCase().trim();
    return n.titulo.toLowerCase().includes(q);
  });

  // Filter flashcards for :: Card Connection menu
  const filteredCards = cards.filter((c) => {
    if (!cardMenu.query) return true;
    const q = cardMenu.query.toLowerCase().trim();
    return (
      c.frente.toLowerCase().includes(q) ||
      c.verso.toLowerCase().includes(q) ||
      (c.deck?.nome && c.deck.nome.toLowerCase().includes(q))
    );
  });

  const checkSlashTrigger = useCallback(() => {
    if (linkPopover?.visible || imageModal?.visible || wikiMenu.visible || cardMenu.visible) return;

    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) {
      setSlashMenu((prev) => (prev.visible ? { ...prev, visible: false } : prev));
      return;
    }

    const range = sel.getRangeAt(0);
    const textNode = range.startContainer;

    if (textNode.nodeType === Node.TEXT_NODE && textNode.nodeValue) {
      const text = textNode.nodeValue;
      const caretOffset = range.startOffset;

      const textBeforeCaret = text.slice(0, caretOffset);
      const lastSlashIndex = textBeforeCaret.lastIndexOf('/');

      if (
        lastSlashIndex !== -1 &&
        (lastSlashIndex === 0 || /\s/.test(textBeforeCaret[lastSlashIndex - 1]))
      ) {
        const query = textBeforeCaret.slice(lastSlashIndex + 1);

        if (!/\s/.test(query)) {
          const clonedRange = range.cloneRange();
          clonedRange.setStart(textNode, lastSlashIndex);
          clonedRange.setEnd(textNode, caretOffset);
          const rect = clonedRange.getBoundingClientRect();

          let x = rect.left;
          let y = rect.bottom + 8;

          if (x < 20) x = 20;
          if (x + 280 > window.innerWidth) x = window.innerWidth - 300;

          setSlashMenu((prev) => ({
            visible: true,
            x,
            y,
            query,
            selectedIndex: prev.query === query ? prev.selectedIndex : 0,
          }));
          return;
        }
      }
    }

    setSlashMenu((prev) => (prev.visible ? { ...prev, visible: false } : prev));
  }, [linkPopover, imageModal, wikiMenu.visible, cardMenu.visible]);

  // Check [[ Wikilink trigger
  const checkWikiTrigger = useCallback(() => {
    if (linkPopover?.visible || imageModal?.visible || slashMenu.visible || cardMenu.visible) return;

    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) {
      setWikiMenu((prev) => (prev.visible ? { ...prev, visible: false } : prev));
      return;
    }

    const range = sel.getRangeAt(0);
    const textNode = range.startContainer;

    if (textNode.nodeType === Node.TEXT_NODE && textNode.nodeValue) {
      const text = textNode.nodeValue;
      const caretOffset = range.startOffset;

      const textBeforeCaret = text.slice(0, caretOffset);
      const lastWikiIndex = textBeforeCaret.lastIndexOf('[[');

      if (lastWikiIndex !== -1) {
        const query = textBeforeCaret.slice(lastWikiIndex + 2);

        // Don't show if there's a closing bracket or newline
        if (!query.includes(']]') && !query.includes('\n')) {
          const clonedRange = range.cloneRange();
          clonedRange.setStart(textNode, lastWikiIndex);
          clonedRange.setEnd(textNode, caretOffset);
          const rect = clonedRange.getBoundingClientRect();

          let x = rect.left;
          let y = rect.bottom + 8;

          if (x < 20) x = 20;
          if (x + 280 > window.innerWidth) x = window.innerWidth - 300;

          setWikiMenu((prev) => ({
            visible: true,
            x,
            y,
            query,
            selectedIndex: prev.query === query ? prev.selectedIndex : 0,
          }));
          return;
        }
      }
    }

    setWikiMenu((prev) => (prev.visible ? { ...prev, visible: false } : prev));
  }, [linkPopover, imageModal, slashMenu.visible, cardMenu.visible]);

  // Check :: Card Connection trigger
  const checkCardTrigger = useCallback(() => {
    if (linkPopover?.visible || imageModal?.visible || slashMenu.visible || wikiMenu.visible) return;

    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) {
      setCardMenu((prev) => (prev.visible ? { ...prev, visible: false } : prev));
      return;
    }

    const range = sel.getRangeAt(0);
    const textNode = range.startContainer;

    if (textNode.nodeType === Node.TEXT_NODE && textNode.nodeValue) {
      const text = textNode.nodeValue;
      const caretOffset = range.startOffset;

      const textBeforeCaret = text.slice(0, caretOffset);
      const lastCardIndex = textBeforeCaret.lastIndexOf('::');

      if (lastCardIndex !== -1) {
        const query = textBeforeCaret.slice(lastCardIndex + 2);

        if (!query.includes('\n')) {
          const clonedRange = range.cloneRange();
          clonedRange.setStart(textNode, lastCardIndex);
          clonedRange.setEnd(textNode, caretOffset);
          const rect = clonedRange.getBoundingClientRect();

          let x = rect.left;
          let y = rect.bottom + 8;

          if (x < 20) x = 20;
          if (x + 280 > window.innerWidth) x = window.innerWidth - 300;

          setCardMenu((prev) => ({
            visible: true,
            x,
            y,
            query,
            selectedIndex: prev.query === query ? prev.selectedIndex : 0,
          }));
          return;
        }
      }
    }

    setCardMenu((prev) => (prev.visible ? { ...prev, visible: false } : prev));
  }, [linkPopover, imageModal, slashMenu.visible, wikiMenu.visible]);

  const executeCommand = (cmd: CommandItem) => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    cmd.action(editorRef.current);
    setSlashMenu((prev) => ({ ...prev, visible: false }));
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Card connection :: Menu Navigation
    if (cardMenu.visible && filteredCards.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        isKeyboardNavRef.current = true;
        setCardMenu((prev) => {
          const nextIndex = (prev.selectedIndex + 1) % filteredCards.length;
          cardItemRefs.current[nextIndex]?.scrollIntoView({ block: 'nearest' });
          return { ...prev, selectedIndex: nextIndex };
        });
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        isKeyboardNavRef.current = true;
        setCardMenu((prev) => {
          const nextIndex = (prev.selectedIndex - 1 + filteredCards.length) % filteredCards.length;
          cardItemRefs.current[nextIndex]?.scrollIntoView({ block: 'nearest' });
          return { ...prev, selectedIndex: nextIndex };
        });
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        const selected = filteredCards[cardMenu.selectedIndex];
        if (selected) {
          insertCardLink(selected);
        }
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setCardMenu((prev) => ({ ...prev, visible: false }));
        return;
      }
    }

    // Wikilink [[ Menu Navigation
    if (wikiMenu.visible && filteredWikiNotas.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        isKeyboardNavRef.current = true;
        setWikiMenu((prev) => {
          const nextIndex = (prev.selectedIndex + 1) % filteredWikiNotas.length;
          wikiItemRefs.current[nextIndex]?.scrollIntoView({ block: 'nearest' });
          return { ...prev, selectedIndex: nextIndex };
        });
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        isKeyboardNavRef.current = true;
        setWikiMenu((prev) => {
          const nextIndex = (prev.selectedIndex - 1 + filteredWikiNotas.length) % filteredWikiNotas.length;
          wikiItemRefs.current[nextIndex]?.scrollIntoView({ block: 'nearest' });
          return { ...prev, selectedIndex: nextIndex };
        });
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        const selected = filteredWikiNotas[wikiMenu.selectedIndex];
        if (selected) {
          insertNoteLink(selected);
        }
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setWikiMenu((prev) => ({ ...prev, visible: false }));
        return;
      }
    }

    // Slash menu navigation
    if (slashMenu.visible && filteredCommands.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        isKeyboardNavRef.current = true;
        setSlashMenu((prev) => {
          const nextIndex = (prev.selectedIndex + 1) % filteredCommands.length;
          itemRefs.current[nextIndex]?.scrollIntoView({ block: 'nearest' });
          return {
            ...prev,
            selectedIndex: nextIndex,
          };
        });
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        isKeyboardNavRef.current = true;
        setSlashMenu((prev) => {
          const nextIndex = (prev.selectedIndex - 1 + filteredCommands.length) % filteredCommands.length;
          itemRefs.current[nextIndex]?.scrollIntoView({ block: 'nearest' });
          return {
            ...prev,
            selectedIndex: nextIndex,
          };
        });
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        const selected = filteredCommands[slashMenu.selectedIndex];
        if (selected) {
          executeCommand(selected);
        }
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setSlashMenu((prev) => ({ ...prev, visible: false }));
        return;
      }
    }

    // Code block tab indent helper
    if (e.key === 'Tab' && !slashMenu.visible && !wikiMenu.visible) {
      const sel = window.getSelection();
      if (sel && sel.anchorNode) {
        let node: Node | null = sel.anchorNode;
        let inCode = false;
        while (node && node !== editorRef.current) {
          if (node.nodeType === Node.ELEMENT_NODE && (node as HTMLElement).tagName.toLowerCase() === 'pre') {
            inCode = true;
            break;
          }
          node = node.parentNode;
        }
        if (inCode) {
          e.preventDefault();
          document.execCommand('insertText', false, '  ');
        }
      }
    }
  };

  const handleKeyUp = (e: React.KeyboardEvent) => {
    if (['ArrowDown', 'ArrowUp', 'Enter', 'Tab', 'Escape'].includes(e.key)) {
      return;
    }
    checkSlashTrigger();
    checkWikiTrigger();
    checkCardTrigger();
    checkSelection();
  };

  // CLIPBOARD PASTE IMAGE HANDLER
  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (items) {
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            e.preventDefault();
            const sel = window.getSelection();
            const range = sel && sel.rangeCount > 0 ? sel.getRangeAt(0).cloneRange() : null;
            uploadImageFile(file, range);
            return;
          }
        }
      }
    }
  };

  // DRAG & DROP IMAGE HANDLER
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.types.includes('Files')) {
      setIsDraggingOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);

    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.type.startsWith('image/')) {
          uploadImageFile(file);
        }
      }
    }
  };

  // Handle mousedown on editor for Image & Drawing Resize Handles
  const handleMouseDown = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;

    // Image resize handle click
    if (target.classList.contains('synap-resize-handle')) {
      e.preventDefault();
      e.stopPropagation();
      const wrapper = target.closest('.synap-image-wrapper') as HTMLElement | null;
      if (wrapper) {
        resizingRef.current = {
          wrapper,
          startX: e.clientX,
          startY: e.clientY,
          startWidth: wrapper.offsetWidth,
          startHeight: wrapper.offsetHeight,
          type: 'image_width',
        };
      }
      return;
    }

    // Drawing height resize handle click
    if (target.classList.contains('synap-drawing-resize-handle')) {
      e.preventDefault();
      e.stopPropagation();
      const wrapper = target.closest('.synap-drawing-wrapper') as HTMLElement | null;
      if (wrapper) {
        resizingRef.current = {
          wrapper,
          startX: e.clientX,
          startY: e.clientY,
          startWidth: wrapper.offsetWidth,
          startHeight: wrapper.offsetHeight,
          type: 'drawing_height',
        };
      }
      return;
    }
  };

  // Handle click on editor surface, wikilinks, cardlinks, drawing embeds, links, or image delete buttons
  const handleEditorClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;

    // Delete embedded drawing button click
    const deleteDrawingBtn = target.closest('.synap-drawing-btn-delete');
    if (deleteDrawingBtn) {
      e.preventDefault();
      e.stopPropagation();
      const wrapper = deleteDrawingBtn.closest('.synap-drawing-wrapper');
      if (wrapper) {
        wrapper.remove();
        if (editorRef.current) {
          onChange(editorRef.current.innerHTML);
        }
      }
      return;
    }

    // Edit embedded drawing button / canvas click
    const editDrawingBtn = target.closest('.synap-drawing-btn-edit') || target.closest('.synap-drawing-canvas-container');
    if (editDrawingBtn) {
      e.preventDefault();
      e.stopPropagation();
      const wrapper = editDrawingBtn.closest('.synap-drawing-wrapper');
      if (wrapper) {
        const drawingId = wrapper.getAttribute('data-drawing-id');
        if (drawingId) {
          const found = notas.find((n) => n.id === drawingId);
          if (found) {
            setActiveDrawingEdit(found);
          } else {
            api(`/notas/${drawingId}`).then((nota) => {
              if (nota) setActiveDrawingEdit(nota);
            }).catch((err) => console.error('Erro ao carregar desenho', err));
          }
        }
      }
      return;
    }

    // Delete image button click
    const deleteBtn = target.closest('.synap-img-btn-delete');
    if (deleteBtn) {
      e.preventDefault();
      e.stopPropagation();
      const wrapper = deleteBtn.closest('.synap-image-wrapper');
      if (wrapper) {
        const imgEl = wrapper.querySelector('img') as HTMLImageElement | null;
        if (imgEl) {
          const src = imgEl.getAttribute('src') || imgEl.src;
          // If the image is hosted on /uploads/, delete from backend
          const match = src.match(/\/uploads\/([^/?#]+)/);
          if (match && match[1]) {
            const filename = match[1];
            api(`/upload/${filename}`, { method: 'DELETE' }).catch((err) =>
              console.error('Erro ao deletar imagem do servidor:', err)
            );
          }
        }
        wrapper.remove();
        if (editorRef.current) {
          onChange(editorRef.current.innerHTML);
        }
      }
      return;
    }

    // Cardlink Click (Open linked flashcard modal)
    const cardLinkEl = target.closest('a.synap-cardlink') as HTMLAnchorElement | null;
    if (cardLinkEl && editorRef.current?.contains(cardLinkEl)) {
      e.preventDefault();
      e.stopPropagation();
      const targetCardId = cardLinkEl.getAttribute('data-card-id');
      if (targetCardId && onOpenCard) {
        const found = cards.find((c) => c.id === targetCardId);
        if (found) {
          onOpenCard(found);
        }
      }
      return;
    }

    // Wikilink Click (Open linked note)
    const wikiLinkEl = target.closest('a.synap-wikilink') as HTMLAnchorElement | null;
    if (wikiLinkEl && editorRef.current?.contains(wikiLinkEl)) {
      e.preventDefault();
      e.stopPropagation();
      const targetNoteId = wikiLinkEl.getAttribute('data-note-id');
      if (targetNoteId && onOpenNota) {
        const found = notas.find((n) => n.id === targetNoteId);
        if (found) {
          onOpenNota(found);
        }
      }
      return;
    }

    // External Link click
    const linkEl = target.closest('a') as HTMLAnchorElement | null;
    if (linkEl && editorRef.current?.contains(linkEl) && !linkEl.classList.contains('synap-wikilink') && !linkEl.classList.contains('synap-cardlink')) {
      const href = linkEl.getAttribute('href') || linkEl.href;

      if (e.ctrlKey || e.metaKey) {
        window.open(href, '_blank', 'noopener,noreferrer');
        return;
      }

      const rect = linkEl.getBoundingClientRect();
      let x = rect.left;
      let y = rect.bottom + 6;

      if (x + 280 > window.innerWidth) x = window.innerWidth - 300;
      if (x < 20) x = 20;

      setLinkTooltip({
        visible: true,
        x,
        y,
        url: href,
        linkElement: linkEl,
      });
      setSelectionToolbar((prev) => ({ ...prev, visible: false }));
      setSlashMenu((prev) => ({ ...prev, visible: false }));
      setWikiMenu((prev) => ({ ...prev, visible: false }));
      return;
    }

    setLinkTooltip(null);
    checkSlashTrigger();
    checkWikiTrigger();
    checkSelection();
  };

  const handleRemoveLink = () => {
    if (!linkTooltip?.linkElement) return;
    const linkEl = linkTooltip.linkElement;
    const parent = linkEl.parentNode;
    if (parent) {
      while (linkEl.firstChild) {
        parent.insertBefore(linkEl.firstChild, linkEl);
      }
      parent.removeChild(linkEl);
    }
    setLinkTooltip(null);
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const handleCopyLink = () => {
    if (!linkTooltip?.url) return;
    navigator.clipboard.writeText(linkTooltip.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Close menus if clicked outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        editorRef.current &&
        !editorRef.current.contains(e.target as Node)
      ) {
        setSlashMenu((prev) => ({ ...prev, visible: false }));
      }
      if (
        wikiMenuRef.current &&
        !wikiMenuRef.current.contains(e.target as Node) &&
        editorRef.current &&
        !editorRef.current.contains(e.target as Node)
      ) {
        setWikiMenu((prev) => ({ ...prev, visible: false }));
      }
      if (
        selectionToolbarRef.current &&
        !selectionToolbarRef.current.contains(e.target as Node) &&
        editorRef.current &&
        !editorRef.current.contains(e.target as Node)
      ) {
        setSelectionToolbar((prev) => ({ ...prev, visible: false }));
      }
      if (
        linkPopoverRef.current &&
        !linkPopoverRef.current.contains(e.target as Node)
      ) {
        setLinkPopover(null);
      }
      if (
        linkTooltipRef.current &&
        !linkTooltipRef.current.contains(e.target as Node) &&
        editorRef.current &&
        !editorRef.current.contains(e.target as Node)
      ) {
        setLinkTooltip(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div 
      className="relative w-full h-full flex flex-col cursor-text" 
      onClick={() => editorRef.current?.focus()}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onMouseMove={(e) => {
        if (isCollaborative && notaId) {
          const rect = e.currentTarget.getBoundingClientRect();
          broadcastCursor(e.clientX - rect.left, e.clientY - rect.top, true);
        }
      }}
      onMouseLeave={() => {
        if (isCollaborative && notaId) {
          broadcastCursor(0, 0, false);
        }
      }}
    >
      {/* Real-time Multiplayer Cursors (Miro/Figma style) */}
      {workspaceId && notaId && isCollaborative && (
        <LiveCursors cursors={cursors} />
      )}

      {/* Presence UI */}
      {workspaceId && notaId && isCollaborative && (
        <div className="w-full flex justify-end items-center gap-3 py-1 px-4 pointer-events-none sticky top-0 bg-[var(--background)]/90 backdrop-blur-md z-40 border-b border-[var(--accents-2)] mb-2">
          {status !== 'connected' && (
            <div className="text-[11px] text-[var(--accents-5)] pointer-events-auto">
              {status === 'connecting' ? 'Conectando...' : 'Desconectado'}
            </div>
          )}
          <div className="flex -space-x-2 pointer-events-auto">
            {users.map((u: any, i: number) => (
              <div 
                key={i} 
                className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] text-white font-bold border-2 border-[var(--background)] shadow-sm"
                style={{ backgroundColor: u.color || '#ccc' }}
                title={u.name || 'Anon'}
              >
                {(u.name || 'A').charAt(0).toUpperCase()}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Hidden File Input for Image Upload */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        style={{ display: 'none' }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            uploadImageFile(file, imageModal?.savedRange);
            setImageModal(null);
            e.target.value = '';
          }
        }}
      />

      {/* Drag & Drop Visual Overlay */}
      {isDraggingOver && (
        <div className="absolute inset-0 z-50 bg-[var(--background)]/85 border-2 border-dashed border-[var(--foreground)] rounded-xl flex flex-col items-center justify-center pointer-events-none backdrop-blur-xs transition-all">
          <svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mb-3 text-[var(--foreground)] animate-bounce">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="17 8 12 3 7 8"/>
            <line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
          <span className="text-base font-semibold text-[var(--foreground)]">Solte sua imagem aqui</span>
          <span className="text-xs text-[var(--accents-5)] mt-1">PNG, JPG, GIF, WebP, SVG</span>
        </div>
      )}

      {/* Uploading Status Banner */}
      {isUploading && (
        <div className="fixed bottom-6 right-6 z-50 bg-[var(--background)] border border-[var(--accents-2)] shadow-2xl rounded-lg px-4 py-2.5 flex items-center gap-3 animate-in slide-in-from-bottom-4 text-xs font-medium text-[var(--foreground)]">
          <svg className="animate-spin h-4 w-4 text-[var(--foreground)]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
          </svg>
          Fazendo upload da imagem...
        </div>
      )}

      {/* Floating Link Preview Tooltip */}
      {linkTooltip?.visible && (
        <div
          ref={linkTooltipRef}
          style={{
            position: 'fixed',
            top: linkTooltip.y,
            left: linkTooltip.x,
            zIndex: 1002,
          }}
          className="flex items-center gap-2 bg-[var(--background)] border border-[var(--accents-2)] rounded-lg shadow-xl px-2.5 py-1.5 text-xs backdrop-blur-md animate-in fade-in zoom-in-95 duration-100 select-none max-w-[360px]"
          onClick={(e) => e.stopPropagation()}
        >
          <a
            href={linkTooltip.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--success)] underline truncate max-w-[180px] hover:opacity-80"
            title="Abrir link em nova aba"
          >
            {linkTooltip.url}
          </a>

          <div className="w-[1px] h-3.5 bg-[var(--accents-2)]" />

          <button
            type="button"
            onClick={() => window.open(linkTooltip.url, '_blank', 'noopener,noreferrer')}
            className="px-1.5 py-0.5 rounded text-[var(--foreground)] hover:bg-[var(--accents-2)] transition-colors cursor-pointer flex items-center gap-1 font-medium"
            title="Abrir link (ou Ctrl + Clique no texto)"
          >
            Abrir ↗
          </button>

          <button
            type="button"
            onClick={handleCopyLink}
            className="px-1.5 py-0.5 rounded text-[var(--accents-5)] hover:text-[var(--foreground)] hover:bg-[var(--accents-2)] transition-colors cursor-pointer"
            title="Copiar URL"
          >
            {copied ? 'Copiado!' : 'Copiar'}
          </button>

          <button
            type="button"
            onClick={handleRemoveLink}
            className="px-1.5 py-0.5 rounded text-[var(--error)] hover:bg-[var(--accents-2)] transition-colors cursor-pointer"
            title="Remover link"
          >
            Remover
          </button>
        </div>
      )}

      {/* Image Upload / Embed Modal */}
      {imageModal?.visible && (
        <div 
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-100"
          onClick={() => setImageModal(null)}
        >
          <div 
            ref={imagePopoverRef}
            className="w-full max-w-md bg-[var(--background)] border border-[var(--accents-2)] rounded-xl shadow-2xl p-5 text-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-[var(--foreground)] flex items-center gap-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="18" height="18" x="3" y="3" rx="2" ry="2"/>
                  <circle cx="9" cy="9" r="2"/>
                  <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
                </svg>
                Adicionar Imagem
              </h3>
              <button 
                type="button"
                onClick={() => setImageModal(null)}
                className="text-[var(--accents-5)] hover:text-[var(--foreground)] text-xs"
              >
                ✕
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-[var(--accents-2)] mb-4">
              <button
                type="button"
                onClick={() => setImageModal(prev => prev ? { ...prev, tab: 'upload' } : null)}
                className={`pb-2 px-3 text-xs font-medium border-b-2 transition-colors cursor-pointer ${
                  imageModal.tab === 'upload'
                    ? 'border-[var(--foreground)] text-[var(--foreground)]'
                    : 'border-transparent text-[var(--accents-5)] hover:text-[var(--foreground)]'
                }`}
              >
                Upload do Computador
              </button>
              <button
                type="button"
                onClick={() => setImageModal(prev => prev ? { ...prev, tab: 'url' } : null)}
                className={`pb-2 px-3 text-xs font-medium border-b-2 transition-colors cursor-pointer ${
                  imageModal.tab === 'url'
                    ? 'border-[var(--foreground)] text-[var(--foreground)]'
                    : 'border-transparent text-[var(--accents-5)] hover:text-[var(--foreground)]'
                }`}
              >
                Link da Web (URL)
              </button>
            </div>

            {imageModal.tab === 'upload' ? (
              <div className="flex flex-col gap-3">
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-[var(--accents-3)] hover:border-[var(--foreground)] rounded-lg p-6 flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors text-center"
                >
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--accents-5)]">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="17 8 12 3 7 8"/>
                    <line x1="12" y1="3" x2="12" y2="15"/>
                  </svg>
                  <span className="text-xs font-medium text-[var(--foreground)]">Escolha um arquivo do seu dispositivo</span>
                  <span className="text-[11px] text-[var(--accents-4)]">ou arraste e solte direto no editor</span>
                </div>
                <div className="flex justify-end gap-2 mt-2">
                  <button
                    type="button"
                    onClick={() => setImageModal(null)}
                    className="geist-button-secondary h-8 text-xs px-3"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="geist-button h-8 text-xs px-3"
                  >
                    Procurar Arquivo
                  </button>
                </div>
              </div>
            ) : (
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  if (imageModal.url.trim()) {
                    insertImageAtRange(imageModal.url.trim(), 'Imagem', imageModal.savedRange);
                    setImageModal(null);
                  }
                }}
                className="flex flex-col gap-3"
              >
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-[var(--accents-6)]">URL da Imagem</label>
                  <input
                    type="text"
                    autoFocus
                    placeholder="https://exemplo.com/imagem.png"
                    value={imageModal.url}
                    onChange={(e) => setImageModal(prev => prev ? { ...prev, url: e.target.value } : null)}
                    className="w-full px-3 py-2 text-xs bg-[var(--background)] border border-[var(--accents-2)] rounded-md outline-none focus:border-[var(--accents-5)] text-[var(--foreground)]"
                  />
                </div>
                <div className="flex justify-end gap-2 mt-2">
                  <button
                    type="button"
                    onClick={() => setImageModal(null)}
                    className="geist-button-secondary h-8 text-xs px-3"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="geist-button h-8 text-xs px-3"
                  >
                    Inserir Imagem
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Floating Selection Formatting Toolbar */}
      {selectionToolbar.visible && !linkPopover?.visible && !linkTooltip?.visible && !imageModal?.visible && !wikiMenu.visible && (
        <div
          ref={selectionToolbarRef}
          style={{
            position: 'fixed',
            top: selectionToolbar.y,
            left: selectionToolbar.x,
            transform: 'translateX(-50%)',
            zIndex: 1000,
          }}
          className="flex items-center gap-1 bg-[var(--background)] border border-[var(--accents-2)] rounded-lg shadow-xl px-1.5 py-1 text-sm backdrop-blur-md animate-in fade-in zoom-in-95 duration-100 select-none"
        >
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              handleSelectionHeading('h1');
            }}
            className="px-2 py-1 rounded text-xs font-bold text-[var(--foreground)] hover:bg-[var(--accents-2)] transition-colors cursor-pointer"
            title="Título 1"
          >
            H1
          </button>
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              handleSelectionHeading('h2');
            }}
            className="px-2 py-1 rounded text-xs font-bold text-[var(--foreground)] hover:bg-[var(--accents-2)] transition-colors cursor-pointer"
            title="Título 2"
          >
            H2
          </button>
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              handleSelectionHeading('h3');
            }}
            className="px-2 py-1 rounded text-xs font-bold text-[var(--foreground)] hover:bg-[var(--accents-2)] transition-colors cursor-pointer"
            title="Título 3"
          >
            H3
          </button>
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              handleSelectionHeading('h4');
            }}
            className="px-2 py-1 rounded text-xs font-bold text-[var(--foreground)] hover:bg-[var(--accents-2)] transition-colors cursor-pointer"
            title="Título 4"
          >
            H4
          </button>

          <div className="w-[1px] h-4 bg-[var(--accents-2)] mx-0.5" />

          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              handleSelectionInline('bold');
            }}
            className="w-7 h-7 flex items-center justify-center rounded text-sm font-bold text-[var(--foreground)] hover:bg-[var(--accents-2)] transition-colors cursor-pointer"
            title="Negrito"
          >
            B
          </button>
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              handleSelectionInline('italic');
            }}
            className="w-7 h-7 flex items-center justify-center rounded text-sm italic font-serif text-[var(--foreground)] hover:bg-[var(--accents-2)] transition-colors cursor-pointer"
            title="Itálico"
          >
            I
          </button>

          <div className="w-[1px] h-4 bg-[var(--accents-2)] mx-0.5" />

          {/* Bullet List */}
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              handleSelectionList('ul');
            }}
            className="w-7 h-7 flex items-center justify-center rounded text-sm text-[var(--foreground)] hover:bg-[var(--accents-2)] transition-colors cursor-pointer"
            title="Lista com Marcadores"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="8" y1="6" x2="21" y2="6"/>
              <line x1="8" y1="12" x2="21" y2="12"/>
              <line x1="8" y1="18" x2="21" y2="18"/>
              <line x1="3" y1="6" x2="3.01" y2="6"/>
              <line x1="3" y1="12" x2="3.01" y2="12"/>
              <line x1="3" y1="18" x2="3.01" y2="18"/>
            </svg>
          </button>

          {/* Numbered List */}
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              handleSelectionList('ol');
            }}
            className="w-7 h-7 flex items-center justify-center rounded text-sm text-[var(--foreground)] hover:bg-[var(--accents-2)] transition-colors cursor-pointer"
            title="Lista Numerada"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="10" y1="6" x2="21" y2="6"/>
              <line x1="10" y1="12" x2="21" y2="12"/>
              <line x1="10" y1="18" x2="21" y2="18"/>
              <path d="M4 6h1v4"/>
              <path d="M4 10h2"/>
              <path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1"/>
            </svg>
          </button>

          {/* Code Block */}
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              handleSelectionCode();
            }}
            className="w-7 h-7 flex items-center justify-center rounded text-sm text-[var(--foreground)] hover:bg-[var(--accents-2)] transition-colors cursor-pointer"
            title="Bloco de Código"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="16 18 22 12 16 6"/>
              <polyline points="8 6 2 12 8 18"/>
            </svg>
          </button>

          <div className="w-[1px] h-4 bg-[var(--accents-2)] mx-0.5" />

          {/* Connect Note in selection */}
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              const sel = window.getSelection();
              if (sel && sel.rangeCount > 0) {
                const range = sel.getRangeAt(0);
                const rect = range.getBoundingClientRect();
                setWikiMenu({
                  visible: true,
                  x: rect.left,
                  y: rect.bottom + 8,
                  query: '',
                  selectedIndex: 0,
                });
              }
            }}
            className="w-7 h-7 flex items-center justify-center rounded text-sm text-[#38bdf8] hover:bg-[var(--accents-2)] transition-colors cursor-pointer"
            title="Conectar a outra Nota ([[)"
          >
            <span className="font-bold text-xs">[[</span>
          </button>

          {/* Link */}
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              const sel = window.getSelection();
              openLinkDialog(sel?.toString() || '');
            }}
            className="w-7 h-7 flex items-center justify-center rounded text-sm text-[var(--foreground)] hover:bg-[var(--accents-2)] transition-colors cursor-pointer"
            title="Adicionar Link Web"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
            </svg>
          </button>

          {/* Add Image in Selection Toolbar */}
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              openImageDialog();
            }}
            className="w-7 h-7 flex items-center justify-center rounded text-sm text-[var(--foreground)] hover:bg-[var(--accents-2)] transition-colors cursor-pointer"
            title="Adicionar Imagem"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect width="18" height="18" x="3" y="3" rx="2" ry="2"/>
              <circle cx="9" cy="9" r="2"/>
              <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
            </svg>
          </button>
        </div>
      )}

      {/* Floating Link Popover Dialog */}
      {linkPopover?.visible && (
        <div
          ref={linkPopoverRef}
          style={{
            position: 'fixed',
            top: linkPopover.y,
            left: linkPopover.x,
            zIndex: 1001,
          }}
          className="w-[320px] bg-[var(--background)] border border-[var(--accents-2)] rounded-lg shadow-2xl p-3 text-sm backdrop-blur-md animate-in fade-in zoom-in-95 duration-100"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="text-xs font-semibold text-[var(--foreground)] mb-2 flex items-center gap-1.5">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
            </svg>
            Inserir Link Web
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleInsertLink();
            }}
            className="flex flex-col gap-2"
          >
            <input
              type="text"
              autoFocus
              placeholder="URL (ex: https://exemplo.com)..."
              value={linkPopover.url}
              onChange={(e) => setLinkPopover((prev) => (prev ? { ...prev, url: e.target.value } : null))}
              className="w-full px-2.5 py-1.5 text-[13px] bg-[var(--background)] border border-[var(--accents-2)] rounded-md outline-none focus:border-[var(--accents-5)] text-[var(--foreground)]"
            />

            <input
              type="text"
              placeholder="Texto de exibição (opcional)..."
              value={linkPopover.text}
              onChange={(e) => setLinkPopover((prev) => (prev ? { ...prev, text: e.target.value } : null))}
              className="w-full px-2.5 py-1.5 text-[13px] bg-[var(--background)] border border-[var(--accents-2)] rounded-md outline-none focus:border-[var(--accents-5)] text-[var(--foreground)]"
            />

            <div className="flex justify-end gap-2 mt-1">
              <button
                type="button"
                onClick={() => setLinkPopover(null)}
                className="px-2.5 py-1 text-xs rounded-md text-[var(--accents-5)] hover:bg-[var(--accents-2)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-3 py-1 text-xs font-medium rounded-md bg-[var(--foreground)] text-[var(--background)] hover:opacity-90 transition-opacity cursor-pointer"
              >
                Inserir
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Floating Wikilink [[ Notes Menu */}
      {wikiMenu.visible && (
        <div
          ref={wikiMenuRef}
          style={{
            position: 'fixed',
            top: wikiMenu.y,
            left: wikiMenu.x,
            zIndex: 1000,
          }}
          className="w-[280px] max-h-[300px] overflow-y-auto no-scrollbar bg-[var(--background)] border border-[var(--accents-2)] rounded-lg shadow-2xl p-1.5 text-sm backdrop-blur-md"
        >
          <div className="px-2 py-1 text-[11px] font-semibold tracking-wider text-[var(--foreground)] uppercase select-none flex items-center gap-1.5 border-b border-[var(--accents-2)] mb-1 pb-1.5">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-75">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
            </svg>
            <span>Conectar Nota</span>
            <span className="text-[10px] text-[var(--accents-4)] normal-case font-normal">(Wikilink)</span>
          </div>

          {filteredWikiNotas.length === 0 ? (
            <div className="px-3 py-4 text-center text-xs text-[var(--accents-4)]">
              Nenhuma nota encontrada
            </div>
          ) : (
            filteredWikiNotas.map((nota, idx) => {
              const isSelected = idx === wikiMenu.selectedIndex;
              return (
                <button
                  key={nota.id}
                  ref={(el) => {
                    wikiItemRefs.current[idx] = el;
                  }}
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    insertNoteLink(nota);
                  }}
                  onMouseMove={() => {
                    if (isKeyboardNavRef.current) isKeyboardNavRef.current = false;
                    if (wikiMenu.selectedIndex !== idx) {
                      setWikiMenu((prev) => ({ ...prev, selectedIndex: idx }));
                    }
                  }}
                  className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-left transition-colors cursor-pointer select-none ${
                    isSelected
                      ? 'bg-[var(--accents-2)] text-[var(--foreground)]'
                      : 'text-[var(--accents-6)] hover:bg-[var(--accents-1)]'
                  }`}
                >
                  <div className="flex items-center justify-center w-5 h-5 shrink-0 text-[var(--accents-5)]">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                      <polyline points="14 2 14 8 20 8"/>
                    </svg>
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="font-medium text-[13px] text-[var(--foreground)] truncate leading-snug">
                      {nota.titulo}
                    </span>
                    <span className="text-[11px] text-[var(--accents-4)] truncate leading-snug">
                      {nota.conteudo ? (nota.conteudo.replace(/<[^>]*>?/gm, '').slice(0, 40) || 'Nota vazia') : 'Nota vazia'}
                    </span>
                  </div>
                </button>
              );
            })
          )}
        </div>
      )}

      {/* Floating Card Connection :: Cards Menu */}
      {cardMenu.visible && (
        <div
          ref={cardMenuRef}
          style={{
            position: 'fixed',
            top: cardMenu.y,
            left: cardMenu.x,
            zIndex: 1000,
          }}
          className="w-[300px] max-h-[300px] overflow-y-auto no-scrollbar bg-[var(--background)] border border-[var(--accents-2)] rounded-lg shadow-2xl p-1.5 text-sm backdrop-blur-md"
        >
          <div className="px-2 py-1 text-[11px] font-semibold tracking-wider text-[var(--foreground)] uppercase select-none flex items-center gap-1.5 border-b border-[var(--accents-2)] mb-1 pb-1.5">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-75">
              <rect width="18" height="18" x="3" y="3" rx="2"/>
              <path d="m9 12 2 2 4-4"/>
            </svg>
            <span>Conectar Flashcard</span>
            <span className="text-[10px] text-[var(--accents-4)] normal-case font-normal">(::)</span>
          </div>

          {filteredCards.length === 0 ? (
            <div className="px-3 py-4 text-center text-xs text-[var(--accents-4)]">
              Nenhum flashcard encontrado
            </div>
          ) : (
            filteredCards.map((card, idx) => {
              const isSelected = idx === cardMenu.selectedIndex;
              return (
                <button
                  key={card.id}
                  ref={(el) => {
                    cardItemRefs.current[idx] = el;
                  }}
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    insertCardLink(card);
                  }}
                  onMouseMove={() => {
                    if (isKeyboardNavRef.current) isKeyboardNavRef.current = false;
                    if (cardMenu.selectedIndex !== idx) {
                      setCardMenu((prev) => ({ ...prev, selectedIndex: idx }));
                    }
                  }}
                  className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-left transition-colors cursor-pointer select-none ${
                    isSelected
                      ? 'bg-[var(--accents-2)] text-[var(--foreground)]'
                      : 'text-[var(--accents-6)] hover:bg-[var(--accents-1)]'
                  }`}
                >
                  <div className="flex items-center justify-center w-5 h-5 shrink-0 text-[var(--accents-5)]">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect width="18" height="18" x="3" y="3" rx="2"/>
                      <path d="m9 12 2 2 4-4"/>
                    </svg>
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="font-medium text-[13px] text-[var(--foreground)] truncate leading-snug">
                      {card.frente}
                    </span>
                    <span className="text-[11px] text-[var(--accents-4)] truncate leading-snug">
                      {card.deck ? `${card.deck.nome} • ` : ''}{card.verso}
                    </span>
                  </div>
                </button>
              );
            })
          )}
        </div>
      )}

      {/* Notion-style Editor Surface */}
      <div
        id={`synap-editor-${notaId}`}
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        onKeyUp={handleKeyUp}
        onPaste={handlePaste}
        onMouseDown={handleMouseDown}
        onMouseUp={() => {
          checkSlashTrigger();
          checkWikiTrigger();
          checkSelection();
        }}
        onClick={handleEditorClick}
        className="notion-editor min-h-[450px] w-full flex-1 outline-none text-[15px] leading-[1.7] text-[var(--foreground)]"
        data-placeholder={placeholder}
      />

      {/* Floating Slash Command Menu */}
      {slashMenu.visible && (
        <div
          ref={menuRef}
          style={{
            position: 'fixed',
            top: slashMenu.y,
            left: slashMenu.x,
            zIndex: 1000,
          }}
          className="w-[280px] max-h-[340px] flex flex-col bg-[var(--background)] border border-[var(--accents-2)] rounded-lg shadow-2xl p-1.5 text-sm backdrop-blur-md"
        >
          {/* Search Input for Slash Commands */}
          <div className="p-1 border-b border-[var(--accents-2)] mb-1">
            <div className="flex items-center gap-1.5 px-2 py-1 bg-[var(--accents-1)] rounded border border-[var(--accents-2)]">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--accents-4)] shrink-0">
                <circle cx="11" cy="11" r="8"/>
                <line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input
                type="text"
                value={slashMenu.query}
                onChange={(e) => {
                  const val = e.target.value;
                  setSlashMenu((prev) => ({ ...prev, query: val, selectedIndex: 0 }));
                }}
                placeholder="Pesquisar comando..."
                className="w-full bg-transparent border-none outline-none text-xs text-[var(--foreground)] placeholder-[var(--accents-4)] p-0"
              />
              {slashMenu.query && (
                <button
                  type="button"
                  onClick={() => setSlashMenu((prev) => ({ ...prev, query: '', selectedIndex: 0 }))}
                  className="text-[10px] text-[var(--accents-4)] hover:text-[var(--foreground)]"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          <div className="px-2 py-0.5 text-[10px] font-semibold tracking-wider text-[var(--accents-4)] uppercase select-none">
            Comandos
          </div>

          <div className="flex-1 overflow-y-auto no-scrollbar space-y-0.5">
            {filteredCommands.length === 0 ? (
              <div className="px-3 py-4 text-center text-xs text-[var(--accents-4)]">
                Nenhum comando encontrado
              </div>
            ) : (
              filteredCommands.map((cmd, idx) => {
                const isSelected = idx === slashMenu.selectedIndex;
                return (
                  <button
                    key={cmd.id}
                    ref={(el) => {
                      itemRefs.current[idx] = el;
                    }}
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      executeCommand(cmd);
                    }}
                    onMouseMove={() => {
                      if (isKeyboardNavRef.current) {
                        isKeyboardNavRef.current = false;
                      }
                      if (slashMenu.selectedIndex !== idx) {
                        setSlashMenu((prev) => ({ ...prev, selectedIndex: idx }));
                      }
                    }}
                    className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-left transition-colors cursor-pointer select-none ${
                      isSelected
                        ? 'bg-[var(--accents-2)] text-[var(--foreground)]'
                        : 'text-[var(--accents-6)] hover:bg-[var(--accents-1)]'
                    }`}
                  >
                    <div className="flex items-center justify-center w-5 h-5 shrink-0 text-[var(--foreground)]">
                      {cmd.icon}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="font-medium text-[13px] text-[var(--foreground)] leading-snug">
                        {cmd.title}
                      </span>
                      <span className="text-[11px] text-[var(--accents-4)] truncate leading-snug">
                        {cmd.subtitle}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Embedded Drawing Creation / Selection Modal */}
      {isDrawingModalOpen && (
        <DrawingEmbedModal
          workspaceId={workspaceId}
          notas={notas}
          onSelectDrawing={(drawing) => insertDrawingAtRange(drawing)}
          onCreateNewDrawing={(drawing) => {
            if (onUpdateNota) onUpdateNota(drawing);
            insertDrawingAtRange(drawing);
          }}
          onClose={() => setIsDrawingModalOpen(false)}
        />
      )}

      {/* Embedded Drawing Full In-Place Editor Modal */}
      {activeDrawingEdit && (
        <DrawingModal
          drawingNota={activeDrawingEdit}
          notas={notas}
          workspaceId={workspaceId}
          onOpenNota={onOpenNota}
          onOpenCard={onOpenCard}
          onSave={(updatedNota) => {
            if (onUpdateNota) onUpdateNota(updatedNota);
            // Re-render local canvas in editor immediately
            if (editorRef.current) {
              const wrappers = editorRef.current.querySelectorAll(`.synap-drawing-wrapper[data-drawing-id="${updatedNota.id}"]`);
              wrappers.forEach((w) => {
                const titleSpan = w.querySelector('.synap-drawing-header span');
                if (titleSpan) titleSpan.textContent = updatedNota.titulo;
                renderEmbeddedCanvas(w as HTMLElement, updatedNota.conteudo);
              });
              onChange(editorRef.current.innerHTML);
            }
          }}
          onClose={() => setActiveDrawingEdit(null)}
        />
      )}
      {/* Mobile Sticky Bottom Formatting Bar (Notion Mobile Style) */}
      <div 
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[var(--accents-1)] border-t border-[var(--accents-2)] px-2 py-1.5 flex items-center gap-1 overflow-x-auto no-scrollbar shadow-lg"
        style={{ backdropFilter: 'blur(8px)', background: 'rgba(20, 20, 20, 0.95)' }}
      >
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            document.execCommand('bold', false);
          }}
          className="h-8 px-2.5 flex items-center justify-center rounded text-xs font-bold text-[var(--foreground)] hover:bg-[var(--accents-2)] shrink-0"
        >
          B
        </button>
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            document.execCommand('italic', false);
          }}
          className="h-8 px-2.5 flex items-center justify-center rounded text-xs italic font-serif text-[var(--foreground)] hover:bg-[var(--accents-2)] shrink-0"
        >
          I
        </button>
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            document.execCommand('underline', false);
          }}
          className="h-8 px-2.5 flex items-center justify-center rounded text-xs underline text-[var(--foreground)] hover:bg-[var(--accents-2)] shrink-0"
        >
          U
        </button>
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            document.execCommand('strikeThrough', false);
          }}
          className="h-8 px-2.5 flex items-center justify-center rounded text-xs line-through text-[var(--foreground)] hover:bg-[var(--accents-2)] shrink-0"
        >
          S
        </button>

        <div className="w-[1px] h-4 bg-[var(--accents-2)] mx-1 shrink-0" />

        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            transformCurrentBlockToElement('h1');
          }}
          className="h-8 px-2 flex items-center justify-center rounded text-xs font-bold text-[var(--foreground)] hover:bg-[var(--accents-2)] shrink-0"
        >
          H1
        </button>
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            transformCurrentBlockToElement('h2');
          }}
          className="h-8 px-2 flex items-center justify-center rounded text-xs font-bold text-[var(--foreground)] hover:bg-[var(--accents-2)] shrink-0"
        >
          H2
        </button>
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            transformCurrentBlockToElement('h3');
          }}
          className="h-8 px-2 flex items-center justify-center rounded text-xs font-bold text-[var(--foreground)] hover:bg-[var(--accents-2)] shrink-0"
        >
          H3
        </button>

        <div className="w-[1px] h-4 bg-[var(--accents-2)] mx-1 shrink-0" />

        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            document.execCommand('insertUnorderedList', false);
          }}
          className="h-8 px-2 flex items-center justify-center rounded text-xs text-[var(--foreground)] hover:bg-[var(--accents-2)] shrink-0"
          title="Lista com marcadores"
        >
          • Lista
        </button>
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            document.execCommand('insertOrderedList', false);
          }}
          className="h-8 px-2 flex items-center justify-center rounded text-xs text-[var(--foreground)] hover:bg-[var(--accents-2)] shrink-0"
          title="Lista numerada"
        >
          1. Lista
        </button>

        <div className="w-[1px] h-4 bg-[var(--accents-2)] mx-1 shrink-0" />

        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            setIsDrawingModalOpen(true);
          }}
          className="h-8 px-2 flex items-center gap-1 rounded text-xs text-[#38bdf8] hover:bg-[var(--accents-2)] shrink-0"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
          </svg>
          <span>Desenho</span>
        </button>
      </div>
    </div>
  );
}

export default React.memo(Editor);
