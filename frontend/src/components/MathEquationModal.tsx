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
      className="fixed inset-0 z-[2000] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 select-none animate-in fade-in duration-150 font-sansation"
      onClick={onClose}
      onKeyDown={handleKeyDown}
    >
      <div
        className="max-w-[520px] w-full bg-[#181818] border border-white/10 rounded-none shadow-2xl p-5 flex flex-col gap-4 animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-none bg-white/5 border border-white/10 flex items-center justify-center text-white font-mono font-bold text-xs shrink-0">
            f(x)
          </div>
          <div>
            <h3 className="m-0 text-sm font-bold text-white leading-tight">
              {initialLatex ? 'Editar Função Matemática' : 'Inserir Função Matemática'}
            </h3>
            <span className="text-[11px] text-zinc-400 block mt-0.5">
              Fórmula em formato LaTeX com renderização KaTeX
            </span>
          </div>
        </div>

        {/* Live Preview Box */}
        <div className="min-h-[75px] bg-[#121212] border border-white/10 rounded-none p-3.5 flex items-center justify-center overflow-x-auto text-white">
          {renderedHtml ? (
            <div
              dangerouslySetInnerHTML={{ __html: renderedHtml }}
              className="text-base text-center text-white"
            />
          ) : (
            <span className="text-xs text-zinc-500 italic">
              A pré-visualização da fórmula aparecerá aqui...
            </span>
          )}
        </div>

        {/* Preset Chips */}
        <div className="flex flex-col gap-1.5">
          <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-zinc-500">
            Atalhos Rápidos
          </span>
          <div className="flex flex-wrap gap-1">
            {PRESETS.map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => handleInsertPreset(p.latex)}
                className="px-2 py-0.5 rounded-none text-xs font-mono bg-[#121212] hover:bg-white/10 text-zinc-300 hover:text-white border border-white/10 transition-colors cursor-pointer"
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
          <div>
            <label
              htmlFor="math-latex-input"
              className="block text-[10px] font-mono font-semibold uppercase tracking-wider text-zinc-500 mb-1"
            >
              Código LaTeX
            </label>
            <textarea
              id="math-latex-input"
              ref={inputRef}
              rows={3}
              value={latex}
              onChange={(e) => setLatex(e.target.value)}
              placeholder="Ex: \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}"
              className="w-full h-20 p-2.5 text-xs font-mono bg-[#121212] border border-white/10 focus:border-white/30 rounded-none outline-none text-white placeholder-zinc-600 resize-none transition-colors"
            />
            {renderError && (
              <span className="block text-red-400 text-[11px] font-mono mt-1">
                {renderError}
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
              disabled={!latex.trim()}
              className="h-8 px-4 text-xs font-bold rounded-none bg-white text-black hover:bg-zinc-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              {initialLatex ? 'Salvar Equação' : 'Inserir Equação'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
