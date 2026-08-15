'use client';

import { FormEvent, useState } from 'react';
import { FileUp } from 'lucide-react';

const ACCEPT = '.pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document';

type Props = {
  jobId: string;
  roleTitle: string;
};

export function CareersApplyForm({ jobId, roleTitle }: Props) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [linkedin, setLinkedin] = useState('');
  const [resume, setResume] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!resume) {
      setError('Please attach a resume (PDF, DOC, or DOCX, max 5MB).');
      return;
    }
    setSubmitting(true);
    setError(null);
    setMessage(null);

    const body = new FormData();
    body.set('full_name', fullName);
    body.set('email', email);
    body.set('phone', phone);
    body.set('linkedin', linkedin);
    body.set('job_id', jobId);
    body.set('role_applied', roleTitle);
    body.set('resume', resume);

    const res = await fetch('/api/careers/apply', { method: 'POST', body });
    const data = (await res.json()) as { success?: boolean; error?: string };

    if (!res.ok || data.error) {
      setError(data.error ?? 'Submission failed');
    } else {
      setMessage('Application received — HR will review your resume in the Oxyile ATS.');
      setFullName('');
      setEmail('');
      setPhone('');
      setLinkedin('');
      setResume(null);
    }
    setSubmitting(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-2xl border border-white/10 bg-neutral-900/80 p-4">
      <p className="text-xs font-black uppercase tracking-wider text-[#F97316]">Application</p>
      <input
        required
        placeholder="Full name"
        value={fullName}
        onChange={(e) => setFullName(e.target.value)}
        className="w-full rounded-xl border border-neutral-800 bg-black px-4 py-3 text-neutral-100 placeholder:text-neutral-500 focus:border-[#F97316] focus:outline-none"
      />
      <input
        required
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="w-full rounded-xl border border-neutral-800 bg-black px-4 py-3 text-neutral-100 placeholder:text-neutral-500 focus:border-[#F97316] focus:outline-none"
      />
      <input
        type="tel"
        placeholder="Phone (optional)"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        className="w-full rounded-xl border border-neutral-800 bg-black px-4 py-3 text-neutral-100 placeholder:text-neutral-500 focus:border-[#F97316] focus:outline-none"
      />
      <input
        type="url"
        placeholder="LinkedIn profile URL"
        value={linkedin}
        onChange={(e) => setLinkedin(e.target.value)}
        className="w-full rounded-xl border border-neutral-800 bg-black px-4 py-3 text-neutral-100 placeholder:text-neutral-500 focus:border-[#F97316] focus:outline-none"
      />
      <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-[#F97316]/40 bg-[#F97316]/5 px-4 py-4">
        <FileUp className="text-[#F97316]" size={22} />
        <span className="text-sm text-neutral-200">
          {resume ? resume.name : 'Upload resume (PDF, DOC, or DOCX, max 5MB)'}
        </span>
        <input
          type="file"
          accept={ACCEPT}
          className="hidden"
          onChange={(e) => setResume(e.target.files?.[0] ?? null)}
        />
      </label>
      {error ? <p className="text-sm text-red-400">{error}</p> : null}
      {message ? <p className="text-sm text-emerald-400">{message}</p> : null}
      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-full bg-[#F97316] py-3.5 font-bold text-white hover:bg-orange-600 disabled:opacity-60"
      >
        {submitting ? 'Submitting…' : 'Submit application'}
      </button>
    </form>
  );
}
