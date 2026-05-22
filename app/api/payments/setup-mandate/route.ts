import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createBillingRequestMandateFlow } from '@/lib/gocardless/billing-request-flow';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await request.json()) as {
      borrowerId?: string;
      lenderId?: string;
      handshakeId?: string;
    };

    const borrowerId = body.borrowerId ?? user.id;
    const lenderId = body.lenderId;

    if (!lenderId) {
      return NextResponse.json({ ok: false, error: 'lenderId is required' }, { status: 400 });
    }

    if (borrowerId !== user.id) {
      return NextResponse.json({ ok: false, error: 'Only the borrower can start mandate setup' }, { status: 403 });
    }

    const origin = new URL(request.url).origin;
    const handshakeQuery = body.handshakeId ? `&handshakeId=${body.handshakeId}` : '';
    const redirectUri = `${origin}/payments/mandate-complete?status=success${handshakeQuery}`;
    const exitUri = `${origin}/payments/mandate-complete?status=cancelled${handshakeQuery}`;

    const flow = await createBillingRequestMandateFlow({
      borrowerId,
      lenderId,
      redirectUri,
      exitUri,
    });

    if (!flow.success || !flow.authorisation_url) {
      return NextResponse.json(
        { ok: false, error: flow.error ?? 'Could not create billing request flow' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      authorisation_url: flow.authorisation_url,
      billing_request_id: flow.billing_request_id,
      billing_request_flow_id: flow.billing_request_flow_id,
      stub: flow.stub ?? false,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Mandate setup failed';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
