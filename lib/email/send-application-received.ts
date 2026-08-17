import { Resend } from 'resend';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export async function sendApplicationReceivedEmail(input: {
  to: string;
  candidateName: string;
  jobTitle: string;
}): Promise<{ success: boolean }> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) return { success: false };

  const to = String(input.to ?? '').trim();
  const candidateName = String(input.candidateName ?? '').trim() || 'there';
  const jobTitle = String(input.jobTitle ?? '').trim() || 'this role';
  if (!to.includes('@')) return { success: false };

  const name = escapeHtml(candidateName);
  const title = escapeHtml(jobTitle);

  try {
    const resend = new Resend(apiKey);
    const result = await resend.emails.send({
      from: 'Oxyile Careers <no-reply@oxyile.com>',
      replyTo: 'oxyilemoneyquest.support@gmail.com',
      to: [to],
      subject: `Application Received: ${jobTitle} at Oxyile`,
      html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /></head>
<body style="margin:0;padding:0;background:#000000;">
  <div style="background:#000000;color:#f8f5ef;font-family:Inter,Arial,Helvetica,sans-serif;padding:32px">
    <div style="max-width:640px;margin:0 auto;border:1px solid rgba(249,115,22,.28);border-radius:24px;overflow:hidden;background:#0a0a0a">
      <div style="padding:24px 32px;border-bottom:1px solid rgba(249,115,22,.25)">
        <p style="margin:0;color:#F97316;font-size:11px;letter-spacing:.28em;text-transform:uppercase;font-weight:800">Oxyile Careers</p>
      </div>
      <div style="padding:32px;font-size:16px;line-height:1.7;color:#f2eee6">
        <p style="margin-top:0">Hi ${name},</p>
        <p>Thank you for applying for the <strong>${title}</strong> position at Oxyile.</p>
        <p>We have successfully received your application and resume. Our team will carefully review your profile, and we will reach out if your experience aligns with our current needs for this role.</p>
        <p>We appreciate your interest in joining the Oxyile team!</p>
        <p style="margin-bottom:8px">Best regards,<br/>The Oxyile Team</p>
        <p style="margin:28px 0 0;padding-top:20px;border-top:1px solid rgba(249,115,22,.22);font-size:13px;line-height:1.7;color:#c4beb4">
          Note: This is an automated notification. If you have questions regarding your application or need support, please click &#39;Reply&#39; to contact our team, or email us directly at
          <a href="mailto:oxyilemoneyquest.support@gmail.com" style="color:#F97316;text-decoration:underline;font-weight:600">oxyilemoneyquest.support@gmail.com</a>.
        </p>
      </div>
    </div>
  </div>
</body>
</html>`.trim(),
      text: `Hi ${candidateName},\n\nThank you for applying for the ${jobTitle} position at Oxyile.\n\nWe have successfully received your application and resume. Our team will carefully review your profile, and we will reach out if your experience aligns with our current needs for this role.\n\nWe appreciate your interest in joining the Oxyile team!\n\nBest regards,\nThe Oxyile Team\n\nNote: This is an automated notification. If you have questions regarding your application or need support, please click 'Reply' to contact our team, or email us directly at oxyilemoneyquest.support@gmail.com.`,
    });
    if (result.error) return { success: false };
    return { success: true };
  } catch {
    return { success: false };
  }
}
