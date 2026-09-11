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
      className="fixed inset-0 z-[2000] bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 select-none animate-in fade-in duration-150"
      onClick={onClose}
      onKeyDown={handleKeyDown}
    >
      <div
        className="mobile-bottom-sheet md:max-w-[540px] w-full bg-[var(--discord-canvas)] border border-[var(--discord-border)] rounded-[8px] shadow-2xl p-6 flex flex-col gap-4 animate-smooth-pop"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-[6px] bg-[var(--discord-sidebar)] border border-[var(--discord-border)] flex items-center justify-center text-[var(--brand)] font-mono font-bold text-xs shrink-0">
            f(x)
          </div>
          <div>
            <h3 className="m-0 text-base font-semibold text-[var(--discord-text-primary)] leading-tight">
              {initialLatex ? 'Editar Função Matemática' : 'Inserir Função Matemática'}
            </h3>
            <span className="text-xs text-[var(--discord-text-muted)] block mt-0.5">
              Fórmula em formato LaTeX com renderização KaTeX
            </span>
          </div>
        </div>

        {/* Live Preview Box */}
        <div className="min-h-[80px] bg-[var(--discord-sidebar)] border border-[var(--discord-border)] rounded-[6px] p-4 flex items-center justify-center overflow-x-auto text-[var(--discord-text-primary)]">
          {renderedHtml ? (
            <div
              dangerouslySetInnerHTML={{ __html: renderedHtml }}
              className="text-lg text-center text-[var(--discord-text-primary)]"
            />
          ) : (
            <span className="text-xs text-[var(--discord-text-muted)]">
              A pré-visualização da fórmula aparecerá aqui...
            </span>
          )}
        </div>

        {/* Preset Chips */}
        <div className="flex flex-col gap-1.5">
          <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-[var(--discord-text-muted)]">
            Atalhos Rápidos
          </span>
          <div className="flex flex-wrap gap-1.5">
            {PRESETS.map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => handleInsertPreset(p.latex)}
                className="px-2 py-1 rounded-[4px] text-xs font-mono bg-[var(--discord-input)] hover:bg-[var(--discord-hover)] text-[var(--discord-text-channel)] hover:text-[var(--discord-text-primary)] border border-[var(--discord-border)] transition-colors cursor-pointer"
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label
              htmlFor="math-latex-input"
              className="block text-[11px] font-mono font-semibold uppercase tracking-wider text-[var(--discord-text-muted)] mb-1.5"
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
              className="w-full h-20 p-2.5 text-xs font-mono bg-[var(--discord-input)] border border-[var(--discord-border)] focus:border-[var(--brand)] rounded-[4px] outline-none text-[var(--discord-text-primary)] placeholder-[var(--discord-text-muted)] resize-none transition-colors"
            />
            {renderError && (
              <span className="block text-[var(--discord-text-muted)] text-[11px] font-mono mt-1">
                {renderError}
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
              disabled={!latex.trim()}
              className="px-4 py-1.5 rounded-[4px] text-xs font-semibold bg-[var(--brand)] hover:bg-[var(--brand-hover)] text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer shadow-xs"
            >
              {initialLatex ? 'Salvar Equação' : 'Inserir Equação'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
