/**
 * Make.com syndication bridge for Social Manager / Admin Approve & Publish.
 * Primary URL: SOCIAL_SYNDICATION_WEBHOOK_URL
 * Fallback:    NEXT_PUBLIC_SOCIAL_WEBHOOK_URL
 */

import { normalizeSocialMediaType } from '@/lib/social/media';
import type { SocialMediaType } from '@/lib/social/types';

export type MakeWebhookChannels = {
  linkedin: boolean;
  instagram: boolean;
};

export type MakeWebhookPostData = {
  title: string;
  caption: string;
  image_url: string;
  media_type?: SocialMediaType | 'image' | 'video';
  channels: MakeWebhookChannels;
  campaign_id?: string;
  cleanup_callback_url?: string;
};

export type MakeWebhookPayload = {
  title: string;
  caption: string;
  image_url: string;
  media_type: SocialMediaType;
  channels: MakeWebhookChannels;
  approved_at: string;
  source: 'Oxyile Social Manager Portal';
  campaign_id: string | null;
  /** Make.com should HTTP GET/POST this after platforms have downloaded the media */
  cleanup_callback_url: string | null;
};

export type MakeWebhookResult =
  | { success: true; status: number }
  | { success: false; error: string; status?: number };

export type SocialStudioChannels = MakeWebhookChannels;

export type SocialStudioPostInput = {
  title: string;
  caption: string;
  imageUrl: string | null;
  mediaType?: SocialMediaType | 'image' | 'video';
  channels: SocialStudioChannels;
};

export type ChannelPublishResult = {
  channel: 'linkedin' | 'instagram' | 'make';
  ok: boolean;
  skipped?: boolean;
  message: string;
};

export function resolveSocialSyndicationWebhookUrl(): string | null {
  return (
    process.env.SOCIAL_SYNDICATION_WEBHOOK_URL?.trim() ||
    process.env.NEXT_PUBLIC_SOCIAL_WEBHOOK_URL?.trim() ||
    null
  );
}

function resolveAppOrigin(): string | null {
  const explicit =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (explicit) {
    return explicit.startsWith('http') ? explicit.replace(/\/$/, '') : `https://${explicit.replace(/\/$/, '')}`;
  }
  if (process.env.VERCEL_URL?.trim()) {
    return `https://${process.env.VERCEL_URL.trim().replace(/\/$/, '')}`;
  }
  return null;
}

/** Build Make.com cleanup callback for Ghost Storage. */
export function buildCleanupCallbackUrl(imageUrl: string, campaignId?: string): string | null {
  const origin = resolveAppOrigin();
  if (!origin || !imageUrl.trim()) return null;

  const params = new URLSearchParams({ url: imageUrl.trim() });
  if (campaignId) params.set('campaignId', campaignId);

  const secret = process.env.SOCIAL_CLEANUP_WEBHOOK_SECRET?.trim();
  if (secret) params.set('secret', secret);

  return `${origin}/api/webhooks/cleanup?${params.toString()}`;
}

function buildPayload(postData: MakeWebhookPostData): MakeWebhookPayload {
  const mediaType = normalizeSocialMediaType(postData.media_type ?? 'post');
  const cleanup =
    postData.cleanup_callback_url ??
    buildCleanupCallbackUrl(postData.image_url, postData.campaign_id) ??
    null;

  return {
    title: postData.title.trim(),
    caption: postData.caption.trim(),
    image_url: postData.image_url.trim(),
    media_type: mediaType,
    channels: {
      linkedin: Boolean(postData.channels.linkedin),
      instagram: Boolean(postData.channels.instagram),
    },
    approved_at: new Date().toISOString(),
    source: 'Oxyile Social Manager Portal',
    campaign_id: postData.campaign_id?.trim() || null,
    cleanup_callback_url: cleanup,
  };
}

/**
 * POST standardized JSON to Make.com.
 * Stories may send empty title/caption; Posts/Reels require them.
 * Includes cleanup_callback_url so Make can purge the blob after platforms download it.
 */
export async function publishToMakeWebhook(postData: MakeWebhookPostData): Promise<MakeWebhookResult> {
  const mediaType = normalizeSocialMediaType(postData.media_type ?? 'post');
  const title = postData.title?.trim() ?? '';
  const caption = postData.caption?.trim() ?? '';
  const imageUrl = postData.image_url?.trim() ?? '';

  if (mediaType !== 'story' && !title) {
    const error = 'Webhook payload missing required field: title';
    console.error('[publishToMakeWebhook]', error);
    return { success: false, error };
  }
  if (mediaType !== 'story' && !caption) {
    const error = 'Webhook payload missing required field: caption';
    console.error('[publishToMakeWebhook]', error);
    return { success: false, error };
  }
  if (!imageUrl) {
    const error = 'Webhook payload missing required field: image_url';
    console.error('[publishToMakeWebhook]', error);
    return { success: false, error };
  }
  if (!postData.channels?.linkedin && !postData.channels?.instagram) {
    const error = 'Webhook payload requires at least one channel (linkedin or instagram)';
    console.error('[publishToMakeWebhook]', error);
    return { success: false, error };
  }

  const webhookUrl = resolveSocialSyndicationWebhookUrl();
  if (!webhookUrl) {
    const error =
      'SOCIAL_SYNDICATION_WEBHOOK_URL (or NEXT_PUBLIC_SOCIAL_WEBHOOK_URL) is not defined in environment';
    console.error('[publishToMakeWebhook]', error);
    return { success: false, error };
  }

  const payload = buildPayload({
    title: mediaType === 'story' ? '' : title,
    caption: mediaType === 'story' ? '' : caption,
    image_url: imageUrl,
    channels: postData.channels,
    media_type: mediaType,
    campaign_id: postData.campaign_id,
    cleanup_callback_url: postData.cleanup_callback_url,
  });

  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const error = `Make.com webhook returned HTTP ${res.status}`;
      console.error('[publishToMakeWebhook]', error, payload);
      return { success: false, error, status: res.status };
    }

    return { success: true, status: res.status };
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Make.com webhook request failed';
    console.error('[publishToMakeWebhook]', error);
    return { success: false, error };
  }
}

/**
 * Legacy helper used by older social_posts approve path — now routes through publishToMakeWebhook.
 */
export async function publishSocialPost(
  input: SocialStudioPostInput
): Promise<{ results: ChannelPublishResult[]; webhook: MakeWebhookResult }> {
  const result = await publishToMakeWebhook({
    title: input.title,
    caption: input.caption,
    image_url: input.imageUrl?.trim() || '',
    media_type: input.mediaType ?? 'post',
    channels: input.channels,
  });

  if (result.success) {
    return {
      webhook: result,
      results: [
        {
          channel: 'make',
          ok: true,
          message: 'Successfully dispatched to Make.com webhook ✅',
        },
      ],
    };
  }

  return {
    webhook: result,
    results: [
      {
        channel: 'make',
        ok: false,
        skipped: result.error.includes('not defined'),
        message: result.error,
      },
    ],
  };
}
