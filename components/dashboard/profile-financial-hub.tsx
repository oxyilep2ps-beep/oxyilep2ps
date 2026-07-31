'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Handshake, ShieldCheck, Sparkles, TrendingUp, Users } from 'lucide-react';
import { getProfileFinancialPortfolio } from '@/app/actions/profile-financial';
import {
  formatGbp,
  formatPct,
  type ProfileFinancialPortfolio,
  type ProfileFinancialRelationship,
} from '@/lib/profile/financial';

function PortfolioSkeleton() {
  return (
    <div className="mt-6 space-y-4" aria-busy="true" aria-label="Loading financial portfolio">
      <div className="h-6 w-72 animate-pulse rounded-lg bg-neutral-800/80" />
      <div className="h-4 w-full max-w-md animate-pulse rounded bg-neutral-800/50" />
      <div className="grid gap-4 sm:grid-cols-2">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="animate-pulse rounded-2xl border border-neutral-800 bg-neutral-900/60 p-5"
          >
            <div className="h-4 w-24 rounded bg-neutral-800" />
            <div className="mt-4 h-8 w-32 rounded bg-neutral-800" />
            <div className="mt-3 h-3 w-full rounded bg-neutral-800/70" />
            <div className="mt-2 h-3 w-3/4 rounded bg-neutral-800/50" />
            <div className="mt-5 flex gap-2">
              <div className="h-6 w-28 rounded-full bg-neutral-800" />
              <div className="h-6 w-36 rounded-full bg-neutral-800" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function EmptyState({ href }: { href: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-neutral-700 bg-neutral-900/40 px-6 py-10 text-center">
      <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-[#F97316]/10 text-[#F97316]">
        <Handshake size={22} />
      </div>
      <p className="mt-4 text-sm font-semibold text-neutral-200">No active financial handshakes found.</p>
      <p className="mt-1 text-xs text-neutral-500">
        Originate or accept a P2P proposal to populate your live portfolio here.
      </p>
      <Link
        href={href}
        className="mt-5 inline-flex items-center justify-center rounded-full bg-[#F97316] px-5 py-2.5 text-sm font-bold text-white shadow-[0_0_24px_rgba(249,115,22,0.35)] transition hover:bg-orange-400"
      >
        Start a New Handshake Proposal
      </Link>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-neutral-800 bg-black/30 px-4 py-3">
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-neutral-500">{label}</p>
      <p className="mt-1 text-lg font-black text-white">{value}</p>
    </div>
  );
}

function BorrowerCards({ rows }: { rows: ProfileFinancialRelationship[] }) {
  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <Users size={16} className="text-[#F97316]" />
        <h3 className="text-sm font-bold text-white">Active Loan Handshakes</h3>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {rows.map((row) => (
          <article
            key={row.id}
            className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-5 transition hover:border-[#F97316]/40 hover:shadow-[0_0_28px_rgba(249,115,22,0.12)]"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500">
                  Loan amount
                </p>
                <p className="mt-1 text-2xl font-black text-white">{formatGbp(row.loanAmountGbp)}</p>
              </div>
              <span className="rounded-full border border-neutral-700 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-neutral-300">
                {row.status}
              </span>
            </div>
            <dl className="mt-4 grid grid-cols-3 gap-2 text-xs">
              <div>
                <dt className="text-neutral-500">Monthly EMI</dt>
                <dd className="mt-0.5 font-bold text-neutral-100">{formatGbp(row.emiAmountGbp)}</dd>
              </div>
              <div>
                <dt className="text-neutral-500">Interest</dt>
                <dd className="mt-0.5 font-bold text-neutral-100">{formatPct(row.interestRatePct)}</dd>
              </div>
              <div>
                <dt className="text-neutral-500">Tenure</dt>
                <dd className="mt-0.5 font-bold text-neutral-100">{row.tenureMonths} mo</dd>
              </div>
            </dl>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="inline-flex items-center rounded-full border border-neutral-700 bg-neutral-950/80 px-3 py-1 text-[11px] font-semibold text-neutral-200">
                Funded by: {row.investor.name || row.investor.id || 'Pending investor'}
              </span>
              <span
                className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-semibold ${
                  row.guarantor.mandateActive
                    ? 'border border-emerald-500/30 bg-emerald-500/15 text-emerald-300'
                    : 'border border-neutral-700 bg-neutral-950/80 text-neutral-300'
                }`}
              >
                {row.guarantor.mandateActive ? <ShieldCheck size={12} /> : null}
                {row.guarantor.label}
              </span>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function GuarantorCards({ rows }: { rows: ProfileFinancialRelationship[] }) {
  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <ShieldCheck size={16} className="text-[#F97316]" />
        <h3 className="text-sm font-bold text-white">Co-Applicant / Guaranteed Obligations</h3>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {rows.map((row) => (
          <article
            key={row.id}
            className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-5 transition hover:border-[#F97316]/40 hover:shadow-[0_0_28px_rgba(249,115,22,0.12)]"
          >
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500">
              Backing borrower
            </p>
            <p className="mt-1 text-lg font-black text-white">{row.borrower.name}</p>
            <p className="mt-4 text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500">
              Total guaranteed liability
            </p>
            <p className="mt-1 text-2xl font-black text-[#F97316]">{formatGbp(row.loanAmountGbp)}</p>
            <p className="mt-1 text-xs text-neutral-400">
              EMI exposure {formatGbp(row.emiAmountGbp)} / mo · {formatPct(row.interestRatePct)} ·{' '}
              {row.tenureMonths} months
            </p>
            <div className="mt-4">
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold ${
                  row.mandateActive
                    ? 'border border-emerald-500/30 bg-emerald-500/15 text-emerald-300'
                    : 'border border-amber-500/30 bg-amber-500/10 text-amber-200'
                }`}
              >
                <ShieldCheck size={12} />
                {row.mandateActive
                  ? 'GoCardless Direct Debit: Active (20-00-00 / ****9911)'
                  : 'GoCardless Direct Debit: Mandate pending'}
              </span>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function InvestorCards({
  rows,
  metrics,
}: {
  rows: ProfileFinancialRelationship[];
  metrics: ProfileFinancialPortfolio['investorMetrics'];
}) {
  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <TrendingUp size={16} className="text-[#F97316]" />
        <h3 className="text-sm font-bold text-white">Active Lending Contracts &amp; Capital Deployed</h3>
      </div>
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <Metric label="Total Deployed" value={formatGbp(metrics.totalDeployedGbp)} />
        <Metric label="Expected Returns" value={formatGbp(metrics.expectedReturnsGbp)} />
        <Metric label="Average Yield" value={formatPct(metrics.averageYieldPct)} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {rows.map((row) => (
          <article
            key={row.id}
            className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-5 transition hover:border-[#F97316]/40 hover:shadow-[0_0_28px_rgba(249,115,22,0.12)]"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500">
                  Borrower
                </p>
                <p className="mt-1 text-lg font-black text-white">{row.borrower.name}</p>
              </div>
              {row.guarantor.mandateActive || row.guarantor.status === 'accepted' ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-300">
                  <ShieldCheck size={12} /> Guarantor Secured
                </span>
              ) : (
                <span className="rounded-full border border-neutral-700 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                  Security pending
                </span>
              )}
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-3 text-xs">
              <div>
                <dt className="text-neutral-500">Loan value</dt>
                <dd className="mt-0.5 text-base font-black text-white">{formatGbp(row.loanAmountGbp)}</dd>
              </div>
              <div>
                <dt className="text-neutral-500">Interest earned</dt>
                <dd className="mt-0.5 text-base font-black text-[#F97316]">
                  {formatGbp(row.interestEarnedGbp)}
                </dd>
              </div>
            </dl>
            <p className="mt-3 text-xs text-neutral-400">
              Yield {formatPct(row.interestRatePct)} · Tenure {row.tenureMonths} months · EMI{' '}
              {formatGbp(row.emiAmountGbp)}
            </p>
          </article>
        ))}
      </div>
    </div>
  );
}

export function ProfileFinancialHub({ userId }: { userId: string }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [portfolio, setPortfolio] = useState<ProfileFinancialPortfolio | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      const result = await getProfileFinancialPortfolio();
      if (cancelled) return;
      setPortfolio(result.portfolio);
      setError(result.error ?? null);
      setLoading(false);
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  if (loading) {
    return (
      <section className="mt-6 overflow-hidden rounded-3xl border border-neutral-800 bg-neutral-950/80 p-5 sm:p-6">
        <div className="inline-flex items-center gap-2 text-[#F97316]">
          <Sparkles size={14} />
          <p className="text-[10px] font-black uppercase tracking-[0.28em]">Live financial portfolio</p>
        </div>
        <h2 className="mt-1 text-xl font-black text-white sm:text-2xl">
          Active P2P Relationships &amp; Financial Standing
        </h2>
        <PortfolioSkeleton />
      </section>
    );
  }

  const primaryRole = portfolio?.primaryRole ?? 'BORROWER';
  const isBorrower =
    primaryRole === 'BORROWER' || (portfolio?.viewerRoles.includes('borrower') ?? false);
  const isInvestor =
    primaryRole === 'INVESTOR' || (portfolio?.viewerRoles.includes('investor') ?? false);
  const isGuarantor = portfolio?.viewerRoles.includes('guarantor') ?? false;

  const borrowerRows = portfolio?.borrowerRelationships ?? [];
  const investorRows = portfolio?.investorRelationships ?? [];
  const guarantorRows = portfolio?.guarantorRelationships ?? [];

  const hasAny =
    borrowerRows.length > 0 || investorRows.length > 0 || guarantorRows.length > 0;

  const emptyHref = isInvestor && !isBorrower ? '/dashboard/marketplace' : '/dashboard/apply';

  return (
    <section className="mt-6 overflow-hidden rounded-3xl border border-neutral-800 bg-neutral-950/80 p-5 sm:p-6">
      <div className="inline-flex items-center gap-2 text-[#F97316]">
        <Sparkles size={14} />
        <p className="text-[10px] font-black uppercase tracking-[0.28em]">Live financial portfolio</p>
      </div>
      <h2 className="mt-1 text-xl font-black text-white sm:text-2xl">
        Active P2P Relationships &amp; Financial Standing
      </h2>
      <p className="mt-1 max-w-2xl text-sm text-neutral-400">
        Role-aware lending relationships, £ GBP exposure, and GoCardless guarantor security for your
        Oxyile handshake network.
      </p>

      {error ? (
        <p className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </p>
      ) : null}

      <div className="mt-6 space-y-8">
        {!hasAny ? <EmptyState href={emptyHref} /> : null}
        {isBorrower && borrowerRows.length > 0 ? <BorrowerCards rows={borrowerRows} /> : null}
        {isGuarantor && guarantorRows.length > 0 ? <GuarantorCards rows={guarantorRows} /> : null}
        {isInvestor && investorRows.length > 0 ? (
          <InvestorCards
            rows={investorRows}
            metrics={
              portfolio?.investorMetrics ?? {
                totalDeployedGbp: 0,
                expectedReturnsGbp: 0,
                averageYieldPct: 0,
              }
            }
          />
        ) : null}
      </div>
    </section>
  );
}
