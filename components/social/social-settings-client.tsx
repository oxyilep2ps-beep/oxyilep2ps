'use client';

import { useEffect, useState } from 'react';
import { getSocialWebhookHealth } from '@/app/actions/social-campaigns';
import type { WebhookHealth } from '@/lib/social/types';
import { cn } from '@/lib/utils';

function StatusPill({ status }: { status: 'connected' | 'pending' }) {
  return (
    <span
      className={cn(
        'rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider',
        status === 'connected'
          ? 'bg-emerald-500/15 text-emerald-400'
          : 'bg-orange-500/15 text-orange-400'
      )}
    >
      {status === 'connected' ? 'Connected ✅' : 'Pending Setup'}
    </span>
  );
}

export function SocialSettingsClient() {
  const [health, setHealth] = useState<WebhookHealth | null>(null);

  useEffect(() => {
    void getSocialWebhookHealth().then(setHealth).catch(() => setHealth(null));
  }, []);

  const rows = [
    { label: 'LinkedIn Make.com webhook', key: 'linkedin' as const },
    { label: 'Instagram Make.com webhook', key: 'instagram' as const },
    { label: 'Canva Brand Studio', key: 'canva' as const },
  ];

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-neutral-800 bg-neutral-900/70 p-5 shadow-2xl shadow-black/30 backdrop-blur-md">
        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-orange-500">
          Integrations
        </p>
        <h2 className="mt-1 text-lg font-black text-white">Webhook connection health</h2>
        <p className="mt-1 text-sm text-neutral-400">
          Status is derived from server environment configuration. Live posts only fire after Admin
          Approve & Publish.
        </p>

        <ul className="mt-5 space-y-3">
          {rows.map((row) => (
            <li
              key={row.key}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-neutral-800 bg-[#0A0A0A] px-4 py-3"
            >
              <span className="text-sm font-semibold text-white">{row.label}</span>
              {health ? <StatusPill status={health[row.key]} /> : <span className="text-xs text-neutral-500">…</span>}
            </li>
          ))}
        </ul>

        {health?.canvaUrl ? (
          <a
            href={health.canvaUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-4 inline-flex rounded-full border border-orange-500/40 bg-orange-500/10 px-4 py-2 text-xs font-bold text-orange-400 hover:border-orange-500/60"
          >
            Open Canva Brand Studio
          </a>
        ) : null}
      </section>
    </div>
  );
}
