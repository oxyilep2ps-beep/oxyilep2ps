import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';
import { scoreResumeAgainstRequirements } from '@/lib/hr/types';

const MAX_BYTES = 5 * 1024 * 1024;

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const full_name = String(form.get('full_name') ?? '').trim();
    const email = String(form.get('email') ?? '').trim().toLowerCase();
    const phone = String(form.get('phone') ?? '').trim();
    const linkedin = String(form.get('linkedin') ?? '').trim();
    const job_id = String(form.get('job_id') ?? '').trim();
    const role_applied = String(form.get('role_applied') ?? '').trim();
    const file = form.get('resume');

    if (!full_name || !email) {
      return NextResponse.json({ error: 'Full name and email are required.' }, { status: 400 });
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

    let jobTitle = role_applied || 'General';
    let requirements = 'fintech uk fca lending compliance';
    let resolvedJobId: string | null = job_id || null;

    if (resolvedJobId) {
      const { data: job } = await admin
        .from('job_postings')
        .select('id, title, requirements, ai_match_keywords, description, responsibilities, status, publish_to_careers')
        .eq('id', resolvedJobId)
        .maybeSingle();
      if (job && job.status === 'open') {
        jobTitle = String(job.title);
        requirements = [job.requirements, job.ai_match_keywords, job.description, job.responsibilities]
          .filter(Boolean)
          .join(' ');
      } else {
        resolvedJobId = null;
      }
    }

    const { data: existing } = await admin
      .from('job_applicants')
      .select('id')
      .ilike('email', email)
      .limit(1);
    const duplicate = (existing?.length ?? 0) > 0;

    const ai_match_score = scoreResumeAgainstRequirements(
      `${full_name} ${email} ${linkedin} ${jobTitle}`,
      requirements
    );

    // Primary ATS pipeline — HR Kanban sees this immediately
    const { error: atsError } = await admin.from('job_applicants').insert({
      job_id: resolvedJobId,
      full_name,
      email,
      phone: phone || null,
      linkedin_url: linkedin || null,
      resume_url,
      ai_match_score,
      stage: 'applied',
      source: 'careers_page',
      duplicate_flag: duplicate,
      notes: linkedin ? `LinkedIn: ${linkedin}` : null,
    });

    if (atsError) {
      return NextResponse.json({ error: atsError.message }, { status: 500 });
    }

    // Legacy table (best-effort dual-write)
    await admin.from('job_applications').insert({
      full_name,
      email,
      phone: phone || 'n/a',
      role_applied: jobTitle,
      resume_url,
      status: 'PENDING',
    });

    revalidatePath('/hr/recruitment');
    revalidatePath('/hr');

    return NextResponse.json({ success: true, ai_match_score });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Application failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
