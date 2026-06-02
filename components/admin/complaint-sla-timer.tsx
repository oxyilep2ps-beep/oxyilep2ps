'use client';

import { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';

function formatCountdown(ms: number): string {
  if (ms <= 0) return 'SLA EXPIRED';
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return `${h}h ${m}m ${s}s`;
}

export function ComplaintSlaTimer({
  slaDeadline,
  createdAt,
}: {
  slaDeadline: string | null;
  createdAt: string;
}) {
  const deadline = slaDeadline ?? new Date(new Date(createdAt).getTime() + 24 * 3600000).toISOString();
  const [remaining, setRemaining] = useState(() => new Date(deadline).getTime() - Date.now());

  useEffect(() => {
    const tick = () => setRemaining(new Date(deadline).getTime() - Date.now());
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [deadline]);

  const expired = remaining <= 0;
  const urgent = !expired && remaining < 2 * 3600000;

  return (
    <div
      className={`mt-2 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${
        expired
          ? 'bg-red-600 text-white'
          : urgent
            ? 'animate-pulse bg-orange-500/20 text-orange-800 dark:text-orange-200'
            : 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-200'
      }`}
    >
      <Clock size={12} />
      {formatCountdown(remaining)}
    </div>
  );
}
