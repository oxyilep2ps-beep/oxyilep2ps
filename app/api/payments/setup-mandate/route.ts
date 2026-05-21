import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isApprovedStatus } from '@/lib/auth/profile-status';
import { createBillingRequestMandateFlow } from '@/lib/gocardless/billing-request-flow';

export async function POST(request: Request) {
  let body: { borrowerId?: string; lenderId?: string };

  try {
    body = (await request.json()) as { borrowerId?: string; lenderId?: string };
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON body' }, { status: 400 });
  }

  const borrowerId = body.borrowerId?.trim();
  const lenderId = body.lenderId?.trim();

  if (!borrowerId || !lenderId) {
    return NextResponse.json(
      { ok: false, error: 'borrowerId and lenderId are required' },
      { status: 400 }
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  if (user.id !== borrowerId && user.id !== lenderId) {
    return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
  }

  const admin = createAdminClient();
  const [{ data: borrower }, { data: lender }] = await Promise.all([
    admin.from('profiles').select('id, role, status').eq('id', borrowerId).maybeSingle(),
    admin.from('profiles').select('id, role, status').eq('id', lenderId).maybeSingle(),
  ]);

  if (!borrower || !lender) {
    return NextResponse.json({ ok: false, error: 'Profiles not found' }, { status: 404 });
  }

  if (borrower.role !== 'BORROWER' || lender.role !== 'INVESTOR') {
    return NextResponse.json(
      { ok: false, error: 'lenderId must be INVESTOR and borrowerId must be BORROWER' },
      { status: 400 }
    );
  }

  if (!isApprovedStatus(borrower.status) || !isApprovedStatus(lender.status)) {
    return NextResponse.json(
      { ok: false, error: 'Both parties must be APPROVED before mandate setup' },
      { status: 403 }
    );
  }

  const origin = new URL(request.url).origin;
  const redirectUri = `${origin}/dashboard/portfolio?mandate=complete`;
  const exitUri = `${origin}/dashboard/portfolio?mandate=cancelled`;

  const result = await createBillingRequestMandateFlow({
    borrowerId,
    lenderId,
    redirectUri,
    exitUri,
  });

  if (!result.success || !result.authorisation_url) {
    return NextResponse.json(
      { ok: false, error: result.error ?? 'Failed to create mandate flow' },
      { status: 502 }
    );
  }

  return NextResponse.json({
    ok: true,
    authorisation_url: result.authorisation_url,
    billing_request_id: result.billing_request_id,
    billing_request_flow_id: result.billing_request_flow_id,
    stub: result.stub ?? false,
    environment: process.env.GOCARDLESS_ENVIRONMENT ?? 'sandbox',
  });
}
