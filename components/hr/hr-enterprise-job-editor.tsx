'use client';

import { FormEvent, useEffect, useState, useTransition } from 'react';
import { Loader2, X } from 'lucide-react';
import { createJobPosting, updateJobPosting } from '@/app/actions/hr-suite';
import { parseJobPostingPayload } from '@/lib/hr/job-schema';
import type { JobPosting } from '@/lib/hr/types';
import { HR_INPUT_CLASS, HR_SELECT_CLASS, HR_TEXTAREA_CLASS } from '@/lib/hr/ui';
import { WORKING_MODELS, jobWorkingModel } from '@/lib/hr/working-model';
import { cn } from '@/lib/utils';

const DEPARTMENTS = ['Engineering', 'Finance', 'Compliance', 'Marketing', 'Operations', 'Product', 'People'];

type Props = {
  open: boolean;
  onClose: () => void;
  onCreated: (mode: 'create' | 'update') => void;
  initialData?: JobPosting | null;
};

function payloadFromForm(
  fd: FormData,
  internToFullTime: boolean
) {
  const min = Number(fd.get('salary_min') || 0) || undefined;
  const max = Number(fd.get('salary_max') || 0) || undefined;
  const publish = fd.get('publish_now') === 'on';
  const durationRaw = Number(fd.get('duration_months') || 0);
  const durationMonths = Number.isFinite(durationRaw) && durationRaw > 0 ? durationRaw : undefined;
  const compliance = String(fd.get('compliance_responsibilities') || '');
  const keywords = String(fd.get('ai_keywords') || '');
  return {
    title: String(fd.get('title')),
    department: String(fd.get('department')),
    employment_type: String(fd.get('employment_type')),
    working_model: String(fd.get('working_model')),
    location: String(fd.get('working_model')),
    salary_min: min,
    salary_max: max,
    salary_min_gbp: min,
    salary_max_gbp: max,
    description: String(fd.get('description') || ''),
    responsibilities: compliance,
    compliance_responsibilities: compliance,
    requirements: String(fd.get('requirements') || ''),
    ai_match_keywords: keywords,
    ai_keywords: keywords,
    source_budget_gbp: max ?? min,
    publish_to_careers: publish,
    is_published: publish,
    is_intern_to_fulltime: internToFullTime,
    duration_months: durationMonths,
    unpaid_months: durationMonths,
    what_you_will_gain: String(fd.get('what_you_will_gain') || '').trim() || null,
    status: (publish ? 'open' : 'draft') as 'draft' | 'open',
  };
}

