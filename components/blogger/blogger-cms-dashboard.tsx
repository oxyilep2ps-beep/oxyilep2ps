'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
import {
  deleteBloggerBlog,
  listBloggerBlogs,
  saveBloggerDraft,
  submitBloggerBlog,
  updateBloggerBlog,
  uploadBloggerBlogCover,
  uploadBloggerInlineImage,
} from '@/app/actions/blogger-blogs';
import type { BlogRow } from '@/lib/blog/types';
import { blogCoverUrl } from '@/lib/blog/types';
import { BlogEditorPanel } from '@/components/blog/blog-editor-panel';

type Tab = 'drafts' | 'pending' | 'published' | 'references';

function SkeletonCards() {
  return (
    <div className="mt-2 flex w-full flex-col gap-4" aria-busy="true" aria-label="Loading blogs">
      {[1, 2, 3].map((index) => (
        <div
          key={index}
          className="flex h-[88px] w-full animate-pulse items-center justify-between rounded-2xl border border-white/5 bg-neutral-800/30 p-4"
        >
          <div className="flex w-2/3 flex-col gap-3">
            <div className="h-5 w-3/4 rounded-md bg-neutral-700/40" />
            <div className="h-3 w-1/3 rounded-md bg-neutral-700/30" />
          </div>
          <div className="h-9 w-32 rounded-full bg-orange-500/10" />
        </div>
      ))}
    </div>
  );
}

export function BloggerCmsDashboard() {
  const [tab, setTab] = useState<Tab>('drafts');
  const [rows, setRows] = useState<BlogRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editing, setEditing] = useState<BlogRow | null>(null);
  const [creating, setCreating] = useState(false);
  const [fromReference, setFromReference] = useState<BlogRow | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  // Quick Create from bottom nav: /blogger?new=1
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('new') === '1') {
      setCreating(true);
      setEditing(null);
      setFromReference(null);
      window.history.replaceState({}, '', '/blogger');
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    // CRITICAL: clear previous tab data instantly so drafts never flash on Published
    setIsLoading(true);
    setRows([]);

    void (async () => {
      try {
        const data = await listBloggerBlogs(tab);
        if (!cancelled) setRows(data);
      } catch (err) {
        if (!cancelled) {
          console.error(err);
          setRows([]);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [tab]);

  const reloadCurrentTab = useCallback(async () => {
    setIsLoading(true);
    setRows([]);
    try {
      const data = await listBloggerBlogs(tab);
      setRows(data);
    } finally {
      setIsLoading(false);
    }
  }, [tab]);

  const dismissEditor = () => {
    setEditing(null);
    setCreating(false);
    setFromReference(null);
  };

  const closeEditor = () => {
    dismissEditor();
    void reloadCurrentTab();
  };

  const switchTab = (next: Tab) => {
    dismissEditor();
    if (next === tab) {
      void reloadCurrentTab();
      return;
    }
    // Clear immediately on click (before React commits the new tab effect)
    setIsLoading(true);
    setRows([]);
    setTab(next);
  };

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

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this blog?')) return;
    setBusyId(id);
    try {
      await deleteBloggerBlog(id);
      await reloadCurrentTab();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Delete failed');
    } finally {
      setBusyId(null);
    }
  };

  const editorVisible = creating || editing;
  const uploadInline = async (file: File) => {
    const fd = new FormData();
    fd.set('file', file);
    return uploadBloggerInlineImage(fd);
  };

  return (
    <div className="space-y-6 pb-24">
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
            { id: 'drafts', label: 'My Drafts / Rejected' },
            { id: 'pending', label: 'Pending Approval' },
            { id: 'published', label: 'Published' },
            { id: 'references', label: 'Writing Prompts' },
          ] as const
        ).map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => switchTab(item.id)}
            className={`rounded-full px-4 py-2 text-sm font-bold ${
              tab === item.id ? 'bg-brand-500 text-white' : 'bg-white/60 text-neutral-700 dark:bg-white/10'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {editorVisible ? (
        <div className="rounded-3xl border border-neutral-800 bg-neutral-950/80 p-4 sm:p-6">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#F97316]">
              {editing
                ? `Editing · ${editing.title}`
                : fromReference
                  ? `From prompt · ${fromReference.title}`
                  : 'New article'}
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
            initialSlug={editing?.slug ?? null}
            initialMetaDescription={editing?.meta_description ?? ''}
            initialFocusKeyword={editing?.focus_keyword ?? ''}
            initialCategory={editing?.category ?? 'FinTech'}
            initialTags={editing?.tags ?? []}
            initialCoverImageAlt={editing?.cover_image_alt ?? ''}
            initialPublishAt={editing?.published_at ?? editing?.created_at ?? null}
            adminFeedback={editing?.status === 'REJECTED' ? editing.admin_feedback : null}
            rejectionReason={editing?.status === 'REJECTED' ? editing.rejection_reason : null}
            submitLabel={
              editing?.status === 'REJECTED'
                ? 'Resubmit for Approval'
                : editing?.status === 'PUBLISHED'
                  ? 'Approve & Publish'
                  : 'Approve & Publish'
            }
            showDraftButton={!editing || editing.status === 'DRAFT' || editing.status === 'REJECTED'}
            onUploadCover={async (file) => {
              const fd = new FormData();
              fd.set('file', file);
              return uploadBloggerBlogCover(fd);
            }}
            onUploadInlineImage={uploadInline}
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
              Saving a published post sends it back to pending approval and removes it from the public site until
              admin approves again.
            </p>
          )}
        </div>
      ) : null}

      {/* 1) loading → skeletons  2) empty → message  3) data → cards */}
      {isLoading ? (
        <SkeletonCards />
      ) : rows.length === 0 ? (
        <p className="cms-fade-in text-sm text-neutral-500">No blogs in this tab.</p>
      ) : (
        <div className="cms-fade-in space-y-3">
          {rows.map((row) => (
            <article
              key={row.id}
              className={`glass-card rounded-2xl p-4 ${
                row.status === 'REJECTED' ? 'border border-red-400/50 ring-1 ring-red-500/20' : ''
              }`}
            >
              {row.status === 'REJECTED' ? (
                <div className="mb-3 flex items-start gap-2 rounded-xl bg-red-500/10 px-3 py-2 text-xs text-red-700 dark:text-red-300">
                  <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                  <div>
                    <p className="font-black uppercase tracking-wider">
                      Rejected{row.rejection_reason ? ` · ${row.rejection_reason}` : ''}
                    </p>
                    <p className="mt-1 line-clamp-2">
                      {row.admin_feedback?.replace(/<[^>]+>/g, ' ').trim() ||
                        'Open the post to read admin feedback, fix issues, then resubmit.'}
                    </p>
                  </div>
                </div>
              ) : null}
              <div className="flex flex-wrap items-center justify-between gap-3">
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
                        {row.status === 'REJECTED' ? 'Fix & Resubmit' : 'Edit'}
                      </button>
                      {row.status !== 'PUBLISHED' && (
                        <button
                          type="button"
                          disabled={busyId === row.id}
                          onClick={() => void handleDelete(row.id)}
                          className="inline-flex items-center gap-1 rounded-full bg-red-600 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50"
                        >
                          {busyId === row.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                          Delete
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      <p className="text-xs text-neutral-500">
        New here? Read the{' '}
        <Link href="/blogger/seo-guide" className="font-semibold text-brand-600">
          SEO Guide
        </Link>{' '}
        for every ranking tool in Editorial Studio.
      </p>
    </div>
  );
}
