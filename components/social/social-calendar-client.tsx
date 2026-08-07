'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { listSocialCampaigns } from '@/app/actions/social-campaigns';
import type { SocialCampaignRow } from '@/lib/social/types';
import { cn } from '@/lib/utils';

type Filter = 'all' | 'draft' | 'pending_approval' | 'published' | 'rejected';

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'draft', label: 'Drafts' },
  { id: 'pending_approval', label: 'Pending Approval' },
  { id: 'published', label: 'Approved / Published' },
  { id: 'rejected', label: 'Rejected' },
];

export function SocialCalendarClient() {
  const [rows, setRows] = useState<SocialCampaignRow[]>([]);
  const [filter, setFilter] = useState<Filter>('all');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await listSocialCampaigns());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    if (filter === 'all') return rows;
    if (filter === 'published') {
      return rows.filter((r) => r.status === 'published' || r.status === 'approved');
    }
    return rows.filter((r) => r.status === filter);
  }, [rows, filter]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className={cn(
              'rounded-full border px-3 py-1.5 text-xs font-bold transition',
              filter === f.id
                ? 'border-orange-500/50 bg-orange-500/15 text-orange-500'
                : 'border-neutral-800 text-neutral-400 hover:border-orange-500/40 hover:bg-neutral-800/60'
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl bg-neutral-900/60" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-neutral-800/60 bg-[#0A0A0A] px-6 py-16 text-center text-sm text-neutral-400">
          No campaigns in this lane.
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((row) => (
            <article
              key={row.id}
              className="rounded-2xl border border-neutral-800 bg-neutral-900/70 p-4 backdrop-blur-md"
            >
              {row.status === 'rejected' ? (
                <div className="mb-3 flex items-start gap-2 rounded-xl border border-orange-500/40 bg-orange-500/10 px-3 py-2 text-sm text-orange-100">
                  <AlertTriangle className="mt-0.5 shrink-0 text-orange-400" size={16} />
                  <p>
                    <span className="font-bold">Rejected:</span>{' '}
                    {row.rejection_reason?.trim() || 'Admin feedback not provided.'}
                  </p>
                </div>
              ) : null}
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-black text-white">{row.campaign_name}</p>
                  <p className="mt-0.5 text-xs text-neutral-400">{row.title}</p>
                  <p className="mt-2 line-clamp-2 text-sm text-neutral-300">{row.caption}</p>
                </div>
                <span className="rounded-full bg-neutral-800 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-neutral-300">
                  {row.status.replace(/_/g, ' ')}
                </span>
              </div>
              <p className="mt-3 text-[11px] text-neutral-500">
                {[row.channels.linkedin && 'LinkedIn', row.channels.instagram && 'Instagram']
                  .filter(Boolean)
                  .join(' · ')}
                {' · '}
                Updated {new Date(row.updated_at).toLocaleString('en-GB')}
                {row.scheduled_for
                  ? ` · Scheduled ${new Date(row.scheduled_for).toLocaleString('en-GB')}`
                  : ''}
              </p>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
