'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { getAuthRedirectPath } from '@/lib/auth/routing';
import { Logo } from '@/components/logo';
import { AuthToast } from '@/components/auth-toast';

export default function EmployeeLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (signInError) {
      setError(signInError.message);
      setLoading(false);
      return;
    }

    // Ensure staff role is applied, then verify employee directory membership.
    await fetch('/api/auth/ensure-staff-role', { method: 'POST' });

    const directoryCheck = await fetch('/api/auth/check-employee-directory', { method: 'POST' });
    const directoryBody = (await directoryCheck.json()) as { ok?: boolean; error?: string };
    if (!directoryCheck.ok || !directoryBody.ok) {
      await supabase.auth.signOut();
      setError(directoryBody.error ?? 'Unauthorized: Your email is not added in the employee directory.');
      setLoading(false);
      return;
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, status')
      .eq('id', data.user.id)
      .maybeSingle();

    const dest = getAuthRedirectPath(profile, data.user.email ?? '');
    router.push(dest);
    router.refresh();
  };

  return (
    <section className="mx-auto flex min-h-[80vh] max-w-md flex-col justify-center px-4 py-16">
      <AuthToast open={Boolean(error)} tone="error" message={error ?? ''} onClose={() => setError(null)} />

      <div className="mb-8 flex justify-center">
        <Logo size="lg" className="h-24 w-24" />
      </div>
      <div className="glass-card rounded-[2rem] p-6 sm:p-8">
        <p className="text-xs font-bold uppercase tracking-[0.28em] text-brand-500">Staff</p>
        <h1 className="mt-2 text-2xl font-black text-neutral-950 dark:text-white">Employee login</h1>
        <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-300">
          Access is limited to the employee directory. Revoked staff are signed out immediately.
        </p>

        <form onSubmit={(e) => void onSubmit(e)} className="mt-6 space-y-4">
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
              autoComplete="current-password"
              className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm outline-none ring-brand-500/30 focus:ring-2 dark:border-white/10 dark:bg-neutral-950"
            />
          </label>
          <div className="text-right">
            <Link
              href="/forgot-password?from=employee"
              className="text-xs font-semibold text-brand-600 hover:text-brand-500 dark:text-brand-300"
            >
              Forgot password?
            </Link>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-5 py-3 text-sm font-bold text-white hover:bg-brand-500 disabled:opacity-60"
          >
            {loading ? <Loader2 className="animate-spin" size={16} /> : null}
            Sign in
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-neutral-500">
          Need an account?{' '}
          <Link href="/employee/signup" className="font-semibold text-brand-600">
            Employee signup
          </Link>
        </p>
      </div>
    </section>
  );
}
