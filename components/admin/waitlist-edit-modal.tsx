'use client';

import { FormEvent, useEffect, useState } from 'react';
import { Loader2, X } from 'lucide-react';
import { COLLATERAL_TYPES } from '@/lib/collateral/constants';
import { FIXED_INTEREST_RATE_LABEL } from '@/lib/platform/constants';
import {
  qaString,
  readWaitlistRole,
  readWaitlistStatus,
  WAITLIST_INCOME_BRACKET_OPTIONS,
  WAITLIST_INCOME_SOURCE_OPTIONS,
  WAITLIST_LOAN_REASON_OPTIONS,
  WAITLIST_STRATEGIC_FIELDS,
  type WaitlistAdminStatus,
  type WaitlistRole,
} from '@/lib/waitlist/admin-edit-fields';
import type { UpdateWaitlistMemberInput } from '@/lib/waitlist/types';
import {
  updateWaitlistMember,
  type WaitlistRow,
} from '@/app/actions/admin-waitlist';
import { cn } from '@/lib/utils';

type WaitlistEditModalProps = {
  row: WaitlistRow | null;
  open: boolean;
  onClose: () => void;
  onSaved: (updated: WaitlistRow) => void;
};

const inputClass =
  'w-full rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-brand-400 dark:border-white/10 dark:bg-black/40 dark:text-white';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="rounded-2xl border border-neutral-200/80 bg-white/50 p-4 dark:border-white/10 dark:bg-black/20">
      <legend className="px-1 text-xs font-bold uppercase tracking-wider text-brand-600 dark:text-brand-300">
        {title}
      </legend>
      <div className="mt-3 space-y-3">{children}</div>
    </fieldset>
  );
}

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <span className="mb-1.5 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
      {children}
      {required ? <span className="text-brand-500"> *</span> : null}
    </span>
  );
}

