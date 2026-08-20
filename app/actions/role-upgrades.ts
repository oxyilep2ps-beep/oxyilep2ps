'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { uploadAllKycDocuments, type WizardUploadFiles } from '@/lib/kyc/upload';
import { checkEligibilityForInvestorUpgrade } from '@/app/actions/financial-eligibility';
import { assertAdmin } from '@/lib/auth/assert-admin';

export type RoleUpgradeRequestRow = {
  id: string;
  user_id: string;
  requested_role: 'investor' | 'borrower';
  documents: Record<string, string | null>;
  status: 'pending' | 'approved' | 'rejected';
  admin_note: string | null;
  created_at: string;
  full_legal_name: string | null;
  email: string | null;
  username: string | null;
  avatar_url: string | null;
  system_role: string | null;
};

function toUploadable(file: File | null): WizardUploadFiles[keyof WizardUploadFiles] {
  if (!file || file.size <= 0) return null;
  return file;
}

export async function submitInvestorUpgradeRequest(formData: FormData): Promise<
  { ok: true; id: string } | { ok: false; error: string }
> {
  try {
    const eligibility = await checkEligibilityForInvestorUpgrade();
    if (!eligibility.allowed) {
      return { ok: false, error: eligibility.message };
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: 'Sign in required.' };

    const admin = createAdminClient();

    const { data: existingPending } = await admin
      .from('role_upgrade_requests')
      .select('id')
      .eq('user_id', user.id)
      .eq('requested_role', 'investor')
      .eq('status', 'pending')
      .maybeSingle();

    if (existingPending?.id) {
      return {
        ok: false,
        error: 'You already have an investor upgrade request under review.',
      };
    }

    const proofOfIdentityType = String(formData.get('proofOfIdentityType') ?? '').trim();
    const files: WizardUploadFiles = {
      proofOfIdentity: toUploadable(formData.get('proofOfIdentity') as File | null),
      proofOfAddress: toUploadable(formData.get('proofOfAddress') as File | null),
      livenessVideo: toUploadable(formData.get('livenessVideo') as File | null),
      incomeVerification: null,
    };

    if (!proofOfIdentityType) {
      return { ok: false, error: 'Select a proof of identity document type.' };
    }
    if (!files.proofOfIdentity || !files.proofOfAddress || !files.livenessVideo) {
      return {
        ok: false,
        error: 'Upload proof of identity, proof of address, and a liveness selfie/video.',
      };
    }

    const uploaded = await uploadAllKycDocuments(admin, user.id, files);
    const documents = {
      proofOfIdentity: uploaded.proofOfIdentity ?? null,
      proofOfAddress: uploaded.proofOfAddress ?? null,
      livenessVideo: uploaded.livenessVideo ?? null,
      proofOfIdentityType,
      submittedAt: new Date().toISOString(),
    };

    const { data, error } = await admin
      .from('role_upgrade_requests')
      .insert({
        user_id: user.id,
        requested_role: 'investor',
        documents,
        status: 'pending',
      })
      .select('id')
      .single();

    if (error) return { ok: false, error: error.message };

    revalidatePath('/upgrade/investor');
    revalidatePath('/admin-dashboard/verifications');
    revalidatePath('/admin/verifications');
    return { ok: true, id: String(data.id) };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Upgrade request failed.' };
  }
}

export async function listPendingRoleUpgradeRequests(): Promise<RoleUpgradeRequestRow[]> {
  await assertAdmin();
  const admin = createAdminClient();

  const { data: rows, error } = await admin
    .from('role_upgrade_requests')
    .select('id, user_id, requested_role, documents, status, admin_note, created_at')
    .eq('status', 'pending')
    .order('created_at', { ascending: true });

  if (error) throw new Error(error.message);
  if (!rows?.length) return [];

  const userIds = [...new Set(rows.map((r) => String(r.user_id)))];
  const { data: profiles } = await admin
    .from('profiles')
    .select('id, full_legal_name, email, username, avatar_url, role')
    .in('id', userIds);

  const profileMap = Object.fromEntries((profiles ?? []).map((p) => [String(p.id), p]));

  return rows.map((r) => {
    const profile = profileMap[String(r.user_id)];
    return {
      id: String(r.id),
      user_id: String(r.user_id),
      requested_role: r.requested_role as 'investor' | 'borrower',
      documents: (r.documents ?? {}) as Record<string, string | null>,
      status: 'pending',
      admin_note: (r.admin_note as string | null) ?? null,
      created_at: String(r.created_at),
      full_legal_name: (profile?.full_legal_name as string | null) ?? null,
      email: (profile?.email as string | null) ?? null,
      username: (profile?.username as string | null) ?? null,
      avatar_url: (profile?.avatar_url as string | null) ?? null,
      system_role: (profile?.role as string | null) ?? null,
    };
  });
}

