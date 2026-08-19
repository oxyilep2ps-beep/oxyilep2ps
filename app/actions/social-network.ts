'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

type Role = 'ADMIN' | 'HR' | 'BLOGGER' | 'SOCIAL_MANAGER' | string;

export type FeedPost = {
  id: string;
  content: string;
  media_url: string | null;
  created_at: string;
  author_id: string;
  author_name: string;
  author_role: string;
  author_avatar: string | null;
};

export type GroupSummary = {
  id: string;
  name: string;
  created_at: string;
  members_count: number;
};

export type GroupMessage = {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
  sender_name: string;
  sender_avatar: string | null;
};

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) throw new Error('Unauthorized');
  return user;
}

async function getMyRole(admin = createAdminClient()): Promise<Role> {
  const user = await requireUser();
  const { data } = await admin.from('profiles').select('role').eq('id', user.id).maybeSingle();
  return String(data?.role ?? '');
}

function canCreatePost(role: Role) {
  return ['ADMIN', 'HR', 'BLOGGER', 'SOCIAL_MANAGER'].includes(role);
}

export async function listGlobalPosts(limit = 40): Promise<FeedPost[]> {
  await requireUser();
  const admin = createAdminClient();

  const { data: posts, error } = await admin
    .from('global_posts')
    .select('id, author_id, content, media_url, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  if (!posts || posts.length === 0) return [];

  const authorIds = [...new Set(posts.map((p) => String(p.author_id)))];
  const { data: authors } = await admin
    .from('profiles')
    .select('id, full_legal_name, avatar_url, role')
    .in('id', authorIds);

  const authorMap = Object.fromEntries((authors ?? []).map((a) => [String(a.id), a]));

  return posts.map((p) => {
    const author = authorMap[String(p.author_id)];
    return {
      id: String(p.id),
      content: String(p.content ?? ''),
      media_url: (p.media_url as string | null) ?? null,
      created_at: String(p.created_at),
      author_id: String(p.author_id),
      author_name: String(author?.full_legal_name ?? 'Unknown'),
      author_role: String(author?.role ?? ''),
      author_avatar: (author?.avatar_url as string | null) ?? null,
    };
  });
}

export async function createGlobalPost(input: { content: string; media_url?: string | null }) {
  const user = await requireUser();
  const admin = createAdminClient();
  const role = await getMyRole(admin);
  if (!canCreatePost(role)) return { ok: false as const, error: 'You cannot create posts.' };

  const content = input.content.trim();
  if (!content) return { ok: false as const, error: 'Post content is required.' };

  const { data, error } = await admin
    .from('global_posts')
    .insert({
      author_id: user.id,
      content,
      media_url: input.media_url ?? null,
    })
    .select('id')
    .single();

  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const, id: String(data.id) };
}

export async function updateGlobalPost(input: { id: string; content: string; media_url?: string | null }) {
  const user = await requireUser();
  const admin = createAdminClient();
  const role = await getMyRole(admin);

  const { data: post } = await admin.from('global_posts').select('author_id').eq('id', input.id).maybeSingle();
  if (!post) return { ok: false as const, error: 'Post not found.' };
  const isOwner = String(post.author_id) === user.id;
  if (!isOwner && role !== 'ADMIN') return { ok: false as const, error: 'Not allowed.' };

  const { error } = await admin
    .from('global_posts')
    .update({ content: input.content.trim(), media_url: input.media_url ?? null })
    .eq('id', input.id);

  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const };
}

export async function deleteGlobalPost(postId: string) {
  const user = await requireUser();
  const admin = createAdminClient();
  const role = await getMyRole(admin);

  const { data: post } = await admin.from('global_posts').select('author_id').eq('id', postId).maybeSingle();
  if (!post) return { ok: false as const, error: 'Post not found.' };
  const isOwner = String(post.author_id) === user.id;
  if (!isOwner && role !== 'ADMIN') return { ok: false as const, error: 'Not allowed.' };

  const { error } = await admin.from('global_posts').delete().eq('id', postId);
  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const };
}

