'use client';

import { useState } from 'react';
import { Loader2, X } from 'lucide-react';
import { BLOG_REJECTION_REASONS } from '@/lib/blog/types';

type RejectBlogModalProps = {
  open: boolean;
  blogTitle: string;
  busy?: boolean;
  onClose: () => void;
  onConfirm: (payload: { rejectionReason: string; adminFeedback: string }) => Promise<void>;
};

export function RejectBlogModal({ open, blogTitle, busy, onClose, onConfirm }: RejectBlogModalProps) {
  const [reason, setReason] = useState<string>(BLOG_REJECTION_REASONS[2]);
  const [feedback, setFeedback] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/60 p-4 sm:items-center">
      <div className="glass-card w-full max-w-lg rounded-[1.75rem] border border-white/20 bg-neutral-950/95 p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-red-400">Reject submission</p>
            <h3 className="mt-1 text-xl font-black text-white">{blogTitle}</h3>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-neutral-400 hover:bg-white/10">
            <X size={18} />
          </button>
        </div>

        <label className="mt-5 block">
          <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">Rejection reason</span>
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-white"
          >
            {BLOG_REJECTION_REASONS.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>

        <label className="mt-4 block">
          <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">
            Changes asked (admin feedback)
          </span>
          <textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            rows={6}
            placeholder="Explain exactly what the blogger must fix before resubmitting…"
            className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-white"
          />
        </label>

        {error ? <p className="mt-2 text-sm text-red-400">{error}</p> : null}

        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            className="rounded-full border border-white/20 px-4 py-2 text-sm font-bold text-neutral-200"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              void (async () => {
                if (!feedback.trim()) {
                  setError('Please describe the changes requested.');
                  return;
                }
                setError(null);
                await onConfirm({ rejectionReason: reason, adminFeedback: feedback.trim() });
              })();
            }}
            className="inline-flex items-center gap-2 rounded-full bg-red-600 px-5 py-2 text-sm font-bold text-white disabled:opacity-50"
          >
            {busy ? <Loader2 size={14} className="animate-spin" /> : null}
            Confirm reject
          </button>
        </div>
      </div>
    </div>
  );
}
