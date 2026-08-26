'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';

interface LoadingScreenProps {
  message?: string;
  onRetry?: () => void;
  fullScreen?: boolean;
}

export default function LoadingScreen({
  message,
  onRetry,
  fullScreen = true,
}: LoadingScreenProps) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Progressive messages based on server wake-up duration
  const getDynamicStatusText = () => {
    if (message) return message;
    if (elapsedSeconds < 4) {
      return 'Conectando ao Synap...';
    }
    if (elapsedSeconds < 14) {
      return 'Iniciando servidor na nuvem...';
    }
    if (elapsedSeconds < 30) {
      return 'O servidor está acordando (plano gratuito do Render). Quase pronto...';
    }
    return 'A inicialização do servidor está levando mais tempo que o normal...';
  };

  const containerClasses = fullScreen
    ? 'fixed inset-0 z-50 flex flex-col items-center justify-center bg-[var(--background)] px-4 select-none'
    : 'w-full h-full min-h-[300px] flex flex-col items-center justify-center bg-[var(--background)] px-4 select-none';

  return (
    <div className={containerClasses}>
      {/* Brand & Loading Container */}
      <div className="flex flex-col items-center max-w-sm text-center animate-in fade-in duration-200">
        {/* Synap Logo */}
        <div className="mb-8 relative">
          <Image
            src="/synap-logo-symbol-name.png"
            alt="Synap Logo"
            width={180}
            height={50}
            style={{ objectFit: 'contain', height: '36px', width: 'auto' }}
            className="dark:invert-0 invert opacity-90"
            priority
          />
        </div>

        {/* Minimalist Geist SVG Spinner */}
        <div className="relative mb-6 flex items-center justify-center">
          <svg
            className="animate-spin text-[var(--foreground)]"
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
          </svg>
        </div>

        {/* Dynamic Status Text */}
        <p className="text-xs text-[var(--foreground)] font-medium tracking-tight mb-2">
          {getDynamicStatusText()}
        </p>

        {/* Subtitle description */}
        <p className="text-[11px] text-[var(--accents-4)] leading-relaxed mb-6">
          {elapsedSeconds >= 4
            ? 'Servidores inativos passam por um ciclo de boot antes de responder.'
            : 'Carregando suas informações e workspaces com segurança.'}
        </p>

        {/* Elapsed Timer Badge */}
        {elapsedSeconds >= 5 && (
          <div className="mb-6 px-2.5 py-1 rounded-[var(--radius)] bg-[var(--accents-1)] border border-[var(--accents-2)] text-[10px] font-mono text-[var(--accents-5)]">
            {elapsedSeconds}s decorridos
          </div>
        )}

        {/* Retry Button if taking long */}
        {elapsedSeconds >= 20 && (
          <button
            type="button"
            onClick={onRetry || (() => window.location.reload())}
            className="geist-button-secondary text-xs px-4 py-1.5 h-8 cursor-pointer flex items-center gap-1.5"
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="1 4 1 10 7 10" />
              <polyline points="23 20 23 14 17 14" />
              <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15" />
            </svg>
            <span>Tentar Novamente</span>
          </button>
        )}
      </div>
    </div>
  );
}
