'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import DrawingItemPickerModal from './DrawingItemPickerModal';
import DrawingItemContainer from './DrawingItemContainer';
import MathEquationModal from './MathEquationModal';
import DrawingYouTubeModal from './DrawingYouTubeModal';
import LiveCursors from './LiveCursors';
import { useTheme } from './ThemeProvider';

export type ToolType = 'hand' | 'select' | 'pencil' | 'rectangle' | 'ellipse' | 'arrow' | 'line' | 'text' | 'image' | 'eraser';

export interface Point {
  x: number;
  y: number;
}

export interface DrawingElement {
  id: string;
  type: 'pencil' | 'rectangle' | 'ellipse' | 'line' | 'arrow' | 'text' | 'image' | 'note_card' | 'flashcard' | 'math' | 'youtube';
  x: number;
  y: number;
  width?: number;
  height?: number;
  imageUrl?: string;
  points?: Point[];
  text?: string;
  fontSize?: number;
  latex?: string;
  youtubeUrl?: string;
  youtubeId?: string;
  strokeColor: string;
  fillColor: string;
  strokeWidth: number;
  // Embedded item data
  itemNota?: any;
  cardData?: any;
}

export type HandleType = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'start' | 'end';

export interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

interface DrawingCanvasProps {
  initialData?: string; // JSON string of DrawingElement[]
  onChange?: (dataJson: string) => void;
  title?: string;
  notas?: any[];
  workspaceId?: string;
  isCollaborative?: boolean;
  onOpenNota?: (nota: any) => void;
  onOpenCard?: (card: any) => void;
  notaId?: string;
  itemNota?: any;
  cardData?: any;
}

const STROKE_COLORS = [
  '#ffffff', // White
  '#94a3b8', // Gray
  '#ef4444', // Red
  '#f97316', // Orange
  '#eab308', // Yellow
  '#22c55e', // Green
  '#3b82f6', // Blue
  '#a855f7', // Purple
  '#ec4899', // Pink
];

const FILL_COLORS = [
  'transparent',
  'rgba(255, 255, 255, 0.12)',
  'rgba(59, 130, 246, 0.25)',
  'rgba(34, 197, 94, 0.25)',
  'rgba(234, 179, 8, 0.25)',
  'rgba(239, 68, 68, 0.25)',
  'rgba(168, 85, 247, 0.25)',
];

