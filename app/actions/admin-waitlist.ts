'use server';

import { revalidatePath } from 'next/cache';
import { assertAdmin } from '@/lib/auth/assert-admin';
import { COLLATERAL_TYPES } from '@/lib/collateral/constants';
import { FIXED_INTEREST_RATE } from '@/lib/platform/constants';
import { WAITLIST_INTERNAL_QA_KEYS } from '@/lib/waitlist/admin-edit-fields';
import type { UpdateWaitlistMemberInput } from '@/lib/waitlist/types';
import { createAdminClient } from '@/lib/supabase/admin';

export type WaitlistRow = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  address: string | null;
  postal_code: string | null;
  role: string;
  target_amount: number;
  expected_interest_rate: number;
  borrower_source_of_income: string | null;
  collateral_type: string | null;
  collateral_value: number;
  collateral_description: string | null;
  collateral_proof_url: string | null;
  waitlist_rank: number;
  questionnaire_answers: Record<string, string | boolean>;
  created_at: string;
};

export type { UpdateWaitlistMemberInput } from '@/lib/waitlist/types';

export type WaitlistMetrics = {
  total: number;
  borrowers: number;
  investors: number;
};

export async function getWaitlistMetrics(): Promise<WaitlistMetrics> {
  await assertAdmin();
  const admin = createAdminClient();
  const [total, borrowers, investors] = await Promise.all([
    admin.from('waitlist').select('id', { count: 'exact', head: true }),
    admin.from('waitlist').select('id', { count: 'exact', head: true }).eq('role', 'borrower'),
    admin.from('waitlist').select('id', { count: 'exact', head: true }).eq('role', 'investor'),
  ]);
  return {
    total: total.count ?? 0,
    borrowers: borrowers.count ?? 0,
    investors: investors.count ?? 0,
  };
}

export async function listWaitlistUsers(): Promise<WaitlistRow[]> {
  await assertAdmin();
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('waitlist')
    .select('*')
    .order('waitlist_rank', { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => mapWaitlistRow(row as Record<string, unknown>));
}

export async function getWaitlistUser(id: string): Promise<WaitlistRow | null> {
  await assertAdmin();
  const admin = createAdminClient();
  const { data, error } = await admin.from('waitlist').select('*').eq('id', id).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return mapWaitlistRow(data as Record<string, unknown>);
}

export async function getCollateralProofSignedUrl(storagePath: string): Promise<string> {
  await assertAdmin();
  const admin = createAdminClient();
  const { data, error } = await admin.storage.from('collateral_documents').createSignedUrl(storagePath, 3600);
  if (error) throw new Error(error.message);
  return data.signedUrl;
}

function mapWaitlistRow(row: Record<string, unknown>): WaitlistRow {
  return {
    id: row.id as string,
    name: row.name as string,
    email: row.email as string,
    phone: (row.phone as string | null) ?? null,
    address: (row.address as string | null) ?? null,
    postal_code: (row.postal_code as string | null) ?? null,
    role: row.role as string,
    target_amount: Number(row.target_amount ?? 0),
    expected_interest_rate: Number(row.expected_interest_rate ?? 0),
    borrower_source_of_income: (row.borrower_source_of_income as string | null) ?? null,
    collateral_type: (row.collateral_type as string | null) ?? null,
    collateral_value: Number(row.collateral_value ?? 0),
    collateral_description: (row.collateral_description as string | null) ?? null,
    collateral_proof_url: (row.collateral_proof_url as string | null) ?? null,
    waitlist_rank: Number(row.waitlist_rank),
    questionnaire_answers: (row.questionnaire_answers as Record<string, string | boolean>) ?? {},
    created_at: row.created_at as string,
  };
}

export async function updateWaitlistMember(
  id: string,
  updatedData: UpdateWaitlistMemberInput
): Promise<WaitlistRow> {
  await assertAdmin();
  const admin = createAdminClient();

  const name = updatedData.name.trim();
  const email = updatedData.email.trim().toLowerCase();
  const phone = updatedData.phone?.trim() || null;
  const address = updatedData.address?.trim() || null;
  const postalCode = updatedData.postal_code?.trim() || null;
  const role = updatedData.role;
  const targetAmount = Number(updatedData.target_amount);
  const collateralValue = Number(updatedData.collateral_value);
  const borrowerSource =
    role === 'borrower' ? updatedData.borrower_source_of_income?.trim() || null : null;
  const collateralType = updatedData.collateral_type?.trim() || null;
  const collateralDescription = updatedData.collateral_description?.trim() || null;
  const collateralProofUrl = updatedData.collateral_proof_url?.trim() || null;

  if (!name || !email.includes('@')) {
    throw new Error('Name and a valid email are required');
  }
  if (targetAmount < 0) throw new Error('Target amount must be zero or greater');
  if (collateralValue < 0) throw new Error('Collateral value must be zero or greater');
  if (
    collateralType &&
    !COLLATERAL_TYPES.includes(collateralType as (typeof COLLATERAL_TYPES)[number])
  ) {
    throw new Error('Invalid collateral type');
  }

  const { data: existing, error: fetchError } = await admin
    .from('waitlist')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (fetchError) throw new Error(fetchError.message);
  if (!existing) throw new Error('Waitlist member not found');

  const existingAnswers = (existing.questionnaire_answers as Record<string, string | boolean>) ?? {};
  const cleanedAnswers = Object.fromEntries(
    Object.entries(updatedData.questionnaire_answers).filter(
      ([key]) => !WAITLIST_INTERNAL_QA_KEYS.has(key)
    )
  );

  const questionnaireAnswers: Record<string, string | boolean> = {
    ...existingAnswers,
    ...cleanedAnswers,
    _waitlist_status: updatedData.status,
  };

  delete questionnaireAnswers._user_type;

  const { data, error } = await admin
    .from('waitlist')
    .update({
      name,
      email,
      phone,
      address,
      postal_code: postalCode,
      role,
      target_amount: targetAmount,
      expected_interest_rate: FIXED_INTEREST_RATE,
      borrower_source_of_income: borrowerSource,
      collateral_type: collateralType,
      collateral_value: collateralValue,
      collateral_description: collateralDescription,
      collateral_proof_url: collateralProofUrl,
      questionnaire_answers: questionnaireAnswers,
    })
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw new Error(error.message);

  revalidatePath('/admin-dashboard/waitlist');
  return mapWaitlistRow(data as Record<string, unknown>);
}
