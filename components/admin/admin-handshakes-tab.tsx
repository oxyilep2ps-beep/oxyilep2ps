'use client';

import { useCallback, useEffect, useState } from 'react';
import { Download, ExternalLink, FileSignature, Loader2, Mail } from 'lucide-react';
import { listAdminHandshakes, markHandshakePaid, type AdminHandshakeRow } from '@/app/actions/admin-handshakes';
import { generateContractPDF } from '@/lib/pdf/contract-pdf';
import { calculateHandshakeFigures } from '@/lib/handshake/calculations';
import {
  getLoanHealthStatus,
  LOAN_HEALTH_COLORS,
  LOAN_HEALTH_LABELS,
} from '@/lib/handshake/loan-health';

function polygonAmoyTxUrl(hash: string | null): string | null {
  if (!hash || !/^0x[a-fA-F0-9]{64}$/.test(hash)) return null;
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

  const downloadMasterPdf = (row: AdminHandshakeRow) => {
    const fallbackFigures = calculateHandshakeFigures(row.amount, row.rate, row.duration);
    const emiAmount = row.emi_amount && row.emi_amount > 0 ? row.emi_amount : fallbackFigures.emi_amount;
    const totalReturn =
      row.total_return && row.total_return > 0 ? row.total_return : fallbackFigures.total_return;

    generateContractPDF({
      perspective: 'ADMIN',
      mode: 'admin',
      contract: {
        id: row.id,
        txn_id: row.txn_id,
        lender_id: row.lender_id,
        borrower_id: row.borrower_id,
        lender_name: row.lender_name,
        borrower_name: row.borrower_name,
        amount: row.amount,
        rate: row.rate,
        duration: row.duration,
        emi_amount: emiAmount,
        total_return: totalReturn,
        polygon_tx_hash: row.polygon_tx_hash,
        mandate_id: row.mandate_id,
        gocardless_subscription_id: row.gocardless_subscription_id,
        payment_status: row.payment_status,
        status: row.status,
        created_at: row.created_at,
      },
    });
  };

  return (
    <div className="w-full min-w-0 space-y-6">
      <div>
        <h2 className="text-xl font-black text-neutral-950 dark:text-white">Transaction Hub</h2>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">
          Track Oxyile transaction IDs, GoCardless mandates, Polygon verification, and master contract PDFs.
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
        <div className="glass-card overflow-x-auto rounded-2xl">
          <table className="min-w-[1140px] w-full text-left text-sm">
            <thead className="border-b border-white/50 text-xs uppercase tracking-wider text-neutral-500 dark:border-white/10">
              <tr>
                <th className="px-4 py-3">Transaction</th>
                <th className="px-4 py-3">Health</th>
                <th className="px-4 py-3">Parties & Terms</th>
                <th className="px-4 py-3">GoCardless Mandate</th>
                <th className="px-4 py-3">Polygon TX Hash</th>
                <th className="px-4 py-3">Contract</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/40 dark:divide-white/10">
              {rows.map((row) => {
                const txUrl = polygonAmoyTxUrl(row.polygon_tx_hash);
                const health = getLoanHealthStatus(row);
                const fallbackFigures = calculateHandshakeFigures(row.amount, row.rate, row.duration);
                const emi = row.emi_amount && row.emi_amount > 0 ? row.emi_amount : fallbackFigures.emi_amount;
                const total =
                  row.total_return && row.total_return > 0 ? row.total_return : fallbackFigures.total_return;

                return (
                  <tr key={row.id} className="align-top">
                    <td className="px-4 py-4">
                      <p className="font-black text-brand-600 dark:text-brand-300">
                        {row.txn_id ?? 'Pending TXN'}
                      </p>
                      <p className="mt-1 max-w-[150px] truncate text-xs text-neutral-500">{row.id}</p>
                      <p className="mt-1 text-xs text-neutral-400">
                        {new Date(row.created_at).toLocaleString('en-GB')}
                      </p>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <span className={`h-3 w-3 rounded-full ${LOAN_HEALTH_COLORS[health]}`} />
                        <span className="text-xs font-bold">{LOAN_HEALTH_LABELS[health]}</span>
                      </div>
                      {health === 'defaulted' && (
                        <a
                          href={`mailto:${encodeURIComponent(row.borrower_email ?? 'legal@oxyile.com')}?subject=${encodeURIComponent(`Legal Notice — Loan ${row.txn_id ?? row.id}`)}&body=${encodeURIComponent(`Dear ${row.borrower_name},\n\nThis is a formal notice regarding your defaulted Oxyile handshake agreement.\n\nTransaction: ${row.txn_id ?? row.id}\nAmount: £${row.amount}\n\nPlease contact compliance immediately.\n\nOxyile Legal Team`)}`}
                          className="mt-2 inline-flex items-center gap-1 rounded-full bg-red-600 px-2.5 py-1 text-[10px] font-bold text-white"
                        >
                          <Mail size={11} />
                          Send Legal Notice
                        </a>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <p className="font-bold text-neutral-950 dark:text-white">{row.lender_name}</p>
                      <p className="text-xs text-neutral-500">Investor</p>
                      <p className="mt-2 font-bold text-neutral-950 dark:text-white">{row.borrower_name}</p>
                      <p className="text-xs text-neutral-500">Borrower</p>
                      <p className="mt-2 text-xs text-neutral-600 dark:text-neutral-300">
                        £{row.amount.toLocaleString('en-GB')} · {row.rate}% · {row.duration} mo
                      </p>
                      <p className="text-xs text-neutral-500">
                        EMI £{emi.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} · Total £
                        {total.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                    </td>
                    <td className="px-4 py-4">
                      <span className="rounded-full bg-emerald-500/15 px-2.5 py-1 text-xs font-bold text-emerald-800 dark:text-emerald-200">
                        {row.mandate_status ?? 'Pending'}
                      </span>
                      <p className="mt-2 max-w-[170px] break-all text-xs text-neutral-500">
                        <span className="font-semibold text-neutral-700 dark:text-neutral-300">GoCardless Mandate:</span>{' '}
                        {row.mandate_id ?? 'Not linked'}
                      </p>
                      <p className="mt-1 max-w-[170px] break-all text-xs text-neutral-400">
                        <span className="font-semibold">Subscription:</span>{' '}
                        {row.gocardless_subscription_id ?? 'Pending'}
                      </p>
                    </td>
                    <td className="px-4 py-4">
                      {txUrl ? (
                        <a
                          href={txUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 rounded-full bg-brand-500/10 px-3 py-1 text-xs font-bold text-brand-600"
                        >
                          Verified on Amoy <ExternalLink size={12} />
                        </a>
                      ) : (
                        <span className="rounded-full bg-neutral-200/70 px-3 py-1 text-xs font-bold text-neutral-600 dark:bg-white/10 dark:text-neutral-300">
                          {row.polygon_tx_hash ? 'Mock / unverified hash' : 'Pending'}
                        </span>
                      )}
                      <p className="mt-2 max-w-[190px] break-all text-xs text-neutral-500">
                        <span className="font-semibold text-neutral-700 dark:text-neutral-300">Polygon TX Hash:</span>{' '}
                        {row.polygon_tx_hash ?? 'No tx hash yet'}
                      </p>
                    </td>
                    <td className="px-4 py-4">
                      <span className="rounded-full bg-amber-500/15 px-3 py-1 text-xs font-bold text-amber-800 dark:text-amber-200">
                        {row.contract_label}
                      </span>
                      <p className="mt-2 text-xs text-neutral-500">
                        Auto-EMI: {row.auto_emi_active ? 'Active' : 'Pending'}
                      </p>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-col items-end gap-2">
                        <button
                          type="button"
                          onClick={() => downloadMasterPdf(row)}
                          className="inline-flex items-center gap-1 rounded-full bg-neutral-950 px-3 py-1.5 text-xs font-bold text-white dark:bg-white dark:text-neutral-950"
                        >
                          <Download size={13} />
                          Master PDF
                        </button>
                        {row.status === 'ACTIVE' && row.payment_status === 'PENDING' && (
                          <button
                            type="button"
                            disabled={busyId === row.id}
                            onClick={() => markPaid(row.id)}
                            className="rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50"
                          >
                            {busyId === row.id ? 'Updating…' : 'Mark PAID'}
                          </button>
                        )}
                      </div>
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
