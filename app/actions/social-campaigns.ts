'use server';

import { revalidatePath } from 'next/cache';
import { assertAdmin } from '@/lib/auth/assert-admin';
import { assertSocialManagerOrAdmin } from '@/lib/auth/assert-social-manager';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { publishToMakeWebhook } from '@/lib/services/socialStudioPublisher';
import { normalizeSocialMediaType } from '@/lib/social/media';
import type {
  SocialMediaType,
  SocialCampaignRow,
  SocialOverviewMetrics,
  SocialPostChannels,
  SocialTrendPoint,
  TopPerformingContentRow,
  WebhookHealth,
} from '@/lib/social/types';

function mapChannels(value: unknown): SocialPostChannels {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const row = value as Record<string, unknown>;
    return {
      linkedin: Boolean(row.linkedin),
      instagram: Boolean(row.instagram),
    };
  }
  return { linkedin: true, instagram: false };
}

function mapCampaign(row: Record<string, unknown>): SocialCampaignRow {
  const rawMetrics =
    row.metrics && typeof row.metrics === 'object' && !Array.isArray(row.metrics)
      ? (row.metrics as Record<string, unknown>)
      : {};
  return {
    id: String(row.id),
    campaign_name: String(row.campaign_name ?? ''),
    title: String(row.title ?? ''),
    caption: String(row.caption ?? ''),
    image_url: String(row.image_url ?? ''),
    media_type: normalizeSocialMediaType(row.media_type),
    channels: mapChannels(row.channels),
    status: row.status as SocialCampaignRow['status'],
    metrics: {
      likes: Number(rawMetrics.likes ?? 0),
      comments: Number(rawMetrics.comments ?? 0),
      impressions: Number(rawMetrics.impressions ?? 0),
      ctr: Number(rawMetrics.ctr ?? 0),
      clicks: Number(rawMetrics.clicks ?? 0),
    },
    scheduled_for: (row.scheduled_for as string | null) ?? null,
    rejection_reason: (row.rejection_reason as string | null) ?? null,
    created_by: (row.created_by as string | null) ?? null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

function validateCampaignInput(input: {
  caption: string;
  imageUrl: string;
  mediaType?: SocialMediaType;
  channels: SocialPostChannels;
}): string | null {
  const mediaType = normalizeSocialMediaType(input.mediaType ?? 'post');
  if (!input.imageUrl?.trim()) return 'Media file / URL is required.';
  if (!input.channels.linkedin && !input.channels.instagram) {
    return 'Select LinkedIn, Instagram, or both.';
  }
  // Stories only require media; reels/posts require caption.
  if (mediaType !== 'story' && !input.caption.trim()) {
    return 'Caption is required for Posts and Reels.';
  }
  return null;
}

function buildCampaignWritePayload(
  input: {
    campaignName: string;
    title: string;
    caption: string;
    imageUrl: string;
    mediaType?: SocialMediaType;
    channels: SocialPostChannels;
    scheduledFor?: string | null;
  },
  userId: string,
  status: 'draft' | 'pending_approval'
) {
  const mediaType = normalizeSocialMediaType(input.mediaType ?? 'post');
  const isStory = mediaType === 'story';
  return {
    campaign_name: input.campaignName.trim() || (isStory ? 'Untitled story' : 'Untitled campaign'),
    title: isStory ? '' : input.title.trim() || input.campaignName.trim() || '',
    caption: isStory ? '' : input.caption.trim(),
    image_url: input.imageUrl?.trim() || '',
    media_type: mediaType,
    channels: input.channels,
    status,
    rejection_reason: null,
    scheduled_for: input.scheduledFor || null,
    created_by: userId,
    updated_at: new Date().toISOString(),
  };
}

function revalidateSocial() {
  revalidatePath('/social');
  revalidatePath('/social/studio');
  revalidatePath('/social/calendar');
  revalidatePath('/admin-dashboard/social-reviews');
}

export async function uploadSocialCampaignAsset(
  formData: FormData
): Promise<{ success: true; url: string } | { success: false; error: string }> {
  try {
    await assertSocialManagerOrAdmin();
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    const file = formData.get('file');
    if (!(file instanceof File)) return { success: false, error: 'No file uploaded' };
    const allowedTypes = new Set([
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif',
      'video/mp4',
      'video/quicktime',
    ]);
    if (!allowedTypes.has(file.type)) {
      return { success: false, error: 'Unsupported media type. Use JPG, PNG, WebP, GIF, MP4, or MOV.' };
    }

    const safeName = file.name.replace(/[^a-zA-Z0-9.]/g, '_');
    const path = `${user.id}/${Date.now()}-${safeName}`;
    const { error } = await supabase.storage.from('social-media').upload(path, file, {
      upsert: true,
      contentType: file.type || 'image/jpeg',
    });
    if (error) {
      console.error('[uploadSocialCampaignAsset]', error);
      return { success: false, error: error.message };
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from('social-media').getPublicUrl(path);

    if (!publicUrl) return { success: false, error: 'Could not resolve a public URL' };
    return { success: true, url: publicUrl };
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Upload failed';
    console.error('[uploadSocialCampaignAsset]', e);
    return { success: false, error: message };
  }
}

export async function listSocialCampaigns(): Promise<SocialCampaignRow[]> {
  try {
    await assertSocialManagerOrAdmin();
    const admin = createAdminClient();
    const { data, error } = await admin
      .from('social_campaigns')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(200);
    if (error) {
      console.error('[listSocialCampaigns]', error);
      return [];
    }
    return (data ?? []).map((row) => mapCampaign(row as Record<string, unknown>));
  } catch (e) {
    console.error('[listSocialCampaigns]', e);
    return [];
  }
}

export async function getSocialCampaign(id: string): Promise<SocialCampaignRow | null> {
  await assertSocialManagerOrAdmin();
  const admin = createAdminClient();
  const { data, error } = await admin.from('social_campaigns').select('*').eq('id', id).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return mapCampaign(data as Record<string, unknown>);
}

export async function getSocialOverviewMetrics(): Promise<SocialOverviewMetrics> {
  await assertSocialManagerOrAdmin();
  const admin = createAdminClient();

  const since30Days = new Date();
  since30Days.setDate(since30Days.getDate() - 30);
  const since7Days = new Date();
  since7Days.setDate(since7Days.getDate() - 7);

  const [active, pending, analyticsRows, publishedRows] = await Promise.all([
    admin
      .from('social_campaigns')
      .select('id', { count: 'exact', head: true })
      .in('status', ['draft', 'pending_approval', 'approved']),
    admin
      .from('social_campaigns')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending_approval'),
    admin
      .from('platform_analytics')
      .select('total_visitors,total_blog_reads')
      .gte('date', since30Days.toISOString().slice(0, 10)),
    admin
      .from('social_campaigns')
      .select('metrics')
      .eq('status', 'published')
      .gte('updated_at', since7Days.toISOString()),
  ]);

  const syndication = Boolean(
    process.env.SOCIAL_SYNDICATION_WEBHOOK_URL?.trim() ||
      process.env.NEXT_PUBLIC_SOCIAL_WEBHOOK_URL?.trim()
  );
  const webhookSuccessRate = syndication ? 100 : null;

  const platformTrafficLast30Days = (analyticsRows.data ?? []).reduce((sum, row) => {
    const r = row as Record<string, unknown>;
    return sum + Number(r.total_visitors ?? 0) + Number(r.total_blog_reads ?? 0);
  }, 0);

  let engagementRateTotal = 0;
  let engagementRateRows = 0;
  for (const row of publishedRows.data ?? []) {
    const metrics = ((row as Record<string, unknown>).metrics ?? {}) as Record<string, unknown>;
    const likes = Number(metrics.likes ?? 0);
    const comments = Number(metrics.comments ?? 0);
    const impressions = Number(metrics.impressions ?? 0);
    if (impressions > 0) {
      engagementRateTotal += ((likes + comments) / impressions) * 100;
      engagementRateRows += 1;
    }
  }
  const averageEngagementRate =
    engagementRateRows > 0 ? Number((engagementRateTotal / engagementRateRows).toFixed(2)) : 0;
  const totalAudienceReach = (publishedRows.data ?? []).reduce((sum, row) => {
    const metrics = ((row as Record<string, unknown>).metrics ?? {}) as Record<string, unknown>;
    return sum + Number(metrics.impressions ?? 0);
  }, 0);

  return {
    totalAudienceReach,
    platformTrafficLast30Days,
    averageEngagementRate,
    pendingApproval: pending.count ?? 0,
    activeCampaigns: active.count ?? 0,
    webhookSuccessRate,
  };
}

export async function getSocialAnalyticsTrend(): Promise<SocialTrendPoint[]> {
  await assertSocialManagerOrAdmin();
  const admin = createAdminClient();
  const since7Days = new Date();
  since7Days.setDate(since7Days.getDate() - 6);

  const [publishedRows, analyticsRows] = await Promise.all([
    admin
      .from('social_campaigns')
      .select('updated_at,metrics')
      .eq('status', 'published')
      .gte('updated_at', since7Days.toISOString()),
    admin
      .from('platform_analytics')
      .select('date,total_visitors,total_blog_reads')
      .gte('date', since7Days.toISOString().slice(0, 10)),
  ]);

  const seed: Record<string, SocialTrendPoint> = {};
  for (let i = 0; i < 7; i += 1) {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const key = d.toISOString().slice(0, 10);
    seed[key] = { date: key.slice(5), reach: 0, websiteClicks: 0 };
  }

  for (const row of publishedRows.data ?? []) {
    const r = row as Record<string, unknown>;
    const key = String(r.updated_at ?? '').slice(0, 10);
    if (!seed[key]) continue;
    const metrics = ((r.metrics ?? {}) as Record<string, unknown>) ?? {};
    seed[key].reach += Number(metrics.impressions ?? 0);
  }

  for (const row of analyticsRows.data ?? []) {
    const r = row as Record<string, unknown>;
    const key = String(r.date ?? '');
    if (!seed[key]) continue;
    seed[key].websiteClicks += Number(r.total_visitors ?? 0) + Number(r.total_blog_reads ?? 0);
  }

  return Object.keys(seed)
    .sort()
    .map((k) => seed[k]);
}

export async function getTopPerformingContent(): Promise<TopPerformingContentRow[]> {
  await assertSocialManagerOrAdmin();
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('social_campaigns')
    .select('id,campaign_name,media_type,metrics,updated_at,status')
    .eq('status', 'published')
    .order('updated_at', { ascending: false })
    .limit(200);
  if (error) return [];

  const mapped: TopPerformingContentRow[] = (data ?? []).map((row) => {
    const r = row as Record<string, unknown>;
    const metrics = ((r.metrics ?? {}) as Record<string, unknown>) ?? {};
    return {
      id: String(r.id),
      campaign: String(r.campaign_name ?? ''),
      format: normalizeSocialMediaType(r.media_type),
      likes: Number(metrics.likes ?? 0),
      comments: Number(metrics.comments ?? 0),
      clicks: Number(metrics.clicks ?? 0),
      impressions: Number(metrics.impressions ?? 0),
      publishDate: String(r.updated_at ?? ''),
    };
  });

  return mapped
    .sort((a, b) => b.likes + b.impressions - (a.likes + a.impressions))
    .slice(0, 10);
}

export async function getSocialWebhookHealth(): Promise<WebhookHealth> {
  try {
    await assertSocialManagerOrAdmin();
    const syndication = Boolean(
      process.env.SOCIAL_SYNDICATION_WEBHOOK_URL?.trim() ||
        process.env.NEXT_PUBLIC_SOCIAL_WEBHOOK_URL?.trim()
    );
    const canvaUrl = process.env.CANVA_BRAND_STUDIO_URL?.trim() || 'https://www.canva.com/';

    return {
      linkedin: syndication ? 'connected' : 'pending',
      instagram: syndication ? 'connected' : 'pending',
      canva: process.env.CANVA_BRAND_STUDIO_URL?.trim() ? 'connected' : 'pending',
      canvaUrl,
    };
  } catch (e) {
    console.error('[getSocialWebhookHealth]', e);
    return {
      linkedin: 'pending',
      instagram: 'pending',
      canva: 'pending',
      canvaUrl: 'https://www.canva.com/',
    };
  }
}

export async function saveSocialCampaignDraft(input: {
  id?: string;
  campaignName: string;
  title: string;
  caption: string;
  imageUrl: string;
  mediaType?: SocialMediaType;
  channels: SocialPostChannels;
  scheduledFor?: string | null;
}): Promise<{ ok: true; campaign: SocialCampaignRow } | { ok: false; error: string }> {
  try {
    const user = await assertSocialManagerOrAdmin();
    const validationError = validateCampaignInput(input);
    if (validationError) return { ok: false, error: validationError };

    const admin = createAdminClient();
    const payload = buildCampaignWritePayload(input, user.id, 'draft');

    if (input.id) {
      const { data, error } = await admin
        .from('social_campaigns')
        .update(payload)
        .eq('id', input.id)
        .select('*')
        .single();
      if (error) return { ok: false, error: error.message };
      revalidateSocial();
      return { ok: true, campaign: mapCampaign(data as Record<string, unknown>) };
    }

    const { data, error } = await admin.from('social_campaigns').insert(payload).select('*').single();
    if (error) return { ok: false, error: error.message };
    revalidateSocial();
    return { ok: true, campaign: mapCampaign(data as Record<string, unknown>) };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Save failed' };
  }
}

export async function submitSocialCampaignForApproval(input: {
  id?: string;
  campaignName: string;
  title: string;
  caption: string;
  imageUrl: string;
  mediaType?: SocialMediaType;
  channels: SocialPostChannels;
  scheduledFor?: string | null;
}): Promise<{ ok: true; campaign: SocialCampaignRow } | { ok: false; error: string }> {
  try {
    const user = await assertSocialManagerOrAdmin();
    const validationError = validateCampaignInput(input);
    if (validationError) return { ok: false, error: validationError };

    const admin = createAdminClient();
    const payload = buildCampaignWritePayload(input, user.id, 'pending_approval');

    let data;
    if (input.id) {
      const { data: updated, error } = await admin
        .from('social_campaigns')
        .update(payload)
        .eq('id', input.id)
        .select('*')
        .single();
      if (error) return { ok: false, error: error.message };
      data = updated;
    } else {
      const { data: inserted, error } = await admin
        .from('social_campaigns')
        .insert(payload)
        .select('*')
        .single();
      if (error) return { ok: false, error: error.message };
      data = inserted;
    }

    revalidateSocial();
    return { ok: true, campaign: mapCampaign(data as Record<string, unknown>) };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Submit failed' };
  }
}

export async function listPendingSocialCampaigns(): Promise<SocialCampaignRow[]> {
  await assertAdmin();
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('social_campaigns')
    .select('*')
    .eq('status', 'pending_approval')
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => mapCampaign(row as Record<string, unknown>));
}

export async function updatePendingSocialCampaign(
  id: string,
  updates: {
    campaignName?: string;
    title?: string;
    caption?: string;
    imageUrl?: string;
    mediaType?: SocialMediaType;
    channels?: SocialPostChannels;
  }
): Promise<{ ok: true; campaign: SocialCampaignRow } | { ok: false; error: string }> {
  try {
    await assertAdmin();
    const admin = createAdminClient();

    // Preserve media_type when not provided so story empty-field rules still apply.
    let mediaType = updates.mediaType ? normalizeSocialMediaType(updates.mediaType) : null;
    if (!mediaType) {
      const { data: existing } = await admin
        .from('social_campaigns')
        .select('media_type')
        .eq('id', id)
        .maybeSingle();
      mediaType = normalizeSocialMediaType(existing?.media_type);
    }
    const isStory = mediaType === 'story';

    const { data, error } = await admin
      .from('social_campaigns')
      .update({
        ...(updates.campaignName !== undefined ? { campaign_name: updates.campaignName.trim() } : {}),
        ...(updates.title !== undefined
          ? { title: isStory ? '' : updates.title.trim() }
          : isStory
            ? { title: '' }
            : {}),
        ...(updates.caption !== undefined
          ? { caption: isStory ? '' : updates.caption.trim() }
          : isStory
            ? { caption: '' }
            : {}),
        ...(updates.imageUrl !== undefined ? { image_url: updates.imageUrl.trim() } : {}),
        ...(updates.mediaType !== undefined ? { media_type: mediaType } : {}),
        ...(updates.channels !== undefined ? { channels: updates.channels } : {}),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('*')
      .single();
    if (error) return { ok: false, error: error.message };
    revalidateSocial();
    return { ok: true, campaign: mapCampaign(data as Record<string, unknown>) };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Update failed' };
  }
}

export async function approveSocialCampaign(
  id: string,
  updates?: {
    campaignName?: string;
    title?: string;
    caption?: string;
    imageUrl?: string;
    mediaType?: SocialMediaType;
    channels?: SocialPostChannels;
  }
): Promise<
  | { ok: true; webhookOk: true }
  | { ok: true; webhookOk: false; webhookError: string }
  | { ok: false; error: string }
> {
  try {
    await assertAdmin();
    const admin = createAdminClient();

    if (updates) {
      await updatePendingSocialCampaign(id, updates);
    }

    const { data: row, error } = await admin.from('social_campaigns').select('*').eq('id', id).maybeSingle();
    if (error || !row) return { ok: false, error: error?.message ?? 'Campaign not found' };

    const mapped = mapCampaign(row as Record<string, unknown>);

    // 1) Persist published status first (DB remains source of truth even if webhook fails).
    const { error: statusError } = await admin
      .from('social_campaigns')
      .update({
        status: 'published',
        rejection_reason: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);
    if (statusError) return { ok: false, error: statusError.message };

    await admin
      .from('admin_notifications')
      .update({ is_read: true })
      .eq('entity_type', 'social_post')
      .eq('entity_id', id);

    // 2) Fire Make.com with standardized payload (empty title/caption allowed for stories).
    const webhook = await publishToMakeWebhook({
      title: mapped.media_type === 'story' ? '' : mapped.title || mapped.campaign_name,
      caption: mapped.media_type === 'story' ? '' : mapped.caption,
      image_url: mapped.image_url,
      media_type: mapped.media_type,
      channels: mapped.channels,
    });

    revalidateSocial();

    if (!webhook.success) {
      return { ok: true, webhookOk: false, webhookError: webhook.error };
    }

    return { ok: true, webhookOk: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Approve failed' };
  }
}

export async function sendTestSocialWebhook(): Promise<
  { ok: true; status: number } | { ok: false; error: string }
> {
  try {
    await assertSocialManagerOrAdmin();
    const result = await publishToMakeWebhook({
      title: 'Oxyile Test Post',
      caption: 'Webhook verification test from Oxyile dashboard.',
      image_url: 'https://oxyile.com/logo.png',
      channels: { linkedin: true, instagram: true },
    });

    if (!result.success) {
      return { ok: false, error: result.error };
    }

    return { ok: true, status: result.status };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Test webhook failed' };
  }
}

export async function rejectSocialCampaign(
  id: string,
  rejectionReason: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await assertAdmin();
    if (!rejectionReason.trim()) return { ok: false, error: 'Rejection reason is required.' };
    const admin = createAdminClient();
    const { error } = await admin
      .from('social_campaigns')
      .update({
        status: 'rejected',
        rejection_reason: rejectionReason.trim(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);
    if (error) return { ok: false, error: error.message };

    await admin
      .from('admin_notifications')
      .update({ is_read: true })
      .eq('entity_type', 'social_post')
      .eq('entity_id', id);

    revalidateSocial();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Reject failed' };
  }
}
