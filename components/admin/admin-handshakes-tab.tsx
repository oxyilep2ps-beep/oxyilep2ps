'use client';

import { useCallback, useEffect, useState } from 'react';
import { ExternalLink, FileSignature, Loader2 } from 'lucide-react';
import { listAdminHandshakes, markHandshakePaid, type AdminHandshakeRow } from '@/app/actions/admin-handshakes';

function polygonAmoyTxUrl(hash: string | null): string | null {
  if (!hash || hash.startsWith('sandbox_')) return null;
  return `https://amoy.polygonscan.com/tx/${hash}`;
}

export function AdminHandshakesTab() {
  const [rows, setRows] = useState<AdminHandshakeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await listAdminHandshakes());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const markPaid = async (id: string) => {
    setBusyId(id);
    try {
      await markHandshakePaid(id);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Update failed');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-black text-neutral-950 dark:text-white">Active Contracts</h2>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">
          Mark fiat as PAID after GoCardless clears — EMI schedule uses stored emi_amount.
        </p>
      </div>

      {error && <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="animate-spin text-brand-500" size={28} />
        </div>
      ) : rows.length === 0 ? (
        <div className="glass-card rounded-2xl p-8 text-center">
          <FileSignature className="mx-auto text-brand-500" size={36} />
          <p className="mt-3 text-sm text-neutral-500">No contracts yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((row) => {
            const txUrl = polygonAmoyTxUrl(row.polygon_tx_hash);
            const months = row.duration;
            const emi = row.emi_amount ?? 0;
            return (
              <article key={row.id} className="glass-card rounded-2xl p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-bold text-neutral-950 dark:text-white">
                      {row.lender_name} → {row.borrower_name}
                    </p>
                    <p className="mt-1 text-sm text-neutral-600">
                      £{row.amount.toLocaleString('en-GB')} · {row.rate}% · {row.duration} mo
                    </p>
                    <p className="mt-1 text-xs text-neutral-500">
                      EMI £{emi.toFixed(2)}/mo · Total £{(row.total_return ?? emi * months).toLocaleString('en-GB')}
                    </p>
                  </div>
                  <span className="rounded-full bg-amber-500/15 px-3 py-1 text-xs font-bold text-amber-800 dark:text-amber-200">
                    {row.contract_label}
                  </span>
                </div>

                {row.status === 'ACTIVE' && row.payment_status === 'PAID' && emi > 0 && (
                  <div className="mt-3 rounded-xl bg-brand-500/5 p-3 text-xs">
                    <p className="font-bold text-brand-700 dark:text-brand-300">EMI schedule (preview)</p>
                    <ul className="mt-2 grid grid-cols-2 gap-1 sm:grid-cols-4">
                      {Array.from({ length: Math.min(months, 12) }, (_, i) => (
                        <li key={i} className="text-neutral-600">
                          M{i + 1}: £{emi.toFixed(2)}
                        </li>
                      ))}
                      {months > 12 && <li className="text-neutral-500">+{months - 12} more…</li>}
                    </ul>
                  </div>
                )}

                <div className="mt-3 flex flex-wrap items-center gap-3">
                  {txUrl && (
                    <a
                      href={txUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600"
                    >
                      Polygon Amoy <ExternalLink size={12} />
                    </a>
                  )}
                  {row.status === 'ACTIVE' && row.payment_status === 'PENDING' && (
                    <button
                      type="button"
                      disabled={busyId === row.id}
                      onClick={() => markPaid(row.id)}
                      className="rounded-full bg-emerald-600 px-4 py-1.5 text-xs font-bold text-white disabled:opacity-50"
                    >
                      {busyId === row.id ? 'Updating…' : 'Mark fiat PAID'}
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
