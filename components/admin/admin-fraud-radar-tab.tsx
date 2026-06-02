'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2, ShieldCheck, ShieldOff } from 'lucide-react';
import {
  blockFlaggedUser,
  clearKycFlag,
  listFlaggedProfiles,
  type FlaggedProfileRow,
} from '@/app/actions/admin-fraud';

export function AdminFraudRadarTab() {
  const [rows, setRows] = useState<FlaggedProfileRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await listFlaggedProfiles());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load fraud radar');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleClear = async (id: string) => {
    setBusyId(id);
    try {
      await clearKycFlag(id);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Clear failed');
    } finally {
      setBusyId(null);
    }
  };

  const handleBlock = async (id: string) => {
    setBusyId(id);
    try {
      await blockFlaggedUser(id);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Block failed');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6 pb-28">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.28em] text-brand-500">Sentinel</p>
        <h2 className="text-xl font-black text-neutral-950 dark:text-white">Fraud Radar</h2>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">
          Users flagged for suspicious KYC activity, failed FCA retries, or overlapping risk signals.
        </p>
      </div>

      {error && <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="animate-spin text-brand-500" size={28} />
        </div>
      ) : rows.length === 0 ? (
        <div className="glass-card rounded-2xl p-8 text-center text-sm text-neutral-500">
          No flagged users. KYC sentinel is clear.
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((row) => (
            <article key={row.id} className="glass-card rounded-2xl p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-bold text-neutral-950 dark:text-white">{row.full_legal_name}</p>
                  <p className="text-sm text-neutral-500">{row.email}</p>
                  <p className="mt-1 text-xs capitalize text-neutral-400">
                    {row.role.toLowerCase()} · {row.status} · Flagged
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={busyId === row.id}
                    onClick={() => void handleClear(row.id)}
                    className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50"
                  >
                    <ShieldCheck size={13} />
                    Clear
                  </button>
                  <button
                    type="button"
                    disabled={busyId === row.id}
                    onClick={() => void handleBlock(row.id)}
                    className="inline-flex items-center gap-1 rounded-full bg-red-600 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50"
                  >
                    <ShieldOff size={13} />
                    Block
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
