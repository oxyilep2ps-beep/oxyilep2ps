'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2, Pencil, Trash2, XCircle } from 'lucide-react';
import {
  approveBlog,
  deleteAdminBlog,
  getAdminBlog,
  listPendingBlogs,
  listPublishedBlogs,
  rejectBlog,
  updateAdminPublishedBlog,
  type AdminBlogRow,
} from '@/app/actions/admin-blogs';
import { uploadBlogCover } from '@/app/actions/hr-blogs';
import { uploadBloggerInlineImage } from '@/app/actions/blogger-blogs';
import { blogCoverUrl } from '@/lib/blog/types';
import { BlogEditorPanel } from '@/components/blog/blog-editor-panel';
import { RejectBlogModal } from '@/components/admin/reject-blog-modal';

type Tab = 'pending' | 'published';

function SkeletonCards() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="glass-card animate-pulse rounded-2xl p-4">
          <div className="h-4 w-2/3 rounded bg-neutral-300/60 dark:bg-white/10" />
          <div className="mt-3 h-3 w-1/3 rounded bg-neutral-200/60 dark:bg-white/5" />
        </div>
      ))}
    </div>
  );
}

export function AdminBlogCmsTab() {
  const [tab, setTab] = useState<Tab>('pending');
  const [pendingRows, setPendingRows] = useState<AdminBlogRow[]>([]);
  const [publishedRows, setPublishedRows] = useState<AdminBlogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewId, setReviewId] = useState<string | null>(null);
  const [reviewBlog, setReviewBlog] = useState<AdminBlogRow | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [rejectOpen, setRejectOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [pending, published] = await Promise.all([listPendingBlogs(), listPublishedBlogs()]);
      setPendingRows(pending);
      setPublishedRows(published);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const openReview = async (id: string) => {
    setReviewId(id);
    const blog = await getAdminBlog(id);
    setReviewBlog(blog);
    setMessage(null);
  };

  const closeReview = () => {
    setReviewId(null);
    setReviewBlog(null);
    setRejectOpen(false);
    void load();
  };

  const handleApprove = async (payload: {
    title: string;
    content: string;
    cover_image_url: string | null;
  }) => {
    if (!reviewId) return;
    setBusy(true);
    try {
      await approveBlog(reviewId, payload);
      setMessage('Published successfully.');
      closeReview();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Approve failed');
    } finally {
      setBusy(false);
    }
  };

  const handleRejectConfirm = async (payload: {
    rejectionReason: string;
    adminFeedback: string;
  }) => {
    if (!reviewId) return;
    setBusy(true);
    try {
      await rejectBlog(reviewId, payload);
      setMessage('Returned to blogger with feedback.');
      closeReview();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Reject failed');
    } finally {
      setBusy(false);
    }
  };

  const handlePublishedSave = async (payload: {
    title: string;
    content: string;
    cover_image_url: string | null;
  }) => {
    if (!reviewId) return;
    setBusy(true);
    try {
      await updateAdminPublishedBlog(reviewId, payload);
      setMessage('Live blog updated.');
      closeReview();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this blog permanently?')) return;
    setBusy(true);
    try {
      await deleteAdminBlog(id);
      await load();
    } finally {
      setBusy(false);
    }
  };

  const rows = tab === 'pending' ? pendingRows : publishedRows;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-black text-neutral-950 dark:text-white">Blog Manager</h2>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">
          Review blogger submissions with the same rich editor, approve, or reject with feedback.
        </p>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => {
            setTab('pending');
            closeReview();
          }}
          className={`rounded-full px-4 py-2 text-sm font-bold ${
            tab === 'pending' ? 'bg-brand-500 text-white' : 'bg-white/60 dark:bg-white/10'
          }`}
        >
          Pending Approvals ({pendingRows.length})
        </button>
        <button
          type="button"
          onClick={() => {
            setTab('published');
            closeReview();
          }}
          className={`rounded-full px-4 py-2 text-sm font-bold ${
            tab === 'published' ? 'bg-brand-500 text-white' : 'bg-white/60 dark:bg-white/10'
          }`}
        >
          Published Blogs ({publishedRows.length})
        </button>
      </div>

      {reviewBlog && reviewId ? (
        <div className="glass-card rounded-2xl p-5">
          <p className="mb-4 font-bold text-brand-600">Review & Edit — {reviewBlog.title}</p>
          <BlogEditorPanel
            key={reviewId}
            initialTitle={reviewBlog.title}
            initialContent={reviewBlog.content}
            initialCoverUrl={blogCoverUrl(reviewBlog)}
            submitLabel={tab === 'pending' ? 'Approve & Publish' : 'Save Live Changes'}
            showDraftButton={false}
            busy={busy}
            onUploadCover={async (file) => {
              const fd = new FormData();
              fd.set('file', file);
              return uploadBlogCover(fd);
            }}
            onUploadInlineImage={async (file) => {
              const fd = new FormData();
              fd.set('file', file);
              return uploadBloggerInlineImage(fd);
            }}
            onSubmit={tab === 'pending' ? handleApprove : handlePublishedSave}
          />
          {tab === 'pending' && (
            <button
              type="button"
              disabled={busy}
              onClick={() => setRejectOpen(true)}
              className="mt-4 inline-flex items-center gap-2 rounded-full bg-red-600 px-5 py-2 text-sm font-bold text-white disabled:opacity-50"
            >
              <XCircle size={16} />
              Reject / Needs Work
            </button>
          )}
          <button type="button" onClick={closeReview} className="mt-3 block text-sm text-neutral-500">
            Back to list
          </button>
          {message && <p className="mt-2 text-sm text-brand-600">{message}</p>}
        </div>
      ) : (
        <>
          {loading ? (
            <SkeletonCards />
          ) : rows.length === 0 ? (
            <p className="text-sm text-neutral-500">No blogs in this tab.</p>
          ) : (
            <div className="space-y-3">
              {rows.map((row) => (
                <article
                  key={row.id}
                  className="glass-card flex flex-wrap items-center justify-between gap-3 rounded-2xl p-4"
                >
                  <div>
                    <p className="font-semibold">{row.title}</p>
                    <p className="text-xs text-neutral-500">
                      {row.status} · {new Date(row.updated_at).toLocaleString('en-GB')}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => void openReview(row.id)}
                      className="inline-flex items-center gap-1 rounded-full bg-brand-500 px-3 py-1.5 text-xs font-bold text-white"
                    >
                      <Pencil size={14} />
                      {tab === 'pending' ? 'Review & Edit' : 'Edit'}
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void handleDelete(row.id)}
                      className="inline-flex items-center gap-1 rounded-full bg-red-600 px-3 py-1.5 text-xs font-bold text-white"
                    >
                      <Trash2 size={14} />
                      Delete
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </>
      )}

      <RejectBlogModal
        open={rejectOpen && Boolean(reviewBlog)}
        blogTitle={reviewBlog?.title ?? ''}
        busy={busy}
        onClose={() => setRejectOpen(false)}
        onConfirm={handleRejectConfirm}
      />
    </div>
  );
}