export default function DrawingCanvas({
  initialData = '',
  onChange: parentOnChange,
  title,
  notas = [],
  workspaceId,
  isCollaborative,
  notaId,
  itemNota,
  cardData,
  onOpenNota,
  onOpenCard,
}: DrawingCanvasProps) {
  const [elements, setElements] = useState<DrawingElement[]>(() => {
    if (initialData) {
      try {
        return JSON.parse(initialData);
      } catch (e) {
        return [];
      }
    }
    return [];
  });

  const { users, cursors, status, broadcastChange, broadcastCursor } = require('../hooks/useCollaboration').useCollaboration(
    isCollaborative && notaId ? `${workspaceId}:${notaId}` : undefined,
    'drawing_change',
    (newVal: string) => {
      try {
        const parsed = JSON.parse(newVal);
        setElements(parsed);
      } catch (e) {}
    }
  );

  const onChange = useCallback((val: string) => {
    if (parentOnChange) parentOnChange(val);
    broadcastChange(val);
  }, [parentOnChange, broadcastChange]);



  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { resolvedTheme } = useTheme();

  // Tools & Styling States (Default to 'select')
  const [tool, setTool] = useState<ToolType>('select');
  const [strokeColor, setStrokeColor] = useState<string>(() => resolvedTheme === 'light' ? '#000000' : '#ffffff');
  const [fillColor, setFillColor] = useState<string>('transparent');
  const [strokeWidth, setStrokeWidth] = useState<number>(2);

  // Picker Modal State
  const [pickerModal, setPickerModal] = useState<'nota' | 'card' | null>(null);

  // Math Modal State
  const [mathModal, setMathModal] = useState<{
    visible: boolean;
    editingElementId: string | null;
    initialLatex: string;
  }>({
    visible: false,
    editingElementId: null,
    initialLatex: '',
  });

  // YouTube Modal State
  const [isYouTubeModalOpen, setIsYouTubeModalOpen] = useState(false);

  // Elements and History

  const [history, setHistory] = useState<DrawingElement[][]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);

  // Multi-Selection State (IDs of selected elements)
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  // Marquee Selection Box (Windows desktop style drag-to-select)
  const [selectionBox, setSelectionBox] = useState<{
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
  } | null>(null);

  // Pan & Zoom
  const [pan, setPan] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState<number>(1);
  const [isSpacePressed, setIsSpacePressed] = useState<boolean>(false);

  // Text Input State
  const [editingText, setEditingText] = useState<{
    id: string;
    worldX: number;
    worldY: number;
    text: string;
  } | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const textMountedAtRef = useRef<number>(0);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const imageCacheRef = useRef<Map<string, HTMLImageElement>>(new Map());

  // Mouse action refs
  const mouseModeRef = useRef<'drawing' | 'dragging_elements' | 'resizing_handle' | 'marquee_selecting' | 'panning' | 'idle'>('idle');
  const activeHandleRef = useRef<HandleType | null>(null);
  const resizeInitialBoundsRef = useRef<Bounds | null>(null);
  const currentElementRef = useRef<DrawingElement | null>(null);
  const startPointRef = useRef<Point>({ x: 0, y: 0 });
  const dragInitialElementsRef = useRef<DrawingElement[]>([]);
  const isPanningRef = useRef(false);
  const panStartRef = useRef<Point>({ x: 0, y: 0 });

  // Focus textarea automatically whenever editingText becomes active
  useEffect(() => {
    if (editingText) {
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
      const focusTimer = setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
        }
      }, 40);
      return () => clearTimeout(focusTimer);
    }
  }, [editingText]);

  const lastNotaId = useRef<string | undefined>(notaId);

  // Synchronize when note changes
  useEffect(() => {
    if (notaId !== lastNotaId.current) {
      lastNotaId.current = notaId;
      if (!initialData) {
        setElements([]);
        return;
      }
      try {
        const parsed = JSON.parse(initialData);
        if (Array.isArray(parsed)) {
          setElements(parsed);
        }
      } catch {
        // ignore
      }
    }
  }, [initialData, notaId]);

  // Push new state to history & propagate change
  const commitElements = useCallback(
    (newElements: DrawingElement[]) => {
      setElements(newElements);
      setHistory((prev) => [...prev.slice(0, historyIndex + 1), newElements]);
      setHistoryIndex((prev) => prev + 1);
      if (onChange) {
        onChange(JSON.stringify(newElements));
      }
    },
    [historyIndex, onChange]
  );

  // Insert Note or Flashcard container at the center of current viewport
  const handleInsertItem = (item: any, type: 'nota' | 'card') => {
    const container = containerRef.current;
    const viewCenterX = container ? (container.clientWidth / 2 - pan.x) / zoom : 200;
    const viewCenterY = container ? (container.clientHeight / 2 - pan.y) / zoom : 200;

    const width = 300;
    const height = 220;
    const newEl: DrawingElement = {
      id: Math.random().toString(),
      type: type === 'nota' ? 'note_card' : 'flashcard',
      x: viewCenterX - width / 2,
      y: viewCenterY - height / 2,
      width,
      height,
      strokeColor: '#38bdf8',
      fillColor: 'transparent',
      strokeWidth: 2,
      itemNota: item,
      cardData: type === 'card' ? item : undefined,
    };

    commitElements([...elements, newEl]);
    setTool('select');
    setSelectedIds([newEl.id]);
  };

  const handleConfirmMath = (latex: string) => {
    if (mathModal.editingElementId) {
      const updatedList = elements.map((el) =>
        el.id === mathModal.editingElementId ? { ...el, latex } : el
      );
      commitElements(updatedList);
    } else {
      const container = containerRef.current;
      const viewCenterX = container ? (container.clientWidth / 2 - pan.x) / zoom : 200;
      const viewCenterY = container ? (container.clientHeight / 2 - pan.y) / zoom : 200;
      const width = 300;
      const height = 140;

      const newMathEl: DrawingElement = {
        id: 'math_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
        type: 'math',
        x: viewCenterX - width / 2,
        y: viewCenterY - height / 2,
        width,
        height,
        latex,
        strokeColor: '#38bdf8',
        fillColor: 'transparent',
        strokeWidth: 2,
      };

      commitElements([...elements, newMathEl]);
      setTool('select');
      setSelectedIds([newMathEl.id]);
    }
  };

  // Insert YouTube Video into Canvas
  const handleConfirmYouTube = (youtubeId: string, url: string) => {
    const container = containerRef.current;
    const viewCenterX = container ? (container.clientWidth / 2 - pan.x) / zoom : 200;
    const viewCenterY = container ? (container.clientHeight / 2 - pan.y) / zoom : 200;

    const width = 420;
    const height = 260;

    const newEl: DrawingElement = {
      id: Math.random().toString(),
      type: 'youtube',
      x: viewCenterX - width / 2,
      y: viewCenterY - height / 2,
      width,
      height,
      youtubeId,
      youtubeUrl: url,
      strokeColor: '#38bdf8',
      fillColor: 'transparent',
      strokeWidth: 1,
    };

    commitElements([...elements, newEl]);
    setSelectedIds([newEl.id]);
    setTool('select');
  };

  // Insert Image into Canvas
  const handleInsertImage = useCallback(
    (file: File) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        if (!dataUrl) return;

        const img = new Image();
        img.onload = () => {
          const container = containerRef.current;
          const viewCenterX = container ? (container.clientWidth / 2 - pan.x) / zoom : 200;
          const viewCenterY = container ? (container.clientHeight / 2 - pan.y) / zoom : 200;

          const maxWidth = 400;
          const scale = img.naturalWidth > maxWidth ? maxWidth / img.naturalWidth : 1;
          const width = img.naturalWidth * scale;
          const height = img.naturalHeight * scale;

          const newEl: DrawingElement = {
            id: Math.random().toString(),
            type: 'image',
            x: viewCenterX - width / 2,
            y: viewCenterY - height / 2,
            width,
            height,
            imageUrl: dataUrl,
            strokeColor: 'transparent',
            fillColor: 'transparent',
            strokeWidth: 0,
          };

          imageCacheRef.current.set(dataUrl, img);
          commitElements([...elements, newEl]);
          setTool('select');
          setSelectedIds([newEl.id]);
        };
        img.src = dataUrl;
      };
      reader.readAsDataURL(file);
    },
    [commitElements, elements, pan.x, pan.y, zoom]
  );

  // Paste image handler from clipboard
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (editingText) return;
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            handleInsertImage(file);
            break;
          }
        }
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [editingText, handleInsertImage]);

  // Initial history snapshot
  useEffect(() => {
    if (history.length === 0 && elements.length > 0) {
      setHistory([elements]);
      setHistoryIndex(0);
    }
  }, [elements, history.length]);

  // Undo / Redo
  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const nextIdx = historyIndex - 1;
      const prevElements = history[nextIdx];
      setHistoryIndex(nextIdx);
      setElements(prevElements);
      if (onChange) onChange(JSON.stringify(prevElements));
    }
  }, [history, historyIndex, onChange]);

  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const nextIdx = historyIndex + 1;
      const nextElements = history[nextIdx];
      setHistoryIndex(nextIdx);
      setElements(nextElements);
      if (onChange) onChange(JSON.stringify(nextElements));
    }
  }, [history, historyIndex, onChange]);

  // Coordinate transforms
  const screenToWorld = useCallback(
    (screenX: number, screenY: number): Point => {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return { x: screenX, y: screenY };
      const clientX = screenX - rect.left;
      const clientY = screenY - rect.top;
      return {
        x: (clientX - pan.x) / zoom,
        y: (clientY - pan.y) / zoom,
      };
    },
    [pan, zoom]
  );

  const worldToScreen = useCallback(
    (worldX: number, worldY: number): Point => {
      return {
        x: worldX * zoom + pan.x,
        y: worldY * zoom + pan.y,
      };
    },
    [pan, zoom]
  );

  // Helper: Get robust bounding box of any element
  const getElementBounds = (el: DrawingElement): Bounds => {
    let minX = el.x;
    let minY = el.y;
    let maxX = el.x + (el.width || 0);
    let maxY = el.y + (el.height || 0);

    if (el.points && el.points.length > 0) {
      minX = Math.min(...el.points.map((p) => p.x));
      maxX = Math.max(...el.points.map((p) => p.x));
      minY = Math.min(...el.points.map((p) => p.y));
      maxY = Math.max(...el.points.map((p) => p.y));
    } else if (el.type === 'text') {
      const fontSize = el.fontSize || 18;
      const lines = (el.text || '').split('\n');
      const maxLineLen = Math.max(...lines.map((l) => l.length), 1);
      minX = el.x;
      maxX = el.x + Math.max(40, maxLineLen * (fontSize * 0.6));
      minY = el.y - fontSize;
      maxY = el.y + (lines.length - 1) * (fontSize * 1.35) + 4;
    } else if (
      el.type === 'rectangle' ||
      el.type === 'ellipse' ||
      el.type === 'image' ||
      el.type === 'note_card' ||
      el.type === 'flashcard' ||
      el.type === 'math' ||
      el.type === 'youtube'
    ) {
      minX = Math.min(el.x, el.x + (el.width || 0));
      maxX = Math.max(el.x, el.x + (el.width || 0));
      minY = Math.min(el.y, el.y + (el.height || 0));
      maxY = Math.max(el.y, el.y + (el.height || 0));
    }

    return { minX, minY, maxX, maxY };
  };

  // Helper: Get merged selection bounding box for multiple selected elements
  const getSelectionBounds = useCallback(
    (ids: string[], allElements: DrawingElement[]): Bounds | null => {
      const selected = allElements.filter((el) => ids.includes(el.id));
      if (selected.length === 0) return null;
      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;
      selected.forEach((el) => {
        const b = getElementBounds(el);
        if (b.minX < minX) minX = b.minX;
        if (b.minY < minY) minY = b.minY;
        if (b.maxX > maxX) maxX = b.maxX;
        if (b.maxY > maxY) maxY = b.maxY;
      });
      if (minX === Infinity) return null;
      return { minX, minY, maxX, maxY };
    },
    []
  );

  // Helper: Detect if a point hits any handle of the selected elements
  const getHandleAtPoint = useCallback(
    (
      point: Point,
      selectedElements: DrawingElement[],
      zoomLevel: number
    ): { handle: HandleType; elementId?: string } | null => {
      if (selectedElements.length === 0) return null;
      const hitRadius = 12 / zoomLevel;

      // 1. Single Line or Arrow endpoint handles
      if (
        selectedElements.length === 1 &&
        (selectedElements[0].type === 'line' || selectedElements[0].type === 'arrow') &&
        selectedElements[0].points &&
        selectedElements[0].points.length === 2
      ) {
        const p1 = selectedElements[0].points[0];
        const p2 = selectedElements[0].points[1];
        if (Math.hypot(point.x - p1.x, point.y - p1.y) <= hitRadius) {
          return { handle: 'start', elementId: selectedElements[0].id };
        }
        if (Math.hypot(point.x - p2.x, point.y - p2.y) <= hitRadius) {
          return { handle: 'end', elementId: selectedElements[0].id };
        }
      }

      // 2. 8 Bounding Box Handles
      const bounds = getSelectionBounds(
        selectedElements.map((e) => e.id),
        selectedElements
      );
      if (!bounds) return null;

      const padding = 6 / zoomLevel;
      const bMinX = bounds.minX - padding;
      const bMinY = bounds.minY - padding;
      const bMaxX = bounds.maxX + padding;
      const bMaxY = bounds.maxY + padding;
      const midX = (bMinX + bMaxX) / 2;
      const midY = (bMinY + bMaxY) / 2;

      const handlePositions: { handle: HandleType; x: number; y: number }[] = [
        { handle: 'nw', x: bMinX, y: bMinY },
        { handle: 'n', x: midX, y: bMinY },
        { handle: 'ne', x: bMaxX, y: bMinY },
        { handle: 'e', x: bMaxX, y: midY },
        { handle: 'se', x: bMaxX, y: bMaxY },
        { handle: 's', x: midX, y: bMaxY },
        { handle: 'sw', x: bMinX, y: bMaxY },
        { handle: 'w', x: bMinX, y: midY },
      ];

      for (const h of handlePositions) {
        if (Math.hypot(point.x - h.x, point.y - h.y) <= hitRadius) {
          return { handle: h.handle };
        }
      }

      return null;
    },
    [getSelectionBounds]
  );

  // Helper: Cursor style for handles
  const getCursorForHandle = (handle: HandleType): string => {
    switch (handle) {
      case 'nw':
      case 'se':
        return 'nwse-resize';
      case 'ne':
      case 'sw':
        return 'nesw-resize';
      case 'n':
      case 's':
        return 'ns-resize';
      case 'e':
      case 'w':
        return 'ew-resize';
      case 'start':
      case 'end':
        return 'crosshair';
      default:
        return 'default';
    }
  };

  // Check if point hits element (for single selection / hover)
  const isPointInElement = (point: Point, el: DrawingElement): boolean => {
    const threshold = 14 / zoom;
    const { minX, minY, maxX, maxY } = getElementBounds(el);

    if (
      el.type === 'text' ||
      el.type === 'rectangle' ||
      el.type === 'image' ||
      el.type === 'note_card' ||
      el.type === 'flashcard' ||
      el.type === 'math' ||
      el.type === 'youtube'
    ) {
      return (
        point.x >= minX - threshold &&
        point.x <= maxX + threshold &&
        point.y >= minY - threshold &&
        point.y <= maxY + threshold
      );
    }
    if (el.type === 'ellipse') {
      const rx = Math.abs(el.width || 0) / 2;
      const ry = Math.abs(el.height || 0) / 2;
      const cx = el.x + (el.width || 0) / 2;
      const cy = el.y + (el.height || 0) / 2;
      if (rx === 0 || ry === 0) return false;
      const val =
        Math.pow(point.x - cx, 2) / Math.pow(rx + threshold, 2) +
        Math.pow(point.y - cy, 2) / Math.pow(ry + threshold, 2);
      return val <= 1.2;
    }
    if (el.type === 'pencil' && el.points) {
      return el.points.some((p) => {
        const dx = p.x - point.x;
        const dy = p.y - point.y;
        return Math.sqrt(dx * dx + dy * dy) <= threshold;
      });
    }
    if ((el.type === 'line' || el.type === 'arrow') && el.points && el.points.length >= 2) {
      const p1 = el.points[0];
      const p2 = el.points[1];
      const l2 = Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2);
      if (l2 === 0) return false;
      const t = Math.max(0, Math.min(1, ((point.x - p1.x) * (p2.x - p1.x) + (point.y - p1.y) * (p2.y - p1.y)) / l2));
      const projX = p1.x + t * (p2.x - p1.x);
      const projY = p1.y + t * (p2.y - p1.y);
      const dist = Math.sqrt(Math.pow(point.x - projX, 2) + Math.pow(point.y - projY, 2));
      return dist <= threshold;
    }
    return false;
  };

  // Check if element is inside rectangular selection box
  const isElementInSelectionBox = (el: DrawingElement, box: { startX: number; startY: number; currentX: number; currentY: number }) => {
    const boxMinX = Math.min(box.startX, box.currentX);
    const boxMaxX = Math.max(box.startX, box.currentX);
    const boxMinY = Math.min(box.startY, box.currentY);
    const boxMaxY = Math.max(box.startY, box.currentY);

    const { minX, minY, maxX, maxY } = getElementBounds(el);

    return maxX >= boxMinX && minX <= boxMaxX && maxY >= boxMinY && minY <= boxMaxY;
  };

  // Draw individual element
  const drawElement = useCallback(
    (ctx: CanvasRenderingContext2D, el: DrawingElement) => {
      // Don't render static text on canvas while currently editing it in input
      if (editingText && editingText.id === el.id) return;

      ctx.save();
      ctx.strokeStyle = el.strokeColor;
      ctx.fillStyle = el.fillColor;
      ctx.lineWidth = el.strokeWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (el.type === 'pencil' && el.points && el.points.length > 0) {
        ctx.beginPath();
        ctx.moveTo(el.points[0].x, el.points[0].y);
        for (let i = 1; i < el.points.length; i++) {
          const p = el.points[i];
          ctx.lineTo(p.x, p.y);
        }
        ctx.stroke();
      } else if (el.type === 'rectangle') {
        const w = el.width || 0;
        const h = el.height || 0;
        if (el.fillColor !== 'transparent') {
          ctx.fillRect(el.x, el.y, w, h);
        }
        ctx.strokeRect(el.x, el.y, w, h);
      } else if (el.type === 'ellipse') {
        const cx = el.x + (el.width || 0) / 2;
        const cy = el.y + (el.height || 0) / 2;
        const rx = Math.abs(el.width || 0) / 2;
        const ry = Math.abs(el.height || 0) / 2;
        if (rx > 0 && ry > 0) {
          ctx.beginPath();
          ctx.ellipse(cx, cy, rx, ry, 0, 0, 2 * Math.PI);
          if (el.fillColor !== 'transparent') ctx.fill();
          ctx.stroke();
        }
      } else if (el.type === 'line' && el.points && el.points.length >= 2) {
        const p1 = el.points[0];
        const p2 = el.points[1];
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
      } else if (el.type === 'arrow' && el.points && el.points.length >= 2) {
        const p1 = el.points[0];
        const p2 = el.points[1];
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();

        // Arrowhead
        const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
        const headlen = 14;
        ctx.beginPath();
        ctx.moveTo(p2.x, p2.y);
        ctx.lineTo(p2.x - headlen * Math.cos(angle - Math.PI / 6), p2.y - headlen * Math.sin(angle - Math.PI / 6));
        ctx.moveTo(p2.x, p2.y);
        ctx.lineTo(p2.x - headlen * Math.cos(angle + Math.PI / 6), p2.y - headlen * Math.sin(angle + Math.PI / 6));
        ctx.stroke();
      } else if (el.type === 'text' && el.text) {
        const fontSize = el.fontSize || 18;
        ctx.font = `${fontSize}px "Short Stack", "Virgil", cursive, sans-serif`;
        ctx.fillStyle = el.strokeColor;
        const lines = el.text.split('\n');
        const lineHeight = fontSize * 1.35;
        lines.forEach((line, idx) => {
          ctx.fillText(line, el.x, el.y + idx * lineHeight);
        });
      } else if (el.type === 'image' && el.imageUrl) {
        let img = imageCacheRef.current.get(el.imageUrl);
        if (!img) {
          img = new Image();
          img.src = el.imageUrl;
          img.onload = () => {
            renderCanvas();
          };
          imageCacheRef.current.set(el.imageUrl, img);
        }
        if (img.complete && img.naturalWidth > 0) {
          const w = el.width || img.naturalWidth;
          const h = el.height || img.naturalHeight;
          ctx.drawImage(img, el.x, el.y, w, h);
        } else {
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
          ctx.lineWidth = 1;
          ctx.strokeRect(el.x, el.y, el.width || 200, el.height || 150);
        }
      }

      ctx.restore();
    },
    [editingText]
  );

  // Main Canvas Render
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = canvas.width / dpr;
    const height = canvas.height / dpr;

    ctx.save();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.scale(dpr, dpr);

    // Canvas Background
    ctx.fillStyle = resolvedTheme === 'light' ? '#ffffff' : '#121212';
    ctx.fillRect(0, 0, width, height);

    // Dot Grid (Excalidraw style)
    const gridSize = 24 * zoom;
    const offsetX = pan.x % gridSize;
    const offsetY = pan.y % gridSize;

    ctx.fillStyle = resolvedTheme === 'light' ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.08)';
    for (let x = offsetX; x < width; x += gridSize) {
      for (let y = offsetY; y < height; y += gridSize) {
        ctx.fillRect(x, y, 1.5, 1.5);
      }
    }

    // Transforms
    ctx.translate(pan.x, pan.y);
    ctx.scale(zoom, zoom);

    // Draw Elements
    elements.forEach((el) => {
      drawElement(ctx, el);
    });

    // Draw Active Drawing Element (In-progress)
    if (currentElementRef.current) {
      drawElement(ctx, currentElementRef.current);
    }

    // Draw Selection Bounding Box & 8 Control Handles for selected elements
    if (selectedIds.length > 0) {
      const selectedElements = elements.filter((el) => selectedIds.includes(el.id));

      // Single line or arrow with 2 points
      if (
        selectedElements.length === 1 &&
        (selectedElements[0].type === 'line' || selectedElements[0].type === 'arrow') &&
        selectedElements[0].points &&
        selectedElements[0].points.length === 2
      ) {
        const p1 = selectedElements[0].points[0];
        const p2 = selectedElements[0].points[1];

        ctx.save();
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1.5;

        // Start handle
        ctx.beginPath();
        ctx.arc(p1.x, p1.y, 4.5, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();

        // End handle
        ctx.beginPath();
        ctx.arc(p2.x, p2.y, 4.5, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      } else {
        const bounds = getSelectionBounds(selectedIds, elements);
        if (bounds) {
          const { minX, minY, maxX, maxY } = bounds;
          const padding = 6;
          const bMinX = minX - padding;
          const bMinY = minY - padding;
          const bMaxX = maxX + padding;
          const bMaxY = maxY + padding;
          const bWidth = bMaxX - bMinX;
          const bHeight = bMaxY - bMinY;

          ctx.save();
          // Bounding box outline
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 1.2;
          ctx.setLineDash([4, 4]);
          ctx.strokeRect(bMinX, bMinY, bWidth, bHeight);
          ctx.setLineDash([]);

          // 8 Control Handles
          const handleSize = 8;
          const midX = (bMinX + bMaxX) / 2;
          const midY = (bMinY + bMaxY) / 2;

          const handles = [
            { x: bMinX, y: bMinY }, // nw
            { x: midX, y: bMinY }, // n
            { x: bMaxX, y: bMinY }, // ne
            { x: bMaxX, y: midY }, // e
            { x: bMaxX, y: bMaxY }, // se
            { x: midX, y: bMaxY }, // s
            { x: bMinX, y: bMaxY }, // sw
            { x: bMinX, y: midY }, // w
          ];

          ctx.fillStyle = '#ffffff';
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 1.5;

          handles.forEach((h) => {
            ctx.fillRect(h.x - handleSize / 2, h.y - handleSize / 2, handleSize, handleSize);
            ctx.strokeRect(h.x - handleSize / 2, h.y - handleSize / 2, handleSize, handleSize);
          });

          ctx.restore();
        }
      }
    }

    // Draw Windows-Style Marquee Drag-Selection Box
    if (selectionBox) {
      const minX = Math.min(selectionBox.startX, selectionBox.currentX);
      const maxX = Math.max(selectionBox.startX, selectionBox.currentX);
      const minY = Math.min(selectionBox.startY, selectionBox.currentY);
      const maxY = Math.max(selectionBox.startY, selectionBox.currentY);

      ctx.fillStyle = 'rgba(56, 189, 248, 0.12)';
      ctx.fillRect(minX, minY, maxX - minX, maxY - minY);

      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.strokeRect(minX, minY, maxX - minX, maxY - minY);
      ctx.setLineDash([]);
    }

    ctx.restore();
  }, [drawElement, elements, getSelectionBounds, pan, selectedIds, selectionBox, zoom]);

  // Adjust canvas size
  useEffect(() => {
    const updateSize = () => {
      if (canvasRef.current) {
        const { width, height } = canvasRef.current.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        canvasRef.current.width = width * dpr;
        canvasRef.current.height = height * dpr;
        renderCanvas();
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, [renderCanvas]);

  useEffect(() => {
    renderCanvas();
  }, [renderCanvas]);

  // Finish and commit text input
  const handleFinishText = useCallback(() => {
    if (!editingText) return;
    const textVal = editingText.text.trim();

    if (textVal) {
      const existingIdx = elements.findIndex((el) => el.id === editingText.id);
      if (existingIdx !== -1) {
        const updated = [...elements];
        updated[existingIdx] = { ...updated[existingIdx], text: textVal };
        commitElements(updated);
        setSelectedIds([editingText.id]);
        setTool('select');
      } else {
        const newEl: DrawingElement = {
          id: editingText.id,
          type: 'text',
          x: editingText.worldX,
          y: editingText.worldY,
          text: textVal,
          strokeColor,
          fillColor: 'transparent',
          strokeWidth: 1,
        };
        commitElements([...elements, newEl]);
        setSelectedIds([newEl.id]);
        setTool('select');
      }
    }
    setEditingText(null);
  }, [commitElements, editingText, elements, strokeColor]);

  // Double Click Handler (Edit existing text)
  const handleDoubleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const worldPoint = screenToWorld(e.clientX, e.clientY);
    const hitText = [...elements].reverse().find((el) => el.type === 'text' && isPointInElement(worldPoint, el));

    if (hitText) {
      textMountedAtRef.current = Date.now();
      setEditingText({
        id: hitText.id,
        worldX: hitText.x,
        worldY: hitText.y,
        text: hitText.text || '',
      });
    }
  };

  // Mouse Handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    // If text was being edited and user clicks on canvas, commit it
    if (editingText) {
      handleFinishText();
      return;
    }

    // Space or middle mouse click for Panning OR Hand Tool (0 / H)
    if (tool === 'hand' || isSpacePressed || e.button === 1) {
      isPanningRef.current = true;
      mouseModeRef.current = 'panning';
      panStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
      return;
    }

    const worldPoint = screenToWorld(e.clientX, e.clientY);
    startPointRef.current = worldPoint;

    // 1. TEXT TOOL (7 / T) -> Creates new text
    if (tool === 'text') {
      const newId = Math.random().toString();
      textMountedAtRef.current = Date.now();
      setEditingText({
        id: newId,
        worldX: worldPoint.x,
        worldY: worldPoint.y,
        text: '',
      });
      return;
    }

    // 2. SELECT TOOL (1 / V) -> Select, Drag & Resize
    if (tool === 'select') {
      const selectedElements = elements.filter((el) => selectedIds.includes(el.id));
      const handleHit = getHandleAtPoint(worldPoint, selectedElements, zoom);

      if (handleHit) {
        mouseModeRef.current = 'resizing_handle';
        activeHandleRef.current = handleHit.handle;
        resizeInitialBoundsRef.current = getSelectionBounds(selectedIds, elements);
        dragInitialElementsRef.current = JSON.parse(JSON.stringify(elements));
        return;
      }

      const hit = [...elements].reverse().find((el) => isPointInElement(worldPoint, el));

      if (hit) {
        if (e.shiftKey) {
          setSelectedIds((prev) =>
            prev.includes(hit.id) ? prev.filter((id) => id !== hit.id) : [...prev, hit.id]
          );
        } else {
          if (!selectedIds.includes(hit.id)) {
            setSelectedIds([hit.id]);
          }
        }
        mouseModeRef.current = 'dragging_elements';
        dragInitialElementsRef.current = JSON.parse(JSON.stringify(elements));
      } else {
        if (!e.shiftKey) {
          setSelectedIds([]);
        }
        mouseModeRef.current = 'marquee_selecting';
        setSelectionBox({
          startX: worldPoint.x,
          startY: worldPoint.y,
          currentX: worldPoint.x,
          currentY: worldPoint.y,
        });
      }
      return;
    }

    // 3. ERASER TOOL (8 / E)
    if (tool === 'eraser') {
      const hit = [...elements].reverse().find((el) => isPointInElement(worldPoint, el));
      if (hit) {
        const remaining = elements.filter((el) => el.id !== hit.id);
        commitElements(remaining);
      }
      return;
    }

    // 4. DRAWING GEOMETRIC SHAPES & PENCIL
    mouseModeRef.current = 'drawing';
    const newId = Math.random().toString();

    if (tool === 'pencil') {
      currentElementRef.current = {
        id: newId,
        type: 'pencil',
        x: worldPoint.x,
        y: worldPoint.y,
        points: [worldPoint],
        strokeColor,
        fillColor,
        strokeWidth,
      };
    } else if (tool === 'rectangle') {
      currentElementRef.current = {
        id: newId,
        type: 'rectangle',
        x: worldPoint.x,
        y: worldPoint.y,
        width: 0,
        height: 0,
        strokeColor,
        fillColor,
        strokeWidth,
      };
    } else if (tool === 'ellipse') {
      currentElementRef.current = {
        id: newId,
        type: 'ellipse',
        x: worldPoint.x,
        y: worldPoint.y,
        width: 0,
        height: 0,
        strokeColor,
        fillColor,
        strokeWidth,
      };
    } else if (tool === 'line' || tool === 'arrow') {
      currentElementRef.current = {
        id: newId,
        type: tool,
        x: worldPoint.x,
        y: worldPoint.y,
        points: [worldPoint, worldPoint],
        strokeColor,
        fillColor,
        strokeWidth,
      };
    }

    renderCanvas();
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const worldPoint = screenToWorld(e.clientX, e.clientY);

    // Broadcast live cursor to collaborators
    if (isCollaborative && notaId) {
      broadcastCursor(worldPoint.x, worldPoint.y, true);
    }

    // Pan Move
    if (isPanningRef.current) {
      setPan({
        x: e.clientX - panStartRef.current.x,
        y: e.clientY - panStartRef.current.y,
      });
      return;
    }

    // Dynamic Hover Cursor on Handles
    if (mouseModeRef.current === 'idle' && tool === 'select') {
      const selectedElements = elements.filter((el) => selectedIds.includes(el.id));
      const handleHit = getHandleAtPoint(worldPoint, selectedElements, zoom);
      if (handleHit) {
        if (canvasRef.current) {
          canvasRef.current.style.cursor = getCursorForHandle(handleHit.handle);
        }
      } else {
        const hit = [...elements].reverse().find((el) => isPointInElement(worldPoint, el));
        if (canvasRef.current) {
          canvasRef.current.style.cursor = hit ? 'move' : 'default';
        }
      }
    }

    // 1. Interactive Resizing via Control Handles
    if (mouseModeRef.current === 'resizing_handle' && activeHandleRef.current && resizeInitialBoundsRef.current) {
      const handle = activeHandleRef.current;
      const initBounds = resizeInitialBoundsRef.current;
      const initW = Math.max(1, initBounds.maxX - initBounds.minX);
      const initH = Math.max(1, initBounds.maxY - initBounds.minY);
      const dx = worldPoint.x - startPointRef.current.x;
      const dy = worldPoint.y - startPointRef.current.y;

      // Special case: Single line/arrow start/end endpoints
      if (selectedIds.length === 1 && (handle === 'start' || handle === 'end')) {
        const single = dragInitialElementsRef.current.find((el) => el.id === selectedIds[0]);
        if (single && (single.type === 'line' || single.type === 'arrow') && single.points?.length === 2) {
          const pIndex = handle === 'start' ? 0 : 1;
          setElements((prev) =>
            prev.map((el) => {
              if (el.id !== single.id || !el.points) return el;
              const newPoints = [...el.points];
              newPoints[pIndex] = { x: worldPoint.x, y: worldPoint.y };
              return { ...el, points: newPoints };
            })
          );
          return;
        }
      }

      // Compute new candidate bounding box
      let newMinX = initBounds.minX;
      let newMinY = initBounds.minY;
      let newMaxX = initBounds.maxX;
      let newMaxY = initBounds.maxY;

      if (handle.includes('w')) newMinX += dx;
      if (handle.includes('e')) newMaxX += dx;
      if (handle.includes('n')) newMinY += dy;
      if (handle.includes('s')) newMaxY += dy;

      let newW = newMaxX - newMinX;
      let newH = newMaxY - newMinY;

      // Enforce minimum dimensions
      if (newW < 10) {
        if (handle.includes('w')) newMinX = newMaxX - 10;
        else newMaxX = newMinX + 10;
        newW = 10;
      }
      if (newH < 10) {
        if (handle.includes('n')) newMinY = newMaxY - 10;
        else newMaxY = newMinY + 10;
        newH = 10;
      }

      // Preserve aspect ratio if Shift is pressed or single image/math
      const isShift = e.shiftKey;
      const singleEl = selectedIds.length === 1 ? dragInitialElementsRef.current.find((el) => el.id === selectedIds[0]) : null;
      const shouldLockRatio = isShift || singleEl?.type === 'image';

      if (shouldLockRatio && ['nw', 'ne', 'se', 'sw'].includes(handle)) {
        const ratio = initW / initH;
        const currentRatio = newW / newH;
        if (currentRatio > ratio) {
          newW = newH * ratio;
        } else {
          newH = newW / ratio;
        }

        if (handle === 'se') {
          newMaxX = newMinX + newW;
          newMaxY = newMinY + newH;
        } else if (handle === 'sw') {
          newMinX = newMaxX - newW;
          newMaxY = newMinY + newH;
        } else if (handle === 'ne') {
          newMaxX = newMinX + newW;
          newMinY = newMaxY - newH;
        } else if (handle === 'nw') {
          newMinX = newMaxX - newW;
          newMinY = newMaxY - newH;
        }
      }

      const scaleX = (newMaxX - newMinX) / initW;
      const scaleY = (newMaxY - newMinY) / initH;
      const selectedSet = new Set(selectedIds);

      setElements((prev) =>
        prev.map((el) => {
          if (!selectedSet.has(el.id)) return el;
          const initial = dragInitialElementsRef.current.find((item) => item.id === el.id);
          if (!initial) return el;

          const relX = (initial.x - initBounds.minX) / initW;
          const relY = (initial.y - initBounds.minY) / initH;
          const targetX = newMinX + relX * (newMaxX - newMinX);
          const targetY = newMinY + relY * (newMaxY - newMinY);

          if (initial.points && initial.points.length > 0) {
            const scaledPoints = initial.points.map((p) => ({
              x: newMinX + ((p.x - initBounds.minX) / initW) * (newMaxX - newMinX),
              y: newMinY + ((p.y - initBounds.minY) / initH) * (newMaxY - newMinY),
            }));
            return {
              ...el,
              x: targetX,
              y: targetY,
              points: scaledPoints,
            };
          }

          if (initial.type === 'text') {
            const initFontSize = initial.fontSize || 18;
            const uniformScale = Math.min(Math.abs(scaleX), Math.abs(scaleY));
            const newFontSize = Math.max(10, Math.round(initFontSize * uniformScale));
            return {
              ...el,
              x: targetX,
              y: targetY,
              fontSize: newFontSize,
            };
          }

          const targetW = Math.max(10, (initial.width || 50) * Math.abs(scaleX));
          const targetH = Math.max(10, (initial.height || 50) * Math.abs(scaleY));

          return {
            ...el,
            x: targetX,
            y: targetY,
            width: targetW,
            height: targetH,
          };
        })
      );
      return;
    }

    // 2. Move/Drag Selected Elements (Select Tool)
    if (mouseModeRef.current === 'dragging_elements' && selectedIds.length > 0) {
      const dx = worldPoint.x - startPointRef.current.x;
      const dy = worldPoint.y - startPointRef.current.y;
      const selectedSet = new Set(selectedIds);

      setElements((prev) =>
        prev.map((el) => {
          if (!selectedSet.has(el.id)) return el;
          const initial = dragInitialElementsRef.current.find((item) => item.id === el.id);
          if (!initial) return el;

          if (initial.points) {
            return {
              ...el,
              x: initial.x + dx,
              y: initial.y + dy,
              points: initial.points.map((p) => ({ x: p.x + dx, y: p.y + dy })),
            };
          }
          return {
            ...el,
            x: initial.x + dx,
            y: initial.y + dy,
          };
        })
      );
      return;
    }

    // 3. Marquee Selection Box Drag
    if (mouseModeRef.current === 'marquee_selecting') {
      setSelectionBox((prev) => (prev ? { ...prev, currentX: worldPoint.x, currentY: worldPoint.y } : null));

      const box = {
        startX: startPointRef.current.x,
        startY: startPointRef.current.y,
        currentX: worldPoint.x,
        currentY: worldPoint.y,
      };

      const hits = elements.filter((el) => isElementInSelectionBox(el, box)).map((el) => el.id);
      setSelectedIds(hits);
      return;
    }

    // 4. Active Eraser drag
    if (tool === 'eraser' && e.buttons === 1) {
      const hit = [...elements].reverse().find((el) => isPointInElement(worldPoint, el));
      if (hit) {
        const remaining = elements.filter((el) => el.id !== hit.id);
        commitElements(remaining);
      }
      return;
    }

    // 5. Drawing Shape or Pencil in progress
    if (mouseModeRef.current === 'drawing' && currentElementRef.current) {
      const curr = currentElementRef.current;
      if (curr.type === 'pencil' && curr.points) {
        curr.points.push(worldPoint);
      } else if (curr.type === 'rectangle' || curr.type === 'ellipse') {
        curr.width = worldPoint.x - startPointRef.current.x;
        curr.height = worldPoint.y - startPointRef.current.y;
      } else if ((curr.type === 'line' || curr.type === 'arrow') && curr.points) {
        curr.points[1] = worldPoint;
      }
      renderCanvas();
    }
  };

  const handleMouseUp = () => {
    isPanningRef.current = false;

    // End resizing elements via handle
    if (mouseModeRef.current === 'resizing_handle') {
      mouseModeRef.current = 'idle';
      activeHandleRef.current = null;
      resizeInitialBoundsRef.current = null;
      dragInitialElementsRef.current = [];
      commitElements(elements);
      return;
    }

    // End dragging elements
    if (mouseModeRef.current === 'dragging_elements') {
      mouseModeRef.current = 'idle';
      dragInitialElementsRef.current = [];
      commitElements(elements);
      return;
    }

    // End marquee box selection
    if (mouseModeRef.current === 'marquee_selecting') {
      mouseModeRef.current = 'idle';
      setSelectionBox(null);
      return;
    }

    // End drawing element
    if (mouseModeRef.current === 'drawing' && currentElementRef.current) {
      mouseModeRef.current = 'idle';
      const newEl = currentElementRef.current;
      currentElementRef.current = null;
      commitElements([...elements, newEl]);
      setTool('select');
      setSelectedIds([newEl.id]);
      return;
    }

    mouseModeRef.current = 'idle';
  };

  // Touch Handlers for Mobile
  const initialTouchDistanceRef = useRef<number | null>(null);
  const initialZoomRef = useRef<number>(1);

  const getDistance = (touches: React.TouchList) => {
    return Math.sqrt(
      Math.pow(touches[0].clientX - touches[1].clientX, 2) +
      Math.pow(touches[0].clientY - touches[1].clientY, 2)
    );
  };

  const getCenter = (touches: React.TouchList) => {
    return {
      x: (touches[0].clientX + touches[1].clientX) / 2,
      y: (touches[0].clientY + touches[1].clientY) / 2,
    };
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    // Only map single touches to drawing/mouse actions
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      const synthEvent = {
        clientX: touch.clientX,
        clientY: touch.clientY,
        button: 0,
        shiftKey: false,
        buttons: 1
      } as unknown as React.MouseEvent<HTMLCanvasElement>;
      handleMouseDown(synthEvent);
    } 
    else if (e.touches.length === 2) {
      // 2 fingers = pan & zoom
      // Cancel drawing if it was happening
      if (mouseModeRef.current === 'drawing' && currentElementRef.current) {
        currentElementRef.current = null;
        renderCanvas();
      }
      mouseModeRef.current = 'panning';
      initialTouchDistanceRef.current = getDistance(e.touches);
      initialZoomRef.current = zoom;
      
      const center = getCenter(e.touches);
      panStartRef.current = { x: center.x - pan.x, y: center.y - pan.y };
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length === 1) {
      if (mouseModeRef.current === 'panning') return;
      const touch = e.touches[0];
      const synthEvent = {
        clientX: touch.clientX,
        clientY: touch.clientY,
        buttons: 1
      } as unknown as React.MouseEvent<HTMLCanvasElement>;
      handleMouseMove(synthEvent);
    } 
    else if (e.touches.length === 2 && initialTouchDistanceRef.current !== null) {
      const center = getCenter(e.touches);
      const distance = getDistance(e.touches);
      
      // Zoom
      const scale = distance / initialTouchDistanceRef.current;
      const newZoom = Math.max(0.2, Math.min(3, initialZoomRef.current * scale));
      
      setPan({
        x: center.x - panStartRef.current.x,
        y: center.y - panStartRef.current.y,
      });
      setZoom(newZoom);
    }
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length === 0) {
      if (mouseModeRef.current !== 'panning') {
        handleMouseUp();
      }
      initialTouchDistanceRef.current = null;
      mouseModeRef.current = 'idle';
    }
  };

  // Keyboard Shortcuts (Delete selected items, Undo, Redo, Tools)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (editingText) return;

      if (e.code === 'Space') {
        setIsSpacePressed(true);
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) handleRedo();
        else handleUndo();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault();
        handleRedo();
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedIds.length > 0) {
          e.preventDefault();
          const selectedSet = new Set(selectedIds);
          const remaining = elements.filter((el) => !selectedSet.has(el.id));
          setSelectedIds([]);
          commitElements(remaining);
        }
      }
      // Tool hotkeys (0-9)
      if (e.key === 'h' || e.key === '0') setTool('hand');
      if (e.key === 'v' || e.key === '1') setTool('select');
      if (e.key === 'p' || e.key === '2') setTool('pencil');
      if (e.key === 'r' || e.key === '3') setTool('rectangle');
      if (e.key === 'o' || e.key === '4') setTool('ellipse');
      if (e.key === 'a' || e.key === '5') setTool('arrow');
      if (e.key === 'l' || e.key === '6') setTool('line');
      if (e.key === 't' || e.key === '7') setTool('text');
      if (e.key === 'i' || e.key === '8') imageInputRef.current?.click();
      if (e.key === 'e' || e.key === '9') setTool('eraser');
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsSpacePressed(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [commitElements, editingText, elements, handleRedo, handleUndo, selectedIds]);

  // Zoom Scroll Handler
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
    const newZoom = Math.max(0.2, Math.min(3, zoom * zoomFactor));

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;

    setPan((prev) => ({
      x: clientX - (clientX - prev.x) * (newZoom / zoom),
      y: clientY - (clientY - prev.y) * (newZoom / zoom),
    }));
    setZoom(newZoom);
  };

  // Export to PNG Image
  const handleExportPNG = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dataUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `${title || 'desenho-synap'}.png`;
    link.href = dataUrl;
    link.click();
  };

  // Contextual Cursor Indicator
  const getCanvasCursor = () => {
    if (tool === 'hand' || isSpacePressed) return isPanningRef.current ? 'cursor-grabbing' : 'cursor-grab';
    switch (tool) {
      case 'select':
        return selectedIds.length > 0 ? 'cursor-move' : 'cursor-default';
      case 'pencil':
      case 'rectangle':
      case 'ellipse':
      case 'line':
      case 'arrow':
        return 'cursor-crosshair';
      case 'text':
        return 'cursor-text';
      case 'eraser':
        return 'cursor-pointer';
      default:
        return 'cursor-default';
    }
  };

  return (
    <div 
      ref={containerRef} 
      onDragOver={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      onDrop={(e) => {
        e.preventDefault();
        e.stopPropagation();
        const files = e.dataTransfer.files;
        if (files && files.length > 0 && files[0].type.startsWith('image/')) {
          handleInsertImage(files[0]);
        }
      }}
      className="relative w-full h-full flex flex-col bg-[var(--background)] overflow-hidden select-none font-sans"
    >
      {/* Hidden Image File Input */}
      <input
        type="file"
        ref={imageInputRef}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            handleInsertImage(file);
          }
          e.target.value = '';
        }}
        accept="image/*"
        className="hidden"
      />

      {/* Presence UI */}
      {workspaceId && notaId && isCollaborative && (
        <div className="absolute top-4 right-4 z-50 flex items-center gap-3 bg-[var(--background)]/80 backdrop-blur-md px-3 py-1.5 rounded-full border border-[var(--accents-2)] shadow-lg pointer-events-auto">
          {status !== 'connected' && (
            <div className="text-[11px] text-[var(--accents-5)]">
              {status === 'connecting' ? 'Conectando...' : 'Desconectado'}
            </div>
          )}
          <div className="flex -space-x-2">
            {users.map((u: any, i: number) => (
              <div 
                key={i} 
                className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] text-white font-bold border-2 border-[var(--background)] shadow-sm"
                style={{ backgroundColor: u.color || '#ccc' }}
                title={u.name || 'Anon'}
              >
                {(u.name || 'A').charAt(0).toUpperCase()}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top Floating Toolbar (Tools Menu with Number Badges) */}
      <div className="absolute md:top-4 md:bottom-auto bottom-20 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1 bg-[var(--background)]/95 backdrop-blur-md border border-[var(--accents-2)] rounded-xl px-2 py-1.5 shadow-2xl max-w-[95vw] overflow-x-auto no-scrollbar">
        {/* Hand Navigation Tool (0) */}
        <button
          type="button"
          onClick={() => {
            setTool('hand');
            setSelectedIds([]);
          }}
          className={`relative w-8 h-8 flex items-center justify-center rounded-lg text-xs transition-colors cursor-pointer ${
            tool === 'hand' ? 'bg-[#38bdf8]/20 text-[#38bdf8] font-bold' : 'text-[var(--accents-5)] hover:text-[var(--foreground)] hover:bg-[var(--accents-2)]'
          }`}
          title="Mão / Navegar (0 ou H)"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0"/>
            <path d="M14 10V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v2"/>
            <path d="M10 10.5V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v8"/>
            <path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15"/>
          </svg>
          <span className="absolute -top-1 -right-1 text-[8px] font-mono w-3.5 h-3.5 flex items-center justify-center rounded-full bg-[var(--accents-2)] text-[var(--accents-5)] leading-none select-none">
            0
          </span>
        </button>

        {/* Selection Tool (1) */}
        <button
          type="button"
          onClick={() => {
            setTool('select');
          }}
          className={`relative w-8 h-8 flex items-center justify-center rounded-lg text-xs transition-colors cursor-pointer ${
            tool === 'select' ? 'bg-[#38bdf8]/20 text-[#38bdf8] font-bold' : 'text-[#a0a0a0] hover:text-white hover:bg-[#282828]'
          }`}
          title="Seleção / Mover (1 ou V) - Arraste no vazio para selecionar múltiplos"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m3 3 7.07 16.97 2.51-7.39 7.39-2.51L3 3z"/>
            <path d="m13 13 6 6"/>
          </svg>
          <span className="absolute -top-1 -right-1 text-[8px] font-mono w-3.5 h-3.5 flex items-center justify-center rounded-full bg-[var(--accents-2)] text-[var(--accents-5)] leading-none select-none">
            1
          </span>
        </button>

        {/* Pencil Tool (2) */}
        <button
          type="button"
          onClick={() => {
            setTool('pencil');
            setSelectedIds([]);
          }}
          className={`relative w-8 h-8 flex items-center justify-center rounded-lg text-xs transition-colors cursor-pointer ${
            tool === 'pencil' ? 'bg-[#38bdf8]/20 text-[#38bdf8] font-bold' : 'text-[#a0a0a0] hover:text-white hover:bg-[#282828]'
          }`}
          title="Lápis / Caneta Livre (2 ou P)"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
          </svg>
          <span className="absolute -top-1 -right-1 text-[8px] font-mono w-3.5 h-3.5 flex items-center justify-center rounded-full bg-[var(--accents-2)] text-[var(--accents-5)] leading-none select-none">
            2
          </span>
        </button>

        {/* Rectangle Tool (3) */}
        <button
          type="button"
          onClick={() => {
            setTool('rectangle');
            setSelectedIds([]);
          }}
          className={`relative w-8 h-8 flex items-center justify-center rounded-lg text-xs transition-colors cursor-pointer ${
            tool === 'rectangle' ? 'bg-[#38bdf8]/20 text-[#38bdf8] font-bold' : 'text-[#a0a0a0] hover:text-white hover:bg-[#282828]'
          }`}
          title="Retângulo (3 ou R)"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect width="18" height="18" x="3" y="3" rx="2"/>
          </svg>
          <span className="absolute -top-1 -right-1 text-[8px] font-mono w-3.5 h-3.5 flex items-center justify-center rounded-full bg-[var(--accents-2)] text-[var(--accents-5)] leading-none select-none">
            3
          </span>
        </button>

        {/* Ellipse Tool (4) */}
        <button
          type="button"
          onClick={() => {
            setTool('ellipse');
            setSelectedIds([]);
          }}
          className={`relative w-8 h-8 flex items-center justify-center rounded-lg text-xs transition-colors cursor-pointer ${
            tool === 'ellipse' ? 'bg-[#38bdf8]/20 text-[#38bdf8] font-bold' : 'text-[#a0a0a0] hover:text-white hover:bg-[#282828]'
          }`}
          title="Círculo / Elipse (4 ou O)"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/>
          </svg>
          <span className="absolute -top-1 -right-1 text-[8px] font-mono w-3.5 h-3.5 flex items-center justify-center rounded-full bg-[var(--accents-2)] text-[var(--accents-5)] leading-none select-none">
            4
          </span>
        </button>

        {/* Arrow Tool (5) */}
        <button
          type="button"
          onClick={() => {
            setTool('arrow');
            setSelectedIds([]);
          }}
          className={`relative w-8 h-8 flex items-center justify-center rounded-lg text-xs transition-colors cursor-pointer ${
            tool === 'arrow' ? 'bg-[#38bdf8]/20 text-[#38bdf8] font-bold' : 'text-[#a0a0a0] hover:text-white hover:bg-[#282828]'
          }`}
          title="Seta Conectora (5 ou A)"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="5" y1="12" x2="19" y2="12"/>
            <polyline points="12 5 19 12 12 19"/>
          </svg>
          <span className="absolute -top-1 -right-1 text-[8px] font-mono w-3.5 h-3.5 flex items-center justify-center rounded-full bg-[var(--accents-2)] text-[var(--accents-5)] leading-none select-none">
            5
          </span>
        </button>

        {/* Line Tool (6) */}
        <button
          type="button"
          onClick={() => {
            setTool('line');
            setSelectedIds([]);
          }}
          className={`relative w-8 h-8 flex items-center justify-center rounded-lg text-xs transition-colors cursor-pointer ${
            tool === 'line' ? 'bg-[#38bdf8]/20 text-[#38bdf8] font-bold' : 'text-[#a0a0a0] hover:text-white hover:bg-[#282828]'
          }`}
          title="Linha (6 ou L)"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="5" y1="19" x2="19" y2="5"/>
          </svg>
          <span className="absolute -top-1 -right-1 text-[8px] font-mono w-3.5 h-3.5 flex items-center justify-center rounded-full bg-[var(--accents-2)] text-[var(--accents-5)] leading-none select-none">
            6
          </span>
        </button>

        {/* Text Tool (7) */}
        <button
          type="button"
          onClick={() => {
            setTool('text');
            setSelectedIds([]);
          }}
          className={`relative w-8 h-8 flex items-center justify-center rounded-lg text-xs transition-colors cursor-pointer ${
            tool === 'text' ? 'bg-[#38bdf8]/20 text-[#38bdf8] font-bold' : 'text-[#a0a0a0] hover:text-white hover:bg-[#282828]'
          }`}
          title="Texto (7 ou T) - Fonte Short Stack"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="4 7 4 4 20 4 20 7"/>
            <line x1="9" y1="20" x2="15" y2="20"/>
            <line x1="12" y1="4" x2="12" y2="20"/>
          </svg>
          <span className="absolute -top-1 -right-1 text-[8px] font-mono w-3.5 h-3.5 flex items-center justify-center rounded-full bg-[var(--accents-2)] text-[var(--accents-5)] leading-none select-none">
            7
          </span>
        </button>

        {/* Image Tool (8) */}
        <button
          type="button"
          onClick={() => {
            imageInputRef.current?.click();
          }}
          className="relative w-8 h-8 flex items-center justify-center rounded-lg text-xs transition-colors cursor-pointer text-[#a0a0a0] hover:text-white hover:bg-[#282828]"
          title="Adicionar Imagem (8 ou I / Ctrl+V / Arrastar para o canvas)"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect width="18" height="18" x="3" y="3" rx="2"/>
            <circle cx="9" cy="9" r="2"/>
            <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
          </svg>
          <span className="absolute -top-1 -right-1 text-[8px] font-mono w-3.5 h-3.5 flex items-center justify-center rounded-full bg-[var(--accents-2)] text-[var(--accents-5)] leading-none select-none">
            8
          </span>
        </button>

        {/* Eraser Tool (9) */}
        <button
          type="button"
          onClick={() => {
            setTool('eraser');
            setSelectedIds([]);
          }}
          className={`relative w-8 h-8 flex items-center justify-center rounded-lg text-xs transition-colors cursor-pointer ${
            tool === 'eraser' ? 'bg-[#ef4444]/20 text-[#ef4444] font-bold' : 'text-[#a0a0a0] hover:text-white hover:bg-[#282828]'
          }`}
          title="Borracha (9 ou E)"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21"/>
            <path d="M22 21H7"/>
            <path d="m5 11 9 9"/>
          </svg>
          <span className="absolute -top-1 -right-1 text-[8px] font-mono w-3.5 h-3.5 flex items-center justify-center rounded-full bg-[var(--accents-2)] text-[var(--accents-5)] leading-none select-none">
            9
          </span>
        </button>

        <div className="w-[1px] h-4 bg-[#333333] mx-1" />

        {/* Insert Note Container Button (Icon only) */}
        <button
          type="button"
          onClick={() => setPickerModal('nota')}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-[#a0a0a0] hover:text-white hover:bg-[#282828] transition-colors cursor-pointer"
          title="Inserir container de Nota no Desenho"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <line x1="12" y1="18" x2="12" y2="12"/>
            <line x1="9" y1="15" x2="15" y2="15"/>
          </svg>
        </button>

        {/* Insert Card Container Button (Icon only) */}
        <button
          type="button"
          onClick={() => setPickerModal('card')}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-[#a0a0a0] hover:text-white hover:bg-[#282828] transition-colors cursor-pointer"
          title="Inserir container de Flashcard no Desenho"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect width="18" height="14" x="3" y="5" rx="2"/>
            <line x1="3" y1="10" x2="21" y2="10"/>
            <line x1="12" y1="17" x2="12" y2="13"/>
            <line x1="10" y1="15" x2="14" y2="15"/>
          </svg>
        </button>

        {/* Insert Math Equation Button */}
        <button
          type="button"
          onClick={() => setMathModal({ visible: true, editingElementId: null, initialLatex: '' })}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-[#a0a0a0] hover:text-white hover:bg-[#282828] transition-colors cursor-pointer font-mono font-bold text-[11px]"
          title="Inserir Equação Matemática (LaTeX / KaTeX)"
        >
          f(x)
        </button>

        {/* Insert YouTube Video Button */}
        <button
          type="button"
          onClick={() => setIsYouTubeModalOpen(true)}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-[#a0a0a0] hover:text-white hover:bg-[#282828] transition-colors cursor-pointer"
          title="Inserir Vídeo do YouTube"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17"/>
            <polygon points="10 15 15 12 10 9 10 15"/>
          </svg>
        </button>

        <div className="w-[1px] h-4 bg-[#333333] mx-1" />

        {/* Undo / Redo */}
        <button
          type="button"
          onClick={handleUndo}
          disabled={historyIndex <= 0}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-[#a0a0a0] hover:text-white hover:bg-[#282828] disabled:opacity-30 disabled:hover:bg-transparent transition-colors cursor-pointer"
          title="Desfazer (Ctrl + Z)"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 7v6h6"/>
            <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/>
          </svg>
        </button>

        <button
          type="button"
          onClick={handleRedo}
          disabled={historyIndex >= history.length - 1}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-[#a0a0a0] hover:text-white hover:bg-[#282828] disabled:opacity-30 disabled:hover:bg-transparent transition-colors cursor-pointer"
          title="Refazer (Ctrl + Y)"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 7v6h-6"/>
            <path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3l3 2.7"/>
          </svg>
        </button>
      </div>

      {/* Left Floating Style Settings Palette */}
      <div className="absolute top-20 left-4 z-20 flex flex-col gap-3 bg-[var(--background)]/95 backdrop-blur-md border border-[var(--accents-2)] rounded-xl p-3 shadow-2xl text-xs text-[var(--foreground)]">
        {/* Stroke Color */}
        <div className="flex flex-col gap-1.5">
          <span className="font-semibold text-[10px] uppercase tracking-wider text-[var(--accents-5)]">Cor do Traço</span>
          <div className="grid grid-cols-3 gap-1.5">
            {STROKE_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setStrokeColor(c)}
                className={`w-5 h-5 rounded-full border transition-transform ${
                  strokeColor === c ? 'scale-125 border-[var(--foreground)] shadow-md' : 'border-transparent hover:scale-110'
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>

        {/* Fill Color */}
        <div className="flex flex-col gap-1.5 pt-2 border-t border-[var(--accents-2)]">
          <span className="font-semibold text-[10px] uppercase tracking-wider text-[var(--accents-5)]">Preenchimento</span>
          <div className="grid grid-cols-4 gap-1.5">
            {FILL_COLORS.map((fc, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setFillColor(fc)}
                className={`w-5 h-5 rounded-md border flex items-center justify-center transition-transform ${
                  fillColor === fc ? 'scale-125 border-[#38bdf8]' : 'border-[var(--accents-3)] hover:scale-110'
                }`}
                style={{ backgroundColor: fc === 'transparent' ? 'var(--accents-1)' : fc }}
              >
                {fc === 'transparent' && <span className="text-[9px] text-[var(--accents-5)]">✕</span>}
              </button>
            ))}
          </div>
        </div>

        {/* Stroke Width Slider (Force Bar / Range) */}
        <div className="flex flex-col gap-2 pt-2 border-t border-[var(--accents-2)]">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-[10px] uppercase tracking-wider text-[var(--accents-5)]">Espessura</span>
            <span className="text-[11px] font-mono text-[#38bdf8] font-bold">{strokeWidth}px</span>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min="1"
              max="24"
              step="1"
              value={strokeWidth}
              onChange={(e) => setStrokeWidth(Number(e.target.value))}
              className="w-full h-1.5 bg-[var(--accents-2)] rounded-lg appearance-none cursor-pointer accent-[#38bdf8] hover:bg-[var(--accents-3)] transition-colors"
            />
          </div>
          {/* Dynamic stroke preview bar */}
          <div className="h-4 flex items-center justify-center bg-[var(--accents-1)] rounded border border-[var(--accents-2)] px-2 overflow-hidden">
            <div
              className="rounded-full transition-all"
              style={{
                width: '100%',
                height: `${Math.min(14, strokeWidth)}px`,
                backgroundColor: strokeColor === '#ffffff' && resolvedTheme === 'light' ? '#000000' : strokeColor,
              }}
            />
          </div>
        </div>

        {/* Insert Math Button in Side Palette */}
        <button
          type="button"
          onClick={() => setMathModal({ visible: true, editingElementId: null, initialLatex: '' })}
          className="mt-1 py-1.5 px-2 rounded-lg geist-button-secondary flex items-center justify-center gap-1.5 text-xs transition-colors"
          title="Inserir Equação Matemática (LaTeX / KaTeX)"
        >
          <span className="font-mono font-bold text-[11px] text-[#38bdf8]">f(x)</span>
          <span>Equação</span>
        </button>

        {/* Export Button */}
        <button
          type="button"
          onClick={handleExportPNG}
          className="py-1.5 px-2 rounded-lg geist-button-secondary flex items-center justify-center gap-1.5 text-xs transition-colors"
          title="Exportar como imagem PNG"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          <span>Exportar PNG</span>
        </button>
      </div>

      {/* Main Canvas with dynamic contextual cursor */}
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => {
          if (isCollaborative && notaId) {
            broadcastCursor(0, 0, false);
          }
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onDoubleClick={handleDoubleClick}
        onWheel={handleWheel}
        className={`w-full h-full ${getCanvasCursor()}`}
        style={{ touchAction: 'none' }}
      />

      {/* Real-time Multiplayer Cursors (Miro/Figma style) */}
      {workspaceId && notaId && isCollaborative && (
        <LiveCursors
          cursors={cursors}
          transformCoord={(cursor) => worldToScreen(cursor.x, cursor.y)}
        />
      )}

      {/* Seamless Inline Text Input Over Canvas (Short Stack Google Font, Multi-line) */}
      {editingText && (
        <div
          style={{
            position: 'absolute',
            left: `${worldToScreen(editingText.worldX, editingText.worldY).x}px`,
            top: `${worldToScreen(editingText.worldX, editingText.worldY).y - 12 * zoom}px`,
            zIndex: 100,
          }}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          <textarea
            ref={textareaRef}
            value={editingText.text}
            onChange={(e) => setEditingText((prev) => (prev ? { ...prev, text: e.target.value } : null))}
            onBlur={() => {
              if (Date.now() - textMountedAtRef.current < 250) {
                textareaRef.current?.focus();
                return;
              }
              handleFinishText();
            }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                handleFinishText();
              }
            }}
            placeholder="Digite seu texto..."
            autoFocus
            rows={Math.max(2, (editingText.text.match(/\n/g) || []).length + 1)}
            className="bg-[#181818]/95 border border-[#38bdf8] rounded-md outline-none text-white p-2 m-0 resize-none shadow-2xl"
            style={{
              color: strokeColor === '#ffffff' ? '#ffffff' : strokeColor,
              fontSize: `${Math.max(14, 18 * zoom)}px`,
              lineHeight: 1.4,
              fontFamily: '"Short Stack", "Virgil", cursive, sans-serif',
              minWidth: `${Math.max(160, 160 * zoom)}px`,
              minHeight: `${Math.max(42, 42 * zoom)}px`,
              width: `${Math.max(180, (Math.max(...(editingText.text || '').split('\n').map((l) => l.length), 1) + 4) * 12 * zoom)}px`,
              caretColor: '#38bdf8',
            }}
          />
        </div>
      )}

      {/* Interactive Floating Note, Card, Math & YouTube Containers inside Canvas */}
      {elements
        .filter((el) => el.type === 'note_card' || el.type === 'flashcard' || el.type === 'math' || el.type === 'youtube')
        .map((el) => (
          <DrawingItemContainer
            key={el.id}
            element={el}
            zoom={zoom}
            pan={pan}
            isSelected={selectedIds.includes(el.id)}
            onSelect={() => setSelectedIds([el.id])}
            onUpdateElement={(updated) => {
              const updatedList = elements.map((item) => (item.id === updated.id ? updated : item));
              commitElements(updatedList);
            }}
            onDeleteElement={() => {
              const remaining = elements.filter((item) => item.id !== el.id);
              commitElements(remaining);
              setSelectedIds((prev) => prev.filter((id) => id !== el.id));
            }}
            onOpenNota={onOpenNota}
            onOpenCard={onOpenCard}
            onEditMath={(mathEl) =>
              setMathModal({
                visible: true,
                editingElementId: mathEl.id,
                initialLatex: mathEl.latex || '',
              })
            }
          />
        ))}

      {/* Item Picker Modal (Add Note or Card) */}
      {pickerModal && (
        <DrawingItemPickerModal
          type={pickerModal}
          notas={notas}
          workspaceId={workspaceId}
          onSelect={(selectedItem) => handleInsertItem(selectedItem, pickerModal)}
          onClose={() => setPickerModal(null)}
        />
      )}

      {/* Math Equation Modal */}
      <MathEquationModal
        isOpen={mathModal.visible}
        initialLatex={mathModal.initialLatex}
        onClose={() => setMathModal({ visible: false, editingElementId: null, initialLatex: '' })}
        onConfirm={handleConfirmMath}
      />

      {/* YouTube Video Modal */}
      <DrawingYouTubeModal
        isOpen={isYouTubeModalOpen}
        onClose={() => setIsYouTubeModalOpen(false)}
        onConfirm={handleConfirmYouTube}
      />

      {/* Bottom Zoom and Pan Info */}
      <div className="absolute bottom-4 left-4 z-20 flex items-center gap-2 bg-[#1e1e1e]/90 backdrop-blur-md border border-[#2d2d2d] rounded-lg px-2.5 py-1 text-xs text-[#888888]">
        <button
          type="button"
          onClick={() => setZoom((z) => Math.max(0.2, z - 0.1))}
          className="hover:text-white px-1"
        >
          -
        </button>
        <span>{Math.round(zoom * 100)}%</span>
        <button
          type="button"
          onClick={() => setZoom((z) => Math.min(3, z + 0.1))}
          className="hover:text-white px-1"
        >
          +
        </button>
        <button
          type="button"
          onClick={() => {
            setZoom(1);
            setPan({ x: 0, y: 0 });
          }}
          className="hover:text-white pl-1.5 border-l border-[#333333]"
        >
          Reset
        </button>
      </div>
    </div>
  );
}
