'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { getSocialOverviewMetrics, listSocialCampaigns } from '@/app/actions/social-campaigns';
import type { SocialCampaignRow, SocialOverviewMetrics } from '@/lib/social/types';
import { cn } from '@/lib/utils';

function statusLabel(status: string) {
  return status.replace(/_/g, ' ');
}

export function SocialOverviewClient() {
  const [metrics, setMetrics] = useState<SocialOverviewMetrics | null>(null);
  const [rows, setRows] = useState<SocialCampaignRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [m, list] = await Promise.all([getSocialOverviewMetrics(), listSocialCampaigns()]);
      setMetrics(m);
      setRows(list.slice(0, 12));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const cards = [
    { label: 'Active Campaigns', value: metrics?.activeCampaigns ?? '—' },
    { label: 'Pending Admin Approval', value: metrics?.pendingApproval ?? '—' },
    { label: 'Published This Month', value: metrics?.publishedThisMonth ?? '—' },
    {
      label: 'Webhook Syndication Ready',
      value:
        metrics?.webhookSuccessRate == null ? 'Pending Setup' : `${metrics.webhookSuccessRate}%`,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <div
            key={card.label}
            className="rounded-2xl border border-neutral-800 bg-neutral-900/70 p-4 shadow-2xl shadow-black/30 backdrop-blur-md"
          >
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-neutral-500">
              {card.label}
            </p>
            <p className="mt-2 text-2xl font-black text-white">{loading ? '…' : card.value}</p>
          </div>
        ))}
      </div>

      <section className="rounded-2xl border border-neutral-800 bg-neutral-900/70 p-5 shadow-2xl shadow-black/30 backdrop-blur-md">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-orange-500">
              Live Queue
            </p>
            <h2 className="mt-1 text-lg font-black text-white">Recent & scheduled campaigns</h2>
          </div>
          <Link
            href="/social/studio?new=1"
            className="rounded-full bg-orange-500 px-4 py-2 text-xs font-bold text-white hover:bg-orange-600"
          >
            + Create Campaign
          </Link>
        </div>

        {loading ? (
          <div className="mt-4 space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-12 animate-pulse rounded-xl bg-neutral-800/60" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <div className="mt-4 rounded-xl border border-neutral-800/60 bg-[#0A0A0A] px-4 py-10 text-center text-sm text-neutral-400">
            No campaigns yet. Open Social Studio to craft your first post.
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[36rem] text-left text-sm">
              <thead>
                <tr className="border-b border-neutral-800 text-[10px] uppercase tracking-wider text-neutral-500">
                  <th className="pb-2 pr-3 font-bold">Campaign</th>
                  <th className="pb-2 pr-3 font-bold">Status</th>
                  <th className="pb-2 pr-3 font-bold">Channels</th>
                  <th className="pb-2 font-bold">Updated</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-b border-neutral-800/60 text-neutral-300">
                    <td className="py-3 pr-3">
                      <p className="font-semibold text-white">{row.campaign_name}</p>
                      <p className="text-xs text-neutral-500">{row.title}</p>
                    </td>
                    <td className="py-3 pr-3">
                      <span
                        className={cn(
                          'rounded-full px-2 py-0.5 text-[10px] font-bold uppercase',
                          row.status === 'pending_approval' && 'bg-orange-500/15 text-orange-400',
                          row.status === 'published' && 'bg-emerald-500/15 text-emerald-400',
                          row.status === 'rejected' && 'bg-red-500/15 text-red-400',
                          row.status === 'draft' && 'bg-neutral-800 text-neutral-400'
                        )}
                      >
                        {statusLabel(row.status)}
                      </span>
                    </td>
                    <td className="py-3 pr-3 text-xs">
                      {[row.channels.linkedin && 'LinkedIn', row.channels.instagram && 'Instagram']
                        .filter(Boolean)
                        .join(' · ') || '—'}
                    </td>
                    <td className="py-3 text-xs text-neutral-500">
                      {new Date(row.updated_at).toLocaleString('en-GB')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
