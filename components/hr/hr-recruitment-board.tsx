'use client';

import { useCallback, useEffect, useMemo, useState, useTransition } from 'react';
import {
  createJobApplicant,
  generateOffer,
  getEmailTemplate,
  listJobApplicants,
  listJobPostings,
  saveScorecard,
  scheduleInterview,
  toggleTalentPool,
  updateApplicantStage,
  updateBackgroundCheck,
} from '@/app/actions/hr-suite';
import type { ApplicantStage, BackgroundCheckStatus, JobApplicant, JobPosting } from '@/lib/hr/types';
import { APPLICANT_STAGES, BACKGROUND_STATUSES, formatJobCompensation } from '@/lib/hr/types';
import { Pencil } from 'lucide-react';
import { HrSkeletonCards } from '@/components/hr/hr-skeleton';
import { AtsApplicationsPanel } from '@/components/hr/ats-applications-panel';
import { listAtsApplications, type AtsApplication } from '@/app/actions/hr-applications';
import { subscribeJobPostingCreated, useHrJobEditor } from '@/components/hr/hr-job-editor-provider';
import { HR_SELECT_CLASS } from '@/lib/hr/ui';
import { cn } from '@/lib/utils';

const STAGE_LABELS: Record<ApplicantStage, string> = {
  applied: 'Applied',
  shortlisted: 'Shortlisted',
  interview: 'Interview',
  offer: 'Offer',
  hired: 'Hired',
  rejected: 'Rejected',
};

