import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createMonthlyEmiSubscription } from '@/lib/gocardless/subscriptions';
import { calculateHandshakeFigures } from '@/lib/handshake/calculations';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await request.json()) as { handshakeId: string; mandateId?: string };
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

    const mandateId =
      body.mandateId ??
      (
        await admin
          .from('gocardless_mandates')
          .select('mandate_id')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .maybeSingle()
      ).data?.mandate_id;

    if (!mandateId) {
      return NextResponse.json({ ok: false, error: 'No active mandate' }, { status: 400 });
    }

    const figures = calculateHandshakeFigures(
      Number(handshake.amount ?? 0),
      Number(handshake.rate ?? 0),
      Number(handshake.duration ?? 1)
    );
    const emi = figures.emi_amount;
    const duration = Math.max(1, Math.round(Number(handshake.duration ?? 12)));

    if (!Number.isFinite(emi) || emi <= 0 || !Number.isFinite(figures.total_return) || figures.total_return <= 0) {
      return NextResponse.json({ ok: false, error: 'Invalid EMI amount for subscription' }, { status: 400 });
    }

    const sub = await createMonthlyEmiSubscription({
      mandateId,
      amountGbp: emi,
      name: `Oxyile EMI — ${body.handshakeId.slice(0, 8)}`,
      handshakeId: body.handshakeId,
      totalPayments: duration,
    });

    if (!sub.success) {
      return NextResponse.json({ ok: false, error: sub.error }, { status: 500 });
    }

    const { error: handshakeUpdateError } = await admin
      .from('handshakes')
      .update({
        emi_amount: emi,
        total_return: figures.total_return,
        gocardless_subscription_id: sub.subscription_id,
        payment_status: 'ACTIVE',
        auto_emi_active: true,
      })
      .eq('id', body.handshakeId);

    if (handshakeUpdateError) {
      throw new Error(handshakeUpdateError.message);
    }

    const { error: mandateUpsertError } = await admin.from('gocardless_mandates').upsert({
      user_id: user.id,
      mandate_id: mandateId,
      status: 'active',
      handshake_id: body.handshakeId,
      updated_at: new Date().toISOString(),
    });

    if (mandateUpsertError) {
      throw new Error(mandateUpsertError.message);
    }

    return NextResponse.json({
      ok: true,
      subscription_id: sub.subscription_id,
      stub: sub.stub ?? false,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Subscription failed';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
