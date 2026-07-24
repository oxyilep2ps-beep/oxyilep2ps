'use server';

import { createClient } from '@supabase/supabase-js';
import { createAdminClient } from '@/lib/supabase/admin';
import { uploadAllKycDocuments, type WizardUploadFiles } from '@/lib/kyc/upload';
import { buildStoredKycData, mapWizardRoleToProfileRole } from '@/lib/kyc/build-stored-kyc';
import { buildFcaTestAnswers } from '@/lib/kyc/fca-answers';
import { createSubmission } from '@/lib/data/kyc-store';
import { FIXED_INTEREST_RATE } from '@/lib/platform/constants';
import type { KycSubmissionPayload } from '@/lib/types/kyc';

function toFile(value: FormDataEntryValue | null): File | null {
  if (!value || typeof value === 'string') return null;

  const blob = value as Blob & { name?: string; size: number; type: string };
  if (!blob.size || blob.size <= 0) return null;

  if (typeof File !== 'undefined' && value instanceof File) {
    return value;
  }

  return new File([blob], blob.name || 'upload.bin', {
    type: blob.type || 'application/octet-stream',
  });
}

function getAppOrigin(): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configured) return configured.replace(/\/$/, '');
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) return `https://${vercel.replace(/\/$/, '')}`;
  return 'http://localhost:3000';
}

function createAnonAuthClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY');
  }

  return createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export type RegisterUserResult =
  | { ok: true; userId: string }
  | { ok: false; error: string };

/**
 * Full onboarding pipeline that does NOT require an auth session.
 * Uses the service-role client for Storage + profiles so RLS cannot block
 * uploads when email confirmation leaves the user without a session.
 */
export async function registerUserWithDocs(formData: FormData): Promise<RegisterUserResult> {
  try {
    // ── Step A: Extract ──────────────────────────────────────────────
    const email = formData.get('email')?.toString().trim().toLowerCase() ?? '';
    const password = formData.get('password')?.toString() ?? '';
    const fullLegalName = formData.get('fullLegalName')?.toString().trim() ?? '';
    const kycJson = formData.get('kyc')?.toString() ?? '';
    const expectedInterestRateRaw = formData.get('expected_interest_rate')?.toString();
    const expectedInterestRate = Number(expectedInterestRateRaw ?? FIXED_INTEREST_RATE);

    if (!email || !password || !fullLegalName || !kycJson) {
      return {
        ok: false,
        error: 'Email, password, full legal name, and KYC payload are required.',
      };
    }

    if (password.length < 8) {
      return { ok: false, error: 'Password must be at least 8 characters.' };
    }

    let kyc: KycSubmissionPayload;
    try {
      kyc = JSON.parse(kycJson) as KycSubmissionPayload;
    } catch {
      return { ok: false, error: 'Invalid KYC payload.' };
    }

    const files: WizardUploadFiles = {
      proofOfIdentity: toFile(formData.get('proofOfIdentity')),
      livenessVideo: toFile(formData.get('livenessVideo')),
      proofOfAddress: toFile(formData.get('proofOfAddress')),
      incomeVerification: toFile(formData.get('incomeVerification')),
    };

    if (!files.proofOfIdentity || !files.livenessVideo || !files.proofOfAddress) {
      return {
        ok: false,
        error: 'Proof of identity, liveness video, and proof of address are required.',
      };
    }

    const kycDataForMeta = buildStoredKycData(kyc, {
      proofOfIdentity: null,
      livenessVideo: null,
      proofOfAddress: null,
      incomeVerification: null,
    });

    const userMeta = {
      full_legal_name: fullLegalName,
      uk_phone: kyc.basic.ukPhone,
      postal_code: kyc.basic.postalCode,
      date_of_birth: kyc.basic.dateOfBirth,
      current_address: kyc.basic.currentAddress,
      address_history_3_years: kyc.basic.addressHistory3Years,
      proof_of_identity_type: kyc.identityMeta.proofOfIdentityType,
      account_role: kyc.role,
      role: kyc.role === 'borrower' ? 'BORROWER' : 'INVESTOR',
      expected_interest_rate: Number.isFinite(expectedInterestRate)
        ? expectedInterestRate
        : FIXED_INTEREST_RATE,
      kyc_data: kycDataForMeta,
    };

    // ── Step B: Auth signup (no session required) ────────────────────
    const authClient = createAnonAuthClient();
    const { data: signUpData, error: signUpError } = await authClient.auth.signUp({
      email,
      password,
      options: {
        data: userMeta,
        emailRedirectTo: `${getAppOrigin()}/auth/callback`,
      },
    });

    if (signUpError) {
      return { ok: false, error: signUpError.message };
    }

    // CRITICAL: use user.id — never data.session (null when email confirm is on)
    const user = signUpData.user;
    const userId = user?.id ?? null;
    const identities = user?.identities ?? [];

    if (user && identities.length === 0) {
      return {
        ok: false,
        error: 'An account with this email already exists. Please sign in instead.',
      };
    }

    if (!userId) {
      return {
        ok: false,
        error:
          'Signup succeeded but no user id was returned by Auth. Please try again or contact support.',
      };
    }

    // ── Step C + D: Admin storage upload then profile upsert ─────────
    const admin = createAdminClient();

    let documents;
    try {
      documents = await uploadAllKycDocuments(admin, userId, files);
    } catch (uploadError) {
      // Best-effort cleanup of orphaned auth user so they can retry cleanly
      try {
        await admin.auth.admin.deleteUser(userId);
      } catch {
        // ignore cleanup failures
      }
      return {
        ok: false,
        error:
          uploadError instanceof Error
            ? uploadError.message
            : 'KYC document upload failed. Please try again.',
      };
    }

    if (!documents.proofOfIdentity || !documents.livenessVideo || !documents.proofOfAddress) {
      try {
        await admin.auth.admin.deleteUser(userId);
      } catch {
        // ignore
      }
      return { ok: false, error: 'One or more KYC documents failed to upload. Please retry.' };
    }

    const kyc_data = buildStoredKycData(kyc, documents);
    const profileRole = mapWizardRoleToProfileRole(kyc.role);
    const fcaTestAnswers =
      kyc.role === 'lender' && kyc.lender
        ? buildFcaTestAnswers(kyc.lender.appropriatenessAnswers)
        : {};

    const { error: profileError } = await admin.from('profiles').upsert(
      {
        id: userId,
        full_legal_name: fullLegalName,
        email,
        role: profileRole,
        status: 'PENDING',
        account_status: 'active',
        postal_code: kyc.basic.postalCode?.trim().toUpperCase() ?? null,
        fca_test_answers: fcaTestAnswers,
        proof_of_identity_url: documents.proofOfIdentity,
        liveness_video_url: documents.livenessVideo,
        proof_of_address_url: documents.proofOfAddress,
        income_verification_url: documents.incomeVerification ?? null,
        expected_interest_rate: FIXED_INTEREST_RATE,
        kyc_data,
      },
      { onConflict: 'id' }
    );

    if (profileError) {
      return { ok: false, error: profileError.message };
    }

    try {
      await createSubmission(email, fullLegalName, kyc_data);
    } catch {
      // Secondary store — non-fatal
    }

    return { ok: true, userId };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Registration failed. Please try again.',
    };
  }
}
