import { createAdminClient } from '@/lib/supabase/admin';
import { extractRegisterPayload } from '@/lib/auth/extract-register-form';
import { uploadAllKycDocuments, type WizardUploadFiles } from '@/lib/kyc/upload';
import { buildStoredKycData, mapWizardRoleToProfileRole } from '@/lib/kyc/build-stored-kyc';
import { buildFcaTestAnswers } from '@/lib/kyc/fca-answers';
import { createSubmission } from '@/lib/data/kyc-store';
import { sendSignupVerificationEmail } from '@/lib/email/send-verification-email';
import { FIXED_INTEREST_RATE } from '@/lib/platform/constants';
import type { SupabaseClient } from '@supabase/supabase-js';

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
 * Generate a Supabase email action link, then deliver it via Resend
 * using the branded “Welcome to the Future of Finance” template.
 * admin.createUser does not trigger Supabase SMTP automatically.
 *
 * Non-blocking: logs link failures and continues; only throws if Resend fails
 * after a valid verificationUrl was obtained (caller may catch).
 */
async function sendVerificationEmailViaResend(
  supabaseAdmin: SupabaseClient,
  params: { email: string; password: string; fullLegalName: string; userMeta: Record<string, unknown> }
): Promise<void> {
  const { email, password, fullLegalName, userMeta } = params;

  const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
    type: 'signup',
    email,
    password,
    options: {
      redirectTo: `${getAppOrigin()}/auth/callback`,
      data: userMeta,
    },
  });

  let verificationUrl = linkData?.properties?.action_link ?? null;

  if (linkError) {
    console.error('🚨 LINK GENERATION FAILED:', linkError);
    // Continue — try magiclink fallback so the user can still verify.
    const { data: magicData, error: magicError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email,
      options: {
        redirectTo: `${getAppOrigin()}/auth/callback`,
      },
    });
    if (magicError) {
      console.error('🚨 MAGICLINK FALLBACK FAILED:', magicError);
      // Do not fail registration — account + docs already saved.
      return;
    }
    verificationUrl = magicData?.properties?.action_link ?? null;
  }

  if (!verificationUrl) {
    console.error('🚨 LINK GENERATION FAILED: no action_link returned');
    return;
  }

  console.info('[registerWithDocs] verificationUrl ready for', email);

  const result = await sendSignupVerificationEmail({
    to: email,
    fullLegalName,
    verificationUrl,
  });

  console.info('[registerWithDocs] welcome/verification email sent via Resend', {
    email,
    messageId: result.messageId,
    from: process.env.EMAIL_FROM || process.env.EMAIL_USER || 'oxyilemoneyquest.support@gmail.com',
  });
}

/**
 * Shared registration + KYC upload pipeline (used by API route AND server action).
 * Never throws — always returns a plain serializable result.
 *
 * Auth: uses service-role admin.createUser (bypasses anon signUp CAPTCHA /
 * enumeration protection / null-user quirks on Vercel).
 *
 * Atomicity: if uploads or profile insert fail AFTER createUser, we roll back
 * the Auth user via admin.deleteUser so retries are not blocked.
 */
export async function runRegisterWithDocs(formData: FormData): Promise<RegisterWithDocsResult> {
  let createdUserId: string | null = null;

  try {
    console.info('[registerWithDocs] start');

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
        'idProof',
        'proofOfIdentity',
        'id_proof',
        'proof_of_identity',
      ]),
      livenessVideo: getUploadableFile(formData, [
        'liveness',
        'livenessVideo',
        'livenessSelfie',
        'liveness_selfie',
        'liveness_video',
      ]),
      proofOfAddress: getUploadableFile(formData, [
        'addressProof',
        'proofOfAddress',
        'address_proof',
        'proof_of_address',
      ]),
      incomeVerification: getUploadableFile(formData, [
        'incomeVerification',
        'income_verification',
        'incomeProof',
      ]),
    };

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
      legal_name: fullLegalName,
      uk_phone: String(kyc.basic?.ukPhone ?? ''),
      postal_code: String(kyc.basic?.postalCode ?? ''),
      date_of_birth: String(kyc.basic?.dateOfBirth ?? ''),
      current_address: String(kyc.basic?.currentAddress ?? ''),
      address_history_3_years: String(kyc.basic?.addressHistory3Years ?? ''),
      proof_of_identity_type: String(kyc.identityMeta?.proofOfIdentityType ?? ''),
      account_role: kyc.role,
      role: kyc.role === 'borrower' ? 'BORROWER' : 'INVESTOR',
      uk_resident: (kyc.questionnaireAnswers ?? {})['Are you a UK resident?'] ?? '',
      understands_risk:
        (kyc.questionnaireAnswers ?? {})['Do you understand P2P lending carries risk?'] ?? '',
      marketing_consent:
        (kyc.questionnaireAnswers ?? {})['May we email you about launch updates?'] ?? '',
      expected_interest_rate: Number.isFinite(expectedInterestRate)
        ? expectedInterestRate
        : FIXED_INTEREST_RATE,
    };

    // Service-role client — admin.createUser + storage + profile upsert + rollback.
    const supabaseAdmin = createAdminClient();

    console.info('[registerWithDocs] admin.createUser', email);
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      // Keep unconfirmed so the user still verifies email.
      email_confirm: false,
      user_metadata: userMeta,
      app_metadata: {
        account_role: kyc.role,
      },
    });

    if (authError) {
      console.error('🚨 ADMIN AUTH ERROR:', authError);
      return {
        success: false,
        error: `Auth Error: ${authError.message}`,
      };
    }

    // Admin API returns a real user when authError is null — no enumeration-protection null shell.
    const userId = authData.user?.id ? String(authData.user.id) : null;
    if (!userId) {
      return {
        success: false,
        error: 'Admin createUser succeeded but returned no user id.',
      };
    }

    createdUserId = userId;
    console.info('[registerWithDocs] auth user created via admin API', userId);

    try {
      // Uploads + profile upsert use this admin-created userId.
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

      const profilePayload = {
        id: userId,
        full_legal_name: fullLegalName,
        email,
        role: profileRole,
        status: 'PENDING' as const,
        account_status: 'active' as const,
        postal_code: kyc.basic.postalCode?.trim().toUpperCase() || null,
        fca_test_answers: fcaTestAnswers,
        proof_of_identity_url: idProofUrl,
        liveness_video_url: livenessUrl,
        proof_of_address_url: addressProofUrl,
        income_verification_url: incomeVerificationUrl,
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

      // After auth + profile succeed: generate verification link and email via Resend.
      // Non-fatal for account creation — surface a soft warning in logs if mail fails.
      try {
        await sendVerificationEmailViaResend(supabaseAdmin, {
          email,
          password,
          fullLegalName,
          userMeta,
        });
      } catch (emailError) {
        console.error('🚨 VERIFICATION EMAIL FAILED (account still created):', emailError);
      }

      console.info('[registerWithDocs] success', userId);
      return { success: true, userId };
    } catch (processError: unknown) {
      console.error('🚨 PIPELINE FAILED after admin.createUser:', processError);

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

    const exactReason = error instanceof Error ? error.message : toErrorMessage(error);
    return {
      success: false,
      error: `Upload Failed: ${exactReason || 'Unknown internal server error'}`,
    };
  }
}
