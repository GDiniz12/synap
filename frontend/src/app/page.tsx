'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import SynapLogo from '@/components/SynapLogo';

type OSType = 'windows' | 'linux' | 'mac' | 'unknown';

interface DownloadOption {
  os: 'windows' | 'linux' | 'mac' | 'web';
  name: string;
  badge: string;
  filename: string;
  format: string;
  size: string;
  recommendedFor?: string;
  url: string;
  instructions: string;
}

const GITHUB_REPO = 'https://github.com/GDiniz12/synap';

export default function LandingPage() {
  const router = useRouter();
  const [detectedOS, setDetectedOS] = useState<OSType>('unknown');
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'graph' | 'editor' | 'canvas' | 'flashcards' | 'ai'>('graph');

  // Spaced repetition flashcard preview state
  const [flashcardFlipped, setFlashcardFlipped] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isDesktopApp = !!window.synapDesktop?.isDesktop;
      const token = localStorage.getItem('token');

      // If running inside Electron desktop app, immediately bypass landing page
      if (isDesktopApp) {
        if (token) {
          router.replace('/dashboard');
        } else {
          router.replace('/login');
        }
        return;
      }

      if (token) {
        setIsAuthenticated(true);
      }

      const userAgent = window.navigator.userAgent.toLowerCase();
      if (userAgent.includes('win')) {
        setDetectedOS('windows');
      } else if (userAgent.includes('linux') || userAgent.includes('x11')) {
        setDetectedOS('linux');
      } else if (userAgent.includes('mac') || userAgent.includes('darwin')) {
        setDetectedOS('mac');
      }
    }
  }, [router]);

  const downloadOptions: DownloadOption[] = [
    {
      os: 'windows',
      name: 'Windows',
      badge: 'Instalador Executável',
      filename: 'Tesseract-Setup.exe',
      format: '.exe (64-bit)',
      size: '~85 MB',
      recommendedFor: 'Windows 10, 11 (x64)',
      url: '/api/download?os=windows',
      instructions: 'Execute o instalador e siga o assistente na tela para concluir.',
    },
    {
      os: 'linux',
      name: 'Linux AppImage',
      badge: 'Portátil Universal',
      filename: 'Tesseract.AppImage',
      format: '.AppImage (x64)',
      size: '~90 MB',
      recommendedFor: 'Qualquer distribuição Linux moderna',
      url: '/api/download?os=linux-appimage',
      instructions: 'Torne o arquivo executável: chmod +x Tesseract.AppImage && ./Tesseract.AppImage',
    },
    {
      os: 'linux',
      name: 'Linux Debian / Ubuntu',
      badge: 'Pacote DEB',
      filename: 'tesseract_amd64.deb',
      format: '.deb (amd64)',
      size: '~78 MB',
      recommendedFor: 'Debian, Ubuntu, Linux Mint, Pop!_OS',
      url: '/api/download?os=linux-deb',
      instructions: 'Instale via terminal: sudo dpkg -i tesseract_amd64.deb ou dê duplo clique.',
    },
    {
      os: 'mac',
      name: 'macOS',
      badge: 'Imagem de Disco',
      filename: 'Tesseract.dmg',
      format: '.dmg (Universal)',
      size: '~92 MB',
      recommendedFor: 'macOS 12+ (Apple Silicon & Intel)',
      url: '/api/download?os=mac',
      instructions: 'Abra a imagem .dmg e arraste o Tesseract para a pasta Aplicativos.',
    },
  ];

  const primaryDownload =
    downloadOptions.find((opt) => opt.os === detectedOS) ||
    downloadOptions.find((opt) => opt.os === 'windows') ||
    downloadOptions[0];

  return (
    <div className="min-h-screen bg-[#1e1f22] text-[#dbdee1] selection:bg-[#20b8cd] selection:text-white font-sans">
      {/* Navigation Bar */}
      <header className="sticky top-0 z-50 w-full border-b border-[#383a40] bg-[#1e1f22]/90 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <SynapLogo size={36} className="transition-transform group-hover:scale-105" priority />
            <span className="font-bold text-lg text-white tracking-tight">Tesseract</span>
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-sm text-[#949ba4]">
            <a href="#recursos" className="hover:text-white transition-colors">
              Recursos
            </a>
            <a href="#pilares" className="hover:text-white transition-colors">
              Pilares
            </a>
            <a href="#download" className="hover:text-white transition-colors">
              Downloads
            </a>
            <a href="#arquitetura" className="hover:text-white transition-colors">
              Arquitetura
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <a
              href={GITHUB_REPO}
              target="_blank"
              rel="noreferrer"
              className="p-2 text-[#949ba4] hover:text-white hover:bg-[#2b2d31] rounded transition-colors"
              title="Código Aberto no GitHub"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
              </svg>
            </a>

            {isAuthenticated ? (
              <Link
                href="/dashboard"
                className="h-9 px-4 text-xs font-semibold rounded-[4px] bg-[#20b8cd] hover:bg-[#1ba2b4] text-white flex items-center gap-1.5 shadow-sm transition-colors"
              >
                <span>Abrir Workspaces</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </Link>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/login"
                  className="h-9 px-3.5 text-xs font-medium text-[#dbdee1] hover:text-white hover:bg-[#2b2d31] rounded-[4px] transition-colors flex items-center"
                >
                  Entrar
                </Link>
                <Link
                  href="/register"
                  className="h-9 px-4 text-xs font-semibold rounded-[4px] bg-[#20b8cd] hover:bg-[#1ba2b4] text-white flex items-center shadow-sm transition-colors"
                >
                  Criar Conta
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-20 pb-16 px-4 max-w-6xl mx-auto text-center overflow-hidden">
        {/* Ambient Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-[#20b8cd]/10 blur-[120px] rounded-full pointer-events-none -z-10" />

        {/* Feature Pill */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#2b2d31] border border-[#383a40] text-[#dbdee1] text-xs font-medium mb-6 shadow-sm">
          <div className="w-2 h-2 rounded-full bg-[#23a55a] animate-pulse" />
          <span>Sua Segunda Mente • Conexões, Grafo & Flashcards</span>
        </div>

        {/* Main Headline */}
        <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold text-white tracking-tight leading-[1.1] max-w-4xl mx-auto">
          Onde todas as suas ideias <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#20b8cd] via-[#38cddf] to-[#23a55a]">
            se conectam.
          </span>
        </h1>

        {/* Subtitle */}
        <p className="mt-6 text-sm sm:text-base md:text-lg text-[#949ba4] max-w-2xl mx-auto leading-relaxed">
          O Tesseract une editor markdown bidirecional, grafo neural de conexões, canvas infinito, flashcards com repetição
          espaçada SM-2 e IA contextual integrada em um ambiente ultra rápido.
        </p>

        {/* CTA Buttons */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3 max-w-md mx-auto">
          <a
            href="#download"
            className="w-full sm:w-auto h-11 px-6 text-sm font-semibold rounded-[4px] bg-[#20b8cd] hover:bg-[#1ba2b4] text-white flex items-center justify-center gap-2 shadow-lg shadow-[#20b8cd]/20 transition-all hover:scale-[1.02]"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            <span>Baixar para {primaryDownload.name}</span>
          </a>

          <Link
            href={isAuthenticated ? '/dashboard' : '/login'}
            className="w-full sm:w-auto h-11 px-6 text-sm font-medium rounded-[4px] bg-[#2b2d31] hover:bg-[#35373c] border border-[#383a40] text-[#dbdee1] hover:text-white flex items-center justify-center gap-2 transition-colors"
          >
            <span>{isAuthenticated ? 'Abrir Workspace' : 'Usar no Navegador'}</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </Link>
        </div>

        {/* Platform Hint */}
        <div className="mt-4 text-xs text-[#949ba4] flex items-center justify-center gap-4">
          <span className="flex items-center gap-1.5">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            Windows, Linux e macOS
          </span>
          <span>•</span>
          <span className="flex items-center gap-1.5">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            Local-First & Web
          </span>
        </div>
      </section>

      {/* Interactive App Mockup Preview */}
      <section className="py-8 px-4 max-w-6xl mx-auto">
        <div className="rounded-xl border border-[#383a40] bg-[#2b2d31] shadow-2xl overflow-hidden">
          {/* Window Header / Tab Switcher */}
          <div className="border-b border-[#383a40] bg-[#1e1f22] px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
            {/* Window Controls */}
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[#f23f43]/80" />
              <div className="w-3 h-3 rounded-full bg-[#f0b232]/80" />
              <div className="w-3 h-3 rounded-full bg-[#23a55a]/80" />
              <span className="ml-2 text-xs font-mono text-[#949ba4] hidden sm:inline">Tesseract — Segundo Cérebro</span>
            </div>

            {/* View Switcher Tabs */}
            <div className="flex items-center gap-1 bg-[#2b2d31] p-1 rounded-md border border-[#383a40]">
              <button
                onClick={() => setActiveTab('graph')}
                className={`px-3 py-1 text-xs font-medium rounded flex items-center gap-1.5 transition-colors ${
                  activeTab === 'graph' ? 'bg-[#20b8cd] text-white' : 'text-[#949ba4] hover:text-[#dbdee1]'
                }`}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="18" cy="5" r="3" />
                  <circle cx="6" cy="12" r="3" />
                  <circle cx="18" cy="19" r="3" />
                  <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                  <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                </svg>
                <span>Grafo</span>
              </button>

              <button
                onClick={() => setActiveTab('editor')}
                className={`px-3 py-1 text-xs font-medium rounded flex items-center gap-1.5 transition-colors ${
                  activeTab === 'editor' ? 'bg-[#20b8cd] text-white' : 'text-[#949ba4] hover:text-[#dbdee1]'
                }`}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                </svg>
                <span>Editor</span>
              </button>

              <button
                onClick={() => setActiveTab('canvas')}
                className={`px-3 py-1 text-xs font-medium rounded flex items-center gap-1.5 transition-colors ${
                  activeTab === 'canvas' ? 'bg-[#20b8cd] text-white' : 'text-[#949ba4] hover:text-[#dbdee1]'
                }`}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 19l7-7 3 3-7 7-3-3z" />
                  <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
                </svg>
                <span>Canvas</span>
              </button>

              <button
                onClick={() => setActiveTab('flashcards')}
                className={`px-3 py-1 text-xs font-medium rounded flex items-center gap-1.5 transition-colors ${
                  activeTab === 'flashcards' ? 'bg-[#20b8cd] text-white' : 'text-[#949ba4] hover:text-[#dbdee1]'
                }`}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="2" y="4" width="20" height="16" rx="2" />
                  <path d="M7 15h10" />
                  <path d="M7 9h10" />
                </svg>
                <span>Flashcards</span>
              </button>

              <button
                onClick={() => setActiveTab('ai')}
                className={`px-3 py-1 text-xs font-medium rounded flex items-center gap-1.5 transition-colors ${
                  activeTab === 'ai' ? 'bg-[#20b8cd] text-white' : 'text-[#949ba4] hover:text-[#dbdee1]'
                }`}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                </svg>
                <span>Tesseract AI</span>
              </button>
            </div>
          </div>

          {/* Interactive Screen Preview Container */}
          <div className="min-h-[420px] bg-[#313338] relative flex flex-col justify-center">
            {/* 1. Tab: Grafo Neural */}
            {activeTab === 'graph' && (
              <div className="p-6 relative h-full flex flex-col items-center justify-center min-h-[420px] overflow-hidden bg-[#1e1f22]/60">
                {/* Visual Nodes Simulation with SVGs */}
                <svg className="w-full h-80 max-w-2xl pointer-events-none" viewBox="0 0 600 300">
                  <defs>
                    <linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#20b8cd" stopOpacity="0.4" />
                      <stop offset="100%" stopColor="#23a55a" stopOpacity="0.4" />
                    </linearGradient>
                  </defs>
                  {/* Edges */}
                  <line x1="300" y1="150" x2="180" y2="80" stroke="#383a40" strokeWidth="2" />
                  <line x1="300" y1="150" x2="420" y2="90" stroke="#383a40" strokeWidth="2" />
                  <line x1="300" y1="150" x2="220" y2="220" stroke="#20b8cd" strokeWidth="2" strokeOpacity="0.6" />
                  <line x1="300" y1="150" x2="390" y2="230" stroke="#383a40" strokeWidth="2" />
                  <line x1="180" y1="80" x2="90" y2="120" stroke="#383a40" strokeWidth="1.5" />
                  <line x1="420" y1="90" x2="510" y2="130" stroke="#383a40" strokeWidth="1.5" />
                  <line x1="220" y1="220" x2="130" y2="240" stroke="#383a40" strokeWidth="1.5" />
                  <line x1="390" y1="230" x2="490" y2="220" stroke="#383a40" strokeWidth="1.5" />
                  <line x1="180" y1="80" x2="220" y2="220" stroke="#23a55a" strokeWidth="1.5" strokeOpacity="0.4" />

                  {/* Nodes */}
                  <circle cx="300" cy="150" r="22" fill="#20b8cd" />
                  <text x="300" y="154" fill="#ffffff" fontSize="9" textAnchor="middle" fontWeight="bold">
                    Tesseract
                  </text>

                  <circle cx="180" cy="80" r="16" fill="#23a55a" />
                  <text x="180" y="84" fill="#ffffff" fontSize="8" textAnchor="middle">
                    Machine Learning
                  </text>

                  <circle cx="420" cy="90" r="15" fill="#f0b232" />
                  <text x="420" y="94" fill="#1e1f22" fontSize="8" textAnchor="middle" fontWeight="bold">
                    Arquitetura
                  </text>

                  <circle cx="220" cy="220" r="17" fill="#20b8cd" />
                  <text x="220" y="224" fill="#ffffff" fontSize="8" textAnchor="middle">
                    Flashcards
                  </text>

                  <circle cx="390" cy="230" r="14" fill="#eb459e" />
                  <text x="390" y="234" fill="#ffffff" fontSize="8" textAnchor="middle">
                    Canvas
                  </text>

                  <circle cx="90" cy="120" r="10" fill="#383a40" />
                  <circle cx="510" cy="130" r="10" fill="#383a40" />
                  <circle cx="130" cy="240" r="9" fill="#383a40" />
                  <circle cx="490" cy="220" r="11" fill="#383a40" />
                </svg>

                {/* Floating Info Pill */}
                <div className="absolute bottom-4 left-6 flex items-center gap-3 bg-[#2b2d31]/90 backdrop-blur-sm border border-[#383a40] px-3.5 py-1.5 rounded-full text-xs text-[#949ba4]">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#20b8cd]" />
                    142 Notas
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#23a55a]" />
                    328 Conexões
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#f0b232]" />
                    Física Vetorial
                  </span>
                </div>
              </div>
            )}

            {/* 2. Tab: Editor Markdown */}
            {activeTab === 'editor' && (
              <div className="grid grid-cols-1 md:grid-cols-4 min-h-[420px] text-left">
                {/* File Tree Sidebar */}
                <div className="border-r border-[#383a40] bg-[#2b2d31]/70 p-4 hidden md:block">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-[#949ba4] mb-3">Workspace</div>
                  <div className="space-y-1 text-xs">
                    <div className="p-1.5 rounded bg-[#35373c] text-white font-medium flex items-center gap-2">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      </svg>
                      Redes Neurais.md
                    </div>
                    <div className="p-1.5 rounded text-[#949ba4] hover:bg-[#35373c]/50 flex items-center gap-2">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      </svg>
                      Backpropagation.md
                    </div>
                    <div className="p-1.5 rounded text-[#949ba4] hover:bg-[#35373c]/50 flex items-center gap-2">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      </svg>
                      Gradiente Descendente.md
                    </div>
                  </div>
                </div>

                {/* Editor Surface */}
                <div className="md:col-span-3 p-6 space-y-4 font-mono text-xs text-[#dbdee1]">
                  <div className="text-xl font-bold font-sans text-white"># Redes Neurais e Conexões</div>
                  <p className="text-[#949ba4] leading-relaxed">
                    O aprendizado profundo fundamenta-se na otimização de pesos interconectados. Ao analisar o comportamento de{' '}
                    <span className="text-[#20b8cd] bg-[#20b8cd]/10 px-1 py-0.5 rounded border border-[#20b8cd]/30 cursor-pointer">
                      [[Backpropagation]]
                    </span>
                    , percebemos que o erro retropropaga pelas camadas via gradiente.
                  </p>
                  <div className="p-4 rounded-lg bg-[#1e1f22] border border-[#383a40]">
                    <div className="text-[#949ba4] text-[10px] mb-2 uppercase">Bloco de Notas Relacionadas</div>
                    <div className="flex flex-wrap gap-2">
                      <span className="px-2.5 py-1 rounded bg-[#2b2d31] border border-[#383a40] text-xs text-[#23a55a]">
                        ← Backlinks: 6 referências
                      </span>
                      <span className="px-2.5 py-1 rounded bg-[#2b2d31] border border-[#383a40] text-xs text-[#f0b232]">
                        #inteligencia-artificial
                      </span>
                      <span className="px-2.5 py-1 rounded bg-[#2b2d31] border border-[#383a40] text-xs text-[#20b8cd]">
                        3 Flashcards gerados
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 3. Tab: Canvas */}
            {activeTab === 'canvas' && (
              <div className="p-6 relative min-h-[420px] flex items-center justify-center bg-[#1e1f22]/50">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-2xl">
                  <div className="p-4 rounded-lg bg-[#2b2d31] border border-[#20b8cd] shadow-lg text-left">
                    <div className="flex items-center gap-2 text-[#20b8cd] font-semibold text-xs mb-2">
                      <div className="w-2 h-2 rounded-full bg-[#20b8cd]" />
                      Entrada de Dados
                    </div>
                    <p className="text-xs text-[#949ba4]">Camada inicial de tensores normalizados.</p>
                  </div>

                  <div className="p-4 rounded-lg bg-[#2b2d31] border border-[#23a55a] shadow-lg text-left">
                    <div className="flex items-center gap-2 text-[#23a55a] font-semibold text-xs mb-2">
                      <div className="w-2 h-2 rounded-full bg-[#23a55a]" />
                      Camadas Ocultas
                    </div>
                    <p className="text-xs text-[#949ba4]">Ativações não lineares (ReLU, GELU).</p>
                  </div>

                  <div className="p-4 rounded-lg bg-[#2b2d31] border border-[#f0b232] shadow-lg text-left">
                    <div className="flex items-center gap-2 text-[#f0b232] font-semibold text-xs mb-2">
                      <div className="w-2 h-2 rounded-full bg-[#f0b232]" />
                      Classificação Final
                    </div>
                    <p className="text-xs text-[#949ba4]">Distribuição Softmax sobre as classes.</p>
                  </div>
                </div>

                <div className="absolute bottom-4 right-6 bg-[#2b2d31] border border-[#383a40] px-3 py-1.5 rounded text-xs text-[#949ba4] flex items-center gap-2">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  Whiteboard vetorial com zoom infinito
                </div>
              </div>
            )}

            {/* 4. Tab: Flashcards SM-2 */}
            {activeTab === 'flashcards' && (
              <div className="p-6 flex flex-col items-center justify-center min-h-[420px]">
                <div
                  onClick={() => setFlashcardFlipped(!flashcardFlipped)}
                  className="w-full max-w-md bg-[#2b2d31] border border-[#383a40] hover:border-[#20b8cd] rounded-xl p-8 cursor-pointer shadow-xl transition-all min-h-[220px] flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between text-xs text-[#949ba4]">
                    <span>Deck: Inteligência Artificial</span>
                    <span className="text-[#20b8cd] font-mono">Algoritmo SM-2</span>
                  </div>

                  <div className="text-center py-4">
                    {!flashcardFlipped ? (
                      <div>
                        <span className="text-[11px] uppercase tracking-wider text-[#949ba4] block mb-2">Pergunta</span>
                        <p className="text-base font-medium text-white">
                          O que é o fenômeno de Vanishing Gradient em redes profundas?
                        </p>
                        <span className="text-xs text-[#20b8cd] mt-4 block">Clique para revelar a resposta</span>
                      </div>
                    ) : (
                      <div>
                        <span className="text-[11px] uppercase tracking-wider text-[#23a55a] block mb-2">Resposta</span>
                        <p className="text-sm text-[#dbdee1] leading-relaxed">
                          Ocorre quando os gradientes diminuem exponencialmente ao retropropagar, impedindo as primeiras
                          camadas de atualizar seus pesos eficazmente.
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="text-center text-[11px] text-[#949ba4]">
                    {flashcardFlipped ? 'Como foi a sua lembrança?' : '1 de 18 flashcards para revisar hoje'}
                  </div>
                </div>

                {/* SM-2 Rating Buttons Preview */}
                {flashcardFlipped && (
                  <div className="flex items-center gap-2 mt-4">
                    <button className="px-3 py-1.5 rounded bg-[#f23f43]/15 text-[#f23f43] border border-[#f23f43]/30 text-xs font-semibold">
                      Repetir (1m)
                    </button>
                    <button className="px-3 py-1.5 rounded bg-[#f0b232]/15 text-[#f0b232] border border-[#f0b232]/30 text-xs font-semibold">
                      Difícil (10m)
                    </button>
                    <button className="px-3 py-1.5 rounded bg-[#20b8cd]/15 text-[#20b8cd] border border-[#20b8cd]/30 text-xs font-semibold">
                      Bom (1d)
                    </button>
                    <button className="px-3 py-1.5 rounded bg-[#23a55a]/15 text-[#23a55a] border border-[#23a55a]/30 text-xs font-semibold">
                      Fácil (4d)
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* 5. Tab: Tesseract AI */}
            {activeTab === 'ai' && (
              <div className="p-6 flex flex-col justify-between min-h-[420px] max-w-3xl mx-auto w-full">
                {/* Chat Messages Mockup */}
                <div className="space-y-4 text-left">
                  {/* User message */}
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#20b8cd] text-white flex items-center justify-center font-bold text-xs shrink-0">
                      U
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-white">Você</span>
                        <span className="text-[10px] text-[#949ba4]">Hoje às 14:20</span>
                      </div>
                      <p className="text-xs text-[#dbdee1] mt-1 bg-[#2b2d31] p-2.5 rounded-lg border border-[#383a40]">
                        Crie um resumo e um mapa mental sobre /Redes-Neurais e adicione flashcards na pasta #IA.
                      </p>
                    </div>
                  </div>

                  {/* AI message */}
                  <div className="flex items-start gap-3">
                    <SynapLogo size={32} className="shrink-0 mt-0.5" />
                    <div className="w-full">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-white">Tesseract AI</span>
                        <span className="text-[10px] text-[#949ba4]">Hoje às 14:20</span>
                      </div>
                      <div className="text-xs text-[#dbdee1] mt-1 bg-[#2b2d31] p-3 rounded-lg border border-[#383a40] space-y-2">
                        <p>
                          Analisei as notas vinculadas em <span className="text-[#20b8cd] font-semibold">/Redes-Neurais</span>.
                          Criei o canvas conceitual com 3 camadas conectadas e gerei 4 flashcards com algoritmo SM-2 na pasta <span className="text-[#23a55a] font-semibold">#IA</span>.
                        </p>
                        <div className="flex gap-2 pt-1">
                          <span className="px-2 py-1 rounded bg-[#1e1f22] border border-[#383a40] text-[11px] text-[#23a55a] flex items-center gap-1">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                            Canvas Criado
                          </span>
                          <span className="px-2 py-1 rounded bg-[#1e1f22] border border-[#383a40] text-[11px] text-[#20b8cd] flex items-center gap-1">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                            4 Flashcards Inseridos
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Input Bar Mockup */}
                <div className="mt-4 pt-3 border-t border-[#383a40]">
                  <div className="bg-[#383a40]/60 rounded-lg px-3.5 py-2.5 flex items-center gap-3 border border-[#383a40]">
                    <button className="w-6 h-6 rounded-full bg-[#4e5058] text-white flex items-center justify-center text-xs hover:bg-[#20b8cd] transition-colors">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="12" y1="5" x2="12" y2="19" />
                        <line x1="5" y1="12" x2="19" y2="12" />
                      </svg>
                    </button>
                    <span className="text-xs text-[#949ba4] flex-1 text-left">
                      Pergunte algo, use /nome-nota ou #pasta para contexto...
                    </span>
                    <button className="text-[#949ba4] hover:text-[#20b8cd] transition-colors">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="22" y1="2" x2="11" y2="13" />
                        <polygon points="22 2 15 22 11 13 2 9 22 2" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Pillars / Features Grid Section */}
      <section id="pilares" className="py-20 px-4 max-w-6xl mx-auto scroll-mt-16">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#2b2d31] border border-[#383a40] text-xs text-[#949ba4] mb-3">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="m9 12 2 2 4-4" />
            </svg>
            <span>Arquitetura Completa</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
            Pilares do seu segundo cérebro
          </h2>
          <p className="mt-3 text-sm text-[#949ba4]">
            Projetado para conectar aprendizado profundo, criatividade visual e retenção de longo prazo.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {/* Feature 1 */}
          <div className="bg-[#2b2d31] border border-[#383a40] hover:border-[#20b8cd]/50 hover:bg-[#313338] rounded-xl p-6 flex flex-col justify-between transition-all">
            <div>
              <div className="w-10 h-10 rounded-lg bg-[#1e1f22] border border-[#383a40] flex items-center justify-center mb-4 text-[#20b8cd]">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="18" cy="5" r="3" />
                  <circle cx="6" cy="12" r="3" />
                  <circle cx="18" cy="19" r="3" />
                  <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                  <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                </svg>
              </div>
              <h3 className="text-base font-semibold text-white mb-2">Grafo Neural de Conhecimento</h3>
              <p className="text-xs text-[#949ba4] leading-relaxed">
                Descubra conexões invisíveis. O grafo do Tesseract mapeia interdependências, destaca clusters temáticos e
                permite navegar visualmente pelo seu repositório de ideias.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-[#383a40] text-[11px] font-mono text-[#949ba4] flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#20b8cd]" />
              Física vetorial • Zoom infinito
            </div>
          </div>

          {/* Feature 2 */}
          <div className="bg-[#2b2d31] border border-[#383a40] hover:border-[#20b8cd]/50 hover:bg-[#313338] rounded-xl p-6 flex flex-col justify-between transition-all">
            <div>
              <div className="w-10 h-10 rounded-lg bg-[#1e1f22] border border-[#383a40] flex items-center justify-center mb-4 text-[#23a55a]">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                </svg>
              </div>
              <h3 className="text-base font-semibold text-white mb-2">Editor Markdown Bidirecional</h3>
              <p className="text-xs text-[#949ba4] leading-relaxed">
                Crie referências imediatas com duplo colchete. O Tesseract calcula automaticamente backlinks cruzados para
                que nenhuma anotação fique isolada no sistema.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-[#383a40] text-[11px] font-mono text-[#949ba4] flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#23a55a]" />
              Sintaxe padrão • Backlinks em tempo real
            </div>
          </div>

          {/* Feature 3 */}
          <div className="bg-[#2b2d31] border border-[#383a40] hover:border-[#20b8cd]/50 hover:bg-[#313338] rounded-xl p-6 flex flex-col justify-between transition-all">
            <div>
              <div className="w-10 h-10 rounded-lg bg-[#1e1f22] border border-[#383a40] flex items-center justify-center mb-4 text-[#f0b232]">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 19l7-7 3 3-7 7-3-3z" />
                  <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
                </svg>
              </div>
              <h3 className="text-base font-semibold text-white mb-2">Canvas & Whiteboard Integrado</h3>
              <p className="text-xs text-[#949ba4] leading-relaxed">
                Liberdade visual ilimitada. Combine diagramas conceituais, ilustrações à mão livre e cartões de notas
                em uma tela contínua sem fronteiras de tamanho.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-[#383a40] text-[11px] font-mono text-[#949ba4] flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#f0b232]" />
              Vetores fluidos • Formas livres
            </div>
          </div>

          {/* Feature 4 */}
          <div className="bg-[#2b2d31] border border-[#383a40] hover:border-[#20b8cd]/50 hover:bg-[#313338] rounded-xl p-6 flex flex-col justify-between transition-all">
            <div>
              <div className="w-10 h-10 rounded-lg bg-[#1e1f22] border border-[#383a40] flex items-center justify-center mb-4 text-[#eb459e]">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="2" y="4" width="20" height="16" rx="2" />
                  <path d="M7 15h10" />
                  <path d="M7 9h10" />
                </svg>
              </div>
              <h3 className="text-base font-semibold text-white mb-2">Flashcards com Algoritmo SM-2</h3>
              <p className="text-xs text-[#949ba4] leading-relaxed">
                Transforme qualquer nota em cartões de estudo instantaneamente. O motor de repetição espaçada agenda
                revisões no momento ideal para retenção definitiva.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-[#383a40] text-[11px] font-mono text-[#949ba4] flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#eb459e]" />
              SuperMemo SM-2 • Decks por pasta
            </div>
          </div>

          {/* Feature 5 */}
          <div className="bg-[#2b2d31] border border-[#383a40] hover:border-[#20b8cd]/50 hover:bg-[#313338] rounded-xl p-6 flex flex-col justify-between transition-all">
            <div>
              <div className="w-10 h-10 rounded-lg bg-[#1e1f22] border border-[#383a40] flex items-center justify-center mb-4 text-[#20b8cd]">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                </svg>
              </div>
              <h3 className="text-base font-semibold text-white mb-2">Tesseract AI — Assistente Contextual</h3>
              <p className="text-xs text-[#949ba4] leading-relaxed">
                Uma IA integrada ao seu espaço de trabalho. Invoque contextos específicos com /nota e #pasta para
                gerar resumos, sugerir conexões e criar materiais de estudo.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-[#383a40] text-[11px] font-mono text-[#949ba4] flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#20b8cd]" />
              Comandos de contexto • Geração direta
            </div>
          </div>

          {/* Feature 6 */}
          <div className="bg-[#2b2d31] border border-[#383a40] hover:border-[#20b8cd]/50 hover:bg-[#313338] rounded-xl p-6 flex flex-col justify-between transition-all">
            <div>
              <div className="w-10 h-10 rounded-lg bg-[#1e1f22] border border-[#383a40] flex items-center justify-center mb-4 text-[#23a55a]">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </div>
              <h3 className="text-base font-semibold text-white mb-2">Sincronização & Tempo Real</h3>
              <p className="text-xs text-[#949ba4] leading-relaxed">
                Compartilhe workspaces inteiros com colegas ou grupos de estudo. Colaboração instantânea via WebSockets
                com sincronização de dados transparente.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-[#383a40] text-[11px] font-mono text-[#949ba4] flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#23a55a]" />
              WebSockets • Presença síncrona
            </div>
          </div>
        </div>
      </section>

      {/* Download Center Section */}
      <section id="download" className="py-20 px-4 max-w-6xl mx-auto border-t border-[#383a40] scroll-mt-16">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#2b2d31] border border-[#383a40] text-xs text-[#949ba4] mb-3">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            <span>Central de Downloads</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
            Baixe o Tesseract para o seu sistema
          </h2>
          <p className="mt-3 text-sm text-[#949ba4]">
            Escolha o pacote ideal para seu ambiente ou acesse diretamente pelo navegador.
          </p>
        </div>

        {/* Download Grid Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
          {downloadOptions.map((opt, idx) => {
            const isDetected = opt.os === detectedOS;
            return (
              <div
                key={idx}
                className={`bg-[#2b2d31] p-6 rounded-xl border flex flex-col justify-between relative transition-all ${
                  isDetected ? 'border-[#20b8cd] shadow-lg shadow-[#20b8cd]/10' : 'border-[#383a40] hover:border-[#4e5058]'
                }`}
              >
                {isDetected && (
                  <div className="absolute top-4 right-4 text-[10px] uppercase font-bold bg-[#20b8cd] text-white px-2 py-0.5 rounded-[3px]">
                    Recomendado
                  </div>
                )}

                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-lg bg-[#1e1f22] border border-[#383a40] flex items-center justify-center text-white">
                      {opt.os === 'windows' && (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                          <rect x="3" y="3" width="8" height="8" />
                          <rect x="13" y="3" width="8" height="8" />
                          <rect x="3" y="13" width="8" height="8" />
                          <rect x="13" y="13" width="8" height="8" />
                        </svg>
                      )}
                      {opt.os === 'linux' && (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                          <path d="M4 17l6-6-6-6" />
                          <line x1="12" y1="19" x2="20" y2="19" />
                        </svg>
                      )}
                      {opt.os === 'mac' && (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                          <path d="M12 20.94c1.5 0 2.75 1.06 4 1.06 3 0 6-8 6-12.22A4.91 4.91 0 0 0 17 5c-2.22 0-4 1.44-5 2-1-.56-2.78-2-5-2a4.9 4.9 0 0 0-5 4.78C2 14 5 22 8 22c1.25 0 2.5-1.06 4-1.06Z" />
                          <path d="M10 2c1 .5 2 2 2 5" />
                        </svg>
                      )}
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-white leading-tight">{opt.name}</h3>
                      <span className="text-xs text-[#949ba4]">{opt.recommendedFor}</span>
                    </div>
                  </div>

                  <div className="my-3 p-3 bg-[#1e1f22] border border-[#383a40] rounded-lg font-mono text-xs text-[#dbdee1] flex items-center justify-between">
                    <span className="truncate mr-2 font-medium">{opt.filename}</span>
                    <span className="text-[#949ba4] text-[11px] whitespace-nowrap">{opt.size}</span>
                  </div>

                  <p className="text-xs text-[#949ba4] mb-4">{opt.instructions}</p>
                </div>

                <div className="pt-3 border-t border-[#383a40]">
                  <a
                    href={opt.url}
                    className={`h-10 px-4 text-xs font-semibold rounded-[4px] w-full flex items-center justify-center gap-2 transition-colors ${
                      isDetected
                        ? 'bg-[#20b8cd] hover:bg-[#1ba2b4] text-white shadow-md shadow-[#20b8cd]/20'
                        : 'bg-[#313338] hover:bg-[#383a40] text-[#dbdee1] hover:text-white border border-[#383a40]'
                    }`}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    <span>Download {opt.format}</span>
                  </a>
                </div>
              </div>
            );
          })}
        </div>

        {/* Web Alternative Banner */}
        <div className="p-6 rounded-xl border border-[#383a40] bg-[#2b2d31]/50 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-[#1e1f22] border border-[#383a40] flex items-center justify-center text-[#20b8cd] shrink-0">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="2" y1="12" x2="22" y2="12" />
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
              </svg>
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">Não quer instalar nada agora?</h4>
              <p className="text-xs text-[#949ba4]">
                Acesse a versão Web completa diretamente pelo seu navegador favorito.
              </p>
            </div>
          </div>

          <Link
            href={isAuthenticated ? '/dashboard' : '/login'}
            className="h-9 px-5 text-xs font-semibold rounded-[4px] bg-[#20b8cd] hover:bg-[#1ba2b4] text-white whitespace-nowrap w-full sm:w-auto flex items-center justify-center gap-1.5 transition-colors"
          >
            <span>{isAuthenticated ? 'Abrir Tesseract Web' : 'Acessar no Navegador'}</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </Link>
        </div>
      </section>

      {/* Architecture & Tech Specs */}
      <section id="arquitetura" className="py-20 px-4 max-w-6xl mx-auto border-t border-[#383a40] scroll-mt-16">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-center">
          <div className="lg:col-span-1">
            <h2 className="text-xs uppercase font-bold tracking-wider text-[#20b8cd] mb-2">
              Engenharia & Arquitetura
            </h2>
            <h3 className="text-2xl font-bold text-white tracking-tight mb-4">
              Construído para velocidade extrema.
            </h3>
            <p className="text-xs text-[#949ba4] leading-relaxed mb-4">
              O Tesseract combina o ecossistema moderno do Next.js e Tailwind CSS com a estabilidade do PostgreSQL, Prisma e
              comunicação contínua via WebSockets.
            </p>
            <div className="flex flex-col gap-2 font-mono text-xs text-[#dbdee1]">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#23a55a]" />
                <span>Zero telemetria invasiva</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#23a55a]" />
                <span>Design System Minimalista Geist</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#23a55a]" />
                <span>Privacidade e controle total</span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-5 bg-[#2b2d31] border border-[#383a40] rounded-xl">
              <span className="text-[10px] font-mono uppercase text-[#20b8cd] font-semibold">Frontend Stack</span>
              <h4 className="text-sm font-semibold text-white mt-1 mb-2">Next.js App Router & React</h4>
              <p className="text-xs text-[#949ba4] leading-relaxed">
                Renderização otimizada, design tokens refinados e fluidez tátil sem atrasos de interface.
              </p>
            </div>

            <div className="p-5 bg-[#2b2d31] border border-[#383a40] rounded-xl">
              <span className="text-[10px] font-mono uppercase text-[#23a55a] font-semibold">Backend & Realtime</span>
              <h4 className="text-sm font-semibold text-white mt-1 mb-2">Node.js, Express & WebSockets</h4>
              <p className="text-xs text-[#949ba4] leading-relaxed">
                Transmissão instantânea de alterações e sincronização entre múltiplos participantes.
              </p>
            </div>

            <div className="p-5 bg-[#2b2d31] border border-[#383a40] rounded-xl">
              <span className="text-[10px] font-mono uppercase text-[#f0b232] font-semibold">Persistência</span>
              <h4 className="text-sm font-semibold text-white mt-1 mb-2">PostgreSQL & Prisma ORM</h4>
              <p className="text-xs text-[#949ba4] leading-relaxed">
                Integridade referencial estrita, consultas indexadas e suporte a grandes grafos de notas interligadas.
              </p>
            </div>

            <div className="p-5 bg-[#2b2d31] border border-[#383a40] rounded-xl">
              <span className="text-[10px] font-mono uppercase text-[#eb459e] font-semibold">Desktop Engine</span>
              <h4 className="text-sm font-semibold text-white mt-1 mb-2">Electron & Electron Builder</h4>
              <p className="text-xs text-[#949ba4] leading-relaxed">
                Instaladores nativos pré-compilados com segurança de IPC e acesso eficiente ao sistema de arquivos.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="w-full border-t border-[#383a40] bg-[#1e1f22] py-12 px-4">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <SynapLogo size={24} />
            <span className="text-xs text-[#949ba4]">
              © {new Date().getFullYear()} Tesseract Team. Todos os direitos reservados.
            </span>
          </div>

          <div className="flex items-center gap-6 text-xs text-[#949ba4]">
            <a href="#recursos" className="hover:text-white transition-colors">
              Recursos
            </a>
            <a href="#pilares" className="hover:text-white transition-colors">
              Pilares
            </a>
            <a href="#download" className="hover:text-white transition-colors">
              Download
            </a>
            <a href="#arquitetura" className="hover:text-white transition-colors">
              Arquitetura
            </a>
            <a
              href={GITHUB_REPO}
              target="_blank"
              rel="noreferrer"
              className="hover:text-white transition-colors"
            >
              GitHub
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
