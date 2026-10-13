'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ApiError,
  getStoredToken,
  login,
  setStoredTenant,
  setStoredToken,
} from '@/lib/api';

const DEFAULT_TENANT = process.env.NEXT_PUBLIC_TENANT_SLUG || 'demo';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('admin@demo.local');
  const [password, setPassword] = useState('admin123');
  const [tenant, setTenant] = useState(DEFAULT_TENANT);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (getStoredToken()) router.replace('/');
  }, [router]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const t = tenant.trim();
      const res = await login(email.trim(), password, t);
      setStoredToken(res.accessToken);
      if (t) setStoredTenant(t);
      router.replace(email.includes('super@') || !t ? '/brands' : '/');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        background:
          'radial-gradient(1200px 600px at 10% -10%, rgba(201,162,39,0.18), transparent), linear-gradient(160deg, #0f172a 0%, #1e293b 55%, #0f172a 100%)',
        padding: 24,
      }}
    >
      <form
        onSubmit={onSubmit}
        style={{
          width: '100%',
          maxWidth: 380,
          background: '#fff',
          border: '1px solid #e2e8f0',
          padding: 24,
          boxShadow: '0 24px 60px rgba(15,23,42,0.35)',
        }}
      >
        <div style={{ marginBottom: 18 }}>
          <div
            style={{
              fontSize: 11,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: '#c9a227',
              fontWeight: 700,
            }}
          >
            OmniCommerce
          </div>
          <h1 style={{ margin: '6px 0 0', fontSize: 22, letterSpacing: '-0.03em' }}>Admin sign in</h1>
          <p style={{ margin: '6px 0 0', color: '#64748b', fontSize: 13 }}>
            Leave tenant blank for Super Admin. Brand admins use their slug.
          </p>
        </div>

        <div className="stack">
          <div className="field">
            <label htmlFor="tenant">X-Tenant-ID</label>
            <input
              id="tenant"
              value={tenant}
              onChange={(e) => setTenant(e.target.value)}
              placeholder="demo or empty for Super Admin"
              autoComplete="organization"
            />
          </div>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="username"
            />
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              autoComplete="current-password"
            />
          </div>

          {error ? (
            <div className="state-box error" style={{ padding: 10, textAlign: 'left' }}>
              {error}
            </div>
          ) : null}

          <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%', height: 38 }}>
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </div>
      </form>
    </div>
  );
}
