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
  bio: string | null;
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

    try {
      const { data: actorProfile } = await admin
        .from('profiles')
        .select('full_legal_name, username')
        .eq('id', user.id)
        .maybeSingle();
      const actorName =
        String(actorProfile?.full_legal_name ?? '').trim() ||
        String(actorProfile?.username ?? '').trim() ||
        user.email?.split('@')[0] ||
        'Someone';

      const { error: notifyError } = await admin.from('notifications').insert({
        user_id: receiverId,
        actor_id: user.id,
        type: 'friend_request',
        title: 'New Friend Request',
        message: `${actorName} sent you a friend request.`,
        is_read: false,
        link_id: data.id,
      });
      if (notifyError) {
        console.error('[sendConnectionRequest] notification insert failed', notifyError.message);
      }
    } catch (notifyError) {
      console.error('[sendConnectionRequest] notification insert failed', notifyError);
    }

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

    const { data: connection, error: fetchError } = await admin
      .from('user_connections')
      .select('id, requester_id, receiver_id, status')
      .eq('id', connectionId)
      .eq('receiver_id', user.id)
      .eq('status', 'pending')
      .maybeSingle();

    if (fetchError) return { ok: false, error: fetchError.message };
    if (!connection) return { ok: false, error: 'Friend request not found.' };

    const { error } = await admin
      .from('user_connections')
      .update({ status: 'accepted', updated_at: new Date().toISOString() })
      .eq('id', connectionId)
      .eq('receiver_id', user.id)
      .eq('status', 'pending');

    if (error) return { ok: false, error: error.message };

    try {
      const { data: accepter } = await admin
        .from('profiles')
        .select('full_legal_name, username')
        .eq('id', user.id)
        .maybeSingle();
      const accepterName =
        String(accepter?.full_legal_name ?? '').trim() ||
        String(accepter?.username ?? '').trim() ||
        user.email?.split('@')[0] ||
        'Someone';

      const { error: notifyError } = await admin.from('notifications').insert({
        user_id: String(connection.requester_id),
        actor_id: user.id,
        type: 'friend_accepted',
        title: 'Friend Request Accepted',
        message: `${accepterName} accepted your friend request!`,
        is_read: false,
        link_id: connectionId,
      });
      if (notifyError) {
        console.error('[acceptConnectionRequest] notification insert failed', notifyError.message);
      }
    } catch (notifyError) {
      console.error('[acceptConnectionRequest] notification failed', notifyError);
    }

    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Accept failed' };
  }
}

