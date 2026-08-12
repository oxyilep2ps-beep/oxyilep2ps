'use client';

import { useEffect, useState, useTransition } from 'react';
import Link from 'next/link';
import {
  assignEmployeeTask,
  createCompanyAnnouncement,
  listEmployeeDirectory,
} from '@/app/actions/employee-portal';
import { AuthToast } from '@/components/auth-toast';
import type { EmployeeProfileRow, EmployeeTaskPriority } from '@/lib/employee/types';
import { cn } from '@/lib/utils';
import { Loader2, Plus } from 'lucide-react';

export function AdminEmployeesOversight() {
  const [rows, setRows] = useState<EmployeeProfileRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ tone: 'success' | 'error'; message: string } | null>(null);
  const [announceTitle, setAnnounceTitle] = useState('');
  const [announceBody, setAnnounceBody] = useState('');
  const [pending, startTransition] = useTransition();

  const load = async () => {
    setLoading(true);
    try {
      setRows(await listEmployeeDirectory());
    } catch (e) {
      setToast({ tone: 'error', message: e instanceof Error ? e.message : 'Failed to load' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const postAnnouncement = () => {
    startTransition(async () => {
      const result = await createCompanyAnnouncement({
        title: announceTitle,
        content: announceBody,
      });
      if (!result.ok) {
        setToast({ tone: 'error', message: result.error });
        return;
      }
      setAnnounceTitle('');
      setAnnounceBody('');
      setToast({ tone: 'success', message: 'Announcement published to employee notice board.' });
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

      <header className="flex flex-wrap items-end justify-between gap-3 rounded-2xl border border-neutral-800 bg-neutral-900/70 p-5 backdrop-blur">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.28em] text-orange-500">People Ops</p>
          <h1 className="mt-1 text-2xl font-black text-white">Employee oversight</h1>
          <p className="mt-1 text-sm text-neutral-400">
            Directory, presence, task completion — grant Employee role in Access Management.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin-dashboard/employees/task-assigner"
            className="inline-flex items-center gap-1.5 rounded-full bg-orange-500 px-4 py-2 text-xs font-bold text-white"
          >
            <Plus size={14} />
            Task Assigner
          </Link>
          <Link
            href="/admin-dashboard/access"
            className="rounded-full border border-neutral-700 px-4 py-2 text-xs font-bold text-white"
          >
            Add Employee access
          </Link>
        </div>
      </header>

      <section className="rounded-2xl border border-neutral-800 bg-neutral-900/70 p-5 backdrop-blur">
        <h2 className="text-sm font-black uppercase tracking-wider text-orange-500">Post announcement</h2>
        <div className="mt-3 grid gap-3">
          <input
            value={announceTitle}
            onChange={(e) => setAnnounceTitle(e.target.value)}
            placeholder="Title"
            className="w-full rounded-xl border border-neutral-800 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none focus:border-orange-500/50"
          />
          <textarea
            value={announceBody}
            onChange={(e) => setAnnounceBody(e.target.value)}
            rows={3}
            placeholder="Message for the company notice board…"
            className="w-full rounded-xl border border-neutral-800 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none focus:border-orange-500/50"
          />
          <button
            type="button"
            disabled={pending || !announceTitle.trim()}
            onClick={postAnnouncement}
            className="w-fit rounded-full bg-orange-500 px-4 py-2 text-xs font-bold text-white disabled:opacity-50"
          >
            Publish to notice board
          </button>
        </div>
      </section>

      <section className="overflow-x-auto rounded-2xl border border-neutral-800 bg-neutral-900/70 backdrop-blur">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-neutral-800 text-[10px] uppercase tracking-wider text-neutral-500">
            <tr>
              <th className="px-4 py-3">Employee</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Presence</th>
              <th className="px-4 py-3">Tasks</th>
              <th className="px-4 py-3">Completion</th>
              <th className="px-4 py-3">Analytics</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-neutral-500">
                  <Loader2 className="mx-auto animate-spin text-orange-500" />
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-neutral-500">
                  No employees yet. Assign the Employee role in Access Management.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="border-b border-neutral-800/60 text-neutral-300">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-white">{row.full_legal_name}</p>
                    <p className="text-xs text-neutral-500">{row.email}</p>
                    <p className="text-[10px] text-neutral-600">
                      {row.designation || '—'} · {row.department || '—'}
                    </p>
                  </td>
                  <td className="px-4 py-3 capitalize">{row.status}</td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold',
                        row.online
                          ? 'bg-emerald-500/15 text-emerald-400'
                          : 'bg-neutral-800 text-neutral-400'
                      )}
                    >
                      <span
                        className={cn(
                          'h-1.5 w-1.5 rounded-full',
                          row.online ? 'bg-emerald-400' : 'bg-neutral-500'
                        )}
                      />
                      {row.online ? 'Online' : 'Offline'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {row.completed_tasks}/{row.total_tasks}
                    <span className="text-neutral-500"> · {row.pending_tasks} open</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-neutral-800">
                        <div
                          className="h-full rounded-full bg-orange-500"
                          style={{ width: `${row.task_completion_rate}%` }}
                        />
                      </div>
                      <span className="text-xs font-bold text-orange-400">{row.task_completion_rate}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin-dashboard/employees/analytics/${row.id}`}
                      className="text-xs font-bold text-orange-400 hover:underline"
                    >
                      View report
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}

export function AdminTaskAssigner() {
  const [rows, setRows] = useState<EmployeeProfileRow[]>([]);
  const [assignedTo, setAssignedTo] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState<EmployeeTaskPriority>('medium');
  const [pending, startTransition] = useTransition();
  const [toast, setToast] = useState<{ tone: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    void listEmployeeDirectory()
      .then(setRows)
      .catch((e) => setToast({ tone: 'error', message: e instanceof Error ? e.message : 'Load failed' }));
  }, []);

  const onSubmit = () => {
    startTransition(async () => {
      const result = await assignEmployeeTask({
        assignedTo,
        title,
        description,
        dueDate: dueDate || null,
        priority,
      });
      if (!result.ok) {
        setToast({ tone: 'error', message: result.error });
        return;
      }
      setTitle('');
      setDescription('');
      setDueDate('');
      setToast({ tone: 'success', message: 'Task assigned. Email notification queued (TODO Resend).' });
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
      <header className="rounded-2xl border border-neutral-800 bg-neutral-900/70 p-5 backdrop-blur">
        <p className="text-[10px] font-black uppercase tracking-[0.28em] text-orange-500">Task Assigner</p>
        <h1 className="mt-1 text-2xl font-black text-white">Assign work to employees</h1>
        <p className="mt-1 text-sm text-neutral-400">
          Creates a task in Supabase and triggers an email placeholder for Resend.
        </p>
      </header>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
        className="space-y-4 rounded-2xl border border-neutral-800 bg-neutral-900/70 p-5 backdrop-blur"
      >
        <label className="block space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Employee</span>
          <select
            value={assignedTo}
            onChange={(e) => setAssignedTo(e.target.value)}
            required
            className="w-full rounded-xl border border-neutral-800 bg-[#0A0A0A] px-3 py-2.5 text-sm text-white outline-none focus:border-orange-500/50"
          >
            <option value="">Select employee…</option>
            {rows.map((r) => (
              <option key={r.id} value={r.id}>
                {r.full_legal_name} ({r.email})
              </option>
            ))}
          </select>
        </label>
        <label className="block space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Title</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="w-full rounded-xl border border-neutral-800 bg-[#0A0A0A] px-3 py-2.5 text-sm text-white outline-none focus:border-orange-500/50"
          />
        </label>
        <label className="block space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
            Description (rich text as HTML/markdown)
          </span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={8}
            className="w-full rounded-xl border border-neutral-800 bg-[#0A0A0A] px-3 py-2.5 text-sm text-white outline-none focus:border-orange-500/50"
            placeholder="Acceptance criteria, links, notes…"
          />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Due date</span>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full rounded-xl border border-neutral-800 bg-[#0A0A0A] px-3 py-2.5 text-sm text-white outline-none focus:border-orange-500/50"
            />
          </label>
          <label className="block space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Priority</span>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as EmployeeTaskPriority)}
              className="w-full rounded-xl border border-neutral-800 bg-[#0A0A0A] px-3 py-2.5 text-sm text-white outline-none focus:border-orange-500/50"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </label>
        </div>
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-2 rounded-full bg-orange-500 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50"
        >
          {pending ? <Loader2 size={16} className="animate-spin" /> : null}
          Assign task
        </button>
      </form>
    </div>
  );
}
