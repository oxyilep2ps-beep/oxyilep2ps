'use client';

import { useCallback, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { SignUpWizard, type SignUpWizardFiles } from '@/components/sign-up-wizard';
import { AuthToast, SIGNUP_SUCCESS_MESSAGE } from '@/components/auth-toast';
import { Footer } from '@/components/footer';
import { Logo } from '@/components/logo';
import { createClient } from '@/lib/supabase/client';
import { buildStoredKycData } from '@/lib/kyc/build-stored-kyc';
import type { KycSubmissionPayload } from '@/lib/types/kyc';

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

    const supabase = createClient();

    try {
      // Persist ALL onboarding fields in auth metadata so the DB trigger can
      // create a complete profiles row even when email confirmation blocks a session.
      const kycDataForMeta = buildStoredKycData(kyc, {
        proofOfIdentity: null,
        livenessVideo: null,
        proofOfAddress: null,
        incomeVerification: null,
      });

      const userMeta = {
        full_legal_name: meta.fullLegalName,
        uk_phone: kyc.basic.ukPhone,
        postal_code: kyc.basic.postalCode,
        date_of_birth: kyc.basic.dateOfBirth,
        current_address: kyc.basic.currentAddress,
        address_history_3_years: kyc.basic.addressHistory3Years,
        proof_of_identity_type: kyc.identityMeta.proofOfIdentityType,
        account_role: kyc.role,
        role: kyc.role === 'borrower' ? 'BORROWER' : 'INVESTOR',
        expected_interest_rate: meta.expected_interest_rate,
        kyc_data: kycDataForMeta,
      };

      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: meta.email.trim(),
        password: meta.password,
        options: {
          data: userMeta,
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (signUpError) {
        throw new Error(signUpError.message);
      }

      const user = signUpData.user;
      const identities = user?.identities ?? [];

      // Supabase returns a user with empty identities when the email is already registered.
      if (user && identities.length === 0) {
        throw new Error('An account with this email already exists. Please sign in instead.');
      }

      const userId = user?.id ?? null;

      if (!userId) {
        throw new Error(
          'Account was created but we could not obtain your user id. Please confirm your email, then contact support if documents are missing.'
        );
      }

      if (!files.proofOfIdentity || !files.livenessVideo || !files.proofOfAddress) {
        throw new Error('Proof of identity, liveness video, and proof of address are required.');
      }

      // Upload ALL KYC files first (via API). Fail signup persistence if uploads fail.
      const formData = new FormData();
      formData.append('userId', userId);
      formData.append('email', meta.email.trim());
      formData.append('fullLegalName', meta.fullLegalName);
      formData.append('kyc', JSON.stringify(kyc));
      formData.append('expected_interest_rate', String(meta.expected_interest_rate));
      formData.append('proofOfIdentity', files.proofOfIdentity);
      formData.append('livenessVideo', files.livenessVideo);
      formData.append('proofOfAddress', files.proofOfAddress);
      if (files.incomeVerification) formData.append('incomeVerification', files.incomeVerification);

      const response = await fetch('/api/kyc/submit', {
        method: 'POST',
        body: formData,
      });
      const data = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok || !data.ok) {
        throw new Error(data.error ?? 'Failed to upload KYC documents. Please try again.');
      }

      setSuccessOpen(true);
      window.setTimeout(() => {
        router.push('/verify-email');
        router.refresh();
      }, 2200);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Registration failed');
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
        <h1 className="mt-3 text-4xl font-black text-neutral-950 dark:text-white sm:text-5xl">Create your account</h1>
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
        <SignUpWizard onComplete={handleComplete} />

        <div className="mt-8 flex items-center gap-3">
          <div className="h-px flex-1 bg-neutral-200 dark:bg-white/10" />
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-400">OR</span>
          <div className="h-px flex-1 bg-neutral-200 dark:bg-white/10" />
        </div>

        <p className="mt-4 text-center text-sm text-neutral-600 dark:text-neutral-400">
          Are you an Employee?{' '}
          <Link href="/employee/signup" className="font-semibold text-brand-600 hover:text-brand-500 dark:text-brand-300">
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
