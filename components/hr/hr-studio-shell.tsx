import { HrBottomNav } from '@/components/hr/hr-bottom-nav';
import { HrJobEditorProvider } from '@/components/hr/hr-job-editor-provider';
import { Logo } from '@/components/logo';

export function HrStudioShell({
  children,
  subtitle,
}: {
  children: React.ReactNode;
  subtitle?: string;
}) {
  return (
    <div className="mx-auto min-h-screen max-w-7xl bg-black px-4 pb-28 pt-8 sm:px-6">
      <header className="mb-8 rounded-2xl border border-neutral-800 bg-neutral-950/90 p-5">
        <Logo size="sm" />
        <p className="mt-3 text-xs font-bold uppercase tracking-[0.28em] text-[#F97316]">HR Portal</p>
        <h1 className="mt-2 text-2xl font-black text-white">HR Studio</h1>
        <p className="mt-1 max-w-2xl text-sm text-neutral-400">
          {subtitle ??
            'Enterprise HRMS & ATS for UK FinTech — all money in £ GBP. Use the bottom bar to move between modules.'}
        </p>
      </header>
      <HrJobEditorProvider>
        {children}
        <HrBottomNav />
      </HrJobEditorProvider>
    </div>
  );
}
