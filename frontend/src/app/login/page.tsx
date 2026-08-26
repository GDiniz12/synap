'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import Link from 'next/link';

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
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--accents-1)' }}>
      <div className="geist-card" style={{ width: '100%', maxWidth: '400px', padding: '24px' }}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 600, letterSpacing: '-0.02em', margin: 0 }}>Log in to Synap</h1>
          <p className="geist-text-secondary" style={{ fontSize: '14px', marginTop: '8px' }}>
            Enter your details below to access your workspace
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
