import { Resend } from 'resend';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getSignupFromAddress(): string {
  // Prefer explicit Resend/from override, then EMAIL_USER (support Gmail), then fallback.
  const configured = process.env.EMAIL_FROM?.trim();
  if (configured) return configured;

  const support = process.env.EMAIL_USER?.trim() || 'oxyilemoneyquest.support@gmail.com';
  return `OXYILE SUPPORT <${support}>`;
}

/**
 * Welcome / verification email via Resend.
 * Injects the Supabase Admin generateLink action_link into the branded HTML.
 */
export async function sendSignupVerificationEmail(params: {
  to: string;
  fullLegalName: string;
  /** Supabase admin.generateLink → properties.action_link */
  verificationUrl: string;
}): Promise<{ ok: true; messageId?: string }> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    throw new Error('RESEND_API_KEY is not configured. Cannot send verification email.');
  }

  const to = params.to?.trim();
  if (!to) {
    throw new Error('Recipient email address is missing.');
  }

  const verificationUrl = params.verificationUrl?.trim();
  if (!verificationUrl) {
    throw new Error('Verification URL is missing.');
  }

  const name = escapeHtml(params.fullLegalName || 'there');
  const displayLink = escapeHtml(verificationUrl);
  const href = verificationUrl.replace(/"/g, '&quot;');
  const from = getSignupFromAddress();

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /></head>
<body style="margin:0;padding:0;background:#080808;">
  <div style="background:#080808;color:#f8f5ef;font-family:Inter,Arial,Helvetica,sans-serif;padding:32px">
    <div style="max-width:640px;margin:0 auto;border:1px solid rgba(255,255,255,.08);border-radius:24px;overflow:hidden;background:linear-gradient(180deg,#14110f 0%,#080808 100%)">
      <div style="padding:28px 32px;border-bottom:1px solid rgba(255,90,31,.22);background:radial-gradient(circle at top right,rgba(255,90,31,.18),transparent 55%)">
        <div style="color:#ff5a1f;font-size:12px;letter-spacing:.28em;text-transform:uppercase;font-weight:700">Oxyile</div>
        <h1 style="margin:14px 0 0;font-size:30px;line-height:1.15;color:#fffaf5">Welcome to the Future of Finance</h1>
        <p style="margin:12px 0 0;font-size:15px;color:#d7cfc4">Your account is ready — verify your email to continue onboarding.</p>
      </div>
      <div style="padding:32px;font-size:16px;line-height:1.7;color:#f2eee6">
        <p style="margin-top:0">Hi ${name},</p>
        <p>
          Thank you for joining Oxyile, the UK peer-to-peer lending platform built for transparency,
          compliance, and direct capital markets.
        </p>
        <p>
          Please verify your email address to activate your account. After verification, our compliance
          team will review your KYC documents (this usually takes a short time).
        </p>
        <p style="margin:28px 0;text-align:center">
          <a href="${href}"
             style="display:inline-block;background:#ff5a1f;color:#080808;padding:14px 26px;border-radius:999px;text-decoration:none;font-weight:800;letter-spacing:.02em">
            Verify My Email
          </a>
        </p>
        <p style="font-size:13px;color:#b7b0a4;margin-bottom:0">
          If the button does not work, copy and paste this link into your browser:<br/>
          <span style="word-break:break-all;color:#ffb08a">${displayLink}</span>
        </p>
        <p style="font-size:12px;color:#8a847a;margin-top:24px;margin-bottom:0">
          Tip: check your Spam or Junk folder if you do not see this within a few minutes.<br/>
          Questions? Reply to this email or contact oxyilemoneyquest.support@gmail.com.
        </p>
      </div>
    </div>
  </div>
</body>
</html>
  `.trim();

  const resend = new Resend(apiKey);
  const { data, error } = await resend.emails.send({
    from,
    to: [to],
    subject: 'Verify your Oxyile Account — Welcome to the Future of Finance',
    html,
    text: [
      `Welcome to the Future of Finance`,
      ``,
      `Hi ${params.fullLegalName || 'there'},`,
      ``,
      `Verify your Oxyile account:`,
      verificationUrl,
      ``,
      `If you do not see this email, check Spam/Junk.`,
      `Support: oxyilemoneyquest.support@gmail.com`,
    ].join('\n'),
  });

  if (error) {
    throw new Error(`Failed to send verification email via Resend: ${error.message}`);
  }

  return { ok: true, messageId: data?.id };
}
