'use client';

import React from 'react';

export interface TesseractLogoProps {
  /** Tamanho em pixels (largura e altura). Padrão: 28 */
  size?: number;
  /** Classes CSS adicionais */
  className?: string;
  /** Variante do logo: 'default' para estático/hover clássico, 'ai' para animação de pulso/respiração do núcleo 4D */
  variant?: 'default' | 'ai';
  /** Se deve exibir o wordmark 'Tesseract' ao lado do símbolo */
  showText?: boolean;
  /** Prioridade de carregamento / acessibilidade */
  priority?: boolean;
}

export default function TesseractLogo({
  size = 28,
  className = '',
  variant = 'default',
  showText = false,
}: TesseractLogoProps) {
  const isAi = variant === 'ai';

  return (
    <div 
      className={`inline-flex items-center gap-2.5 select-none ${className}`}
      role="img"
      aria-label={showText ? 'Tesseract' : isAi ? 'Tesseract AI' : 'Tesseract Logo'}
    >
      <div 
        style={{ width: `${size}px`, height: `${size}px` }} 
        className="relative inline-flex items-center justify-center shrink-0"
      >
        <svg
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full text-current overflow-visible"
        >
          <g className="transition-transform duration-300 ease-out group-hover:scale-[1.04] origin-center">
            {/* --- Cubo Externo (Estrutura Isométrica) --- */}
            {/* Contorno Hexagonal Externo */}
            <path
              d="M 16 3 L 27.25 9.5 L 27.25 22.5 L 16 29 L 4.75 22.5 L 4.75 9.5 Z"
              stroke="currentColor"
              strokeWidth="1.65"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-[var(--foreground,#fff)]"
            />
            {/* Arestas Centrais do Cubo Externo */}
            <path
              d="M 16 16 L 16 29 M 16 16 L 4.75 9.5 M 16 16 L 27.25 9.5"
              stroke="currentColor"
              strokeWidth="1.35"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-[var(--foreground,#fff)] opacity-90"
            />

            {/* --- Arestas de Projeção Hiperdimensional (Conectores 4D) --- */}
            <path
              d="
                M 16 3 L 16 10.28
                M 27.25 9.5 L 20.95 13.14
                M 27.25 22.5 L 20.95 18.86
                M 16 29 L 16 21.72
                M 4.75 22.5 L 11.05 18.86
                M 4.75 9.5 L 11.05 13.14
              "
              stroke="currentColor"
              strokeWidth="1.1"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-[var(--foreground,#fff)] opacity-50 group-hover:opacity-75 transition-opacity duration-300"
            />

            {/* --- Cubo Interno (Núcleo 4D) --- */}
            <g className={isAi ? 'animate-pulse origin-center' : ''}>
              {/* Contorno Hexagonal Interno */}
              <path
                d="M 16 10.28 L 20.95 13.14 L 20.95 18.86 L 16 21.72 L 11.05 18.86 L 11.05 13.14 Z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-[var(--foreground,#fff)] opacity-90 group-hover:opacity-100 transition-opacity"
              />
              {/* Arestas Centrais do Cubo Interno */}
              <path
                d="M 16 16 L 16 21.72 M 16 16 L 11.05 13.14 M 16 16 L 20.95 13.14"
                stroke="currentColor"
                strokeWidth="1.25"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-[var(--foreground,#fff)] opacity-80"
              />
            </g>
          </g>
        </svg>
      </div>

      {showText && (
        <span className="font-semibold text-base tracking-tight text-[var(--foreground,#fff)] font-sans">
          Tesseract
        </span>
      )}
    </div>
  );
}
