import type { KycSubmissionPayload } from '@/lib/types/kyc';
import type { KycDocumentPaths } from '@/lib/types/profile';

/**
 * Build kyc_data to match AdminDashboard expected shape.
 */
export function buildStoredKycData(payload: KycSubmissionPayload, documents: KycDocumentPaths) {
  return {
    accountRole: payload.role,
    basic: {
      ukPhone: payload.basic.ukPhone,
      postalCode: payload.basic.postalCode,
      dateOfBirth: payload.basic.dateOfBirth,
      currentAddress: payload.basic.currentAddress,
      addressHistory3Years: payload.basic.addressHistory3Years,
    },
    identityMeta: {
      proofOfIdentityType: payload.identityMeta.proofOfIdentityType,
      hasProofOfIdentity: Boolean(documents.proofOfIdentity),
      hasLivenessVideo: Boolean(documents.livenessVideo),
      hasProofOfAddress: Boolean(documents.proofOfAddress),
      idProofPath: documents.proofOfIdentity ?? null,
      livenessPath: documents.livenessVideo ?? null,
      addressProofPath: documents.proofOfAddress ?? null,
    },
    ...(payload.lender ? { lender: payload.lender } : {}),
    ...(payload.borrower ? { borrower: payload.borrower } : {}),
    submittedAt: new Date().toISOString(),
  };
}

export function mapWizardRoleToProfileRole(role: 'lender' | 'borrower'): 'INVESTOR' | 'BORROWER' {
  return role === 'lender' ? 'INVESTOR' : 'BORROWER';
}
