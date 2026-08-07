'use server';

import { revalidatePath } from 'next/cache';
import { assertAdmin } from '@/lib/auth/assert-admin';
import { assertBloggerOrAdmin } from '@/lib/auth/assert-blogger';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { publishSocialPost } from '@/lib/services/socialStudioPublisher';
import type {
  AdminNotificationCounts,
  AdminNotificationRow,
  SocialPostChannels,
  SocialPostRow,
  SocialPostStatus,
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

function mapSocialPost(row: Record<string, unknown>): SocialPostRow {
  return {
    id: String(row.id),
    title: String(row.title ?? ''),
    caption: String(row.caption ?? ''),
    image_url: String(row.image_url ?? ''),
    channels: mapChannels(row.channels),
    status: row.status as SocialPostStatus,
    rejection_reason: (row.rejection_reason as string | null) ?? null,
    submitted_by: (row.submitted_by as string | null) ?? null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
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

export async function listMySocialPosts(): Promise<SocialPostRow[]> {
  const user = await assertBloggerOrAdmin();
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('social_posts')
    .select('*')
    .eq('submitted_by', user.id)
    .order('updated_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => mapSocialPost(row as Record<string, unknown>));
}

export async function getSocialPost(id: string): Promise<SocialPostRow | null> {
  const user = await assertBloggerOrAdmin();
  const admin = createAdminClient();
  const { data, error } = await admin.from('social_posts').select('*').eq('id', id).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  const row = mapSocialPost(data as Record<string, unknown>);
  // Admins can read all; writers only own
  try {
    await assertAdmin();
    return row;
  } catch {
    if (row.submitted_by !== user.id) throw new Error('Unauthorized');
    return row;
  }
}

export async function saveSocialPostDraft(input: {
  id?: string;
  title: string;
  caption: string;
  imageUrl: string;
  channels: SocialPostChannels;
}): Promise<{ ok: true; post: SocialPostRow } | { ok: false; error: string }> {
  try {
    const user = await assertBloggerOrAdmin();
    if (!input.caption.trim()) return { ok: false, error: 'Caption is required.' };
    if (!input.channels.linkedin && !input.channels.instagram) {
      return { ok: false, error: 'Select LinkedIn, Instagram, or both.' };
    }

    const admin = createAdminClient();
    const payload = {
      title: input.title.trim() || 'Untitled social campaign',
      caption: input.caption.trim(),
      image_url: input.imageUrl?.trim() || '',
      channels: input.channels,
      status: 'draft' as const,
      rejection_reason: null,
      submitted_by: user.id,
      updated_at: new Date().toISOString(),
    };

    if (input.id) {
      const existing = await getSocialPost(input.id);
      if (!existing) return { ok: false, error: 'Post not found.' };
      if (existing.status === 'published') {
        return { ok: false, error: 'Published posts cannot be edited here.' };
      }
      const { data, error } = await admin
        .from('social_posts')
        .update(payload)
        .eq('id', input.id)
        .select('*')
        .single();
      if (error) return { ok: false, error: error.message };
      revalidatePath('/blogger/social-studio');
      return { ok: true, post: mapSocialPost(data as Record<string, unknown>) };
    }

    const { data, error } = await admin
      .from('social_posts')
      .insert(payload)
      .select('*')
      .single();
    if (error) return { ok: false, error: error.message };
    revalidatePath('/blogger/social-studio');
    return { ok: true, post: mapSocialPost(data as Record<string, unknown>) };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Save failed' };
  }
}

export async function submitSocialPostForApproval(input: {
  id?: string;
  title: string;
  caption: string;
  imageUrl: string;
  channels: SocialPostChannels;
}): Promise<{ ok: true; post: SocialPostRow } | { ok: false; error: string }> {
  try {
    const user = await assertBloggerOrAdmin();
    if (!input.caption.trim()) return { ok: false, error: 'Caption is required.' };
    if (!input.channels.linkedin && !input.channels.instagram) {
      return { ok: false, error: 'Select LinkedIn, Instagram, or both.' };
    }

    const admin = createAdminClient();
    const payload = {
      title: input.title.trim() || 'Untitled social campaign',
      caption: input.caption.trim(),
      image_url: input.imageUrl?.trim() || '',
      channels: input.channels,
      status: 'pending_approval' as const,
      rejection_reason: null,
      submitted_by: user.id,
      updated_at: new Date().toISOString(),
    };

    let data;
    if (input.id) {
      const existing = await getSocialPost(input.id);
      if (!existing) return { ok: false, error: 'Post not found.' };
      const { data: updated, error } = await admin
        .from('social_posts')
        .update(payload)
        .eq('id', input.id)
        .select('*')
        .single();
      if (error) return { ok: false, error: error.message };
      data = updated;
    } else {
      const { data: inserted, error } = await admin
        .from('social_posts')
        .insert(payload)
        .select('*')
        .single();
      if (error) return { ok: false, error: error.message };
      data = inserted;
    }

    revalidatePath('/blogger/social-studio');
    revalidatePath('/admin-dashboard/social-reviews');
    return { ok: true, post: mapSocialPost(data as Record<string, unknown>) };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Submit failed' };
  }
}

/** @deprecated Direct publish is admin-only via approveSocialPost. */
export async function dispatchSocialStudioPost() {
  return {
    ok: false as const,
    error: 'Direct publishing is disabled. Submit for Admin Approval instead.',
  };
}

export async function listPendingSocialPosts(): Promise<SocialPostRow[]> {
  await assertAdmin();
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('social_posts')
    .select('*')
    .eq('status', 'pending_approval')
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => mapSocialPost(row as Record<string, unknown>));
}

export async function listAllSocialPostsForAdmin(): Promise<SocialPostRow[]> {
  await assertAdmin();
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('social_posts')
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(100);
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => mapSocialPost(row as Record<string, unknown>));
}

export async function updatePendingSocialPost(
  id: string,
  updates: {
    title?: string;
    caption?: string;
    imageUrl?: string;
    channels?: SocialPostChannels;
  }
): Promise<{ ok: true; post: SocialPostRow } | { ok: false; error: string }> {
  try {
    await assertAdmin();
    const admin = createAdminClient();
    const { data, error } = await admin
      .from('social_posts')
      .update({
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
    revalidatePath('/admin-dashboard/social-reviews');
    return { ok: true, post: mapSocialPost(data as Record<string, unknown>) };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Update failed' };
  }
}

export async function approveSocialPost(
  id: string,
  updates?: {
    title?: string;
    caption?: string;
    imageUrl?: string;
    channels?: SocialPostChannels;
  }
): Promise<
  | { ok: true; webhookOk: true; results: Awaited<ReturnType<typeof publishSocialPost>>['results'] }
  | { ok: true; webhookOk: false; webhookError: string; results: Awaited<ReturnType<typeof publishSocialPost>>['results'] }
  | { ok: false; error: string }
> {
  try {
    await assertAdmin();
    const admin = createAdminClient();

    if (updates) {
      await updatePendingSocialPost(id, updates);
    }

    const { data: post, error } = await admin.from('social_posts').select('*').eq('id', id).maybeSingle();
    if (error || !post) return { ok: false, error: error?.message ?? 'Post not found' };

    const mapped = mapSocialPost(post as Record<string, unknown>);

    const { error: statusError } = await admin
      .from('social_posts')
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

    const { results, webhook } = await publishSocialPost({
      title: mapped.title,
      caption: mapped.caption,
      imageUrl: mapped.image_url || null,
      channels: mapped.channels,
    });

    revalidatePath('/admin-dashboard/social-reviews');
    revalidatePath('/blogger/social-studio');

    if (!webhook.success) {
      return { ok: true, webhookOk: false, webhookError: webhook.error, results };
    }

    return { ok: true, webhookOk: true, results };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Approve failed' };
  }
}

export async function rejectSocialPost(
  id: string,
  rejectionReason: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await assertAdmin();
    if (!rejectionReason.trim()) return { ok: false, error: 'Rejection reason is required.' };
    const admin = createAdminClient();
    const { error } = await admin
      .from('social_posts')
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

    revalidatePath('/admin-dashboard/social-reviews');
    revalidatePath('/blogger/social-studio');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Reject failed' };
  }
}

export async function getAdminNotificationCounts(): Promise<AdminNotificationCounts> {
  await assertAdmin();
  const admin = createAdminClient();

  const [blogsPending, socialCampaignsPending, socialPostsPending, resumesPending, unreadRows] =
    await Promise.all([
      admin
        .from('blogs')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'PENDING_APPROVAL'),
      admin
        .from('social_campaigns')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending_approval'),
      admin
        .from('social_posts')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending_approval'),
      admin
        .from('job_applicants')
        .select('id', { count: 'exact', head: true })
        .eq('stage', 'applied'),
      admin
        .from('admin_notifications')
        .select('entity_type')
        .eq('is_read', false),
    ]);

  const socialPendingCount =
    (socialCampaignsPending.error ? 0 : socialCampaignsPending.count ?? 0) +
    (socialPostsPending.error ? 0 : socialPostsPending.count ?? 0);

  // Notifications table missing → fall back to live pending queues.
  if (unreadRows.error) {
    const blogs = blogsPending.count ?? 0;
    const social = socialPendingCount;
    const resumes = resumesPending.count ?? 0;
    return {
      blogs,
      social,
      resumes,
      unreadNotifications: 0,
      total: blogs + social + resumes,
    };
  }

  let blogs = 0;
  let social = 0;
  let resumes = 0;
  for (const row of unreadRows.data ?? []) {
    const t = String((row as { entity_type?: string }).entity_type);
    if (t === 'blog_post') blogs += 1;
    else if (t === 'social_post') social += 1;
    else if (t === 'resume_submission') resumes += 1;
  }

  // Unread badges clear on visit. Until the first notification is written,
  // surface pending entity counts so admins still see work in the queue.
  const unreadTotal = blogs + social + resumes;
  if (unreadTotal === 0) {
    const anyReadCheck = await admin
      .from('admin_notifications')
      .select('id', { count: 'exact', head: true })
      .limit(1);
    const tableEmpty = !anyReadCheck.error && (anyReadCheck.count ?? 0) === 0;
    if (tableEmpty) {
      const pb = blogsPending.count ?? 0;
      const ps = socialPendingCount;
      const pr = resumesPending.count ?? 0;
      return {
        blogs: pb,
        social: ps,
        resumes: pr,
        unreadNotifications: 0,
        total: pb + ps + pr,
      };
    }
  }

  return {
    blogs,
    social,
    resumes,
    unreadNotifications: unreadTotal,
    total: unreadTotal,
  };
}

export async function listUnreadAdminNotifications(limit = 20): Promise<AdminNotificationRow[]> {
  await assertAdmin();
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('admin_notifications')
    .select('*')
    .eq('is_read', false)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => ({
    id: String(row.id),
    entity_type: row.entity_type as AdminNotificationRow['entity_type'],
    entity_id: String(row.entity_id),
    title: String(row.title),
    message: String(row.message),
    is_read: Boolean(row.is_read),
    created_at: String(row.created_at),
  }));
}

export async function markAdminNotificationsRead(
  entityType: 'blog_post' | 'social_post' | 'resume_submission' | 'all'
): Promise<{ ok: true }> {
  await assertAdmin();
  const admin = createAdminClient();
  let query = admin.from('admin_notifications').update({ is_read: true }).eq('is_read', false);
  if (entityType !== 'all') {
    query = query.eq('entity_type', entityType);
  }
  const { error } = await query;
  if (error) throw new Error(error.message);
  return { ok: true };
}
