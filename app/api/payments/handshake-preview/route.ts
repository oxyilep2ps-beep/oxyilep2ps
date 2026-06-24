import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { calculateHandshakeFigures } from '@/lib/handshake/calculations';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const handshakeId = searchParams.get('handshakeId')?.trim();

  if (!handshakeId) {
    return NextResponse.json({ ok: false, error: 'handshakeId required' }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const { data: handshake, error } = await supabase
    .from('handshakes')
    .select('id, amount, rate, duration, status, payment_status, lender_id, borrower_id, txn_id')
    .eq('id', handshakeId)
    .maybeSingle();

  if (error || !handshake) {
    return NextResponse.json({ ok: false, error: 'Handshake not found' }, { status: 404 });
  }

  const isParty = handshake.lender_id === user.id || handshake.borrower_id === user.id;
  if (!isParty) {
    return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
  }

  const figures = calculateHandshakeFigures(
    Number(handshake.amount ?? 0),
    Number(handshake.rate ?? 0),
    Number(handshake.duration ?? 1)
  );

  return NextResponse.json({
    ok: true,
    handshake: {
      id: handshake.id,
      reference: handshake.txn_id ?? handshake.id.slice(0, 8).toUpperCase(),
      amount: Number(handshake.amount ?? 0),
      rate: Number(handshake.rate ?? 0),
      duration: Number(handshake.duration ?? 0),
      status: handshake.status,
      payment_status: handshake.payment_status,
      emi_amount: figures.emi_amount,
      total_return: figures.total_return,
      role: handshake.borrower_id === user.id ? 'borrower' : 'investor',
    },
  });
}
