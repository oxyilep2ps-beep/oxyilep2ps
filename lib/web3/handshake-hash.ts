import { concat, getBytes, hexlify, keccak256, toUtf8Bytes } from 'ethers';

export type HandshakeHashInput = {
  handshakeId: string;
  borrowerId: string;
  lenderId: string;
  amount: number;
  timestamp: string;
};

/** Deterministic keccak256 digest of core handshake agreement fields. */
export function hashHandshakeAgreement(input: HandshakeHashInput): string {
  const canonical = JSON.stringify({
    handshakeId: input.handshakeId,
    borrowerId: input.borrowerId,
    lenderId: input.lenderId,
    amount: input.amount,
    timestamp: input.timestamp,
  });
  return keccak256(toUtf8Bytes(canonical));
}

export function buildHandshakeOnChainData(input: HandshakeHashInput): string {
  const digest = hashHandshakeAgreement(input);
  return hexlify(
    concat([toUtf8Bytes(`OXYILE-HANDSHAKE:${input.handshakeId}:`), getBytes(digest)])
  );
}
