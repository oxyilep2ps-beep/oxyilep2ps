'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { ExternalLink, Search } from 'lucide-react';
import { AuthToast } from '@/components/auth-toast';
import { AtsEmailCandidateModal } from '@/components/hr/ats-email-candidate-modal';
import { updateJobApplicationStatus, type AtsApplication } from '@/app/actions/hr-applications';
import {
  ATS_APPLICATION_STATUSES,
  ATS_STATUS_META,
  normalizeAtsStatus,
  type AtsApplicationStatus,
} from '@/lib/hr/ats-application-status';
import { HR_INPUT_CLASS, HR_SELECT_CLASS } from '@/lib/hr/ui';
import { cn } from '@/lib/utils';

type SortDir = 'newest' | 'oldest';

export function AtsApplicationsPanel({
  applications,
  onChanged,
}: {
  applications: AtsApplication[];
  onChanged: () => Promise<void> | void;
}) {
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortDir>('newest');
  const [rows, setRows] = useState(applications);
  const [pending, startTransition] = useTransition();
  const [toast, setToast] = useState<string | null>(null);
  const [emailTarget, setEmailTarget] = useState<{
    row: AtsApplication;
    intent: 'Interview' | 'Rejected';
  } | null>(null);

  useEffect(() => {
    setRows(applications);
  }, [applications]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q
      ? rows.filter((r) => r.candidate_name.toLowerCase().includes(q))
      : rows;
    const sorted = [...filtered].sort((a, b) => {
      const da = new Date(a.created_at).getTime();
      const db = new Date(b.created_at).getTime();
      return sort === 'newest' ? db - da : da - db;
    });
    return sorted;
  }, [rows, query, sort]);

  const setStatus = (row: AtsApplication, status: AtsApplicationStatus) => {
    const previous = row.status;
    setRows((cur) => cur.map((r) => (r.id === row.id ? { ...r, status } : r)));
    startTransition(() => {
      void updateJobApplicationStatus(row.id, status)
        .then(() => {
          if (status === 'Interview' || status === 'Rejected') {
            setEmailTarget({ row: { ...row, status }, intent: status });
          }
        })
        .catch(() => {
          setRows((cur) => cur.map((r) => (r.id === row.id ? { ...r, status: previous } : r)));
        });
    });
  };

  return (
    <div className="space-y-4 rounded-2xl border border-neutral-800 bg-black p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="relative min-w-0 flex-1">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#F97316]" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search candidates by name…"
            className={cn(HR_INPUT_CLASS, 'pl-10')}
          />
        </label>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortDir)}
          className={cn(HR_SELECT_CLASS, 'sm:w-48')}
          aria-label="Sort applications"
        >
          <option value="newest">Newest First</option>
          <option value="oldest">Oldest First</option>
        </select>
      </div>

      {visible.length === 0 ? (
        <div className="rounded-2xl border border-neutral-800 bg-neutral-950 px-4 py-10 text-center">
          <p className="text-sm text-neutral-400">
            {query.trim()
              ? `No candidates found for '${query.trim()}'`
              : 'No applications yet — public /careers submissions appear here.'}
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {visible.map((row) => {
            const current = normalizeAtsStatus(row.status);
            return (
              <li key={row.id} className="rounded-2xl border border-neutral-800 bg-neutral-950 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-bold text-white">{row.candidate_name}</p>
                    <p className="text-sm text-neutral-400">{row.candidate_email}</p>
                    <p className="mt-1 text-xs text-neutral-500">
                      {row.role_applied || 'General'} ·{' '}
                      {new Date(row.created_at).toLocaleString('en-GB')}
                    </p>
                  </div>
                  {row.resume_url ? (
                    <a
                      href={row.resume_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-bold text-[#F97316] hover:text-orange-400"
                    >
                      Resume <ExternalLink size={12} />
                    </a>
                  ) : null}
                </div>

                <div className="mt-3 flex flex-wrap gap-1.5">
                  {ATS_APPLICATION_STATUSES.map((status) => {
                    const meta = ATS_STATUS_META[status];
                    const active = current === status;
                    return (
                      <button
                        key={status}
                        type="button"
                        disabled={pending}
                        title={meta.hint}
                        onClick={() => setStatus(row, status)}
                        className={cn(
                          'rounded-full border px-2.5 py-1 text-[11px] font-bold transition disabled:opacity-60',
                          active ? meta.className : 'border-neutral-800 bg-black text-neutral-500 hover:border-neutral-600'
                        )}
                      >
                        {meta.label}
                      </button>
                    );
                  })}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {emailTarget ? (
        <AtsEmailCandidateModal
          to={emailTarget.row.candidate_email}
          candidateName={emailTarget.row.candidate_name}
          intent={emailTarget.intent}
          applicationId={emailTarget.row.id}
          onClose={() => setEmailTarget(null)}
          onSent={() => {
            setEmailTarget(null);
            setToast('Email sent successfully!');
            void onChanged();
          }}
        />
      ) : null}

      <AuthToast
        open={Boolean(toast)}
        tone="success"
        message={toast ?? ''}
        onClose={() => setToast(null)}
        autoCloseMs={4500}
      />
    </div>
  );
}
