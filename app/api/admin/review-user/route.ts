import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isAdminEmail } from '@/lib/auth/routing';
import { sendReviewEmail } from '@/lib/email/send-review-email';
import type { KycDocumentPaths, ProfileStatus } from '@/lib/types/profile';

const KYC_BUCKET = 'kyc-documents';

type ReviewAction = 'APPROVED' | 'REJECTED';

function collectStoragePaths(kycData: { identity?: { documents?: KycDocumentPaths } } | null): string[] {
  const docs = kycData?.identity?.documents;
  if (!docs) return [];
  return Object.values(docs).filter((path): path is string => Boolean(path));
}

async function assertAdminSession() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    throw new Error('Unauthorized');
  }

  if (isAdminEmail(user.email)) {
    return user;
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  if (profile?.role !== 'ADMIN') {
    throw new Error('Unauthorized');
  }

  return user;
}

export async function POST(request: Request) {
  try {
    const adminUser = await assertAdminSession();
    const body = (await request.json()) as {
      action?: ReviewAction;
      userId?: string;
      reason?: string;
    };

    if (!body.userId || !body.action) {
      return NextResponse.json({ error: 'userId and action are required' }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data: profile, error: profileError } = await admin
      .from('profiles')
      .select('id, email, full_legal_name, kyc_data, status, role')
      .eq('id', body.userId)
      .maybeSingle();

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 500 });
    }

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    if (body.action === 'APPROVED') {
      const { error: updateError } = await admin
        .from('profiles')
        .update({
          status: 'APPROVED' satisfies ProfileStatus,
          reviewed_at: new Date().toISOString(),
          reviewed_by: adminUser.email,
        })
        .eq('id', profile.id);

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }

      await sendReviewEmail({
        to: profile.email,
        fullLegalName: profile.full_legal_name,
        status: 'APPROVED',
      });

      revalidatePath('/admin-dashboard/applications');
      return NextResponse.json({ ok: true, action: 'APPROVED' });
    }

    if (!body.reason?.trim()) {
      return NextResponse.json({ error: 'A rejection reason is required' }, { status: 400 });
    }

    await admin.from('application_rejections').insert({
      user_id: profile.id,
      email: profile.email,
      full_legal_name: profile.full_legal_name,
      role: profile.role ?? null,
      rejection_reason: body.reason.trim(),
      kyc_data: profile.kyc_data,
      rejected_by: adminUser.email,
    });

    const storagePaths = collectStoragePaths(profile.kyc_data as { identity?: { documents?: KycDocumentPaths } } | null);
    if (storagePaths.length > 0) {
      await admin.storage.from(KYC_BUCKET).remove(storagePaths);
    }

    await admin.from('profiles').delete().eq('id', profile.id);

    const { error: authError } = await admin.auth.admin.deleteUser(profile.id);
    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 500 });
    }

    let emailWarning: string | null = null;
    try {
      await sendReviewEmail({
        to: profile.email,
        fullLegalName: profile.full_legal_name,
        status: 'REJECTED',
        reason: body.reason.trim(),
      });
    } catch (error) {
      emailWarning = error instanceof Error ? error.message : 'Rejection email failed to send';
    }

    revalidatePath('/admin-dashboard');
    return NextResponse.json({
      ok: true,
      action: 'REJECTED',
      warning: emailWarning,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Review request failed' },
      { status: 500 }
    );
  }
}
