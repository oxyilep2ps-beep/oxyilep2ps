'use server';

import { revalidatePath } from 'next/cache';
import { assertAdmin } from '@/lib/auth/assert-admin';
import { getAdminEmails } from '@/lib/auth/routing';
import { createAdminClient } from '@/lib/supabase/admin';
import { logAdminAction } from '@/app/actions/admin-audit';

export type PlatformElevatedRole = 'ADMIN' | 'HR' | 'BLOGGER' | 'SOCIAL_MANAGER' | 'EMPLOYEE';

export type PlatformAccessRow = {
  id: string;
  email: string;
  role: PlatformElevatedRole;
  created_at: string;
  has_account: boolean;
};

const ELEVATED_ROLES: PlatformElevatedRole[] = ['ADMIN', 'HR', 'BLOGGER', 'SOCIAL_MANAGER', 'EMPLOYEE'];

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
    return { ok: false, error: 'Select a valid role (Admin, HR, Blogger, Social Media Manager, or Employee).' };
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

  // Keep strict employee directory in sync
  const employeeRole =
    role === 'ADMIN'
      ? 'admin'
      : role === 'HR'
        ? 'hr'
        : role === 'BLOGGER'
          ? 'blogger'
          : role === 'SOCIAL_MANAGER'
            ? 'social_manager'
            : 'employee';
  await admin.from('allowed_employees').upsert({ email, role: employeeRole }, { onConflict: 'email' });

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

    if (role === 'EMPLOYEE') {
      const { ensureEmployeePortalRows } = await import('@/app/actions/employee-portal');
      await ensureEmployeePortalRows(existing.id);
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

  // Strict employee directory revoke — fired staff lose portal access immediately.
  const { error: employeeDeleteError } = await admin.from('allowed_employees').delete().eq('email', email);
  if (employeeDeleteError) {
    return { ok: false, error: employeeDeleteError.message };
  }

  const existing = await findProfileByEmail(admin, email);

  if (existing?.id && ['ADMIN', 'HR', 'BLOGGER', 'SOCIAL_MANAGER', 'EMPLOYEE'].includes(String(existing.role))) {
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

export type PlatformUserRole = 'BORROWER' | 'INVESTOR';

export type PlatformUserRow = {
  id: string;
  email: string;
  full_legal_name: string;
  role: PlatformUserRole;
  status: string;
  account_status: 'active' | 'suspended';
  created_at: string;
};

const KYC_BUCKETS = ['kyc-documents', 'documents'] as const;

async function listPlatformUsersByRole(role: PlatformUserRole): Promise<PlatformUserRow[]> {
  await assertAdmin();
  const admin = createAdminClient();

  const { data, error } = await admin
    .from('profiles')
    .select('id, email, full_legal_name, role, status, account_status, created_at')
    .eq('role', role)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => ({
    id: row.id as string,
    email: String(row.email ?? ''),
    full_legal_name: String(row.full_legal_name ?? ''),
    role: row.role as PlatformUserRole,
    status: String(row.status ?? 'PENDING'),
    account_status:
      String(row.account_status ?? 'active').toLowerCase() === 'suspended' ? 'suspended' : 'active',
    created_at: String(row.created_at ?? new Date().toISOString()),
  }));
}

export async function listBorrowers(): Promise<PlatformUserRow[]> {
  return listPlatformUsersByRole('BORROWER');
}

export async function listInvestors(): Promise<PlatformUserRow[]> {
  return listPlatformUsersByRole('INVESTOR');
}

export async function suspendPlatformUser(userId: string): Promise<{ ok: boolean; error?: string }> {
  const adminUser = await assertAdmin();
  if (!userId) return { ok: false, error: 'User id is required.' };

  const admin = createAdminClient();
  const { data: profile, error: lookupError } = await admin
    .from('profiles')
    .select('id, email, role, full_legal_name')
    .eq('id', userId)
    .maybeSingle();

  if (lookupError || !profile) {
    return { ok: false, error: lookupError?.message ?? 'User not found.' };
  }

  if (getProtectedAdminEmails().has(String(profile.email ?? '').toLowerCase())) {
    return { ok: false, error: 'Protected admin accounts cannot be suspended.' };
  }

  if (!['BORROWER', 'INVESTOR'].includes(String(profile.role))) {
    return { ok: false, error: 'Only borrowers and investors can be suspended here.' };
  }

  const { error } = await admin
    .from('profiles')
    .update({ account_status: 'suspended', updated_at: new Date().toISOString() })
    .eq('id', userId);

  if (error) return { ok: false, error: error.message };

  await logAdminAction(
    adminUser.email ?? 'admin',
    `Suspended platform user ${profile.email} (${profile.role})`
  );
  revalidatePath('/admin-dashboard/access');
  return { ok: true };
}

export async function unsuspendPlatformUser(userId: string): Promise<{ ok: boolean; error?: string }> {
  const adminUser = await assertAdmin();
  if (!userId) return { ok: false, error: 'User id is required.' };

  const admin = createAdminClient();
  const { data: profile, error: lookupError } = await admin
    .from('profiles')
    .select('id, email, role')
    .eq('id', userId)
    .maybeSingle();

  if (lookupError || !profile) {
    return { ok: false, error: lookupError?.message ?? 'User not found.' };
  }

  const { error } = await admin
    .from('profiles')
    .update({ account_status: 'active', updated_at: new Date().toISOString() })
    .eq('id', userId);

  if (error) return { ok: false, error: error.message };

  await logAdminAction(
    adminUser.email ?? 'admin',
    `Unsuspended platform user ${profile.email} (${profile.role})`
  );
  revalidatePath('/admin-dashboard/access');
  return { ok: true };
}

async function purgeUserStorage(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  profile: {
    kyc_data?: unknown;
    proof_of_identity_url?: string | null;
    liveness_video_url?: string | null;
    proof_of_address_url?: string | null;
    income_verification_url?: string | null;
    collateral_proof_url?: string | null;
  }
) {
  const meta =
    profile.kyc_data && typeof profile.kyc_data === 'object'
      ? ((profile.kyc_data as { identityMeta?: Record<string, unknown> }).identityMeta ?? {})
      : {};
  const paths = [
    profile.proof_of_identity_url,
    profile.liveness_video_url,
    profile.proof_of_address_url,
    profile.income_verification_url,
    profile.collateral_proof_url,
    meta.idProofPath,
    meta.livenessPath,
    meta.addressProofPath,
    meta.incomeVerificationPath,
  ].filter((p): p is string => typeof p === 'string' && Boolean(p));

  for (const bucket of KYC_BUCKETS) {
    if (paths.length) {
      await admin.storage.from(bucket).remove(paths);
    }
    const { data: folderFiles } = await admin.storage.from(bucket).list(userId);
    if (folderFiles?.length) {
      await admin.storage.from(bucket).remove(folderFiles.map((f) => `${userId}/${f.name}`));
    }
  }

  if (profile.collateral_proof_url) {
    await admin.storage.from('collateral_documents').remove([profile.collateral_proof_url]);
  }
}

/**
 * Permanently delete a borrower/investor profile, related storage objects, and auth user.
 */
export async function deletePlatformUser(userId: string): Promise<{ ok: boolean; error?: string }> {
  const adminUser = await assertAdmin();
  if (!userId) return { ok: false, error: 'User id is required.' };

  const admin = createAdminClient();
  const { data: profile, error: lookupError } = await admin
    .from('profiles')
    .select(
      'id, email, role, full_legal_name, kyc_data, proof_of_identity_url, liveness_video_url, proof_of_address_url, income_verification_url, collateral_proof_url'
    )
    .eq('id', userId)
    .maybeSingle();

  if (lookupError || !profile) {
    return { ok: false, error: lookupError?.message ?? 'User not found.' };
  }

  const email = String(profile.email ?? '').toLowerCase();
  if (getProtectedAdminEmails().has(email)) {
    return { ok: false, error: 'Protected admin accounts cannot be deleted.' };
  }

  if (!['BORROWER', 'INVESTOR'].includes(String(profile.role))) {
    return { ok: false, error: 'Only borrowers and investors can be hard-deleted here.' };
  }

  await purgeUserStorage(admin, userId, profile);

  // Best-effort cleanup of related rows (ignore missing-table errors).
  const relatedDeletes: Array<PromiseLike<unknown>> = [
    admin.from('platform_access').delete().eq('email', email),
    admin.from('allowed_employees').delete().eq('email', email),
    admin.from('admin_allowlist').delete().eq('email', email),
    admin.from('handshakes').delete().eq('borrower_id', userId),
    admin.from('handshakes').delete().eq('lender_id', userId),
  ];
  await Promise.allSettled(relatedDeletes);

  const { error: profileDeleteError } = await admin.from('profiles').delete().eq('id', userId);
  if (profileDeleteError) {
    return { ok: false, error: profileDeleteError.message };
  }

  const { error: authError } = await admin.auth.admin.deleteUser(userId);
  if (authError) {
    return { ok: false, error: authError.message };
  }

  await logAdminAction(
    adminUser.email ?? 'admin',
    `Permanently deleted platform user ${email} (${profile.role})`
  );
  revalidatePath('/admin-dashboard/access');
  return { ok: true };
}
