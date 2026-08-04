import { createAdminClient } from '@/lib/supabase/admin';

/**
 * Minimal blog shape required to build a Make.com syndication payload.
 * Compatible with both `blogs` (Editorial CMS) and `blog_posts` (SEO Studio).
 */
export type BlogPost = {
  id: string;
  title: string;
  slug: string;
  cover_image?: string | null;
  cover_image_url?: string | null;
  cover_image_alt?: string | null;
  cover_alt_text?: string | null;
  social_caption?: string | null;
  meta_description?: string | null;
  auto_share_socials?: boolean | null;
};

export type SocialShareStatus = 'pending' | 'shared' | 'failed';

type SyndicationTable = 'blogs' | 'blog_posts';

function publicAppUrl(): string {
  const raw = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (raw) return raw.replace(/\/$/, '');
  return 'https://oxyile.com';
}

function resolveCoverImage(post: BlogPost): string | null {
  return post.cover_image ?? post.cover_image_url ?? null;
}

function resolveAltText(post: BlogPost): string {
  const alt = post.cover_image_alt?.trim() || post.cover_alt_text?.trim();
  return alt || post.title;
}

function resolveCaption(post: BlogPost): string {
  const custom = post.social_caption?.trim();
  if (custom) return custom;
  const meta = post.meta_description?.trim();
  if (meta) return meta;
  return `${post.title}\n\nRead our latest UK financial & P2P lending insights below 👇`;
}

async function updateShareStatus(
  table: SyndicationTable,
  postId: string,
  status: SocialShareStatus
): Promise<void> {
  try {
    const admin = createAdminClient();
    const { error } = await admin
      .from(table)
      .update({ social_share_status: status })
      .eq('id', postId);
    if (error) {
      console.error(`[socialSyndication] Failed to set social_share_status=${status}`, {
        table,
        postId,
        error: error.message,
      });
    }
  } catch (error) {
    console.error('[socialSyndication] Unexpected status update failure', error);
  }
}

/**
 * Posts structured blog data to Make.com for LinkedIn / Instagram sharing.
 * Never throws — missing webhook URL or network errors are logged and status updated.
 */
export async function triggerSocialSyndication(
  post: BlogPost,
  options?: { table?: SyndicationTable }
): Promise<{ ok: boolean; skipped?: boolean; error?: string }> {
  const table = options?.table ?? 'blogs';
  const webhookUrl = process.env.SOCIAL_SYNDICATION_WEBHOOK_URL?.trim();

  if (!webhookUrl) {
    console.warn(
      '[socialSyndication] SOCIAL_SYNDICATION_WEBHOOK_URL is not configured — skipping Make.com webhook.'
    );
    return { ok: false, skipped: true, error: 'Webhook URL missing' };
  }

  const payload = {
    blogId: post.id,
    title: post.title,
    imageUrl: resolveCoverImage(post),
    altText: resolveAltText(post),
    url: `${publicAppUrl()}/blog/${post.slug}`,
    caption: resolveCaption(post),
    publishedAt: new Date().toISOString(),
  };

  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      await updateShareStatus(table, post.id, 'shared');
      return { ok: true };
    }

    const body = await res.text().catch(() => '');
    console.error('[socialSyndication] Make.com webhook failed', {
      status: res.status,
      body: body.slice(0, 500),
      blogId: post.id,
    });
    await updateShareStatus(table, post.id, 'failed');
    return { ok: false, error: `Webhook HTTP ${res.status}` };
  } catch (error) {
    console.error('[socialSyndication] Make.com webhook request error', error);
    await updateShareStatus(table, post.id, 'failed');
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Webhook request failed',
    };
  }
}
