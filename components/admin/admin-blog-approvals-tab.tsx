'use client';

import { useCallback, useEffect, useState } from 'react';
import { Check, Loader2 } from 'lucide-react';
import { approveBlog, listPendingBlogs, type AdminBlogRow } from '@/app/actions/admin-blogs';

export function AdminBlogApprovalsTab() {
  const [rows, setRows] = useState<AdminBlogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [edits, setEdits] = useState<Record<string, { title: string; content: string }>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listPendingBlogs();
      setRows(data);
      setEdits(
        Object.fromEntries(data.map((r) => [r.id, { title: r.title, content: r.content }]))
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleApprove = async (id: string) => {
    setBusyId(id);
    try {
      await approveBlog(id, edits[id]);
      await load();
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-black text-neutral-950 dark:text-white">Blog Approvals</h2>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">
          Review HR-submitted articles. Only approved posts appear on the public blog.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="animate-spin text-brand-500" size={28} />
        </div>
      ) : rows.length === 0 ? (
        <p className="text-sm text-neutral-500">No pending blog posts.</p>
      ) : (
        <div className="space-y-4">
          {rows.map((row) => (
            <article key={row.id} className="glass-card rounded-2xl p-5">
              {row.cover_image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={row.cover_image} alt="" className="mb-4 h-40 w-full rounded-xl object-cover" />
              )}
              <input
                value={edits[row.id]?.title ?? row.title}
                onChange={(e) =>
                  setEdits((prev) => ({ ...prev, [row.id]: { ...prev[row.id], title: e.target.value } }))
                }
                className="w-full rounded-xl border border-white/60 bg-white/70 px-3 py-2 font-bold dark:border-white/10 dark:bg-black/40"
              />
              <textarea
                value={edits[row.id]?.content ?? row.content}
                onChange={(e) =>
                  setEdits((prev) => ({ ...prev, [row.id]: { ...prev[row.id], content: e.target.value } }))
                }
                rows={8}
                className="mt-3 w-full rounded-xl border border-white/60 bg-white/70 px-3 py-2 text-sm dark:border-white/10 dark:bg-black/40"
              />
              <button
                type="button"
                disabled={busyId === row.id}
                onClick={() => void handleApprove(row.id)}
                className="mt-4 inline-flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
              >
                {busyId === row.id ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                Approve & Publish
              </button>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
