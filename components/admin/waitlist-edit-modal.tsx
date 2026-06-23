'use client';

import { FormEvent, useEffect, useState } from 'react';
import { Loader2, X } from 'lucide-react';
import {
  updateWaitlistMember,
  type UpdateWaitlistMemberInput,
  type WaitlistRow,
} from '@/app/actions/admin-waitlist';

export type WaitlistUserType = 'investor' | 'borrower' | 'both';
export type WaitlistAdminStatus = 'pending' | 'approved' | 'rejected';

function readUserType(row: WaitlistRow): WaitlistUserType {
  const stored = row.questionnaire_answers._user_type;
  if (stored === 'both' || stored === 'investor' || stored === 'borrower') return stored;
  return row.role === 'investor' ? 'investor' : 'borrower';
}

function readStatus(row: WaitlistRow): WaitlistAdminStatus {
  const stored = row.questionnaire_answers._waitlist_status;
  if (stored === 'approved' || stored === 'rejected' || stored === 'pending') return stored;
  return 'pending';
}

type WaitlistEditModalProps = {
  row: WaitlistRow | null;
  open: boolean;
  onClose: () => void;
  onSaved: (updated: WaitlistRow) => void;
};

export function WaitlistEditModal({ row, open, onClose, onSaved }: WaitlistEditModalProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [userType, setUserType] = useState<WaitlistUserType>('borrower');
  const [status, setStatus] = useState<WaitlistAdminStatus>('pending');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!row || !open) return;
    setName(row.name);
    setEmail(row.email);
    setPhone(row.phone ?? '');
    setUserType(readUserType(row));
    setStatus(readStatus(row));
    setError(null);
  }, [row, open]);

  if (!open || !row) return null;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);

    const payload: UpdateWaitlistMemberInput = {
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim() || null,
      userType,
      status,
    };

    try {
      const updated = await updateWaitlistMember(row.id, payload);
      onSaved(updated);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save changes');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="waitlist-edit-title"
        className="glass-card w-full max-w-lg rounded-[1.75rem] border border-white/40 p-6 shadow-2xl dark:border-white/10"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-brand-500">Edit waitlist member</p>
            <h2 id="waitlist-edit-title" className="mt-1 text-xl font-black text-neutral-950 dark:text-white">
              #{row.waitlist_rank} — {row.name}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-full bg-black/10 text-neutral-700 hover:bg-black/20 dark:bg-white/10 dark:text-white"
            aria-label="Close edit dialog"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <label className="block">
            <span className="mb-2 block text-sm font-medium">Full Name</span>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-white/60 bg-white/70 px-4 py-3 text-sm dark:border-white/10 dark:bg-black/40"
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-medium">Email Address</span>
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-white/60 bg-white/70 px-4 py-3 text-sm dark:border-white/10 dark:bg-black/40"
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-medium">Phone Number</span>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full rounded-xl border border-white/60 bg-white/70 px-4 py-3 text-sm dark:border-white/10 dark:bg-black/40"
            />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-sm font-medium">User Type</span>
              <select
                value={userType}
                onChange={(e) => setUserType(e.target.value as WaitlistUserType)}
                className="w-full rounded-xl border border-white/60 bg-white/70 px-4 py-3 text-sm dark:border-white/10 dark:bg-black/40"
              >
                <option value="investor">Investor</option>
                <option value="borrower">Borrower</option>
                <option value="both">Both</option>
              </select>
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-medium">Status</span>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as WaitlistAdminStatus)}
                className="w-full rounded-xl border border-white/60 bg-white/70 px-4 py-3 text-sm dark:border-white/10 dark:bg-black/40"
              >
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </label>
          </div>

          {error ? <p className="text-sm text-red-600">{error}</p> : null}

          <div className="flex flex-wrap gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-neutral-200 px-5 py-2.5 text-sm font-semibold dark:border-white/10"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy}
              className="inline-flex items-center gap-2 rounded-full bg-brand-500 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-60"
            >
              {busy ? <Loader2 size={16} className="animate-spin" /> : null}
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function getWaitlistDisplayStatus(row: WaitlistRow): WaitlistAdminStatus {
  return readStatus(row);
}

export function getWaitlistDisplayUserType(row: WaitlistRow): string {
  const type = readUserType(row);
  return type.charAt(0).toUpperCase() + type.slice(1);
}
