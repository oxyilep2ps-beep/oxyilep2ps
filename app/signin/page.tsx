'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, type Variants } from 'framer-motion';
import { Eye, EyeOff, LockKeyhole, Mail, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { Footer } from '@/components/footer';
import { Logo } from '@/components/logo';
import { createClient } from '@/lib/supabase/client';
import { getAuthRedirectPath } from '@/lib/auth/routing';
import { staffRoleForEmail } from '@/lib/auth/role-emails';

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: 'easeOut' } },
};

function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });

    if (signInError) {
      setError(signInError.message);
      setLoading(false);
      return;
    }

    const user = data.user;
    if (staffRoleForEmail(user.email)) {
      await fetch('/api/auth/ensure-staff-role', { method: 'POST' });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, status')
      .eq('id', user.id)
      .maybeSingle();

    const redirectParam = searchParams.get('redirect');
    const dest =
      redirectParam && redirectParam.startsWith('/') ? redirectParam : getAuthRedirectPath(profile, user.email ?? '');

    router.push(dest);
    router.refresh();
  };

  return (
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <motion.div
        variants={fadeUp}
        initial="hidden"
        animate="show"
        className="mx-auto max-w-md"
      >
        <div className="text-center">
          <div className="mb-6 flex justify-center">
            <Logo size="lg" priority />
          </div>
          <p className="text-sm uppercase tracking-[0.3em] text-brand-500">Secure access</p>
          <h1 className="mt-3 text-4xl font-black text-neutral-950 dark:text-white">Sign in</h1>
          <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-300">
            Access your Oxyile investor or borrower dashboard.
          </p>
        </div>

        <form onSubmit={handleSignIn} className="glass-card mt-8 rounded-[2rem] p-7 shadow-glass">
          <div className="mb-4 flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-xl bg-brand-500/10 text-brand-500">
              <ShieldCheck size={20} />
            </div>
            <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Email & password</p>
          </div>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-neutral-700 dark:text-neutral-300">Email</span>
            <div className="flex items-center gap-3 rounded-2xl border border-neutral-200 bg-white px-4 py-3 dark:border-white/10 dark:bg-black">
              <Mail size={18} className="text-neutral-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-transparent outline-none"
                placeholder="you@example.com"
              />
            </div>
          </label>

          <label className="mt-4 block">
            <span className="mb-2 block text-sm font-medium text-neutral-700 dark:text-neutral-300">Password</span>
            <div className="flex items-center gap-3 rounded-2xl border border-neutral-200 bg-white px-4 py-3 dark:border-white/10 dark:bg-black">
              <LockKeyhole size={18} className="text-neutral-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-transparent outline-none"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword((current) => !current)}
                className="text-neutral-400 transition hover:text-brand-500"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </label>

          <div className="mt-2 text-right">
            <Link href="/forgot-password" className="text-xs font-semibold text-brand-600 hover:text-brand-500 dark:text-brand-300">
              Forgot password?
            </Link>
          </div>

          {error && (
            <p className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-6 w-full rounded-full bg-brand-500 py-3 text-sm font-semibold text-white shadow-glow transition hover:bg-brand-400 disabled:opacity-60"
          >
            {loading ? 'Signing in…' : 'Sign in securely'}
          </button>

          <p className="mt-6 text-center text-sm text-neutral-600 dark:text-neutral-400">
            New to Oxyile?{' '}
            <Link href="/signup" className="font-semibold text-brand-600 hover:text-brand-500 dark:text-brand-300">
              Create an account
            </Link>
          </p>
        </form>
      </motion.div>
      <Footer />
    </section>
  );
}

export default function SignInPage() {
  return (
    <Suspense
      fallback={
        <section className="mx-auto max-w-md px-4 py-24 text-center text-sm text-neutral-500">Loading…</section>
      }
    >
      <SignInForm />
    </Suspense>
  );
}
