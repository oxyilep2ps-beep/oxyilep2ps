export type SocialStudioChannels = {
  linkedin: boolean;
  instagram: boolean;
};

export type SocialStudioPostInput = {
  title: string;
  caption: string;
  imageUrl: string | null;
  channels: SocialStudioChannels;
};

export type ChannelPublishResult = {
  channel: 'linkedin' | 'instagram';
  ok: boolean;
  skipped?: boolean;
  message: string;
};

function resolveWebhook(channel: 'linkedin' | 'instagram'): string | null {
  if (channel === 'linkedin') {
    return (
      process.env.LINKEDIN_WEBHOOK_URL?.trim() ||
      process.env.SOCIAL_SYNDICATION_WEBHOOK_URL?.trim() ||
      null
    );
  }
  return (
    process.env.INSTAGRAM_WEBHOOK_URL?.trim() ||
    process.env.SOCIAL_SYNDICATION_WEBHOOK_URL?.trim() ||
    null
  );
}

async function dispatchChannel(
  channel: 'linkedin' | 'instagram',
  input: SocialStudioPostInput
): Promise<ChannelPublishResult> {
  const webhookUrl = resolveWebhook(channel);
  if (!webhookUrl) {
    return {
      channel,
      ok: false,
      skipped: true,
      message: `${channel === 'linkedin' ? 'LinkedIn' : 'Instagram'} webhook not configured`,
    };
  }

  const payload = {
    channel,
    campaignTitle: input.title,
    title: input.title,
    caption: input.caption,
    imageUrl: input.imageUrl,
    publishedAt: new Date().toISOString(),
  };

  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      return {
        channel,
        ok: true,
        message:
          channel === 'linkedin'
            ? 'Successfully dispatched to LinkedIn ✅'
            : 'Successfully dispatched to Instagram ✅',
      };
    }

    return {
      channel,
      ok: false,
      message: `${channel === 'linkedin' ? 'LinkedIn' : 'Instagram'} webhook failed (HTTP ${res.status})`,
    };
  } catch (error) {
    return {
      channel,
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : `${channel === 'linkedin' ? 'LinkedIn' : 'Instagram'} dispatch failed`,
    };
  }
}

/**
 * Publishes a Social Studio post to the selected Make.com channel webhooks.
 */
export async function publishSocialPost(
  input: SocialStudioPostInput
): Promise<{ results: ChannelPublishResult[] }> {
  const jobs: Promise<ChannelPublishResult>[] = [];

  if (input.channels.linkedin) {
    jobs.push(dispatchChannel('linkedin', input));
  }
  if (input.channels.instagram) {
    jobs.push(dispatchChannel('instagram', input));
  }

  if (!jobs.length) {
    return {
      results: [
        {
          channel: 'linkedin',
          ok: false,
          skipped: true,
          message: 'Select at least one channel before publishing',
        },
      ],
    };
  }

  const results = await Promise.all(jobs);
  return { results };
}
