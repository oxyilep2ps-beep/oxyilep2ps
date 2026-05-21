import type { SupabaseClient } from '@supabase/supabase-js';

export async function uploadProfileImage(
  supabase: SupabaseClient,
  userId: string,
  bucket: 'avatars' | 'covers',
  file: Blob,
  filename: string
): Promise<string> {
  const path = `${userId}/${filename}`;
  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    upsert: true,
    contentType: file.type || 'image/jpeg',
  });

  if (error) throw new Error(error.message);

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}
