'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export type ConnectionStatus = 'none' | 'pending_sent' | 'pending_received' | 'accepted';

export type ConnectionRow = {
  id: string;
  requester_id: string;
  receiver_id: string;
  status: 'pending' | 'accepted';
  created_at: string;
  updated_at: string;
};

export type DiscoverUser = {
  id: string;
  full_legal_name: string;
  username: string | null;
  avatar_url: string | null;
  role: string;
  connection_status: ConnectionStatus;
  connection_id: string | null;
};

async function getAuthUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) throw new Error('Unauthorized');
  return user;
}

/** Send a connection request to another user. */
export async function sendConnectionRequest(
  receiverId: string
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  try {
    const user = await getAuthUser();
    if (user.id === receiverId) return { ok: false, error: 'Cannot connect with yourself.' };

    const admin = createAdminClient();

    // Check if a connection already exists in either direction
    const { data: existing } = await admin
      .from('user_connections')
      .select('id, status')
      .or(
        `and(requester_id.eq.${user.id},receiver_id.eq.${receiverId}),` +
          `and(requester_id.eq.${receiverId},receiver_id.eq.${user.id})`
      )
      .maybeSingle();

    if (existing) {
      if (existing.status === 'accepted') return { ok: false, error: 'Already connected.' };
      if (existing.status === 'pending') return { ok: false, error: 'Connection request already sent.' };
    }

    const { data, error } = await admin
      .from('user_connections')
      .insert({ requester_id: user.id, receiver_id: receiverId, status: 'pending' })
      .select('id')
      .single();

    if (error) return { ok: false, error: error.message };
    return { ok: true, id: String(data.id) };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Request failed' };
  }
}

/** Accept a pending connection request (caller must be the receiver). */
export async function acceptConnectionRequest(
  connectionId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const user = await getAuthUser();
    const admin = createAdminClient();

    const { error } = await admin
      .from('user_connections')
      .update({ status: 'accepted', updated_at: new Date().toISOString() })
      .eq('id', connectionId)
      .eq('receiver_id', user.id) // only the receiver may accept
      .eq('status', 'pending');

    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Accept failed' };
  }
}

/** Reject or remove a connection. */
export async function removeConnection(
  connectionId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const user = await getAuthUser();
    const admin = createAdminClient();

    const { error } = await admin
      .from('user_connections')
      .delete()
      .eq('id', connectionId)
      .or(`requester_id.eq.${user.id},receiver_id.eq.${user.id}`);

    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Remove failed' };
  }
}

/** List all accepted connections for the current user (for the Messages tab). */
export async function listMyConnections(): Promise<
  { userId: string; connectionId: string; full_legal_name: string; username: string | null; avatar_url: string | null; role: string }[]
> {
  const user = await getAuthUser();
  const admin = createAdminClient();

  const { data, error } = await admin
    .from('user_connections')
    .select('id, requester_id, receiver_id, status')
    .or(`requester_id.eq.${user.id},receiver_id.eq.${user.id}`)
    .eq('status', 'accepted');

  if (error) throw new Error(error.message);

  const peerIds = (data ?? []).map((row) =>
    row.requester_id === user.id ? row.receiver_id : row.requester_id
  ) as string[];

  if (peerIds.length === 0) return [];

  const { data: profiles, error: profilesError } = await admin
    .from('profiles')
    .select('id, full_legal_name, username, avatar_url, role')
    .in('id', peerIds);

  if (profilesError) throw new Error(profilesError.message);

  const connectionById = Object.fromEntries(
    (data ?? []).map((row) => [
      row.requester_id === user.id ? row.receiver_id : row.requester_id,
      row.id,
    ])
  );

  return (profiles ?? []).map((p) => ({
    userId: String(p.id),
    connectionId: String(connectionById[p.id]),
    full_legal_name: String(p.full_legal_name ?? ''),
    username: (p.username as string | null) ?? null,
    avatar_url: (p.avatar_url as string | null) ?? null,
    role: String(p.role ?? ''),
  }));
}

