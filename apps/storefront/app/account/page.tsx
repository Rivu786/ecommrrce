'use client';

import { useEffect, useState } from 'react';
import {
  clearAuthTokens,
  getAuthToken,
  setAuthTokens,
  storeApi,
} from '@/lib/api';

type OrderRow = {
  id: string;
  orderNumber?: string;
  status?: string;
  grandTotal?: number | string;
  currencyCode?: string;
  createdAt?: string;
};

function money(n: number | string | undefined, currency = 'INR') {
  const value = typeof n === 'string' ? Number(n) : n ?? 0;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

export default function AccountPage() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [token, setToken] = useState<string | null>(null);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const existing = getAuthToken();
    setToken(existing);
    if (existing) {
      void loadOrders(existing);
    }
  }, []);

  async function loadOrders(accessToken: string) {
    try {
      const data = await storeApi.myOrders(accessToken);
      setOrders(Array.isArray(data) ? (data as OrderRow[]) : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load orders');
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setStatus(null);
    try {
      const res =
        mode === 'login'
          ? await storeApi.login(email, password)
          : await storeApi.register({ email, password, fullName, phone: phone || undefined });
      setAuthTokens(res.accessToken, res.refreshToken);
      setToken(res.accessToken);
      setStatus(mode === 'login' ? 'Signed in.' : 'Account created.');
      await loadOrders(res.accessToken);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Auth failed');
    } finally {
      setBusy(false);
    }
  }

  function signOut() {
    clearAuthTokens();
    setToken(null);
    setOrders([]);
    setStatus('Signed out.');
  }

  return (
    <div className="shell section">
      <h1 className="page-title">Account</h1>
      <p className="section-sub">Login, register, and review your orders.</p>

      {error && <p className="error">{error}</p>}
      {status && <p className="ok">{status}</p>}

      {!token ? (
        <div className="panel stack" style={{ maxWidth: 460 }}>
          <div className="cta-row">
            <button
              type="button"
              className={`btn ${mode === 'login' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setMode('login')}
            >
              Login
            </button>
            <button
              type="button"
              className={`btn ${mode === 'register' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setMode('register')}
            >
              Register
            </button>
          </div>
          <form className="stack" onSubmit={(e) => void onSubmit(e)}>
            {mode === 'register' && (
              <>
                <div className="field">
                  <label htmlFor="fullName">Full name</label>
                  <input
                    id="fullName"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                  />
                </div>
                <div className="field">
                  <label htmlFor="phone">Phone</label>
                  <input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
                </div>
              </>
            )}
            <div className="field">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <button className="btn btn-primary" type="submit" disabled={busy}>
              {busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}
            </button>
          </form>
        </div>
      ) : (
        <div className="split split-2">
          <div className="panel stack">
            <h2 style={{ margin: 0, fontFamily: 'var(--font-display)' }}>Signed in</h2>
            <p className="muted" style={{ margin: 0 }}>
              Bearer session active for tenant <code>demo</code>.
            </p>
            <button className="btn btn-ghost" type="button" onClick={signOut} style={{ width: 'fit-content' }}>
              Sign out
            </button>
          </div>
          <div className="panel stack">
            <h2 style={{ margin: 0, fontFamily: 'var(--font-display)' }}>Orders</h2>
            {orders.length === 0 ? (
              <p className="muted" style={{ margin: 0 }}>
                No orders yet.
              </p>
            ) : (
              orders.map((order) => (
                <div key={order.id} className="row" style={{ borderBottom: '1px solid rgba(154,168,192,0.12)', paddingBottom: '0.65rem' }}>
                  <div>
                    <strong>{order.orderNumber || order.id}</strong>
                    <div className="muted" style={{ fontSize: '0.85rem' }}>
                      {order.status}
                    </div>
                  </div>
                  <strong>{money(order.grandTotal, order.currencyCode || 'INR')}</strong>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
