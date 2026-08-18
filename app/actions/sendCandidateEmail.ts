'use server';

import { Resend } from 'resend';
import { createAdminClient } from '@/lib/supabase/admin';
import { assertHrOrAdmin } from '@/lib/auth/assert-hr';

export type SendCandidateEmailResult = {
  success: boolean;
  message: string;
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function brandedCandidateHtml(message: string): string {
  const logoUrl = 'https://yourdomain.com/static-logo.png';
  const body = escapeHtml(message).replace(/\n/g, '<br/>');
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /></head>
<body style="margin:0;padding:0;background:#000000;">
  <div style="background:#000000;color:#f8f5ef;font-family:Inter,Arial,Helvetica,sans-serif;padding:32px">
    <div style="max-width:640px;margin:0 auto;border:1px solid rgba(249,115,22,.28);border-radius:24px;overflow:hidden;background:#0a0a0a">
      <div style="padding:24px 32px;border-bottom:1px solid rgba(249,115,22,.25);text-align:center">
        <img src="${logoUrl}" alt="Oxyile" width="150" style="height:auto;max-width:150px;display:inline-block" />
        <p style="margin:12px 0 0;color:#F97316;font-size:11px;letter-spacing:.28em;text-transform:uppercase;font-weight:800">Oxyile People</p>
      </div>
      <div style="padding:32px;font-size:16px;line-height:1.7;color:#f2eee6">
        ${body}
        <p style="margin:32px 0 0;font-size:13px;color:#8a847a">
          Kind regards,<br/>Oxyile People Team
        </p>
        <p style="margin:28px 0 0;padding-top:20px;border-top:1px solid rgba(249,115,22,.22);font-size:13px;line-height:1.7;color:#c4beb4">
          If you have any questions, simply reply to this email to reach our support team at
          <a href="mailto:careers.oxyile@gmail.com" style="color:#F97316;text-decoration:underline;font-weight:600">careers.oxyile@gmail.com</a>.
        </p>
      </div>
    </div>
  </div>
</body>
</html>`.trim();
}

export async function sendCandidateEmail(input: {
  to: string;
  subject?: string;
  message: string;
  applicationId?: string;
}): Promise<SendCandidateEmailResult> {
  try {
    const user = await assertHrOrAdmin();

    const to = String(input?.to ?? '').trim();
    const message = String(input?.message ?? '').trim();
    const subject = String(input?.subject ?? 'Update on your application at Oxyile').trim();

    if (!to || !to.includes('@')) {
      return { success: false, message: 'A valid candidate email is required.' };
    }
    if (!message) {
      return { success: false, message: 'Email message cannot be empty.' };
    }

    const apiKey = process.env.RESEND_API_KEY?.trim();
    if (!apiKey) {
      return {
        success: false,
        message: 'RESEND_API_KEY is not configured. Add it to your environment to send candidate emails.',
      };
    }

    const resend = new Resend(apiKey);
    const result = await resend.emails.send({
      from: 'Oxyile Careers <no-reply@oxyile.com>',
      replyTo: 'careers.oxyile@gmail.com',
      to: [to],
      subject,
      html: brandedCandidateHtml(message),
      text: `${message}\n\nKind regards,\nOxyile People Team\n\nIf you have any questions, simply reply to this email to reach our support team at careers.oxyile@gmail.com.`,
    });

    if (result.error) {
      return {
        success: false,
        message: String(result.error.message || 'Failed to send email via Resend.'),
      };
    }

    const messageId = result.data?.id ? String(result.data.id) : '';

    if (input.applicationId) {
      try {
        const admin = createAdminClient();
        await admin.from('hr_audit_logs').insert({
          action_type: 'ats.candidate_email',
          performed_by: user.id,
          details_json: {
            applicationId: String(input.applicationId),
            to,
            subject,
            messageId,
          },
        });
      } catch {
        // Audit must never crash the email flow.
      }
    }

    return { success: true, message: 'Email sent successfully' };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected error sending email.';
    return { success: false, message };
  }
}
