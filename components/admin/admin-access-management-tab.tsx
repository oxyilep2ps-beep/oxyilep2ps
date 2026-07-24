'use client';

import { useCallback, useEffect, useState, useTransition } from 'react';
import {
  Ban,
  CheckCircle2,
  KeyRound,
  Loader2,
  Shield,
  Trash2,
  UserPlus,
  Users,
} from 'lucide-react';
import {
  assignPlatformRole,
  deletePlatformUser,
  listBorrowers,
  listInvestors,
  listPlatformAccess,
  revokePlatformRole,
  suspendPlatformUser,
  unsuspendPlatformUser,
  type PlatformAccessRow,
  type PlatformElevatedRole,
  type PlatformUserRow,
} from '@/app/actions/admin-access';

const ROLE_OPTIONS: { value: PlatformElevatedRole; label: string }[] = [
  { value: 'ADMIN', label: 'Admin' },
  { value: 'HR', label: 'HR' },
  { value: 'BLOGGER', label: 'Blogger' },
];

type AccessTab = 'employees' | 'borrowers' | 'investors';

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

function statusBadgeClass(status: 'active' | 'suspended'): string {
  return status === 'suspended'
    ? 'bg-red-500/15 text-red-700 dark:text-red-300'
    : 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-300';
}

export function AdminAccessManagementTab() {
  const [tab, setTab] = useState<AccessTab>('employees');
  const [rows, setRows] = useState<PlatformAccessRow[]>([]);
  const [borrowers, setBorrowers] = useState<PlatformUserRow[]>([]);
  const [investors, setInvestors] = useState<PlatformUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<PlatformElevatedRole>('HR');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [revokingEmail, setRevokingEmail] = useState<string | null>(null);
  const [actingUserId, setActingUserId] = useState<string | null>(null);

  const loadEmployees = useCallback(async () => {
    setRows(await listPlatformAccess());
  }, []);

  const loadBorrowers = useCallback(async () => {
    setBorrowers(await listBorrowers());
  }, []);

  const loadInvestors = useCallback(async () => {
    setInvestors(await listInvestors());
  }, []);

  const loadActiveTab = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (tab === 'employees') await loadEmployees();
      else if (tab === 'borrowers') await loadBorrowers();
      else await loadInvestors();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load access list');
    } finally {
      setLoading(false);
    }
  }, [tab, loadEmployees, loadBorrowers, loadInvestors]);

  useEffect(() => {
    void loadActiveTab();
  }, [loadActiveTab]);

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
      await loadEmployees();
    });
  };

  const onRevoke = (row: PlatformAccessRow) => {
    setMessage(null);
    setError(null);
    setRevokingEmail(row.email);
    setRows((prev) => prev.filter((r) => r.email !== row.email));

    startTransition(async () => {
      const result = await revokePlatformRole(row.email);
      setRevokingEmail(null);
      if (!result.ok) {
        setError(result.error ?? 'Failed to revoke access');
        await loadEmployees();
        return;
      }
      setMessage(`Revoked elevated access for ${row.email}.`);
      await loadEmployees();
    });
  };

  const onSuspendToggle = (user: PlatformUserRow) => {
    setMessage(null);
    setError(null);
    setActingUserId(user.id);

    startTransition(async () => {
      const result =
        user.account_status === 'suspended'
          ? await unsuspendPlatformUser(user.id)
          : await suspendPlatformUser(user.id);
      setActingUserId(null);
      if (!result.ok) {
        setError(result.error ?? 'Failed to update account status');
        return;
      }
      setMessage(
        user.account_status === 'suspended'
          ? `Restored access for ${user.email}.`
          : `Suspended ${user.email}.`
      );
      if (tab === 'borrowers') await loadBorrowers();
      else await loadInvestors();
    });
  };

  const onDeleteUser = (user: PlatformUserRow) => {
    const confirmed = window.confirm(
      `Permanently delete ${user.full_legal_name || user.email}?\n\nThis removes their profile, KYC files, and auth account. This cannot be undone.`
    );
    if (!confirmed) return;

    setMessage(null);
    setError(null);
    setActingUserId(user.id);

    startTransition(async () => {
      const result = await deletePlatformUser(user.id);
      setActingUserId(null);
      if (!result.ok) {
        setError(result.error ?? 'Failed to delete user');
        return;
      }
      setMessage(`Deleted ${user.email} and related data.`);
      if (tab === 'borrowers') await loadBorrowers();
      else await loadInvestors();
    });
  };

  const tabs: { id: AccessTab; label: string }[] = [
    { id: 'employees', label: 'Employees (Admin/HR/Blogger)' },
    { id: 'borrowers', label: 'Borrowers' },
    { id: 'investors', label: 'Investors' },
  ];

  const platformUsers = tab === 'borrowers' ? borrowers : investors;

  return (
    <div className="w-full min-w-0 space-y-8 overflow-x-auto pb-28">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.28em] text-brand-500">Security</p>
        <h1 className="mt-1 text-2xl font-black text-neutral-950 dark:text-white">Access Management</h1>
        <p className="mt-1 max-w-2xl text-sm text-neutral-600 dark:text-neutral-300">
          Manage elevated staff access, and suspend or permanently remove borrowers and investors.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-neutral-200 pb-1 dark:border-white/10">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={`rounded-t-lg px-4 py-2 text-sm font-bold transition ${
              tab === item.id
                ? 'bg-brand-500/15 text-brand-700 dark:text-brand-300'
                : 'text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-white/5'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      ) : null}
      {message ? (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {message}
        </p>
      ) : null}

      {tab === 'employees' ? (
        <>
          <section className="glass-card rounded-2xl p-5 sm:p-6">
            <div className="mb-4 flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-500/15 text-brand-600">
                <UserPlus size={20} />
              </span>
              <div>
                <h2 className="text-lg font-bold text-neutral-950 dark:text-white">Add Access</h2>
                <p className="text-sm text-neutral-600 dark:text-neutral-300">
                  Pre-authorize or update an elevated role.
                </p>
              </div>
            </div>

            <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-[1.4fr_0.8fr_auto]">
              <label className="block">
                <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-neutral-500">
                  Email
                </span>
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
                <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-neutral-500">
                  Role
                </span>
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
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${roleBadgeClass(row.role)}`}
                          >
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
        </>
      ) : (
        <section className="glass-card overflow-hidden rounded-2xl">
          <div className="flex items-center gap-3 border-b border-white/40 px-5 py-4 dark:border-white/10">
            <Users size={18} className="text-brand-600" />
            <div>
              <h2 className="text-lg font-bold text-neutral-950 dark:text-white">
                {tab === 'borrowers' ? 'Borrowers' : 'Investors'}
              </h2>
              <p className="text-sm text-neutral-600 dark:text-neutral-300">
                Suspend access, restore accounts, or permanently delete profiles and KYC data.
              </p>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="animate-spin text-brand-500" size={28} />
            </div>
          ) : platformUsers.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-neutral-500">
              No {tab === 'borrowers' ? 'borrowers' : 'investors'} found.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-neutral-50/80 text-xs uppercase tracking-wider text-neutral-500 dark:bg-white/5">
                  <tr>
                    <th className="px-5 py-3 font-bold">User</th>
                    <th className="px-5 py-3 font-bold">KYC</th>
                    <th className="px-5 py-3 font-bold">Account</th>
                    <th className="px-5 py-3 font-bold">Joined</th>
                    <th className="px-5 py-3 font-bold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/40 dark:divide-white/10">
                  {platformUsers.map((user) => {
                    const busy = pending && actingUserId === user.id;
                    return (
                      <tr key={user.id}>
                        <td className="px-5 py-3">
                          <p className="font-semibold text-neutral-950 dark:text-white">
                            {user.full_legal_name || '—'}
                          </p>
                          <p className="text-xs text-neutral-500">{user.email}</p>
                        </td>
                        <td className="px-5 py-3 text-neutral-600 dark:text-neutral-300">{user.status}</td>
                        <td className="px-5 py-3">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold capitalize ${statusBadgeClass(user.account_status)}`}
                          >
                            {user.account_status}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-neutral-600 dark:text-neutral-300">
                          {new Date(user.created_at).toLocaleString('en-GB')}
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => onSuspendToggle(user)}
                              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold text-white transition disabled:opacity-60 ${
                                user.account_status === 'suspended'
                                  ? 'bg-emerald-600 hover:bg-emerald-500'
                                  : 'bg-amber-600 hover:bg-amber-500'
                              }`}
                            >
                              {busy ? (
                                <Loader2 className="animate-spin" size={14} />
                              ) : user.account_status === 'suspended' ? (
                                <CheckCircle2 size={14} />
                              ) : (
                                <Ban size={14} />
                              )}
                              {user.account_status === 'suspended' ? 'Unsuspend' : 'Suspend'}
                            </button>
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => onDeleteUser(user)}
                              className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-red-500 disabled:opacity-60"
                            >
                              {busy ? <Loader2 className="animate-spin" size={14} /> : <Trash2 size={14} />}
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
