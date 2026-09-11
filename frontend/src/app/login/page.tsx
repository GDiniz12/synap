'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import Link from 'next/link';
import SynapLogo from '@/components/SynapLogo';

function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams.get('registered') === 'true') {
      setSuccess('Conta criada com sucesso! Entre com seus dados para continuar.');
    }
  }, [searchParams]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    
    try {
      const data = await api('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: email.trim(), password }),
      });
      
      const token = data.token;
      localStorage.setItem('token', token);

      const inviteCode = searchParams.get('inviteCode') || localStorage.getItem('pending_invite_code') || sessionStorage.getItem('pending_invite_code');

      if (inviteCode) {
        try {
          const joinResult = await api(`/workspaces/join/${inviteCode}`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` }
          });
          localStorage.removeItem('pending_invite_code');
          sessionStorage.removeItem('pending_invite_code');
          if (joinResult?.id) {
            router.push(`/workspaces/${joinResult.id}`);
            return;
          }
        } catch (joinErr) {
          console.error('Erro ao auto-ingressar no workspace:', joinErr);
        }
      }

      router.push('/dashboard');
    } catch (err: any) {
      console.error('Erro no login:', err);
      const isInvalidCredentials = err.message?.toLowerCase().includes('credential') || 
                                   err.message?.toLowerCase().includes('password') || 
                                   err.message?.toLowerCase().includes('user') || 
                                   err.message?.includes('400') || 
                                   err.message?.includes('401');
      setError(isInvalidCredentials ? 'E-mail ou senha incorretos. Verifique seus dados.' : 'Não foi possível realizar o login. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-[400px] bg-[#2b2d31] border border-[#383a40] rounded-xl shadow-2xl p-5 sm:p-6 flex flex-col animate-smooth-pop relative my-auto">
      {/* Header with Logo */}
      <div className="flex flex-col items-center text-center mb-4">
        <Link
          href="/"
          className="inline-flex items-center justify-center transition-transform hover:scale-105 mb-3"
          title="Voltar ao início"
        >
          <SynapLogo size={52} priority />
        </Link>
        <h1 className="text-xl font-bold text-white tracking-tight">
          Entrar no Synap
        </h1>
        <p className="text-[11px] text-[#949ba4] mt-0.5">
          Acesse seus workspaces e anotações interligadas
        </p>
      </div>

      {/* Success Message Banner */}
      {success && (
        <div className="p-2.5 mb-3 rounded-[4px] bg-[#23a55a]/15 border border-[#23a55a]/30 text-[#23a55a] text-xs flex items-center gap-2">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="shrink-0">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <span className="leading-tight font-medium">{success}</span>
        </div>
      )}

      {/* Error Message Box */}
      {error && (
        <div className="p-2.5 mb-3 rounded-[4px] bg-[#f23f43]/15 border border-[#f23f43]/30 text-[#f23f43] text-xs flex items-center gap-2">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span className="leading-tight font-medium">{error}</span>
        </div>
      )}

      {/* Login Form */}
      <form onSubmit={handleLogin} className="flex flex-col gap-3">
        <div>
          <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-[#949ba4] mb-1">
            E-mail ou Nome de Usuário
          </label>
          <input
            type="text"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="usuario ou email@exemplo.com"
            required
            className="w-full h-9 px-3 text-xs bg-[#1e1f22] border border-[#383a40] focus:border-[#20b8cd] rounded-[4px] outline-none text-[#dbdee1] placeholder-[#949ba4] transition-colors"
          />
        </div>

        <div>
          <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-[#949ba4] mb-1">
            Senha
          </label>
          <div className="relative flex items-center">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              required
              className="w-full h-9 pl-3 pr-9 text-xs bg-[#1e1f22] border border-[#383a40] focus:border-[#20b8cd] rounded-[4px] outline-none text-[#dbdee1] placeholder-[#949ba4] transition-colors"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-2.5 text-[#949ba4] hover:text-white transition-colors cursor-pointer"
              title={showPassword ? 'Ocultar senha' : 'Ver senha'}
            >
              {showPassword ? (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                  <line x1="1" y1="1" x2="23" y2="23" />
                </svg>
              ) : (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              )}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className={`w-full h-9 mt-1 bg-[#20b8cd] hover:bg-[#1ba2b4] text-white font-semibold rounded-[4px] text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md shadow-[#20b8cd]/20 ${
            isSubmitting ? 'opacity-60 cursor-not-allowed' : ''
          }`}
        >
          {isSubmitting ? (
            <>
              <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
              <span>Entrando...</span>
            </>
          ) : (
            <span>Entrar</span>
          )}
        </button>
      </form>

      {/* Register Link */}
      <div className="text-center text-xs text-[#949ba4] mt-3.5">
        Não tem uma conta?{' '}
        <Link 
          href={searchParams.get('inviteCode') ? `/register?inviteCode=${searchParams.get('inviteCode')}` : "/register"} 
          className="text-[#20b8cd] font-semibold hover:underline"
        >
          Cadastre-se
        </Link>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="h-full w-full bg-[#1e1f22] overflow-y-auto overflow-x-hidden selection:bg-[#20b8cd] selection:text-white relative font-sans flex flex-col items-center justify-start sm:justify-center p-4 py-8">
      {/* Subtle Synap Brand Ambient Lighting */}
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#20b8cd]/10 blur-[140px] rounded-full pointer-events-none -z-10" />

      <Suspense fallback={<div className="text-xs text-[#949ba4]">Carregando...</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
