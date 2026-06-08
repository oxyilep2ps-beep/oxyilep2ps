import type { AccountRole } from '@/lib/types/user';

/** Step 1 — basic identity & UK address history (FCA KYC baseline). */
export interface BasicDetailsStep {
  fullLegalName: string;
  email: string;
  ukPhone: string;
  postalCode: string;
  dateOfBirth: string;
  currentAddress: string;
  addressHistory3Years: string;
}

/** Step 2 — identity, AML, and proof-of-address artefacts. */
export interface IdentityAmlStep {
  proofOfIdentity: File | null;
  proofOfIdentityType: 'passport' | 'driving_licence' | 'brp' | '';
  livenessVideo: File | null;
  proofOfAddress: File | null;
}

export type InvestorCategory = 'everyday' | 'hnw' | 'restricted';

export interface LenderDetailsStep {
  investorCategory: InvestorCategory | '';
  appropriatenessAnswers: [number | null, number | null, number | null];
  sourceOfFunds: string;
  bankSortCode: string;
  bankAccountNumber: string;
}

export interface BorrowerDetailsStep {
  purposeOfLoan: string;
  employmentStatus: string;
  annualIncome: string;
  incomeVerificationFile: File | null;
  openBankingConsent: boolean;
  creditCheckConsent: boolean;
  monthlyRentOrEmi: string;
  otherMonthlyExpenses: string;
}

/** Aggregated wizard payload persisted on submission. */
export interface KycSubmissionPayload {
  role: AccountRole;
  basic: BasicDetailsStep;
  identityMeta: {
    proofOfIdentityType: IdentityAmlStep['proofOfIdentityType'];
    hasProofOfIdentity: boolean;
    hasLivenessVideo: boolean;
    hasProofOfAddress: boolean;
  };
  lender?: Omit<LenderDetailsStep, never>;
  borrower?: Omit<BorrowerDetailsStep, 'incomeVerificationFile'> & {
    hasIncomeVerification: boolean;
  };
  /** Strategic Yes/No questionnaire (Phase 19). */
  questionnaireAnswers?: Record<string, 'Yes' | 'No'>;
}
