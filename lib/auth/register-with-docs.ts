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
 *
 * Atomicity: if uploads or profile insert fail AFTER auth.signUp, we roll back
 * the Auth user via the service-role admin client so retries are not blocked.
 */
export async function runRegisterWithDocs(formData: FormData): Promise<RegisterWithDocsResult> {
  let createdUserId: string | null = null;

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
    const { data: authData, error: authError } = await authClient.auth.signUp({
      email,
      password,
      options: {
        data: userMeta,
        emailRedirectTo: `${getAppOrigin()}/auth/callback`,
      },
    });

    if (authError) {
      console.error('[registerWithDocs] signUp error:', authError.message);
      const msg = String(authError.message || '');
      if (/already|registered|exists/i.test(msg)) {
        return {
          success: false,
          error:
            'This email is already registered. Please log in or use a different email address.',
        };
      }
      return { success: false, error: msg };
    }

    // CRITICAL: use authData.user.id — NEVER authData.session (null when email confirm is on).
    const userId = authData.user?.id ? String(authData.user.id) : null;
    const identities = authData.user?.identities ?? [];

    // Email enumeration protection / duplicate email: 200 OK but user is null,
    // or a user shell with empty identities.
    if (!userId || identities.length === 0) {
      return {
        success: false,
        error:
          'This email is already registered. Please log in or use a different email address.',
      };
    }

    createdUserId = userId;
    console.info('[registerWithDocs] auth user created', userId);

    // Service-role client — required for auth.admin.deleteUser rollback.
    const supabaseAdmin = createAdminClient();

    // ── Inner try: uploads + profile insert. On failure → Auth rollback. ──
    try {
      console.info('[registerWithDocs] uploading KYC documents for', userId);
      const documents = await uploadAllKycDocuments(supabaseAdmin, userId, files);

      if (!documents.proofOfIdentity || !documents.livenessVideo || !documents.proofOfAddress) {
        throw new Error('One or more KYC documents failed to upload. Please retry.');
      }

      console.info('[registerWithDocs] storage uploads succeeded', {
        userId,
        paths: documents,
      });

      const kyc_data = buildStoredKycData(kyc, documents);
      const profileRole = mapWizardRoleToProfileRole(kyc.role);
      const fcaTestAnswers =
        kyc.role === 'lender' && kyc.lender
          ? buildFcaTestAnswers(kyc.lender.appropriatenessAnswers)
          : {};

      console.info('[registerWithDocs] profile upsert', userId);
      const { error: profileError } = await supabaseAdmin.from('profiles').upsert(
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
        throw new Error(profileError.message);
      }

      // Verify paths actually landed — catch schema/trigger wipe issues early.
      const { data: verified, error: verifyError } = await supabaseAdmin
        .from('profiles')
        .select(
          'proof_of_identity_url, liveness_video_url, proof_of_address_url, income_verification_url, kyc_data'
        )
        .eq('id', userId)
        .maybeSingle();

      if (verifyError) {
        throw new Error(verifyError.message);
      }

      const savedId = verified?.proof_of_identity_url;
      const savedLiveness = verified?.liveness_video_url;
      const savedAddress = verified?.proof_of_address_url;
      const savedKyc =
        verified?.kyc_data && typeof verified.kyc_data === 'object'
          ? (verified.kyc_data as Record<string, unknown>)
          : null;
      const hasIdentityDocs =
        Boolean(
          savedKyc &&
            typeof savedKyc.identity === 'object' &&
            savedKyc.identity &&
            (savedKyc.identity as { documents?: { proofOfIdentity?: string } }).documents
              ?.proofOfIdentity
        ) || Boolean(savedKyc && (savedKyc.identityMeta as { idProofPath?: string } | undefined)?.idProofPath);
      const hasQuestionnaire =
        Boolean(savedKyc?.questionnaireAnswers) &&
        typeof savedKyc?.questionnaireAnswers === 'object' &&
        Object.keys(savedKyc.questionnaireAnswers as object).length > 0;
      const expectsQuestionnaire =
        Boolean(kyc.questionnaireAnswers) && Object.keys(kyc.questionnaireAnswers ?? {}).length > 0;

      if (!savedId || !savedLiveness || !savedAddress || !hasIdentityDocs) {
        console.error('[registerWithDocs] verify failed — paths/kyc missing after upsert', {
          userId,
          savedId,
          savedLiveness,
          savedAddress,
          hasIdentityDocs,
          kyc_data: verified?.kyc_data,
        });
        throw new Error(
          'KYC documents uploaded but profile paths were not saved. Please apply the latest Supabase migrations and try again.'
        );
      }

      if (expectsQuestionnaire && !hasQuestionnaire) {
        console.error('[registerWithDocs] verify failed — questionnaireAnswers missing', {
          userId,
          kyc_data: verified?.kyc_data,
        });
        throw new Error(
          'Questionnaire answers were not saved to the profile. Please apply the latest Supabase migrations and try again.'
        );
      }

      console.info('[registerWithDocs] profile upsert verified', {
        userId,
        savedId,
        savedLiveness,
        savedAddress,
        hasQuestionnaire,
      });

      try {
        await createSubmission(email, fullLegalName, kyc_data);
      } catch (storeError) {
        console.warn('[registerWithDocs] secondary store skipped:', storeError);
      }

      console.info('[registerWithDocs] success', userId);
      return { success: true, userId };
    } catch (processError: unknown) {
      console.error('🚨 PIPELINE FAILED after auth.signUp:', processError);

      // ROLLBACK: delete orphaned Auth user so the email can be reused.
      if (userId) {
        try {
          const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);
          if (deleteError) {
            console.error('🚨 Rollback FAILED to delete orphaned user', userId, deleteError.message);
          } else {
            console.info('🚨 Rollback executed: Deleted orphaned user', userId);
          }
        } catch (rollbackError) {
          console.error('🚨 Rollback threw while deleting orphaned user', userId, rollbackError);
        }
      }

      createdUserId = null;

      return {
        success: false,
        error:
          toErrorMessage(processError) ||
          'Failed to process documents. Your account creation was rolled back. Please try again.',
      };
    }
  } catch (error: unknown) {
    console.error('🚨 SERVER ACTION CRASHED:', error);

    // Last-resort rollback if Auth user was created before an unexpected outer failure.
    if (createdUserId) {
      try {
        const supabaseAdmin = createAdminClient();
        await supabaseAdmin.auth.admin.deleteUser(createdUserId);
        console.info('🚨 Rollback executed (outer catch): Deleted orphaned user', createdUserId);
      } catch (rollbackError) {
        console.error('🚨 Outer rollback failed for', createdUserId, rollbackError);
      }
    }

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
