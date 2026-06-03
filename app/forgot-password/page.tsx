'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { Mail } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Footer } from '@/components/footer';
import { Logo } from '@/components/logo';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    const supabase = createClient();
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    });

    if (resetError) {
      setError(resetError.message);
    } else {
      setMessage('Password reset email sent. Check your inbox and spam folder.');
    }
    setLoading(false);
  };

  return (
    <section className="mx-auto max-w-md px-4 py-16 sm:px-6">
      <div className="mb-6 flex justify-center">
        <Logo size="lg" />
      </div>
      <div className="glass-card rounded-[2rem] p-7">
        <h1 className="text-2xl font-black text-neutral-950 dark:text-white">Forgot password?</h1>
        <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-300">
          Enter your email and we will send a secure reset link.
        </p>
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <label className="block text-sm">
            <span className="mb-2 block font-medium">Email</span>
            <div className="flex items-center gap-3 rounded-2xl border border-neutral-200 bg-white px-4 py-3 dark:border-white/10 dark:bg-black">
              <Mail size={18} className="text-neutral-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-transparent outline-none"
              />
            </div>
          </label>
          {error && <p className="text-sm text-red-600">{error}</p>}
          {message && <p className="text-sm text-emerald-700 dark:text-emerald-300">{message}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-brand-500 py-3 text-sm font-semibold text-white disabled:opacity-60"
          >
            {loading ? 'Sending…' : 'Send reset link'}
          </button>
        </form>
        <Link href="/signin" className="mt-4 block text-center text-sm font-semibold text-brand-600">
          Back to sign in
        </Link>
      </div>
      <Footer />
    </section>
  );
}
