'use client';

import { useMemo, useState } from 'react';
import { SEO_GUIDE_FEATURES } from '@/lib/seo/advanced-tools';
import { cn } from '@/lib/utils';

export function BloggerSeoGuidePage() {
  const groups = useMemo(() => {
    const map = new Map<string, typeof SEO_GUIDE_FEATURES>();
    for (const feature of SEO_GUIDE_FEATURES) {
      const list = map.get(feature.group) ?? [];
      list.push(feature);
      map.set(feature.group, list);
    }
    return [...map.entries()];
  }, []);

  const [openId, setOpenId] = useState<string>(SEO_GUIDE_FEATURES[0]?.id ?? '');

  return (
    <section className="space-y-6 pb-24">
      <div className="glass-card rounded-[1.75rem] p-6">
        <p className="text-xs font-bold uppercase tracking-[0.28em] text-brand-500">Playbook</p>
        <h2 className="mt-2 text-3xl font-black text-neutral-950 dark:text-white">
          Blogger & Newsletter SEO Guide
        </h2>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-neutral-600 dark:text-neutral-300">
          Every ranking tool in Editorial Studio — what it is, where to find it, how to use it, and why it
          helps Oxyile content win UK FinTech search.
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
                    onClick={() => setOpenId(open ? '' : feature.id)}
                    className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
                  >
                    <span className="font-semibold text-neutral-950 dark:text-white">{feature.name}</span>
                    <span className={cn('text-brand-500 transition', open && 'rotate-45')}>+</span>
                  </button>
                  {open ? (
                    <div className="space-y-3 border-t border-white/20 px-5 py-4 text-sm dark:border-white/10">
                      <p>
                        <span className="font-bold text-brand-600">What it is: </span>
                        {feature.what}
                      </p>
                      <p>
                        <span className="font-bold text-brand-600">Where to find it: </span>
                        {feature.where}
                      </p>
                      <p>
                        <span className="font-bold text-brand-600">How to use it: </span>
                        {feature.how}
                      </p>
                      <p>
                        <span className="font-bold text-brand-600">Benefit: </span>
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
