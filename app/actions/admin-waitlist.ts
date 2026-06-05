'use server';

import { assertAdmin } from '@/lib/auth/assert-admin';
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
  return (data ?? []).map((row) => ({
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
  }));
}

export async function getWaitlistUser(id: string): Promise<WaitlistRow | null> {
  await assertAdmin();
  const admin = createAdminClient();
  const { data, error } = await admin.from('waitlist').select('*').eq('id', id).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return {
    id: data.id as string,
    name: data.name as string,
    email: data.email as string,
    phone: (data.phone as string | null) ?? null,
    address: (data.address as string | null) ?? null,
    postal_code: (data.postal_code as string | null) ?? null,
    role: data.role as string,
    target_amount: Number(data.target_amount ?? 0),
    expected_interest_rate: Number(data.expected_interest_rate ?? 0),
    borrower_source_of_income: (data.borrower_source_of_income as string | null) ?? null,
    collateral_type: (data.collateral_type as string | null) ?? null,
    collateral_value: Number(data.collateral_value ?? 0),
    collateral_description: (data.collateral_description as string | null) ?? null,
    collateral_proof_url: (data.collateral_proof_url as string | null) ?? null,
    waitlist_rank: Number(data.waitlist_rank),
    questionnaire_answers: (data.questionnaire_answers as Record<string, string | boolean>) ?? {},
    created_at: data.created_at as string,
  };
}

export async function getCollateralProofSignedUrl(storagePath: string): Promise<string> {
  await assertAdmin();
  const admin = createAdminClient();
  const { data, error } = await admin.storage.from('collateral_documents').createSignedUrl(storagePath, 3600);
  if (error) throw new Error(error.message);
  return data.signedUrl;
}
