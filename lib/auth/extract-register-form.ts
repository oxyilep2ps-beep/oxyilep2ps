import type {
  InvestorCategory,
  KycSubmissionPayload,
} from '@/lib/types/kyc';
import { STRATEGIC_QUESTIONS, type StrategicAnswer } from '@/lib/questionnaire/strategic-questions';

function text(formData: FormData, key: string): string {
  return String(formData.get(key) ?? '').trim();
}

function optionalText(formData: FormData, key: string): string | null {
  const value = text(formData, key);
  return value || null;
}

function boolFromForm(formData: FormData, key: string): boolean {
  const raw = String(formData.get(key) ?? '')
    .trim()
    .toLowerCase();
  return raw === 'true' || raw === '1' || raw === 'yes' || raw === 'on';
}

function hasField(formData: FormData, ...keys: string[]): boolean {
  return keys.some((key) => formData.has(key));
}

function yesNo(formData: FormData, key: string): StrategicAnswer | '' {
  const raw = text(formData, key);
  if (raw === 'Yes' || raw === 'No') return raw;
  if (raw.toLowerCase() === 'true') return 'Yes';
  if (raw.toLowerCase() === 'false') return 'No';
  return '';
}

function parseAppropriateness(formData: FormData): [number | null, number | null, number | null] {
  const parseOne = (key: string): number | null => {
    const raw = text(formData, key);
    if (raw === '' || raw === 'null') return null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  };
  return [
    parseOne('appropriateness_0'),
    parseOne('appropriateness_1'),
    parseOne('appropriateness_2'),
  ];
}

function asInvestorCategory(value: string): InvestorCategory | '' {
  if (value === 'everyday' || value === 'hnw' || value === 'restricted') return value;
  return '';
}

/**
 * Build questionnaireAnswers from BOTH explicit FormData keys and any nested kyc JSON.
 * Keys are the human-readable labels the admin UI / PDF expect.
 */
function extractQuestionnaireAnswers(
  formData: FormData,
  fromJson?: Record<string, unknown> | null
): Record<string, StrategicAnswer> {
  const answers: Record<string, StrategicAnswer> = {};

  for (const q of STRATEGIC_QUESTIONS) {
    const fromKey = yesNo(formData, q.key);
    const fromAlias =
      q.key === 'uk_resident'
        ? yesNo(formData, 'is_uk_resident')
        : q.key === 'marketing_consent'
          ? yesNo(formData, 'launch_updates')
          : '';
    const chosen = fromKey || fromAlias;
    if (chosen) answers[q.label] = chosen;
  }

  if (fromJson && typeof fromJson === 'object') {
    for (const [key, value] of Object.entries(fromJson)) {
      const normalized =
        value === true || value === 'Yes' || value === 'true'
          ? 'Yes'
          : value === false || value === 'No' || value === 'false'
            ? 'No'
            : null;
      if (!normalized) continue;

      const byKey = STRATEGIC_QUESTIONS.find((q) => q.key === key);
      const label = byKey?.label ?? key;
      if (!answers[label]) answers[label] = normalized;
    }
  }

  return answers;
}

/**
 * Explicit FormData extraction for registration.
 * Flat fields win over nested `kyc` JSON when both are present.
 */
