'use server';

import { revalidatePath } from 'next/cache';
import { Resend } from 'resend';
import { createAdminClient } from '@/lib/supabase/admin';
import { assertHrOrAdmin } from '@/lib/auth/assert-hr';
import { ATS_APPLICATION_STATUSES, type AtsApplicationStatus } from '@/lib/hr/ats-application-status';

export type AtsApplication = {
  id: string;
  job_id: string | null;
  candidate_name: string;
  candidate_email: string;
  resume_url: string | null;
  role_applied: string | null;
  status: string;
  created_at: string;
};

function mapApplication(row: Record<string, unknown>): AtsApplication {
  const name = String(row.candidate_name || row.full_name || 'Unknown');
  const email = String(row.candidate_email || row.email || '');
  return {
    id: String(row.id),
    job_id: (row.job_id as string | null) ?? null,
    candidate_name: name,
    candidate_email: email,
    resume_url: (row.resume_url as string | null) ?? null,
    role_applied: (row.role_applied as string | null) ?? null,
    status: String(row.status ?? 'New'),
    created_at: String(row.created_at),
  };
}

export async function listAtsApplications(): Promise<AtsApplication[]> {
  await assertHrOrAdmin();
  const admin = createAdminClient();
  const { data, error } = await admin.from('job_applications').select('*').order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => mapApplication(r as Record<string, unknown>));
}

export async function updateJobApplicationStatus(id: string, status: AtsApplicationStatus) {
  await assertHrOrAdmin();
  if (!ATS_APPLICATION_STATUSES.includes(status)) {
    throw new Error('Invalid application status.');
  }
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('job_applications')
    .update({ status })
    .eq('id', id)
    .select('*')
    .single();
  if (error) {
    throw new Error(
      /check|constraint|status/i.test(error.message)
        ? `Could not update status — apply supabase/migrations/20260815180000_ats_application_status_pipeline.sql. (${error.message})`
        : error.message
    );
  }
  revalidatePath('/hr/recruitment');
  return mapApplication(data as Record<string, unknown>);
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function brandedCandidateHtml(message: string): string {
  const logoUrl = 'https://yourdomain.com/logo.png';
  const body = escapeHtml(message).replace(/\n/g, '<br/>');
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /></head>
<body style="margin:0;padding:0;background:#000000;">
  <div style="background:#000000;color:#f8f5ef;font-family:Inter,Arial,Helvetica,sans-serif;padding:32px">
    <div style="max-width:640px;margin:0 auto;border:1px solid rgba(249,115,22,.28);border-radius:24px;overflow:hidden;background:#0a0a0a">
      <div style="padding:24px 32px;border-bottom:1px solid rgba(249,115,22,.25);text-align:center">
        <img src="${logoUrl}" alt="Oxyile" width="160" height="48" style="height:48px;width:auto;max-width:180px;display:inline-block" />
        <p style="margin:12px 0 0;color:#F97316;font-size:11px;letter-spacing:.28em;text-transform:uppercase;font-weight:800">Oxyile People</p>
      </div>
      <div style="padding:32px;font-size:16px;line-height:1.7;color:#f2eee6">
        ${body}
        <p style="margin:32px 0 0;font-size:13px;color:#8a847a">
          Kind regards,<br/>Oxyile People Team
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
}): Promise<{ ok: true; messageId?: string }> {
  const user = await assertHrOrAdmin();

  const to = input.to.trim();
  const message = input.message.trim();
  const subject = (input.subject ?? 'Update on your application at Oxyile').trim();

  if (!to || !to.includes('@')) throw new Error('A valid candidate email is required.');
  if (!message) throw new Error('Email message cannot be empty.');

  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    throw new Error('RESEND_API_KEY is not configured. Cannot send candidate email.');
  }

  const from = process.env.EMAIL_FROM?.trim() || 'Oxyile People <careers.oxyile@gmail.com>';
  const resend = new Resend(apiKey);
  const { data, error } = await resend.emails.send({
    from,
    to: [to],
    subject,
    html: brandedCandidateHtml(message),
    text: `${message}\n\nKind regards,\nOxyile People Team`,
  });

  if (error) {
    throw new Error(`Failed to send email via Resend: ${error.message}`);
  }

  if (input.applicationId) {
    const admin = createAdminClient();
    const { error: auditError } = await admin.from('hr_audit_logs').insert({
      action_type: 'ats.candidate_email',
      performed_by: user.id,
      details_json: { applicationId: input.applicationId, to, subject, messageId: data?.id },
    });
    if (auditError) {
      console.error('ats.candidate_email audit skipped', auditError.message);
    }
  }

  return { ok: true, messageId: data?.id };
}
