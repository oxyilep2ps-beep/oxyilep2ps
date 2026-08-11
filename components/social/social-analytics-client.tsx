'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowUpRight, BarChart3, Flame, Users } from 'lucide-react';
import { Area, AreaChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import {
  getSocialAnalyticsTrend,
  getSocialOverviewMetrics,
  getTopPerformingContent,
} from '@/app/actions/social-campaigns';
import type {
  SocialOverviewMetrics,
  SocialTrendPoint,
  TopPerformingContentRow,
} from '@/lib/social/types';
import { cn } from '@/lib/utils';

function mediaLabel(format: TopPerformingContentRow['format']) {
  if (format === 'reel') return 'Reel';
  if (format === 'story') return 'Story';
  return 'Post';
}

export function SocialAnalyticsClient() {
  const [metrics, setMetrics] = useState<SocialOverviewMetrics | null>(null);
  const [trend, setTrend] = useState<SocialTrendPoint[]>([]);
  const [topContent, setTopContent] = useState<TopPerformingContentRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [m, t, top] = await Promise.all([
        getSocialOverviewMetrics(),
        getSocialAnalyticsTrend(),
        getTopPerformingContent(),
      ]);
      setMetrics(m);
      setTrend(t);
      setTopContent(top);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const kpis = useMemo(
    () => [
      {
        label: 'Total Audience Reach',
        value: metrics?.totalAudienceReach ?? 0,
        icon: Users,
        helper: '+12.4% vs last week',
      },
      {
        label: 'Platform Traffic (Last 30 Days)',
        value: metrics?.platformTrafficLast30Days ?? 0,
        icon: BarChart3,
        helper: 'Visitors + blog reads',
      },
      {
        label: 'Average Engagement Rate',
        value: `${metrics?.averageEngagementRate ?? 0}%`,
        icon: ArrowUpRight,
        helper: 'Likes + comments / impressions',
      },
      {
        label: 'Active Campaigns',
        value: metrics?.activeCampaigns ?? 0,
        icon: Flame,
        helper: `${metrics?.pendingApproval ?? 0} pending approval`,
      },
    ],
    [metrics]
  );

  return (
    <div className="space-y-6">
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <article
              key={kpi.label}
              className="rounded-2xl border border-neutral-800 bg-neutral-900/70 p-4 shadow-2xl shadow-orange-500/5 backdrop-blur-md"
            >
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-orange-500">
                  {kpi.label}
                </p>
                <Icon className="text-orange-500" size={16} />
              </div>
              <p className="mt-2 text-2xl font-black text-white">{loading ? '…' : kpi.value}</p>
              <p className="mt-1 text-xs text-emerald-400">{kpi.helper}</p>
            </article>
          );
        })}
      </section>

      <section className="rounded-2xl border border-neutral-800 bg-neutral-900/70 p-5 shadow-2xl shadow-black/30 backdrop-blur-md">
        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-orange-500">Performance</p>
        <h2 className="mt-1 text-lg font-black text-white">Reach vs Website Clicks (Last 7 Days)</h2>
        <div className="mt-4 h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trend}>
              <XAxis dataKey="date" stroke="#737373" tickLine={false} axisLine={false} />
              <YAxis stroke="#737373" tickLine={false} axisLine={false} />
              <Tooltip
                cursor={{ stroke: '#F97316', strokeOpacity: 0.2 }}
                contentStyle={{
                  background: '#0A0A0A',
                  border: '1px solid #262626',
                  borderRadius: '12px',
                  color: '#fff',
                }}
              />
              <defs>
                <linearGradient id="reachGlow" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#F97316" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="#F97316" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="reach"
                stroke="#F97316"
                fill="url(#reachGlow)"
                strokeWidth={3}
                dot={false}
                activeDot={{ r: 4, fill: '#F97316' }}
                animationDuration={900}
              />
              <Line
                type="monotone"
                dataKey="websiteClicks"
                stroke="#FFFFFF"
                strokeWidth={2}
                dot={false}
                animationDuration={1000}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="rounded-2xl border border-neutral-800 bg-neutral-900/70 p-5 shadow-2xl shadow-black/30 backdrop-blur-md">
        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-orange-500">
          Top Performing Content
        </p>
        <h2 className="mt-1 text-lg font-black text-white">Published Campaign Rankings</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[44rem] text-left text-sm">
            <thead>
              <tr className="border-b border-neutral-800 text-[10px] uppercase tracking-wider text-neutral-500">
                <th className="pb-2 pr-3 font-bold">Campaign</th>
                <th className="pb-2 pr-3 font-bold">Format</th>
                <th className="pb-2 pr-3 font-bold">Likes</th>
                <th className="pb-2 pr-3 font-bold">Comments</th>
                <th className="pb-2 pr-3 font-bold">Clicks</th>
                <th className="pb-2 pr-3 font-bold">Impressions</th>
                <th className="pb-2 font-bold">Publish Date</th>
              </tr>
            </thead>
            <tbody>
              {topContent.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-sm text-neutral-400">
                    No published analytics data yet.
                  </td>
                </tr>
              ) : (
                topContent.map((row) => (
                  <tr key={row.id} className="border-b border-neutral-800/60 text-neutral-300">
                    <td className="py-3 pr-3 font-semibold text-white">{row.campaign}</td>
                    <td className="py-3 pr-3">
                      <span
                        className={cn(
                          'rounded-full px-2 py-0.5 text-[10px] font-bold uppercase',
                          row.format === 'reel' && 'bg-purple-500/20 text-purple-300',
                          row.format === 'story' && 'bg-orange-500/20 text-orange-300',
                          row.format === 'post' && 'bg-blue-500/20 text-blue-300'
                        )}
                      >
                        {mediaLabel(row.format)}
                      </span>
                    </td>
                    <td className="py-3 pr-3">{row.likes}</td>
                    <td className="py-3 pr-3">{row.comments}</td>
                    <td className="py-3 pr-3">{row.clicks}</td>
                    <td className="py-3 pr-3">{row.impressions}</td>
                    <td className="py-3 text-xs text-neutral-500">
                      {new Date(row.publishDate).toLocaleDateString('en-GB')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
