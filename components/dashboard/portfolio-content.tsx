'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

type HandshakeRow = {
  status: 'PENDING' | 'ACTIVE';
  lender_id: string;
  borrower_id: string;
  amount: number;
  created_at: string;
};

function formatMonth(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleDateString('en-GB', { month: 'short' });
}

export function PortfolioContent() {
  const searchParams = useSearchParams();
  const [series, setSeries] = useState<{ label: string; value: number }[]>([]);
  const [summary, setSummary] = useState({ activeInvestment: 0, activeLoan: 0 });

  const mandateNotice = useMemo(() => {
    const m = searchParams.get('mandate');
    if (m === 'complete') return 'GoCardless mandate flow completed (sandbox or live).';
    if (m === 'cancelled') return 'GoCardless mandate setup was cancelled.';
    return null;
  }, [searchParams]);

  useEffect(() => {
    const supabase = createClient();

    async function loadSeries() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: handshakes } = await supabase
        .from('handshakes')
        .select('status, lender_id, borrower_id, amount, created_at')
        .eq('status', 'ACTIVE')
        .or(`lender_id.eq.${user.id},borrower_id.eq.${user.id}`)
        .order('created_at', { ascending: true });

      const rows = (handshakes ?? []) as HandshakeRow[];
      const monthly = new Map<string, number>();
      let activeInvestment = 0;
      let activeLoan = 0;

      rows.forEach((row) => {
        const key = formatMonth(row.created_at);
        monthly.set(key, (monthly.get(key) ?? 0) + Number(row.amount || 0));
        if (row.lender_id === user.id) activeInvestment += Number(row.amount || 0);
        if (row.borrower_id === user.id) activeLoan += Number(row.amount || 0);
      });

      setSeries(Array.from(monthly, ([label, value]) => ({ label, value })));
      setSummary({ activeInvestment, activeLoan });
    }

    void loadSeries();
  }, []);

  const max = useMemo(() => Math.max(...series.map((s) => s.value), 1), [series]);

  return (
    <section className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-black text-neutral-950 dark:text-white">Portfolio Graph</h1>
      <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">
        Active loan and investment totals from on-chain handshakes.
      </p>

      {mandateNotice && (
        <p className="mt-4 rounded-xl border border-brand-200 bg-brand-500/10 px-4 py-3 text-sm text-brand-800 dark:text-brand-200">
          {mandateNotice}
        </p>
      )}

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <div className="glass-card rounded-2xl p-5">
          <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">Active Investment</p>
          <p className="mt-2 text-3xl font-black text-brand-600">£{summary.activeInvestment.toLocaleString('en-GB')}</p>
        </div>
        <div className="glass-card rounded-2xl p-5">
          <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">Active Loan</p>
          <p className="mt-2 text-3xl font-black text-brand-600">£{summary.activeLoan.toLocaleString('en-GB')}</p>
        </div>
      </div>

      <div className="glass-card mt-6 rounded-2xl p-5">
        <p className="text-sm font-bold text-neutral-900 dark:text-white">Flow chart</p>
        <div className="mt-4 grid grid-cols-5 gap-2 sm:grid-cols-8">
          {series.length === 0 ? (
            <p className="col-span-full text-sm text-neutral-500">No active handshakes yet.</p>
          ) : (
            series.map((point) => (
              <div key={point.label} className="flex flex-col items-center gap-2">
                <div className="flex h-40 w-full items-end rounded-xl bg-neutral-200/70 p-1 dark:bg-white/5">
                  <div
                    className="w-full rounded-lg bg-gradient-to-t from-brand-500 to-orange-300"
                    style={{ height: `${(point.value / max) * 100}%` }}
                  />
                </div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">{point.label}</p>
              </div>
            ))
          )}
        </div>
      </div>

      <p className="mt-6 text-center text-xs text-neutral-500">
        Fiat Direct Debit: open an active handshake in Chats as a borrower to launch GoCardless (sandbox).
      </p>
    </section>
  );
}
