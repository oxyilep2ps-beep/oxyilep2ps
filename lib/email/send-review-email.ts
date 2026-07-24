import { Resend } from 'resend';

export type ReviewEmailStatus = 'APPROVED' | 'REJECTED';

export interface ReviewEmailPayload {
  to: string;
  fullLegalName: string;
  status: ReviewEmailStatus;
  reason?: string;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getSubject(status: ReviewEmailStatus): string {
  return status === 'APPROVED'
    ? 'Congratulations! Your Oxyile profile has been approved'
    : 'Update on your Oxyile Application';
}

function getHtml(payload: ReviewEmailPayload): string {
  const name = escapeHtml(payload.fullLegalName || 'Applicant');

  if (payload.status === 'APPROVED') {
    return `
      <div style="background:#080808;color:#f8f5ef;font-family:Inter,Arial,sans-serif;padding:32px">
        <div style="max-width:640px;margin:0 auto;border:1px solid rgba(255,255,255,.08);border-radius:24px;overflow:hidden;background:linear-gradient(180deg,#111,#080808)">
          <div style="padding:28px 32px;border-bottom:1px solid rgba(255,129,74,.18)">
            <div style="color:#ff814a;font-size:12px;letter-spacing:.28em;text-transform:uppercase;font-weight:700">Oxyile</div>
            <h1 style="margin:12px 0 0;font-size:28px;line-height:1.1">Your profile has been approved</h1>
          </div>
          <div style="padding:32px;font-size:16px;line-height:1.7;color:#f2eee6">
            <p style="margin-top:0">Dear ${name},</p>
            <p>Congratulations! Your Oxyile profile has been verified and approved. Welcome to the UK's premier Direct Lending Ecosystem.</p>
            <p style="margin-bottom:0">You can now sign in and continue using your approved dashboard.</p>
          </div>
        </div>
      </div>
    `;
  }

  const reason = escapeHtml((payload.reason ?? '').trim() || 'No reason was provided.');

  return `
    <div style="background:#080808;color:#f8f5ef;font-family:Inter,Arial,sans-serif;padding:32px">
      <div style="max-width:640px;margin:0 auto;border:1px solid rgba(255,255,255,.08);border-radius:24px;overflow:hidden;background:linear-gradient(180deg,#111,#080808)">
        <div style="padding:28px 32px;border-bottom:1px solid rgba(255,129,74,.18)">
          <div style="color:#ff814a;font-size:12px;letter-spacing:.28em;text-transform:uppercase;font-weight:700">Oxyile</div>
          <h1 style="margin:12px 0 0;font-size:28px;line-height:1.1">Update on your Oxyile Application</h1>
        </div>
        <div style="padding:32px;font-size:16px;line-height:1.7;color:#f2eee6">
          <p style="margin-top:0">Dear ${name},</p>
          <p>Unfortunately, your application has been declined at this time for the following reason:</p>
          <p style="margin:20px 0;padding:16px 18px;border-radius:16px;background:rgba(255,129,74,.12);border:1px solid rgba(255,129,74,.28)">
            <strong style="color:#ffb08a">${reason}</strong>
          </p>
          <p style="margin-bottom:0">If you have questions, please contact support.</p>
        </div>
      </div>
    </div>
  `;
}

/**
 * Sends approval/rejection emails via Resend.
 * Throws when RESEND_API_KEY is missing or the provider rejects the request.
 */
export async function sendReviewEmail(
  payload: ReviewEmailPayload
): Promise<{ ok: true; messageId?: string }> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    throw new Error('RESEND_API_KEY is not configured. Cannot send review email.');
  }

  const to = payload.to?.trim();
  if (!to) {
    throw new Error('Applicant email address is missing.');
  }

  const from = process.env.EMAIL_FROM?.trim() || 'Oxyile <noreply@oxyile.com>';
  const subject = getSubject(payload.status);
  const html = getHtml(payload);

  const resend = new Resend(apiKey);
  const { data, error } = await resend.emails.send({
    from,
    to: [to],
    subject,
    html,
  });

  if (error) {
    throw new Error(`Failed to send email via Resend: ${error.message}`);
  }

  return { ok: true, messageId: data?.id };
}
