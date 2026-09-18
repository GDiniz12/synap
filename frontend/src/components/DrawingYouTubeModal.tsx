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
      className="fixed inset-0 z-[2500] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 select-none animate-in fade-in duration-150 font-sansation"
      onClick={onClose}
      onKeyDown={handleKeyDown}
    >
      <div
        className="max-w-[460px] w-full bg-[#181818] border border-white/10 rounded-none shadow-2xl p-5 flex flex-col gap-4 animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-none bg-white/5 border border-white/10 flex items-center justify-center text-zinc-400 shrink-0">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17"/>
              <polygon points="10 15 15 12 10 9 10 15"/>
            </svg>
          </div>
          <div>
            <h3 className="m-0 text-sm font-bold text-white leading-tight">
              Inserir Vídeo do YouTube
            </h3>
            <span className="text-[11px] text-zinc-400 block mt-0.5">
              Cole o link de qualquer vídeo ou shorts do YouTube
            </span>
          </div>
        </div>

        {/* Live Preview If URL is valid */}
        {videoId && (
          <div className="w-full aspect-video rounded-none overflow-hidden border border-white/10 bg-[#121212]">
            <iframe
              src={getYouTubeEmbedUrl(videoId)}
              title="YouTube Preview"
              className="w-full h-full border-none block"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            />
          </div>
        )}

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
          <div>
            <label
              htmlFor="youtube-url-input"
              className="block text-[10px] font-mono font-semibold uppercase tracking-wider text-zinc-500 mb-1"
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
              className="w-full h-8 px-3 text-xs bg-[#121212] border border-white/10 focus:border-white/30 rounded-none outline-none text-white placeholder-zinc-600 transition-colors font-sansation"
            />
            {error && (
              <span className="block text-red-400 text-xs mt-1">
                {error}
              </span>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="h-8 px-3.5 text-xs font-medium rounded-none bg-transparent hover:bg-white/5 border border-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!url.trim()}
              className="h-8 px-4 text-xs font-bold rounded-none bg-white text-black hover:bg-zinc-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              Inserir Vídeo
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
