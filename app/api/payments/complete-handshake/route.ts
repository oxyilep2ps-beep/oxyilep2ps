import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { executeHandshake } from '@/app/actions/handshake';
import { createMonthlyEmiSubscription } from '@/lib/gocardless/subscriptions';

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
      handshakeId: string;
      mandateId?: string;
      stub?: boolean;
    };

    if (!body.handshakeId) {
      return NextResponse.json({ ok: false, error: 'handshakeId required' }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data: handshake, error: hsError } = await admin
      .from('handshakes')
      .select('*')
      .eq('id', body.handshakeId)
      .eq('borrower_id', user.id)
      .maybeSingle();

    if (hsError || !handshake) {
      return NextResponse.json({ ok: false, error: 'Handshake not found' }, { status: 404 });
    }

    if (!handshake.lender_approved_at || !handshake.borrower_approved_at) {
      return NextResponse.json({ ok: false, error: 'Both parties must approve first' }, { status: 400 });
    }

    const mandateId =
      body.mandateId ?? `MD${body.stub ? '_STUB' : ''}_${user.id.slice(0, 8)}_${Date.now()}`;

    await admin.from('gocardless_mandates').upsert({
      user_id: user.id,
      mandate_id: mandateId,
      status: 'active',
      handshake_id: body.handshakeId,
      updated_at: new Date().toISOString(),
    });

    const mint = await executeHandshake(
      handshake.lender_id as string,
      handshake.borrower_id as string,
      body.handshakeId
    );

    const emi = Number(handshake.emi_amount ?? 0);
    const amountPence = Math.max(100, Math.round(emi * 100));
    const sub = await createMonthlyEmiSubscription({
      mandateId,
      amountPence,
      name: `Oxyile EMI — ${body.handshakeId.slice(0, 8)}`,
      handshakeId: body.handshakeId,
      totalPayments: Number(handshake.duration ?? 12),
    });

    if (sub.success && sub.subscription_id) {
      await admin
        .from('handshakes')
        .update({
          gocardless_subscription_id: sub.subscription_id,
          auto_emi_active: true,
        })
        .eq('id', body.handshakeId);
    }

    return NextResponse.json({
      ok: true,
      polygonTxHash: mint.polygonTxHash,
      subscription_id: sub.subscription_id,
      sandbox: mint.sandbox,
      bank_linked: true,
      contract_minted: true,
      auto_emi_active: sub.success,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Completion failed';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
