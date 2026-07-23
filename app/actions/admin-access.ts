'use server';

import { revalidatePath } from 'next/cache';
import { assertAdmin } from '@/lib/auth/assert-admin';
import { getAdminEmails } from '@/lib/auth/routing';
import { createAdminClient } from '@/lib/supabase/admin';
import { logAdminAction } from '@/app/actions/admin-audit';

export type PlatformElevatedRole = 'ADMIN' | 'HR' | 'BLOGGER';

export type PlatformAccessRow = {
  id: string;
  email: string;
  role: PlatformElevatedRole;
  created_at: string;
  has_account: boolean;
};

const ELEVATED_ROLES: PlatformElevatedRole[] = ['ADMIN', 'HR', 'BLOGGER'];

/** Seeded / env admins that must never lose ADMIN via revoke. */
function getProtectedAdminEmails(): Set<string> {
  return new Set(
    [
      'showlittlemercy@gmail.com',
      'preet.datta@oxyile.com',
      ...getAdminEmails(),
    ].map((e) => e.trim().toLowerCase())
  );
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function parseRole(role: string): PlatformElevatedRole | null {
  const upper = role.trim().toUpperCase();
  if (ELEVATED_ROLES.includes(upper as PlatformElevatedRole)) {
    return upper as PlatformElevatedRole;
  }
  return null;
}

function escapeIlike(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
}

async function findProfileByEmail(
  admin: ReturnType<typeof createAdminClient>,
  email: string
): Promise<{ id: string; email: string; role?: string } | null> {
  const { data } = await admin
    .from('profiles')
    .select('id, email, role')
    .ilike('email', escapeIlike(email))
    .maybeSingle();

  if (!data?.id) return null;
  return {
    id: data.id as string,
    email: String(data.email ?? ''),
    role: data.role as string | undefined,
  };
}

export async function listPlatformAccess(): Promise<PlatformAccessRow[]> {
  await assertAdmin();
  const admin = createAdminClient();

  const { data, error } = await admin
    .from('platform_access')
    .select('id, email, role, created_at')
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  const rows = (data ?? []) as Array<{
    id: string;
    email: string;
    role: string;
    created_at: string;
  }>;

  const emails = rows.map((r) => r.email.toLowerCase());
  const accountSet = new Set<string>();

  if (emails.length > 0) {
    const { data: profiles } = await admin.from('profiles').select('email').in('email', emails);
    for (const p of profiles ?? []) {
      if (p.email) accountSet.add(String(p.email).toLowerCase());
    }
  }

  return rows.map((row) => ({
    id: row.id,
    email: row.email,
    role: row.role as PlatformElevatedRole,
    created_at: row.created_at,
    has_account: accountSet.has(row.email.toLowerCase()),
  }));
}

export async function assignPlatformRole(
  emailInput: string,
  roleInput: string
): Promise<{ ok: boolean; error?: string }> {
  const adminUser = await assertAdmin();
  const email = normalizeEmail(emailInput);
  const role = parseRole(roleInput);

  if (!isValidEmail(email)) {
    return { ok: false, error: 'Enter a valid email address.' };
  }
  if (!role) {
    return { ok: false, error: 'Select a valid role (Admin, HR, or Blogger).' };
  }

  const admin = createAdminClient();

  const { error: upsertError } = await admin.from('platform_access').upsert(
    {
      email,
      role,
      granted_by: adminUser.id,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'email' }
  );

  if (upsertError) {
    return { ok: false, error: upsertError.message };
  }

  // Keep legacy admin_allowlist in sync for ADMIN grants
  if (role === 'ADMIN') {
    await admin.from('admin_allowlist').upsert({ email }, { onConflict: 'email' });
  }

  // If the user already has a profile, apply the role immediately
  const existing = await findProfileByEmail(admin, email);

  if (existing?.id) {
    const { error: profileError } = await admin
      .from('profiles')
      .update({
        role,
        status: 'APPROVED',
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id);

    if (profileError) {
      return { ok: false, error: profileError.message };
    }
  }

  await logAdminAction(adminUser.email ?? 'admin', `Assigned platform role ${role} to ${email}`);
  revalidatePath('/admin-dashboard/access');
  return { ok: true };
}

export async function revokePlatformRole(emailInput: string): Promise<{ ok: boolean; error?: string }> {
  const adminUser = await assertAdmin();
  const email = normalizeEmail(emailInput);

  if (!email) {
    return { ok: false, error: 'Email is required.' };
  }

  if (getProtectedAdminEmails().has(email)) {
    return {
      ok: false,
      error: 'This admin email is protected and cannot have access revoked.',
    };
  }

  const admin = createAdminClient();

  const { error: deleteError } = await admin.from('platform_access').delete().eq('email', email);
  if (deleteError) {
    return { ok: false, error: deleteError.message };
  }

  // Do not remove protected admins from allowlist; for others drop ADMIN allowlist entry
  await admin.from('admin_allowlist').delete().eq('email', email);

  const existing = await findProfileByEmail(admin, email);

  if (existing?.id && ['ADMIN', 'HR', 'BLOGGER'].includes(String(existing.role))) {
    // Revert to a standard user role; keep status so they are not stuck pending without KYC context.
    // INVESTOR is the platform default for non-staff accounts.
    const { error: profileError } = await admin
      .from('profiles')
      .update({
        role: 'INVESTOR',
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id);

    if (profileError) {
      return { ok: false, error: profileError.message };
    }
  }

  await logAdminAction(adminUser.email ?? 'admin', `Revoked elevated platform access for ${email}`);
  revalidatePath('/admin-dashboard/access');
  return { ok: true };
}
