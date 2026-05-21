/** Invite/approve-only onboarding status (FCA-aligned gatekeeping). */
export enum UserStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export type AccountRole = 'lender' | 'borrower';

export interface UserRecord {
  id: string;
  email: string;
  fullLegalName: string;
  role: AccountRole;
  status: UserStatus;
  submittedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  kyc: import('@/lib/types/profile').StoredKycData;
}
