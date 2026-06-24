'use client';

import { FormEvent, useState } from 'react';
import { Building2, Loader2, Lock } from 'lucide-react';

type GoCardlessSandboxFormProps = {
  amountGbp: number;
  reference: string;
  disabled?: boolean;
  onAuthorize: () => Promise<void>;
};

const inputClass =
  'w-full rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-brand-400 dark:border-white/10 dark:bg-black/40 dark:text-white';

export function GoCardlessSandboxForm({
  amountGbp,
  reference,
  disabled,
  onAuthorize,
}: GoCardlessSandboxFormProps) {
  const [accountHolder, setAccountHolder] = useState('');
  const [sortCode, setSortCode] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!accountHolder.trim() || sortCode.replace(/\D/g, '').length < 6 || accountNumber.replace(/\D/g, '').length < 8) {
      return;
    }
    setBusy(true);
    try {
      await onAuthorize();
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={(e) => void onSubmit(e)} className="space-y-4">
      <div className="flex items-center justify-between gap-3 rounded-xl border border-neutral-200/80 bg-neutral-50 px-4 py-3 dark:border-white/10 dark:bg-white/5">
        <div className="flex items-center gap-2">
          <Building2 size={18} className="text-[#1F2A44]" />
          <div>
            <p className="text-xs font-bold text-neutral-800 dark:text-neutral-200">GoCardless</p>
            <p className="text-[10px] text-neutral-500">Sandbox · Direct Debit</p>
          </div>
        </div>
        <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-amber-800 dark:bg-amber-950/50 dark:text-amber-200">
          Test Mode
        </span>
      </div>

      <div className="rounded-xl border border-neutral-200/60 bg-white p-4 dark:border-white/10 dark:bg-black/20">
        <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Payment reference</p>
        <p className="mt-1 font-mono text-sm font-semibold">{reference}</p>
        <p className="mt-3 text-[10px] font-bold uppercase tracking-wider text-neutral-500">Amount</p>
        <p className="mt-1 text-xl font-black text-neutral-900 dark:text-white">
          £{amountGbp.toLocaleString('en-GB', { minimumFractionDigits: 2 })}
        </p>
      </div>

      <label className="block">
        <span className="mb-1.5 block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
          Account holder name
        </span>
        <input
          required
          value={accountHolder}
          onChange={(e) => setAccountHolder(e.target.value)}
          placeholder="As shown on your bank account"
          className={inputClass}
          disabled={disabled || busy}
        />
      </label>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold text-neutral-700 dark:text-neutral-300">Sort code</span>
          <input
            required
            inputMode="numeric"
            value={sortCode}
            onChange={(e) => setSortCode(e.target.value)}
            placeholder="00-00-00"
            className={inputClass}
            disabled={disabled || busy}
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
            Account number
          </span>
          <input
            required
            inputMode="numeric"
            value={accountNumber}
            onChange={(e) => setAccountNumber(e.target.value)}
            placeholder="12345678"
            className={inputClass}
            disabled={disabled || busy}
          />
        </label>
      </div>

      <p className="flex items-start gap-2 text-[11px] leading-relaxed text-neutral-500">
        <Lock size={14} className="mt-0.5 shrink-0" />
        By authorising, you agree to a Direct Debit mandate for EMI collections. Funds for this handshake are
        held in Oxyile&apos;s segregated client money account (sandbox simulation).
      </p>

      <button
        type="submit"
        disabled={disabled || busy}
        className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#1F2A44] py-4 text-sm font-black uppercase tracking-wide text-white transition hover:bg-[#162033] disabled:opacity-50"
      >
        {busy ? <Loader2 size={18} className="animate-spin" /> : null}
        Authorize Bank Transfer
      </button>
    </form>
  );
}
