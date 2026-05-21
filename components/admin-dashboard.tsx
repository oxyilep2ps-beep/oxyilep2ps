'use client';

import { useCallback, useEffect, useState, useTransition } from 'react';
import { motion } from 'framer-motion';
import { Check, Loader2, ShieldAlert, X } from 'lucide-react';
import { updateUserStatusAction } from '@/app/actions/user-status';
import type { UserRecord } from '@/lib/types/user';
import { UserStatus } from '@/lib/types/user';
import { cn } from '@/lib/utils';

const STATUS_STYLES: Record<UserStatus, string> = {
  [UserStatus.PENDING]: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
  [UserStatus.APPROVED]: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
  [UserStatus.REJECTED]: 'bg-red-500/15 text-red-700 dark:text-red-300',
};

export function AdminDashboard() {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/submissions');
      const data = await res.json();
      // Log raw response for debugging
      // eslint-disable-next-line no-console
      console.log('ADMIN SUBMISSIONS RESPONSE:', data);
      const subs = data.submissions ?? [];
      subs.forEach((s: UserRecord) => {
        // eslint-disable-next-line no-console
        console.log('RAW FETCHED USER FROM DB:', s);
        // eslint-disable-next-line no-console
        console.log('PARSED KYC_DATA:', s.kyc);
        // eslint-disable-next-line no-console
        console.log('KYC_DATA_KEYS:', Object.keys((s.kyc ?? {}) as unknown as Record<string, unknown>));
      });
      setUsers(subs);
    } catch {
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const selected = users.find((u) => u.id === selectedId) ?? users[0];

  const handleStatus = (userId: string, status: UserStatus.APPROVED | UserStatus.REJECTED) => {
    startTransition(async () => {
      setMessage(null);
      const result = await updateUserStatusAction(userId, status);
      if (result.success) {
        setMessage(`User ${status.toLowerCase()} — notification email queued.`);
        await load();
      } else {
        setMessage(result.error);
      }
    });
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <p className="text-sm uppercase tracking-[0.3em] text-brand-500">Internal</p>
        <h1 className="mt-2 text-3xl font-black text-neutral-950 dark:text-white sm:text-4xl">Admin Dashboard</h1>
        <p className="mt-2 max-w-2xl text-sm text-neutral-600 dark:text-neutral-300">
          Invite/approve-only gate: review submitted KYC, then approve or reject. Status updates trigger SMTP notifications.
        </p>
      </motion.div>

      {message && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-4 rounded-xl border border-brand-200 bg-brand-500/10 px-4 py-3 text-sm text-brand-800 dark:text-brand-200"
        >
          {message}
        </motion.p>
      )}

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_1.2fr]"
      >
        <div className="glass-card max-h-[70vh] overflow-y-auto rounded-2xl p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-500">Submissions</h2>
          {loading ? (
            <div className="flex items-center justify-center py-12 text-neutral-500">
              <Loader2 className="animate-spin" size={24} />
            </div>
          ) : users.length === 0 ? (
            <p className="py-8 text-sm text-neutral-500">No submissions yet.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {users.map((u) => (
                <li key={u.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(u.id)}
                    className={cn(
                      'w-full rounded-xl px-4 py-3 text-left text-sm transition',
                      selected?.id === u.id
                        ? 'bg-brand-500/10 ring-1 ring-brand-500/30'
                        : 'hover:bg-neutral-100 dark:hover:bg-white/5'
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-neutral-950 dark:text-white">{u.fullLegalName}</span>
                      <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-bold uppercase', STATUS_STYLES[u.status])}>
                        {u.status}
                      </span>
                    </div>
                    <span className="mt-1 block text-xs text-neutral-500">{u.email}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {selected ? (
          <motion.div
            key={selected.id}
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            className="glass-card rounded-2xl p-6"
          >
            <motion.div layout className="flex flex-wrap items-start justify-between gap-4">
              <motion.div layout>
                <h2 className="text-xl font-bold text-neutral-950 dark:text-white">{selected.fullLegalName}</h2>
                <p className="text-sm text-neutral-600 dark:text-neutral-300">{selected.email}</p>
                <p className="mt-1 text-xs capitalize text-neutral-500">
                  Role: {selected.role} · Submitted {new Date(selected.submittedAt).toLocaleString('en-GB')}
                </p>
              </motion.div>
              <span className={cn('rounded-full px-3 py-1 text-xs font-bold uppercase', STATUS_STYLES[selected.status])}>
                {selected.status}
              </span>
            </motion.div>

            <motion.div layout className="mt-6 space-y-4 text-sm">
              <Section title="Basic details">
                <Kv label="Phone" value={selected.kyc.basic.ukPhone} />
                <Kv label="DOB" value={selected.kyc.basic.dateOfBirth} />
                <Kv label="Current address" value={selected.kyc.basic.currentAddress} />
                <Kv label="Address history" value={selected.kyc.basic.addressHistory3Years} />
              </Section>
              <Section title="Identity & AML">
                <Kv label="ID type" value={selected.kyc.identityMeta.proofOfIdentityType || '—'} />
                <Kv label="ID uploaded" value={selected.kyc.identityMeta.hasProofOfIdentity ? 'Yes' : 'No'} />
                <Kv label="Liveness" value={selected.kyc.identityMeta.hasLivenessVideo ? 'Yes' : 'No'} />
                <Kv label="PoA uploaded" value={selected.kyc.identityMeta.hasProofOfAddress ? 'Yes' : 'No'} />
              </Section>
              <Section title="SUBMITTED DOCUMENTS">
                <DocumentViewer kycData={selected.kyc} />
              </Section>
              {selected.kyc.lender && (
                <Section title="Lender / Investor">
                  <Kv label="Category" value={selected.kyc.lender.investorCategory} />
                  <Kv label="Source of funds" value={selected.kyc.lender.sourceOfFunds} />
                  <div className="my-3 space-y-1 text-sm border-l-2 border-brand-500 pl-3">
                    <p className="text-xs font-bold text-neutral-500 uppercase">Appropriateness Test Details:</p>
                    <ul className="space-y-1 text-neutral-800 dark:text-neutral-200">
                      <li>1. Capital at risk? <span className="font-bold text-brand-600">Yes</span></li>
                      <li>2. Not covered by FSCS? <span className="font-bold text-brand-600">Yes</span></li>
                      <li>3. Illiquid investment? <span className="font-bold text-brand-600">Yes</span></li>
                    </ul>
                  </div>
                  <Kv label="Sort code" value={selected.kyc.lender.bankSortCode} />
                  <Kv label="Account number" value={selected.kyc.lender.bankAccountNumber} />
                </Section>
              )}
              {selected.kyc.borrower && (
                <Section title="Borrower">
                  <Kv label="Purpose" value={selected.kyc.borrower.purposeOfLoan} />
                  <Kv label="Employment" value={selected.kyc.borrower.employmentStatus} />
                  <Kv label="Income" value={`£${selected.kyc.borrower.annualIncome}`} />
                  <Kv label="Credit consent" value={selected.kyc.borrower.creditCheckConsent ? 'Yes' : 'No'} />
                  <Kv label="Rent/EMI" value={`£${selected.kyc.borrower.monthlyRentOrEmi}`} />
                </Section>
              )}
            </motion.div>

            {selected.status === UserStatus.PENDING && (
              <motion.div layout className="mt-8 flex flex-wrap gap-3">
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => handleStatus(selected.id, UserStatus.APPROVED)}
                  className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-60"
                >
                  {isPending ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                  Approve
                </button>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => handleStatus(selected.id, UserStatus.REJECTED)}
                  className="inline-flex items-center gap-2 rounded-full border border-red-300 bg-red-50 px-5 py-3 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:opacity-60 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300"
                >
                  {isPending ? <Loader2 size={16} className="animate-spin" /> : <X size={16} />}
                  Reject
                </button>
              </motion.div>
            )}

            {selected.status !== UserStatus.PENDING && (
              <p className="mt-6 flex items-center gap-2 text-xs text-neutral-500">
                <ShieldAlert size={14} />
                Reviewed {selected.reviewedAt ? new Date(selected.reviewedAt).toLocaleString('en-GB') : '—'}
                {selected.reviewedBy ? ` by ${selected.reviewedBy}` : ''}
              </p>
            )}
          </motion.div>
        ) : null}
      </motion.div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-white/60 p-4 dark:border-white/10">
      <h3 className="text-xs font-bold uppercase tracking-wider text-brand-500">{title}</h3>
      <dl className="mt-2 space-y-2">{children}</dl>
    </div>
  );
}

function Kv({ label, value }: { label: string; value: string }) {
  return (
    <motion.div layout className="grid grid-cols-[120px_1fr] gap-2">
      <dt className="text-neutral-500">{label}</dt>
      <dd className="text-neutral-800 dark:text-neutral-200">{value}</dd>
    </motion.div>
  );
}

type KycIdentityMeta = {
  idProofPath?: string | null;
  livenessPath?: string | null;
  addressProofPath?: string | null;
};

function DocumentViewer({ kycData }: { kycData: { identityMeta?: KycIdentityMeta } | null | undefined }) {
  // Fallback to check if images exist, otherwise show a strict error message
  const docs = [
    { name: 'ID Proof', path: kycData?.identityMeta?.idProofPath },
    { name: 'Liveness', path: kycData?.identityMeta?.livenessPath },
    { name: 'Address Proof', path: kycData?.identityMeta?.addressProofPath }
  ].filter((doc): doc is { name: string; path: string } => Boolean(doc.path));

  if (docs.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-red-300 bg-red-50 p-4 text-center text-sm text-red-500 dark:border-red-900/50 dark:bg-red-950/20">
        No documents found in Supabase storage for this user. Ensure SignUpWizard is uploading files to the &quot;kyc-documents&quot; bucket before inserting the profile.
      </div>
    );
  }

  return (
    <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
      {docs.map((doc, idx) => {
        // Constructing public URL directly assuming bucket is public for admin or using signed URLs from backend
        const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/kyc-documents/${doc.path}`;
        return (
          <div key={idx} className="group relative aspect-video cursor-pointer overflow-hidden rounded-xl border border-neutral-200 dark:border-white/10">
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/60 opacity-0 transition-opacity group-hover:opacity-100">
              <span className="text-xs font-bold text-white">Click to View</span>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt={doc.name} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110" />
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 p-2">
              <p className="text-xs font-bold text-white">{doc.name}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default AdminDashboard;
