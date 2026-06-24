import { NextResponse } from 'next/server';
import { ethers } from 'ethers';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { calculateHandshakeFigures } from '@/lib/handshake/calculations';
import {
  getEscrowMaticAmount,
  getPlatformEscrowWallet,
  isValidTxHash,
  POLYGON_AMOY_RPC_URL,
} from '@/lib/web3/polygon-amoy';

async function verifyEscrowTransaction(txHash: string, escrowWallet: string): Promise<void> {
  const provider = new ethers.JsonRpcProvider(POLYGON_AMOY_RPC_URL);
  const [tx, receipt] = await Promise.all([
    provider.getTransaction(txHash),
    provider.getTransactionReceipt(txHash),
  ]);

  if (!tx) {
    throw new Error('Transaction not found on Polygon Amoy. Wait a few seconds and try again.');
  }

  if (!receipt || receipt.status !== 1) {
    throw new Error('Transaction is not confirmed on Polygon Amoy yet.');
  }

  if (!tx.to || tx.to.toLowerCase() !== escrowWallet.toLowerCase()) {
    throw new Error('Transaction recipient does not match the Oxyile escrow wallet.');
  }

  const minWei = ethers.parseEther(getEscrowMaticAmount());
  if (tx.value < minWei) {
    throw new Error(`Escrow deposit must be at least ${getEscrowMaticAmount()} MATIC.`);
  }
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

    const body = (await request.json()) as { handshakeId?: string; txHash?: string };
    const handshakeId = body.handshakeId?.trim();
    const txHash = body.txHash?.trim();

    if (!handshakeId) {
      return NextResponse.json({ ok: false, error: 'handshakeId required' }, { status: 400 });
    }

    if (!txHash || !isValidTxHash(txHash)) {
      return NextResponse.json({ ok: false, error: 'A valid Polygon transaction hash is required' }, { status: 400 });
    }

    const escrowWallet = getPlatformEscrowWallet();
    if (!escrowWallet) {
      return NextResponse.json(
        { ok: false, error: 'Platform escrow wallet is not configured on the server' },
        { status: 503 }
      );
    }

    const admin = createAdminClient();
    const { data: handshake, error: hsError } = await admin
      .from('handshakes')
      .select('*')
      .eq('id', handshakeId)
      .eq('borrower_id', user.id)
      .maybeSingle();

    if (hsError || !handshake) {
      return NextResponse.json({ ok: false, error: 'Handshake not found' }, { status: 404 });
    }

    if (!handshake.lender_approved_at || !handshake.borrower_approved_at) {
      return NextResponse.json({ ok: false, error: 'Both parties must approve before escrow payment' }, { status: 400 });
    }

    await verifyEscrowTransaction(txHash, escrowWallet);

    const figures = calculateHandshakeFigures(
      Number(handshake.amount ?? 0),
      Number(handshake.rate ?? 0),
      Number(handshake.duration ?? 1)
    );

    const now = new Date().toISOString();
    const subscriptionId =
      (handshake.gocardless_subscription_id as string | null) ??
      `WEB3_${handshakeId.slice(0, 8)}_${Date.now()}`;

    const { error: mandateError } = await admin.from('gocardless_mandates').upsert({
      user_id: user.id,
      mandate_id: `MD_WEB3_${handshakeId.slice(0, 8)}`,
      status: 'active',
      handshake_id: handshakeId,
      updated_at: now,
    });

    if (mandateError) {
      throw new Error(mandateError.message);
    }

    const { data: updated, error: updateError } = await admin
      .from('handshakes')
      .update({
        status: 'ACTIVE',
        payment_status: 'ACTIVE',
        tx_hash: txHash,
        polygon_tx_hash: txHash,
        emi_amount: figures.emi_amount,
        total_return: figures.total_return,
        gocardless_subscription_id: subscriptionId,
        auto_emi_active: true,
        activated_at: handshake.activated_at ?? now,
      })
      .eq('id', handshakeId)
      .select('id, status, payment_status, tx_hash, polygon_tx_hash')
      .single();

    if (updateError) {
      throw new Error(updateError.message);
    }

    return NextResponse.json({
      ok: true,
      txHash,
      handshake: updated,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Escrow confirmation failed';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
