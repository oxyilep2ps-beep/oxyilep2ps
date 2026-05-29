'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
import {
  deleteBloggerBlog,
  listBloggerBlogs,
  saveBloggerDraft,
  submitBloggerBlog,
  updateBloggerBlog,
  uploadBloggerBlogCover,
} from '@/app/actions/blogger-blogs';
import type { BlogRow } from '@/lib/blog/types';
import { blogCoverUrl } from '@/lib/blog/types';
import { BlogEditorPanel } from '@/components/blog/blog-editor-panel';

type Tab = 'drafts' | 'pending' | 'published' | 'references';

export function BloggerCmsDashboard() {
  const [tab, setTab] = useState<Tab>('drafts');
  const [rows, setRows] = useState<BlogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<BlogRow | null>(null);
  const [creating, setCreating] = useState(false);
  const [fromReference, setFromReference] = useState<BlogRow | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listBloggerBlogs(tab);
      setRows(data);
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => {
    void load();
  }, [load]);

  const startNew = () => {
    setCreating(true);
    setEditing(null);
    setFromReference(null);
  };

  const startFromReference = (row: BlogRow) => {
    setFromReference(row);
    setCreating(true);
    setEditing(null);
  };

  const startEdit = (row: BlogRow) => {
    setEditing(row);
    setCreating(false);
    setFromReference(null);
  };

  const closeEditor = () => {
    setEditing(null);
    setCreating(false);
    setFromReference(null);
    void load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this blog?')) return;
    setBusyId(id);
    try {
      await deleteBloggerBlog(id);
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Delete failed');
    } finally {
      setBusyId(null);
    }
  };

  const editorVisible = creating || editing;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-black text-neutral-950 dark:text-white">Blogger CMS</h2>
          <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">
            Draft, submit for approval, and track published articles.
          </p>
        </div>
        <button
          type="button"
          onClick={startNew}
          className="inline-flex items-center gap-2 rounded-full bg-brand-500 px-4 py-2 text-sm font-bold text-white"
        >
          <Plus size={16} />
          New Blog
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {(
          [
            { id: 'drafts', label: 'My Drafts' },
            { id: 'pending', label: 'Pending Approval' },
            { id: 'published', label: 'Published' },
            { id: 'references', label: 'Writing Prompts' },
          ] as const
        ).map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => {
              setTab(item.id);
              closeEditor();
            }}
            className={`rounded-full px-4 py-2 text-sm font-bold ${
              tab === item.id ? 'bg-brand-500 text-white' : 'bg-white/60 text-neutral-700 dark:bg-white/10'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {editorVisible ? (
        <div className="glass-card rounded-2xl p-5">
          <div className="mb-4 flex items-center justify-between">
            <p className="font-bold text-brand-600">
              {editing ? `Editing: ${editing.title}` : fromReference ? `From prompt: ${fromReference.title}` : 'New article'}
            </p>
            <button type="button" onClick={closeEditor} className="text-sm font-semibold text-neutral-500">
              Close
            </button>
          </div>
          <BlogEditorPanel
            key={editing?.id ?? fromReference?.id ?? 'new'}
            initialTitle={editing?.title ?? fromReference?.title ?? ''}
            initialContent={editing?.content ?? fromReference?.content ?? '<p></p>'}
            initialCoverUrl={editing ? blogCoverUrl(editing) : null}
            submitLabel={editing?.status === 'PUBLISHED' ? 'Save & Re-submit for Approval' : 'Submit for Approval'}
            showDraftButton={!editing || editing.status === 'DRAFT' || editing.status === 'REJECTED'}
            onUploadCover={async (file) => {
              const fd = new FormData();
              fd.set('file', file);
              return uploadBloggerBlogCover(fd);
            }}
            onSaveDraft={async (payload) => {
              if (editing) {
                await updateBloggerBlog({ id: editing.id, ...payload, submitForApproval: false });
              } else {
                await saveBloggerDraft({
                  ...payload,
                  fromReferenceId: fromReference?.id,
                });
              }
              closeEditor();
            }}
            onSubmit={async (payload) => {
              if (editing) {
                await updateBloggerBlog({ id: editing.id, ...payload, submitForApproval: true });
              } else {
                await submitBloggerBlog({
                  ...payload,
                  fromReferenceId: fromReference?.id,
                });
              }
              closeEditor();
            }}
          />
          {editing?.status === 'PUBLISHED' && (
            <p className="mt-3 text-xs text-amber-700 dark:text-amber-300">
              Saving a published post sends it back to pending approval and removes it from the public site until admin approves again.
            </p>
          )}
        </div>
      ) : null}

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="animate-spin text-brand-500" size={28} />
        </div>
      ) : rows.length === 0 ? (
        <p className="text-sm text-neutral-500">No blogs in this tab.</p>
      ) : (
        <div className="space-y-3">
          {rows.map((row) => (
            <article key={row.id} className="glass-card flex flex-wrap items-center justify-between gap-3 rounded-2xl p-4">
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-neutral-950 dark:text-white">{row.title}</p>
                <p className="text-xs text-neutral-500">
                  {row.status} · {new Date(row.updated_at).toLocaleString('en-GB')}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {tab === 'references' ? (
                  <button
                    type="button"
                    onClick={() => startFromReference(row)}
                    className="rounded-full bg-brand-500 px-3 py-1.5 text-xs font-bold text-white"
                  >
                    Use as template
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => startEdit(row)}
                      className="inline-flex items-center gap-1 rounded-full border border-brand-300 px-3 py-1.5 text-xs font-bold text-brand-600"
                    >
                      <Pencil size={14} />
                      Edit
                    </button>
                    {row.status !== 'PUBLISHED' && (
                      <button
                        type="button"
                        disabled={busyId === row.id}
                        onClick={() => void handleDelete(row.id)}
                        className="inline-flex items-center gap-1 rounded-full bg-red-600 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50"
                      >
                        <Trash2 size={14} />
                        Delete
                      </button>
                    )}
                  </>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      <p className="text-xs text-neutral-500">
        Need help? Visit the{' '}
        <Link href="/admin-dashboard/blogs" className="font-semibold text-brand-600">
          admin blog queue
        </Link>{' '}
        after submission.
      </p>
    </div>
  );
}
