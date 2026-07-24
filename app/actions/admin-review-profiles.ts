'use server';

import { assertAdmin } from '@/lib/auth/assert-admin';
import { createAdminClient } from '@/lib/supabase/admin';
import { recoverKycPathsFromStorage } from '@/lib/kyc/recover-storage-paths';
import type { KycDocumentPaths, Profile } from '@/lib/types/profile';

const ADMIN_PROFILE_SELECT = [
  'id',
  'email',
  'full_legal_name',
  'postal_code',
  'fca_test_answers',
  'proof_of_identity_url',
  'liveness_video_url',
  'proof_of_address_url',
  'income_verification_url',
  'borrower_sort_code',
  'borrower_account_number',
  'username',
  'bio',
  'avatar_url',
  'cover_url',
  'role',
  'status',
  'account_status',
  'target_amount',
  'expected_interest_rate',
  'collateral_type',
  'collateral_value',
  'collateral_description',
  'collateral_proof_url',
  'kyc_flagged',
  'kyc_data',
  'created_at',
  'updated_at',
  'reviewed_at',
  'reviewed_by',
].join(', ');

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function parseKycData(value: unknown): Record<string, unknown> | null {
  if (isRecord(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    try {
      const parsed = JSON.parse(value) as unknown;
      return isRecord(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }
  return null;
}

function mergeRecoveredIntoKyc(
  kycRaw: unknown,
  paths: KycDocumentPaths
): Record<string, unknown> | null {
  const base = parseKycData(kycRaw) ?? {};
  const identity = isRecord(base.identity) ? { ...base.identity } : {};
  const documents = isRecord(identity.documents) ? { ...identity.documents } : {};
  const identityMeta = isRecord(base.identityMeta) ? { ...base.identityMeta } : {};

  if (paths.proofOfIdentity) {
    documents.proofOfIdentity = paths.proofOfIdentity;
    identityMeta.idProofPath = paths.proofOfIdentity;
    identityMeta.proofOfIdentity = paths.proofOfIdentity;
    identityMeta.hasProofOfIdentity = true;
  }
  if (paths.livenessVideo) {
    documents.livenessVideo = paths.livenessVideo;
    identityMeta.livenessPath = paths.livenessVideo;
    identityMeta.livenessVideo = paths.livenessVideo;
    identityMeta.hasLivenessVideo = true;
  }
  if (paths.proofOfAddress) {
    documents.proofOfAddress = paths.proofOfAddress;
    identityMeta.addressProofPath = paths.proofOfAddress;
    identityMeta.proofOfAddress = paths.proofOfAddress;
    identityMeta.hasProofOfAddress = true;
  }
  if (paths.incomeVerification) {
    documents.incomeVerification = paths.incomeVerification;
    identityMeta.incomeVerificationPath = paths.incomeVerification;
    identityMeta.incomeVerification = paths.incomeVerification;
  }

  identity.documents = documents;

  return {
    ...base,
    identity,
    identityMeta,
  };
}

function normalizeRow(row: Record<string, unknown>): Profile {
  const kyc_data = parseKycData(row.kyc_data);

  return {
    id: String(row.id),
    email: String(row.email ?? ''),
    full_legal_name: String(row.full_legal_name ?? ''),
    postal_code: (row.postal_code as string | null) ?? null,
    fca_test_answers: (row.fca_test_answers as Record<string, string> | null) ?? null,
    proof_of_identity_url: (row.proof_of_identity_url as string | null) ?? null,
    liveness_video_url: (row.liveness_video_url as string | null) ?? null,
    proof_of_address_url: (row.proof_of_address_url as string | null) ?? null,
    income_verification_url: (row.income_verification_url as string | null) ?? null,
    borrower_sort_code: (row.borrower_sort_code as string | null) ?? null,
    borrower_account_number: (row.borrower_account_number as string | null) ?? null,
    username: (row.username as string | null) ?? null,
    bio: (row.bio as string | null) ?? null,
    avatar_url: (row.avatar_url as string | null) ?? null,
    cover_url: (row.cover_url as string | null) ?? null,
    role: row.role as Profile['role'],
    status: row.status as Profile['status'],
    account_status: row.account_status === 'suspended' ? 'suspended' : 'active',
    target_amount: row.target_amount == null ? null : Number(row.target_amount),
    expected_interest_rate: row.expected_interest_rate == null ? null : Number(row.expected_interest_rate),
    collateral_type: (row.collateral_type as string | null) ?? null,
    collateral_value: row.collateral_value == null ? null : Number(row.collateral_value),
    collateral_description: (row.collateral_description as string | null) ?? null,
    collateral_proof_url: (row.collateral_proof_url as string | null) ?? null,
    kyc_flagged: Boolean(row.kyc_flagged),
    kyc_data: (kyc_data as Profile['kyc_data']) ?? null,
    created_at: String(row.created_at ?? ''),
    updated_at: String(row.updated_at ?? ''),
    reviewed_at: (row.reviewed_at as string | null) ?? null,
    reviewed_by: (row.reviewed_by as string | null) ?? null,
  };
}

function questionnaireMissing(kyc: Profile['kyc_data']): boolean {
  if (!isRecord(kyc)) return true;
  const answers = kyc.questionnaireAnswers;
  if (!isRecord(answers)) return true;
  return Object.keys(answers).length === 0;
}

function borrowerBlockMissing(kyc: Profile['kyc_data']): boolean {
  return !isRecord(kyc) || !isRecord(kyc.borrower);
}

async function tryRecoverKycFromLocalStore(
  email: string
): Promise<Record<string, unknown> | null> {
  try {
    const { getAllSubmissions } = await import('@/lib/data/kyc-store');
    const submissions = await getAllSubmissions();
    const match = [...submissions]
      .reverse()
      .find((row) => row.email.trim().toLowerCase() === email.trim().toLowerCase());
    if (!match?.kyc || !isRecord(match.kyc)) return null;
    return match.kyc as Record<string, unknown>;
  } catch {
    return null;
  }
}

async function healMissingDocumentPaths(
  admin: ReturnType<typeof createAdminClient>,
  profile: Profile
): Promise<Profile> {
  const needsDocHeal =
    !profile.proof_of_identity_url ||
    !profile.liveness_video_url ||
    !profile.proof_of_address_url;
  const needsKycHeal =
    questionnaireMissing(profile.kyc_data) ||
    (profile.role === 'BORROWER' && borrowerBlockMissing(profile.kyc_data));

  if (!needsDocHeal && !needsKycHeal) return profile;

  const recovered = needsDocHeal
    ? await recoverKycPathsFromStorage(admin, profile.id)
    : {};
  const localKyc = needsKycHeal ? await tryRecoverKycFromLocalStore(profile.email) : null;

  const mergedPaths = {
    proofOfIdentity: profile.proof_of_identity_url ?? recovered.proofOfIdentity,
    livenessVideo: profile.liveness_video_url ?? recovered.livenessVideo,
    proofOfAddress: profile.proof_of_address_url ?? recovered.proofOfAddress,
    incomeVerification: profile.income_verification_url ?? recovered.incomeVerification,
  };

  const hasAnyPath =
    Boolean(mergedPaths.proofOfIdentity) ||
    Boolean(mergedPaths.livenessVideo) ||
    Boolean(mergedPaths.proofOfAddress) ||
    Boolean(mergedPaths.incomeVerification);

  if (!hasAnyPath && !localKyc) return profile;

  let nextKyc = mergeRecoveredIntoKyc(profile.kyc_data, mergedPaths) ?? {};
  if (localKyc) {
    nextKyc = {
      ...localKyc,
      ...nextKyc,
      questionnaireAnswers:
        (isRecord(nextKyc.questionnaireAnswers) &&
        Object.keys(nextKyc.questionnaireAnswers).length > 0
          ? nextKyc.questionnaireAnswers
          : localKyc.questionnaireAnswers) ?? {},
      borrower: isRecord(nextKyc.borrower) ? nextKyc.borrower : localKyc.borrower,
      lender: isRecord(nextKyc.lender) ? nextKyc.lender : localKyc.lender,
      identity: isRecord(nextKyc.identity) ? nextKyc.identity : localKyc.identity,
      identityMeta: isRecord(nextKyc.identityMeta) ? nextKyc.identityMeta : localKyc.identityMeta,
      basic: isRecord(nextKyc.basic) ? nextKyc.basic : localKyc.basic,
    };
    nextKyc = mergeRecoveredIntoKyc(nextKyc, mergedPaths) ?? nextKyc;
  }

  const next: Profile = {
    ...profile,
    proof_of_identity_url: mergedPaths.proofOfIdentity ?? null,
    liveness_video_url: mergedPaths.livenessVideo ?? null,
    proof_of_address_url: mergedPaths.proofOfAddress ?? null,
    income_verification_url: mergedPaths.incomeVerification ?? null,
    kyc_data: nextKyc as unknown as Profile['kyc_data'],
  };

  // Best-effort persist so PDF / future loads stay fixed.
  try {
    await admin
      .from('profiles')
      .update({
        proof_of_identity_url: next.proof_of_identity_url,
        liveness_video_url: next.liveness_video_url,
        proof_of_address_url: next.proof_of_address_url,
        income_verification_url: next.income_verification_url,
        kyc_data: next.kyc_data,
      })
      .eq('id', profile.id);
  } catch (error) {
    console.warn('[listReviewProfilesAction] heal persist skipped', profile.id, error);
  }

  return next;
}

/**
 * Load review-queue profiles with the service-role client so KYC URL columns
 * and kyc_data are never hidden by client RLS quirks.
 * Also recovers document paths from storage when columns were wiped.
 */
export async function listReviewProfilesAction(
  status: 'PENDING' | 'APPROVED'
): Promise<{ profiles: Profile[]; pendingCount: number; approvedCount: number }> {
  await assertAdmin();
  const admin = createAdminClient();

  const [pendingResult, approvedResult, listResult] = await Promise.all([
    admin.from('profiles').select('id', { count: 'exact', head: true }).eq('status', 'PENDING').neq('role', 'ADMIN'),
    admin.from('profiles').select('id', { count: 'exact', head: true }).eq('status', 'APPROVED').neq('role', 'ADMIN'),
    admin
      .from('profiles')
      .select(ADMIN_PROFILE_SELECT)
      .neq('role', 'ADMIN')
      .eq('status', status)
      .order('created_at', { ascending: false }),
  ]);

  if (listResult.error) {
    throw new Error(listResult.error.message);
  }

  const base = ((listResult.data ?? []) as unknown as Record<string, unknown>[]).map(normalizeRow);
  const profiles = await Promise.all(base.map((profile) => healMissingDocumentPaths(admin, profile)));

  return {
    profiles,
    pendingCount: pendingResult.count ?? 0,
    approvedCount: approvedResult.count ?? 0,
  };
}
