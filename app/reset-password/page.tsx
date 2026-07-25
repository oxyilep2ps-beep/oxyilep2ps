'use client';

import { FormEvent, Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Eye, EyeOff, Loader2, LockKeyhole, ShieldCheck } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Footer } from '@/components/footer';
import { Logo } from '@/components/logo';
import { AuthToast } from '@/components/auth-toast';

type SessionState = 'checking' | 'ready' | 'missing';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromEmployee = searchParams.get('from') === 'employee';
  const loginHref = fromEmployee ? '/employee/login' : '/signin';
  const forgotHref = fromEmployee ? '/forgot-password?from=employee' : '/forgot-password';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [sessionState, setSessionState] = useState<SessionState>('checking');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ tone: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();

    const resolveSession = async () => {
      try {
        // Recovery links may land with hash tokens; give the client a moment to hydrate them.
        const hash = typeof window !== 'undefined' ? window.location.hash : '';
        if (hash.includes('access_token') || hash.includes('type=recovery')) {
          await new Promise((resolve) => window.setTimeout(resolve, 250));
        }

        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (cancelled) return;

        if (error) {
          console.error('[reset-password] getSession error:', error.message);
          setSessionState('missing');
          setToast({
            tone: 'error',
            message: 'Could not validate your reset link. Request a new one.',
          });
          return;
        }

        setSessionState(session ? 'ready' : 'missing');
        if (!session) {
          setToast({
            tone: 'error',
            message: 'This reset link is invalid or has expired. Please request a new password reset email.',
          });
        }
      } catch (err) {
        console.error('🚨 RESET PASSWORD SESSION CRASH:', err);
        if (!cancelled) {
          setSessionState('missing');
          setToast({
            tone: 'error',
            message: 'Something went wrong opening the reset link. Please request a new one.',
          });
        }
      }
    };

    void resolveSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (cancelled) return;
      if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && session)) {
        setSessionState('ready');
        setToast(null);
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setToast(null);

    if (password.length < 8) {
      setToast({ tone: 'error', message: 'Password must be at least 8 characters.' });
      return;
    }
    if (password !== confirm) {
      setToast({ tone: 'error', message: 'Passwords do not match.' });
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        setSessionState('missing');
        setToast({
          tone: 'error',
          message: 'Your reset session expired. Request a new reset link and try again.',
        });
        return;
      }

      const { error: updateError } = await supabase.auth.updateUser({ password });

      if (updateError) {
        const expired =
          /expired|invalid|session/i.test(updateError.message) ||
          updateError.message.toLowerCase().includes('jwt');
        setToast({
          tone: 'error',
          message: expired
            ? 'This reset link has expired. Please request a new one.'
            : updateError.message,
        });
        if (expired) setSessionState('missing');
        return;
      }

      setToast({
        tone: 'success',
        message: 'Password updated successfully. Redirecting you to sign in…',
      });

      // Sign out so they explicitly sign in with the new password.
      try {
        await supabase.auth.signOut();
      } catch (signOutError) {
        console.warn('[reset-password] signOut after update failed:', signOutError);
      }

      window.setTimeout(() => {
        router.push(loginHref);
        router.refresh();
      }, 1200);
    } catch (err) {
      console.error('🚨 RESET PASSWORD CRASH:', err);
      setToast({
        tone: 'error',
        message: err instanceof Error ? err.message : 'Could not update password. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  if (sessionState === 'checking') {
    return (
      <section className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-4 py-16 text-center">
        <Loader2 className="animate-spin text-brand-500" size={32} />
        <p className="mt-4 text-sm text-neutral-500">Validating your reset link…</p>
        <Footer />
      </section>
    );
  }

  if (sessionState === 'missing') {
    return (
      <section className="mx-auto max-w-md px-4 py-16 sm:px-6">
        <AuthToast
          open={Boolean(toast)}
          tone={toast?.tone ?? 'error'}
          message={toast?.message ?? ''}
          onClose={() => setToast(null)}
        />
        <div className="mb-6 flex justify-center">
          <Logo size="lg" />
        </div>
        <div className="glass-card rounded-[2rem] p-7 text-center">
          <h1 className="text-2xl font-black text-neutral-950 dark:text-white">Reset link unavailable</h1>
          <p className="mt-3 text-sm text-neutral-600 dark:text-neutral-300">
            Open a fresh reset link from your email, or request a new one. Links expire for security.
          </p>
          <Link
            href={forgotHref}
            className="mt-6 inline-flex w-full items-center justify-center rounded-full bg-brand-500 py-3 text-sm font-semibold text-white"
          >
            Request new reset link
          </Link>
          <Link href={loginHref} className="mt-4 block text-sm font-semibold text-brand-600">
            Back to login
          </Link>
        </div>
        <Footer />
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-md px-4 py-16 sm:px-6">
      <AuthToast
        open={Boolean(toast)}
        tone={toast?.tone ?? 'error'}
        message={toast?.message ?? ''}
        onClose={() => setToast(null)}
      />

      <div className="mb-6 flex justify-center">
        <Logo size="lg" />
      </div>

      <div className="glass-card rounded-[2rem] p-7 shadow-glass">
        <div className="mb-4 flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-brand-500/10 text-brand-500">
            <ShieldCheck size={20} />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-brand-500">Secure reset</p>
            <h1 className="text-2xl font-black text-neutral-950 dark:text-white">Set new password</h1>
          </div>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className="mt-2 space-y-4">
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
              New password
            </span>
            <div className="flex items-center gap-3 rounded-2xl border border-neutral-200 bg-white px-4 py-3 dark:border-white/10 dark:bg-black">
              <LockKeyhole size={18} className="text-neutral-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                className="w-full bg-transparent outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="text-neutral-400 transition hover:text-brand-500"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
              Confirm password
            </span>
            <div className="flex items-center gap-3 rounded-2xl border border-neutral-200 bg-white px-4 py-3 dark:border-white/10 dark:bg-black">
              <LockKeyhole size={18} className="text-neutral-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Repeat new password"
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
            {loading ? 'Saving…' : 'Update password'}
          </button>
        </form>
      </div>
      <Footer />
    </section>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <section className="mx-auto max-w-md px-4 py-24 text-center text-sm text-neutral-500">Loading…</section>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