export function HrEnterpriseJobEditor({ open, onClose, onCreated, initialData }: Props) {
  const editing = Boolean(initialData?.id);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [internToFullTime, setInternToFullTime] = useState(Boolean(initialData?.is_intern_to_fulltime));
  const [employmentType, setEmploymentType] = useState(initialData?.employment_type ?? 'full_time');

  useEffect(() => {
    if (!open) {
      setError(null);
      setFieldErrors({});
      return;
    }
    setInternToFullTime(Boolean(initialData?.is_intern_to_fulltime));
    setEmploymentType(initialData?.employment_type ?? 'full_time');
  }, [open, initialData?.id, initialData?.is_intern_to_fulltime, initialData?.employment_type]);

  if (!open) return null;

  const validate = (fd: FormData, internTrack: boolean) => {
    const payload = payloadFromForm(fd, internTrack);
    const parsed = parseJobPostingPayload(payload);
    const errs: Record<string, string> = parsed.success ? {} : { ...parsed.fieldErrors };
    const min = Number(fd.get('salary_min') || 0);
    const max = Number(fd.get('salary_max') || 0);
    if (min > 0 && max > 0 && max < min) errs.salary = 'Max salary must be ≥ min salary (£ GBP).';
    if (internTrack) {
      const months = Number(fd.get('duration_months') || 0);
      if (!Number.isFinite(months) || months < 1) {
        errs.duration_months = 'Enter internship duration in months (1 or more).';
      }
    }
    return { errs, payload: parsed.success ? parsed.data : payload };
  };

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const { errs, payload } = validate(fd, internToFullTime);
    setFieldErrors(errs);
    if (Object.keys(errs).length) {
      setError('Please fix the highlighted fields.');
      return;
    }
    setError(null);

    startTransition(() => {
      const task = initialData?.id
        ? updateJobPosting(initialData.id, payload)
        : createJobPosting(payload);
      void task
        .then(() => onCreated(initialData?.id ? 'update' : 'create'))
        .catch((err) => setError(err instanceof Error ? err.message : 'Could not save job'));
    });
  };

  const minSalary = initialData?.salary_min ?? initialData?.salary_min_gbp ?? undefined;
  const maxSalary = initialData?.salary_max ?? initialData?.salary_max_gbp ?? undefined;
  const department = initialData?.department ?? 'Engineering';
  const workingModel = initialData ? jobWorkingModel(initialData) : 'Hybrid';
  const published = Boolean(initialData?.is_published ?? (initialData?.status === 'open' && initialData?.publish_to_careers !== false));

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/50 p-0 backdrop-blur-sm dark:bg-black/70 sm:items-center sm:p-4">
      <div className="flex max-h-[94vh] w-full max-w-5xl flex-col overflow-hidden rounded-t-3xl border border-gray-200 bg-white shadow-2xl dark:border-neutral-800 dark:bg-black sm:rounded-3xl">
        <div className="flex items-start justify-between gap-3 border-b border-gray-200 px-6 py-5 dark:border-neutral-800">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#F97316]">Enterprise Job Editor</p>
            <h3 className="mt-1 text-xl font-black text-gray-900 dark:text-neutral-100">
              {editing ? 'Edit role posting' : 'Create role posting'}
            </h3>
            <p className="mt-1 text-sm text-neutral-400">
              {editing
                ? 'Update this requisition. Changes to published jobs sync to /careers.'
                : 'Spacious brief for ATS matching and public /careers sync. Salaries in £ GBP only.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-gray-200 p-2 text-neutral-600 hover:bg-orange-500/20 dark:border-neutral-800 dark:text-neutral-300"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={onSubmit} className="flex-1 overflow-y-auto px-6 py-5">
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-4">
              <p className="text-xs font-black uppercase tracking-wider text-[#F97316]">Metadata</p>
              <Field label="Job title" error={fieldErrors.title}>
                <input
                  name="title"
                  defaultValue={initialData?.title ?? ''}
                  placeholder="e.g. Senior Full-Stack Engineer"
                  className={cn(HR_INPUT_CLASS, fieldErrors.title && 'border-red-500')}
                />
              </Field>
              <Field label="Department">
                <select name="department" defaultValue={DEPARTMENTS.includes(department) ? department : DEPARTMENTS[0]} className={HR_SELECT_CLASS}>
                  {(DEPARTMENTS.includes(department) ? DEPARTMENTS : [department, ...DEPARTMENTS]).map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Employment type">
                <select
                  name="employment_type"
                  value={employmentType}
                  onChange={(e) => setEmploymentType(e.target.value)}
                  className={HR_SELECT_CLASS}
                >
                  <option value="full_time">Full-time FTE</option>
                  <option value="contractor">Contractor</option>
                  <option value="fixed_term">Fixed-Term</option>
                  <option value="part_time">Part-time</option>
                  <option value="intern">Intern</option>
                </select>
              </Field>

              <label className="flex items-start gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-800 dark:border-neutral-800 dark:bg-neutral-900/80 dark:text-neutral-200">
                <input
                  type="checkbox"
                  name="is_intern_to_fulltime"
                  checked={internToFullTime}
                  onChange={(e) => setInternToFullTime(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-neutral-400 accent-[#F97316] dark:border-neutral-700"
                />
                <span>
                  <span className="font-semibold text-gray-900 dark:text-neutral-100">Internship then Full-Time track</span>
                  <span className="mt-0.5 block text-[11px] text-neutral-500">
                    Public copy will read “Internship for N months, then £ salary Full-Time”.
                  </span>
                </span>
              </label>

              <Field label="Duration (months)" error={fieldErrors.duration_months}>
                <input
                  name="duration_months"
                  type="number"
                  min={0}
                  step={1}
                  defaultValue={initialData?.duration_months ?? initialData?.unpaid_months ?? ''}
                  placeholder="e.g. 3"
                  className={cn(HR_INPUT_CLASS, fieldErrors.duration_months && 'border-red-500')}
                />
                <p className="mt-1 text-[11px] text-neutral-500">
                  Used with Intern employment type or intern→FT track. Leave blank if not an internship.
                </p>
              </Field>

              <Field label="Working Model" error={fieldErrors.working_model}>
                <select
                  name="working_model"
                  defaultValue={workingModel}
                  className={cn(HR_SELECT_CLASS, fieldErrors.working_model && 'border-red-500')}
                >
                  {WORKING_MODELS.map((model) => (
                    <option key={model} value={model}>
                      {model}
                    </option>
                  ))}
                </select>
              </Field>
              <Field
                label={internToFullTime ? 'Post-Internship Full-Time Salary (£ GBP)' : 'Salary Band (£ GBP)'}
                error={fieldErrors.salary}
              >
                <div className="flex gap-2">
                  <input
                    name="salary_min"
                    type="number"
                    min={0}
                    step={1000}
                    defaultValue={minSalary ?? ''}
                    placeholder="Min £"
                    className={cn(HR_INPUT_CLASS, fieldErrors.salary && 'border-red-500')}
                  />
                  <input
                    name="salary_max"
                    type="number"
                    min={0}
                    step={1000}
                    defaultValue={maxSalary ?? ''}
                    placeholder="Max £"
                    className={cn(HR_INPUT_CLASS, fieldErrors.salary && 'border-red-500')}
                  />
                </div>
              </Field>
              <label className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-800 dark:border-neutral-800 dark:bg-neutral-900/80 dark:text-neutral-200">
                <input
                  type="checkbox"
                  name="publish_now"
                  defaultChecked={published}
                  className="h-4 w-4 rounded border-neutral-700 accent-[#F97316]"
                />
                Publish to ATS as Open & sync to public /careers now
              </label>
            </div>

            <div className="space-y-4">
              <p className="text-xs font-black uppercase tracking-wider text-[#F97316]">Rich details</p>
              <Field label="Role description">
                <textarea
                  name="description"
                  rows={5}
                  defaultValue={initialData?.description ?? ''}
                  placeholder="Paragraphs and context for the role…"
                  className={HR_TEXTAREA_CLASS}
                />
              </Field>
              <Field label="What you'll gain (public /careers)">
                <textarea
                  name="what_you_will_gain"
                  rows={6}
                  defaultValue={editing ? initialData?.what_you_will_gain ?? '' : ''}
                  placeholder="Optional. Shown below Description on /careers."
                  className={HR_TEXTAREA_CLASS}
                />
                <p className="mt-1 text-[11px] text-neutral-500">
                  Starts blank for new roles. Saved text is restored when you edit a posting.
                </p>
              </Field>
              <Field label="Key responsibilities & FCA / UK regulatory compliance">
                <textarea
                  name="compliance_responsibilities"
                  rows={5}
                  defaultValue={initialData?.compliance_responsibilities || initialData?.responsibilities || ''}
                  placeholder="Bullet-style responsibilities, SMCR awareness, customer safeguarding…"
                  className={HR_TEXTAREA_CLASS}
                />
              </Field>
              <Field label="Requirements (shown on /careers)" error={fieldErrors.requirements}>
                <textarea
                  name="requirements"
                  rows={4}
                  defaultValue={initialData?.requirements ?? ''}
                  placeholder="Must-have experience, stack, certifications…"
                  className={cn(HR_TEXTAREA_CLASS, fieldErrors.requirements && 'border-red-500')}
                />
              </Field>
              <Field label="AI match keywords (comma-separated)">
                <input
                  name="ai_keywords"
                  defaultValue={initialData?.ai_keywords || initialData?.ai_match_keywords || ''}
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

          <div className="mt-6 flex flex-wrap justify-end gap-2 border-t border-gray-200 pt-4 dark:border-neutral-800">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-gray-200 px-5 py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-100 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={pending}
              className="inline-flex items-center gap-2 rounded-full bg-[#F97316] px-6 py-2.5 text-sm font-bold text-white hover:bg-orange-600 disabled:opacity-60"
            >
              {pending ? <Loader2 size={16} className="animate-spin" /> : null}
              {editing ? 'Update Job Posting' : 'Create job posting'}
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
      <span className="text-xs font-semibold text-neutral-600 dark:text-neutral-300">{label}</span>
      {children}
      {error ? <span className="block text-xs text-red-400">{error}</span> : null}
    </label>
  );
}

export { HrEnterpriseJobEditor as JobEditorModal };
