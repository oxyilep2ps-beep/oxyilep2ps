import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { verifyAdminRequest } from '@/lib/auth/verify-admin-request';
import { createAdminClient } from '@/lib/supabase/admin';
import { NEWSLETTER_FROM_ADDRESS, RESEND_BATCH_SIZE } from '@/lib/newsletter/constants';
import { logAdminAction } from '@/app/actions/admin-audit';

async function collectAllRecipientEmails(): Promise<string[]> {
  const admin = createAdminClient();
  const emails = new Set<string>();

  const { data: profiles } = await admin.from('profiles').select('email').not('email', 'is', null);
  for (const row of profiles ?? []) {
    const email = String(row.email ?? '').trim().toLowerCase();
    if (email.includes('@')) emails.add(email);
  }

  const { data: waitlist } = await admin.from('waitlist').select('email');
  for (const row of waitlist ?? []) {
    const email = String(row.email ?? '').trim().toLowerCase();
    if (email.includes('@')) emails.add(email);
  }

  return Array.from(emails);
}

async function sendNewsletterBatch(
  recipients: string[],
  subject: string,
  htmlContent: string
): Promise<{ sent: number; devMode: boolean }> {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    // eslint-disable-next-line no-console
    console.info('[newsletter:broadcast:dev-log]', {
      recipientCount: recipients.length,
      subject,
      from: NEWSLETTER_FROM_ADDRESS,
    });
    return { sent: recipients.length, devMode: true };
  }

  const resend = new Resend(apiKey);
  let sent = 0;

  for (let i = 0; i < recipients.length; i += RESEND_BATCH_SIZE) {
    const chunk = recipients.slice(i, i + RESEND_BATCH_SIZE);
    const { error } = await resend.batch.send(
      chunk.map((to) => ({
        from: NEWSLETTER_FROM_ADDRESS,
        to,
        subject,
        html: htmlContent,
      }))
    );

    if (error) {
      throw new Error(error.message ?? 'Resend batch send failed');
    }

    sent += chunk.length;
  }

  return { sent, devMode: false };
}

export async function POST(request: Request) {
  try {
    const adminUser = await verifyAdminRequest();
    if (!adminUser) {
      return NextResponse.json({ ok: false, error: 'Unauthorized — admin access required' }, { status: 401 });
    }

    const body = (await request.json()) as { subject?: string; html_content?: string };
    const subject = body.subject?.trim() ?? '';
    const htmlContent = body.html_content?.trim() ?? '';

    if (!subject || !htmlContent) {
      return NextResponse.json(
        { ok: false, error: 'subject and html_content are required' },
        { status: 400 }
      );
    }

    const recipients = await collectAllRecipientEmails();
    if (recipients.length === 0) {
      return NextResponse.json({ ok: false, error: 'No recipient emails found' }, { status: 400 });
    }

    const { sent, devMode } = await sendNewsletterBatch(recipients, subject, htmlContent);

    const db = createAdminClient();
    const { data: campaign, error: insertError } = await db
      .from('newsletter_campaigns')
      .insert({
        subject,
        html_content: htmlContent,
        sent_by: adminUser.id,
        recipient_count: sent,
        status: 'sent',
      })
      .select('id, recipient_count, created_at')
      .single();

    if (insertError) {
      return NextResponse.json({ ok: false, error: insertError.message }, { status: 500 });
    }

    await logAdminAction(
      adminUser.email ?? 'admin',
      `Newsletter broadcast "${subject}" sent to ${sent} recipients${devMode ? ' (dev log — no RESEND_API_KEY)' : ''}`
    );

    return NextResponse.json({
      ok: true,
      message: devMode
        ? `Dev mode: broadcast logged for ${sent} recipients (set RESEND_API_KEY to send live).`
        : `Newsletter sent successfully to ${sent} recipients.`,
      campaignId: campaign.id,
      recipientCount: campaign.recipient_count,
      devMode,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Newsletter broadcast failed';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
