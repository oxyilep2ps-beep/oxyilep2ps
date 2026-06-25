import { createAdminClient } from '@/lib/supabase/admin';
import { HANDSHAKE_CONTRACT_ABI, PLACEHOLDER_HANDSHAKE_CONTRACT_AMOY } from '@/lib/web3/handshake-contract';
import { createPolygonRelayerWallet } from '@/lib/web3/relayer-wallet';

export type Web3ActionType = 'MINT_CONTRACT' | 'UPDATE_EMI_PAID';

export type ExecuteWeb3Result = {
  ok: boolean;
  txHash: string | null;
  queued: boolean;
  warning?: string | null;
  error?: string;
};

function isPolygonTxHash(value: unknown): value is `0x${string}` {
  return typeof value === 'string' && /^0x[a-fA-F0-9]{64}$/.test(value);
}

async function sendOnChainAction(
  actionType: Web3ActionType,
  handshakeId: string,
  payload: Record<string, unknown>
): Promise<{ txHash: string; warning?: string | null }> {
  const contractAddress = process.env.POLYGON_HANDSHAKE_CONTRACT;
  const { ethers } = await import('ethers');
  const wallet = await createPolygonRelayerWallet();

  if (actionType === 'MINT_CONTRACT') {
    const admin = createAdminClient();
    const { data: handshake, error } = await admin
      .from('handshakes')
      .select('id, lender_id, borrower_id, amount, rate, duration')
      .eq('id', handshakeId)
      .maybeSingle();

    if (error || !handshake) throw new Error(error?.message ?? 'Handshake not found for mint');

    if (contractAddress && contractAddress !== PLACEHOLDER_HANDSHAKE_CONTRACT_AMOY) {
      const contract = new ethers.Contract(contractAddress, HANDSHAKE_CONTRACT_ABI, wallet);
      const tx = await contract.mintAgreement(
        handshake.id,
        handshake.lender_id,
        handshake.borrower_id,
        ethers.parseUnits(String(handshake.amount), 2),
        BigInt(Math.round(Number(handshake.rate) * 100)),
        BigInt(handshake.duration)
      );
      const receipt = await tx.wait();
      const receiptHash = receipt?.hash ?? tx.hash ?? null;
      if (!isPolygonTxHash(receiptHash)) throw new Error('Invalid mint transaction hash');
      return { txHash: receiptHash };
    }

    const tx = await wallet.sendTransaction({
      to: wallet.address,
      value: 0n,
      data: ethers.hexlify(ethers.toUtf8Bytes(`OXYILE-MINT-${handshakeId}`)),
    });
    const receipt = await tx.wait();
    const receiptHash = receipt?.hash ?? tx.hash ?? null;
    if (!isPolygonTxHash(receiptHash)) throw new Error('Invalid fallback mint transaction hash');
    return {
      txHash: receiptHash,
      warning: 'No POLYGON_HANDSHAKE_CONTRACT configured. Logged mint proof via self-transaction.',
    };
  }

  const paymentId = String(payload.payment_id ?? 'unknown');
  const tx = await wallet.sendTransaction({
    to: wallet.address,
    value: 0n,
    data: ethers.hexlify(ethers.toUtf8Bytes(`OXYILE-EMI-PAID-${handshakeId}-${paymentId}`)),
  });
  const receipt = await tx.wait();
  const receiptHash = receipt?.hash ?? tx.hash ?? null;
  if (!isPolygonTxHash(receiptHash)) throw new Error('Invalid EMI ledger transaction hash');
  return { txHash: receiptHash };
}

async function enqueueWeb3Transaction(
  handshakeId: string,
  actionType: Web3ActionType,
  payload: Record<string, unknown>
): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin.from('web3_tx_queue').insert({
    handshake_id: handshakeId,
    action_type: actionType,
    payload,
    status: 'pending',
    retry_count: 0,
  });
  if (error) throw new Error(error.message);
}

/**
 * Execute a Polygon transaction with automatic fallback to `web3_tx_queue`
 * when the network or signer is unavailable.
 */
export async function executeWeb3Transaction(
  handshakeId: string,
  actionType: Web3ActionType,
  payload: Record<string, unknown> = {}
): Promise<ExecuteWeb3Result> {
  try {
    const { txHash, warning } = await sendOnChainAction(actionType, handshakeId, payload);
    const admin = createAdminClient();

    const { error: updateError } = await admin
      .from('handshakes')
      .update({
        tx_hash: txHash,
        polygon_tx_hash: txHash,
        ...(actionType === 'MINT_CONTRACT'
          ? { status: 'ACTIVE', activated_at: new Date().toISOString() }
          : {}),
      })
      .eq('id', handshakeId);

    if (updateError) throw new Error(updateError.message);

    return { ok: true, txHash, queued: false, warning: warning ?? null };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Polygon transaction failed';
    try {
      await enqueueWeb3Transaction(handshakeId, actionType, payload);
      return { ok: false, txHash: null, queued: true, error: message };
    } catch (queueErr) {
      const queueMessage = queueErr instanceof Error ? queueErr.message : 'Queue insert failed';
      return { ok: false, txHash: null, queued: false, error: `${message} (queue: ${queueMessage})` };
    }
  }
}
