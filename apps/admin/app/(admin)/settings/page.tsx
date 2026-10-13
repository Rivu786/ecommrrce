'use client';

import { FormEvent, useEffect, useState } from 'react';
import { PageHeader } from '@/components/DataTable';
import { useApiData } from '@/hooks/useApi';
import { ApiError, api, cell } from '@/lib/api';

export default function SettingsPage() {
  const { data, loading, error, reload } = useApiData<Record<string, unknown>>('/admin/settings');
  const [form, setForm] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (!data || typeof data !== 'object') return;
    const next: Record<string, string> = {};
    for (const [key, value] of Object.entries(data)) {
      if (value == null || typeof value === 'object') continue;
      next[key] = String(value);
    }
    setForm(next);
  }, [data]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    setSaveError(null);
    try {
      await api('/admin/settings', {
        method: 'PATCH',
        body: JSON.stringify(form),
      });
      setMessage('Settings saved.');
      reload();
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.message : 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  }

  const entries = Object.entries(form);

  return (
    <div>
      <PageHeader
        title="Settings"
        description="Tenant payment and store configuration"
        actions={
          <button type="button" className="btn btn-sm" onClick={reload}>
            Refresh
          </button>
        }
      />

      {loading ? <div className="state-box">Loading…</div> : null}
      {error ? <div className="state-box error">{error}</div> : null}
      {saveError ? <div className="state-box error" style={{ marginBottom: 12 }}>{saveError}</div> : null}
      {message ? (
        <div className="state-box" style={{ marginBottom: 12, color: 'var(--success)' }}>
          {message}
        </div>
      ) : null}

      {!loading && !error ? (
        <form onSubmit={onSubmit} className="panel stack">
          <h2>Tenant settings</h2>
          {entries.length === 0 ? (
            <div className="state-box">No editable settings returned by the API.</div>
          ) : (
            entries.map(([key, value]) => (
              <div className="field" key={key}>
                <label htmlFor={key}>{key}</label>
                <input
                  id={key}
                  value={value}
                  onChange={(e) => setForm((prev) => ({ ...prev, [key]: e.target.value }))}
                />
              </div>
            ))
          )}
          {data && typeof data === 'object'
            ? Object.entries(data)
                .filter(([, v]) => v != null && typeof v === 'object')
                .map(([key, value]) => (
                  <div key={key} className="field">
                    <label>{key}</label>
                    <div style={{ fontFamily: 'ui-monospace, monospace', fontSize: 12, color: 'var(--text-muted)' }}>
                      {cell(value)}
                    </div>
                  </div>
                ))
            : null}
          <div className="row">
            <button type="submit" className="btn btn-primary" disabled={saving || entries.length === 0}>
              {saving ? 'Saving…' : 'Save settings'}
            </button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