export function extractRegisterPayload(formData: FormData): {
  email: string;
  password: string;
  fullLegalName: string;
  expectedInterestRateRaw: string | null;
  kyc: KycSubmissionPayload;
} {
  const email = text(formData, 'email').toLowerCase();
  const password = String(formData.get('password') ?? '');
  const fullLegalName =
    text(formData, 'fullLegalName') ||
    text(formData, 'full_legal_name') ||
    text(formData, 'legal_name');

  let fromJson: Partial<KycSubmissionPayload> | null = null;
  const kycJson = text(formData, 'kyc');
  if (kycJson) {
    try {
      fromJson = JSON.parse(kycJson) as KycSubmissionPayload;
    } catch {
      fromJson = null;
    }
  }

  const accountRoleRaw =
    text(formData, 'account_role') ||
    text(formData, 'accountRole') ||
    text(formData, 'role') ||
    String(fromJson?.role ?? '');
  const role: 'lender' | 'borrower' =
    accountRoleRaw === 'borrower' || accountRoleRaw === 'BORROWER' ? 'borrower' : 'lender';

  const basic = {
    fullLegalName:
      fullLegalName ||
      text(formData, 'full_legal_name') ||
      String(fromJson?.basic?.fullLegalName ?? ''),
    email: email || text(formData, 'basic_email') || String(fromJson?.basic?.email ?? ''),
    ukPhone: text(formData, 'uk_phone') || text(formData, 'ukPhone') || String(fromJson?.basic?.ukPhone ?? ''),
    postalCode:
      text(formData, 'postal_code') ||
      text(formData, 'postalCode') ||
      String(fromJson?.basic?.postalCode ?? ''),
    dateOfBirth:
      text(formData, 'date_of_birth') ||
      text(formData, 'dateOfBirth') ||
      String(fromJson?.basic?.dateOfBirth ?? ''),
    currentAddress:
      text(formData, 'current_address') ||
      text(formData, 'currentAddress') ||
      String(fromJson?.basic?.currentAddress ?? ''),
    addressHistory3Years:
      text(formData, 'address_history_3_years') ||
      text(formData, 'addressHistory3Years') ||
      String(fromJson?.basic?.addressHistory3Years ?? ''),
  };

  const proofOfIdentityTypeRaw =
    text(formData, 'proof_of_identity_type') ||
    text(formData, 'proofOfIdentityType') ||
    String(fromJson?.identityMeta?.proofOfIdentityType ?? '');
  const proofOfIdentityType =
    proofOfIdentityTypeRaw === 'passport' ||
    proofOfIdentityTypeRaw === 'driving_licence' ||
    proofOfIdentityTypeRaw === 'brp'
      ? proofOfIdentityTypeRaw
      : ('' as const);

  const questionnaireAnswers = extractQuestionnaireAnswers(
    formData,
    (fromJson?.questionnaireAnswers as Record<string, unknown> | undefined) ?? null
  );

  const kyc: KycSubmissionPayload = {
    role,
    basic,
    identityMeta: {
      proofOfIdentityType,
      hasProofOfIdentity:
        boolFromForm(formData, 'has_proof_of_identity') ||
        Boolean(fromJson?.identityMeta?.hasProofOfIdentity),
      hasLivenessVideo:
        boolFromForm(formData, 'has_liveness_video') ||
        Boolean(fromJson?.identityMeta?.hasLivenessVideo),
      hasProofOfAddress:
        boolFromForm(formData, 'has_proof_of_address') ||
        Boolean(fromJson?.identityMeta?.hasProofOfAddress),
    },
    questionnaireAnswers,
  };

  if (role === 'lender') {
    const fromLender = fromJson?.lender;
    const flatAppropriateness = parseAppropriateness(formData);
    const jsonAppropriateness = fromLender?.appropriatenessAnswers;
    const appropriatenessAnswers: [number | null, number | null, number | null] =
      flatAppropriateness.some((v) => v !== null)
        ? flatAppropriateness
        : Array.isArray(jsonAppropriateness) && jsonAppropriateness.length >= 3
          ? [
              jsonAppropriateness[0] ?? null,
              jsonAppropriateness[1] ?? null,
              jsonAppropriateness[2] ?? null,
            ]
          : [null, null, null];

    kyc.lender = {
      investorCategory: asInvestorCategory(
        text(formData, 'investor_category') ||
          text(formData, 'investorCategory') ||
          String(fromLender?.investorCategory ?? '')
      ),
      appropriatenessAnswers,
      sourceOfFunds:
        text(formData, 'source_of_funds') ||
        text(formData, 'sourceOfFunds') ||
        String(fromLender?.sourceOfFunds ?? ''),
      bankSortCode:
        text(formData, 'bank_sort_code') ||
        text(formData, 'bankSortCode') ||
        String(fromLender?.bankSortCode ?? ''),
      bankAccountNumber:
        text(formData, 'bank_account_number') ||
        text(formData, 'bankAccountNumber') ||
        String(fromLender?.bankAccountNumber ?? ''),
    };
  } else {
    const fromBorrower = fromJson?.borrower;
    kyc.borrower = {
      purposeOfLoan:
        text(formData, 'purpose_of_loan') ||
        text(formData, 'purposeOfLoan') ||
        String(fromBorrower?.purposeOfLoan ?? ''),
      employmentStatus:
        text(formData, 'employment_status') ||
        text(formData, 'employmentStatus') ||
        String(fromBorrower?.employmentStatus ?? ''),
      annualIncome:
        text(formData, 'annual_income') ||
        text(formData, 'annualIncome') ||
        String(fromBorrower?.annualIncome ?? ''),
      openBankingConsent: hasField(formData, 'open_banking_consent', 'openBankingConsent')
        ? boolFromForm(formData, 'open_banking_consent') ||
          boolFromForm(formData, 'openBankingConsent')
        : Boolean(fromBorrower?.openBankingConsent),
      creditCheckConsent: hasField(formData, 'credit_check_consent', 'creditCheckConsent')
        ? boolFromForm(formData, 'credit_check_consent') ||
          boolFromForm(formData, 'creditCheckConsent')
        : Boolean(fromBorrower?.creditCheckConsent),
      monthlyRentOrEmi:
        text(formData, 'monthly_rent_or_emi') ||
        text(formData, 'monthlyRentOrEmi') ||
        String(fromBorrower?.monthlyRentOrEmi ?? ''),
      otherMonthlyExpenses:
        text(formData, 'other_monthly_expenses') ||
        text(formData, 'otherMonthlyExpenses') ||
        String(fromBorrower?.otherMonthlyExpenses ?? ''),
      hasIncomeVerification: hasField(formData, 'has_income_verification')
        ? boolFromForm(formData, 'has_income_verification')
        : Boolean(fromBorrower?.hasIncomeVerification) || formData.has('incomeVerification'),
    };
  }

  return {
    email,
    password,
    fullLegalName: basic.fullLegalName || fullLegalName,
    expectedInterestRateRaw: optionalText(formData, 'expected_interest_rate'),
    kyc,
  };
}
