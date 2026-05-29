'use client';

import { FormEvent, useEffect, useState } from 'react';
import { Loader2, X } from 'lucide-react';

const QUESTIONS = [
  { key: 'uk_resident', label: 'Are you a UK resident?' },
  { key: 'understands_risk', label: 'Do you understand P2P lending carries risk?' },
  { key: 'marketing_consent', label: 'May we email you about launch updates?' },
] as const;

export function WaitlistModal() {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [role, setRole] = useState<'borrower' | 'investor'>('borrower');
  const [incomeSource, setIncomeSource] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [incomeBracket, setIncomeBracket] = useState('');
  const [loanReason, setLoanReason] = useState('');
  const [desiredLoanLimit, setDesiredLoanLimit] = useState('');
  const [answers, setAnswers] = useState<Record<string, boolean>>({
    uk_resident: false,
    understands_risk: false,
    marketing_consent: true,
  });

  useEffect(() => {
    const timer = window.setTimeout(() => setOpen(true), 1000);
    return () => window.clearTimeout(timer);
  }, []);

  const close = () => {
    setOpen(false);
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const questionnaireAnswers: Record<string, string> = Object.fromEntries(
        QUESTIONS.map((q) => [q.label, answers[q.key] ? 'Yes' : 'No'])
      );

      if (role === 'investor') {
        questionnaireAnswers['Source of Income'] = incomeSource || 'Not provided';
        questionnaireAnswers['Current Company/Employer'] = companyName || 'Not provided';
        questionnaireAnswers['Estimated Annual Income/Package Bracket'] = incomeBracket || 'Not provided';
      } else {
        questionnaireAnswers['Primary Reason for Loan'] = loanReason || 'Not provided';
        questionnaireAnswers['Desired Loan Limit Amount (GBP)'] = desiredLoanLimit || 'Not provided';
      }

      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          phone,
          address,
          postal_code: postalCode,
          role,
          questionnaire_answers: questionnaireAnswers,
        }),
      });
      const body = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !body.ok) throw new Error(body.error ?? 'Could not submit waitlist');
      setDone(true);
      window.setTimeout(() => setOpen(false), 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not submit waitlist');
    } finally {
      setBusy(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[12000] grid place-items-center bg-black/65 px-4 backdrop-blur-md">
      <div className="glass-card relative w-full max-w-xl rounded-[1.8rem] border border-white/40 bg-white/80 p-6 shadow-2xl dark:border-white/10 dark:bg-black/60">
        <button
          type="button"
          onClick={close}
          className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-black/10 text-neutral-800 hover:bg-black/20 dark:bg-white/10 dark:text-white"
          aria-label="Close waitlist modal"
        >
          <X size={18} />
        </button>

        <p className="text-xs font-bold uppercase tracking-[0.28em] text-brand-500">Early Access</p>
        <h2 className="mt-2 text-2xl font-black text-neutral-950 dark:text-white">Join Oxyile Waitlist</h2>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">
          Secure your queue position before public launch.
        </p>

        {done ? (
          <p className="mt-6 rounded-xl bg-emerald-500/15 px-4 py-3 text-sm font-semibold text-emerald-800 dark:text-emerald-300">
            You are in. Thanks for joining the waitlist.
          </p>
        ) : (
          <form onSubmit={onSubmit} className="mt-5 space-y-3">
            <input
              required
              placeholder="Full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-white/60 bg-white/70 px-4 py-3 text-sm dark:border-white/10 dark:bg-black/40"
            />
            <input
              required
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-white/60 bg-white/70 px-4 py-3 text-sm dark:border-white/10 dark:bg-black/40"
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <input
                placeholder="Phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-xl border border-white/60 bg-white/70 px-4 py-3 text-sm dark:border-white/10 dark:bg-black/40"
              />
              <input
                placeholder="Postal code"
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value)}
                className="w-full rounded-xl border border-white/60 bg-white/70 px-4 py-3 text-sm dark:border-white/10 dark:bg-black/40"
              />
            </div>
            <input
              placeholder="Address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full rounded-xl border border-white/60 bg-white/70 px-4 py-3 text-sm dark:border-white/10 dark:bg-black/40"
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as 'borrower' | 'investor')}
                className="w-full rounded-xl border border-white/60 bg-white/70 px-4 py-3 text-sm dark:border-white/10 dark:bg-black/40"
              >
                <option value="borrower">Borrower</option>
                <option value="investor">Investor</option>
              </select>
            </div>

            {role === 'investor' ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <input
                  placeholder="Source of Income"
                  value={incomeSource}
                  onChange={(e) => setIncomeSource(e.target.value)}
                  className="w-full rounded-xl border border-white/60 bg-white/70 px-4 py-3 text-sm dark:border-white/10 dark:bg-black/40"
                />
                <input
                  placeholder="Current Company/Employer"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full rounded-xl border border-white/60 bg-white/70 px-4 py-3 text-sm dark:border-white/10 dark:bg-black/40"
                />
                <select
                  value={incomeBracket}
                  onChange={(e) => setIncomeBracket(e.target.value)}
                  className="sm:col-span-2 w-full rounded-xl border border-white/60 bg-white/70 px-4 py-3 text-sm dark:border-white/10 dark:bg-black/40"
                >
                  <option value="">Estimated Annual Income/Package Bracket</option>
                  <option>Below £30,000</option>
                  <option>£30,000 - £60,000</option>
                  <option>£60,000 - £100,000</option>
                  <option>£100,000+</option>
                </select>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                <select
                  value={loanReason}
                  onChange={(e) => setLoanReason(e.target.value)}
                  className="w-full rounded-xl border border-white/60 bg-white/70 px-4 py-3 text-sm dark:border-white/10 dark:bg-black/40"
                >
                  <option value="">Primary Reason for Loan</option>
                  <option>Business</option>
                  <option>Personal</option>
                  <option>Debt Consolidation</option>
                  <option>Education</option>
                  <option>Other</option>
                </select>
                <input
                  placeholder="Desired Loan Limit Amount (GBP)"
                  value={desiredLoanLimit}
                  onChange={(e) => setDesiredLoanLimit(e.target.value)}
                  className="w-full rounded-xl border border-white/60 bg-white/70 px-4 py-3 text-sm dark:border-white/10 dark:bg-black/40"
                />
              </div>
            )}

            <div className="rounded-xl border border-white/50 bg-white/40 p-3 dark:border-white/10 dark:bg-black/30">
              <p className="text-[11px] font-bold uppercase tracking-wider text-brand-500">Strategic Questions</p>
              <div className="mt-2 space-y-2">
                {QUESTIONS.map((q) => (
                  <label key={q.key} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={answers[q.key]}
                      onChange={(e) => setAnswers((prev) => ({ ...prev, [q.key]: e.target.checked }))}
                    />
                    {q.label}
                  </label>
                ))}
              </div>
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={busy}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-brand-500 px-5 py-3 text-sm font-bold text-white disabled:opacity-60"
            >
              {busy ? <Loader2 size={16} className="animate-spin" /> : null}
              Join Waitlist
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
