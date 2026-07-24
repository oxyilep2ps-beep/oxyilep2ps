'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { registerEmployeeAccount } from '@/app/actions/employee-auth';
import { Logo } from '@/components/logo';
import { AuthToast } from '@/components/auth-toast';

export default function EmployeeSignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [pending, startTransition] = useTransition();

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await registerEmployeeAccount({ email, password, confirmPassword });
      if (!result.ok) {
        setError(result.error ?? 'Could not create employee account.');
        return;
      }
      setSuccess(true);
      window.setTimeout(() => {
        router.push('/employee/login');
        router.refresh();
      }, 1200);
    });
  };

  return (
    <section className="mx-auto flex min-h-[80vh] max-w-md flex-col justify-center px-4 py-16">
      <AuthToast
        open={Boolean(error)}
        tone="error"
        message={error ?? ''}
        onClose={() => setError(null)}
      />
      <AuthToast
        open={success}
        tone="success"
        message="Employee account created. You can sign in now."
        onClose={() => setSuccess(false)}
      />

      <div className="mb-8 flex justify-center">
        <Logo size="lg" />
      </div>
      <div className="glass-card rounded-[2rem] p-6 sm:p-8">
        <p className="text-xs font-bold uppercase tracking-[0.28em] text-brand-500">Staff</p>
        <h1 className="mt-2 text-2xl font-black text-neutral-950 dark:text-white">Employee signup</h1>
        <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-300">
          Only emails listed in the employee directory can create a staff account.
        </p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-neutral-500">Email</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm outline-none ring-brand-500/30 focus:ring-2 dark:border-white/10 dark:bg-neutral-950"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-neutral-500">Password</span>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm outline-none ring-brand-500/30 focus:ring-2 dark:border-white/10 dark:bg-neutral-950"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-neutral-500">
              Confirm password
            </span>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm outline-none ring-brand-500/30 focus:ring-2 dark:border-white/10 dark:bg-neutral-950"
            />
          </label>
          <button
            type="submit"
            disabled={pending}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-5 py-3 text-sm font-bold text-white hover:bg-brand-500 disabled:opacity-60"
          >
            {pending ? <Loader2 className="animate-spin" size={16} /> : null}
            Create staff account
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-neutral-500">
          Already have an account?{' '}
          <Link href="/employee/login" className="font-semibold text-brand-600">
            Employee login
          </Link>
        </p>
      </div>
    </section>
  );
}
