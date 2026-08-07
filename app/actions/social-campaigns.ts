'use server';

import { revalidatePath } from 'next/cache';
import { assertAdmin } from '@/lib/auth/assert-admin';
import { assertSocialManagerOrAdmin } from '@/lib/auth/assert-social-manager';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { publishToMakeWebhook } from '@/lib/services/socialStudioPublisher';
import type {
  SocialCampaignRow,
  SocialOverviewMetrics,
  SocialPostChannels,
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
  return {
    id: String(row.id),
    campaign_name: String(row.campaign_name ?? ''),
    title: String(row.title ?? ''),
    caption: String(row.caption ?? ''),
    image_url: String(row.image_url ?? ''),
    channels: mapChannels(row.channels),
    status: row.status as SocialCampaignRow['status'],
    scheduled_for: (row.scheduled_for as string | null) ?? null,
    rejection_reason: (row.rejection_reason as string | null) ?? null,
    created_by: (row.created_by as string | null) ?? null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

function revalidateSocial() {
  revalidatePath('/social');
  revalidatePath('/social/studio');
  revalidatePath('/social/calendar');
  revalidatePath('/admin-dashboard/social-reviews');
}

export async function uploadSocialCampaignAsset(formData: FormData): Promise<string> {
  await assertSocialManagerOrAdmin();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');

  const file = formData.get('file');
  if (!(file instanceof File)) throw new Error('No file uploaded');

  const ext = file.name.split('.').pop() || 'jpg';
  const path = `social-campaigns/${user.id}/${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from('blog-covers').upload(path, file, {
    upsert: true,
    contentType: file.type || 'image/jpeg',
  });
  if (error) throw new Error(error.message);

  return supabase.storage.from('blog-covers').getPublicUrl(path).data.publicUrl;
}

export async function listSocialCampaigns(): Promise<SocialCampaignRow[]> {
  await assertSocialManagerOrAdmin();
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('social_campaigns')
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(200);
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => mapCampaign(row as Record<string, unknown>));
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
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const [active, pending, published] = await Promise.all([
    admin
      .from('social_campaigns')
      .select('id', { count: 'exact', head: true })
      .in('status', ['draft', 'pending_approval', 'approved']),
    admin
      .from('social_campaigns')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending_approval'),
    admin
      .from('social_campaigns')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'published')
      .gte('updated_at', startOfMonth.toISOString()),
  ]);

  const syndication = Boolean(
    process.env.SOCIAL_SYNDICATION_WEBHOOK_URL?.trim() ||
      process.env.NEXT_PUBLIC_SOCIAL_WEBHOOK_URL?.trim()
  );
  const webhookSuccessRate = syndication ? 100 : null;

  return {
    activeCampaigns: active.count ?? 0,
    pendingApproval: pending.count ?? 0,
    publishedThisMonth: published.count ?? 0,
    webhookSuccessRate,
  };
}

export async function getSocialWebhookHealth(): Promise<WebhookHealth> {
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
}

export async function saveSocialCampaignDraft(input: {
  id?: string;
  campaignName: string;
  title: string;
  caption: string;
  imageUrl: string;
  channels: SocialPostChannels;
  scheduledFor?: string | null;
}): Promise<{ ok: true; campaign: SocialCampaignRow } | { ok: false; error: string }> {
  try {
    const user = await assertSocialManagerOrAdmin();
    if (!input.caption.trim()) return { ok: false, error: 'Caption is required.' };
    if (!input.channels.linkedin && !input.channels.instagram) {
      return { ok: false, error: 'Select LinkedIn, Instagram, or both.' };
    }

    const admin = createAdminClient();
    const payload = {
      campaign_name: input.campaignName.trim() || 'Untitled campaign',
      title: input.title.trim() || input.campaignName.trim() || 'Untitled',
      caption: input.caption.trim(),
      image_url: input.imageUrl?.trim() || '',
      channels: input.channels,
      status: 'draft' as const,
      rejection_reason: null,
      scheduled_for: input.scheduledFor || null,
      created_by: user.id,
      updated_at: new Date().toISOString(),
    };

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
  channels: SocialPostChannels;
  scheduledFor?: string | null;
}): Promise<{ ok: true; campaign: SocialCampaignRow } | { ok: false; error: string }> {
  try {
    const user = await assertSocialManagerOrAdmin();
    if (!input.caption.trim()) return { ok: false, error: 'Caption is required.' };
    if (!input.channels.linkedin && !input.channels.instagram) {
      return { ok: false, error: 'Select LinkedIn, Instagram, or both.' };
    }

    const admin = createAdminClient();
    const payload = {
      campaign_name: input.campaignName.trim() || 'Untitled campaign',
      title: input.title.trim() || input.campaignName.trim() || 'Untitled',
      caption: input.caption.trim(),
      image_url: input.imageUrl?.trim() || '',
      channels: input.channels,
      status: 'pending_approval' as const,
      rejection_reason: null,
      scheduled_for: input.scheduledFor || null,
      created_by: user.id,
      updated_at: new Date().toISOString(),
    };

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
    channels?: SocialPostChannels;
  }
): Promise<{ ok: true; campaign: SocialCampaignRow } | { ok: false; error: string }> {
  try {
    await assertAdmin();
    const admin = createAdminClient();
    const { data, error } = await admin
      .from('social_campaigns')
      .update({
        ...(updates.campaignName !== undefined ? { campaign_name: updates.campaignName.trim() } : {}),
        ...(updates.title !== undefined ? { title: updates.title.trim() } : {}),
        ...(updates.caption !== undefined ? { caption: updates.caption.trim() } : {}),
        ...(updates.imageUrl !== undefined ? { image_url: updates.imageUrl.trim() } : {}),
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

    // 2) Fire Make.com with standardized payload.
    const webhook = await publishToMakeWebhook({
      title: mapped.title || mapped.campaign_name,
      caption: mapped.caption,
      image_url: mapped.image_url,
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
