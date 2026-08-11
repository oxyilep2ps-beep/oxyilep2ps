'use server';

import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';
import { extractSocialMediaStoragePath, SOCIAL_MEDIA_BUCKET } from '@/lib/social/storage';

export type CleanUpStorageMediaResult =
  | { ok: true; path: string; campaignId?: string }
  | { ok: false; error: string };

/**
 * Ghost Storage: delete the heavy blob from `social-media` after syndication.
 * Keeps the social_campaigns row (and metrics) intact for analytics.
 *
 * Prefer calling this from Make.com's final HTTP module via
 * GET/POST /api/webhooks/cleanup — so Instagram/LinkedIn have already pulled the file.
 */
export async function cleanUpStorageMedia(
  fileUrl: string,
  options?: { campaignId?: string }
): Promise<CleanUpStorageMediaResult> {
  try {
    const path = extractSocialMediaStoragePath(fileUrl);
    if (!path) {
      return { ok: false, error: 'Could not resolve a social-media storage path from URL.' };
    }

    const admin = createAdminClient();
    const { error } = await admin.storage.from(SOCIAL_MEDIA_BUCKET).remove([path]);
    if (error) {
      console.error('[cleanUpStorageMedia]', error);
      return { ok: false, error: error.message };
    }

    // Optional: blank image_url so UIs show archived without waiting for 404.
    // Campaign row + metrics stay forever.
    if (options?.campaignId) {
      await admin
        .from('social_campaigns')
        .update({
          image_url: '',
          updated_at: new Date().toISOString(),
        })
        .eq('id', options.campaignId);
    } else if (fileUrl.trim()) {
      await admin
        .from('social_campaigns')
        .update({
          image_url: '',
          updated_at: new Date().toISOString(),
        })
        .eq('image_url', fileUrl.trim());
    }

    revalidatePath('/social');
    revalidatePath('/social/studio');
    revalidatePath('/social/analytics');
    revalidatePath('/admin-dashboard/social-reviews');

    return { ok: true, path, campaignId: options?.campaignId };
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Ghost storage cleanup failed';
    console.error('[cleanUpStorageMedia]', e);
    return { ok: false, error: message };
  }
}
