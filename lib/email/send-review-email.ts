export type ReviewEmailStatus = 'APPROVED' | 'REJECTED';

export interface ReviewEmailPayload {
  to: string;
  fullLegalName: string;
  status: ReviewEmailStatus;
  reason?: string;
}

function getSubject(status: ReviewEmailStatus): string {
  return status === 'APPROVED'
    ? 'Congratulations! Your Oxyile profile has been approved'
    : 'Update on your Oxyile application';
}

function getHtml(payload: ReviewEmailPayload): string {
  if (payload.status === 'APPROVED') {
    return `
      <div style="background:#080808;color:#f8f5ef;font-family:Inter,Arial,sans-serif;padding:32px">
        <div style="max-width:640px;margin:0 auto;border:1px solid rgba(255,255,255,.08);border-radius:24px;overflow:hidden;background:linear-gradient(180deg,#111,#080808)">
          <div style="padding:28px 32px;border-bottom:1px solid rgba(255,129,74,.18)">
            <div style="color:#ff814a;font-size:12px;letter-spacing:.28em;text-transform:uppercase;font-weight:700">Oxyile</div>
            <h1 style="margin:12px 0 0;font-size:28px;line-height:1.1">Your profile has been approved</h1>
          </div>
          <div style="padding:32px;font-size:16px;line-height:1.7;color:#f2eee6">
            <p style="margin-top:0">Dear ${payload.fullLegalName},</p>
            <p>Congratulations! Your Oxyile profile has been verified and approved. Welcome to the UK's premier Direct Lending Ecosystem.</p>
            <p style="margin-bottom:0">You can now sign in and continue using your approved dashboard.</p>
          </div>
        </div>
      </div>
    `;
  }

  return `
    <div style="background:#080808;color:#f8f5ef;font-family:Inter,Arial,sans-serif;padding:32px">
      <div style="max-width:640px;margin:0 auto;border:1px solid rgba(255,255,255,.08);border-radius:24px;overflow:hidden;background:linear-gradient(180deg,#111,#080808)">
        <div style="padding:28px 32px;border-bottom:1px solid rgba(255,129,74,.18)">
          <div style="color:#ff814a;font-size:12px;letter-spacing:.28em;text-transform:uppercase;font-weight:700">Oxyile</div>
          <h1 style="margin:12px 0 0;font-size:28px;line-height:1.1">Application update</h1>
        </div>
        <div style="padding:32px;font-size:16px;line-height:1.7;color:#f2eee6">
          <p style="margin-top:0">Dear ${payload.fullLegalName},</p>
          <p>Update on your Oxyile Application. Unfortunately, your application was rejected.${payload.reason ? ` Reason: ${payload.reason}` : ''}</p>
          <p style="margin-bottom:0">If you believe this was made in error, please contact the compliance team for next steps.</p>
        </div>
      </div>
    </div>
  `;
}

export async function sendReviewEmail(payload: ReviewEmailPayload): Promise<{ ok: boolean; messageId?: string }> {
  const from = process.env.EMAIL_FROM ?? 'Oxyile <noreply@oxyile.com>';
  const apiKey = process.env.RESEND_API_KEY;
  const subject = getSubject(payload.status);
  const html = getHtml(payload);

  if (!apiKey) {
    console.info('[email:review:dev-log]', { to: payload.to, subject });
    return { ok: true, messageId: `dev-${Date.now()}` };
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [payload.to],
      subject,
      html,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Email delivery failed: ${errorText}`);
  }

  const data = (await response.json()) as { id?: string };
  return { ok: true, messageId: data.id };
}