export function WaitlistEditModal({ row, open, onClose, onSaved }: WaitlistEditModalProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [role, setRole] = useState<WaitlistRole>('borrower');
  const [status, setStatus] = useState<WaitlistAdminStatus>('pending');
  const [targetAmount, setTargetAmount] = useState('');
  const [borrowerSourceOfIncome, setBorrowerSourceOfIncome] = useState('');
  const [sourceOfIncome, setSourceOfIncome] = useState('');
  const [incomeBracket, setIncomeBracket] = useState('');
  const [loanReason, setLoanReason] = useState('');
  const [strategicAnswers, setStrategicAnswers] = useState<Record<string, string>>({});
  const [collateralType, setCollateralType] = useState('');
  const [collateralValue, setCollateralValue] = useState('');
  const [collateralDescription, setCollateralDescription] = useState('');
  const [collateralProofUrl, setCollateralProofUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!row || !open) return;

    const qa = row.questionnaire_answers;
    setName(row.name);
    setEmail(row.email);
    setPhone(row.phone ?? '');
    setAddress(row.address ?? '');
    setPostalCode(row.postal_code ?? '');
    setRole(readWaitlistRole(row.role));
    setStatus(readWaitlistStatus(qa));
    setTargetAmount(String(row.target_amount ?? 0));
    setBorrowerSourceOfIncome(row.borrower_source_of_income ?? '');
    setSourceOfIncome(qaString(qa, 'Source of Income'));
    setIncomeBracket(qaString(qa, 'Estimated Annual Income/Package Bracket'));
    setLoanReason(qaString(qa, 'Primary Reason for Loan'));
    setStrategicAnswers(
      Object.fromEntries(WAITLIST_STRATEGIC_FIELDS.map((f) => [f.key, qaString(qa, f.key)]))
    );
    setCollateralType(row.collateral_type ?? '');
    setCollateralValue(String(row.collateral_value ?? 0));
    setCollateralDescription(row.collateral_description ?? '');
    setCollateralProofUrl(row.collateral_proof_url ?? '');
    setError(null);
  }, [row, open]);

  if (!open || !row) return null;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);

    const questionnaireAnswers: Record<string, string> = {
      ...strategicAnswers,
      'Source of Income':
        role === 'investor'
          ? sourceOfIncome.trim()
          : borrowerSourceOfIncome.trim() || sourceOfIncome.trim(),
    };

    if (role === 'investor' && incomeBracket.trim()) {
      questionnaireAnswers['Estimated Annual Income/Package Bracket'] = incomeBracket.trim();
    }
    if (role === 'borrower' && loanReason.trim()) {
      questionnaireAnswers['Primary Reason for Loan'] = loanReason.trim();
    }

    const payload: UpdateWaitlistMemberInput = {
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim() || null,
      address: address.trim() || null,
      postal_code: postalCode.trim() || null,
      role,
      status,
      target_amount: Number(targetAmount) || 0,
      borrower_source_of_income: role === 'borrower' ? borrowerSourceOfIncome.trim() || null : null,
      collateral_type: collateralType.trim() || null,
      collateral_value: Number(collateralValue) || 0,
      collateral_description: collateralDescription.trim() || null,
      collateral_proof_url: collateralProofUrl.trim() || null,
      questionnaire_answers: questionnaireAnswers,
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
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 px-4 py-6 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="waitlist-edit-title"
        className="glass-card flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-[1.75rem] border border-white/40 shadow-2xl dark:border-white/10"
      >
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-neutral-200/80 px-6 py-5 dark:border-white/10">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-brand-500">Edit waitlist member</p>
            <h2 id="waitlist-edit-title" className="mt-1 text-xl font-black text-neutral-950 dark:text-white">
              #{row.waitlist_rank} — {row.name}
            </h2>
            <p className="mt-1 text-xs text-neutral-500">
              Joined {new Date(row.created_at).toLocaleString('en-GB')}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-black/10 text-neutral-700 hover:bg-black/20 dark:bg-white/10 dark:text-white"
            aria-label="Close edit dialog"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
            <Section title="Personal Details">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block sm:col-span-2">
                  <FieldLabel required>Full Name</FieldLabel>
                  <input required value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
                </label>
                <label className="block sm:col-span-2">
                  <FieldLabel required>Email Address</FieldLabel>
                  <input
                    required
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={inputClass}
                  />
                </label>
                <label className="block">
                  <FieldLabel>Phone Number</FieldLabel>
                  <input value={phone} onChange={(e) => setPhone(e.target.value)} className={inputClass} />
                </label>
                <label className="block">
                  <FieldLabel>Postal Code</FieldLabel>
                  <input value={postalCode} onChange={(e) => setPostalCode(e.target.value)} className={inputClass} />
                </label>
                <label className="block sm:col-span-2">
                  <FieldLabel>Address</FieldLabel>
                  <input value={address} onChange={(e) => setAddress(e.target.value)} className={inputClass} />
                </label>
              </div>
            </Section>

            <Section title="Platform Details">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <FieldLabel required>User Type</FieldLabel>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as WaitlistRole)}
                    className={inputClass}
                  >
                    <option value="investor">Investor</option>
                    <option value="borrower">Borrower</option>
                  </select>
                </label>
                <label className="block">
                  <FieldLabel required>Status</FieldLabel>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as WaitlistAdminStatus)}
                    className={inputClass}
                  >
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </label>
                <label className="block sm:col-span-2">
                  <FieldLabel required>
                    {role === 'borrower' ? 'Requested Loan Amount (£)' : 'Intended Investment Amount (£)'}
                  </FieldLabel>
                  <input
                    required
                    type="number"
                    min="0"
                    step="1"
                    value={targetAmount}
                    onChange={(e) => setTargetAmount(e.target.value)}
                    className={inputClass}
                  />
                </label>
                <div className="sm:col-span-2 rounded-xl border border-brand-200/60 bg-brand-500/5 px-4 py-3 dark:border-brand-500/20">
                  <p className="text-xs font-bold uppercase tracking-wider text-brand-600">Interest Rate</p>
                  <p className="mt-1 text-sm font-semibold text-neutral-800 dark:text-neutral-200">
                    {FIXED_INTEREST_RATE_LABEL}
                  </p>
                  <p className="mt-1 text-xs text-neutral-500">Platform-wide fixed rate — not editable per member.</p>
                </div>
              </div>
            </Section>

            <Section title="Financial Profiling">
              {role === 'investor' ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block sm:col-span-2">
                    <FieldLabel>Source of Income</FieldLabel>
                    <select value={sourceOfIncome} onChange={(e) => setSourceOfIncome(e.target.value)} className={inputClass}>
                      <option value="">Select source</option>
                      {WAITLIST_INCOME_SOURCE_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block sm:col-span-2">
                    <FieldLabel>Estimated Annual Income / Package Bracket</FieldLabel>
                    <select value={incomeBracket} onChange={(e) => setIncomeBracket(e.target.value)} className={inputClass}>
                      <option value="">Select bracket</option>
                      {WAITLIST_INCOME_BRACKET_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block sm:col-span-2">
                    <FieldLabel>Borrower Source of Income</FieldLabel>
                    <select
                      value={borrowerSourceOfIncome}
                      onChange={(e) => setBorrowerSourceOfIncome(e.target.value)}
                      className={inputClass}
                    >
                      <option value="">Select source</option>
                      {WAITLIST_INCOME_SOURCE_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block sm:col-span-2">
                    <FieldLabel>Primary Reason for Loan</FieldLabel>
                    <select value={loanReason} onChange={(e) => setLoanReason(e.target.value)} className={inputClass}>
                      <option value="">Select reason</option>
                      {WAITLIST_LOAN_REASON_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              )}
            </Section>

            <Section title="Strategic Questions">
              <div className="space-y-3">
                {WAITLIST_STRATEGIC_FIELDS.map((field) => (
                  <label key={field.key} className="block">
                    <FieldLabel>{field.label}</FieldLabel>
                    <select
                      value={strategicAnswers[field.key] ?? ''}
                      onChange={(e) =>
                        setStrategicAnswers((prev) => ({ ...prev, [field.key]: e.target.value }))
                      }
                      className={inputClass}
                    >
                      <option value="">Not answered</option>
                      <option value="Yes">Yes</option>
                      <option value="No">No</option>
                    </select>
                  </label>
                ))}
              </div>
            </Section>

            <Section title="Collateral (if applicable)">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block sm:col-span-2">
                  <FieldLabel>Collateral Type</FieldLabel>
                  <select value={collateralType} onChange={(e) => setCollateralType(e.target.value)} className={inputClass}>
                    <option value="">None</option>
                    {COLLATERAL_TYPES.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <FieldLabel>Estimated Collateral Value (£)</FieldLabel>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={collateralValue}
                    onChange={(e) => setCollateralValue(e.target.value)}
                    className={inputClass}
                  />
                </label>
                <label className="block sm:col-span-2">
                  <FieldLabel>Collateral Description</FieldLabel>
                  <textarea
                    rows={3}
                    value={collateralDescription}
                    onChange={(e) => setCollateralDescription(e.target.value)}
                    className={cn(inputClass, 'resize-y')}
                  />
                </label>
                <label className="block sm:col-span-2">
                  <FieldLabel>Collateral Proof Storage Path</FieldLabel>
                  <input
                    value={collateralProofUrl}
                    onChange={(e) => setCollateralProofUrl(e.target.value)}
                    placeholder="e.g. user-id/collateral-proof-..."
                    className={inputClass}
                  />
                  <p className="mt-1 text-xs text-neutral-500">Supabase storage path in collateral_documents bucket.</p>
                </label>
              </div>
            </Section>

            {error ? <p className="text-sm text-red-600">{error}</p> : null}
          </div>

          <div className="flex shrink-0 flex-wrap gap-3 border-t border-neutral-200/80 bg-white/60 px-6 py-4 dark:border-white/10 dark:bg-black/30">
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
              className="inline-flex items-center gap-2 rounded-full bg-brand-500 px-6 py-2.5 text-sm font-bold text-white shadow-glow disabled:opacity-60"
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
  return readWaitlistStatus(row.questionnaire_answers);
}

export function getWaitlistDisplayUserType(row: WaitlistRow): string {
  return readWaitlistRole(row.role) === 'investor' ? 'Investor' : 'Borrower';
}
