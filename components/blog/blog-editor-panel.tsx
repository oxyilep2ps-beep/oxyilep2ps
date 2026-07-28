'use client';

import { FormEvent, useState } from 'react';
import { AlertTriangle, Check, Loader2, Save, Upload } from 'lucide-react';
import { BlogQualityChecklist, evaluateBlogQuality } from '@/components/blog/blog-quality-checklist';
import { RichTextEditor } from '@/components/blog/rich-text-editor';

type BlogEditorPanelProps = {
  initialTitle?: string;
  initialContent?: string;
  initialCoverUrl?: string | null;
  submitLabel?: string;
  saveDraftLabel?: string;
  showDraftButton?: boolean;
  busy?: boolean;
  adminFeedback?: string | null;
  rejectionReason?: string | null;
  onUploadCover: (file: File) => Promise<string>;
  onUploadInlineImage?: (file: File) => Promise<string>;
  onSubmit: (payload: {
    title: string;
    content: string;
    cover_image_url: string | null;
    inline_images?: string[];
  }) => Promise<void>;
  onSaveDraft?: (payload: {
    title: string;
    content: string;
    cover_image_url: string | null;
    inline_images?: string[];
  }) => Promise<void>;
};

export function BlogEditorPanel({
  initialTitle = '',
  initialContent = '<p></p>',
  initialCoverUrl = null,
  submitLabel = 'Submit for Approval',
  saveDraftLabel = 'Save Draft',
  showDraftButton = true,
  busy = false,
  adminFeedback = null,
  rejectionReason = null,
  onUploadCover,
  onUploadInlineImage,
  onSubmit,
  onSaveDraft,
}: BlogEditorPanelProps) {
  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState(initialContent);
  const [coverUrl, setCoverUrl] = useState<string | null>(initialCoverUrl);
  const [inlineImages, setInlineImages] = useState<string[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [localBusy, setLocalBusy] = useState(false);

  const quality = evaluateBlogQuality(title, content, coverUrl);
  const isBusy = busy || localBusy;

  const onCover = async (file: File | null) => {
    if (!file) return;
    const url = await onUploadCover(file);
    setCoverUrl(url);
  };

  const run = async (action: 'submit' | 'draft') => {
    if (action === 'submit' && !quality.allGreen) {
      setMessage('Perfect Blog checklist must be all green before submitting.');
      return;
    }
    setLocalBusy(true);
    setMessage(null);
    try {
      const payload = {
        title,
        content,
        cover_image_url: coverUrl,
        inline_images: inlineImages,
      };
      if (action === 'submit') await onSubmit(payload);
      else if (onSaveDraft) await onSaveDraft(payload);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setLocalBusy(false);
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    void run('submit');
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {adminFeedback || rejectionReason ? (
        <div className="rounded-2xl border border-red-300/60 bg-red-500/10 p-4 dark:border-red-900/50">
          <div className="flex items-start gap-2 text-red-700 dark:text-red-300">
            <AlertTriangle size={18} className="mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-black uppercase tracking-wider">
                Admin changes requested{rejectionReason ? ` · ${rejectionReason}` : ''}
              </p>
              <div
                className="prose prose-sm mt-2 max-w-none text-sm text-red-900 dark:prose-invert dark:text-red-100"
                dangerouslySetInnerHTML={{
                  __html: adminFeedback || '<p>Please revise and resubmit.</p>',
                }}
              />
            </div>
          </div>
        </div>
      ) : null}

      <label className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-brand-500 px-4 py-2 text-sm font-bold text-white">
        <Upload size={16} />
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
        <img src={coverUrl} alt="Cover" className="max-h-48 rounded-xl object-cover" />
      )}

      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Article title"
        className="w-full rounded-2xl border border-white/60 bg-white/70 px-4 py-3 font-bold dark:border-white/10 dark:bg-black/40"
        required
      />

      <div className="grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
        <RichTextEditor
          value={content}
          onChange={setContent}
          placeholder="Write your article… Type / for slash commands"
          onUploadInlineImage={onUploadInlineImage}
          onInlineImagesChange={setInlineImages}
        />
        <BlogQualityChecklist title={title} content={content} coverImage={coverUrl} />
      </div>

      {message && <p className="text-sm text-brand-600">{message}</p>}

      <div className="flex flex-wrap gap-3">
        {showDraftButton && onSaveDraft && (
          <button
            type="button"
            disabled={isBusy}
            onClick={() => void run('draft')}
            className="inline-flex items-center gap-2 rounded-full border border-brand-400 px-5 py-2 text-sm font-bold text-brand-600 disabled:opacity-50"
          >
            {isBusy ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {saveDraftLabel}
          </button>
        )}
        <button
          type="submit"
          disabled={isBusy || !quality.allGreen}
          className="inline-flex items-center gap-2 rounded-full bg-brand-500 px-5 py-2 text-sm font-bold text-white disabled:opacity-50"
        >
          {isBusy ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
