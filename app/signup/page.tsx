'use client';

import { useCallback, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { SignUpWizard, type SignUpWizardFiles } from '@/components/sign-up-wizard';
import { AuthToast } from '@/components/auth-toast';
import { Footer } from '@/components/footer';
import { Logo } from '@/components/logo';
import type { KycSubmissionPayload } from '@/lib/types/kyc';

const SIGNUP_SUCCESS_MESSAGE =
  'Account created and documents uploaded! Please check your email to confirm.';

export default function SignUpPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successOpen, setSuccessOpen] = useState(false);

  const dismissToast = useCallback(() => setSuccessOpen(false), []);

  const handleComplete = async (
    kyc: KycSubmissionPayload,
    meta: { email: string; fullLegalName: string; password: string; expected_interest_rate: number },
    files: SignUpWizardFiles
  ) => {
    setSubmitting(true);
    setError(null);
    setSuccessOpen(false);

    try {
      if (!files.proofOfIdentity || !files.livenessVideo || !files.proofOfAddress) {
        setError('Proof of identity, liveness video, and proof of address are required.');
        return;
      }

      // Use API route (JSON errors) instead of Server Actions — large multipart
      // uploads often trigger Next's masked "unexpected response" error.
      const formData = new FormData();
      formData.append('email', meta.email.trim());
      formData.append('password', meta.password);
      formData.append('fullLegalName', meta.fullLegalName);
      formData.append('kyc', JSON.stringify(kyc));
      formData.append('expected_interest_rate', String(meta.expected_interest_rate));
      formData.append('proofOfIdentity', files.proofOfIdentity);
      formData.append('livenessVideo', files.livenessVideo);
      formData.append('proofOfAddress', files.proofOfAddress);
      if (files.incomeVerification) {
        formData.append('incomeVerification', files.incomeVerification);
      }

      const response = await fetch('/api/auth/register', {
        method: 'POST',
        body: formData,
      });

      let payload: { success?: boolean; error?: string; userId?: string } | null = null;
      try {
        payload = (await response.json()) as {
          success?: boolean;
          error?: string;
          userId?: string;
        };
      } catch {
        payload = null;
      }

      if (!response.ok || !payload?.success) {
        // Show the REAL server error string in the red toast
        const realError =
          payload?.error ||
          (response.status === 413
            ? 'File is too large. Please upload a document under 10MB.'
            : `Form submission failed (HTTP ${response.status}).`);
        setError(realError);
        return;
      }

      setSuccessOpen(true);
      window.setTimeout(() => {
        router.push('/verify-email');
        router.refresh();
      }, 2200);
    } catch (e) {
      const message =
        e instanceof Error && e.message
          ? e.message
          : 'Form submission failed. Please try again.';
      if (/unexpected response/i.test(message)) {
        setError(
          'Upload failed before the server could respond. Please use files under 10MB and restart the dev server after config changes.'
        );
      } else {
        setError(message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <AuthToast
        open={successOpen}
        tone="success"
        message={SIGNUP_SUCCESS_MESSAGE}
        onClose={dismissToast}
      />
      <AuthToast
        open={Boolean(error) && !successOpen}
        tone="error"
        message={error ?? ''}
        onClose={() => setError(null)}
      />

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-10 text-center"
      >
        <div className="mb-6 flex justify-center">
          <Logo size="lg" priority />
        </div>
        <p className="text-sm uppercase tracking-[0.3em] text-brand-500">Onboarding</p>
        <h1 className="mt-3 text-4xl font-black text-neutral-950 dark:text-white sm:text-5xl">
          Create your account
        </h1>
        <p className="section-subtitle mx-auto mt-4">
          Complete our FCA-aligned KYC wizard. Your account stays pending until our compliance team
          approves it.
        </p>
      </motion.div>

      <div className="relative mx-auto max-w-2xl">
        {submitting && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 z-10 flex items-center justify-center rounded-[2.25rem] bg-white/60 backdrop-blur-sm dark:bg-black/60"
          >
            <p className="text-sm font-semibold text-brand-600">
              Creating account & uploading KYC…
            </p>
          </motion.div>
        )}
        <SignUpWizard onComplete={handleComplete} />

        <div className="mt-8 flex items-center gap-3">
          <div className="h-px flex-1 bg-neutral-200 dark:bg-white/10" />
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-400">OR</span>
          <div className="h-px flex-1 bg-neutral-200 dark:bg-white/10" />
        </div>

        <p className="mt-4 text-center text-sm text-neutral-600 dark:text-neutral-400">
          Are you an Employee?{' '}
          <Link
            href="/employee/signup"
            className="font-semibold text-brand-600 hover:text-brand-500 dark:text-brand-300"
          >
            Sign up here.
          </Link>
        </p>
        <p className="mt-2 text-center text-sm text-neutral-500">
          Already have an account?{' '}
          <Link href="/signin" className="font-semibold text-brand-600 hover:text-brand-500">
            Login
          </Link>
        </p>
      </div>

      <Footer />
    </section>
  );
}
