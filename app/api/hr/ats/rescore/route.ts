import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { assertHrOrAdmin } from '@/lib/auth/assert-hr';
import { createAdminClient } from '@/lib/supabase/admin';
import { rescoreZeroAtsApplications } from '@/lib/hr/rescore-zero-applications';

export const maxDuration = 300;

export async function POST() {
  try {
    await assertHrOrAdmin();
  } catch {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const admin = createAdminClient();
    const result = await rescoreZeroAtsApplications(admin);
    revalidatePath('/hr/recruitment');
    revalidatePath('/hr');
    revalidatePath('/admin-dashboard/hr-overview');
    return NextResponse.json({
      ok: true,
      message: `Rescored ${result.updated} of ${result.scanned} applications (${result.failed} failed).`,
      ...result,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'ATS rescore failed';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
