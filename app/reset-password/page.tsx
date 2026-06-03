'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LockKeyhole } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Footer } from '@/components/footer';
import { Logo } from '@/components/logo';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      setReady(Boolean(session));
    });
  }, []);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      setError(updateError.message);
      setLoading(false);
      return;
    }

    router.push('/signin');
    router.refresh();
  };

  if (!ready) {
    return (
      <section className="mx-auto max-w-md px-4 py-16 text-center text-sm text-neutral-500">
        Open the reset link from your email to set a new password.
        <Footer />
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-md px-4 py-16 sm:px-6">
      <div className="mb-6 flex justify-center">
        <Logo size="lg" />
      </div>
      <div className="glass-card rounded-[2rem] p-7">
        <h1 className="text-2xl font-black text-neutral-950 dark:text-white">Set new password</h1>
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <label className="block text-sm">
            <span className="mb-2 block font-medium">New password</span>
            <div className="flex items-center gap-3 rounded-2xl border px-4 py-3 dark:border-white/10 dark:bg-black">
              <LockKeyhole size={18} />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-transparent outline-none"
              />
            </div>
          </label>
          <label className="block text-sm">
            <span className="mb-2 block font-medium">Confirm password</span>
            <input
              type="password"
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="w-full rounded-2xl border px-4 py-3 dark:border-white/10 dark:bg-black"
            />
          </label>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-brand-500 py-3 text-sm font-semibold text-white"
          >
            {loading ? 'Saving…' : 'Update password'}
          </button>
        </form>
      </div>
      <Footer />
    </section>
  );
}
