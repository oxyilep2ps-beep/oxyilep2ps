'use server';

import { assertBloggerOrAdmin } from '@/lib/auth/assert-blogger';
import {
  publishSocialPost,
  type SocialStudioChannels,
} from '@/lib/services/socialStudioPublisher';
import { createClient } from '@/lib/supabase/server';

export async function dispatchSocialStudioPost(input: {
  title: string;
  caption: string;
  imageUrl: string | null;
  channels: SocialStudioChannels;
}) {
  await assertBloggerOrAdmin();

  if (!input.channels.linkedin && !input.channels.instagram) {
    return { ok: false as const, error: 'Select LinkedIn, Instagram, or both.' };
  }
  if (!input.caption.trim()) {
    return { ok: false as const, error: 'Write a caption before publishing.' };
  }

  const { results } = await publishSocialPost({
    title: input.title.trim() || 'Oxyile Social Campaign',
    caption: input.caption.trim(),
    imageUrl: input.imageUrl,
    channels: input.channels,
  });

  return { ok: true as const, results };
}

export async function uploadSocialStudioAsset(formData: FormData): Promise<string> {
  await assertBloggerOrAdmin();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');

  const file = formData.get('file');
  if (!(file instanceof File)) throw new Error('No file uploaded');

  const ext = file.name.split('.').pop() || 'jpg';
  const path = `social-studio/${user.id}/${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from('blog-covers').upload(path, file, {
    upsert: true,
    contentType: file.type || 'image/jpeg',
  });
  if (error) throw new Error(error.message);

  return supabase.storage.from('blog-covers').getPublicUrl(path).data.publicUrl;
}
