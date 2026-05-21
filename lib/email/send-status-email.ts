import { UserStatus } from '@/lib/types/user';

export interface StatusEmailPayload {
  to: string;
  fullLegalName: string;
  status: UserStatus;
}

/**
 * SMTP / transactional email scaffold.
 * Wire to Resend, SendGrid, AWS SES, or nodemailer in production.
 *
 * Required env: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, EMAIL_FROM
 */
export async function sendStatusEmail(payload: StatusEmailPayload): Promise<{ ok: boolean; messageId?: string }> {
  const { to, fullLegalName, status } = payload;

  const subject =
    status === UserStatus.APPROVED
      ? 'Oxyile — Your account has been approved'
      : 'Oxyile — Application update';

  const body =
    status === UserStatus.APPROVED
      ? `Dear ${fullLegalName},\n\nYour Oxyile account has been approved. You may now sign in and access the platform.\n\nRegards,\nOxyile Compliance Team`
      : `Dear ${fullLegalName},\n\nThank you for your interest in Oxyile. After review we are unable to approve your application at this time. Contact oxyilemoneyquest.support@gmail.com for details.\n\nRegards,\nOxyile Compliance Team`;

  // Production: replace with real SMTP transport
  if (process.env.SMTP_HOST && process.env.EMAIL_FROM) {
    // Example nodemailer integration point:
    // const transporter = nodemailer.createTransport({ host, port, auth: { user, pass } });
    // const info = await transporter.sendMail({ from: process.env.EMAIL_FROM, to, subject, text: body });
    // return { ok: true, messageId: info.messageId };
    console.info('[email:stub-smtp]', { to, subject, from: process.env.EMAIL_FROM });
    return { ok: true, messageId: `smtp-${Date.now()}` };
  }

  console.info('[email:dev-log]', { to, subject, bodyPreview: body.slice(0, 120) });
  return { ok: true, messageId: `dev-${Date.now()}` };
}
