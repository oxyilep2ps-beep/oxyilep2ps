'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { assertAdmin } from '@/lib/auth/assert-admin';
import type { KycDocumentPaths } from '@/lib/types/profile';

const KYC_BUCKET = 'kyc-documents';

function collectStoragePaths(kyc: { identity?: { documents?: KycDocumentPaths } } | null): string[] {
  const docs = kyc?.identity?.documents;
  if (!docs) return [];
  return Object.values(docs).filter((p): p is string => Boolean(p));
}

export async function approveUserAction(userId: string) {
  const adminUser = await assertAdmin();
  const supabase = await createClient();

  const { error } = await supabase
    .from('profiles')
    .update({
      status: 'APPROVED',
      reviewed_at: new Date().toISOString(),
      reviewed_by: adminUser.email,
    })
    .eq('id', userId);

  if (error) throw new Error(error.message);

  revalidatePath('/admin-dashboard');
  return { success: true };
}

/** Hard delete: storage files, profile row, and auth user. */
export async function rejectUserAction(userId: string) {
  await assertAdmin();

  const admin = createAdminClient();

  const { data: profile } = await admin.from('profiles').select('kyc_data').eq('id', userId).maybeSingle();

  const paths = collectStoragePaths(profile?.kyc_data as { identity?: { documents?: KycDocumentPaths } });
  if (paths.length) {
    await admin.storage.from(KYC_BUCKET).remove(paths);
  }

  const { data: folderFiles } = await admin.storage.from(KYC_BUCKET).list(userId);
  if (folderFiles?.length) {
    await admin.storage.from(KYC_BUCKET).remove(folderFiles.map((f) => `${userId}/${f.name}`));
  }

  await admin.from('profiles').delete().eq('id', userId);

  const { error: authError } = await admin.auth.admin.deleteUser(userId);
  if (authError) throw new Error(authError.message);

  revalidatePath('/admin-dashboard');
  return { success: true };
}

export async function getKycSignedUrlAction(storagePath: string) {
  await assertAdmin();
  const admin = createAdminClient();
  const { data, error } = await admin.storage.from(KYC_BUCKET).createSignedUrl(storagePath, 3600);
  if (error) throw new Error(error.message);
  return data.signedUrl;
}
