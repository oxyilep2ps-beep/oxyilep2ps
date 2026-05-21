import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { executeHandshake } from '@/app/actions/handshake';

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: handshake } = await admin
    .from('handshakes')
    .select('id, lender_id, borrower_id, lender_approved_at, borrower_approved_at')
    .eq('id', id)
    .maybeSingle();

  if (!handshake) {
    return NextResponse.json({ ok: false, error: 'Handshake not found' }, { status: 404 });
  }

  if (handshake.lender_id !== user.id && handshake.borrower_id !== user.id) {
    return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
  }

  if (!handshake.lender_approved_at || !handshake.borrower_approved_at) {
    return NextResponse.json({ ok: false, error: 'Both parties must approve first' }, { status: 400 });
  }

  try {
    const result = await executeHandshake(handshake.lender_id, handshake.borrower_id, handshake.id);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Execution failed' },
      { status: 500 }
    );
  }
}
