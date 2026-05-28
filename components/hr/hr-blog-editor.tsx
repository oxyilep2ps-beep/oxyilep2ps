'use client';

import { FormEvent, useState } from 'react';
import { Check, Loader2, Upload } from 'lucide-react';
import { submitHrBlog, uploadBlogCover } from '@/app/actions/hr-blogs';
import { BlogQualityChecklist, evaluateBlogQuality } from '@/components/blog/blog-quality-checklist';
import { RichTextEditor } from '@/components/blog/rich-text-editor';

export function HrBlogEditor() {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('<p></p>');
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const quality = evaluateBlogQuality(title, content, coverUrl);

  const onCover = async (file: File | null) => {
    if (!file) return;
    const fd = new FormData();
    fd.set('file', file);
    const url = await uploadBlogCover(fd);
    setCoverUrl(url);
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!quality.allGreen) {
      setMessage('Perfect Blog checklist is not fully green. Please fix the highlighted gaps.');
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      await submitHrBlog({ title, content, cover_image: coverUrl });
      setMessage('Submitted for admin approval!');
      setTitle('');
      setContent('<p></p>');
      setCoverUrl(null);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Submit failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div>
        <h2 className="text-xl font-black text-neutral-950 dark:text-white">HR Blog Editor</h2>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">
          Drafts go to Admin → Blog Approvals before publishing on /blogs.
        </p>
      </div>

      <div className="glass-card rounded-2xl p-5">
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-brand-500 px-4 py-2 text-sm font-bold text-white">
          <Upload size={16} />
          Upload Cover Image
          <input type="file" accept="image/*" className="hidden" onChange={(e) => void onCover(e.target.files?.[0] ?? null)} />
        </label>
        {coverUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={coverUrl} alt="Cover preview" className="mt-4 max-h-48 rounded-xl object-cover" />
        )}
      </div>

      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Article title"
        className="w-full rounded-2xl border border-white/60 bg-white/70 px-4 py-3 font-bold dark:border-white/10 dark:bg-black/40"
        required
      />

      <div className="grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
        <div>
          <RichTextEditor
            value={content}
            onChange={setContent}
            placeholder="Write your article with headings, lists, and links..."
          />
        </div>
        <div className="space-y-3">
          <BlogQualityChecklist title={title} content={content} coverImage={coverUrl} />
        </div>
      </div>

      {message && <p className="text-sm text-brand-600">{message}</p>}

      <button
        type="submit"
        disabled={busy || !quality.allGreen}
        className="inline-flex items-center gap-2 rounded-full bg-brand-500 px-6 py-3 text-sm font-bold text-white disabled:opacity-50"
      >
        {busy ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
        Submit for Approval
      </button>
    </form>
  );
}
