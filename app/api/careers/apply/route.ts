import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';
import { computeAtsMatchScore } from '@/lib/hr/ats-match-score';
import { extractResumeText } from '@/lib/hr/extract-resume-text';
import { sendApplicationReceivedEmail } from '@/lib/email/send-application-received';

const MAX_BYTES = 5 * 1024 * 1024;

const ALLOWED_MIME = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

function contentTypeFor(file: File): string | null {
  if (ALLOWED_MIME.has(file.type)) return file.type;
  const name = file.name.toLowerCase();
  if (name.endsWith('.pdf')) return 'application/pdf';
  if (name.endsWith('.doc')) return 'application/msword';
  if (name.endsWith('.docx')) {
    return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  }
  return null;
}

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
      return NextResponse.json({ error: 'Resume is required (PDF, DOC, or DOCX).' }, { status: 400 });
    }

    const contentType = contentTypeFor(file);
    if (!contentType) {
      return NextResponse.json({ error: 'Only PDF, DOC, and DOCX files are accepted.' }, { status: 400 });
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: 'Resume must be 5MB or smaller.' }, { status: 400 });
    }

    const admin = createAdminClient();
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const path = `${Date.now()}-${safeName}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await admin.storage.from('resumes').upload(path, buffer, {
      contentType,
      upsert: false,
    });

    if (uploadError) {
      return NextResponse.json(
        {
          error: `Resume upload failed (${uploadError.message}). Create a public Storage bucket named "resumes" if it does not exist.`,
        },
        { status: 500 }
      );
    }

    const { data: urlData } = admin.storage.from('resumes').getPublicUrl(path);
    const resume_url = urlData.publicUrl || path;

    let jobTitle = role_applied || 'General';
    let resolvedJobId: string | null = job_id || null;
    let jobMatchSource: Parameters<typeof computeAtsMatchScore>[1] = {};

    if (resolvedJobId) {
      const { data: job } = await admin
        .from('job_postings')
        .select(
          'id, title, requirements, ai_match_keywords, ai_keywords, description, responsibilities, status, publish_to_careers, is_published'
        )
        .eq('id', resolvedJobId)
        .maybeSingle();
      if (job && (job.is_published === true || job.status === 'open')) {
        jobTitle = String(job.title);
        jobMatchSource = {
          ai_match_keywords: job.ai_match_keywords,
          ai_keywords: job.ai_keywords,
          requirements: job.requirements,
          description: job.description,
          responsibilities: job.responsibilities,
        };
      } else if (!job) {
        resolvedJobId = null;
      }
    }

    const { data: existing } = await admin.from('job_applicants').select('id').ilike('email', email).limit(1);
    const duplicate = (existing?.length ?? 0) > 0;

    const resumeText = await extractResumeText(buffer, {
      fileName: file.name,
      mimeType: contentType,
    });
    const ai_match_score = computeAtsMatchScore(resumeText, jobMatchSource);

    // Public applications table — source of truth for /careers apply
    const applicationInsert = {
      job_id: resolvedJobId,
      candidate_name: full_name,
      candidate_email: email,
      full_name,
      email,
      phone: phone || 'n/a',
      role_applied: jobTitle,
      resume_url,
      ai_match_score,
      status: 'Applied',
    };

    const { error: appError } = await admin.from('job_applications').insert(applicationInsert);
    if (appError) {
      const { ai_match_score: _score, ...withoutScore } = applicationInsert;
      const { error: retryError } = await admin.from('job_applications').insert(withoutScore);
      if (retryError) {
        const { error: legacyError } = await admin.from('job_applications').insert({
          full_name,
          email,
          phone: phone || 'n/a',
          role_applied: jobTitle,
          resume_url,
          status: 'PENDING',
        });
        if (legacyError) {
          return NextResponse.json({ error: appError.message }, { status: 500 });
        }
      }
    }

    // ATS Kanban dual-write
    await admin.from('job_applicants').insert({
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

    revalidatePath('/hr/recruitment');
    revalidatePath('/hr');
    revalidatePath('/careers');

    try {
      await sendApplicationReceivedEmail({
        to: email,
        candidateName: full_name,
        jobTitle,
      });
    } catch {
      // Confirmation email must never fail the application itself.
    }

    return NextResponse.json({ success: true, ai_match_score, resume_url });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Application failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
