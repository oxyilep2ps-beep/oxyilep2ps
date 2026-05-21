'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Loader2, X } from 'lucide-react';

interface RejectReasonDialogProps {
  open: boolean;
  reason: string;
  isSubmitting: boolean;
  onReasonChange: (value: string) => void;
  onClose: () => void;
  onConfirm: () => void;
}

export function RejectReasonDialog({
  open,
  reason,
  isSubmitting,
  onReasonChange,
  onClose,
  onConfirm,
}: RejectReasonDialogProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[90] grid place-items-center bg-black/80 p-4 backdrop-blur-md"
        >
          <motion.div
            initial={{ scale: 0.96, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.96, y: 20 }}
            transition={{ type: 'spring', stiffness: 220, damping: 24 }}
            className="w-full max-w-2xl rounded-[2rem] border border-white/10 bg-[#080808] p-5 text-white shadow-[0_24px_80px_rgba(0,0,0,0.55)] sm:p-6"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-brand-500">Reject applicant</p>
                <h3 className="mt-2 text-2xl font-black">Reason for rejection</h3>
                <p className="mt-2 text-sm text-white/65">
                  Add a concise explanation. This will be included in the rejection email.
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-full border border-white/10 bg-white/5 p-2 text-white/80 transition hover:bg-white/10 hover:text-white"
                aria-label="Close rejection dialog"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-5 rounded-[1.5rem] border border-white/10 bg-white/5 p-4">
              <textarea
                value={reason}
                onChange={(event) => onReasonChange(event.target.value)}
                rows={6}
                placeholder="Enter the rejection reason here..."
                className="w-full resize-none bg-transparent text-sm text-white outline-none placeholder:text-white/35"
              />
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-white/80 transition hover:bg-white/10 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onConfirm}
                disabled={isSubmitting}
                className="inline-flex items-center gap-2 rounded-full bg-brand-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : null}
                Confirm rejection
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
