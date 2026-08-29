'use client';

import React, { useState, useEffect, useRef } from 'react';
import katex from 'katex';

interface MathEquationModalProps {
  isOpen: boolean;
  initialLatex?: string;
  onClose: () => void;
  onConfirm: (latex: string) => void;
}

const PRESETS = [
  { label: 'Fração', latex: '\\frac{a}{b}' },
  { label: 'Raiz', latex: '\\sqrt{x}' },
  { label: 'Potência', latex: 'x^{2}' },
  { label: 'Integral', latex: '\\int_{a}^{b} f(x) \\, dx' },
  { label: 'Somatório', latex: '\\sum_{i=1}^{n} x_i' },
  { label: 'Limite', latex: '\\lim_{x \\to \\infty} f(x)' },
  { label: 'Derivada', latex: '\\frac{df}{dx}' },
  { label: 'Matriz', latex: '\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}' },
];

export default function MathEquationModal({
  isOpen,
  initialLatex = '',
  onClose,
  onConfirm,
}: MathEquationModalProps) {
  const [latex, setLatex] = useState(initialLatex);
  const [renderedHtml, setRenderedHtml] = useState('');
  const [renderError, setRenderError] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isOpen) {
      setLatex(initialLatex || 'f(x) = \\int_{0}^{\\infty} e^{-x^2} \\, dx');
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          inputRef.current.select();
        }
      }, 50);
    } else {
      setLatex('');
      setRenderedHtml('');
      setRenderError('');
    }
  }, [isOpen, initialLatex]);

  // Live KaTeX rendering
  useEffect(() => {
    if (!latex.trim()) {
      setRenderedHtml('');
      setRenderError('');
      return;
    }

    try {
      const html = katex.renderToString(latex, {
        throwOnError: true,
        displayMode: true,
      });
      setRenderedHtml(html);
      setRenderError('');
    } catch (err: any) {
      try {
        const fallbackHtml = katex.renderToString(latex, {
          throwOnError: false,
          displayMode: true,
        });
        setRenderedHtml(fallbackHtml);
        setRenderError(err.message || 'Sintaxe LaTeX incompleta');
      } catch (e: any) {
        setRenderError(e.message || 'Erro ao renderizar fórmula.');
      }
    }
  }, [latex]);

  if (!isOpen) return null;

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = latex.trim();
    if (!trimmed) return;
    onConfirm(trimmed);
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      onClose();
    } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey || !e.shiftKey)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleInsertPreset = (presetLatex: string) => {
    if (!inputRef.current) {
      setLatex((prev) => (prev ? `${prev} ${presetLatex}` : presetLatex));
      return;
    }

    const start = inputRef.current.selectionStart;
    const end = inputRef.current.selectionEnd;
    const current = latex;
    const updated = current.substring(0, start) + presetLatex + current.substring(end);
    setLatex(updated);

    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        inputRef.current.setSelectionRange(start + presetLatex.length, start + presetLatex.length);
      }
    }, 10);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 2000,
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
        className="mobile-bottom-sheet md:max-w-[540px] w-full"
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
              fontFamily: 'var(--font-mono)',
              fontWeight: 700,
              fontSize: '13px',
            }}
          >
            f(x)
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
              {initialLatex ? 'Editar Função Matemática' : 'Inserir Função Matemática'}
            </h3>
            <span
              style={{
                fontSize: '12px',
                color: 'var(--accents-5)',
                display: 'block',
                marginTop: '2px',
              }}
            >
              Fórmula em formato LaTeX com renderização KaTeX
            </span>
          </div>
        </div>

        {/* Live Preview Box */}
        <div
          style={{
            minHeight: '80px',
            background: 'var(--accents-1)',
            border: '1px solid var(--accents-2)',
            borderRadius: '8px',
            padding: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflowX: 'auto',
            color: 'var(--foreground)',
          }}
        >
          {renderedHtml ? (
            <div
              dangerouslySetInnerHTML={{ __html: renderedHtml }}
              style={{ fontSize: '18px', textAlign: 'center' }}
            />
          ) : (
            <span style={{ fontSize: '13px', color: 'var(--accents-4)' }}>
              A pré-visualização da fórmula aparecerá aqui...
            </span>
          )}
        </div>

        {/* Preset Chips */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--accents-5)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Atalhos Rápidos
          </span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {PRESETS.map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => handleInsertPreset(p.latex)}
                className="geist-button-secondary"
                style={{
                  padding: '3px 8px',
                  fontSize: '11.5px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  height: '24px',
                  display: 'inline-flex',
                  alignItems: 'center',
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Input Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label
              htmlFor="math-latex-input"
              style={{
                display: 'block',
                fontSize: '12px',
                fontWeight: 500,
                color: 'var(--accents-6)',
                marginBottom: '6px',
              }}
            >
              Código LaTeX
            </label>
            <textarea
              id="math-latex-input"
              ref={inputRef}
              rows={3}
              value={latex}
              onChange={(e) => setLatex(e.target.value)}
              placeholder="Ex: \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}"
              className="geist-input"
              style={{
                width: '100%',
                height: '75px',
                padding: '8px 12px',
                fontSize: '13px',
                fontFamily: 'var(--font-mono)',
                borderRadius: '6px',
                outline: 'none',
                resize: 'none',
              }}
            />
            {renderError && (
              <span
                style={{
                  display: 'block',
                  color: 'var(--accents-5)',
                  fontSize: '11px',
                  marginTop: '4px',
                  fontFamily: 'var(--font-mono)',
                }}
              >
                {renderError}
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
              disabled={!latex.trim()}
              className="geist-button"
              style={{
                height: '34px',
                padding: '0 16px',
                fontSize: '13px',
                borderRadius: '6px',
                cursor: !latex.trim() ? 'not-allowed' : 'pointer',
                opacity: !latex.trim() ? 0.6 : 1,
              }}
            >
              {initialLatex ? 'Salvar Equação' : 'Inserir Equação'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
