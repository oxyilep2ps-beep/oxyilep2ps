import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/admin';
import { verifyGuarantorInviteToken } from '@/lib/guarantor/invite';
import { GuarantorMandateActions } from '@/components/guarantor/guarantor-mandate-actions';

type GuarantorReviewPageProps = {
  params: Promise<{ loanId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function firstValue(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? '';
  return value ?? '';
}

export default async function GuarantorReviewPage({ params, searchParams }: GuarantorReviewPageProps) {
  const { loanId } = await params;
  const query = await searchParams;
  const email = firstValue(query.email).trim().toLowerCase();
  const token = firstValue(query.token).trim();
  const issuedAt = firstValue(query.issuedAt).trim();
  const declined = firstValue(query.status) === 'declined';
  const accepted = firstValue(query.status) === 'accepted';

  const inviteIsValid = verifyGuarantorInviteToken(loanId, email, issuedAt, token);
  if (!inviteIsValid) {
    notFound();
  }

  const admin = createAdminClient();
  const { data: handshake } = await admin
    .from('handshakes')
    .select('id, amount, rate, duration, emi_amount, borrower_id, guarantor_email, guarantor_status, guarantor_mandate_id')
    .eq('id', loanId)
    .maybeSingle();

  if (!handshake) {
    notFound();
  }

  if ((handshake.guarantor_email as string | null)?.toLowerCase() !== email) {
    notFound();
  }

  const { data: borrowerProfile } = await admin
    .from('profiles')
    .select('full_legal_name, email')
    .eq('id', handshake.borrower_id as string)
    .maybeSingle();

  const status = String(handshake.guarantor_status ?? 'none').toLowerCase();
  const alreadyAccepted = status === 'accepted' || Boolean(handshake.guarantor_mandate_id);

  return (
    <section className="mx-auto min-h-[80vh] max-w-3xl px-4 py-10">
      <div className="overflow-hidden rounded-[2rem] border border-neutral-200 bg-white shadow-2xl dark:border-white/10 dark:bg-neutral-950">
        <div className="border-b border-brand-200/60 bg-gradient-to-r from-brand-50 via-orange-50 to-amber-50 px-6 py-6 dark:border-brand-900/30 dark:from-brand-950/30 dark:via-neutral-950 dark:to-neutral-950">
          <p className="text-xs font-black uppercase tracking-[0.28em] text-brand-700 dark:text-brand-300">
            Guarantor / Co-applicant Review
          </p>
          <h1 className="mt-2 text-3xl font-black text-neutral-950 dark:text-white">
            Review loan terms &amp; set up Direct Debit
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-neutral-600 dark:text-neutral-300">
            If you accept, GoCardless will collect a backup Direct Debit mandate. It is only used if the borrower
            misses an EMI.
          </p>
        </div>

        <div className="grid gap-6 px-6 py-6 lg:grid-cols-[1.3fr_0.9fr]">
          <div className="space-y-4">
            {declined ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
                You declined this invitation.
              </div>
            ) : null}
            {accepted || alreadyAccepted ? (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
                Guarantor mandate is active for this loan.
              </div>
            ) : null}

            <div className="rounded-2xl border border-neutral-200/70 bg-neutral-50 p-5 dark:border-white/10 dark:bg-white/5">
              <p className="text-xs font-bold uppercase tracking-wider text-neutral-500">Borrower</p>
              <p className="mt-1 text-lg font-black text-neutral-950 dark:text-white">
                {borrowerProfile?.full_legal_name ?? 'Borrower'}
              </p>
              <p className="mt-3 text-xs font-bold uppercase tracking-wider text-neutral-500">Requested amount</p>
              <p className="mt-1 text-2xl font-black text-brand-600">
                £{Number(handshake.amount ?? 0).toLocaleString('en-GB')}
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-neutral-500">Rate</p>
                  <p className="mt-1 text-sm font-semibold">{Number(handshake.rate ?? 0)}%</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-neutral-500">Tenure</p>
                  <p className="mt-1 text-sm font-semibold">{Number(handshake.duration ?? 0)} months</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-neutral-500">Estimated EMI</p>
                  <p className="mt-1 text-sm font-semibold">
                    £{Number(handshake.emi_amount ?? 0).toLocaleString('en-GB')}
                  </p>
                </div>
              </div>
            </div>

            {!declined && !alreadyAccepted ? (
              <GuarantorMandateActions
                loanId={loanId}
                email={email}
                token={token}
                issuedAt={issuedAt}
              />
            ) : null}
          </div>

          <aside className="space-y-4 rounded-3xl border border-brand-200/70 bg-brand-50/40 p-5 dark:border-brand-900/30 dark:bg-brand-950/20">
            <div>
              <p className="text-xs font-black uppercase tracking-wider text-brand-700 dark:text-brand-300">
                Your liability
              </p>
              <p className="mt-2 text-sm leading-relaxed text-neutral-600 dark:text-neutral-300">
                Your mandate is a backup rail. Oxyile may charge it only after a borrower EMI payment fails.
              </p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-neutral-500">Invite email</p>
              <p className="mt-1 break-all text-sm font-semibold text-neutral-950 dark:text-white">{email}</p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-neutral-500">Status</p>
              <p className="mt-1 text-sm font-semibold text-neutral-950 dark:text-white">{status}</p>
            </div>
            <Link href="/" className="inline-flex text-sm font-semibold text-brand-600 dark:text-brand-300">
              Return to Oxyile
            </Link>
          </aside>
        </div>
      </div>
    </section>
  );
}
