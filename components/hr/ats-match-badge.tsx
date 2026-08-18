import { cn } from '@/lib/utils';

export function AtsMatchBadge({
  score,
  size = 'md',
}: {
  score: number | null | undefined;
  size?: 'sm' | 'md';
}) {
  const n = Math.round(Math.max(0, Math.min(100, Number(score) || 0)));
  const tone =
    n >= 75
      ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300'
      : n >= 50
        ? 'border-[#F97316]/45 bg-[#F97316]/15 text-[#F97316]'
        : 'border-gray-200 bg-gray-100 text-gray-600 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-400';

  return (
    <span
      title="ATS match of resume text vs job description and match keywords"
      className={cn(
        'inline-flex items-center rounded-full border font-black uppercase tracking-wide',
        size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-[11px]',
        tone
      )}
    >
      ATS {n}%
    </span>
  );
}
