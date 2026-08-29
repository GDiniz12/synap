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
const GITHUB_RELEASES = `${GITHUB_REPO}/releases/latest`;
const DEFAULT_VERSION = 'v1.0.0';

export default function LandingPage() {
  const router = useRouter();
  const [detectedOS, setDetectedOS] = useState<OSType>('unknown');
  const [appVersion, setAppVersion] = useState<string>(DEFAULT_VERSION);
  const [isDesktopClient, setIsDesktopClient] = useState<boolean>(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'graph' | 'editor' | 'canvas' | 'flashcards'>('graph');

  // Spaced repetition flashcard preview state
  const [flashcardFlipped, setFlashcardFlipped] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isDesktopApp = !!window.synapDesktop?.isDesktop;
      const token = localStorage.getItem('token');

      // If running inside Electron desktop app, immediately bypass landing page
      if (isDesktopApp) {
        setIsDesktopClient(true);
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

      // Fetch dynamic latest version tag from GitHub
      fetch('https://api.github.com/repos/GDiniz12/synap/releases/latest')
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.tag_name) {
            setAppVersion(data.tag_name);
          }
        })
        .catch(() => {});
    }
  }, [router]);

  const downloadOptions: DownloadOption[] = [
    {
      os: 'windows',
      name: 'Windows',
      badge: 'Installer (NSIS)',
      filename: `Synap-Setup-${appVersion.replace('v', '')}.exe`,
      format: '.exe (64-bit)',
      size: '~85 MB',
      recommendedFor: 'Windows 10, 11 (x64)',
      url: '/api/download?os=windows',
      instructions: 'Execute o instalador e siga o assistente na tela para concluir.',
    },
    {
      os: 'linux',
      name: 'Linux AppImage',
      badge: 'Universal Portable',
      filename: `Synap-${appVersion.replace('v', '')}.AppImage`,
      format: '.AppImage (x64)',
      size: '~90 MB',
      recommendedFor: 'Qualquer distribuição Linux moderna',
      url: '/api/download?os=linux-appimage',
      instructions: 'Torne o arquivo executável: chmod +x Synap-*.AppImage && ./Synap-*.AppImage',
    },
    {
      os: 'linux',
      name: 'Linux Debian / Ubuntu',
      badge: 'Pacote DEB',
      filename: `synap_${appVersion.replace('v', '')}_amd64.deb`,
      format: '.deb (amd64)',
      size: '~78 MB',
      recommendedFor: 'Debian, Ubuntu, Linux Mint, Pop!_OS',
      url: '/api/download?os=linux-deb',
      instructions: 'Instale via terminal: sudo dpkg -i synap_*.deb ou clique duas vezes.',
    },
    {
      os: 'mac',
      name: 'macOS',
      badge: 'Universal DMG',
      filename: `Synap-${appVersion.replace('v', '')}.dmg`,
      format: '.dmg (Universal)',
      size: '~92 MB',
      recommendedFor: 'macOS 12+ (Apple Silicon & Intel)',
      url: '/api/download?os=mac',
      instructions: 'Abra a imagem .dmg e arraste o Synap para a pasta Aplicativos.',
    },
  ];

  const primaryDownload = downloadOptions.find((d) => d.os === detectedOS) || downloadOptions[0];

  if (isDesktopClient) {
    return <div className="min-h-screen w-full bg-[var(--background)]" />;
  }

  return (
    <div className="min-h-full w-full bg-[var(--background)] text-[var(--foreground)] overflow-y-auto selection:bg-[var(--foreground)] selection:text-[var(--background)]">
      {/* Glow Effect Top Header */}
      <div className="pointer-events-none fixed top-0 left-1/2 -translate-x-1/2 w-[800px] h-[350px] bg-gradient-to-b from-[var(--accents-2)]/30 to-transparent blur-3xl -z-10 opacity-70" />

      {/* Navigation Header */}
      <header className="sticky top-0 z-50 w-full border-b border-[var(--accents-2)] bg-[var(--background)]/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          {/* Brand Logo */}
          <Link href="/" className="flex items-center gap-2 text-decoration-none group">
            <SynapLogo size={28} priority />
            <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-[var(--accents-2)] text-[var(--accents-6)] border border-[var(--accents-3)]">
              {appVersion}
            </span>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-6 text-xs text-[var(--accents-5)] font-medium">
            <a href="#recursos" className="hover:text-[var(--foreground)] transition-colors">
              Recursos
            </a>
            <a href="#pilares" className="hover:text-[var(--foreground)] transition-colors">
              Pilares
            </a>
            <a href="#download" className="hover:text-[var(--foreground)] transition-colors">
              Download
            </a>
            <a href="#arquitetura" className="hover:text-[var(--foreground)] transition-colors">
              Arquitetura
            </a>
            <a
              href={GITHUB_REPO}
              target="_blank"
              rel="noreferrer"
              className="hover:text-[var(--foreground)] transition-colors flex items-center gap-1"
            >
              <span>GitHub</span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
            </a>
          </nav>

          {/* Header Action Buttons */}
          <div className="flex items-center gap-2.5">
            {isAuthenticated ? (
              <button
                onClick={() => router.push('/dashboard')}
                className="geist-button h-9 px-4 text-xs font-medium gap-1.5"
              >
                <span>Acessar Workspace</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            ) : (
              <>
                <Link
                  href="/login"
                  className="px-3.5 py-1.5 text-xs text-[var(--accents-6)] hover:text-[var(--foreground)] transition-colors font-medium"
                >
                  Entrar
                </Link>
                <Link
                  href="/register"
                  className="hidden sm:inline-flex geist-button-secondary h-8 px-3 text-xs font-medium items-center justify-center"
                >
                  Criar Conta
                </Link>
                <a
                  href="#download"
                  className="geist-button h-8 px-3.5 text-xs font-medium flex items-center gap-1.5"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  <span>Baixar</span>
                </a>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-16 pb-20 px-4 max-w-5xl mx-auto flex flex-col items-center text-center">
        {/* Release Pill Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[var(--accents-2)] bg-[var(--accents-1)]/80 text-[11px] text-[var(--accents-6)] mb-6 shadow-sm">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-mono">{appVersion}</span>
          <span className="text-[var(--accents-4)]">•</span>
          <span>Desktop & Web App Disponíveis</span>
        </div>

        {/* Hero Title */}
        <h1 className="text-4xl sm:text-6xl font-bold tracking-tight text-[var(--foreground)] max-w-3xl leading-[1.12]">
          Conecte ideias.
          <br />
          <span className="bg-gradient-to-r from-white via-zinc-300 to-zinc-500 bg-clip-text text-transparent">
            Visualize seu conhecimento.
          </span>
        </h1>

        {/* Subtitle */}
        <p className="mt-5 text-base sm:text-lg text-[var(--accents-5)] max-w-2xl font-normal leading-relaxed">
          O ambiente unificado que combina <strong>notas em Markdown bidirecional</strong>,{' '}
          <strong>grafo neural interativo</strong>, <strong>canvas infinito</strong> e{' '}
          <strong>flashcards com repetição espaçada</strong>. Rápido, local-first e sem atritos.
        </p>

        {/* Primary CTA Buttons */}
        <div className="mt-8 flex flex-col sm:flex-row items-center gap-3.5 w-full sm:w-auto">
          {/* Detected Primary Download */}
          <a
            href={primaryDownload.url}
            className="geist-button h-11 px-6 text-sm font-semibold w-full sm:w-auto flex items-center justify-center gap-2.5 shadow-lg shadow-white/5"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            <span>
              Baixar para {detectedOS === 'windows' ? 'Windows' : detectedOS === 'linux' ? 'Linux' : detectedOS === 'mac' ? 'macOS' : 'Desktop'}
            </span>
            <span className="text-[10px] font-mono opacity-60 bg-black/30 dark:bg-white/20 px-1.5 py-0.5 rounded">
              {primaryDownload.format}
            </span>
          </a>

          {/* Web Access / Register Button */}
          <Link
            href={isAuthenticated ? '/dashboard' : '/register'}
            className="geist-button-secondary h-11 px-6 text-sm font-medium w-full sm:w-auto flex items-center justify-center gap-2"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <circle cx="12" cy="12" r="10" />
              <line x1="2" y1="12" x2="22" y2="12" />
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
            </svg>
            <span>{isAuthenticated ? 'Abrir no Navegador' : 'Começar no Navegador'}</span>
          </Link>
        </div>

        {/* Small Platform switcher reminder */}
        <p className="mt-3 text-[11px] text-[var(--accents-4)]">
          Procurando outro sistema?{' '}
          <a href="#download" className="text-[var(--accents-6)] hover:text-white underline underline-offset-2">
            Ver instaladores para Linux (.deb / AppImage), Windows e macOS
          </a>
        </p>

        {/* App Interactive Preview Mockup */}
        <div id="recursos" className="mt-14 w-full max-w-4xl scroll-mt-20">
          <div className="geist-card overflow-hidden border border-[var(--accents-2)] bg-[var(--background)] shadow-2xl rounded-xl">
            {/* Mockup Window Header */}
            <div className="h-10 bg-[var(--accents-1)] border-b border-[var(--accents-2)] px-4 flex items-center justify-between select-none">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-[var(--accents-3)]" />
                <div className="w-2.5 h-2.5 rounded-full bg-[var(--accents-3)]" />
                <div className="w-2.5 h-2.5 rounded-full bg-[var(--accents-3)]" />
                <span className="text-[11px] font-mono text-[var(--accents-5)] ml-2">Synap Studio Workspace</span>
              </div>

              {/* View Switcher Tabs inside Preview */}
              <div className="flex items-center gap-1 bg-[var(--background)] border border-[var(--accents-2)] p-0.5 rounded-md">
                <button
                  type="button"
                  onClick={() => setActiveTab('graph')}
                  className={`px-2.5 py-1 text-[11px] font-medium rounded transition-all flex items-center gap-1.5 ${
                    activeTab === 'graph'
                      ? 'bg-[var(--foreground)] text-[var(--background)]'
                      : 'text-[var(--accents-5)] hover:text-[var(--foreground)]'
                  }`}
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="6" cy="6" r="3" />
                    <circle cx="18" cy="18" r="3" />
                    <circle cx="18" cy="6" r="3" />
                    <line x1="8.5" y1="7.5" x2="15.5" y2="16.5" />
                    <line x1="8.5" y1="6" x2="15.5" y2="6" />
                  </svg>
                  <span>Grafo</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('editor')}
                  className={`px-2.5 py-1 text-[11px] font-medium rounded transition-all flex items-center gap-1.5 ${
                    activeTab === 'editor'
                      ? 'bg-[var(--foreground)] text-[var(--background)]'
                      : 'text-[var(--accents-5)] hover:text-[var(--foreground)]'
                  }`}
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                  </svg>
                  <span>Editor</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('canvas')}
                  className={`px-2.5 py-1 text-[11px] font-medium rounded transition-all flex items-center gap-1.5 ${
                    activeTab === 'canvas'
                      ? 'bg-[var(--foreground)] text-[var(--background)]'
                      : 'text-[var(--accents-5)] hover:text-[var(--foreground)]'
                  }`}
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 19l7-7 3 3-7 7-3-3z" />
                    <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
                  </svg>
                  <span>Canvas</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('flashcards')}
                  className={`px-2.5 py-1 text-[11px] font-medium rounded transition-all flex items-center gap-1.5 ${
                    activeTab === 'flashcards'
                      ? 'bg-[var(--foreground)] text-[var(--background)]'
                      : 'text-[var(--accents-5)] hover:text-[var(--foreground)]'
                  }`}
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="2" y="4" width="20" height="16" rx="2" />
                    <path d="M7 15h10" />
                    <path d="M7 9h10" />
                  </svg>
                  <span>Flashcards</span>
                </button>
              </div>
            </div>

            {/* Mockup Dynamic Content Area */}
            <div className="h-[360px] sm:h-[420px] bg-[var(--background)] relative flex text-left overflow-hidden">
              {/* TAB 1: GRAPH VIEW */}
              {activeTab === 'graph' && (
                <div className="w-full h-full p-6 flex flex-col justify-between relative bg-radial from-[var(--accents-1)] via-transparent to-transparent">
                  {/* Subtle Grid Lines */}
                  <div className="absolute inset-0 bg-[linear-gradient(to_right,var(--accents-1)_1px,transparent_1px),linear-gradient(to_bottom,var(--accents-1)_1px,transparent_1px)] bg-[size:32px_32px] opacity-40 -z-10" />

                  {/* Simulated Dynamic Nodes & Edges */}
                  <svg className="absolute inset-0 w-full h-full pointer-events-none">
                    <line x1="50%" y1="50%" x2="28%" y2="30%" stroke="var(--accents-3)" strokeWidth="1.5" strokeDasharray="3 3" />
                    <line x1="50%" y1="50%" x2="72%" y2="28%" stroke="var(--accents-3)" strokeWidth="1.5" strokeDasharray="3 3" />
                    <line x1="50%" y1="50%" x2="22%" y2="70%" stroke="var(--accents-3)" strokeWidth="1.5" strokeDasharray="3 3" />
                    <line x1="50%" y1="50%" x2="76%" y2="68%" stroke="var(--accents-3)" strokeWidth="1.5" strokeDasharray="3 3" />
                    <line x1="28%" y1="30%" x2="22%" y2="70%" stroke="var(--accents-2)" strokeWidth="1" />
                    <line x1="72%" y1="28%" x2="76%" y2="68%" stroke="var(--accents-2)" strokeWidth="1" />
                  </svg>

                  {/* Central Node */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center group cursor-pointer">
                    <div className="w-14 h-14 rounded-full bg-[var(--foreground)] text-[var(--background)] flex items-center justify-center font-bold text-xs shadow-lg shadow-white/10 transition-transform group-hover:scale-110">
                      Synap
                    </div>
                    <span className="mt-2 text-[11px] font-mono text-[var(--accents-7)] bg-[var(--accents-1)] px-2 py-0.5 rounded border border-[var(--accents-2)]">
                      Root Knowledge Node
                    </span>
                  </div>

                  {/* Satellite Nodes */}
                  <div className="absolute top-[26%] left-[24%] -translate-x-1/2 -translate-y-1/2 flex items-center gap-2 p-2 rounded-lg bg-[var(--accents-1)] border border-[var(--accents-2)] shadow">
                    <div className="w-2.5 h-2.5 rounded-full bg-blue-400" />
                    <span className="text-xs font-medium text-[var(--accents-7)]">[[Sistemas Distribuídos]]</span>
                  </div>

                  <div className="absolute top-[24%] left-[76%] -translate-x-1/2 -translate-y-1/2 flex items-center gap-2 p-2 rounded-lg bg-[var(--accents-1)] border border-[var(--accents-2)] shadow">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                    <span className="text-xs font-medium text-[var(--accents-7)]">[[Algoritmos SM-2]]</span>
                  </div>

                  <div className="absolute top-[72%] left-[18%] -translate-x-1/2 -translate-y-1/2 flex items-center gap-2 p-2 rounded-lg bg-[var(--accents-1)] border border-[var(--accents-2)] shadow">
                    <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                    <span className="text-xs font-medium text-[var(--accents-7)]">[[Arquitetura Local-First]]</span>
                  </div>

                  <div className="absolute top-[70%] left-[80%] -translate-x-1/2 -translate-y-1/2 flex items-center gap-2 p-2 rounded-lg bg-[var(--accents-1)] border border-[var(--accents-2)] shadow">
                    <div className="w-2.5 h-2.5 rounded-full bg-purple-400" />
                    <span className="text-xs font-medium text-[var(--accents-7)]">[[Neurociência & Memória]]</span>
                  </div>

                  {/* Graph overlay badge */}
                  <div className="self-end mt-auto text-[11px] text-[var(--accents-5)] bg-[var(--accents-1)]/90 backdrop-blur border border-[var(--accents-2)] px-3 py-1.5 rounded-md flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <span>Topologia viva: 48 nós conectados • 124 referências</span>
                  </div>
                </div>
              )}

              {/* TAB 2: BIDIRECTIONAL MARKDOWN EDITOR */}
              {activeTab === 'editor' && (
                <div className="w-full h-full p-6 flex flex-col justify-start bg-[var(--background)] font-mono text-xs overflow-y-auto">
                  <div className="flex items-center justify-between pb-3 border-b border-[var(--accents-2)] mb-4 font-sans">
                    <span className="text-sm font-semibold text-[var(--foreground)]">Notas/Redes-Neurais.md</span>
                    <span className="text-[11px] text-[var(--accents-4)]">Salvo automaticamente</span>
                  </div>
                  <div className="space-y-3 leading-relaxed text-[var(--accents-7)]">
                    <p className="text-lg font-bold font-sans text-white"># Teoria das Redes Neurais e Conexões</p>
                    <p>
                      O aprendizado humano fundamenta-se na formação de sinapses dinâmicas. Ao estruturar notas usando{' '}
                      <span className="text-blue-400 bg-blue-950/40 px-1 py-0.5 rounded border border-blue-800/40">
                        [[Aprendizado Espaçado]]
                      </span>{' '}
                      e{' '}
                      <span className="text-purple-400 bg-purple-950/40 px-1 py-0.5 rounded border border-purple-800/40">
                        [[Grafo de Conhecimento]]
                      </span>
                      , construímos uma segunda memória extensível.
                    </p>
                    <div className="p-3 bg-[var(--accents-1)] border border-[var(--accents-2)] rounded text-[11px] text-[var(--accents-6)]">
                      <span className="text-[var(--accents-4)]">// Backlinks detectados (2 referências):</span>
                      <br />
                      → Mencionado em <em>Arquitetura Local-First.md</em> na linha 24
                      <br />
                      → Mencionado em <em>Estudo de Algoritmos.md</em> na linha 8
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: WHITEBOARD & CANVAS */}
              {activeTab === 'canvas' && (
                <div className="w-full h-full p-6 flex flex-col justify-between bg-[var(--accents-1)]/30 relative">
                  <div className="flex items-center gap-2 absolute top-4 left-4 bg-[var(--background)] border border-[var(--accents-2)] p-1 rounded-md text-[11px]">
                    <span className="px-2 py-0.5 bg-[var(--accents-2)] text-white rounded">Pincel</span>
                    <span className="px-2 py-0.5 text-[var(--accents-5)]">Formas</span>
                    <span className="px-2 py-0.5 text-[var(--accents-5)]">Incorporar Nota</span>
                  </div>
                  <div className="my-auto flex items-center justify-center">
                    <div className="border border-dashed border-[var(--accents-3)] rounded-lg p-6 max-w-sm text-center bg-[var(--background)]">
                      <div className="w-10 h-10 mx-auto rounded-full bg-[var(--accents-1)] border border-[var(--accents-2)] flex items-center justify-center mb-3 text-[var(--foreground)]">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                          <polygon points="12 2 2 7 12 12 22 7 12 2" />
                          <polyline points="2 17 12 22 22 17" />
                          <polyline points="2 12 12 17 22 12" />
                        </svg>
                      </div>
                      <h4 className="text-xs font-semibold text-[var(--foreground)] mb-1">Canvas Vetorial Sem Fim</h4>
                      <p className="text-[11px] text-[var(--accents-5)]">
                        Rascunhe diagramas conceituais, mapas mentais livres e ancore notas completas dentro do desenho.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: SPACED REPETITION FLASHCARDS */}
              {activeTab === 'flashcards' && (
                <div className="w-full h-full p-6 flex flex-col items-center justify-center bg-[var(--background)]">
                  <div
                    onClick={() => setFlashcardFlipped(!flashcardFlipped)}
                    className="w-full max-w-md h-52 geist-card p-6 flex flex-col justify-between cursor-pointer transition-all hover:border-[var(--accents-4)] bg-[var(--accents-1)]/40 relative"
                  >
                    <div className="flex items-center justify-between text-[11px] text-[var(--accents-5)] font-mono">
                      <span>Deck: Estruturas de Dados</span>
                      <span className="px-1.5 py-0.5 rounded bg-[var(--accents-2)] text-[var(--accents-6)]">
                        {flashcardFlipped ? 'Resposta (Clique para voltar)' : 'Pergunta (Clique para virar)'}
                      </span>
                    </div>

                    <div className="my-auto text-center">
                      {!flashcardFlipped ? (
                        <p className="text-sm sm:text-base font-semibold text-[var(--foreground)]">
                          Qual é a complexidade de tempo amortizada para busca em uma Tabela Hash bem balanceada?
                        </p>
                      ) : (
                        <div className="space-y-1.5">
                          <p className="text-base font-bold text-emerald-400 font-mono">O(1) Constante</p>
                          <p className="text-xs text-[var(--accents-5)]">
                            Com função de hash uniforme e resolução eficiente de colisões.
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-[var(--accents-2)] text-[10px] text-[var(--accents-4)]">
                      <span>Algoritmo SM-2</span>
                      <span>Próxima revisão em: 4 dias</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Five Pillars Section */}
      <section id="pilares" className="py-20 px-4 max-w-6xl mx-auto border-t border-[var(--accents-2)] scroll-mt-16">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-xs uppercase font-mono tracking-wider text-[var(--accents-5)] mb-3">
            Pilares da Plataforma
          </h2>
          <p className="text-2xl sm:text-4xl font-bold text-[var(--foreground)] tracking-tight">
            Projetado para quem pensa em redes, não em gavetas.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Feature 1 */}
          <div className="geist-card p-6 flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-lg bg-[var(--accents-1)] border border-[var(--accents-2)] flex items-center justify-center mb-5 text-[var(--foreground)]">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <circle cx="6" cy="6" r="3" />
                  <circle cx="18" cy="18" r="3" />
                  <circle cx="18" cy="6" r="3" />
                  <line x1="8.5" y1="7.5" x2="15.5" y2="16.5" />
                  <line x1="8.5" y1="6" x2="15.5" y2="6" />
                </svg>
              </div>
              <h3 className="text-base font-semibold text-[var(--foreground)] mb-2">
                Grafo Neural de Conhecimento
              </h3>
              <p className="text-xs text-[var(--accents-5)] leading-relaxed">
                Descubra conexões invisíveis. O grafo do Synap mapeia interdependências, destaca clusters temáticos e
                permite navegar visualmente pelo seu segundo cérebro.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-[var(--accents-2)] text-[11px] font-mono text-[var(--accents-4)]">
              Física vetorial • Zoom infinito
            </div>
          </div>

          {/* Feature 2 */}
          <div className="geist-card p-6 flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-lg bg-[var(--accents-1)] border border-[var(--accents-2)] flex items-center justify-center mb-5 text-[var(--foreground)]">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                </svg>
              </div>
              <h3 className="text-base font-semibold text-[var(--foreground)] mb-2">
                Editor Markdown Bidirecional
              </h3>
              <p className="text-xs text-[var(--accents-5)] leading-relaxed">
                Crie referências com <code>[[nome_da_nota]]</code> em tempo real. O Synap calcula automaticamente
                backlinks cruzados para que nenhuma anotação fique isolada.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-[var(--accents-2)] text-[11px] font-mono text-[var(--accents-4)]">
              Sintaxe padrão • Autocomplete
            </div>
          </div>

          {/* Feature 3 */}
          <div className="geist-card p-6 flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-lg bg-[var(--accents-1)] border border-[var(--accents-2)] flex items-center justify-center mb-5 text-[var(--foreground)]">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M12 19l7-7 3 3-7 7-3-3z" />
                  <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
                </svg>
              </div>
              <h3 className="text-base font-semibold text-[var(--foreground)] mb-2">
                Canvas & Whiteboard Integrado
              </h3>
              <p className="text-xs text-[var(--accents-5)] leading-relaxed">
                Liberdade visual total. Combine diagramas conceituais, ilustrações à mão livre e notas inteiras
                incorporadas em uma única tela contínua.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-[var(--accents-2)] text-[11px] font-mono text-[var(--accents-4)]">
              Vetores limpos • Embeds diretos
            </div>
          </div>

          {/* Feature 4 */}
          <div className="geist-card p-6 flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-lg bg-[var(--accents-1)] border border-[var(--accents-2)] flex items-center justify-center mb-5 text-[var(--foreground)]">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <rect x="2" y="4" width="20" height="16" rx="2" />
                  <path d="M7 15h10" />
                  <path d="M7 9h10" />
                </svg>
              </div>
              <h3 className="text-base font-semibold text-[var(--foreground)] mb-2">
                Flashcards & Repetição Espaçada
              </h3>
              <p className="text-xs text-[var(--accents-5)] leading-relaxed">
                Transforme anotações em cartões de estudo com um clique. Algoritmo SuperMemo SM-2 para reter
                conhecimento a longo prazo sem sobrecarga.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-[var(--accents-2)] text-[11px] font-mono text-[var(--accents-4)]">
              Algoritmo SM-2 • Decks por pasta
            </div>
          </div>

          {/* Feature 5 */}
          <div className="geist-card p-6 flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-lg bg-[var(--accents-1)] border border-[var(--accents-2)] flex items-center justify-center mb-5 text-[var(--foreground)]">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </div>
              <h3 className="text-base font-semibold text-[var(--foreground)] mb-2">
                Colaboração & Live Cursors
              </h3>
              <p className="text-xs text-[var(--accents-5)] leading-relaxed">
                Edite workspaces em tempo real com colegas de equipe ou grupos de estudo via WebSockets com cursores
                vivos e sincronização instantânea.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-[var(--accents-2)] text-[11px] font-mono text-[var(--accents-4)]">
              WebSockets • Presença em tempo real
            </div>
          </div>

          {/* Feature 6 */}
          <div className="geist-card p-6 flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-lg bg-[var(--accents-1)] border border-[var(--accents-2)] flex items-center justify-center mb-5 text-[var(--foreground)]">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                  <line x1="8" y1="21" x2="16" y2="21" />
                  <line x1="12" y1="17" x2="12" y2="21" />
                </svg>
              </div>
              <h3 className="text-base font-semibold text-[var(--foreground)] mb-2">
                Experiência Desktop Nativa
              </h3>
              <p className="text-xs text-[var(--accents-5)] leading-relaxed">
                Desenvolvido em Electron com atalhos de sistema integrados, manipulação rápida de arquivos locais e
                suporte completo para Linux, Windows e macOS.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-[var(--accents-2)] text-[11px] font-mono text-[var(--accents-4)]">
              Local-first • Alta performance
            </div>
          </div>
        </div>
      </section>

      {/* Download Center Section */}
      <section id="download" className="py-20 px-4 max-w-6xl mx-auto border-t border-[var(--accents-2)] scroll-mt-16">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[var(--accents-2)] bg-[var(--accents-1)] text-[11px] text-[var(--accents-6)] mb-3">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            <span>Central Oficial de Downloads</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-[var(--foreground)] tracking-tight">
            Baixe o Synap para o seu sistema
          </h2>
          <p className="mt-3 text-sm text-[var(--accents-5)]">
            Escolha o pacote ideal para a sua distribuição ou use diretamente no navegador.
          </p>
        </div>

        {/* Download Grid Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-10">
          {downloadOptions.map((opt, idx) => {
            const isDetected = opt.os === detectedOS;
            return (
              <div
                key={idx}
                className={`geist-card p-6 flex flex-col justify-between relative overflow-hidden transition-all ${
                  isDetected ? 'border-[var(--foreground)] bg-[var(--accents-1)]/40 shadow-xl' : ''
                }`}
              >
                {isDetected && (
                  <div className="absolute top-3 right-3 text-[10px] font-mono uppercase bg-[var(--foreground)] text-[var(--background)] px-2 py-0.5 rounded font-semibold">
                    Recomendado para você
                  </div>
                )}

                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-9 h-9 rounded-md bg-[var(--accents-1)] border border-[var(--accents-2)] flex items-center justify-center text-[var(--foreground)]">
                      {opt.os === 'windows' && (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                          <rect x="3" y="3" width="8" height="8" />
                          <rect x="13" y="3" width="8" height="8" />
                          <rect x="3" y="13" width="8" height="8" />
                          <rect x="13" y="13" width="8" height="8" />
                        </svg>
                      )}
                      {opt.os === 'linux' && (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                          <path d="M4 17l6-6-6-6" />
                          <line x1="12" y1="19" x2="20" y2="19" />
                        </svg>
                      )}
                      {opt.os === 'mac' && (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                          <path d="M12 20.94c1.5 0 2.75 1.06 4 1.06 3 0 6-8 6-12.22A4.91 4.91 0 0 0 17 5c-2.22 0-4 1.44-5 2-1-.56-2.78-2-5-2a4.9 4.9 0 0 0-5 4.78C2 14 5 22 8 22c1.25 0 2.5-1.06 4-1.06Z" />
                          <path d="M10 2c1 .5 2 2 2 5" />
                        </svg>
                      )}
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-[var(--foreground)] leading-tight">{opt.name}</h3>
                      <span className="text-[11px] text-[var(--accents-5)]">{opt.recommendedFor}</span>
                    </div>
                  </div>

                  <div className="my-4 p-3 bg-[var(--accents-1)] border border-[var(--accents-2)] rounded font-mono text-[11px] text-[var(--accents-6)] flex items-center justify-between">
                    <span className="truncate mr-2">{opt.filename}</span>
                    <span className="text-[var(--accents-4)] whitespace-nowrap">{opt.size}</span>
                  </div>

                  <p className="text-[11px] text-[var(--accents-5)] mb-4">{opt.instructions}</p>
                </div>

                <div className="pt-3 border-t border-[var(--accents-2)] flex items-center gap-2">
                  <a
                    href={opt.url}
                    className={`h-9 px-4 text-xs font-medium rounded flex-1 flex items-center justify-center gap-2 transition-all ${
                      isDetected ? 'geist-button' : 'geist-button-secondary'
                    }`}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    <span>Baixar ({opt.format})</span>
                  </a>
                </div>
              </div>
            );
          })}
        </div>

        {/* Web App Access Callout */}
        <div className="geist-card p-6 border border-[var(--accents-2)] bg-[var(--accents-1)]/20 flex flex-col sm:flex-row items-center justify-between gap-4 rounded-xl">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-lg bg-[var(--background)] border border-[var(--accents-2)] flex items-center justify-center text-[var(--foreground)]">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <circle cx="12" cy="12" r="10" />
                <line x1="2" y1="12" x2="22" y2="12" />
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
              </svg>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-[var(--foreground)]">Não deseja instalar nada agora?</h4>
              <p className="text-xs text-[var(--accents-5)]">
                Acesse a versão Web completa com sincronização na nuvem e colaboração instantânea.
              </p>
            </div>
          </div>
          <Link
            href={isAuthenticated ? '/dashboard' : '/login'}
            className="geist-button h-9 px-5 text-xs font-medium whitespace-nowrap w-full sm:w-auto flex items-center justify-center gap-1.5"
          >
            <span>{isAuthenticated ? 'Abrir Synap Web' : 'Acessar no Navegador'}</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </Link>
        </div>

        {/* Verification & GitHub Releases Link */}
        <div className="mt-8 text-center text-xs text-[var(--accents-5)]">
          Todos os binários e códigos fontes estão disponíveis no{' '}
          <a
            href={GITHUB_RELEASES}
            target="_blank"
            rel="noreferrer"
            className="text-[var(--foreground)] hover:underline font-medium"
          >
            GitHub Releases Oficial →
          </a>
        </div>
      </section>

      {/* Architecture & Tech Specs */}
      <section id="arquitetura" className="py-20 px-4 max-w-6xl mx-auto border-t border-[var(--accents-2)] scroll-mt-16">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-center">
          <div className="lg:col-span-1">
            <h2 className="text-xs uppercase font-mono tracking-wider text-[var(--accents-5)] mb-3">
              Engenharia & Arquitetura
            </h2>
            <h3 className="text-2xl font-bold text-[var(--foreground)] tracking-tight mb-4">
              Construído para velocidade extrema.
            </h3>
            <p className="text-xs text-[var(--accents-5)] leading-relaxed mb-4">
              Synap combina o ecossistema moderno do Next.js e Tailwind CSS v4 com a robustez do PostgreSQL, Prisma e
              comunicação bidirecional contínua via WebSockets.
            </p>
            <div className="flex flex-col gap-2 font-mono text-[11px] text-[var(--accents-6)]">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span>Zero telemetria invasiva</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span>Design System Geist minimalista</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span>Controle total de seus dados</span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-5 bg-[var(--accents-1)] border border-[var(--accents-2)] rounded-lg">
              <span className="text-[10px] font-mono uppercase text-[var(--accents-4)]">Frontend Stack</span>
              <h4 className="text-sm font-semibold text-white mt-1 mb-2">Next.js App Router & React 19</h4>
              <p className="text-[11px] text-[var(--accents-5)] leading-relaxed">
                Renderização otimizada, design tokens refinados e fluidez tátil sem atrasos de interface.
              </p>
            </div>

            <div className="p-5 bg-[var(--accents-1)] border border-[var(--accents-2)] rounded-lg">
              <span className="text-[10px] font-mono uppercase text-[var(--accents-4)]">Backend & Realtime</span>
              <h4 className="text-sm font-semibold text-white mt-1 mb-2">Node.js, Express & WebSockets</h4>
              <p className="text-[11px] text-[var(--accents-5)] leading-relaxed">
                Transmissão instantânea de alterações colaborativas e cursores ao vivo entre múltiplos participantes.
              </p>
            </div>

            <div className="p-5 bg-[var(--accents-1)] border border-[var(--accents-2)] rounded-lg">
              <span className="text-[10px] font-mono uppercase text-[var(--accents-4)]">Persistência</span>
              <h4 className="text-sm font-semibold text-white mt-1 mb-2">PostgreSQL & Prisma ORM</h4>
              <p className="text-[11px] text-[var(--accents-5)] leading-relaxed">
                Integridade referencial estrita, consultas indexadas e suporte a grandes grafos de notas interligadas.
              </p>
            </div>

            <div className="p-5 bg-[var(--accents-1)] border border-[var(--accents-2)] rounded-lg">
              <span className="text-[10px] font-mono uppercase text-[var(--accents-4)]">Desktop Engine</span>
              <h4 className="text-sm font-semibold text-white mt-1 mb-2">Electron & Electron Builder</h4>
              <p className="text-[11px] text-[var(--accents-5)] leading-relaxed">
                Instaladores nativos pré-compilados com segurança de IPC e acesso eficiente ao sistema de arquivos.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="w-full border-t border-[var(--accents-2)] bg-[var(--accents-1)]/40 py-12 px-4">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <SynapLogo size={20} />
            <span className="text-[11px] text-[var(--accents-5)]">
              © {new Date().getFullYear()} Synap Team. Todos os direitos reservados.
            </span>
          </div>

          <div className="flex items-center gap-6 text-xs text-[var(--accents-5)]">
            <a href="#recursos" className="hover:text-[var(--foreground)] transition-colors">
              Recursos
            </a>
            <a href="#pilares" className="hover:text-[var(--foreground)] transition-colors">
              Pilares
            </a>
            <a href="#download" className="hover:text-[var(--foreground)] transition-colors">
              Download
            </a>
            <a
              href={GITHUB_REPO}
              target="_blank"
              rel="noreferrer"
              className="hover:text-[var(--foreground)] transition-colors"
            >
              GitHub
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

