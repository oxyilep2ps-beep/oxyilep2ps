'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, Loader2, ShieldAlert, Star, X } from 'lucide-react';
import { checkEligibilityForInvestorUpgrade } from '@/app/actions/financial-eligibility';
import { setActivePortalClient } from '@/lib/auth/financial-capabilities';
import { cn } from '@/lib/utils';

const INVESTOR_ONBOARDING_HREF = '/upgrade/investor';

type InvestorUpgradeButtonProps = {
  /** Already completed investor onboarding — button switches portal instead of KYC. */
  alreadyInvestor?: boolean;
  className?: string;
  label?: string;
  variant?: 'primary' | 'card';
};

export function InvestorRiskBlockModal({
  open,
  message,
  onClose,
}: {
  open: boolean;
  message: string;
  onClose: () => void;
}) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[140] grid place-items-center bg-black/70 px-4 backdrop-blur-sm"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="investor-risk-title"
        aria-describedby="investor-risk-body"
        className="w-full max-w-md overflow-hidden rounded-2xl border border-[#F97316]/40 bg-white shadow-2xl dark:bg-[#0a0a0a]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3 border-b border-[#F97316]/20 bg-[#F97316]/10 px-4 py-3.5">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#F97316]/20 text-[#F97316]">
            <ShieldAlert size={20} />
          </span>
          <div className="min-w-0 flex-1">
            <p id="investor-risk-title" className="text-sm font-black text-[#F97316]">
              Investor registration blocked
            </p>
            <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-wider text-[#F97316]/70">
              Risk management · anti-arbitrage
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-full p-1.5 text-neutral-500 transition hover:bg-[#F97316]/10 hover:text-[#F97316]"
          >
            <X size={16} />
          </button>
        </div>
        <div className="space-y-4 px-4 py-4">
          <div className="flex gap-2.5 rounded-xl border border-[#F97316]/25 bg-[#F97316]/5 p-3">
            <AlertTriangle size={16} className="mt-0.5 shrink-0 text-[#F97316]" />
            <p id="investor-risk-body" className="text-sm leading-relaxed text-neutral-700 dark:text-neutral-200">
              {message}
            </p>
          </div>
          <p className="text-xs leading-relaxed text-neutral-500 dark:text-neutral-400">
            Clear outstanding borrower obligations (repay or close active / pending handshakes), then try again.
            You can keep one account for both roles once eligibility is restored.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-full bg-[#F97316] py-2.5 text-sm font-bold text-white transition hover:bg-[#ea580c]"
          >
            Understood
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * "Become an Investor" / switch-to-investor control with server-side eligibility gate.
 */
export function InvestorUpgradeButton({
  alreadyInvestor = false,
  className,
  label,
  variant = 'primary',
}: InvestorUpgradeButtonProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [blockMessage, setBlockMessage] = useState<string | null>(null);

  const onClick = () => {
    startTransition(async () => {
      const result = await checkEligibilityForInvestorUpgrade();
      if (!result.allowed) {
        setBlockMessage(result.message);
        return;
      }

      if (alreadyInvestor) {
        setActivePortalClient('investor');
        router.push('/dashboard/investor');
        router.refresh();
        return;
      }

      router.push(INVESTOR_ONBOARDING_HREF);
    });
  };

  return (
    <>
      <button
        type="button"
        disabled={pending}
        onClick={onClick}
        className={cn(
          variant === 'card'
            ? 'flex w-full items-center gap-3 rounded-2xl border border-[#F97316]/35 bg-[#F97316]/10 px-4 py-3.5 text-left transition hover:bg-[#F97316]/15 disabled:opacity-60'
            : 'inline-flex items-center justify-center gap-2 rounded-full bg-[#F97316] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#ea580c] disabled:opacity-60',
          className
        )}
      >
        {pending ? (
          <Loader2 size={16} className="animate-spin" />
        ) : (
          <Star size={16} className={variant === 'card' ? 'text-[#F97316]' : undefined} />
        )}
        {variant === 'card' ? (
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-bold text-[#F97316]">
              {label ?? (alreadyInvestor ? 'Open Investor Portal' : 'Become an Investor')}
            </span>
            <span className="mt-0.5 block text-[11px] text-neutral-500 dark:text-neutral-400">
              {alreadyInvestor
                ? 'Switch portal — eligibility is re-checked for active loans'
                : 'Complete investor KYC on this same account (subject to risk checks)'}
            </span>
          </span>
        ) : (
          <span>{label ?? (alreadyInvestor ? 'Open Investor Portal' : 'Become an Investor')}</span>
        )}
      </button>

      <InvestorRiskBlockModal
        open={Boolean(blockMessage)}
        message={blockMessage ?? ''}
        onClose={() => setBlockMessage(null)}
      />
    </>
  );
}
