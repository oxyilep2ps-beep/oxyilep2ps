import crypto from 'node:crypto';
import { Resend } from 'resend';
import { env } from '@/env';

type GuarantorInvitePayload = {
  loanId: string;
  guarantorEmail: string;
  borrowerName?: string;
  amount?: number;
  emiAmount?: number;
};

function getInviteSecret(): string {
  const secret = env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is required to sign guarantor invite links');
  }
  return secret;
}

function getBaseUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL?.trim() || 'http://localhost:3000';
}

export function createGuarantorInviteToken(loanId: string, email: string, issuedAt: number): string {
  const secret = getInviteSecret();
  return crypto
    .createHmac('sha256', secret)
    .update(`${loanId}:${email.toLowerCase()}:${issuedAt}`)
    .digest('hex');
}

export function buildGuarantorInviteUrl(loanId: string, email: string): { url: string; issuedAt: number; token: string } {
  const issuedAt = Date.now();
  const token = createGuarantorInviteToken(loanId, email, issuedAt);
  const url = new URL(`/guarantor/invite/${encodeURIComponent(loanId)}`, getBaseUrl());
  url.searchParams.set('email', email.toLowerCase());
  url.searchParams.set('issuedAt', String(issuedAt));
  url.searchParams.set('token', token);
  return { url: url.toString(), issuedAt, token };
}

export function verifyGuarantorInviteToken(
  loanId: string,
  email: string,
  issuedAt: string | number | null | undefined,
  token: string | null | undefined
): boolean {
  if (!loanId || !email || !issuedAt || !token) return false;
  const ts = Number(issuedAt);
  if (!Number.isFinite(ts)) return false;
  const expected = createGuarantorInviteToken(loanId, email, ts);
  const expectedBytes = Buffer.from(expected);
  const tokenBytes = Buffer.from(token);
  if (expectedBytes.length !== tokenBytes.length) return false;
  return crypto.timingSafeEqual(expectedBytes, tokenBytes);
}

export async function sendGuarantorInvite({
  loanId,
  guarantorEmail,
  borrowerName,
  amount,
  emiAmount,
}: GuarantorInvitePayload): Promise<{ ok: boolean; inviteUrl: string }> {
  const { url: inviteUrl } = buildGuarantorInviteUrl(loanId, guarantorEmail);
  const apiKey = env.RESEND_API_KEY ?? process.env.RESEND_API_KEY;

  if (!apiKey) {
    // eslint-disable-next-line no-console
    console.info('[guarantor/invite] Resend not configured, invite URL generated only', {
      guarantorEmail,
      loanId,
      inviteUrl,
    });
    return { ok: true, inviteUrl };
  }

  const resend = new Resend(apiKey);
  const amountText = typeof amount === 'number' ? `£${amount.toLocaleString('en-GB')}` : 'your loan';
  const emiText = typeof emiAmount === 'number' ? `£${emiAmount.toLocaleString('en-GB')}` : 'a fixed EMI';

  await resend.emails.send({
    from: 'Oxyile <guarantor@oxyile.com>',
    to: guarantorEmail,
    subject: 'Oxyile guarantor invitation',
    html: `
      <div style="font-family:Inter,Arial,sans-serif;line-height:1.6;color:#111827">
        <h1 style="margin:0 0 12px;font-size:24px">You have been invited as a guarantor</h1>
        <p>${borrowerName ? `${borrowerName} ` : 'A borrower '}has added you as a guarantor for ${amountText}.</p>
        <p>Estimated EMI: <strong>${emiText}</strong></p>
        <p>Please review the loan terms and secure your backup Direct Debit mandate using the link below.</p>
        <p><a href="${inviteUrl}" style="display:inline-block;background:#0f62fe;color:#fff;padding:12px 18px;border-radius:999px;text-decoration:none;font-weight:700">Review guarantor invitation</a></p>
        <p style="font-size:12px;color:#6b7280">If the button does not work, copy and paste this link: ${inviteUrl}</p>
      </div>
    `,
    text: `You have been invited as a guarantor. Review the loan terms here: ${inviteUrl}`,
  });

  return { ok: true, inviteUrl };
}
