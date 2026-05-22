'use server';

import { revalidatePath } from 'next/cache';
import { assertAdmin } from '@/lib/auth/assert-admin';
import { createAdminClient } from '@/lib/supabase/admin';

export type AdminProfileRow = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  cover_url: string | null;
  bio: string | null;
  email?: string;
};

export async function getAdminProfile(): Promise<AdminProfileRow | null> {
  const user = await assertAdmin();
  const admin = createAdminClient();

  const { data: row } = await admin.from('admin_profiles').select('*').eq('id', user.id).maybeSingle();

  const { data: authProfile } = await admin
    .from('profiles')
    .select('full_legal_name, email')
    .eq('id', user.id)
    .maybeSingle();

  if (row) {
    return {
      ...(row as AdminProfileRow),
      email: authProfile?.email as string | undefined,
    };
  }

  return {
    id: user.id,
    display_name: (authProfile?.full_legal_name as string) ?? null,
    avatar_url: null,
    cover_url: null,
    bio: null,
    email: authProfile?.email as string | undefined,
  };
}

export async function upsertAdminProfile(input: {
  display_name?: string;
  bio?: string;
  avatar_url?: string;
  cover_url?: string;
}) {
  const user = await assertAdmin();
  const admin = createAdminClient();

  const patch = {
    id: user.id,
    display_name: input.display_name ?? null,
    bio: input.bio ?? null,
    avatar_url: input.avatar_url ?? null,
    cover_url: input.cover_url ?? null,
    updated_at: new Date().toISOString(),
  };

  const { error } = await admin.from('admin_profiles').upsert(patch);
  if (error) throw new Error(error.message);

  revalidatePath('/admin-dashboard/profile');
  return { success: true };
}

export async function uploadAdminProfileImage(
  formData: FormData
): Promise<{ url: string; field: 'avatar_url' | 'cover_url' }> {
  const user = await assertAdmin();
  const admin = createAdminClient();

  const file = formData.get('file');
  const field = formData.get('field') as 'avatar' | 'cover';
  if (!(file instanceof File) || !field) {
    throw new Error('Invalid upload');
  }

  const bucket = field === 'avatar' ? 'avatars' : 'covers';
  const path = `admin/${user.id}/${field}.jpg`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await admin.storage.from(bucket).upload(path, buffer, {
    upsert: true,
    contentType: file.type || 'image/jpeg',
  });

  if (uploadError) throw new Error(uploadError.message);

  const { data } = admin.storage.from(bucket).getPublicUrl(path);
  const dbField = field === 'avatar' ? 'avatar_url' : 'cover_url';

  await upsertAdminProfile({ [dbField]: data.publicUrl });

  return { url: data.publicUrl, field: dbField };
}
