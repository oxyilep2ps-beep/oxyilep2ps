'use client';

import { useEffect, useState, useTransition } from 'react';
import {
  Check,
  ExternalLink,
  FileText,
  Loader2,
  ShieldCheck,
  UserRound,
  X,
} from 'lucide-react';
import {
  approveRoleUpgrade,
  getRoleUpgradeDocumentUrls,
  listPendingRoleUpgradeRequests,
  rejectRoleUpgrade,
  type RoleUpgradeRequestRow,
} from '@/app/actions/role-upgrades';
import { cn } from '@/lib/utils';

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}

export function AdminVerificationsPanel() {
  const [rows, setRows] = useState<RoleUpgradeRequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [docUrls, setDocUrls] = useState<Record<string, Record<string, string | null>>>({});
  const [docsOpenId, setDocsOpenId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const refresh = async () => {
    setLoading(true);
    setError(null);
    try {
      setRows(await listPendingRoleUpgradeRequests());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load verifications.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  const viewDocuments = (row: RoleUpgradeRequestRow) => {
    setBusyId(row.id);
    startTransition(async () => {
      const result = await getRoleUpgradeDocumentUrls(row.id);
      setBusyId(null);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setDocUrls((prev) => ({ ...prev, [row.id]: result.urls }));
      setDocsOpenId(row.id);
    });
  };

  const approve = (row: RoleUpgradeRequestRow) => {
    setBusyId(row.id);
    startTransition(async () => {
      const result = await approveRoleUpgrade(row.id, row.user_id, row.requested_role);
      setBusyId(null);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setRows((prev) => prev.filter((r) => r.id !== row.id));
      setDocsOpenId(null);
    });
  };

  const reject = (row: RoleUpgradeRequestRow) => {
    setBusyId(row.id);
    startTransition(async () => {
      const result = await rejectRoleUpgrade(row.id, row.user_id);
      setBusyId(null);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setRows((prev) => prev.filter((r) => r.id !== row.id));
      setDocsOpenId(null);
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={22} className="animate-spin text-[#F97316]" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.28em] text-[#F97316]">Compliance</p>
        <h1 className="mt-1 text-2xl font-black text-white">Role Verifications</h1>
        <p className="mt-1 text-sm text-neutral-400">
          Review KYC documents for financial role upgrades (e.g. Borrower → Investor).
        </p>
      </div>

      {error ? (
        <p className="rounded-xl border border-[#F97316]/35 bg-[#F97316]/10 px-3 py-2 text-sm font-semibold text-[#F97316]">
          {error}
        </p>
      ) : null}

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-neutral-800 py-16 text-center">
          <ShieldCheck size={28} className="mx-auto mb-3 text-neutral-600" />
          <p className="text-sm font-semibold text-neutral-300">No pending upgrade requests</p>
          <p className="mt-1 text-xs text-neutral-500">New investor upgrades will appear here for review.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {rows.map((row) => {
            const name = row.full_legal_name || 'Member';
            const busy = busyId === row.id;
            const urls = docUrls[row.id];
            const docsOpen = docsOpenId === row.id;

            return (
              <article
                key={row.id}
                className="overflow-hidden rounded-2xl border border-neutral-800 bg-[#111] shadow-lg"
              >
                <div className="flex flex-wrap items-start gap-3 border-b border-neutral-800 px-4 py-4">
                  <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-[#F97316]/15 text-sm font-bold text-[#F97316]">
                    {row.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={row.avatar_url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      initials(name)
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-white">{name}</p>
                    <p className="truncate text-xs text-neutral-400">{row.email || 'No email'}</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <span className="rounded-full bg-[#F97316]/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#F97316]">
                        → {row.requested_role}
                      </span>
                      {row.system_role ? (
                        <span className="rounded-full border border-neutral-700 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                          {row.system_role}
                        </span>
                      ) : null}
                      <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-300">
                        pending
                      </span>
                    </div>
                  </div>
                  <p className="text-[11px] text-neutral-500">
                    {new Date(row.created_at).toLocaleString('en-GB', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>

                {docsOpen ? (
                  <div className="space-y-2 border-b border-neutral-800 bg-black/40 px-4 py-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Documents</p>
                    {(['proofOfIdentity', 'proofOfAddress', 'livenessVideo'] as const).map((key) => {
                      const href = urls?.[key];
                      const label =
                        key === 'proofOfIdentity'
                          ? 'Proof of Identity'
                          : key === 'proofOfAddress'
                            ? 'Proof of Address'
                            : 'Liveness';
                      return (
                        <div
                          key={key}
                          className="flex items-center justify-between gap-2 rounded-xl border border-neutral-800 px-3 py-2"
                        >
                          <span className="flex items-center gap-2 text-xs text-neutral-300">
                            <FileText size={13} className="text-[#F97316]" />
                            {label}
                            {row.documents.proofOfIdentityType && key === 'proofOfIdentity' ? (
                              <span className="text-neutral-500">({row.documents.proofOfIdentityType})</span>
                            ) : null}
                          </span>
                          {href ? (
                            <a
                              href={href}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] font-bold text-[#F97316] hover:underline"
                            >
                              Open <ExternalLink size={11} />
                            </a>
                          ) : (
                            <span className="text-[11px] text-neutral-600">Unavailable</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : null}

                <div className="flex flex-wrap items-center gap-2 px-4 py-3">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => viewDocuments(row)}
                    className="inline-flex items-center gap-1.5 rounded-full border border-neutral-700 px-3 py-1.5 text-[11px] font-bold text-neutral-300 transition hover:border-[#F97316]/40 hover:text-[#F97316] disabled:opacity-60"
                  >
                    {busy && docsOpenId !== row.id ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      <UserRound size={12} />
                    )}
                    View Documents
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => approve(row)}
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-full bg-[#F97316] px-3 py-1.5 text-[11px] font-bold text-white transition hover:bg-[#ea580c] disabled:opacity-60'
                    )}
                  >
                    {busy ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                    Approve
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => reject(row)}
                    className="inline-flex items-center gap-1.5 rounded-full border border-red-500/40 bg-red-500/10 px-3 py-1.5 text-[11px] font-bold text-red-300 transition hover:bg-red-500/20 disabled:opacity-60"
                  >
                    <X size={12} />
                    Reject
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
