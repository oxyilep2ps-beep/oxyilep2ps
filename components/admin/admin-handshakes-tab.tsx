'use client';

import { useCallback, useEffect, useState } from 'react';
import { ExternalLink, FileSignature, Loader2 } from 'lucide-react';
import { listAdminHandshakes, type AdminHandshakeRow } from '@/app/actions/admin-handshakes';

function polygonAmoyTxUrl(hash: string | null): string | null {
  if (!hash || hash.startsWith('sandbox_')) return null;
  return `https://amoy.polygonscan.com/tx/${hash}`;
}

export function AdminHandshakesTab() {
  const [rows, setRows] = useState<AdminHandshakeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await listAdminHandshakes();
      setRows(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load handshakes');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-black text-neutral-950 dark:text-white">Active Handshakes</h2>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">
          Loan contracts with on-chain verification on Polygon Amoy testnet.
        </p>
      </div>

      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
          {error}
        </p>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="animate-spin text-brand-500" size={28} />
        </div>
      ) : rows.length === 0 ? (
        <div className="glass-card rounded-2xl p-8 text-center">
          <FileSignature className="mx-auto text-brand-500" size={36} />
          <p className="mt-3 text-sm text-neutral-500">No handshake records yet.</p>
        </div>
      ) : (
        <div className="glass-card overflow-x-auto rounded-2xl">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-white/40 text-xs font-bold uppercase tracking-wider text-neutral-500 dark:border-white/10">
                <th className="px-4 py-3">Lender</th>
                <th className="px-4 py-3">Borrower</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Rate</th>
                <th className="px-4 py-3">Duration</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Polygon TX</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/30 dark:divide-white/10">
              {rows.map((row) => {
                const txUrl = polygonAmoyTxUrl(row.polygon_tx_hash);
                return (
                  <tr key={row.id} className="text-neutral-800 dark:text-neutral-200">
                    <td className="px-4 py-3 font-medium">{row.lender_name}</td>
                    <td className="px-4 py-3 font-medium">{row.borrower_name}</td>
                    <td className="px-4 py-3">£{row.amount.toLocaleString('en-GB')}</td>
                    <td className="px-4 py-3">{row.rate}%</td>
                    <td className="px-4 py-3">{row.duration} mo</td>
                    <td className="px-4 py-3">
                      <span
                        className={
                          row.status === 'ACTIVE'
                            ? 'rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-bold text-emerald-700 dark:text-emerald-300'
                            : 'rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-bold text-amber-700 dark:text-amber-300'
                        }
                      >
                        {row.status}
                      </span>
                    </td>
                    <td className="max-w-[220px] px-4 py-3">
                      {row.polygon_tx_hash ? (
                        txUrl ? (
                          <a
                            href={txUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 break-all text-xs font-semibold text-brand-600 hover:underline dark:text-brand-300"
                          >
                            View on Amoy
                            <ExternalLink size={12} />
                          </a>
                        ) : (
                          <span className="break-all text-xs text-neutral-500" title={row.polygon_tx_hash}>
                            {row.polygon_tx_hash} (sandbox)
                          </span>
                        )
                      ) : (
                        '—'
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
