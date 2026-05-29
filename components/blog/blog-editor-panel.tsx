'use client';

import { FormEvent, useState } from 'react';
import { Check, Loader2, Save, Upload } from 'lucide-react';
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
  onUploadCover: (file: File) => Promise<string>;
  onSubmit: (payload: { title: string; content: string; cover_image_url: string | null }) => Promise<void>;
  onSaveDraft?: (payload: { title: string; content: string; cover_image_url: string | null }) => Promise<void>;
};

export function BlogEditorPanel({
  initialTitle = '',
  initialContent = '<p></p>',
  initialCoverUrl = null,
  submitLabel = 'Submit for Approval',
  saveDraftLabel = 'Save Draft',
  showDraftButton = true,
  busy = false,
  onUploadCover,
  onSubmit,
  onSaveDraft,
}: BlogEditorPanelProps) {
  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState(initialContent);
  const [coverUrl, setCoverUrl] = useState<string | null>(initialCoverUrl);
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
      const payload = { title, content, cover_image_url: coverUrl };
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
      <label className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-brand-500 px-4 py-2 text-sm font-bold text-white">
        <Upload size={16} />
        Upload Cover Image
        <input type="file" accept="image/*" className="hidden" onChange={(e) => void onCover(e.target.files?.[0] ?? null)} />
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
        <RichTextEditor value={content} onChange={setContent} placeholder="Write your article..." />
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
