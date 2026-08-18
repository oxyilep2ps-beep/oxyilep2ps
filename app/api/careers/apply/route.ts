import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';
import { persistAtsScore, scoreResumeFromStorage } from '@/lib/hr/score-resume-from-storage';
import { sendApplicationReceivedEmail } from '@/lib/email/send-application-received';
import { dispatchAdminPush } from '@/lib/push/send';
import type { AtsJobMatchSource } from '@/lib/hr/ats-match-score';

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
    let jobMatchSource: AtsJobMatchSource = {};

    if (resolvedJobId) {
      const { data: job } = await admin
        .from('job_postings')
        .select(
          'id, title, requirements, ai_match_keywords, ai_keywords, description, responsibilities, status, publish_to_careers, is_published'
        )
        .eq('id', resolvedJobId)
        .maybeSingle();
      if (job) {
        jobTitle = String(job.title || jobTitle);
        jobMatchSource = {
          title: jobTitle,
          role_applied: role_applied || jobTitle,
          ai_match_keywords: job.ai_match_keywords,
          ai_keywords: job.ai_keywords,
          requirements: job.requirements,
          description: job.description,
          responsibilities: job.responsibilities,
        };
        console.log('[ats] loaded job for scoring', {
          jobId: resolvedJobId,
          title: jobTitle,
          keywords: job.ai_match_keywords || job.ai_keywords,
        });
      } else {
        resolvedJobId = null;
        console.warn('[ats] job_id not found, scoring with role title only', job_id);
      }
    }

    jobMatchSource = {
      ...jobMatchSource,
      title: jobMatchSource.title || jobTitle,
      role_applied: jobMatchSource.role_applied || role_applied || jobTitle,
    };

    const { data: existing } = await admin.from('job_applicants').select('id').ilike('email', email).limit(1);
    const duplicate = (existing?.length ?? 0) > 0;

    const { score, reason, resumeText } = await scoreResumeFromStorage(admin, {
      resumeUrl: resume_url,
      job: jobMatchSource,
      fallbackBuffer: buffer,
      fileName: file.name,
      mimeType: contentType,
    });
    const ai_match_score = Math.round(Math.max(0, Math.min(100, score)));
    console.log('[ats] apply route score ready to persist', {
      email,
      resumeUrl: resume_url,
      extractedChars: resumeText.length,
      ai_match_score,
      reason,
    });

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
      ats_score: ai_match_score,
      ats_reason: reason,
      ats_reasoning: reason,
      status: 'Applied',
    };

    const { data: inserted, error: appError } = await admin
      .from('job_applications')
      .insert(applicationInsert)
      .select('id')
      .maybeSingle();
    if (appError) {
      console.error('[ats] insert with ats fields failed', appError.message);
      const { ats_score: _atsScore, ats_reason: _reason, ats_reasoning: _reasoning, ai_match_score: _score, ...withoutScore } = applicationInsert;
      const { data: retryRow, error: retryError } = await admin
        .from('job_applications')
        .insert(withoutScore)
        .select('id')
        .maybeSingle();
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
      } else if (retryRow?.id) {
        await persistAtsScore(admin, 'job_applications', retryRow.id, ai_match_score, reason);
      }
    } else if (inserted?.id) {
      console.log('[ats] saved job_applications row', { id: inserted.id, ai_match_score, reason });
    }

    // ATS Kanban dual-write
    const { data: applicantRow, error: applicantError } = await admin
      .from('job_applicants')
      .insert({
        job_id: resolvedJobId,
        full_name,
        email,
        phone: phone || null,
        linkedin_url: linkedin || null,
        resume_url,
        ai_match_score,
        ats_score: ai_match_score,
        ats_reason: reason,
        ats_reasoning: reason,
        stage: 'applied',
        source: 'careers_page',
        duplicate_flag: duplicate,
        notes: linkedin ? `LinkedIn: ${linkedin}` : null,
      })
      .select('id')
      .maybeSingle();
    if (applicantError) {
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
    } else if (applicantRow?.id) {
      await persistAtsScore(admin, 'job_applicants', applicantRow.id, ai_match_score, reason);
    }

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

    void dispatchAdminPush({
      title: 'New Resume Uploaded',
      body: `${full_name} applied for ${jobTitle}.`,
      url: '/admin-dashboard/careers',
      tag: 'resume',
    });

    return NextResponse.json({ success: true, ai_match_score, resume_url });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Application failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
