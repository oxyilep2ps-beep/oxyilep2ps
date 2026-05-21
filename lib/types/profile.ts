/** Matches Supabase `profile_role` enum. */
export type ProfileRole = 'ADMIN' | 'INVESTOR' | 'BORROWER';

/** Matches Supabase `profile_status` enum. */
export type ProfileStatus = 'PENDING' | 'APPROVED';

export interface KycDocumentPaths {
  proofOfIdentity?: string | null;
  livenessVideo?: string | null;
  proofOfAddress?: string | null;
  incomeVerification?: string | null;
}

/** Full onboarding payload stored in `profiles.kyc_data` (JSONB). */
export interface StoredKycData {
  accountRole: 'lender' | 'borrower';
  basic: {
    ukPhone: string;
    postalCode?: string;
    dateOfBirth: string;
    currentAddress: string;
    addressHistory3Years: string;
  };
  identityMeta: {
    proofOfIdentityType: string;
    hasProofOfIdentity: boolean;
    hasLivenessVideo: boolean;
    hasProofOfAddress: boolean;
    idProofPath?: string | null;
    livenessPath?: string | null;
    addressProofPath?: string | null;
  };
  lender?: {
    investorCategory: string;
    appropriatenessAnswers: (number | null)[];
    sourceOfFunds: string;
    bankSortCode: string;
    bankAccountNumber: string;
  };
  borrower?: {
    purposeOfLoan: string;
    employmentStatus: string;
    annualIncome: string;
    openBankingConsent: boolean;
    creditCheckConsent: boolean;
    monthlyRentOrEmi: string;
    otherMonthlyExpenses: string;
  };
  submittedAt: string;
}

export interface Profile {
  id: string;
  email: string;
  full_legal_name: string;
  postal_code?: string | null;
  borrower_sort_code?: string | null;
  borrower_account_number?: string | null;
  username?: string | null;
  bio?: string | null;
  avatar_url?: string | null;
  cover_url?: string | null;
  role: ProfileRole;
  status: ProfileStatus;
  kyc_data: StoredKycData | null;
  created_at: string;
  updated_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
}
