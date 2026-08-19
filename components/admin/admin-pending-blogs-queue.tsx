'use client';

import { useCallback, useEffect, useState, useTransition } from 'react';
import { AlertTriangle, Check, Loader2, X } from 'lucide-react';
import { listPendingBlogs, approveBlog, rejectBlog } from '@/app/actions/admin-blogs';
import type { AdminBlogRow } from '@/app/actions/admin-blogs';

export function AdminPendingBlogsQueue() {
  const [rows, setRows] = useState<AdminBlogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [pending, startTransition] = useTransition();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listPendingBlogs();
      setRows(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleApprove = (id: string) => {
    setBusyId(id);
    startTransition(async () => {
      try {
        await approveBlog(id);
        await load();
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Approve failed');
      } finally {
        setBusyId(null);
      }
    });
  };

  const handleRejectConfirm = (id: string) => {
    startTransition(async () => {
      try {
        await rejectBlog(id, { rejectionReason: rejectReason.trim() || 'Needs revision' });
        setRejectingId(null);
        setRejectReason('');
        await load();
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Reject failed');
      }
    });
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2].map((i) => (
          <div key={i} className="h-20 animate-pulse rounded-2xl border border-gray-200 bg-gray-100 dark:border-gray-800 dark:bg-[#111]" />
        ))}
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-gray-50 px-6 py-10 text-center dark:border-gray-800 dark:bg-[#0f0f0f]">
        <Check size={24} className="mx-auto mb-2 text-emerald-500" />
        <p className="text-sm font-semibold text-gray-900 dark:text-white">All clear!</p>
        <p className="mt-1 text-xs text-gray-500">No blog posts are pending approval right now.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {rows.map((row) => (
        <article
          key={row.id}
          className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-[#111]"
        >
          <div className="flex flex-wrap items-start justify-between gap-4 p-4 sm:p-5">
            <div className="min-w-0 flex-1">
              <p className="truncate font-bold text-gray-900 dark:text-white">{row.title}</p>
              <p className="mt-0.5 text-xs text-gray-500">
                Category: {row.category} · {new Date(row.created_at).toLocaleString('en-GB')}
              </p>
              {row.meta_description ? (
                <p className="mt-1 line-clamp-2 text-sm text-gray-600 dark:text-gray-400">
                  {row.meta_description}
                </p>
              ) : null}
            </div>

            <div className="flex shrink-0 gap-2">
              <button
                type="button"
                disabled={busyId === row.id || pending}
                onClick={() => handleApprove(row.id)}
                className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-emerald-600 disabled:opacity-50"
              >
                {busyId === row.id ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <Check size={13} />
                )}
                Approve
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => setRejectingId(row.id)}
                className="inline-flex items-center gap-1.5 rounded-full border border-red-500/50 px-3 py-1.5 text-xs font-bold text-red-500 transition hover:bg-red-500/10 disabled:opacity-50"
              >
                <X size={13} />
                Reject
              </button>
            </div>
          </div>

          {/* Inline reject form */}
          {rejectingId === row.id && (
            <div className="border-t border-gray-200 bg-red-500/5 px-4 pb-4 pt-3 dark:border-gray-800">
              <p className="mb-2 flex items-center gap-1.5 text-xs font-bold text-red-500">
                <AlertTriangle size={13} />
                Rejection reason (shown to blogger)
              </p>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={2}
                placeholder="e.g. Needs more data sources, SEO keywords missing…"
                className="w-full rounded-xl border border-red-300/40 bg-transparent px-3 py-2 text-sm text-gray-900 outline-none placeholder:text-gray-500 dark:text-white"
              />
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => handleRejectConfirm(row.id)}
                  className="rounded-full bg-red-500 px-4 py-1.5 text-xs font-bold text-white disabled:opacity-50"
                >
                  {pending ? <Loader2 size={13} className="animate-spin" /> : 'Confirm Reject'}
                </button>
                <button
                  type="button"
                  onClick={() => { setRejectingId(null); setRejectReason(''); }}
                  className="rounded-full border border-gray-300 px-4 py-1.5 text-xs font-medium dark:border-gray-700"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </article>
      ))}
    </div>
  );
}
