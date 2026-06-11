'use server';

/**
 * Simulates sending a secure E-Sign + KYC invitation to a loan guarantor.
 * Production: integrate DocuSign / Onfido webhook here.
 */
export async function sendGuarantorInvite(
  email: string,
  handshakeId: string
): Promise<{ ok: boolean; inviteUrl: string }> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://oxyile.com';
  const inviteUrl = `${baseUrl}/guarantor/sign?handshake=${handshakeId}&token=mock_${Date.now()}`;

  // eslint-disable-next-line no-console
  console.info('[sendGuarantorInvite:mock]', {
    to: email,
    handshakeId,
    inviteUrl,
    message: 'Secure E-Sign and KYC link dispatched (simulated).',
  });

  return { ok: true, inviteUrl };
}
