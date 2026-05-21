'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { Loader2, Megaphone, Trash2 } from 'lucide-react';
import {
  createAdminAnnouncement,
  deleteAdminAnnouncement,
  listAdminAnnouncements,
  type AdminAnnouncement,
} from '@/app/actions/admin-announcements';

export function AdminAnnouncementsTab() {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [items, setItems] = useState<AdminAnnouncement[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await listAdminAnnouncements();
      setItems(rows);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Failed to load announcements');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setMessage(null);
    try {
      await createAdminAnnouncement(title, content);
      setTitle('');
      setContent('');
      setMessage('Announcement published to Main Hub.');
      await load();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Publish failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this announcement?')) return;
    setMessage(null);
    try {
      await deleteAdminAnnouncement(id);
      setMessage('Announcement removed.');
      await load();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Delete failed');
    }
  };

  return (
    <div className="w-full min-w-0 space-y-6">
      <div>
        <h2 className="text-xl font-black text-neutral-950 dark:text-white">Announcements Manager</h2>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">
          Compose platform updates shown on the investor/borrower Main Hub.
        </p>
      </div>

      {message && (
        <p className="rounded-xl border border-brand-200 bg-brand-500/10 px-4 py-3 text-sm text-brand-800 dark:text-brand-200">
          {message}
        </p>
      )}

      <form onSubmit={handleSubmit} className="glass-card space-y-4 rounded-2xl p-5">
        <div className="flex items-center gap-2 text-brand-600 dark:text-brand-300">
          <Megaphone size={20} />
          <span className="text-sm font-bold uppercase tracking-wider">New announcement</span>
        </div>
        <label className="block text-sm">
          <span className="mb-2 block font-semibold">Title</span>
          <input
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-xl border border-white/40 bg-white/80 px-4 py-3 outline-none focus:ring-2 focus:ring-brand-500/40 dark:border-white/10 dark:bg-black/40"
            placeholder="e.g. New handshake & chat features live"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-2 block font-semibold">Content</span>
          <textarea
            required
            rows={4}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full rounded-xl border border-white/40 bg-white/80 px-4 py-3 outline-none focus:ring-2 focus:ring-brand-500/40 dark:border-white/10 dark:bg-black/40"
            placeholder="Write the update for approved users…"
          />
        </label>
        <button
          type="submit"
          disabled={submitting}
          className="rounded-full bg-brand-500 px-6 py-3 text-sm font-semibold text-white shadow-glow hover:bg-brand-400 disabled:opacity-60"
        >
          {submitting ? 'Publishing…' : 'Publish announcement'}
        </button>
      </form>

      <div>
        <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-500">Previous posts</h3>
        {loading ? (
          <div className="mt-4 flex justify-center py-8">
            <Loader2 className="animate-spin text-brand-500" size={24} />
          </div>
        ) : items.length === 0 ? (
          <p className="mt-4 text-sm text-neutral-500">No announcements yet.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {items.map((item) => (
              <li key={item.id} className="glass-card rounded-2xl p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-neutral-950 dark:text-white">{item.title}</p>
                    <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-300">{item.content}</p>
                    <p className="mt-2 text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
                      {new Date(item.created_at).toLocaleString('en-GB')}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDelete(item.id)}
                    className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300"
                  >
                    <Trash2 size={14} />
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
