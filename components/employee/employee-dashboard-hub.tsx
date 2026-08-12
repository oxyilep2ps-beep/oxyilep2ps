'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import {
  getTodayDailyReport,
  listCompanyAnnouncements,
  listMyEmployeeTasks,
  getMyPersonalVault,
  submitDailyReport,
  updateMyTaskStatus,
} from '@/app/actions/employee-portal';
import { AuthToast } from '@/components/auth-toast';
import type {
  CompanyAnnouncementRow,
  EmployeeDailyReportRow,
  EmployeeTaskRow,
  EmployeeTaskStatus,
} from '@/lib/employee/types';
import { Coins, Laptop, Loader2, Megaphone, TreePalm } from 'lucide-react';

const COLUMNS: { id: EmployeeTaskStatus; label: string }[] = [
  { id: 'pending', label: 'Pending' },
  { id: 'in_progress', label: 'In Progress' },
  { id: 'completed', label: 'Completed' },
];

export function EmployeeDashboardHub() {
  const [tasks, setTasks] = useState<EmployeeTaskRow[]>([]);
  const [announcements, setAnnouncements] = useState<CompanyAnnouncementRow[]>([]);
  const [todayReport, setTodayReport] = useState<EmployeeDailyReportRow | null>(null);
  const [vault, setVault] = useState<Awaited<ReturnType<typeof getMyPersonalVault>> | null>(null);
  const [whatIDid, setWhatIDid] = useState('');
  const [blockers, setBlockers] = useState('');
  const [hours, setHours] = useState('8');
  const [pending, startTransition] = useTransition();
  const [toast, setToast] = useState<{ tone: 'success' | 'error'; message: string } | null>(null);

  const load = async () => {
    const [t, a, r, v] = await Promise.all([
      listMyEmployeeTasks(),
      listCompanyAnnouncements(),
      getTodayDailyReport(),
      getMyPersonalVault(),
    ]);
    setTasks(t);
    setAnnouncements(a);
    setTodayReport(r);
    setVault(v);
  };

  useEffect(() => {
    void load().catch((e) =>
      setToast({ tone: 'error', message: e instanceof Error ? e.message : 'Failed to load hub' })
    );
  }, []);

  const grouped = useMemo(() => {
    const map: Record<EmployeeTaskStatus, EmployeeTaskRow[]> = {
      pending: [],
      in_progress: [],
      completed: [],
    };
    for (const task of tasks) map[task.status]?.push(task);
    return map;
  }, [tasks]);

  const moveTask = (id: string, status: EmployeeTaskStatus) => {
    startTransition(async () => {
      const result = await updateMyTaskStatus(id, status);
      if (!result.ok) {
        setToast({ tone: 'error', message: result.error });
        return;
      }
      setToast({ tone: 'success', message: 'Task updated.' });
      await load();
    });
  };

  const onSubmitReport = () => {
    startTransition(async () => {
      const result = await submitDailyReport({
        whatIDidToday: whatIDid,
        blockers,
        hoursLogged: Number(hours) || 0,
      });
      if (!result.ok) {
        setToast({ tone: 'error', message: result.error });
        return;
      }
      setWhatIDid('');
      setBlockers('');
      setToast({ tone: 'success', message: 'Daily standup submitted.' });
      await load();
    });
  };

  return (
    <div className="space-y-6">
      <AuthToast
        open={Boolean(toast)}
        tone={toast?.tone ?? 'error'}
        message={toast?.message ?? ''}
        onClose={() => setToast(null)}
      />

      <section className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900/70 p-4 backdrop-blur">
          <div className="flex items-center gap-2 text-orange-400">
            <Coins size={16} />
            <span className="text-[10px] font-bold uppercase tracking-wider">OxyCoins</span>
          </div>
          <p className="mt-2 text-2xl font-black text-white">{vault?.gamification.oxy_coins ?? 0}</p>
          <p className="text-xs text-neutral-500">{vault?.gamification.badge_level ?? 'Bronze'} badge</p>
        </div>
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900/70 p-4 backdrop-blur">
          <div className="flex items-center gap-2 text-orange-400">
            <TreePalm size={16} />
            <span className="text-[10px] font-bold uppercase tracking-wider">Leave balance</span>
          </div>
          <p className="mt-2 text-2xl font-black text-white">{vault?.leaveBalanceDays ?? 0}</p>
          <p className="text-xs text-neutral-500">days remaining (est.)</p>
        </div>
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900/70 p-4 backdrop-blur">
          <div className="flex items-center gap-2 text-orange-400">
            <Laptop size={16} />
            <span className="text-[10px] font-bold uppercase tracking-wider">Assets</span>
          </div>
          <p className="mt-2 text-2xl font-black text-white">{vault?.assets.length ?? 0}</p>
          <p className="text-xs text-neutral-500">assigned devices</p>
        </div>
      </section>

      <section className="rounded-2xl border border-neutral-800 bg-neutral-900/70 p-5 backdrop-blur">
        <h2 className="text-sm font-black uppercase tracking-wider text-orange-500">Task board</h2>
        <div className="mt-4 grid gap-3 lg:grid-cols-3">
          {COLUMNS.map((col) => (
            <div key={col.id} className="rounded-xl border border-neutral-800 bg-black/40 p-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">{col.label}</p>
              <div className="mt-2 space-y-2">
                {grouped[col.id].map((task) => (
                  <div key={task.id} className="rounded-xl border border-neutral-800 bg-neutral-950 p-3">
                    <p className="text-sm font-semibold text-white">{task.title}</p>
                    <p className="mt-1 line-clamp-2 text-xs text-neutral-500">{task.description}</p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {COLUMNS.filter((c) => c.id !== task.status).map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          disabled={pending}
                          onClick={() => moveTask(task.id, c.id)}
                          className="rounded-full border border-neutral-700 px-2 py-0.5 text-[10px] font-bold text-neutral-300 hover:border-orange-500/50 hover:text-orange-400"
                        >
                          → {c.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
                {grouped[col.id].length === 0 ? (
                  <p className="py-6 text-center text-xs text-neutral-600">No tasks</p>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-neutral-800 bg-neutral-900/70 p-5 backdrop-blur">
          <h2 className="text-sm font-black uppercase tracking-wider text-orange-500">Daily standup</h2>
          {todayReport ? (
            <div className="mt-3 space-y-2 text-sm text-neutral-300">
              <p className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-emerald-300">
                Submitted for {todayReport.report_date}
              </p>
              <p>
                <span className="text-neutral-500">What I did:</span> {todayReport.what_i_did_today}
              </p>
              <p>
                <span className="text-neutral-500">Blockers:</span> {todayReport.blockers || 'None'}
              </p>
              <p>
                <span className="text-neutral-500">Hours:</span> {todayReport.hours_logged}
              </p>
            </div>
          ) : (
            <div className="mt-3 space-y-3">
              <textarea
                value={whatIDid}
                onChange={(e) => setWhatIDid(e.target.value)}
                rows={4}
                placeholder="What I did today…"
                className="w-full rounded-xl border border-neutral-800 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none focus:border-orange-500/50"
              />
              <textarea
                value={blockers}
                onChange={(e) => setBlockers(e.target.value)}
                rows={2}
                placeholder="Blockers (optional)"
                className="w-full rounded-xl border border-neutral-800 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none focus:border-orange-500/50"
              />
              <input
                value={hours}
                onChange={(e) => setHours(e.target.value)}
                type="number"
                min={0}
                max={24}
                step={0.5}
                className="w-28 rounded-xl border border-neutral-800 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none focus:border-orange-500/50"
              />
              <button
                type="button"
                disabled={pending || !whatIDid.trim()}
                onClick={onSubmitReport}
                className="inline-flex items-center gap-2 rounded-full bg-orange-500 px-4 py-2 text-xs font-bold text-white disabled:opacity-50"
              >
                {pending ? <Loader2 size={14} className="animate-spin" /> : null}
                Submit standup
              </button>
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-neutral-800 bg-neutral-900/70 p-5 backdrop-blur">
          <div className="flex items-center gap-2">
            <Megaphone size={16} className="text-orange-500" />
            <h2 className="text-sm font-black uppercase tracking-wider text-orange-500">Notice board</h2>
          </div>
          <div className="mt-3 max-h-80 space-y-3 overflow-y-auto">
            {announcements.length === 0 ? (
              <p className="text-sm text-neutral-500">No announcements yet.</p>
            ) : (
              announcements.map((a) => (
                <article key={a.id} className="rounded-xl border border-neutral-800 bg-black/40 p-3">
                  <p className="text-sm font-semibold text-white">{a.title}</p>
                  <p className="mt-1 whitespace-pre-wrap text-xs text-neutral-400">{a.content}</p>
                  <p className="mt-2 text-[10px] text-neutral-600">
                    {new Date(a.created_at).toLocaleString('en-GB')}
                  </p>
                </article>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
