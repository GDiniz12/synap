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
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 2500,
        background: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
      onClick={onClose}
      onKeyDown={handleKeyDown}
    >
      <div
        className="mobile-bottom-sheet md:max-w-[480px] w-full"
        style={{
          background: 'var(--background)',
          border: '1px solid var(--accents-2)',
          borderRadius: '12px',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              background: 'var(--accents-1)',
              border: '1px solid var(--accents-2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--foreground)',
              flexShrink: 0,
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17"/>
              <polygon points="10 15 15 12 10 9 10 15"/>
            </svg>
          </div>
          <div>
            <h3
              style={{
                margin: 0,
                fontSize: '16px',
                fontWeight: 600,
                color: 'var(--foreground)',
                lineHeight: 1.2,
              }}
            >
              Inserir Vídeo do YouTube
            </h3>
            <span
              style={{
                fontSize: '12px',
                color: 'var(--accents-5)',
                display: 'block',
                marginTop: '2px',
              }}
            >
              Cole o link de qualquer vídeo ou shorts do YouTube
            </span>
          </div>
        </div>

        {/* Live Preview If URL is valid */}
        {videoId && (
          <div
            style={{
              width: '100%',
              aspectRatio: '16/9',
              borderRadius: '8px',
              overflow: 'hidden',
              border: '1px solid var(--accents-2)',
              background: 'var(--accents-1)',
            }}
          >
            <iframe
              src={getYouTubeEmbedUrl(videoId)}
              title="YouTube Preview"
              style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            />
          </div>
        )}

        {/* Input Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label
              htmlFor="youtube-url-input"
              style={{
                display: 'block',
                fontSize: '12px',
                fontWeight: 500,
                color: 'var(--accents-6)',
                marginBottom: '6px',
              }}
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
              className="geist-input"
              style={{
                width: '100%',
                height: '38px',
                padding: '0 12px',
                fontSize: '13px',
                borderRadius: '6px',
                outline: 'none',
              }}
            />
            {error && (
              <span
                style={{
                  display: 'block',
                  color: 'var(--error, #ef4444)',
                  fontSize: '11.5px',
                  marginTop: '4px',
                }}
              >
                {error}
              </span>
            )}
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <button
              type="button"
              onClick={onClose}
              className="geist-button-secondary"
              style={{
                height: '34px',
                padding: '0 14px',
                fontSize: '13px',
                borderRadius: '6px',
                cursor: 'pointer',
              }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!url.trim()}
              className="geist-button"
              style={{
                height: '34px',
                padding: '0 16px',
                fontSize: '13px',
                borderRadius: '6px',
                cursor: !url.trim() ? 'not-allowed' : 'pointer',
                opacity: !url.trim() ? 0.6 : 1,
              }}
            >
              Inserir Vídeo
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
