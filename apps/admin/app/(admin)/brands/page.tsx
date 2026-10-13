'use client';

import { FormEvent, useState } from 'react';
import { DataTable, PageHeader } from '@/components/DataTable';
import { useApiList } from '@/hooks/useApi';
import { ApiError, api } from '@/lib/api';

export default function BrandsPage() {
  const { rows, loading, error, reload } = useApiList('/admin/platform/brands');
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [msg, setMsg] = useState<string | null>(null);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setMsg(null);
    try {
      const brand = await api<{ id: string }>('/admin/platform/brands', {
        method: 'POST',
        body: JSON.stringify({ name, slug }),
      });
      if (adminEmail && adminPassword) {
        await api(`/admin/platform/brands/${brand.id}/admins`, {
          method: 'POST',
          body: JSON.stringify({
            email: adminEmail,
            password: adminPassword,
            fullName: name + ' Admin',
          }),
        });
      }
      setName('');
      setSlug('');
      setAdminEmail('');
      setAdminPassword('');
      setMsg('Brand created');
      reload();
    } catch (err) {
      setMsg(err instanceof ApiError ? err.message : 'Failed');
    }
  }

  return (
    <div>
      <PageHeader title="Brands" description="Super Admin: create brands and Brand Admins" />
      {msg ? <div className="state-box" style={{ marginBottom: 12 }}>{msg}</div> : null}
      <form className="panel stack" onSubmit={onCreate} style={{ marginBottom: 16, maxWidth: 480 }}>
        <div className="field">
          <label>Brand name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div className="field">
          <label>Slug</label>
          <input value={slug} onChange={(e) => setSlug(e.target.value)} required />
        </div>
        <div className="field">
          <label>Brand Admin email</label>
          <input type="email" value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} />
        </div>
        <div className="field">
          <label>Brand Admin password</label>
          <input type="password" value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} minLength={8} />
        </div>
        <button className="btn btn-primary" type="submit">
          Create brand
        </button>
      </form>
      <DataTable
        loading={loading}
        error={error}
        rows={rows}
        emptyMessage="No brands."
        columns={[
          { key: 'name', header: 'Name' },
          { key: 'slug', header: 'Slug' },
          { key: 'isActive', header: 'Active' },
        ]}
      />
    </div>
  );
}
