import { createClient } from '@supabase/supabase-js';
import { createAdminClient } from '@/lib/supabase/admin';
import { uploadAllKycDocuments, type WizardUploadFiles } from '@/lib/kyc/upload';
import { buildStoredKycData, mapWizardRoleToProfileRole } from '@/lib/kyc/build-stored-kyc';
import { buildFcaTestAnswers } from '@/lib/kyc/fca-answers';
import { createSubmission } from '@/lib/data/kyc-store';
import { FIXED_INTEREST_RATE } from '@/lib/platform/constants';
import type { KycSubmissionPayload } from '@/lib/types/kyc';

export type RegisterWithDocsResult =
  | { success: true; userId: string }
  | { success: false; error: string };

function toUploadable(value: FormDataEntryValue | null): WizardUploadFiles[keyof WizardUploadFiles] {
  if (!value || typeof value === 'string') return null;

  const blob = value as Blob & {
    name?: string;
    size: number;
    type: string;
    arrayBuffer: () => Promise<ArrayBuffer>;
  };
  if (!blob.size || blob.size <= 0) return null;
  if (typeof blob.arrayBuffer !== 'function') return null;

  return {
    name: typeof blob.name === 'string' && blob.name ? blob.name : 'upload.bin',
    type: blob.type || 'application/octet-stream',
    size: blob.size,
    arrayBuffer: () => blob.arrayBuffer(),
  };
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

function toErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return String(error.message);
  if (typeof error === 'string' && error.trim()) return error;
  try {
    return JSON.stringify(error);
  } catch {
    return 'Unknown internal server error';
  }
}

/**
 * Shared registration + KYC upload pipeline (used by API route AND server action).
 * Never throws — always returns a plain serializable result.
 */
export async function runRegisterWithDocs(formData: FormData): Promise<RegisterWithDocsResult> {
  try {
    console.info('[registerWithDocs] start');

    const email = String(formData.get('email') ?? '')
      .trim()
      .toLowerCase();
    const password = String(formData.get('password') ?? '');
    const fullLegalName = String(formData.get('fullLegalName') ?? '').trim();
    const kycJson = String(formData.get('kyc') ?? '');
    const expectedInterestRateRaw = formData.get('expected_interest_rate')?.toString();
    const expectedInterestRate = Number(expectedInterestRateRaw ?? FIXED_INTEREST_RATE);

    if (!email || !password || !fullLegalName || !kycJson) {
      return {
        success: false,
        error: 'Email, password, full legal name, and KYC payload are required.',
      };
    }

    if (password.length < 8) {
      return { success: false, error: 'Password must be at least 8 characters.' };
    }

    let kyc: KycSubmissionPayload;
    try {
      kyc = JSON.parse(kycJson) as KycSubmissionPayload;
    } catch {
      return { success: false, error: 'Invalid KYC payload.' };
    }

    const files: WizardUploadFiles = {
      proofOfIdentity: toUploadable(formData.get('proofOfIdentity')),
      livenessVideo: toUploadable(formData.get('livenessVideo')),
      proofOfAddress: toUploadable(formData.get('proofOfAddress')),
      incomeVerification: toUploadable(formData.get('incomeVerification')),
    };

    console.info('[registerWithDocs] files', {
      id: files.proofOfIdentity?.size ?? 0,
      liveness: files.livenessVideo?.size ?? 0,
      address: files.proofOfAddress?.size ?? 0,
      income: files.incomeVerification?.size ?? 0,
    });

    if (!files.proofOfIdentity || !files.livenessVideo || !files.proofOfAddress) {
      return {
        success: false,
        error: 'Proof of identity, liveness video, and proof of address are required.',
      };
    }

    const maxBytes = 10 * 1024 * 1024;
    for (const [label, file] of [
      ['Proof of identity', files.proofOfIdentity],
      ['Liveness video', files.livenessVideo],
      ['Proof of address', files.proofOfAddress],
      ['Income verification', files.incomeVerification],
    ] as const) {
      if (file && file.size > maxBytes) {
        return {
          success: false,
          error: `${label} is too large. Please upload a document under 10MB.`,
        };
      }
    }

    const userMeta = {
      full_legal_name: fullLegalName,
      uk_phone: String(kyc.basic?.ukPhone ?? ''),
      postal_code: String(kyc.basic?.postalCode ?? ''),
      date_of_birth: String(kyc.basic?.dateOfBirth ?? ''),
      current_address: String(kyc.basic?.currentAddress ?? ''),
      address_history_3_years: String(kyc.basic?.addressHistory3Years ?? ''),
      proof_of_identity_type: String(kyc.identityMeta?.proofOfIdentityType ?? ''),
      account_role: kyc.role,
      role: kyc.role === 'borrower' ? 'BORROWER' : 'INVESTOR',
      expected_interest_rate: Number.isFinite(expectedInterestRate)
        ? expectedInterestRate
        : FIXED_INTEREST_RATE,
    };

    console.info('[registerWithDocs] auth.signUp', email);
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
      console.error('[registerWithDocs] signUp error:', signUpError.message);
      return { success: false, error: String(signUpError.message) };
    }

    const user = signUpData.user;
    const userId = user?.id ? String(user.id) : null;
    const identities = user?.identities ?? [];

    if (user && identities.length === 0) {
      return {
        success: false,
        error: 'An account with this email already exists. Please sign in instead.',
      };
    }

    if (!userId) {
      return {
        success: false,
        error:
          'Signup succeeded but no user id was returned by Auth. Please try again or contact support.',
      };
    }

    console.info('[registerWithDocs] uploading KYC for', userId);
    const admin = createAdminClient();

    let documents: Awaited<ReturnType<typeof uploadAllKycDocuments>>;
    try {
      documents = await uploadAllKycDocuments(admin, userId, files);
    } catch (uploadError) {
      console.error('🚨 SERVER ACTION CRASHED (upload):', uploadError);
      try {
        await admin.auth.admin.deleteUser(userId);
      } catch {
        // ignore
      }
      return {
        success: false,
        error: toErrorMessage(uploadError) || 'KYC document upload failed. Please try again.',
      };
    }

    if (!documents.proofOfIdentity || !documents.livenessVideo || !documents.proofOfAddress) {
      try {
        await admin.auth.admin.deleteUser(userId);
      } catch {
        // ignore
      }
      return {
        success: false,
        error: 'One or more KYC documents failed to upload. Please retry.',
      };
    }

    console.info('[registerWithDocs] profile upsert', userId);
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
      console.error('[registerWithDocs] profile error:', profileError.message);
      return { success: false, error: String(profileError.message) };
    }

    try {
      await createSubmission(email, fullLegalName, kyc_data);
    } catch (storeError) {
      console.warn('[registerWithDocs] secondary store skipped:', storeError);
    }

    console.info('[registerWithDocs] success', userId);
    return { success: true, userId };
  } catch (error: unknown) {
    console.error('🚨 SERVER ACTION CRASHED:', error);
    const message =
      error && typeof error === 'object' && 'message' in error
        ? String((error as { message?: unknown }).message || 'Unknown internal server error')
        : toErrorMessage(error);
    return {
      success: false,
      error: message || 'Unknown internal server error',
    };
  }
}
