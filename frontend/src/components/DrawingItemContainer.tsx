'use client';

import React, { useState } from 'react';
import katex from 'katex';
import { DrawingElement, Point } from './DrawingCanvas';
import { getYouTubeEmbedUrl } from '@/lib/youtube';

interface DrawingItemContainerProps {
  element: DrawingElement;
  zoom: number;
  pan: Point;
  isSelected: boolean;
  onSelect: () => void;
  onUpdateElement: (updated: DrawingElement) => void;
  onDeleteElement: () => void;
  onOpenNota?: (nota: any) => void;
  onOpenCard?: (card: any) => void;
  onEditMath?: (element: DrawingElement) => void;
}

export default function DrawingItemContainer({
  element,
  zoom,
  pan,
  isSelected,
  onSelect,
  onUpdateElement,
  onDeleteElement,
  onOpenNota,
  onOpenCard,
  onEditMath,
}: DrawingItemContainerProps) {
  const [isFlipped, setIsFlipped] = useState(false);

  const screenX = element.x * zoom + pan.x;
  const screenY = element.y * zoom + pan.y;
  const screenWidth = (element.width || (element.type === 'youtube' ? 420 : 300)) * zoom;
  const screenHeight = (element.height || (element.type === 'math' ? 140 : element.type === 'youtube' ? 260 : 220)) * zoom;

  const isMath = element.type === 'math';
  const isCard = element.type === 'flashcard';
  const isYouTube = element.type === 'youtube';
  const item = element.itemNota || {};

  let mathHtml = '';
  if (isMath && element.latex) {
    try {
      mathHtml = katex.renderToString(element.latex, { throwOnError: false, displayMode: true });
    } catch (e) {
      mathHtml = `<span style="color:#ef4444;font-family:monospace;font-size:12px;">${element.latex}</span>`;
    }
  }

  const handleResizeMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    const startClientX = e.clientX;
    const startClientY = e.clientY;
    const startW = element.width || 300;
    const startH = element.height || 220;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = (moveEvent.clientX - startClientX) / zoom;
      const deltaY = (moveEvent.clientY - startClientY) / zoom;
      const newWidth = Math.max(160, startW + deltaX);
      const newHeight = Math.max(90, startH + deltaY);

      onUpdateElement({
        ...element,
        width: newWidth,
        height: newHeight,
      });
    };

    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      style={{
        position: 'absolute',
        left: `${screenX}px`,
        top: `${screenY}px`,
        width: `${screenWidth}px`,
        height: `${screenHeight}px`,
        pointerEvents: 'auto',
      }}
      className={`flex flex-col bg-[#181818] border transition-all rounded-none shadow-2xl overflow-hidden font-sansation select-none ${
        isSelected
          ? 'border-white ring-1 ring-white/50 z-30'
          : 'border-white/10 hover:border-white/30 z-10'
      }`}
    >
      {/* Top Header Surface */}
      <div className="h-8 px-3 border-b border-white/10 bg-[#141414] flex items-center justify-between shrink-0 select-none">
        <div className="flex items-center gap-2 overflow-hidden flex-1 mr-2">
          {isMath ? (
            <span className="text-[11px] font-mono font-bold text-white shrink-0">
              f(x)
            </span>
          ) : isYouTube ? (
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-400 shrink-0">
              <path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17"/>
              <polygon points="10 15 15 12 10 9 10 15"/>
            </svg>
          ) : isCard ? (
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-400 shrink-0">
              <rect width="18" height="14" x="3" y="5" rx="2"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
          ) : (
            <span className="text-xs font-mono font-bold text-zinc-400 shrink-0 leading-none">
              #
            </span>
          )}
          <span className="text-xs font-semibold text-zinc-200 truncate">
            {isMath ? 'Função Matemática' : isYouTube ? 'Vídeo YouTube' : item.titulo || (isCard ? 'Flashcard' : 'Sem Título')}
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {/* Action Buttons */}
          {isMath ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (onEditMath) onEditMath(element);
              }}
              className="bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border border-white/10 rounded-none px-2 py-0.5 text-[10px] font-medium transition-colors cursor-pointer"
            >
              Editar
            </button>
          ) : isYouTube ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                const ytUrl = element.youtubeUrl || `https://www.youtube.com/watch?v=${element.youtubeId}`;
                window.open(ytUrl, '_blank', 'noopener,noreferrer');
              }}
              className="bg-white text-black hover:bg-zinc-200 rounded-none px-2 py-0.5 text-[10px] font-bold transition-colors cursor-pointer"
            >
              Abrir ↗
            </button>
          ) : isCard ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsFlipped((prev) => !prev);
              }}
              className="bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border border-white/10 rounded-none px-2 py-0.5 text-[10px] font-medium transition-colors cursor-pointer"
            >
              {isFlipped ? 'Frente' : 'Verso'}
            </button>
          ) : (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (onOpenNota) onOpenNota(item);
              }}
              className="bg-white text-black hover:bg-zinc-200 rounded-none px-2 py-0.5 text-[10px] font-bold transition-colors cursor-pointer"
            >
              Abrir ↗
            </button>
          )}

          {/* Delete Element Button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDeleteElement();
            }}
            className="w-5 h-5 flex items-center justify-center rounded-none text-zinc-500 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Remover elemento do desenho"
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>

      {/* Real Content Surface */}
      <div
        style={{
          flex: 1,
          padding: isYouTube ? 0 : '10px 12px',
          overflowY: isYouTube ? 'hidden' : 'auto',
          fontSize: '12px',
          color: '#e4e4e7',
          lineHeight: 1.6,
          background: '#181818',
          display: isYouTube ? 'flex' : 'block',
        }}
        className="no-scrollbar"
      >
        {isYouTube ? (
          <iframe
            src={getYouTubeEmbedUrl(element.youtubeId || '')}
            title="YouTube video player"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            style={{
              width: '100%',
              height: '100%',
              border: 'none',
              display: 'block',
            }}
          />
        ) : isMath ? (
          <div
            onDoubleClick={(e) => {
              e.stopPropagation();
              if (onEditMath) onEditMath(element);
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              fontSize: '15px',
              textAlign: 'center',
              cursor: 'pointer',
              overflowX: 'auto',
            }}
            title="Duplo clique para editar a fórmula"
            dangerouslySetInnerHTML={{ __html: mathHtml }}
          />
        ) : isCard ? (
          <div>
            <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider mb-1 font-semibold">
              {isFlipped ? 'Resposta (Verso)' : 'Pergunta (Frente)'}
            </div>
            <div className="font-medium text-zinc-200 text-xs">
              {isFlipped
                ? item.conteudo || 'Sem resposta cadastrada.'
                : item.titulo || 'Pergunta do card'}
            </div>
          </div>
        ) : item.conteudo && item.conteudo.trim() ? (
          <div
            className="notion-editor text-xs leading-relaxed text-zinc-300"
            dangerouslySetInnerHTML={{ __html: item.conteudo }}
            style={{ wordBreak: 'break-word', userSelect: 'text' }}
          />
        ) : (
          <div className="text-zinc-500 italic text-xs flex items-center justify-center h-full">
            Nota sem conteúdo.
          </div>
        )}
      </div>

      {/* Resize Grip Handle (Bottom-Right) */}
      <div
        onMouseDown={handleResizeMouseDown}
        style={{
          position: 'absolute',
          bottom: 0,
          right: 0,
          width: '14px',
          height: '14px',
          cursor: 'se-resize',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: 0.5,
        }}
        className="hover:opacity-100 transition-opacity"
      >
        <svg width="8" height="8" viewBox="0 0 10 10" fill="none">
          <line x1="8" y1="2" x2="2" y2="8" stroke="#71717a" strokeWidth="1.5"/>
          <line x1="9" y1="6" x2="6" y2="9" stroke="#71717a" strokeWidth="1.5"/>
        </svg>
      </div>
    </div>
  );
}
