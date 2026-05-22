'use server';

import { revalidatePath } from 'next/cache';
import { assertAdmin } from '@/lib/auth/assert-admin';
import { createAdminClient } from '@/lib/supabase/admin';

export type AdminPeer = {
  id: string;
  display_name: string;
  avatar_url: string | null;
  email: string;
};

export type AdminDmMessage = {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
};

export type AdminGroupMessage = {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
  sender_name?: string;
  sender_avatar?: string | null;
};

export async function listAdminPeers(): Promise<AdminPeer[]> {
  const user = await assertAdmin();
  const admin = createAdminClient();

  const { data: profiles, error } = await admin
    .from('profiles')
    .select('id, email, full_legal_name, role')
    .eq('role', 'ADMIN')
    .neq('id', user.id)
    .order('full_legal_name');

  if (error) throw new Error(error.message);

  const ids = (profiles ?? []).map((p) => p.id as string);
  const adminMeta: Record<string, { display_name: string | null; avatar_url: string | null }> = {};

  if (ids.length > 0) {
    const { data: ap } = await admin
      .from('admin_profiles')
      .select('id, display_name, avatar_url')
      .in('id', ids);
    for (const row of ap ?? []) {
      adminMeta[row.id as string] = {
        display_name: row.display_name as string | null,
        avatar_url: row.avatar_url as string | null,
      };
    }
  }

  return (profiles ?? []).map((p) => {
    const meta = adminMeta[p.id as string];
    return {
      id: p.id as string,
      email: p.email as string,
      display_name: meta?.display_name ?? (p.full_legal_name as string),
      avatar_url: meta?.avatar_url ?? null,
    };
  });
}

export async function listDmMessages(peerId: string): Promise<AdminDmMessage[]> {
  const user = await assertAdmin();
  const admin = createAdminClient();

  const { data, error } = await admin
    .from('admin_chats')
    .select('id, sender_id, receiver_id, content, created_at')
    .or(
      `and(sender_id.eq.${user.id},receiver_id.eq.${peerId}),and(sender_id.eq.${peerId},receiver_id.eq.${user.id})`
    )
    .order('created_at', { ascending: true })
    .limit(300);

  if (error) throw new Error(error.message);
  return (data ?? []) as AdminDmMessage[];
}

export async function sendDmMessage(peerId: string, content: string) {
  const user = await assertAdmin();
  const trimmed = content.trim();
  if (!trimmed) throw new Error('Message empty');

  const admin = createAdminClient();
  const { error } = await admin.from('admin_chats').insert({
    sender_id: user.id,
    receiver_id: peerId,
    content: trimmed,
  });

  if (error) throw new Error(error.message);
  revalidatePath('/admin-dashboard/chat');
  return { success: true };
}

export async function listGroupMessages(): Promise<AdminGroupMessage[]> {
  await assertAdmin();
  const admin = createAdminClient();

  const { data, error } = await admin
    .from('admin_group_messages')
    .select('id, sender_id, content, created_at')
    .order('created_at', { ascending: true })
    .limit(300);

  if (error) throw new Error(error.message);

  const rows = data ?? [];
  const senderIds = [...new Set(rows.map((r) => r.sender_id as string))];
  const nameMap: Record<string, { name: string; avatar: string | null }> = {};

  if (senderIds.length > 0) {
    const [{ data: profs }, { data: aps }] = await Promise.all([
      admin.from('profiles').select('id, full_legal_name').in('id', senderIds),
      admin.from('admin_profiles').select('id, display_name, avatar_url').in('id', senderIds),
    ]);
    for (const p of profs ?? []) {
      nameMap[p.id as string] = { name: p.full_legal_name as string, avatar: null };
    }
    for (const a of aps ?? []) {
      const id = a.id as string;
      nameMap[id] = {
        name: (a.display_name as string) ?? nameMap[id]?.name ?? 'Admin',
        avatar: a.avatar_url as string | null,
      };
    }
  }

  return rows.map((r) => ({
    ...(r as AdminGroupMessage),
    sender_name: nameMap[r.sender_id as string]?.name ?? 'Admin',
    sender_avatar: nameMap[r.sender_id as string]?.avatar ?? null,
  }));
}

export async function sendGroupMessage(content: string) {
  const user = await assertAdmin();
  const trimmed = content.trim();
  if (!trimmed) throw new Error('Message empty');

  const admin = createAdminClient();
  const { error } = await admin.from('admin_group_messages').insert({
    sender_id: user.id,
    content: trimmed,
  });

  if (error) throw new Error(error.message);
  revalidatePath('/admin-dashboard/chat');
  return { success: true };
}
