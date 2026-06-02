'use server';

import { revalidatePath } from 'next/cache';
import { assertAdmin } from '@/lib/auth/assert-admin';
import { createAdminClient } from '@/lib/supabase/admin';
import { logAdminAction } from '@/app/actions/admin-audit';

export type FlaggedProfileRow = {
  id: string;
  full_legal_name: string;
  email: string;
  role: string;
  status: string;
  kyc_flagged: boolean;
  created_at: string;
};

export async function listFlaggedProfiles(): Promise<FlaggedProfileRow[]> {
  await assertAdmin();
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('profiles')
    .select('id, full_legal_name, email, role, status, kyc_flagged, created_at')
    .eq('kyc_flagged', true)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as FlaggedProfileRow[];
}

export async function clearKycFlag(userId: string) {
  const user = await assertAdmin();
  const admin = createAdminClient();

  const { data: profile } = await admin.from('profiles').select('full_legal_name').eq('id', userId).maybeSingle();

  const { error } = await admin.from('profiles').update({ kyc_flagged: false }).eq('id', userId);
  if (error) throw new Error(error.message);

  await logAdminAction(user.email ?? 'admin', `Cleared KYC fraud flag for ${profile?.full_legal_name ?? userId}`);
  revalidatePath('/admin-dashboard/fraud');
  return { success: true };
}

export async function blockFlaggedUser(userId: string) {
  const user = await assertAdmin();
  const admin = createAdminClient();

  const { data: profile } = await admin.from('profiles').select('full_legal_name').eq('id', userId).maybeSingle();

  const { error } = await admin
    .from('profiles')
    .update({ status: 'REJECTED', kyc_flagged: true })
    .eq('id', userId);

  if (error) throw new Error(error.message);

  await logAdminAction(user.email ?? 'admin', `Blocked flagged user ${profile?.full_legal_name ?? userId}`);
  revalidatePath('/admin-dashboard/fraud');
  revalidatePath('/admin-dashboard/applications');
  return { success: true };
}
