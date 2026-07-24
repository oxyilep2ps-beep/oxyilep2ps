import { createClient } from '@supabase/supabase-js';
import { createAdminClient } from '@/lib/supabase/admin';
import { extractRegisterPayload } from '@/lib/auth/extract-register-form';
import { uploadAllKycDocuments, type WizardUploadFiles } from '@/lib/kyc/upload';
import { buildStoredKycData, mapWizardRoleToProfileRole } from '@/lib/kyc/build-stored-kyc';
import { buildFcaTestAnswers } from '@/lib/kyc/fca-answers';
import { createSubmission } from '@/lib/data/kyc-store';
import { FIXED_INTEREST_RATE } from '@/lib/platform/constants';

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

/** Read a file from FormData trying several exact key aliases. */
function getUploadableFile(
  formData: FormData,
  keys: string[]
): WizardUploadFiles[keyof WizardUploadFiles] {
  for (const key of keys) {
    const value = formData.get(key);
    const file = toUploadable(value);
    if (file) return file;
  }
  return null;
}

function logExtractedFile(label: string, file: WizardUploadFiles[keyof WizardUploadFiles]) {
  if (file) {
    console.log(`🚨 EXTRACTED ${label}:`, `Name: ${file.name}, Size: ${file.size}`);
  } else {
    console.log(`🚨 EXTRACTED ${label}:`, 'MISSING!');
  }
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

    // EPIC 1 — extract EVERY text field explicitly (flat FormData + nested kyc JSON).
    const extracted = extractRegisterPayload(formData);
    const { email, password, fullLegalName, kyc } = extracted;
    const expectedInterestRate = Number(
      extracted.expectedInterestRateRaw ?? FIXED_INTEREST_RATE
    );

    if (!email || !password || !fullLegalName) {
      return {
        success: false,
        error: 'Email, password, and full legal name are required.',
      };
    }

    if (!kyc.role || (!kyc.basic.ukPhone && !kyc.basic.dateOfBirth)) {
      // Soft guard: still require a usable KYC payload
      if (!formData.get('kyc') && Object.keys(kyc.questionnaireAnswers ?? {}).length === 0) {
        return {
          success: false,
          error: 'KYC questionnaire and basic details are required.',
        };
      }
    }

    if (password.length < 8) {
      return { success: false, error: 'Password must be at least 8 characters.' };
    }

    const files: WizardUploadFiles = {
      proofOfIdentity: getUploadableFile(formData, [
        'proofOfIdentity',
        'idProof',
        'id_proof',
        'proof_of_identity',
      ]),
      livenessVideo: getUploadableFile(formData, [
        'livenessVideo',
        'livenessSelfie',
        'liveness_selfie',
        'liveness_video',
        'liveness',
      ]),
      proofOfAddress: getUploadableFile(formData, [
        'proofOfAddress',
        'addressProof',
        'address_proof',
        'proof_of_address',
      ]),
      incomeVerification: getUploadableFile(formData, [
        'incomeVerification',
        'income_verification',
        'incomeProof',
      ]),
    };

    // EPIC 2 — strict terminal logs so we can see if files reached the server
    logExtractedFile('ID PROOF', files.proofOfIdentity);
    logExtractedFile('LIVENESS SELFIE', files.livenessVideo);
    logExtractedFile('ADDRESS PROOF', files.proofOfAddress);
    logExtractedFile('INCOME VERIFICATION', files.incomeVerification);

    console.log(
      '🧾 FormData file keys present:',
      [...formData.keys()].filter((k) =>
        /proof|id|liveness|address|income|video|selfie|document/i.test(k)
      )
    );

    // Mark identity flags from actual files when flat flags were omitted.
    kyc.identityMeta.hasProofOfIdentity =
      kyc.identityMeta.hasProofOfIdentity || Boolean(files.proofOfIdentity);
    kyc.identityMeta.hasLivenessVideo =
      kyc.identityMeta.hasLivenessVideo || Boolean(files.livenessVideo);
    kyc.identityMeta.hasProofOfAddress =
      kyc.identityMeta.hasProofOfAddress || Boolean(files.proofOfAddress);
    if (kyc.borrower) {
      kyc.borrower.hasIncomeVerification =
        kyc.borrower.hasIncomeVerification || Boolean(files.incomeVerification);
    }

    console.info('[registerWithDocs] extracted fields', {
      email,
      fullLegalName,
      accountRole: kyc.role,
      questionnaireKeys: Object.keys(kyc.questionnaireAnswers ?? {}),
      questionnaireAnswers: kyc.questionnaireAnswers,
      hasBorrower: Boolean(kyc.borrower),
      hasLender: Boolean(kyc.lender),
      id: files.proofOfIdentity?.size ?? 0,
      liveness: files.livenessVideo?.size ?? 0,
      address: files.proofOfAddress?.size ?? 0,
      income: files.incomeVerification?.size ?? 0,
    });

    // EPIC 2 — explicit per-file presence/empty checks (exact reason to UI).
    if (!files.proofOfIdentity || files.proofOfIdentity.size === 0) {
      return { success: false, error: 'ID Proof file is missing or empty.' };
    }
    if (!files.livenessVideo || files.livenessVideo.size === 0) {
      return { success: false, error: 'Liveness selfie/video file is missing or empty.' };
    }
    if (!files.proofOfAddress || files.proofOfAddress.size === 0) {
      return { success: false, error: 'Address Proof file is missing or empty.' };
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
      // Flat questionnaire safety net for trigger / debugging (full blob written on profile upsert)
      uk_resident: (kyc.questionnaireAnswers ?? {})['Are you a UK resident?'] ?? '',
      understands_risk:
        (kyc.questionnaireAnswers ?? {})['Do you understand P2P lending carries risk?'] ?? '',
      marketing_consent:
        (kyc.questionnaireAnswers ?? {})['May we email you about launch updates?'] ?? '',
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

    if (!userId || identities.length === 0) {
      return {
        success: false,
        error:
          'This email is already registered. Please log in or use a different email address.',
      };
    }

    createdUserId = userId;
    console.info('[registerWithDocs] auth user created', userId);

    const supabaseAdmin = createAdminClient();

    try {
      // EPIC 2 — ArrayBuffer uploads; paths (and public mirror) mapped after success.
      console.info('[registerWithDocs] uploading KYC documents for', userId);
      const documents = await uploadAllKycDocuments(supabaseAdmin, userId, files);

      const idProofUrl = documents.proofOfIdentity ?? null;
      const livenessUrl = documents.livenessVideo ?? null;
      const addressProofUrl = documents.proofOfAddress ?? null;
      const incomeVerificationUrl = documents.incomeVerification ?? null;

      if (!idProofUrl || !livenessUrl || !addressProofUrl) {
        throw new Error('One or more KYC documents failed to upload. Please retry.');
      }

      console.info('[registerWithDocs] storage uploads succeeded', {
        userId,
        idProofUrl,
        livenessUrl,
        addressProofUrl,
        incomeVerificationUrl,
      });

      // EPIC 3 — comprehensive profile upsert with ALL text fields + document paths.
      const kyc_data = buildStoredKycData(kyc, {
        proofOfIdentity: idProofUrl,
        livenessVideo: livenessUrl,
        proofOfAddress: addressProofUrl,
        incomeVerification: incomeVerificationUrl,
      });
      const profileRole = mapWizardRoleToProfileRole(kyc.role);
      const fcaTestAnswers =
        kyc.role === 'lender' && kyc.lender
          ? buildFcaTestAnswers(kyc.lender.appropriatenessAnswers)
          : {};

      console.info('[registerWithDocs] profile upsert', {
        userId,
        role: profileRole,
        questionnaireAnswers: kyc_data.questionnaireAnswers,
      });

      console.info('[registerWithDocs] profile upsert payload document columns', {
        proof_of_identity_url: idProofUrl,
        liveness_video_url: livenessUrl,
        proof_of_address_url: addressProofUrl,
        income_verification_url: incomeVerificationUrl,
      });

      const profilePayload = {
        id: userId,
        full_legal_name: fullLegalName,
        email,
        role: profileRole,
        status: 'PENDING' as const,
        account_status: 'active' as const,
        postal_code: kyc.basic.postalCode?.trim().toUpperCase() || null,
        fca_test_answers: fcaTestAnswers,
        // Document columns — EXACT schema names (not id_proof_url)
        proof_of_identity_url: idProofUrl,
        liveness_video_url: livenessUrl,
        proof_of_address_url: addressProofUrl,
        income_verification_url: incomeVerificationUrl,
        // Flat Yes/No questionnaire columns (admin + kyc_data dual write)
        is_uk_resident:
          (kyc.questionnaireAnswers ?? {})['Are you a UK resident?'] ?? null,
        understands_p2p_risk:
          (kyc.questionnaireAnswers ?? {})['Do you understand P2P lending carries risk?'] ?? null,
        marketing_consent:
          (kyc.questionnaireAnswers ?? {})['May we email you about launch updates?'] ?? null,
        expected_interest_rate: Number.isFinite(expectedInterestRate)
          ? expectedInterestRate
          : FIXED_INTEREST_RATE,
        kyc_data,
      };

      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .upsert(profilePayload, { onConflict: 'id' });

      if (profileError) {
        throw new Error(profileError.message);
      }

      const { data: verified, error: verifyError } = await supabaseAdmin
        .from('profiles')
        .select(
          'proof_of_identity_url, liveness_video_url, proof_of_address_url, income_verification_url, is_uk_resident, understands_p2p_risk, marketing_consent, kyc_data'
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
        ) ||
        Boolean(
          savedKyc &&
            (savedKyc.identityMeta as { idProofPath?: string } | undefined)?.idProofPath
        );
      const hasQuestionnaire =
        Boolean(savedKyc?.questionnaireAnswers) &&
        typeof savedKyc?.questionnaireAnswers === 'object' &&
        Object.keys(savedKyc.questionnaireAnswers as object).length > 0;
      const expectsQuestionnaire = Object.keys(kyc.questionnaireAnswers ?? {}).length > 0;

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

      // EPIC 1 — surface the EXACT reason to the UI (visible in Vercel prod).
      const exactReason = toErrorMessage(processError);
      return {
        success: false,
        error: `Upload Failed: ${exactReason || 'account creation was rolled back. Please try again.'}`,
      };
    }
  } catch (error: unknown) {
    console.error('🚨 VERCEL SERVER ACTION CRASH:', error);

    if (createdUserId) {
      try {
        const supabaseAdmin = createAdminClient();
        await supabaseAdmin.auth.admin.deleteUser(createdUserId);
        console.info('🚨 Rollback executed (outer catch): Deleted orphaned user', createdUserId);
      } catch (rollbackError) {
        console.error('🚨 Outer rollback failed for', createdUserId, rollbackError);
      }
    }

    // EPIC 1 — never return a generic error; include the exact reason.
    const exactReason = error instanceof Error ? error.message : toErrorMessage(error);
    return {
      success: false,
      error: `Upload Failed: ${exactReason || 'Unknown internal server error'}`,
    };
  }
}