export function HrRecruitmentBoard() {
  const [loading, setLoading] = useState(true);
  const [applicants, setApplicants] = useState<JobApplicant[]>([]);
  const [jobs, setJobs] = useState<JobPosting[]>([]);
  const [tab, setTab] = useState<'applications' | 'board' | 'talent' | 'jobs'>('applications');
  const [selected, setSelected] = useState<JobApplicant | null>(null);
  const [applications, setApplications] = useState<AtsApplication[]>([]);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const { openCreateJob, openEditJob } = useHrJobEditor();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [a, j] = await Promise.all([listJobApplicants(), listJobPostings()]);
      setApplicants(a);
      setJobs(j);
      try {
        setApplications(await listAtsApplications());
      } catch {
        setApplications([]);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load ATS — apply the HR migration.');
      setApplicants([]);
      setJobs([]);
      setApplications([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => subscribeJobPostingCreated(() => void load()), [load]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (new URLSearchParams(window.location.search).get('new') === '1') {
      openCreateJob();
      window.history.replaceState({}, '', '/hr/recruitment');
    }
  }, [openCreateJob]);

  const sourceStats = useMemo(() => {
    const map = new Map<string, number>();
    for (const a of applicants) map.set(a.source, (map.get(a.source) ?? 0) + 1);
    const total = Math.max(applicants.length, 1);
    return [...map.entries()].map(([source, count]) => ({
      source,
      count,
      pct: Math.round((count / total) * 100),
    }));
  }, [applicants]);

  const boardApplicants = tab === 'talent' ? applicants.filter((a) => a.in_talent_pool) : applicants;

  const moveStage = (id: string, stage: ApplicantStage) => {
    startTransition(() => {
      void updateApplicantStage(id, stage)
        .then(load)
        .catch((e) => setError(e instanceof Error ? e.message : 'Update failed'));
    });
  };

  const onDrop = (stage: ApplicantStage) => {
    if (!dragId) return;
    moveStage(dragId, stage);
    setDragId(null);
  };

  if (loading) return <HrSkeletonCards count={4} />;

  return (
    <div className="cms-fade-in space-y-6 bg-black pb-8 text-white">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-black text-white">ATS Recruitment</h2>
          <p className="mt-1 text-sm text-neutral-400">
            Applications, kanban pipeline, AI match scores, DBS tracking, offers in £ GBP.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => openCreateJob()}
            className="rounded-full bg-[#F97316] px-4 py-1.5 text-xs font-bold text-white hover:bg-orange-600"
          >
            + Create job
          </button>
          {(['applications', 'board', 'talent', 'jobs'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={cn(
                'rounded-full px-3 py-1.5 text-xs font-bold capitalize',
                tab === t ? 'bg-[#F97316] text-white' : 'bg-neutral-900 text-neutral-400'
              )}
            >
              {t === 'talent'
                ? 'Talent Pool'
                : t === 'jobs'
                  ? 'Job Posts'
                  : t === 'applications'
                    ? 'Applications'
                    : 'Kanban'}
            </button>
          ))}
        </div>
      </div>

      {error ? (
        <p className="rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-300">{error}</p>
      ) : null}

      {/* Source of hire analytics */}
      <div className="glass-card rounded-2xl p-4">
        <p className="text-xs font-black uppercase tracking-wider text-brand-500">Source of hire</p>
        <div className="mt-3 flex flex-wrap gap-3">
          {sourceStats.length === 0 ? (
            <p className="text-sm text-neutral-500">No applicants yet.</p>
          ) : (
            sourceStats.map((s) => (
              <div key={s.source} className="min-w-[7rem] flex-1">
                <div className="mb-1 flex justify-between text-[11px] font-semibold">
                  <span className="capitalize">{s.source.replace('_', ' ')}</span>
                  <span>{s.pct}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-neutral-200/60 dark:bg-white/10">
                  <div className="h-full rounded-full bg-brand-500" style={{ width: `${s.pct}%` }} />
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {tab === 'applications' ? (
        <AtsApplicationsPanel applications={applications} onChanged={load} />
      ) : tab === 'jobs' ? (
        <div className="space-y-3">
          {jobs.length === 0 ? (
            <p className="text-sm text-neutral-500">No jobs yet — use + Create job for the Enterprise Editor.</p>
          ) : (
            jobs.map((j) => (
              <article key={j.id} className="glass-card rounded-2xl p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold">{j.title}</p>
                    <p className="text-xs text-neutral-500">
                      {j.department} · {formatJobCompensation(j)} · {j.status}
                      {j.budget_approved ? ' · Budget ✓' : ' · Awaiting admin budget'}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="inline-flex items-center gap-1.5 rounded-full border border-[#F97316]/60 px-3 py-1.5 text-xs font-bold text-[#F97316] hover:bg-[#F97316]/10"
                      onClick={() => {
                        setTab('jobs');
                        openEditJob(j);
                      }}
                    >
                      <Pencil size={12} /> Edit
                    </button>
                    <button
                      type="button"
                      className="rounded-full bg-[#F97316] px-3 py-1.5 text-xs font-bold text-white"
                      onClick={() => {
                        const name = prompt('Candidate full name');
                        const email = prompt('Candidate email');
                        if (!name || !email) return;
                        startTransition(() => {
                          void createJobApplicant({
                            job_id: j.id,
                            full_name: name,
                            email,
                            resume_text: `${name} ${j.requirements}`,
                            source: 'direct',
                          })
                            .then(load)
                            .catch((e) => setError(e instanceof Error ? e.message : 'Failed'));
                        });
                      }}
                    >
                      Add applicant
                    </button>
                  </div>
                </div>
              </article>
            ))
          )}
        </div>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-2">
          {APPLICANT_STAGES.filter((s) => (tab === 'talent' ? true : s !== 'rejected') || true).map((stage) => {
            const col = boardApplicants.filter((a) => a.stage === stage);
            return (
              <div
                key={stage}
                className="glass-card min-w-[16rem] max-w-[18rem] flex-1 rounded-2xl p-3"
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => onDrop(stage)}
              >
                <p className="mb-2 text-xs font-black uppercase tracking-wider text-brand-500">
                  {STAGE_LABELS[stage]} ({col.length})
                </p>
                <div className="space-y-2">
                  {col.map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      draggable
                      onDragStart={() => setDragId(a.id)}
                      onClick={() => setSelected(a)}
                      className="w-full rounded-xl border border-white/10 bg-white/50 p-3 text-left transition hover:border-brand-300 dark:bg-black/30"
                    >
                      <p className="text-sm font-semibold">{a.full_name}</p>
                      <p className="text-[11px] text-neutral-500">{a.job_title || 'General'} · {a.email}</p>
                      <div className="mt-2 flex flex-wrap gap-1">
                        <span className="rounded-full bg-brand-500/15 px-2 py-0.5 text-[10px] font-bold text-brand-600">
                          AI {a.ai_match_score}%
                        </span>
                        <span className="rounded-full bg-neutral-500/15 px-2 py-0.5 text-[10px] font-bold capitalize">
                          {a.background_check_status.replace(/_/g, ' ')}
                        </span>
                        {a.duplicate_flag ? (
                          <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                            Duplicate
                          </span>
                        ) : null}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selected ? (
        <ApplicantDrawer
          applicant={selected}
          pending={pending}
          onClose={() => setSelected(null)}
          onRefresh={async () => {
            await load();
            setSelected(null);
          }}
          startTransition={startTransition}
          setError={setError}
        />
      ) : null}
    </div>
  );
}

function ApplicantDrawer({
  applicant,
  pending,
  onClose,
  onRefresh,
  startTransition,
  setError,
}: {
  applicant: JobApplicant;
  pending: boolean;
  onClose: () => void;
  onRefresh: () => Promise<void>;
  startTransition: (fn: () => void) => void;
  setError: (m: string | null) => void;
}) {
  const [interviewAt, setInterviewAt] = useState('');
  const [notes, setNotes] = useState(applicant.interview_notes ?? '');
  const [tech, setTech] = useState(Number(applicant.scorecard_json.technical ?? 3));
  const [culture, setCulture] = useState(Number(applicant.scorecard_json.culture ?? 3));
  const [offerSalary, setOfferSalary] = useState(String(applicant.offer_salary_gbp ?? 55000));
  const [offerHtml, setOfferHtml] = useState(applicant.offer_letter_html);

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 p-4 sm:items-center">
      <div className="glass-card max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-lg font-black">{applicant.full_name}</p>
            <p className="text-xs text-neutral-500">{applicant.email}</p>
          </div>
          <button type="button" onClick={onClose} className="text-sm font-semibold text-neutral-500">
            Close
          </button>
        </div>

        <div className="mt-4 space-y-4 text-sm">
          <div>
            <p className="text-xs font-bold uppercase text-brand-500">Move stage</p>
            <div className="mt-2 flex flex-wrap gap-1">
              {APPLICANT_STAGES.map((s) => (
                <button
                  key={s}
                  type="button"
                  disabled={pending}
                  onClick={() =>
                    startTransition(() => {
                      void updateApplicantStage(applicant.id, s).then(onRefresh);
                    })
                  }
                  className={cn(
                    'rounded-full px-2.5 py-1 text-[11px] font-bold capitalize',
                    applicant.stage === s ? 'bg-brand-500 text-white' : 'bg-white/60 dark:bg-white/10'
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-bold uppercase text-brand-500">Background / DBS</p>
            <select
              className={cn('mt-2', HR_SELECT_CLASS)}
              value={applicant.background_check_status}
              onChange={(e) =>
                startTransition(() => {
                  void updateBackgroundCheck(applicant.id, e.target.value as BackgroundCheckStatus).then(onRefresh);
                })
              }
            >
              {BACKGROUND_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
          </div>

          <div>
            <p className="text-xs font-bold uppercase text-brand-500">Schedule interview</p>
            <input
              type="datetime-local"
              value={interviewAt}
              onChange={(e) => setInterviewAt(e.target.value)}
              className="mt-2 w-full rounded-xl border border-white/20 bg-black/5 px-3 py-2 dark:bg-white/5"
            />
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Interview notes"
              rows={2}
              className="mt-2 w-full rounded-xl border border-white/20 bg-black/5 px-3 py-2 dark:bg-white/5"
            />
            <button
              type="button"
              className="mt-2 rounded-full bg-brand-500 px-3 py-1.5 text-xs font-bold text-white"
              onClick={() => {
                if (!interviewAt) return;
                startTransition(() => {
                  void scheduleInterview(applicant.id, new Date(interviewAt).toISOString(), notes).then(onRefresh);
                });
              }}
            >
              Save interview
            </button>
          </div>

          <div>
            <p className="text-xs font-bold uppercase text-brand-500">Email templates</p>
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                className="rounded-full border border-brand-300 px-3 py-1.5 text-xs font-bold text-brand-600"
                onClick={() => {
                  void getEmailTemplate(applicant.id, 'interview_invite').then((t) => {
                    window.open(t.mailto, '_blank');
                  });
                }}
              >
                Interview invite
              </button>
              <button
                type="button"
                className="rounded-full border border-red-300 px-3 py-1.5 text-xs font-bold text-red-600"
                onClick={() => {
                  void getEmailTemplate(applicant.id, 'rejection').then((t) => {
                    window.open(t.mailto, '_blank');
                  });
                }}
              >
                Polite rejection
              </button>
            </div>
          </div>

          <div>
            <p className="text-xs font-bold uppercase text-brand-500">Scorecard</p>
            <label className="mt-2 block text-xs">
              Technical {tech}
              <input type="range" min={1} max={5} value={tech} onChange={(e) => setTech(Number(e.target.value))} className="w-full" />
            </label>
            <label className="block text-xs">
              Culture {culture}
              <input
                type="range"
                min={1}
                max={5}
                value={culture}
                onChange={(e) => setCulture(Number(e.target.value))}
                className="w-full"
              />
            </label>
            <button
              type="button"
              className="mt-1 rounded-full bg-brand-500 px-3 py-1.5 text-xs font-bold text-white"
              onClick={() =>
                startTransition(() => {
                  void saveScorecard(applicant.id, { technical: tech, culture, notes }).then(onRefresh);
                })
              }
            >
              Save scorecard
            </button>
          </div>

          <div>
            <p className="text-xs font-bold uppercase text-brand-500">Offer letter (£ GBP)</p>
            <input
              type="number"
              value={offerSalary}
              onChange={(e) => setOfferSalary(e.target.value)}
              className="mt-2 w-full rounded-xl border border-white/20 bg-black/5 px-3 py-2 dark:bg-white/5"
            />
            <button
              type="button"
              className="mt-2 rounded-full bg-orange-500 px-3 py-1.5 text-xs font-bold text-white"
              onClick={() =>
                startTransition(() => {
                  void generateOffer(applicant.id, Number(offerSalary))
                    .then((html) => {
                      setOfferHtml(html);
                      return onRefresh();
                    })
                    .catch((e) => setError(e instanceof Error ? e.message : 'Offer failed'));
                })
              }
            >
              Generate offer
            </button>
            {offerHtml ? (
              <div
                className="mt-3 max-h-48 overflow-auto rounded-xl border border-white/10 bg-white p-3 text-xs text-neutral-900"
                dangerouslySetInnerHTML={{ __html: offerHtml }}
              />
            ) : null}
          </div>

          <button
            type="button"
            className="w-full rounded-full border border-white/20 py-2 text-xs font-bold"
            onClick={() =>
              startTransition(() => {
                void toggleTalentPool(applicant.id, !applicant.in_talent_pool).then(onRefresh);
              })
            }
          >
            {applicant.in_talent_pool ? 'Remove from talent pool' : 'Add to talent pool'}
          </button>

          {applicant.resume_url ? (
            <a href={applicant.resume_url} target="_blank" rel="noreferrer" className="block text-xs font-bold text-brand-600">
              Open resume
            </a>
          ) : null}
        </div>
      </div>
    </div>
  );
}
