'use client';

import { FormEvent, useMemo, useState } from 'react';
import { Loader2, PoundSterling, ShieldCheck, UserPlus } from 'lucide-react';
import { motion } from 'framer-motion';
import { CollateralFormSection } from '@/components/collateral-form-section';
import { applyForMarketplaceLoan, TENURE_OPTIONS } from '@/app/actions/marketplace';
import { calculateFlatEmi } from '@/lib/handshake/calculations';
import { FIXED_INTEREST_RATE, FIXED_INTEREST_RATE_LABEL } from '@/lib/platform/constants';

export function ApplyLoanForm() {
  const [loanAmount, setLoanAmount] = useState('');
  const [tenureMonths, setTenureMonths] = useState<number>(12);
  const [collateralType, setCollateralType] = useState('');
  const [collateralValue, setCollateralValue] = useState('');
  const [collateralDescription, setCollateralDescription] = useState('');
  const [collateralProof, setCollateralProof] = useState<File | null>(null);
  const [guarantorEmail, setGuarantorEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const emiPreview = useMemo(() => {
    const amount = Number(loanAmount);
    if (!amount || amount <= 0) return null;
    return calculateFlatEmi(amount, tenureMonths, FIXED_INTEREST_RATE);
  }, [loanAmount, tenureMonths]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);

    const formData = new FormData();
    formData.append('loan_amount', loanAmount);
    formData.append('tenure_months', String(tenureMonths));
    formData.append('collateral_type', collateralType);
    formData.append('collateral_value', collateralValue);
    formData.append('collateral_description', collateralDescription);
    if (collateralProof) formData.append('collateral_proof', collateralProof);
    if (guarantorEmail.trim()) formData.append('guarantor_email', guarantorEmail.trim());

    const result = await applyForMarketplaceLoan(formData);
    setBusy(false);

    if (!result.ok) {
      setError(result.error ?? 'Submission failed.');
      return;
    }

    setSuccess(true);
    setLoanAmount('');
    setCollateralType('');
    setCollateralValue('');
    setCollateralDescription('');
    setCollateralProof(null);
    setGuarantorEmail('');
  };

  if (success) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card rounded-[2rem] border border-emerald-200 bg-emerald-500/5 p-8 text-center dark:border-emerald-900/40"
      >
        <ShieldCheck className="mx-auto text-emerald-500" size={40} />
        <h2 className="mt-4 text-xl font-bold text-neutral-950 dark:text-white">Application submitted</h2>
        <p className="mt-2 text-sm leading-7 text-neutral-600 dark:text-neutral-300">
          Your collateral-backed loan request is now live on the investor marketplace. You&apos;ll be notified when an
          investor funds your application.
        </p>
        <button
          type="button"
          onClick={() => setSuccess(false)}
          className="mt-6 rounded-full bg-brand-500 px-6 py-2.5 text-sm font-semibold text-white"
        >
          Submit another application
        </button>
      </motion.div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-8">
      <section className="glass-card rounded-[2rem] p-6 sm:p-8">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-2xl bg-brand-500/10 text-brand-500">
            <PoundSterling size={20} />
          </span>
          <div>
            <h2 className="text-lg font-bold text-neutral-950 dark:text-white">Loan details</h2>
            <p className="text-sm text-neutral-500">{FIXED_INTEREST_RATE_LABEL}</p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className="mb-2 block text-sm font-medium">Requested Amount (£) *</span>
            <input
              required
              type="number"
              min="1"
              step="1"
              value={loanAmount}
              onChange={(e) => setLoanAmount(e.target.value)}
              placeholder="e.g. 25000"
              className="w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 dark:border-white/10 dark:bg-black"
            />
          </label>
          <label className="block sm:col-span-2">
            <span className="mb-2 block text-sm font-medium">Tenure (Months) *</span>
            <select
              required
              value={tenureMonths}
              onChange={(e) => setTenureMonths(Number(e.target.value))}
              className="w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 dark:border-white/10 dark:bg-black"
            >
              {TENURE_OPTIONS.map((months) => (
                <option key={months} value={months}>
                  {months} months
                </option>
              ))}
            </select>
          </label>
        </div>

        {emiPreview ? (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mt-6 rounded-2xl border border-brand-200/60 bg-brand-500/5 p-5 dark:border-brand-500/20"
          >
            <p className="text-xs font-bold uppercase tracking-wider text-brand-600">EMI calculator</p>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-sm text-neutral-500">Monthly EMI</p>
                <p className="text-2xl font-black text-brand-600">
                  £{emiPreview.emi_amount.toLocaleString('en-GB')}
                </p>
              </div>
              <div>
                <p className="text-sm text-neutral-500">Total repayment</p>
                <p className="text-lg font-bold text-neutral-950 dark:text-white">
                  £{emiPreview.total_repayment.toLocaleString('en-GB')}
                </p>
                <p className="mt-1 text-xs text-neutral-500">
                  Formula: (Principal + {FIXED_INTEREST_RATE}%) ÷ {tenureMonths} months
                </p>
              </div>
            </div>
          </motion.div>
        ) : null}
      </section>

      <section className="glass-card rounded-[2rem] p-6 sm:p-8">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-2xl bg-brand-500/10 text-brand-500">
            <UserPlus size={20} />
          </span>
          <div>
            <h2 className="text-lg font-bold text-neutral-950 dark:text-white">Add a Guarantor (Co-Signer)</h2>
            <p className="text-sm text-neutral-500">Optional — we&apos;ll send a secure E-Sign and KYC link.</p>
          </div>
        </div>
        <label className="mt-6 block">
          <span className="mb-2 block text-sm font-medium">Guarantor Email Address</span>
          <input
            type="email"
            value={guarantorEmail}
            onChange={(e) => setGuarantorEmail(e.target.value)}
            placeholder="guarantor@example.com"
            className="w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 dark:border-white/10 dark:bg-black"
          />
        </label>
      </section>

      <section className="glass-card rounded-[2rem] p-6 sm:p-8">
        <h2 className="text-lg font-bold text-neutral-950 dark:text-white">Collateral security *</h2>
        <p className="mt-1 text-sm text-neutral-500">All fields are mandatory for marketplace listing.</p>
        <div className="mt-6">
          <CollateralFormSection
            values={{
              collateralType,
              collateralValue,
              collateralDescription,
              collateralProof,
            }}
            onChange={(patch) => {
              if (patch.collateralType !== undefined) setCollateralType(patch.collateralType);
              if (patch.collateralValue !== undefined) setCollateralValue(patch.collateralValue);
              if (patch.collateralDescription !== undefined) setCollateralDescription(patch.collateralDescription);
              if (patch.collateralProof !== undefined) setCollateralProof(patch.collateralProof);
            }}
          />
        </div>
      </section>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <button
        type="submit"
        disabled={busy}
        className="flex w-full items-center justify-center gap-2 rounded-full bg-brand-500 px-6 py-3.5 text-sm font-bold text-white shadow-glow disabled:opacity-60"
      >
        {busy ? <Loader2 size={18} className="animate-spin" /> : null}
        Submit loan application
      </button>
    </form>
  );
}
