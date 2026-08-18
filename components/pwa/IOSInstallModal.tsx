'use client';

type IOSInstallModalProps = {
  open: boolean;
  onClose: () => void;
};

function ShareIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 text-[#F97316]" aria-hidden="true">
      <path
        d="M12 15V4m0 0l-3 3m3-3l3 3M6 10v8h12v-8"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function AddIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 text-[#F97316]" aria-hidden="true">
      <path
        d="M12 7v10M7 12h10M5 4h14a1 1 0 011 1v14a1 1 0 01-1 1H5a1 1 0 01-1-1V5a1 1 0 011-1z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IOSInstallModal({ open, onClose }: IOSInstallModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-black/65 p-0 sm:items-center sm:p-4">
      <div className="w-full max-w-md rounded-t-3xl border border-[#F97316]/30 bg-black p-5 shadow-2xl sm:rounded-3xl">
        <p className="text-xs font-black uppercase tracking-[0.24em] text-[#F97316]">Install Oxyile App</p>
        <h3 className="mt-2 text-lg font-black text-white">To install this web app on your iPhone/iPad:</h3>

        <ol className="mt-4 space-y-3 text-sm text-neutral-300">
          <li className="flex items-start gap-2 rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2.5">
            <ShareIcon />
            <span>Tap the Share button at the bottom of your screen.</span>
          </li>
          <li className="flex items-start gap-2 rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2.5">
            <AddIcon />
            <span>Scroll down and tap Add to Home Screen.</span>
          </li>
        </ol>

        <button
          type="button"
          onClick={onClose}
          className="mt-5 w-full rounded-full bg-[#F97316] py-2.5 text-sm font-bold text-black hover:bg-orange-500"
        >
          Got it
        </button>
      </div>
    </div>
  );
}
