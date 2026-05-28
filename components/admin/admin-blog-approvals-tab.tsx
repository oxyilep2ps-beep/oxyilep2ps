'use client';

import { useCallback, useEffect, useState } from 'react';
import { Check, Loader2, Upload, XCircle } from 'lucide-react';
import {
  approveBlog,
  createAdminBlog,
  listPendingBlogs,
  listPublishedBlogs,
  rejectBlog,
  type AdminBlogRow,
} from '@/app/actions/admin-blogs';
import { uploadBlogCover } from '@/app/actions/hr-blogs';
import { BlogQualityChecklist, evaluateBlogQuality } from '@/components/blog/blog-quality-checklist';
import { RichTextEditor } from '@/components/blog/rich-text-editor';

export function AdminBlogApprovalsTab() {
  const [pendingRows, setPendingRows] = useState<AdminBlogRow[]>([]);
  const [publishedRows, setPublishedRows] = useState<AdminBlogRow[]>([]);
  const [tab, setTab] = useState<'create' | 'pending' | 'published'>('create');
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [selectedPendingId, setSelectedPendingId] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('<p></p>');
  const [coverUrl, setCoverUrl] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [pendingData, publishedData] = await Promise.all([listPendingBlogs(), listPublishedBlogs()]);
      setPendingRows(pendingData);
      setPublishedRows(publishedData);

      if (selectedPendingId && pendingData.some((blog) => blog.id === selectedPendingId)) {
        const selected = pendingData.find((blog) => blog.id === selectedPendingId);
        if (selected) {
          setTitle(selected.title);
          setContent(selected.content);
          setCoverUrl(selected.cover_image);
        }
      } else if (pendingData.length > 0 && tab === 'pending') {
        const first = pendingData[0];
        setSelectedPendingId(first.id);
        setTitle(first.title);
        setContent(first.content);
        setCoverUrl(first.cover_image);
      }
    } finally {
      setLoading(false);
    }
  }, [selectedPendingId, tab]);

  useEffect(() => {
    void load();
  }, [load]);

  const quality = evaluateBlogQuality(title, content, coverUrl);

  const pickPending = (row: AdminBlogRow) => {
    setSelectedPendingId(row.id);
    setTitle(row.title);
    setContent(row.content);
    setCoverUrl(row.cover_image);
    setMessage(null);
  };

  const onCover = async (file: File | null) => {
    if (!file) return;
    const fd = new FormData();
    fd.set('file', file);
    const url = await uploadBlogCover(fd);
    setCoverUrl(url);
  };

  const handleCreatePublish = async () => {
    if (!quality.allGreen) {
      setMessage('All checklist items must be green before publishing.');
      return;
    }
    setBusyAction(true);
    try {
      await createAdminBlog({ title, content, cover_image: coverUrl });
      setMessage('Blog published successfully.');
      setTitle('');
      setContent('<p></p>');
      setCoverUrl(null);
      setTab('published');
      await load();
    } finally {
      setBusyAction(false);
    }
  };

  const handleApprovePending = async () => {
    if (!selectedPendingId) return;
    if (!quality.allGreen) {
      setMessage('All checklist items must be green before publishing.');
      return;
    }
    setBusyId(selectedPendingId);
    try {
      await approveBlog(selectedPendingId, { title, content, cover_image: coverUrl });
      setMessage('Pending blog edited and published.');
      setSelectedPendingId(null);
      setTitle('');
      setContent('<p></p>');
      setCoverUrl(null);
      setTab('published');
      await load();
    } finally {
      setBusyId(null);
    }
  };

  const handleRejectPending = async () => {
    if (!selectedPendingId) return;
    setBusyId(selectedPendingId);
    try {
      await rejectBlog(selectedPendingId);
      setMessage('Blog rejected and returned to HR queue.');
      const remaining = pendingRows.filter((r) => r.id !== selectedPendingId);
      if (remaining.length > 0) {
        pickPending(remaining[0]);
      } else {
        setSelectedPendingId(null);
        setTitle('');
        setContent('<p></p>');
        setCoverUrl(null);
      }
      await load();
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-black text-neutral-950 dark:text-white">Blog Manager</h2>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">
          Create, review, and publish blog content across Admin and HR workflows.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {[
          { id: 'create', label: 'Create New Blog' },
          { id: 'pending', label: `Pending Approvals (${pendingRows.length})` },
          { id: 'published', label: `Published Blogs (${publishedRows.length})` },
        ].map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id as 'create' | 'pending' | 'published')}
            className={`rounded-full px-4 py-2 text-sm font-bold ${
              tab === item.id
                ? 'bg-brand-500 text-white'
                : 'bg-white/60 text-neutral-700 dark:bg-white/10 dark:text-neutral-200'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="animate-spin text-brand-500" size={28} />
        </div>
      ) : tab === 'published' ? (
        publishedRows.length === 0 ? (
          <p className="text-sm text-neutral-500">No published blogs yet.</p>
        ) : (
          <div className="space-y-4">
            {publishedRows.map((row) => (
              <article key={row.id} className="glass-card rounded-2xl p-5">
                <p className="text-xs font-bold uppercase tracking-wider text-emerald-600">Published</p>
                <h3 className="mt-1 text-lg font-bold text-neutral-950 dark:text-white">{row.title}</h3>
                <p className="mt-1 text-xs text-neutral-500">
                  Live at <span className="font-semibold">/blog/{row.slug}</span>
                </p>
              </article>
            ))}
          </div>
        )
      ) : (
        <div className="grid gap-4 lg:grid-cols-[0.75fr_1.25fr_0.7fr]">
          {tab === 'pending' ? (
            <div className="glass-card max-h-[68vh] overflow-y-auto rounded-2xl p-3">
              {pendingRows.length === 0 ? (
                <p className="text-sm text-neutral-500">No pending blog posts.</p>
              ) : (
                pendingRows.map((row) => (
                  <button
                    key={row.id}
                    type="button"
                    onClick={() => pickPending(row)}
                    className={`mb-2 w-full rounded-xl border p-3 text-left ${
                      selectedPendingId === row.id
                        ? 'border-brand-400 bg-brand-500/10'
                        : 'border-white/50 bg-white/40 dark:border-white/10 dark:bg-black/30'
                    }`}
                  >
                    <p className="font-semibold text-neutral-900 dark:text-white">{row.title}</p>
                    <p className="text-xs text-neutral-500">{new Date(row.created_at).toLocaleDateString('en-GB')}</p>
                  </button>
                ))
              )}
            </div>
          ) : (
            <div className="glass-card rounded-2xl p-3 text-sm text-neutral-500">
              Admin authored post will be published directly.
            </div>
          )}

          <div className="space-y-4">
            <div className="glass-card rounded-2xl p-4">
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-brand-500 px-4 py-2 text-xs font-bold text-white">
                <Upload size={15} />
                Upload Cover Image
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => void onCover(e.target.files?.[0] ?? null)}
                />
              </label>
              {coverUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={coverUrl} alt="Cover preview" className="mt-3 h-40 w-full rounded-xl object-cover" />
              )}
            </div>

            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Blog title"
              className="w-full rounded-2xl border border-white/60 bg-white/70 px-4 py-3 font-bold dark:border-white/10 dark:bg-black/40"
            />

            <RichTextEditor value={content} onChange={setContent} placeholder="Write polished long-form content..." />

            {message && <p className="text-sm text-brand-600">{message}</p>}

            <div className="flex flex-wrap gap-3">
              {tab === 'pending' ? (
                <>
                  <button
                    type="button"
                    disabled={!selectedPendingId || busyId === selectedPendingId || !quality.allGreen}
                    onClick={() => void handleApprovePending()}
                    className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-5 py-2 text-sm font-bold text-white disabled:opacity-50"
                  >
                    {busyId === selectedPendingId ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                    Save Changes & Publish
                  </button>
                  <button
                    type="button"
                    disabled={!selectedPendingId || busyId === selectedPendingId}
                    onClick={() => void handleRejectPending()}
                    className="inline-flex items-center gap-2 rounded-full bg-red-600 px-5 py-2 text-sm font-bold text-white disabled:opacity-50"
                  >
                    <XCircle size={16} />
                    Reject / Return to HR
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  disabled={busyAction || !quality.allGreen}
                  onClick={() => void handleCreatePublish()}
                  className="inline-flex items-center gap-2 rounded-full bg-brand-500 px-5 py-2 text-sm font-bold text-white disabled:opacity-50"
                >
                  {busyAction ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                  Publish
                </button>
              )}
            </div>
          </div>

          <BlogQualityChecklist title={title} content={content} coverImage={coverUrl} />
        </div>
      )}
    </div>
  );
}
