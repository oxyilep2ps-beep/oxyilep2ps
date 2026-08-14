'use client';

import { useEffect, useState } from 'react';
import { Brain, Database, FileSpreadsheet, Layers, Sparkles } from 'lucide-react';
import { getSimulationDatasetStats, listAiTrainingDatasets } from '@/app/actions/ai-datasets';
import type { DatasetRegistryEntry } from '@/lib/simulation/dataset-registry';
import { cn } from '@/lib/utils';

function statusBadge(status: DatasetRegistryEntry['status']) {
  switch (status) {
    case 'active_in_simulation':
      return { label: 'Active in Simulation', className: 'bg-emerald-500/15 text-emerald-400 ring-emerald-500/30' };
    case 'training_ai_model':
      return { label: 'Training AI Model', className: 'bg-orange-500/15 text-orange-400 ring-orange-500/30' };
    case 'discarded':
      return { label: 'Discarded', className: 'bg-neutral-800 text-neutral-500 ring-neutral-700' };
    case 'conversion_error':
      return { label: 'Conversion Error', className: 'bg-red-500/15 text-red-400 ring-red-500/30' };
    default:
      return { label: 'Pending Review', className: 'bg-neutral-800 text-neutral-400 ring-neutral-700' };
  }
}

export function AdminAiTrainingDatasets() {
  const [datasets, setDatasets] = useState<DatasetRegistryEntry[]>([]);
  const [stats, setStats] = useState({ active: 0, training: 0, discarded: 0, totalRows: 0 });
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [source, setSource] = useState<'supabase' | 'manifest'>('manifest');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        const [list, s] = await Promise.all([listAiTrainingDatasets(), getSimulationDatasetStats()]);
        setDatasets(list.datasets);
        setGeneratedAt(list.generatedAt);
        setSource(list.source);
        setStats(s);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      {/* LinkedIn-style professional header — left-aligned, structured sections */}
      <div className="border-b border-neutral-800 bg-black">
        <div className="h-28 bg-gradient-to-r from-neutral-900 via-[#1a1208] to-neutral-900 sm:h-32" />
        <div className="mx-auto max-w-5xl px-4 pb-6 sm:px-6">
          <div className="-mt-10 flex flex-col gap-4 sm:-mt-12 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex items-end gap-4">
              <div className="flex h-20 w-20 items-center justify-center rounded-xl border-4 border-black bg-neutral-900 shadow-xl ring-1 ring-orange-500/30 sm:h-24 sm:w-24">
                <Brain className="text-orange-500" size={36} />
              </div>
              <div className="pb-1 text-left">
                <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
                  AI Training &amp; Datasets
                </h1>
                <p className="mt-1 max-w-xl text-sm text-neutral-400">
                  Single-player bot simulation data pipeline · Oxyile Admin
                </p>
                <p className="mt-2 text-xs text-neutral-500">
                  {source === 'supabase' ? 'Live registry from Supabase' : 'Local manifest'}
                  {generatedAt ? ` · scanned ${new Date(generatedAt).toLocaleString('en-GB')}` : ''}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 sm:justify-end">
              <span className="rounded-full border border-neutral-700 bg-neutral-900/80 px-3 py-1.5 text-xs font-semibold text-neutral-300">
                {stats.active} active
              </span>
              <span className="rounded-full border border-orange-500/30 bg-orange-500/10 px-3 py-1.5 text-xs font-semibold text-orange-400">
                {stats.training} training
              </span>
              <span className="rounded-full border border-neutral-800 px-3 py-1.5 text-xs font-semibold text-neutral-500">
                {stats.discarded} discarded
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main feed — LinkedIn left-column layout */}
      <div className="mx-auto grid max-w-5xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[1fr_280px]">
        <section className="space-y-4">
          <div className="rounded-xl border border-neutral-800 bg-neutral-900/70 p-4 backdrop-blur-md">
            <div className="flex items-start gap-3 text-left">
              <Sparkles className="mt-0.5 shrink-0 text-orange-500" size={18} />
              <div>
                <p className="text-sm font-semibold text-white">Simulation architecture</p>
                <p className="mt-1 text-sm leading-relaxed text-neutral-400">
                  All ingested data powers a <strong className="font-semibold text-neutral-300">single-player bot</strong>{' '}
                  economy — credit NPCs, compliance checks, and macro stress. No multiplayer network logic.
                </p>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-10 text-center text-sm text-neutral-500">
              Scanning datasets…
            </div>
          ) : datasets.length === 0 ? (
            <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-10 text-left text-sm text-neutral-400">
              <p className="font-semibold text-white">No manifest found.</p>
              <p className="mt-2">
                Run <code className="rounded bg-black px-1.5 py-0.5 text-orange-400">npm run datasets:convert</code>{' '}
                to scan DATASETS/ and generate Excel + manifest.
              </p>
            </div>
          ) : (
            datasets.map((ds) => {
              const badge = statusBadge(ds.status);
              return (
                <article
                  key={ds.slug}
                  className="rounded-xl border border-neutral-800 bg-neutral-900/70 p-5 text-left backdrop-blur-md transition hover:border-orange-500/20"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-base font-bold text-white">{ds.displayName}</h2>
                        <span
                          className={cn(
                            'inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ring-1',
                            badge.className
                          )}
                        >
                          {badge.label}
                        </span>
                      </div>
                      <p className="mt-1 font-mono text-xs text-neutral-500">{ds.sourceFile}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-black text-orange-400">{ds.rowCount.toLocaleString()}</p>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">rows</p>
                    </div>
                  </div>

                  <p className="mt-4 text-sm leading-relaxed text-neutral-300">{ds.featureMapping}</p>

                  <div className="mt-4 flex flex-wrap gap-3 border-t border-neutral-800 pt-4 text-xs text-neutral-500">
                    {ds.supabaseTable ? (
                      <span className="inline-flex items-center gap-1.5">
                        <Database size={12} className="text-orange-500" />
                        <span className="font-mono text-neutral-400">{ds.supabaseTable}</span>
                      </span>
                    ) : null}
                    {ds.excelFile ? (
                      <span className="inline-flex items-center gap-1.5">
                        <FileSpreadsheet size={12} className="text-orange-500" />
                        DATASETS_EXCEL/{ds.excelFile}
                      </span>
                    ) : null}
                    {ds.truncated ? (
                      <span className="text-amber-500/80">Excel truncated at 1M rows</span>
                    ) : null}
                    {ds.error ? <span className="text-red-400">{ds.error}</span> : null}
                  </div>
                </article>
              );
            })
          )}
        </section>

        {/* Right rail — LinkedIn-style sidebar cards */}
        <aside className="space-y-4">
          <div className="rounded-xl border border-neutral-800 bg-neutral-900/70 p-4 text-left backdrop-blur-md">
            <p className="text-xs font-bold uppercase tracking-wider text-neutral-500">Pipeline</p>
            <ol className="mt-3 space-y-2 text-sm text-neutral-400">
              <li className="flex gap-2">
                <span className="font-bold text-orange-500">1.</span> JSON → Excel convert
              </li>
              <li className="flex gap-2">
                <span className="font-bold text-orange-500">2.</span> Curate simulation tables
              </li>
              <li className="flex gap-2">
                <span className="font-bold text-orange-500">3.</span> Seed Supabase samples
              </li>
            </ol>
          </div>
          <div className="rounded-xl border border-neutral-800 bg-neutral-900/70 p-4 text-left backdrop-blur-md">
            <div className="flex items-center gap-2">
              <Layers size={14} className="text-orange-500" />
              <p className="text-xs font-bold uppercase tracking-wider text-neutral-500">Totals</p>
            </div>
            <p className="mt-2 text-2xl font-black text-white">{stats.totalRows.toLocaleString()}</p>
            <p className="text-xs text-neutral-500">rows across scanned files</p>
          </div>
          <div className="rounded-xl border border-neutral-800 bg-neutral-900/70 p-4 text-left text-xs text-neutral-500 backdrop-blur-md">
            <p className="font-semibold text-neutral-300">Commands</p>
            <p className="mt-2 font-mono text-[11px] text-orange-400/90">npm run datasets:convert</p>
            <p className="mt-1 font-mono text-[11px] text-orange-400/90">npm run datasets:seed</p>
          </div>
        </aside>
      </div>
    </div>
  );
}
