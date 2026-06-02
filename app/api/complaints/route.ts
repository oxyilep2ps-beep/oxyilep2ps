import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

const BUCKET = 'complaint-screenshots';

function toFile(value: FormDataEntryValue | null): File | null {
  return value instanceof File && value.size > 0 ? value : null;
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const name = formData.get('name')?.toString().trim();
    const email = formData.get('email')?.toString().trim();
    const description = formData.get('description')?.toString().trim();
    const subject = formData.get('subject')?.toString().trim() || 'General complaint';
    const screenshot = toFile(formData.get('screenshot'));

    if (!name || !email?.includes('@') || !description) {
      return NextResponse.json({ ok: false, error: 'Name, valid email, and description are required' }, { status: 400 });
    }

    const admin = createAdminClient();
    let screenshotUrl: string | null = null;

    if (screenshot) {
      const ext = screenshot.name.split('.').pop() ?? 'png';
      const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: uploadError } = await admin.storage.from(BUCKET).upload(path, screenshot, {
        upsert: true,
        contentType: screenshot.type || undefined,
      });
      if (uploadError) {
        return NextResponse.json({ ok: false, error: uploadError.message }, { status: 500 });
      }
      const { data } = admin.storage.from(BUCKET).getPublicUrl(path);
      screenshotUrl = data.publicUrl;
    }

    const slaDeadline = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    const { error } = await admin.from('complaints').insert({
      name,
      email,
      subject,
      description,
      issue_description: description,
      screenshot_url: screenshotUrl,
      priority: 'normal',
      sla_deadline: slaDeadline,
    });

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : 'Failed to submit complaint' },
      { status: 500 }
    );
  }
}
