'use client';

import { FormEvent, useState, useTransition } from 'react';
import { Loader2, X } from 'lucide-react';
import { createJobPosting } from '@/app/actions/hr-suite';
import { HR_INPUT_CLASS, HR_SELECT_CLASS, HR_TEXTAREA_CLASS } from '@/lib/hr/ui';
import { cn } from '@/lib/utils';

type Props = {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
};

export function HrEnterpriseJobEditor({ open, onClose, onCreated }: Props) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  if (!open) return null;

  const validate = (fd: FormData) => {
    const errs: Record<string, string> = {};
    if (!String(fd.get('title') || '').trim()) errs.title = 'Job title is required.';
    if (!String(fd.get('requirements') || '').trim()) errs.requirements = 'Requirements / AI keywords context is required.';
    const min = Number(fd.get('salary_min_gbp') || 0);
    const max = Number(fd.get('salary_max_gbp') || 0);
    if (min > 0 && max > 0 && max < min) errs.salary = 'Max salary must be ≥ min salary (£ GBP).';
    return errs;
  };

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const errs = validate(fd);
    setFieldErrors(errs);
    if (Object.keys(errs).length) {
      setError('Please fix the highlighted fields.');
      return;
    }
    setError(null);
    const min = Number(fd.get('salary_min_gbp') || 0) || undefined;
    const max = Number(fd.get('salary_max_gbp') || 0) || undefined;
    const publish = fd.get('publish_now') === 'on';

    startTransition(() => {
      void createJobPosting({
        title: String(fd.get('title')),
        department: String(fd.get('department')),
        employment_type: String(fd.get('employment_type')),
        location: String(fd.get('location')),
        salary_min_gbp: min,
        salary_max_gbp: max,
        description: String(fd.get('description') || ''),
        responsibilities: String(fd.get('responsibilities') || ''),
        requirements: String(fd.get('requirements') || ''),
        ai_match_keywords: String(fd.get('ai_match_keywords') || ''),
        source_budget_gbp: max ?? min,
        publish_to_careers: true,
        status: publish ? 'open' : 'draft',
      })
        .then(() => {
          onCreated();
          onClose();
        })
        .catch((err) => setError(err instanceof Error ? err.message : 'Could not create job'));
    });
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="flex max-h-[94vh] w-full max-w-5xl flex-col overflow-hidden rounded-t-3xl border border-neutral-800 bg-neutral-950 shadow-2xl sm:rounded-3xl">
        <div className="flex items-start justify-between gap-3 border-b border-neutral-800 px-6 py-5">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-orange-400">Enterprise Job Editor</p>
            <h3 className="mt-1 text-xl font-black text-neutral-100">Create role posting</h3>
            <p className="mt-1 text-sm text-neutral-400">
              Spacious brief for ATS matching and public /careers sync. Salaries in £ GBP only.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-neutral-800 p-2 text-neutral-300 hover:bg-orange-500/20"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={onSubmit} className="flex-1 overflow-y-auto px-6 py-5">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Left — metadata */}
            <div className="space-y-4">
              <p className="text-xs font-black uppercase tracking-wider text-orange-400">Metadata</p>
              <Field label="Job title" error={fieldErrors.title}>
                <input
                  name="title"
                  placeholder="e.g. Senior Full-Stack Engineer"
                  className={cn(HR_INPUT_CLASS, fieldErrors.title && 'border-red-500')}
                />
              </Field>
              <Field label="Department">
                <select name="department" defaultValue="Engineering" className={HR_SELECT_CLASS}>
                  {['Engineering', 'Finance', 'Compliance', 'Marketing', 'Operations', 'Product', 'People'].map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Employment type">
                <select name="employment_type" defaultValue="full_time" className={HR_SELECT_CLASS}>
                  <option value="full_time">Full-time FTE</option>
                  <option value="contractor">Contractor</option>
                  <option value="fixed_term">Fixed-Term</option>
                  <option value="part_time">Part-time</option>
                  <option value="intern">Intern</option>
                </select>
              </Field>
              <Field label="Location">
                <select name="location" defaultValue="London, UK" className={HR_SELECT_CLASS}>
                  <option value="London, UK">London, UK</option>
                  <option value="Hybrid — Bengaluru / UK">Hybrid — Bengaluru / UK</option>
                  <option value="Remote — UK">Remote — UK</option>
                  <option value="United Kingdom (Remote/Hybrid)">United Kingdom (Remote/Hybrid)</option>
                </select>
              </Field>
              <Field label="Salary band (£ GBP)" error={fieldErrors.salary}>
                <div className="flex gap-2">
                  <input
                    name="salary_min_gbp"
                    type="number"
                    min={0}
                    step={1000}
                    placeholder="Min £"
                    className={cn(HR_INPUT_CLASS, fieldErrors.salary && 'border-red-500')}
                  />
                  <input
                    name="salary_max_gbp"
                    type="number"
                    min={0}
                    step={1000}
                    placeholder="Max £"
                    className={cn(HR_INPUT_CLASS, fieldErrors.salary && 'border-red-500')}
                  />
                </div>
              </Field>
              <label className="flex items-center gap-3 rounded-xl border border-neutral-800 bg-neutral-900/80 px-4 py-3 text-sm text-neutral-200">
                <input
                  type="checkbox"
                  name="publish_now"
                  className="h-4 w-4 rounded border-neutral-700 accent-orange-500"
                />
                Publish to ATS as Open & sync to public /careers now
              </label>
            </div>

            {/* Right — rich details */}
            <div className="space-y-4">
              <p className="text-xs font-black uppercase tracking-wider text-orange-400">Rich details</p>
              <Field label="Role description">
                <textarea
                  name="description"
                  rows={5}
                  placeholder="Paragraphs and context for the role…"
                  className={HR_TEXTAREA_CLASS}
                />
              </Field>
              <Field label="Key responsibilities & FCA / UK regulatory compliance">
                <textarea
                  name="responsibilities"
                  rows={5}
                  placeholder="Bullet-style responsibilities, SMCR awareness, customer safeguarding…"
                  className={HR_TEXTAREA_CLASS}
                />
              </Field>
              <Field label="Requirements (shown on /careers)" error={fieldErrors.requirements}>
                <textarea
                  name="requirements"
                  rows={4}
                  placeholder="Must-have experience, stack, certifications…"
                  className={cn(HR_TEXTAREA_CLASS, fieldErrors.requirements && 'border-red-500')}
                />
              </Field>
              <Field label="AI match keywords (comma-separated)">
                <input
                  name="ai_match_keywords"
                  placeholder="TypeScript, Next.js, FCA, Direct Debit, Postgres"
                  className={HR_INPUT_CLASS}
                />
                <p className="mt-1 text-[11px] text-neutral-500">
                  Used by the ATS resume matcher to score inbound /careers applications.
                </p>
              </Field>
            </div>
          </div>

          {error ? (
            <p className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</p>
          ) : null}

          <div className="mt-6 flex flex-wrap justify-end gap-2 border-t border-neutral-800 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-neutral-700 px-5 py-2.5 text-sm font-bold text-neutral-200 hover:bg-neutral-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={pending}
              className="inline-flex items-center gap-2 rounded-full bg-orange-500 px-6 py-2.5 text-sm font-bold text-white hover:bg-orange-600 disabled:opacity-60"
            >
              {pending ? <Loader2 size={16} className="animate-spin" /> : null}
              Create job posting
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-semibold text-neutral-300">{label}</span>
      {children}
      {error ? <span className="block text-xs text-red-400">{error}</span> : null}
    </label>
  );
}
