'use client';

import { useState, useTransition } from 'react';
import { Loader2, Send, X } from 'lucide-react';
import { sendCandidateEmail } from '@/app/actions/sendCandidateEmail';
import { INTERVIEW_EMAIL_TEMPLATE, REJECTION_EMAIL_TEMPLATE } from '@/lib/hr/ats-application-status';
import { HR_TEXTAREA_CLASS } from '@/lib/hr/ui';

type Props = {
  to: string;
  candidateName: string;
  intent: 'Interview' | 'Rejected';
  applicationId: string;
  roleTitle?: string;
  onClose: () => void;
  onSent: () => void;
};

export function AtsEmailCandidateModal({
  to,
  candidateName,
  intent,
  applicationId,
  roleTitle,
  onClose,
  onSent,
}: Props) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState(intent === 'Interview' ? INTERVIEW_EMAIL_TEMPLATE : REJECTION_EMAIL_TEMPLATE);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/75 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="w-full max-w-xl overflow-hidden rounded-t-3xl border border-neutral-800 bg-black shadow-2xl sm:rounded-3xl">
        <div className="flex items-start justify-between gap-3 border-b border-neutral-800 px-5 py-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#F97316]">Email Candidate</p>
            <h3 className="mt-1 text-lg font-black text-white">{candidateName}</h3>
            <p className="mt-1 text-xs text-neutral-400">
              {roleTitle ? `${roleTitle} · ` : ''}
              {intent === 'Interview' ? 'Interview invite' : 'Rejection note'} · branded via Resend
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-neutral-800 p-2 text-neutral-300 hover:bg-[#F97316]/20"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        <div className="space-y-4 px-5 py-5">
          <label className="block space-y-1.5">
            <span className="text-xs font-semibold text-neutral-400">To</span>
            <input
              readOnly
              value={to}
              className="w-full cursor-not-allowed rounded-xl border border-neutral-800 bg-neutral-950 px-4 py-2.5 text-sm text-neutral-300"
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-xs font-semibold text-neutral-400">Message</span>
            <textarea
              rows={12}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className={HR_TEXTAREA_CLASS}
            />
          </label>

          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-[#F97316]">Quick-fill templates</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setMessage(REJECTION_EMAIL_TEMPLATE)}
                className="rounded-full border border-red-500/40 bg-red-500/10 px-3 py-1.5 text-[11px] font-bold text-red-300 hover:bg-red-500/20"
              >
                Standard Rejection
              </button>
              <button
                type="button"
                onClick={() => setMessage(INTERVIEW_EMAIL_TEMPLATE)}
                className="rounded-full border border-[#F97316]/50 bg-[#F97316]/10 px-3 py-1.5 text-[11px] font-bold text-[#F97316] hover:bg-[#F97316]/20"
              >
                Interview Invite
              </button>
            </div>
          </div>

          {error ? (
            <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p>
          ) : null}

          <button
            type="button"
            disabled={pending}
            onClick={() => {
              setError(null);
              startTransition(() => {
                void sendCandidateEmail({
                  to,
                  subject: 'Update on your application at Oxyile',
                  message,
                  applicationId,
                }).then((result) => {
                  if (!result?.success) {
                    setError(result?.message || 'Send failed');
                    return;
                  }
                  onSent();
                }).catch((err: unknown) => {
                  setError(err instanceof Error ? err.message : 'Send failed');
                });
              });
            }}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#F97316] py-3 text-sm font-bold text-white hover:bg-orange-600 disabled:opacity-60"
          >
            {pending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            Send Email
          </button>
        </div>
      </div>
    </div>
  );
}
