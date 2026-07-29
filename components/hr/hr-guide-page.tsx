'use client';

import { useMemo, useState } from 'react';
import { HR_GUIDE_FEATURES } from '@/lib/hr/guide';
import { cn } from '@/lib/utils';

export function HrGuidePage() {
  const groups = useMemo(() => {
    const map = new Map<string, typeof HR_GUIDE_FEATURES>();
    for (const f of HR_GUIDE_FEATURES) {
      const list = map.get(f.group) ?? [];
      list.push(f);
      map.set(f.group, list);
    }
    return [...map.entries()];
  }, []);
  const [openId, setOpenId] = useState<number>(1);

  return (
    <section className="cms-fade-in space-y-6 pb-8">
      <div className="glass-card rounded-[1.75rem] p-6">
        <p className="text-xs font-bold uppercase tracking-[0.28em] text-brand-500">Playbook</p>
        <h2 className="mt-2 text-3xl font-black text-neutral-950 dark:text-white">HR Studio Guide</h2>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-neutral-600 dark:text-neutral-300">
          All 40 enterprise HRMS & ATS features for Oxyile — where to find them, how to use them, and why they
          matter for UK FinTech regulation and efficiency. Currency throughout is £ GBP.
        </p>
      </div>

      {groups.map(([group, features]) => (
        <div key={group} className="space-y-3">
          <h3 className="text-sm font-black uppercase tracking-[0.2em] text-brand-500">{group}</h3>
          <div className="space-y-2">
            {features.map((feature) => {
              const open = openId === feature.id;
              return (
                <article key={feature.id} className="glass-card overflow-hidden rounded-2xl">
                  <button
                    type="button"
                    onClick={() => setOpenId(open ? 0 : feature.id)}
                    className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
                  >
                    <span className="font-semibold text-neutral-950 dark:text-white">
                      {feature.id}. {feature.name}
                    </span>
                    <span className={cn('text-brand-500 transition', open && 'rotate-45')}>+</span>
                  </button>
                  {open ? (
                    <div className="space-y-3 border-t border-white/20 px-5 py-4 text-sm dark:border-white/10">
                      <p>
                        <span className="font-bold text-brand-600">Purpose: </span>
                        {feature.purpose}
                      </p>
                      <p>
                        <span className="font-bold text-brand-600">Where: </span>
                        {feature.where}
                      </p>
                      <p>
                        <span className="font-bold text-brand-600">How to use: </span>
                        {feature.steps}
                      </p>
                      <p>
                        <span className="font-bold text-brand-600">UK FinTech benefit: </span>
                        {feature.benefit}
                      </p>
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        </div>
      ))}
    </section>
  );
}
