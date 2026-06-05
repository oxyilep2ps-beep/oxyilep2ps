import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { COLLATERAL_TYPES } from '@/lib/collateral/constants';
import { uploadCollateralProof } from '@/lib/collateral/upload';

function toFile(value: FormDataEntryValue | null): File | null {
  return value instanceof File && value.size > 0 ? value : null;
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, status')
      .eq('id', user.id)
      .maybeSingle();

    if (!profile || profile.role !== 'BORROWER') {
      return NextResponse.json({ ok: false, error: 'Only borrowers can submit collateral-backed handshakes' }, { status: 403 });
    }

    const form = await request.formData();
    const lenderId = form.get('lender_id')?.toString().trim();
    const borrowerId = form.get('borrower_id')?.toString().trim();
    const amount = Number(form.get('amount'));
    const rate = Number(form.get('rate'));
    const duration = Number(form.get('duration'));
    const collateralType = form.get('collateral_type')?.toString().trim();
    const collateralValue = Number(form.get('collateral_value'));
    const collateralDescription = form.get('collateral_description')?.toString().trim();
    const collateralProof = toFile(form.get('collateral_proof'));
    const peerId = form.get('peer_id')?.toString().trim();

    if (!lenderId || !borrowerId || borrowerId !== user.id) {
      return NextResponse.json({ ok: false, error: 'Invalid handshake parties' }, { status: 400 });
    }

    if (!amount || !rate || !duration) {
      return NextResponse.json({ ok: false, error: 'Amount, rate, and duration are required' }, { status: 400 });
    }

    if (
      !collateralType ||
      !COLLATERAL_TYPES.includes(collateralType as (typeof COLLATERAL_TYPES)[number]) ||
      collateralValue <= 0 ||
      !collateralDescription ||
      !collateralProof
    ) {
      return NextResponse.json(
        { ok: false, error: 'Collateral type, value, description, and proof document are required' },
        { status: 400 }
      );
    }

    const admin = createAdminClient();
    const collateralProofPath = await uploadCollateralProof(admin, collateralProof, user.id);

    const { error: profileError } = await admin
      .from('profiles')
      .update({
        collateral_type: collateralType,
        collateral_value: collateralValue,
        collateral_description: collateralDescription,
        collateral_proof_url: collateralProofPath,
        target_amount: amount,
      })
      .eq('id', user.id);

    if (profileError) {
      return NextResponse.json({ ok: false, error: profileError.message }, { status: 500 });
    }

    const { data: handshake, error: handshakeError } = await supabase
      .from('handshakes')
      .insert({
        lender_id: lenderId,
        borrower_id: borrowerId,
        amount,
        rate,
        duration,
        status: 'PENDING',
      })
      .select('id')
      .single();

    if (handshakeError) {
      return NextResponse.json({ ok: false, error: handshakeError.message }, { status: 500 });
    }

    if (peerId) {
      await supabase.from('messages').insert({
        sender_id: user.id,
        receiver_id: peerId,
        content: `🤝 Handshake proposed: £${amount} at ${rate}% for ${duration} months (collateral secured).`,
      });
    }

    return NextResponse.json({ ok: true, handshakeId: handshake.id });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Handshake proposal failed';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
