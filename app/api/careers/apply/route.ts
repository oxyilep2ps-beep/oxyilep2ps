import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

const MAX_BYTES = 5 * 1024 * 1024;

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const full_name = String(form.get('full_name') ?? '').trim();
    const email = String(form.get('email') ?? '').trim();
    const phone = String(form.get('phone') ?? '').trim();
    const role_applied = String(form.get('role_applied') ?? '').trim();
    const file = form.get('resume');

    if (!full_name || !email || !phone || !role_applied) {
      return NextResponse.json({ error: 'All fields are required.' }, { status: 400 });
    }

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Resume PDF is required.' }, { status: 400 });
    }

    if (file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'Only PDF files are accepted.' }, { status: 400 });
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: 'Resume must be 5MB or smaller.' }, { status: 400 });
    }

    const admin = createAdminClient();
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const path = `${Date.now()}-${safeName}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await admin.storage.from('resumes').upload(path, buffer, {
      contentType: 'application/pdf',
      upsert: false,
    });

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    const { data: urlData } = admin.storage.from('resumes').getPublicUrl(path);
    const resume_url = urlData.publicUrl;

    const { error: insertError } = await admin.from('job_applications').insert({
      full_name,
      email,
      phone,
      role_applied,
      resume_url,
      status: 'PENDING',
    });

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Application failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
