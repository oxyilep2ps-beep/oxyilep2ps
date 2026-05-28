'use client';

import { FormEvent, useState } from 'react';
import { Check, Loader2, Upload } from 'lucide-react';
import { submitHrBlog, uploadBlogCover } from '@/app/actions/hr-blogs';

const CHECKLIST = [
  'Catchy, benefit-led title',
  'Minimum 500 words of substance',
  'SEO keywords in first paragraph',
  'Clear headings and scannable structure',
  'Brand tone (confident, compliant, human)',
  'Cover image uploaded and relevant',
  'Call-to-action or next step for readers',
];

export function HrBlogEditor() {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [checks, setChecks] = useState<boolean[]>(CHECKLIST.map(() => false));
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const allChecked = checks.every(Boolean);
  const wordCount = content.trim().split(/\s+/).filter(Boolean).length;

  const onCover = async (file: File | null) => {
    if (!file) return;
    const fd = new FormData();
    fd.set('file', file);
    const url = await uploadBlogCover(fd);
    setCoverUrl(url);
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!allChecked) {
      setMessage('Complete the editorial checklist before submitting.');
      return;
    }
    if (wordCount < 500) {
      setMessage(`Article needs at least 500 words (currently ${wordCount}).`);
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      await submitHrBlog({ title, content, cover_image: coverUrl });
      setMessage('Submitted for admin approval!');
      setTitle('');
      setContent('');
      setCoverUrl(null);
      setChecks(CHECKLIST.map(() => false));
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

      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Write your article (min 500 words)..."
        rows={14}
        className="w-full rounded-2xl border border-white/60 bg-white/70 px-4 py-3 text-sm dark:border-white/10 dark:bg-black/40"
        required
      />
      <p className="text-xs text-neutral-500">{wordCount} words</p>

      <div className="glass-card rounded-2xl p-5">
        <p className="text-sm font-bold text-brand-600">Editorial Checklist</p>
        <ul className="mt-3 space-y-2">
          {CHECKLIST.map((item, i) => (
            <li key={item}>
              <label className="flex cursor-pointer items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={checks[i]}
                  onChange={(e) => {
                    const next = [...checks];
                    next[i] = e.target.checked;
                    setChecks(next);
                  }}
                  className="mt-1"
                />
                <span>{item}</span>
              </label>
            </li>
          ))}
        </ul>
      </div>

      {message && <p className="text-sm text-brand-600">{message}</p>}

      <button
        type="submit"
        disabled={busy || !allChecked}
        className="inline-flex items-center gap-2 rounded-full bg-brand-500 px-6 py-3 text-sm font-bold text-white disabled:opacity-50"
      >
        {busy ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
        Submit for Approval
      </button>
    </form>
  );
}
