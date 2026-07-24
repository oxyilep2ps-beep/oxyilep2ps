'use client';

import { useCallback, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { SignUpWizard, type SignUpWizardFiles } from '@/components/sign-up-wizard';
import { AuthToast } from '@/components/auth-toast';
import { Footer } from '@/components/footer';
import { Logo } from '@/components/logo';
import { STRATEGIC_QUESTIONS } from '@/lib/questionnaire/strategic-questions';
import type { KycSubmissionPayload } from '@/lib/types/kyc';

const SIGNUP_SUCCESS_MESSAGE =
  "Account created successfully! Please check your email to confirm. (Note: Please check your Spam or Junk folder if you don't see it within a few minutes).";

/** Append every onboarding text field explicitly (plus files + full kyc JSON backup). */
function appendRegisterFormData(
  formData: FormData,
  kyc: KycSubmissionPayload,
  meta: { email: string; fullLegalName: string; password: string; expected_interest_rate: number },
  files: SignUpWizardFiles
) {
  formData.append('email', meta.email.trim());
  formData.append('password', meta.password);
  formData.append('fullLegalName', meta.fullLegalName);
  formData.append('full_legal_name', meta.fullLegalName);
  formData.append('legal_name', meta.fullLegalName);
  formData.append('expected_interest_rate', String(meta.expected_interest_rate));

  // Account role
  formData.append('account_role', kyc.role);
  formData.append('accountRole', kyc.role);
  formData.append('role', kyc.role);

  // Basic details
  formData.append('basic_email', kyc.basic.email ?? meta.email.trim());
  formData.append('uk_phone', kyc.basic.ukPhone ?? '');
  formData.append('ukPhone', kyc.basic.ukPhone ?? '');
  formData.append('postal_code', kyc.basic.postalCode ?? '');
  formData.append('postalCode', kyc.basic.postalCode ?? '');
  formData.append('date_of_birth', kyc.basic.dateOfBirth ?? '');
  formData.append('dateOfBirth', kyc.basic.dateOfBirth ?? '');
  formData.append('current_address', kyc.basic.currentAddress ?? '');
  formData.append('currentAddress', kyc.basic.currentAddress ?? '');
  formData.append('address_history_3_years', kyc.basic.addressHistory3Years ?? '');
  formData.append('addressHistory3Years', kyc.basic.addressHistory3Years ?? '');

  // Identity meta
  formData.append('proof_of_identity_type', kyc.identityMeta.proofOfIdentityType ?? '');
  formData.append('proofOfIdentityType', kyc.identityMeta.proofOfIdentityType ?? '');
  formData.append('has_proof_of_identity', String(Boolean(kyc.identityMeta.hasProofOfIdentity)));
  formData.append('has_liveness_video', String(Boolean(kyc.identityMeta.hasLivenessVideo)));
  formData.append('has_proof_of_address', String(Boolean(kyc.identityMeta.hasProofOfAddress)));

  // Strategic questionnaire — both machine keys and human aliases
  const answers = kyc.questionnaireAnswers ?? {};
  for (const q of STRATEGIC_QUESTIONS) {
    const value = answers[q.label] ?? '';
    formData.append(q.key, value);
    if (q.key === 'uk_resident') formData.append('is_uk_resident', value);
    if (q.key === 'marketing_consent') formData.append('launch_updates', value);
  }

  // Role-specific fields
  if (kyc.lender) {
    formData.append('investor_category', kyc.lender.investorCategory ?? '');
    formData.append('investorCategory', kyc.lender.investorCategory ?? '');
    formData.append('source_of_funds', kyc.lender.sourceOfFunds ?? '');
    formData.append('sourceOfFunds', kyc.lender.sourceOfFunds ?? '');
    formData.append('bank_sort_code', kyc.lender.bankSortCode ?? '');
    formData.append('bankSortCode', kyc.lender.bankSortCode ?? '');
    formData.append('bank_account_number', kyc.lender.bankAccountNumber ?? '');
    formData.append('bankAccountNumber', kyc.lender.bankAccountNumber ?? '');
    formData.append('appropriateness_0', String(kyc.lender.appropriatenessAnswers?.[0] ?? ''));
    formData.append('appropriateness_1', String(kyc.lender.appropriatenessAnswers?.[1] ?? ''));
    formData.append('appropriateness_2', String(kyc.lender.appropriatenessAnswers?.[2] ?? ''));
  }

  if (kyc.borrower) {
    formData.append('purpose_of_loan', kyc.borrower.purposeOfLoan ?? '');
    formData.append('purposeOfLoan', kyc.borrower.purposeOfLoan ?? '');
    formData.append('employment_status', kyc.borrower.employmentStatus ?? '');
    formData.append('employmentStatus', kyc.borrower.employmentStatus ?? '');
    formData.append('annual_income', kyc.borrower.annualIncome ?? '');
    formData.append('annualIncome', kyc.borrower.annualIncome ?? '');
    formData.append('open_banking_consent', String(Boolean(kyc.borrower.openBankingConsent)));
    formData.append('openBankingConsent', String(Boolean(kyc.borrower.openBankingConsent)));
    formData.append('credit_check_consent', String(Boolean(kyc.borrower.creditCheckConsent)));
    formData.append('creditCheckConsent', String(Boolean(kyc.borrower.creditCheckConsent)));
    formData.append('monthly_rent_or_emi', kyc.borrower.monthlyRentOrEmi ?? '');
    formData.append('monthlyRentOrEmi', kyc.borrower.monthlyRentOrEmi ?? '');
    formData.append('other_monthly_expenses', kyc.borrower.otherMonthlyExpenses ?? '');
    formData.append('otherMonthlyExpenses', kyc.borrower.otherMonthlyExpenses ?? '');
    formData.append(
      'has_income_verification',
      String(Boolean(kyc.borrower.hasIncomeVerification || files.incomeVerification))
    );
  }

  // Full JSON backup (must not be the only source of truth anymore)
  formData.append('kyc', JSON.stringify(kyc));

  // ── Files: append the real File object under EVERY known key alias ──
  const assertFile = (file: File | null | undefined, label: string): File => {
    if (!(file instanceof File) || file.size <= 0) {
      throw new Error(`${label} is missing or empty. Please re-select the file.`);
    }
    // eslint-disable-next-line no-console
    console.log(`📎 Client appending ${label}:`, file.name, file.size, file.type);
    return file;
  };

  const idProof = assertFile(files.proofOfIdentity, 'ID Proof');
  const liveness = assertFile(files.livenessVideo, 'Liveness selfie');
  const addressProof = assertFile(files.proofOfAddress, 'Address Proof');

  // Canonical keys used by the registration pipeline
  formData.append('proofOfIdentity', idProof);
  formData.append('livenessVideo', liveness);
  formData.append('proofOfAddress', addressProof);
  // Aliases (must match any server formData.get(...) variants)
  formData.append('idProof', idProof);
  formData.append('id_proof', idProof);
  formData.append('livenessSelfie', liveness);
  formData.append('liveness_selfie', liveness);
  formData.append('addressProof', addressProof);
  formData.append('address_proof', addressProof);

  if (files.incomeVerification) {
    const income = assertFile(files.incomeVerification, 'Income verification');
    formData.append('incomeVerification', income);
    formData.append('income_verification', income);
  }
}

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

      const formData = new FormData();
      appendRegisterFormData(formData, kyc, meta, files);

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
        const realError =
          (typeof payload?.error === 'string' && payload.error.trim()) ||
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
