'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { SignUpWizard, type SignUpWizardFiles } from '@/components/sign-up-wizard';
import { Footer } from '@/components/footer';
import { createClient } from '@/lib/supabase/client';
import type { KycSubmissionPayload } from '@/lib/types/kyc';

export default function SignUpPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleComplete = async (
    kyc: KycSubmissionPayload,
    meta: { email: string; fullLegalName: string; password: string; expected_interest_rate: number },
    files: SignUpWizardFiles
  ) => {
    setSubmitting(true);
    setError(null);

    const supabase = createClient();

    try {
      // Strict logging for debugging: show exact signup payload
      // eslint-disable-next-line no-console
      console.log('SIGNUP PAYLOAD:', { kyc, meta });

      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: meta.email,
        password: meta.password,
        options: {
          data: { full_legal_name: meta.fullLegalName },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      // eslint-disable-next-line no-console
      console.log('SUPABASE SIGNUP RESPONSE:', signUpData, signUpError);

      if (signUpError) throw new Error(signUpError.message);

      const userId = signUpData.user?.id;
      if (!userId) throw new Error('Account created but user id missing. Check email confirmation settings.');

      const formData = new FormData();
      formData.append('userId', userId);
      formData.append('email', meta.email);
      formData.append('fullLegalName', meta.fullLegalName);
      formData.append('kyc', JSON.stringify(kyc));
      formData.append('expected_interest_rate', String(meta.expected_interest_rate));

      if (files.proofOfIdentity) formData.append('proofOfIdentity', files.proofOfIdentity);
      if (files.livenessVideo) formData.append('livenessVideo', files.livenessVideo);
      if (files.proofOfAddress) formData.append('proofOfAddress', files.proofOfAddress);
      if (files.incomeVerification) formData.append('incomeVerification', files.incomeVerification);

      // Log FormData entries (filenames for files) to verify what's being sent
      // eslint-disable-next-line no-console
      console.log('FORM DATA ENTRIES:');
      for (const entry of Array.from(formData.entries())) {
        const [key, value] = entry as [string, FormDataEntryValue];
        if (value instanceof File) {
          // eslint-disable-next-line no-console
          console.log(' -', key, '-> File:', value.name, value.type, value.size);
        } else {
          // eslint-disable-next-line no-console
          console.log(' -', key, '->', value);
        }
      }

      const response = await fetch('/api/kyc/submit', {
        method: 'POST',
        body: formData,
      });

      const data = (await response.json()) as {
        ok?: boolean;
        error?: string;
        profile?: { role?: string; status?: string; email?: string };
        documents?: Record<string, string> | null;
      };

      // eslint-disable-next-line no-console
      console.log('KYC SUBMIT RESPONSE:', response.status, data);

      if (!response.ok || !data.ok) {
        // eslint-disable-next-line no-console
        console.log('SUPABASE RESPONSE:', data.error ?? 'unknown error during KYC submit');
        throw new Error(data.error ?? 'Failed to persist KYC submission');
      }

      // Log uploaded file paths returned by the server
      // eslint-disable-next-line no-console
      console.log('UPLOADED FILES PATHS:', data.documents ?? null);

      router.push('/verify-email');
      router.refresh();
    } catch (e) {
      // eslint-disable-next-line no-console
      console.log('SIGNUP ERROR:', e);
      setError(e instanceof Error ? e.message : 'Registration failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-10 text-center"
      >
        <p className="text-sm uppercase tracking-[0.3em] text-brand-500">Onboarding</p>
        <h1 className="mt-3 text-4xl font-black text-neutral-950 dark:text-white sm:text-5xl">Join Oxyile</h1>
        <p className="section-subtitle mx-auto mt-4">
          Complete our FCA-aligned KYC wizard. Your account stays pending until our compliance team approves it.
        </p>
      </motion.div>

      <div className="relative mx-auto max-w-2xl">
        {submitting && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 z-10 flex items-center justify-center rounded-[2.25rem] bg-white/60 backdrop-blur-sm dark:bg-black/60"
          >
            <p className="text-sm font-semibold text-brand-600">Creating account & uploading KYC…</p>
          </motion.div>
        )}
        {error && (
          <p className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
            {error}
          </p>
        )}
        <SignUpWizard onComplete={handleComplete} />
      </div>

      <Footer />
    </section>
  );
}