export async function getRoleUpgradeDocumentUrls(
  requestId: string
): Promise<{ ok: true; urls: Record<string, string | null> } | { ok: false; error: string }> {
  try {
    await assertAdmin();
    const admin = createAdminClient();
    const { data: row, error } = await admin
      .from('role_upgrade_requests')
      .select('documents')
      .eq('id', requestId)
      .maybeSingle();

    if (error) return { ok: false, error: error.message };
    if (!row) return { ok: false, error: 'Request not found.' };

    const docs = (row.documents ?? {}) as Record<string, string | null>;
    const keys = ['proofOfIdentity', 'proofOfAddress', 'livenessVideo'] as const;
    const urls: Record<string, string | null> = {};

    for (const key of keys) {
      const path = docs[key];
      if (!path) {
        urls[key] = null;
        continue;
      }
      let signed: string | null = null;
      for (const bucket of ['documents', 'kyc-documents'] as const) {
        const { data } = await admin.storage.from(bucket).createSignedUrl(path, 3600);
        if (data?.signedUrl) {
          signed = data.signedUrl;
          break;
        }
      }
      urls[key] = signed;
    }

    return { ok: true, urls };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed to load documents.' };
  }
}

export async function approveRoleUpgrade(
  requestId: string,
  userId: string,
  requestedRole: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const adminUser = await assertAdmin();
    const admin = createAdminClient();
    const role = String(requestedRole).toLowerCase();
    if (role !== 'investor' && role !== 'borrower') {
      return { ok: false, error: 'Invalid requested role.' };
    }

    const { data: request, error: fetchError } = await admin
      .from('role_upgrade_requests')
      .select('id, user_id, requested_role, status')
      .eq('id', requestId)
      .eq('user_id', userId)
      .eq('status', 'pending')
      .maybeSingle();

    if (fetchError) return { ok: false, error: fetchError.message };
    if (!request) return { ok: false, error: 'Pending upgrade request not found.' };

    const now = new Date().toISOString();
    const profilePatch =
      role === 'investor'
        ? { is_investor: true, updated_at: now }
        : { is_borrower: true, updated_at: now };

    const { error: profileError } = await admin.from('profiles').update(profilePatch).eq('id', userId);
    if (profileError) return { ok: false, error: profileError.message };

    const { error: updateError } = await admin
      .from('role_upgrade_requests')
      .update({
        status: 'approved',
        reviewed_by: adminUser.id,
        reviewed_at: now,
        updated_at: now,
      })
      .eq('id', requestId);

    if (updateError) return { ok: false, error: updateError.message };

    const label = role === 'investor' ? 'Investor' : 'Borrower';
    await admin.from('notifications').insert({
      user_id: userId,
      actor_id: adminUser.id,
      type: 'system',
      title: `${label} access approved`,
      message: `Congratulations! Your request to become an ${label} has been approved.`,
      is_read: false,
      link_id: requestId,
    });

    revalidatePath('/admin-dashboard/verifications');
    revalidatePath('/admin/verifications');
    revalidatePath('/dashboard/investor');
    revalidatePath('/dashboard/borrower');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Approval failed.' };
  }
}

export async function rejectRoleUpgrade(
  requestId: string,
  userId: string,
  note?: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const adminUser = await assertAdmin();
    const admin = createAdminClient();
    const now = new Date().toISOString();

    const { data: request, error: fetchError } = await admin
      .from('role_upgrade_requests')
      .select('id, requested_role, status')
      .eq('id', requestId)
      .eq('user_id', userId)
      .eq('status', 'pending')
      .maybeSingle();

    if (fetchError) return { ok: false, error: fetchError.message };
    if (!request) return { ok: false, error: 'Pending upgrade request not found.' };

    const { error: updateError } = await admin
      .from('role_upgrade_requests')
      .update({
        status: 'rejected',
        admin_note: note?.trim() || null,
        reviewed_by: adminUser.id,
        reviewed_at: now,
        updated_at: now,
      })
      .eq('id', requestId);

    if (updateError) return { ok: false, error: updateError.message };

    const label = request.requested_role === 'investor' ? 'Investor' : 'Borrower';
    await admin.from('notifications').insert({
      user_id: userId,
      actor_id: adminUser.id,
      type: 'system',
      title: `${label} upgrade declined`,
      message:
        note?.trim() ||
        `Your request to become an ${label} was not approved. Please contact support if you need help.`,
      is_read: false,
      link_id: requestId,
    });

    revalidatePath('/admin-dashboard/verifications');
    revalidatePath('/admin/verifications');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Rejection failed.' };
  }
}