/** List users to discover + their connection status relative to the current user. */
export async function listDiscoverUsers(limit = 40): Promise<DiscoverUser[]> {
  const user = await getAuthUser();
  const admin = createAdminClient();

  // Fetch all users except self
  const { data: profiles, error: profilesError } = await admin
    .from('profiles')
    .select('id, full_legal_name, username, avatar_url, role')
    .neq('id', user.id)
    .in('status', ['APPROVED', 'approved'])
    .order('full_legal_name', { ascending: true })
    .limit(limit);

  if (profilesError) throw new Error(profilesError.message);

  // Fetch all connection rows involving this user
  const { data: connections } = await admin
    .from('user_connections')
    .select('id, requester_id, receiver_id, status')
    .or(`requester_id.eq.${user.id},receiver_id.eq.${user.id}`);

  // Build a map: peerId → { connectionId, status }
  const connMap: Record<string, { id: string; status: string; iRequested: boolean }> = {};
  for (const c of connections ?? []) {
    const peerId = c.requester_id === user.id ? c.receiver_id : c.requester_id;
    connMap[peerId] = {
      id: String(c.id),
      status: String(c.status),
      iRequested: c.requester_id === user.id,
    };
  }

  return (profiles ?? []).map((p) => {
    const conn = connMap[String(p.id)];
    let connection_status: ConnectionStatus = 'none';
    let connection_id: string | null = null;

    if (conn) {
      connection_id = conn.id;
      if (conn.status === 'accepted') connection_status = 'accepted';
      else if (conn.status === 'pending') {
        connection_status = conn.iRequested ? 'pending_sent' : 'pending_received';
      }
    }

    return {
      id: String(p.id),
      full_legal_name: String(p.full_legal_name ?? ''),
      username: (p.username as string | null) ?? null,
      avatar_url: (p.avatar_url as string | null) ?? null,
      role: String(p.role ?? ''),
      connection_status,
      connection_id,
    };
  });
}

/** Get the connection status between the current user and a specific peer. */
export async function getConnectionStatus(peerId: string): Promise<{
  status: ConnectionStatus;
  connectionId: string | null;
}> {
  const user = await getAuthUser();
  const admin = createAdminClient();

  const { data } = await admin
    .from('user_connections')
    .select('id, requester_id, receiver_id, status')
    .or(
      `and(requester_id.eq.${user.id},receiver_id.eq.${peerId}),` +
        `and(requester_id.eq.${peerId},receiver_id.eq.${user.id})`
    )
    .maybeSingle();

  if (!data) return { status: 'none', connectionId: null };

  const iRequested = data.requester_id === user.id;
  const rawStatus = data.status as string;

  let status: ConnectionStatus = 'none';
  if (rawStatus === 'accepted') status = 'accepted';
  else if (rawStatus === 'pending') status = iRequested ? 'pending_sent' : 'pending_received';

  return { status, connectionId: String(data.id) };
}

/** List pending incoming connection requests for the current user. */
export async function listPendingRequests(): Promise<
  { connectionId: string; requester: { id: string; full_legal_name: string; avatar_url: string | null; role: string } }[]
> {
  const user = await getAuthUser();
  const admin = createAdminClient();

  const { data, error } = await admin
    .from('user_connections')
    .select('id, requester_id')
    .eq('receiver_id', user.id)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  if (!data || data.length === 0) return [];

  const requesterIds = data.map((r) => String(r.requester_id));
  const { data: profiles } = await admin
    .from('profiles')
    .select('id, full_legal_name, avatar_url, role')
    .in('id', requesterIds);

  const profileMap = Object.fromEntries(
    (profiles ?? []).map((p) => [String(p.id), p])
  );

  return data.map((row) => ({
    connectionId: String(row.id),
    requester: {
      id: String(row.requester_id),
      full_legal_name: String(profileMap[row.requester_id]?.full_legal_name ?? 'Unknown'),
      avatar_url: (profileMap[row.requester_id]?.avatar_url as string | null) ?? null,
      role: String(profileMap[row.requester_id]?.role ?? ''),
    },
  }));
}
