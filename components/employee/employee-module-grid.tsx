'use client';

import { useTransition } from 'react';
import { logEmployeeModuleEvent } from '@/app/actions/employee-portal';
import { EMPLOYEE_ENTERPRISE_MODULES } from '@/lib/employee/types';
import { cn } from '@/lib/utils';

export function EmployeeModuleGrid({ group }: { group?: string }) {
  const [pending, startTransition] = useTransition();
  const modules = group
    ? EMPLOYEE_ENTERPRISE_MODULES.filter((m) => m.group === group)
    : EMPLOYEE_ENTERPRISE_MODULES;

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {modules.map((m) => (
        <button
          key={m.key}
          type="button"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              await logEmployeeModuleEvent(m.key, { opened_at: new Date().toISOString() });
            })
          }
          className={cn(
            'rounded-2xl border border-neutral-800 bg-neutral-900/70 p-4 text-left backdrop-blur transition hover:border-orange-500/40'
          )}
        >
          <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">{m.group}</p>
          <p className="mt-1 text-sm font-bold text-white">{m.title}</p>
          <p className="mt-1 text-xs text-neutral-400">{m.blurb}</p>
          <p className="mt-3 text-[10px] font-semibold text-orange-500">Coming soon · tap to log interest</p>
        </button>
      ))}
    </div>
  );
}
