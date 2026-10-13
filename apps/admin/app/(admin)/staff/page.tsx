'use client';

import { FormEvent, useEffect, useState } from 'react';
import { DataTable, PageHeader } from '@/components/DataTable';
import { useApiList } from '@/hooks/useApi';
import { ApiError, api } from '@/lib/api';

const ALL_KEYS = [
  'catalog.products.read',
  'catalog.products.write',
  'inventory.adjust',
  'orders.read',
  'orders.write',
  'orders.refund',
  'pos.charge_cash',
  'pos.receipt_only',
  'payments.verify_qr',
  'analytics.view',
  'staff.manage',
  'delivery.dispatch',
  'vendors.manage',
  'billing.invoice',
  'billing.receipt',
  'cms.write',
  'marketing.write',
  'settings.write',
];

type Role = { id: string; name: string; keysJson?: string[] };

export default function StaffPage() {
  const { rows, loading, error, reload } = useApiList('/admin/staff');
  const [roles, setRoles] = useState<Role[]>([]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [tenantRoleId, setTenantRoleId] = useState('');
  const [roleName, setRoleName] = useState('');
  const [keys, setKeys] = useState<string[]>(['orders.read', 'catalog.products.read']);
  const [msg, setMsg] = useState<string | null>(null);

  async function loadRoles() {
    const data = await api<Role[]>('/admin/staff/roles');
    setRoles(data || []);
    if (!tenantRoleId && data?.[0]) setTenantRoleId(data[0].id);
  }

  useEffect(() => {
    void loadRoles().catch(() => undefined);
  }, []);

  function toggleKey(k: string) {
    setKeys((prev) => (prev.includes(k) ? prev.filter((x) => x !== k) : [...prev, k]));
  }

  async function onCreateStaff(e: FormEvent) {
    e.preventDefault();
    try {
      await api('/admin/staff', {
        method: 'POST',
        body: JSON.stringify({
          email,
          password,
          fullName,
          roleCode: 'STORE_MANAGER',
          tenantRoleId: tenantRoleId || undefined,
        }),
      });
      setEmail('');
      setPassword('');
      setFullName('');
      setMsg('Staff created');
      reload();
    } catch (err) {
      setMsg(err instanceof ApiError ? err.message : 'Failed');
    }
  }

  async function onCreateRole(e: FormEvent) {
    e.preventDefault();
    try {
      await api('/admin/staff/roles', {
        method: 'POST',
        body: JSON.stringify({ name: roleName, keys }),
      });
      setRoleName('');
      setMsg('Role created (subset of brand pack)');
      await loadRoles();
    } catch (err) {
      setMsg(err instanceof ApiError ? err.message : 'Role failed');
    }
  }

  return (
    <div>
      <PageHeader title="Staff & roles" description="Brand Admin creates staff within the permission pack" />
      {msg ? <div className="state-box" style={{ marginBottom: 12 }}>{msg}</div> : null}

      <div className="row" style={{ gap: 16, alignItems: 'flex-start', flexWrap: 'wrap', marginBottom: 16 }}>
        <form className="panel stack" onSubmit={onCreateStaff} style={{ maxWidth: 440 }}>
          <h2>Add staff</h2>
          <div className="field">
            <label>Name</label>
            <input value={fullName} onChange={(e) => setFullName(e.target.value)} required />
          </div>
          <div className="field">
            <label>Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="field">
            <label>Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} required />
          </div>
          <div className="field">
            <label>Custom role</label>
            <select value={tenantRoleId} onChange={(e) => setTenantRoleId(e.target.value)}>
              <option value="">None</option>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          </div>
          <button className="btn btn-primary" type="submit">
            Add staff
          </button>
        </form>

        <form className="panel stack" onSubmit={onCreateRole} style={{ maxWidth: 520, flex: 1 }}>
          <h2>Permission matrix (new role)</h2>
          <div className="field">
            <label>Role name</label>
            <input value={roleName} onChange={(e) => setRoleName(e.target.value)} required />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, maxHeight: 280, overflow: 'auto' }}>
            {ALL_KEYS.map((k) => (
              <label key={k} style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 12 }}>
                <input type="checkbox" checked={keys.includes(k)} onChange={() => toggleKey(k)} />
                {k}
              </label>
            ))}
          </div>
          <button className="btn btn-gold" type="submit">
            Create role
          </button>
        </form>
      </div>

      {roles.length ? (
        <div className="panel" style={{ marginBottom: 16 }}>
          <h2>Roles</h2>
          <ul className="stack">
            {roles.map((r) => (
              <li key={r.id}>
                <strong>{r.name}</strong> — {((r.keysJson as string[]) || []).join(', ') || 'no keys'}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <DataTable
        loading={loading}
        error={error}
        rows={rows}
        emptyMessage="No staff."
        columns={[
          { key: 'fullName', header: 'Name' },
          { key: 'email', header: 'Email' },
          { key: 'isActive', header: 'Active' },
        ]}
      />
    </div>
  );
}
