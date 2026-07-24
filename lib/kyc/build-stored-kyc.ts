import type { KycSubmissionPayload } from '@/lib/types/kyc';
import type { KycDocumentPaths } from '@/lib/types/profile';

/**
 * Build kyc_data in BOTH shapes the admin UI / PDF / reject-cleanup expect:
 * - identity.documents.* (canonical paths)
 * - identityMeta.*Path (legacy / signup meta)
 * Always include questionnaireAnswers when present so checkboxes survive preview/PDF.
 */
export function buildStoredKycData(payload: KycSubmissionPayload, documents: KycDocumentPaths) {
  const proofOfIdentity = documents.proofOfIdentity ?? null;
  const livenessVideo = documents.livenessVideo ?? null;
  const proofOfAddress = documents.proofOfAddress ?? null;
  const incomeVerification = documents.incomeVerification ?? null;

  return {
    accountRole: payload.role,
    basic: {
      fullLegalName: payload.basic.fullLegalName,
      email: payload.basic.email,
      ukPhone: payload.basic.ukPhone,
      postalCode: payload.basic.postalCode,
      dateOfBirth: payload.basic.dateOfBirth,
      currentAddress: payload.basic.currentAddress,
      addressHistory3Years: payload.basic.addressHistory3Years,
    },
    // Canonical shape used by schema docs + reject cleanup + some readers
    identity: {
      proofOfIdentityType: payload.identityMeta.proofOfIdentityType,
      documents: {
        proofOfIdentity,
        livenessVideo,
        proofOfAddress,
        incomeVerification,
      },
    },
    // Legacy / alternate shape used by admin normalizeKyc fallbacks
    identityMeta: {
      proofOfIdentityType: payload.identityMeta.proofOfIdentityType,
      hasProofOfIdentity: Boolean(proofOfIdentity),
      hasLivenessVideo: Boolean(livenessVideo),
      hasProofOfAddress: Boolean(proofOfAddress),
      idProofPath: proofOfIdentity,
      livenessPath: livenessVideo,
      addressProofPath: proofOfAddress,
      incomeVerificationPath: incomeVerification,
      proofOfIdentity,
      livenessVideo,
      proofOfAddress,
      incomeVerification,
    },
    ...(payload.lender ? { lender: payload.lender } : {}),
    ...(payload.borrower
      ? {
          borrower: {
            ...payload.borrower,
            hasIncomeVerification: Boolean(
              payload.borrower.hasIncomeVerification || incomeVerification
            ),
          },
        }
      : {}),
    // Always persist questionnaire answers (never omit — empty object if unanswered)
    questionnaireAnswers: payload.questionnaireAnswers ?? {},
    submittedAt: new Date().toISOString(),
  };
}

export function mapWizardRoleToProfileRole(role: 'lender' | 'borrower'): 'INVESTOR' | 'BORROWER' {
  return role === 'lender' ? 'INVESTOR' : 'BORROWER';
}
