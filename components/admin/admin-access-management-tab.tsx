'use client';

import { useCallback, useEffect, useState, useTransition } from 'react';
import { KeyRound, Loader2, Shield, Trash2, UserPlus } from 'lucide-react';
import {
  assignPlatformRole,
  listPlatformAccess,
  revokePlatformRole,
  type PlatformAccessRow,
  type PlatformElevatedRole,
} from '@/app/actions/admin-access';

const ROLE_OPTIONS: { value: PlatformElevatedRole; label: string }[] = [
  { value: 'ADMIN', label: 'Admin' },
  { value: 'HR', label: 'HR' },
  { value: 'BLOGGER', label: 'Blogger' },
];

function roleBadgeClass(role: PlatformElevatedRole): string {
  switch (role) {
    case 'ADMIN':
      return 'bg-brand-500/15 text-brand-700 dark:text-brand-300';
    case 'HR':
      return 'bg-sky-500/15 text-sky-800 dark:text-sky-300';
    case 'BLOGGER':
      return 'bg-violet-500/15 text-violet-800 dark:text-violet-300';
    default:
      return 'bg-neutral-200 text-neutral-700';
  }
}

export function AdminAccessManagementTab() {
  const [rows, setRows] = useState<PlatformAccessRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<PlatformElevatedRole>('HR');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [revokingEmail, setRevokingEmail] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setRows(await listPlatformAccess());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load access list');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setError(null);

    startTransition(async () => {
      const result = await assignPlatformRole(email, role);
      if (!result.ok) {
        setError(result.error ?? 'Failed to assign access');
        return;
      }
      setMessage(`Granted ${role} access to ${email.trim().toLowerCase()}.`);
      setEmail('');
      await load();
    });
  };

  const onRevoke = (row: PlatformAccessRow) => {
    setMessage(null);
    setError(null);
    setRevokingEmail(row.email);

    // Optimistic removal
    setRows((prev) => prev.filter((r) => r.email !== row.email));

    startTransition(async () => {
      const result = await revokePlatformRole(row.email);
      setRevokingEmail(null);
      if (!result.ok) {
        setError(result.error ?? 'Failed to revoke access');
        await load();
        return;
      }
      setMessage(`Revoked elevated access for ${row.email}.`);
      await load();
    });
  };

  return (
    <div className="w-full min-w-0 space-y-8 overflow-x-auto pb-28">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.28em] text-brand-500">Security</p>
        <h1 className="mt-1 text-2xl font-black text-neutral-950 dark:text-white">Access Management</h1>
        <p className="mt-1 max-w-2xl text-sm text-neutral-600 dark:text-neutral-300">
          Grant Admin, HR, or Blogger access by email. If the person has not signed up yet, they receive the role
          automatically on first login.
        </p>
      </div>

      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      ) : null}
      {message ? (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{message}</p>
      ) : null}

      <section className="glass-card rounded-2xl p-5 sm:p-6">
        <div className="mb-4 flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-500/15 text-brand-600">
            <UserPlus size={20} />
          </span>
          <div>
            <h2 className="text-lg font-bold text-neutral-950 dark:text-white">Add Access</h2>
            <p className="text-sm text-neutral-600 dark:text-neutral-300">Pre-authorize or update an elevated role.</p>
          </div>
        </div>

        <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-[1.4fr_0.8fr_auto]">
          <label className="block">
            <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-neutral-500">Email</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="colleague@oxyile.com"
              className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm outline-none ring-brand-500/30 focus:ring-2 dark:border-white/10 dark:bg-neutral-950"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-neutral-500">Role</span>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as PlatformElevatedRole)}
              className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm outline-none ring-brand-500/30 focus:ring-2 dark:border-white/10 dark:bg-neutral-950"
            >
              {ROLE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>

          <div className="flex items-end">
            <button
              type="submit"
              disabled={pending}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-brand-500 disabled:opacity-60 sm:w-auto"
            >
              {pending ? <Loader2 className="animate-spin" size={16} /> : <KeyRound size={16} />}
              Grant Access
            </button>
          </div>
        </form>
      </section>

      <section className="glass-card overflow-hidden rounded-2xl">
        <div className="flex items-center gap-3 border-b border-white/40 px-5 py-4 dark:border-white/10">
          <Shield size={18} className="text-brand-600" />
          <div>
            <h2 className="text-lg font-bold text-neutral-950 dark:text-white">Elevated Access</h2>
            <p className="text-sm text-neutral-600 dark:text-neutral-300">
              Users with Admin, HR, or Blogger privileges.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="animate-spin text-brand-500" size={28} />
          </div>
        ) : rows.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-neutral-500">No elevated access grants yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-neutral-50/80 text-xs uppercase tracking-wider text-neutral-500 dark:bg-white/5">
                <tr>
                  <th className="px-5 py-3 font-bold">Email</th>
                  <th className="px-5 py-3 font-bold">Current Role</th>
                  <th className="px-5 py-3 font-bold">Date Added</th>
                  <th className="px-5 py-3 font-bold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/40 dark:divide-white/10">
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td className="px-5 py-3">
                      <p className="font-semibold text-neutral-950 dark:text-white">{row.email}</p>
                      <p className="text-xs text-neutral-500">
                        {row.has_account ? 'Account linked' : 'Pre-authorized (pending signup)'}
                      </p>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${roleBadgeClass(row.role)}`}>
                        {row.role}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-neutral-600 dark:text-neutral-300">
                      {new Date(row.created_at).toLocaleString('en-GB')}
                    </td>
                    <td className="px-5 py-3">
                      <button
                        type="button"
                        disabled={pending && revokingEmail === row.email}
                        onClick={() => onRevoke(row)}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-red-500 disabled:opacity-60"
                      >
                        {pending && revokingEmail === row.email ? (
                          <Loader2 className="animate-spin" size={14} />
                        ) : (
                          <Trash2 size={14} />
                        )}
                        Revoke Access
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