export async function listMyChatGroups(): Promise<GroupSummary[]> {
  const user = await requireUser();
  const admin = createAdminClient();

  const { data: memberships, error } = await admin
    .from('chat_group_members')
    .select('group_id')
    .eq('user_id', user.id);
  if (error) throw new Error(error.message);
  const groupIds = (memberships ?? []).map((m) => String(m.group_id));
  if (groupIds.length === 0) return [];

  const { data: groups, error: groupsError } = await admin
    .from('chat_groups')
    .select('id, name, created_at')
    .in('id', groupIds)
    .order('created_at', { ascending: false });
  if (groupsError) throw new Error(groupsError.message);

  const { data: counts } = await admin
    .from('chat_group_members')
    .select('group_id')
    .in('group_id', groupIds);

  const countMap: Record<string, number> = {};
  for (const row of counts ?? []) {
    const key = String(row.group_id);
    countMap[key] = (countMap[key] ?? 0) + 1;
  }

  return (groups ?? []).map((g) => ({
    id: String(g.id),
    name: String(g.name),
    created_at: String(g.created_at),
    members_count: countMap[String(g.id)] ?? 1,
  }));
}

export async function createChatGroup(input: { name: string; memberIds: string[] }) {
  const user = await requireUser();
  const admin = createAdminClient();
  const name = input.name.trim();
  if (!name) return { ok: false as const, error: 'Group name is required.' };

  const cleanMemberIds = [...new Set(input.memberIds.filter(Boolean).filter((id) => id !== user.id))];
  if (cleanMemberIds.length === 0) return { ok: false as const, error: 'Pick at least one friend.' };

  const { data: connections, error: cErr } = await admin
    .from('user_connections')
    .select('requester_id, receiver_id')
    .or(`requester_id.eq.${user.id},receiver_id.eq.${user.id}`)
    .eq('status', 'accepted');
  if (cErr) return { ok: false as const, error: cErr.message };

  const acceptedSet = new Set(
    (connections ?? []).map((c) => String(c.requester_id) === user.id ? String(c.receiver_id) : String(c.requester_id))
  );
  const allValid = cleanMemberIds.every((id) => acceptedSet.has(id));
  if (!allValid) return { ok: false as const, error: 'Only accepted friends can be added.' };

  const { data: group, error: gErr } = await admin
    .from('chat_groups')
    .insert({ name, created_by: user.id })
    .select('id')
    .single();
  if (gErr) return { ok: false as const, error: gErr.message };

  const groupId = String(group.id);
  const rows = [user.id, ...cleanMemberIds].map((memberId) => ({ group_id: groupId, user_id: memberId }));
  const { error: mErr } = await admin.from('chat_group_members').insert(rows);
  if (mErr) return { ok: false as const, error: mErr.message };

  return { ok: true as const, id: groupId };
}

export async function listGroupMessages(groupId: string, limit = 200): Promise<GroupMessage[]> {
  const user = await requireUser();
  const admin = createAdminClient();

  const { data: membership } = await admin
    .from('chat_group_members')
    .select('group_id')
    .eq('group_id', groupId)
    .eq('user_id', user.id)
    .maybeSingle();
  if (!membership) return [];

  const { data: rows, error } = await admin
    .from('chat_group_messages')
    .select('id, sender_id, content, created_at')
    .eq('group_id', groupId)
    .order('created_at', { ascending: true })
    .limit(limit);
  if (error) throw new Error(error.message);

  const senderIds = [...new Set((rows ?? []).map((r) => String(r.sender_id)))];
  const { data: senders } = await admin
    .from('profiles')
    .select('id, full_legal_name, avatar_url')
    .in('id', senderIds);
  const senderMap = Object.fromEntries((senders ?? []).map((s) => [String(s.id), s]));

  return (rows ?? []).map((r) => ({
    id: String(r.id),
    sender_id: String(r.sender_id),
    content: String(r.content),
    created_at: String(r.created_at),
    sender_name: String(senderMap[String(r.sender_id)]?.full_legal_name ?? 'Unknown'),
    sender_avatar: (senderMap[String(r.sender_id)]?.avatar_url as string | null) ?? null,
  }));
}
