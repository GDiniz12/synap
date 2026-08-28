'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import Link from 'next/link';
import SynapLogo from '@/components/SynapLogo';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    
    try {
      const data = await api('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      
      localStorage.setItem('token', data.token);
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
    <div style={{ minHeight: '100%', height: '100%', flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--accents-1)', padding: '16px' }}>
      <div className="geist-card" style={{ width: '100%', maxWidth: '400px', padding: '24px' }}>
        <div style={{ textAlign: 'center', marginBottom: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <Link href="/" style={{ textDecoration: 'none', marginBottom: '18px', display: 'inline-flex' }} className="hover:opacity-80 transition-opacity">
            <SynapLogo size={44} priority />
          </Link>
          <h1 style={{ fontSize: '22px', fontWeight: 600, letterSpacing: '-0.02em', margin: 0 }}>Entrar na conta</h1>
          <p className="geist-text-secondary" style={{ fontSize: '13px', marginTop: '6px' }}>
            Digite seus dados abaixo para acessar seus workspaces
          </p>
        </div>

        {error && (
          <div style={{ color: 'var(--error)', fontSize: '14px', marginBottom: '16px', textAlign: 'center' }}>
            {error}
          </div>
        )}
        
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '14px', fontWeight: 500, color: 'var(--accents-6)' }}>Email Address</label>
            <input 
              type="email" 
              placeholder="you@example.com" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              required 
              className="geist-input"
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '14px', fontWeight: 500, color: 'var(--accents-6)' }}>Password</label>
            <input 
              type="password" 
              placeholder="••••••••" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              required 
              className="geist-input"
            />
          </div>
          <button
            type="submit"
            disabled={isSubmitting}
            className="geist-button"
            style={{ marginTop: '8px', opacity: isSubmitting ? 0.7 : 1, cursor: isSubmitting ? 'not-allowed' : 'pointer' }}
          >
            {isSubmitting ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <svg
                  className="animate-spin"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                </svg>
                <span>Conectando...</span>
              </span>
            ) : (
              'Log In'
            )}
          </button>
        </form>
      </div>

      <p className="geist-text-secondary" style={{ marginTop: '24px', fontSize: '14px' }}>
        Don't have an account?{' '}
        <Link href="/register" style={{ color: 'var(--foreground)', textDecoration: 'none', fontWeight: 500 }}>
          Sign up
        </Link>
      </p>
    </div>
  );
}
