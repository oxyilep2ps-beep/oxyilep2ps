/**
 * Make.com syndication bridge for Social Manager / Admin Approve & Publish.
 * Primary URL: SOCIAL_SYNDICATION_WEBHOOK_URL
 * Fallback:    NEXT_PUBLIC_SOCIAL_WEBHOOK_URL
 */

export type MakeWebhookChannels = {
  linkedin: boolean;
  instagram: boolean;
};

export type MakeWebhookPostData = {
  title: string;
  caption: string;
  image_url: string;
  media_type?: 'image' | 'video' | 'story';
  channels: MakeWebhookChannels;
};

export type MakeWebhookPayload = {
  title: string;
  caption: string;
  image_url: string;
  media_type: 'image' | 'video' | 'story';
  channels: MakeWebhookChannels;
  approved_at: string;
  source: 'Oxyile Social Manager Portal';
};

export type MakeWebhookResult =
  | { success: true; status: number }
  | { success: false; error: string; status?: number };

export type SocialStudioChannels = MakeWebhookChannels;

export type SocialStudioPostInput = {
  title: string;
  caption: string;
  imageUrl: string | null;
  mediaType?: 'image' | 'video' | 'story';
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

function buildPayload(postData: MakeWebhookPostData): MakeWebhookPayload {
  return {
    title: postData.title.trim(),
    caption: postData.caption.trim(),
    image_url: postData.image_url.trim(),
    media_type: postData.media_type ?? 'image',
    channels: {
      linkedin: Boolean(postData.channels.linkedin),
      instagram: Boolean(postData.channels.instagram),
    },
    approved_at: new Date().toISOString(),
    source: 'Oxyile Social Manager Portal',
  };
}

/**
 * POST standardized JSON to Make.com.
 */
export async function publishToMakeWebhook(postData: MakeWebhookPostData): Promise<MakeWebhookResult> {
  const title = postData.title?.trim() ?? '';
  const caption = postData.caption?.trim() ?? '';
  const imageUrl = postData.image_url?.trim() ?? '';

  if (!title) {
    const error = 'Webhook payload missing required field: title';
    console.error('[publishToMakeWebhook]', error);
    return { success: false, error };
  }
  if (!caption) {
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
    title,
    caption,
    image_url: imageUrl,
    channels: postData.channels,
    media_type: postData.media_type ?? 'image',
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
    media_type: input.mediaType ?? 'image',
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
