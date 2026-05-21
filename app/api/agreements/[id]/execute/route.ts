import { NextResponse } from 'next/server';
import { executeLegacyAgreement } from '@/app/actions/handshake';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const admin = createAdminClient();
    const { data: agreement } = await admin
      .from('agreements')
      .select('id, lender_id, borrower_id, status')
      .eq('id', id)
      .maybeSingle();

    if (!agreement) {
      return NextResponse.json({ ok: false, error: 'Agreement not found' }, { status: 404 });
    }

    if (agreement.lender_id !== user.id && agreement.borrower_id !== user.id) {
      return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
    }

    if (agreement.status !== 'SIGNED') {
      return NextResponse.json({ ok: false, error: 'Agreement must be SIGNED first' }, { status: 400 });
    }

    const result = await executeLegacyAgreement(id);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Failed to execute handshake' },
      { status: 500 }
    );
  }
}
