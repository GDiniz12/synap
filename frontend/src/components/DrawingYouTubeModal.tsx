'use client';

import React, { useState, useEffect, useRef } from 'react';
import { parseYouTubeVideoId, getYouTubeEmbedUrl } from '@/lib/youtube';

interface DrawingYouTubeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (youtubeId: string, url: string) => void;
}

export default function DrawingYouTubeModal({
  isOpen,
  onClose,
  onConfirm,
}: DrawingYouTubeModalProps) {
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setUrl('');
      setError('');
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 50);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const videoId = parseYouTubeVideoId(url);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!url.trim()) return;

    if (!videoId) {
      setError('Por favor, insira um link válido do YouTube.');
      return;
    }

    onConfirm(videoId, url.trim());
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-[2500] bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 select-none animate-in fade-in duration-150"
      onClick={onClose}
      onKeyDown={handleKeyDown}
    >
      <div
        className="mobile-bottom-sheet md:max-w-[480px] w-full bg-[var(--discord-canvas)] border border-[var(--discord-border)] rounded-[8px] shadow-2xl p-6 flex flex-col gap-4 animate-smooth-pop"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-[6px] bg-[var(--discord-sidebar)] border border-[var(--discord-border)] flex items-center justify-center text-[var(--discord-text-channel)] shrink-0">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17"/>
              <polygon points="10 15 15 12 10 9 10 15"/>
            </svg>
          </div>
          <div>
            <h3 className="m-0 text-base font-semibold text-[var(--discord-text-primary)] leading-tight">
              Inserir Vídeo do YouTube
            </h3>
            <span className="text-xs text-[var(--discord-text-muted)] block mt-0.5">
              Cole o link de qualquer vídeo ou shorts do YouTube
            </span>
          </div>
        </div>

        {/* Live Preview If URL is valid */}
        {videoId && (
          <div className="w-full aspect-video rounded-[6px] overflow-hidden border border-[var(--discord-border)] bg-[var(--discord-sidebar)]">
            <iframe
              src={getYouTubeEmbedUrl(videoId)}
              title="YouTube Preview"
              className="w-full h-full border-none block"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            />
          </div>
        )}

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label
              htmlFor="youtube-url-input"
              className="block text-[11px] font-mono font-semibold uppercase tracking-wider text-[var(--discord-text-muted)] mb-1.5"
            >
              Link do Vídeo
            </label>
            <input
              id="youtube-url-input"
              ref={inputRef}
              type="text"
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                if (error) setError('');
              }}
              placeholder="https://www.youtube.com/watch?v=..."
              className="w-full h-9 px-3 text-xs bg-[var(--discord-input)] border border-[var(--discord-border)] focus:border-[var(--brand)] rounded-[4px] outline-none text-[var(--discord-text-primary)] placeholder-[var(--discord-text-muted)] transition-colors"
            />
            {error && (
              <span className="block text-[#ed4245] text-xs mt-1">
                {error}
              </span>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 pt-2 border-t border-[var(--discord-border)]">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-[4px] text-xs font-medium text-[var(--discord-text-channel)] hover:text-[var(--discord-text-primary)] hover:bg-[var(--discord-hover)] transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!url.trim()}
              className="px-4 py-1.5 rounded-[4px] text-xs font-semibold bg-[var(--brand)] hover:bg-[var(--brand-hover)] text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer shadow-xs"
            >
              Inserir Vídeo
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
