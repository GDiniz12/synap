'use client';

import React, { useEffect, useState } from 'react';

export default function TitleBar() {
  const [isDesktop, setIsDesktop] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.synapDesktop?.isDesktop) {
      setIsDesktop(true);

      const checkMaximized = async () => {
        if (window.synapDesktop?.isMaximized) {
          const max = await window.synapDesktop.isMaximized();
          setIsMaximized(max);
        }
      };

      checkMaximized();
      const interval = setInterval(checkMaximized, 1000);
      return () => clearInterval(interval);
    }
  }, []);

  if (!isDesktop) {
    return null;
  }

  const handleMinimize = () => {
    window.synapDesktop?.minimize();
  };

  const handleMaximize = async () => {
    await window.synapDesktop?.maximize();
    const max = await window.synapDesktop?.isMaximized();
    setIsMaximized(!!max);
  };

  const handleClose = () => {
    window.synapDesktop?.close();
  };

  return (
    <header
      style={{
        height: '32px',
        width: '100%',
        background: 'var(--background)',
        borderBottom: '1px solid var(--accents-2)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 8px 0 12px',
        userSelect: 'none',
        WebkitAppRegion: 'drag',
        zIndex: 9999,
        position: 'relative',
      } as React.CSSProperties}
    >
      {/* Brand & App Title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <img
          src="/synap-logo-unique.png"
          alt="Synap"
          style={{
            width: '16px',
            height: '16px',
            objectFit: 'contain',
          }}
          className="dark:invert-0 invert"
        />
        <span
          style={{
            fontSize: '12px',
            fontWeight: 500,
            color: 'var(--foreground)',
            letterSpacing: '-0.01em',
          }}
        >
          Synap
        </span>
      </div>

      {/* Window Controls (Minimize, Maximize/Restore, Close) */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          WebkitAppRegion: 'no-drag',
        } as React.CSSProperties}
      >
        {/* Minimize */}
        <button
          type="button"
          onClick={handleMinimize}
          title="Minimizar"
          aria-label="Minimizar janela"
          style={{
            width: '28px',
            height: '24px',
            background: 'transparent',
            border: 'none',
            borderRadius: '4px',
            color: 'var(--accents-5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'background 0.15s ease, color 0.15s ease',
          }}
          className="hover:bg-[var(--accents-2)] hover:text-[var(--foreground)]"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>

        {/* Maximize / Restore */}
        <button
          type="button"
          onClick={handleMaximize}
          title={isMaximized ? 'Restaurar' : 'Maximizar'}
          aria-label={isMaximized ? 'Restaurar janela' : 'Maximizar janela'}
          style={{
            width: '28px',
            height: '24px',
            background: 'transparent',
            border: 'none',
            borderRadius: '4px',
            color: 'var(--accents-5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'background 0.15s ease, color 0.15s ease',
          }}
          className="hover:bg-[var(--accents-2)] hover:text-[var(--foreground)]"
        >
          {isMaximized ? (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="7" y="7" width="13" height="13" rx="2" ry="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
          ) : (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            </svg>
          )}
        </button>

        {/* Close */}
        <button
          type="button"
          onClick={handleClose}
          title="Fechar"
          aria-label="Fechar janela"
          style={{
            width: '28px',
            height: '24px',
            background: 'transparent',
            border: 'none',
            borderRadius: '4px',
            color: 'var(--accents-5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'background 0.15s ease, color 0.15s ease',
          }}
          className="hover:bg-[var(--error)] hover:text-white"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    </header>
  );
}
