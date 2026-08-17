'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { ExternalLink, RefreshCw, Search, Trash2 } from 'lucide-react';
import { AuthToast } from '@/components/auth-toast';
import { AtsEmailCandidateModal } from '@/components/hr/ats-email-candidate-modal';
import { AtsMatchBadge } from '@/components/hr/ats-match-badge';
import { deleteJobApplication, recalculateAllZeroScores, updateJobApplicationStatus, type AtsApplication } from '@/app/actions/hr-applications';
import {
  ATS_APPLICATION_STATUSES,
  ATS_PIPELINE_TABS,
  ATS_STATUS_META,
  matchesAtsTab,
  normalizeAtsStatus,
  type AtsApplicationStatus,
  type AtsPipelineTab,
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
  const [tab, setTab] = useState<AtsPipelineTab>('new');
  const [rows, setRows] = useState(applications);
  const [pending, startTransition] = useTransition();
  const [toast, setToast] = useState<{ message: string; tone: 'success' | 'error' } | null>(null);
  const [emailTarget, setEmailTarget] = useState<{
    row: AtsApplication;
    intent: 'Interview' | 'Rejected';
  } | null>(null);
  const [rescoring, setRescoring] = useState(false);

  useEffect(() => {
    setRows(applications);
  }, [applications]);

  const tabCounts = useMemo(() => {
    const counts: Record<AtsPipelineTab, number> = {
      all: rows.length,
      new: 0,
      consider: 0,
      interview: 0,
      rejected: 0,
    };
    for (const row of rows) {
      if (matchesAtsTab(row.status, 'new')) counts.new += 1;
      if (matchesAtsTab(row.status, 'consider')) counts.consider += 1;
      if (matchesAtsTab(row.status, 'interview')) counts.interview += 1;
      if (matchesAtsTab(row.status, 'rejected')) counts.rejected += 1;
    }
    return counts;
  }, [rows]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = rows.filter((r) => {
      if (!matchesAtsTab(r.status, tab)) return false;
      if (!q) return true;
      return r.candidate_name.toLowerCase().includes(q);
    });
    return [...filtered].sort((a, b) => {
      const da = new Date(a.created_at).getTime();
      const db = new Date(b.created_at).getTime();
      return sort === 'newest' ? db - da : da - db;
    });
  }, [rows, query, sort, tab]);

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

  const rescoreZero = () => {
    setRescoring(true);
    setToast({ message: 'Scoring every 0% resume across all tabs…', tone: 'success' });
    startTransition(() => {
      void recalculateAllZeroScores()
        .then(async (data) => {
          if (!data.ok || data.error) {
            setToast({ message: data.error || 'Could not recalculate ATS scores.', tone: 'error' });
            return;
          }
          setToast({ message: data.message || 'ATS scores updated.', tone: 'success' });
          await onChanged();
        })
        .catch(() => setToast({ message: 'Could not recalculate ATS scores.', tone: 'error' }))
        .finally(() => setRescoring(false));
    });
  };

  const removeCandidate = (row: AtsApplication) => {
    const ok = window.confirm(
      `Delete ${row.candidate_name}? This removes the application and the uploaded resume file.`
    );
    if (!ok) return;
    const snapshot = rows;
    setRows((cur) => cur.filter((r) => r.id !== row.id));
    startTransition(() => {
      void deleteJobApplication(row.id).then((result) => {
        if (!result?.success) {
          setRows(snapshot);
          setToast({ message: result?.message || 'Could not delete candidate.', tone: 'error' });
          return;
        }
        setToast({ message: 'Candidate deleted', tone: 'success' });
        void onChanged();
      });
    });
  };

  const emptyMessage = query.trim()
    ? `No candidates found for '${query.trim()}'`
    : tab === 'all'
      ? 'No applications yet — public /careers submissions appear here.'
      : `No applications in ${ATS_PIPELINE_TABS.find((t) => t.id === tab)?.label ?? 'this stage'}.`;

  return (
    <div className="space-y-4 rounded-2xl border border-neutral-800 bg-black p-4">
      <div
        role="tablist"
        aria-label="Application pipeline"
        className="-mx-1 flex gap-1 overflow-x-auto border-b border-neutral-800 px-1 pb-px"
      >
        {ATS_PIPELINE_TABS.map((item) => {
          const active = tab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setTab(item.id)}
              className={cn(
                'relative shrink-0 rounded-t-xl px-3 py-2.5 text-[12px] font-bold transition sm:px-4',
                active ? 'text-[#F97316]' : 'text-neutral-500 hover:text-neutral-200'
              )}
            >
              {item.label}
              <span
                className={cn(
                  'ml-2 rounded-full px-1.5 py-0.5 text-[10px] font-black',
                  active ? 'bg-[#F97316]/20 text-[#F97316]' : 'bg-neutral-900 text-neutral-500'
                )}
              >
                {tabCounts[item.id]}
              </span>
              {active ? (
                <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-[#F97316]" />
              ) : null}
            </button>
          );
        })}
      </div>

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
        <button
          type="button"
          disabled={pending || rescoring}
          onClick={rescoreZero}
          className="inline-flex items-center gap-1.5 rounded-full border border-[#F97316]/40 bg-[#F97316]/10 px-3 py-2 text-[11px] font-bold text-[#F97316] hover:bg-[#F97316]/20 disabled:opacity-60"
        >
          <RefreshCw size={12} className={rescoring ? 'animate-spin' : undefined} />
          {rescoring ? 'Scoring all resumes…' : 'Recalculate 0% scores'}
        </button>
      </div>

      {visible.length === 0 ? (
        <div className="rounded-2xl border border-neutral-800 bg-neutral-950 px-4 py-10 text-center">
          <p className="text-sm text-neutral-400">{emptyMessage}</p>
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
                    <p className="mt-1 text-sm text-gray-400">
                      {row.ats_reason || 'Click recalculate to analyze resume.'}
                    </p>
                    <p className="mt-1 text-xs text-neutral-500">
                      {row.role_applied || 'General'} ·{' '}
                      {new Date(row.created_at).toLocaleString('en-GB')}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    <AtsMatchBadge score={row.ai_match_score} />
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
                    <button
                      type="button"
                      disabled={pending}
                      title="Delete Candidate"
                      onClick={() => removeCandidate(row)}
                      className="inline-flex items-center gap-1 rounded-full border border-red-500/40 bg-red-500/10 px-2.5 py-1 text-[11px] font-bold text-red-300 hover:bg-red-500/20 disabled:opacity-60"
                    >
                      <Trash2 size={12} /> Delete Candidate
                    </button>
                  </div>
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
          roleTitle={emailTarget.row.role_applied || 'General'}
          onClose={() => setEmailTarget(null)}
          onSent={() => {
            setEmailTarget(null);
            setToast({ message: 'Email sent successfully!', tone: 'success' });
            void onChanged();
          }}
        />
      ) : null}

      <AuthToast
        open={Boolean(toast)}
        tone={toast?.tone ?? 'success'}
        message={toast?.message ?? ''}
        onClose={() => setToast(null)}
        autoCloseMs={rescoring ? 0 : 4500}
      />
    </div>
  );
}
