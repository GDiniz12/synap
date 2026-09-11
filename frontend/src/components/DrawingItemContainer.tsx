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
      mathHtml = `<span style="color:var(--error);font-family:var(--font-mono);font-size:12px;">${element.latex}</span>`;
    }
  }

  // Drag moving via header
  const handleHeaderMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect();

    const startClientX = e.clientX;
    const startClientY = e.clientY;
    const startX = element.x;
    const startY = element.y;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const dx = (moveEvent.clientX - startClientX) / zoom;
      const dy = (moveEvent.clientY - startClientY) / zoom;
      onUpdateElement({
        ...element,
        x: startX + dx,
        y: startY + dy,
      });
    };

    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  // Resize handler on bottom-right corner
  const handleResizeMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect();

    const startClientX = e.clientX;
    const startClientY = e.clientY;
    const startWidth = element.width || (isYouTube ? 420 : 300);
    const startHeight = element.height || (isMath ? 140 : isYouTube ? 260 : 220);

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const dw = (moveEvent.clientX - startClientX) / zoom;
      const dh = (moveEvent.clientY - startClientY) / zoom;
      onUpdateElement({
        ...element,
        width: Math.max(160, startWidth + dw),
        height: Math.max(90, startHeight + dh),
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
      style={{
        position: 'absolute',
        left: `${screenX}px`,
        top: `${screenY}px`,
        width: `${screenWidth}px`,
        height: `${screenHeight}px`,
        zIndex: isSelected ? 40 : 30,
        background: 'var(--discord-canvas)',
        border: isSelected ? '2px solid var(--brand)' : '1px solid var(--discord-border)',
        borderRadius: '8px',
        boxShadow: isSelected
          ? '0 0 0 1px var(--brand), 0 12px 30px rgba(0,0,0,0.5)'
          : '0 8px 24px rgba(0, 0, 0, 0.4)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        userSelect: 'none',
        transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
      }}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
    >
      {/* Header Bar (Draggable) */}
      <div
        onMouseDown={handleHeaderMouseDown}
        style={{
          height: '34px',
          background: 'var(--discord-user-bar)',
          borderBottom: '1px solid var(--discord-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 10px',
          cursor: 'grab',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '7px', overflow: 'hidden' }}>
          {isMath ? (
            <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--brand)' }}>
              f(x)
            </span>
          ) : isYouTube ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, color: 'var(--discord-text-channel)' }}>
              <path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17"/>
              <polygon points="10 15 15 12 10 9 10 15"/>
            </svg>
          ) : isCard ? (
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, color: 'var(--discord-text-channel)' }}>
              <rect width="18" height="14" x="3" y="5" rx="2"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
          ) : (
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, color: 'var(--discord-text-channel)' }}>
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
            </svg>
          )}
          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--discord-text-primary)', letterSpacing: '-0.01em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {isMath ? 'Equação Matemática' : isYouTube ? 'Vídeo do YouTube' : item.titulo || (isCard ? 'Flashcard' : 'Sem Título')}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {/* Edit / Flip Card / Open Note / Open YouTube Action */}
          {isMath ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (onEditMath) onEditMath(element);
              }}
              className="bg-[var(--discord-hover)] hover:bg-[var(--discord-active)] text-[var(--discord-text-primary)] border border-[var(--discord-border)] rounded-[4px] px-2 py-0.5 text-[11px] font-medium transition-colors cursor-pointer"
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
              className="bg-[var(--brand)] hover:bg-[var(--brand-hover)] text-white rounded-[4px] px-2 py-0.5 text-[11px] font-semibold transition-colors cursor-pointer shadow-xs"
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
              className="bg-[var(--discord-hover)] hover:bg-[var(--discord-active)] text-[var(--discord-text-primary)] border border-[var(--discord-border)] rounded-[4px] px-2 py-0.5 text-[11px] font-medium transition-colors cursor-pointer"
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
              className="bg-[var(--brand)] hover:bg-[var(--brand-hover)] text-white rounded-[4px] px-2 py-0.5 text-[11px] font-semibold transition-colors cursor-pointer shadow-xs"
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
            className="w-[22px] h-[22px] flex items-center justify-center rounded-[4px] text-[var(--discord-text-channel)] hover:text-[#ed4245] hover:bg-[#ed4245]/20 text-[11px] transition-colors cursor-pointer"
            title="Remover elemento do desenho"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Real Content Surface */}
      <div
        style={{
          flex: 1,
          padding: isYouTube ? 0 : '12px 14px',
          overflowY: isYouTube ? 'hidden' : 'auto',
          fontSize: '13px',
          color: 'var(--discord-text-primary)',
          lineHeight: 1.6,
          background: 'var(--discord-canvas)',
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
              pointerEvents: isSelected ? 'auto' : 'auto',
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
              fontSize: '16px',
              textAlign: 'center',
              cursor: 'pointer',
              overflowX: 'auto',
            }}
            title="Duplo clique para editar a fórmula"
            dangerouslySetInnerHTML={{ __html: mathHtml }}
          />
        ) : isCard ? (
          <div>
            <div style={{ fontSize: '10.5px', color: 'var(--discord-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px', fontWeight: 600 }}>
              {isFlipped ? 'Resposta (Verso)' : 'Pergunta (Frente)'}
            </div>
            <div style={{ fontWeight: 500, color: 'var(--discord-text-primary)' }}>
              {isFlipped
                ? item.conteudo || 'Sem resposta cadastrada.'
                : item.titulo || 'Pergunta do card'}
            </div>
          </div>
        ) : item.conteudo && item.conteudo.trim() ? (
          <div
            className="notion-editor text-[12.5px] leading-[1.65] text-[var(--discord-text-primary)]"
            dangerouslySetInnerHTML={{ __html: item.conteudo }}
            style={{ wordBreak: 'break-word', userSelect: 'text' }}
          />
        ) : (
          <div style={{ color: 'var(--discord-text-muted)', fontStyle: 'italic', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
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
          width: '16px',
          height: '16px',
          cursor: 'se-resize',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: 0.6,
        }}
        className="hover:opacity-100 transition-opacity"
      >
        <svg width="8" height="8" viewBox="0 0 10 10" fill="none">
          <line x1="8" y1="2" x2="2" y2="8" stroke="var(--discord-text-muted)" strokeWidth="1.5"/>
          <line x1="9" y1="6" x2="6" y2="9" stroke="var(--discord-text-muted)" strokeWidth="1.5"/>
        </svg>
      </div>
    </div>
  );
}
