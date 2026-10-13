'use client';

import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/DataTable';

const NOTE_KEY = 'oc_admin_staff_note';

export default function StaffNotePage() {
  const [note, setNote] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setNote(localStorage.getItem(NOTE_KEY) || '');
  }, []);

  function save() {
    localStorage.setItem(NOTE_KEY, note);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1500);
  }

  return (
    <div>
      <PageHeader
        title="Staff note"
        description="Local scratchpad for ops handoff (stored in this browser)"
        actions={
          <button type="button" className="btn btn-sm btn-gold" onClick={save}>
            {saved ? 'Saved' : 'Save note'}
          </button>
        }
      />
      <div className="panel">
        <div className="field">
          <label htmlFor="staff-note">Note</label>
          <textarea
            id="staff-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={12}
            placeholder="Shift notes, pending verifications, vendor follow-ups…"
          />
        </div>
      </div>
    </div>
  );
}
