'use client';

import { FormEvent, Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Loader2, Mail, KeyRound } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Footer } from '@/components/footer';
import { Logo } from '@/components/logo';
import { AuthToast } from '@/components/auth-toast';

function ForgotPasswordForm() {
  const searchParams = useSearchParams();
  const fromEmployee = searchParams.get('from') === 'employee';
  const linkExpired = searchParams.get('error') === 'expired';

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ tone: 'success' | 'error'; message: string } | null>(
    linkExpired
      ? {
          tone: 'error',
          message: 'That reset link is invalid or has expired. Request a new one below.',
        }
      : null
  );

  const loginHref = fromEmployee ? '/employee/login' : '/signin';
  const resetNext = fromEmployee ? '/reset-password?from=employee' : '/reset-password';

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setToast(null);

    try {
      const normalizedEmail = email.trim().toLowerCase();
      if (!normalizedEmail.includes('@')) {
        setToast({ tone: 'error', message: 'Enter a valid email address.' });
        return;
      }

      const supabase = createClient();
      // Route through /auth/callback so the recovery code is exchanged for a session (PKCE).
      const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(resetNext)}`;

      const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
        redirectTo,
      });

      if (error) {
        setToast({ tone: 'error', message: error.message || 'Could not send reset email.' });
        return;
      }

      setToast({
        tone: 'success',
        message:
          'Check your email for the reset link. If you do not see it, check Spam/Junk. The link expires after a short time.',
      });
      setEmail('');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unexpected error sending reset link.';
      console.error('🚨 FORGOT PASSWORD CRASH:', err);
      setToast({ tone: 'error', message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="mx-auto max-w-md px-4 py-16 sm:px-6">
      <AuthToast
        open={Boolean(toast)}
        tone={toast?.tone ?? 'error'}
        message={toast?.message ?? ''}
        onClose={() => setToast(null)}
      />

      <div className="mb-6 flex justify-center">
        <Logo size="lg" className="h-24 w-24" />
      </div>

      <div className="glass-card rounded-[2rem] p-7 shadow-glass">
        <div className="mb-4 flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-brand-500/10 text-brand-500">
            <KeyRound size={20} />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-brand-500">Account recovery</p>
            <h1 className="text-2xl font-black text-neutral-950 dark:text-white">Forgot password?</h1>
          </div>
        </div>

        <p className="text-sm text-neutral-600 dark:text-neutral-300">
          Enter the email for your {fromEmployee ? 'employee' : 'Oxyile'} account and we will send a secure reset
          link.
        </p>

        <form onSubmit={(e) => void handleSubmit(e)} className="mt-6 space-y-4">
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-neutral-700 dark:text-neutral-300">Email</span>
            <div className="flex items-center gap-3 rounded-2xl border border-neutral-200 bg-white px-4 py-3 dark:border-white/10 dark:bg-black">
              <Mail size={18} className="text-neutral-400" />
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full bg-transparent outline-none"
              />
            </div>
          </label>

          <button
            type="submit"
            disabled={loading}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-brand-500 py-3 text-sm font-semibold text-white shadow-glow transition hover:bg-brand-400 disabled:opacity-60"
          >
            {loading ? <Loader2 className="animate-spin" size={16} /> : null}
            {loading ? 'Sending…' : 'Send Reset Link'}
          </button>
        </form>

        <Link href={loginHref} className="mt-5 block text-center text-sm font-semibold text-brand-600 dark:text-brand-300">
          Back to {fromEmployee ? 'employee login' : 'sign in'}
        </Link>
      </div>
      <Footer />
    </section>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense
      fallback={
        <section className="mx-auto max-w-md px-4 py-24 text-center text-sm text-neutral-500">Loading…</section>
      }
    >
      <ForgotPasswordForm />
    </Suspense>
  );
}
