'use client';

import React from 'react';
import katex from 'katex';
import { DrawingElement, Point } from './DrawingCanvas';
import { getYouTubeEmbedUrl } from '@/lib/youtube';
import { ensureHtmlContent } from './Editor';

interface DrawingItemContainerProps {
  element: DrawingElement;
  zoom: number;
  pan: Point;
  isSelected: boolean;
  onSelect: () => void;
  onUpdateElement: (updated: DrawingElement) => void;
  onDeleteElement: () => void;
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
  onEditMath,
}: DrawingItemContainerProps) {
  const screenX = element.x * zoom + pan.x;
  const screenY = element.y * zoom + pan.y;
  const screenWidth = (element.width || (element.type === 'youtube' ? 420 : 300)) * zoom;
  const screenHeight = (element.height || (element.type === 'math' ? 140 : element.type === 'youtube' ? 260 : 220)) * zoom;

  const isMath = element.type === 'math';
  const isCard = element.type === 'flashcard';
  const isYouTube = element.type === 'youtube';
  const isContentCard = element.type === 'note_card' || isCard;
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
        pointerEvents: isContentCard ? 'none' : 'auto',
      }}
      className={`flex flex-col bg-[#181818] border transition-[border-color,box-shadow] rounded-none shadow-2xl overflow-hidden font-sansation select-none ${
        isSelected
          ? 'border-white ring-1 ring-white/50 z-30'
          : 'border-white/10 hover:border-white/30 z-10'
      }`}
    >
      {!isContentCard && <div className="h-8 px-3 border-b border-white/10 bg-[#141414] flex items-center justify-between shrink-0 select-none">
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
          ) : (
            <span className="text-xs font-mono font-bold text-zinc-400 shrink-0 leading-none">
              #
            </span>
          )}
          <span className="text-xs font-semibold text-zinc-200 truncate">
            {isMath ? 'Função Matemática' : isYouTube ? 'Vídeo YouTube' : ''}
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
          ) : null}

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
      </div>}

      {isContentCard && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDeleteElement();
          }}
          className="pointer-events-auto absolute right-2 top-2 z-10 flex h-6 w-6 items-center justify-center border border-white/10 bg-[#181818]/90 text-zinc-500 transition-colors hover:border-white/25 hover:bg-[#242424] hover:text-white cursor-pointer"
          title="Remover elemento do desenho"
          aria-label="Remover elemento do desenho"
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      )}

      {/* Real Content Surface */}
      <div
        style={{
          flex: 1,
          padding: isYouTube ? 0 : isContentCard ? '18px' : '10px 12px',
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
          <div className="flex min-h-full flex-col justify-center gap-4 pr-5">
            <p className="m-0 text-sm font-medium leading-relaxed text-zinc-100">
              {item.frente || item.titulo || 'Flashcard sem pergunta.'}
            </p>
            {(item.verso || item.conteudo) && (
              <p className="m-0 border-t border-white/10 pt-4 text-xs leading-relaxed text-zinc-400">
                {item.verso || item.conteudo}
              </p>
            )}
          </div>
        ) : (
          <div className="flex min-h-full flex-col gap-3 pr-5">
            <h3 className="m-0 text-sm font-semibold leading-snug text-zinc-100">
              {item.titulo || 'Nota sem título'}
            </h3>
            {item.conteudo && item.conteudo.trim() ? (
              <div
                className="notion-editor text-xs leading-relaxed text-zinc-300"
                dangerouslySetInnerHTML={{ __html: ensureHtmlContent(item.conteudo) }}
                style={{ wordBreak: 'break-word', userSelect: 'text' }}
              />
            ) : (
              <p className="m-0 text-xs italic text-zinc-500">Nota sem conteúdo.</p>
            )}
          </div>
        )}
      </div>

      {/* Resize Grip Handle (Bottom-Right) */}
      {!isContentCard && <div
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
      </div>}
    </div>
  );
}