/** Alias for acceptConnectionRequest — friend-request acceptance flow. */
export async function acceptFriendRequest(connectionId: string) {
  return acceptConnectionRequest(connectionId);
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

/** Instagram-style people search by username or full name. */
export async function searchProfiles(query: string, limit = 24): Promise<DiscoverUser[]> {
  try {
    const user = await getAuthUser();
    const admin = createAdminClient();
    const q = query.trim().replace(/[%_,()"]/g, ' ').replace(/\s+/g, ' ').slice(0, 64);
    if (q.length < 1) return [];

    const pattern = `%${q}%`;
    const normalizedLimit = Math.max(1, Math.min(limit, 40));

    const { data: byUsername, error: usernameError } = await admin
      .from('profiles')
      .select('id, full_legal_name, username, avatar_url, bio, role')
      .neq('id', user.id)
      .ilike('username', pattern)
      .limit(normalizedLimit);

    if (usernameError) throw new Error(usernameError.message);

    const { data: byName, error: nameError } = await admin
      .from('profiles')
      .select('id, full_legal_name, username, avatar_url, bio, role')
      .neq('id', user.id)
      .ilike('full_legal_name', pattern)
      .limit(normalizedLimit);

    if (nameError) throw new Error(nameError.message);

    const merged = new Map<string, NonNullable<typeof byUsername>[number]>();
    for (const row of [...(byUsername ?? []), ...(byName ?? [])]) {
      merged.set(String(row.id), row);
    }
    const profiles = [...merged.values()].slice(0, normalizedLimit);
    if (profiles.length === 0) return [];

    const { data: connections } = await admin
      .from('user_connections')
      .select('id, requester_id, receiver_id, status')
      .or(`requester_id.eq.${user.id},receiver_id.eq.${user.id}`);

    const connMap: Record<string, { id: string; status: string; iRequested: boolean }> = {};
    for (const c of connections ?? []) {
      const peerId = c.requester_id === user.id ? c.receiver_id : c.requester_id;
      connMap[String(peerId)] = {
        id: String(c.id),
        status: String(c.status),
        iRequested: c.requester_id === user.id,
      };
    }

    return profiles.map((p) => {
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
        bio: (p.bio as string | null) ?? null,
        role: String(p.role ?? ''),
        connection_status,
        connection_id,
      };
    });
  } catch (error) {
    console.error('[searchProfiles] failed', error);
    return [];
  }
}

/** List users to discover + their connection status relative to the current user. */
export async function listDiscoverUsers(limit = 40): Promise<DiscoverUser[]> {
  try {
    const user = await getAuthUser();
    const admin = createAdminClient();
    const normalizedLimit = Math.max(1, Math.min(limit, 20));
    const poolSize = Math.max(normalizedLimit * 4, 24);

    // Prefer approved/active members first.
    const { data: approvedProfiles, error: approvedProfilesError } = await admin
      .from('profiles')
      .select('id, full_legal_name, username, avatar_url, bio, role')
      .neq('id', user.id)
      .in('status', ['APPROVED', 'approved', 'VERIFIED', 'verified', 'ACTIVE', 'active'])
      .limit(poolSize);

    let profiles = approvedProfiles;
    // Fallback: if status column values are sparse/inconsistent (or query fails), still show real users.
    if (approvedProfilesError || !profiles || profiles.length === 0) {
      const { data: fallbackProfiles, error: fallbackProfilesError } = await admin
        .from('profiles')
        .select('id, full_legal_name, username, avatar_url, bio, role')
        .neq('id', user.id)
        .limit(poolSize);
      if (fallbackProfilesError) throw new Error(fallbackProfilesError.message);
      profiles = fallbackProfiles;
    }

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

    const decorated = (profiles ?? []).map((p) => {
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
        bio: (p.bio as string | null) ?? null,
        role: String(p.role ?? ''),
        connection_status,
        connection_id,
      };
    });
    const shuffled = decorated
      .map((value) => ({ value, key: Math.random() }))
      .sort((a, b) => a.key - b.key)
      .map((entry) => entry.value);
    return shuffled.slice(0, normalizedLimit);
  } catch (error) {
    console.error('[listDiscoverUsers] failed', error);
    return [];
  }
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
  {
    connectionId: string;
    requester: {
      id: string;
      full_legal_name: string;
      username: string | null;
      avatar_url: string | null;
      role: string;
    };
  }[]
> {
  try {
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
      .select('id, full_legal_name, username, avatar_url, role')
      .in('id', requesterIds);

    const profileMap = Object.fromEntries((profiles ?? []).map((p) => [String(p.id), p]));

    return data.map((row) => ({
      connectionId: String(row.id),
      requester: {
        id: String(row.requester_id),
        full_legal_name: String(profileMap[row.requester_id]?.full_legal_name ?? 'Unknown'),
        username: (profileMap[row.requester_id]?.username as string | null) ?? null,
        avatar_url: (profileMap[row.requester_id]?.avatar_url as string | null) ?? null,
        role: String(profileMap[row.requester_id]?.role ?? ''),
      },
    }));
  } catch (error) {
    console.error('[listPendingRequests]', error);
    return [];
  }
}

export async function getIncomingRequestCount(): Promise<number> {
  try {
    const user = await getAuthUser();
    const admin = createAdminClient();
    const { count, error } = await admin
      .from('user_connections')
      .select('id', { count: 'exact', head: true })
      .eq('receiver_id', user.id)
      .eq('status', 'pending');
    if (error) throw new Error(error.message);
    return count ?? 0;
  } catch {
    return 0;
  }
}

export type PublicSocialProfile = {
  id: string;
  full_legal_name: string;
  username: string | null;
  bio: string | null;
  avatar_url: string | null;
  cover_url: string | null;
  role: string;
  connection_status: ConnectionStatus;
  connection_id: string | null;
  is_self: boolean;
};

/** Resolve a public profile by username and relative connection status. */
export async function getPublicProfileByUsername(username: string): Promise<PublicSocialProfile | null> {
  try {
    const user = await getAuthUser();
    const admin = createAdminClient();
    const handle = username.trim().replace(/^@/, '').toLowerCase();
    if (!handle) return null;

    const { data: byUsername } = await admin
      .from('profiles')
      .select('id, full_legal_name, username, bio, avatar_url, cover_url, role')
      .ilike('username', handle)
      .maybeSingle();

    let profile = byUsername;
    if (!profile) {
      const { data: fallback } = await admin
        .from('profiles')
        .select('id, full_legal_name, username, bio, avatar_url, cover_url, role')
        .ilike('full_legal_name', handle.replace(/_/g, ' '))
        .limit(1)
        .maybeSingle();
      profile = fallback;
    }
    if (!profile) return null;

    const peerId = String(profile.id);
    const isSelf = peerId === user.id;
    const connection = isSelf
      ? { status: 'accepted' as ConnectionStatus, connectionId: null }
      : await getConnectionStatus(peerId);

    return {
      id: peerId,
      full_legal_name: String(profile.full_legal_name ?? ''),
      username: (profile.username as string | null) ?? null,
      bio: (profile.bio as string | null) ?? null,
      avatar_url: (profile.avatar_url as string | null) ?? null,
      cover_url: (profile.cover_url as string | null) ?? null,
      role: String(profile.role ?? ''),
      connection_status: connection.status,
      connection_id: connection.connectionId,
      is_self: isSelf,
    };
  } catch (error) {
    console.error('[getPublicProfileByUsername]', error);
    return null;
  }
}
