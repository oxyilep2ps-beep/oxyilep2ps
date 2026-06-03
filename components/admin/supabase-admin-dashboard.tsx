'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Download, Loader2, ShieldCheck, Users, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { getKycSignedUrlAction } from '@/app/actions/admin-users';
import { DocumentViewer } from '@/components/admin/document-viewer';
import { RejectReasonDialog } from '@/components/admin/reject-reason-dialog';
import type { KycDocumentPaths, Profile } from '@/lib/types/profile';
import { cn } from '@/lib/utils';
import { exportKycDossierPdf } from '@/lib/pdf/export-kyc-pdf';
import { generateAdminApprovedUsersPDF } from '@/lib/pdf/admin-approved-users-pdf';
import { listApplicationRejections, type RejectionRow } from '@/app/actions/admin-rejections';
import { fcaAnswersToRows } from '@/lib/kyc/fca-answers';
import { Logo } from '@/components/logo';

type Tab = 'pending' | 'approved' | 'rejected';
type ReviewAction = 'APPROVED' | 'REJECTED';
type DocumentKind = 'image' | 'pdf' | 'video' | 'other';

type ResolvedDocument = {
  label: string;
  path: string | null;
  url: string | null;
  kind: DocumentKind;
  loaded: boolean;
  error?: string;
};

type NormalizedKyc = {
  accountRole: 'lender' | 'borrower';
  basic: {
    fullLegalName: string;
    email: string;
    ukPhone: string;
    postalCode: string;
    dateOfBirth: string;
    currentAddress: string;
    addressHistory3Years: string;
  };
  fcaTestAnswers: Record<string, string>;
  identity: {
    proofOfIdentityType: string;
    documents: KycDocumentPaths;
  };
  lender?: {
    investorCategory: string;
    appropriatenessAnswers: (number | null)[];
    sourceOfFunds: string;
    bankSortCode: string;
    bankAccountNumber: string;
  };
  borrower?: {
    purposeOfLoan: string;
    employmentStatus: string;
    annualIncome: string;
    openBankingConsent: boolean;
    creditCheckConsent: boolean;
    monthlyRentOrEmi: string;
    otherMonthlyExpenses: string;
    hasIncomeVerification?: boolean;
  };
  submittedAt?: string;
};

type QuestionnaireRow = {
  question: string;
  answer: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return isRecord(value) ? value : null;
}

function toText(value: unknown): string | undefined {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length ? trimmed : undefined;
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  return undefined;
}

function pickText(...values: unknown[]): string {
  for (const value of values) {
    const text = toText(value);
    if (text) return text;
  }
  return '—';
}

function pickOptionalText(...values: unknown[]): string | undefined {
  for (const value of values) {
    const text = toText(value);
    if (text) return text;
  }
  return undefined;
}

function formatBoolean(value: unknown): string {
  return typeof value === 'boolean' ? (value ? 'Yes' : 'No') : '—';
}

function formatCurrency(value: unknown): string {
  const text = toText(value);
  return text ? `£${text}` : '—';
}

function formatInterestRate(value: unknown): string {
  const rate = Number(value);
  return Number.isFinite(rate) && rate > 0 ? `${rate.toLocaleString('en-GB')}%` : '—';
}

function slugifyFileName(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 80) || 'user';
}

function getDocumentKind(path?: string | null): DocumentKind {
  if (!path) return 'other';
  const lower = path.toLowerCase();
  if (/\.(png|jpg|jpeg|webp|gif)$/.test(lower)) return 'image';
  if (lower.endsWith('.pdf')) return 'pdf';
  if (/\.(mp4|webm|mov)$/.test(lower)) return 'video';
  return 'other';
}

function normalizeKyc(profile: Profile): NormalizedKyc {
  const raw = isRecord(profile.kyc_data) ? profile.kyc_data : null;
  const basic = asRecord(raw?.basic) ?? asRecord(raw?.basicDetails) ?? asRecord(raw);
  const identity = asRecord(raw?.identity) ?? asRecord(raw?.identityMeta);
  const documents = asRecord(identity?.documents) ?? asRecord(raw?.documents);
  const lender = asRecord(raw?.lender);
  const borrower = asRecord(raw?.borrower);

  return {
    accountRole:
      (raw?.accountRole === 'lender' || raw?.accountRole === 'borrower' ? raw.accountRole : null) ??
      (profile.role === 'INVESTOR' ? 'lender' : 'borrower'),
    basic: {
      fullLegalName: pickText(basic?.fullLegalName, profile.full_legal_name),
      email: pickText(basic?.email, profile.email),
      ukPhone: pickText(basic?.ukPhone),
      postalCode: pickText(basic?.postalCode, profile.postal_code),
      dateOfBirth: pickText(basic?.dateOfBirth),
      currentAddress: pickText(basic?.currentAddress),
      addressHistory3Years: pickText(basic?.addressHistory3Years),
    },
    fcaTestAnswers:
      profile.fca_test_answers && typeof profile.fca_test_answers === 'object'
        ? (profile.fca_test_answers as Record<string, string>)
        : {},
    identity: {
      proofOfIdentityType: pickText(identity?.proofOfIdentityType, raw?.proofOfIdentityType),
      documents: {
        proofOfIdentity: pickOptionalText(
          profile.proof_of_identity_url,
          documents?.proofOfIdentity,
          identity?.idProofPath
        ),
        livenessVideo: pickOptionalText(
          profile.liveness_video_url,
          documents?.livenessVideo,
          identity?.livenessPath
        ),
        proofOfAddress: pickOptionalText(
          profile.proof_of_address_url,
          documents?.proofOfAddress,
          identity?.addressProofPath
        ),
        incomeVerification: pickOptionalText(documents?.incomeVerification, identity?.incomeVerificationPath),
      },
    },
    lender: lender
      ? {
          investorCategory: pickText(lender.investorCategory),
          appropriatenessAnswers: Array.isArray(lender.appropriatenessAnswers) ? lender.appropriatenessAnswers : [],
          sourceOfFunds: pickText(lender.sourceOfFunds),
          bankSortCode: pickText(lender.bankSortCode),
          bankAccountNumber: pickText(lender.bankAccountNumber),
        }
      : undefined,
    borrower: borrower
      ? {
          purposeOfLoan: pickText(borrower.purposeOfLoan),
          employmentStatus: pickText(borrower.employmentStatus),
          annualIncome: pickText(borrower.annualIncome),
          openBankingConsent: Boolean(borrower.openBankingConsent),
          creditCheckConsent: Boolean(borrower.creditCheckConsent),
          monthlyRentOrEmi: pickText(borrower.monthlyRentOrEmi),
          otherMonthlyExpenses: pickText(borrower.otherMonthlyExpenses),
          hasIncomeVerification: Boolean(
            pickOptionalText(identity?.incomeVerificationPath, documents?.incomeVerification)
          ),
        }
      : undefined,
    submittedAt: pickOptionalText(raw?.submittedAt),
  };
}

function buildDocumentItems(kyc: NormalizedKyc): ResolvedDocument[] {
  return [
    {
      label: 'ID Proof',
      path: kyc.identity.documents.proofOfIdentity ?? null,
      url: null,
      kind: getDocumentKind(kyc.identity.documents.proofOfIdentity ?? null),
      loaded: true,
    },
    {
      label: 'Liveness selfie',
      path: kyc.identity.documents.livenessVideo ?? null,
      url: null,
      kind: getDocumentKind(kyc.identity.documents.livenessVideo ?? null),
      loaded: true,
    },
    {
      label: 'Address Proof',
      path: kyc.identity.documents.proofOfAddress ?? null,
      url: null,
      kind: getDocumentKind(kyc.identity.documents.proofOfAddress ?? null),
      loaded: true,
    },
    {
      label: 'Income verification',
      path: kyc.identity.documents.incomeVerification ?? null,
      url: null,
      kind: getDocumentKind(kyc.identity.documents.incomeVerification ?? null),
      loaded: true,
    },
  ];
}

function answerFromChoice(value: number | null | undefined): string {
  if (value === 0) return 'Yes';
  if (value === 1) return 'No';
  return 'Not answered';
}

function buildQuestionnaireRows(kyc: NormalizedKyc, profile: Profile): QuestionnaireRow[] {
  const rows: QuestionnaireRow[] = [
    { question: 'Selected account role', answer: kyc.accountRole === 'lender' ? 'Investor / Lender' : 'Borrower' },
    { question: 'Proof of identity document type', answer: kyc.identity.proofOfIdentityType },
    {
      question: 'Proof of identity uploaded?',
      answer: kyc.identity.documents.proofOfIdentity ? 'Yes' : 'Not provided',
    },
    {
      question: 'Liveness selfie/video uploaded?',
      answer: kyc.identity.documents.livenessVideo ? 'Yes' : 'Not provided',
    },
    {
      question: 'Proof of address uploaded?',
      answer: kyc.identity.documents.proofOfAddress ? 'Yes' : 'Not provided',
    },
  ];

  if ((profile.role === 'INVESTOR' || kyc.accountRole === 'lender') && kyc.lender) {
    const fcaRows = fcaAnswersToRows(kyc.fcaTestAnswers);
    rows.push(
      { question: 'Investor categorisation', answer: kyc.lender.investorCategory },
      ...(fcaRows.length > 0
        ? fcaRows.map((row) => ({ question: row.question, answer: row.answer }))
        : [
            {
              question: 'FCA appropriateness: understands capital is at risk?',
              answer: answerFromChoice(kyc.lender.appropriatenessAnswers[0]),
            },
            {
              question: 'FCA appropriateness: understands lack of FSCS protection?',
              answer: answerFromChoice(kyc.lender.appropriatenessAnswers[1]),
            },
            {
              question: 'FCA appropriateness: understands investments are illiquid?',
              answer: answerFromChoice(kyc.lender.appropriatenessAnswers[2]),
            },
          ]),
      { question: 'Declared source of funds', answer: kyc.lender.sourceOfFunds },
      { question: 'Investor bank sort code provided?', answer: kyc.lender.bankSortCode !== '—' ? 'Yes' : 'Not provided' },
      {
        question: 'Investor bank account number provided?',
        answer: kyc.lender.bankAccountNumber !== '—' ? 'Yes' : 'Not provided',
      }
    );
  }

  if ((profile.role === 'BORROWER' || kyc.accountRole === 'borrower') && kyc.borrower) {
    rows.push(
      { question: 'Purpose of loan', answer: kyc.borrower.purposeOfLoan },
      { question: 'Employment status/details', answer: kyc.borrower.employmentStatus },
      { question: 'Annual income', answer: formatCurrency(kyc.borrower.annualIncome) },
      { question: 'Income verification uploaded?', answer: kyc.borrower.hasIncomeVerification ? 'Yes' : 'Not provided' },
      { question: 'Open Banking income verification consent?', answer: formatBoolean(kyc.borrower.openBankingConsent) },
      { question: 'Credit check consent via Experian/Equifax?', answer: formatBoolean(kyc.borrower.creditCheckConsent) },
      { question: 'Monthly rent or EMI', answer: formatCurrency(kyc.borrower.monthlyRentOrEmi) },
      { question: 'Other monthly expenses', answer: formatCurrency(kyc.borrower.otherMonthlyExpenses) }
    );
  }

  return rows.map((row) => ({ ...row, answer: row.answer || 'Not provided' }));
}

export function SupabaseAdminDashboard() {
  const [tab, setTab] = useState<Tab>('pending');
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [approvedCount, setApprovedCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [reviewing, setReviewing] = useState(false);
  const [exportingApproved, setExportingApproved] = useState(false);
  const [rejectTarget, setRejectTarget] = useState<Profile | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejections, setRejections] = useState<RejectionRow[]>([]);
  const [rejectedCount, setRejectedCount] = useState(0);
  const signedUrlCache = useRef<Record<string, string>>({});

  const load = useCallback(async (targetTab: Tab = tab) => {
    setLoading(true);
    try {
      if (targetTab === 'rejected') {
        const rows = await listApplicationRejections();
        setRejections(rows);
        setRejectedCount(rows.length);
        setProfiles([]);
        setExpandedId(null);
        return;
      }

      const supabase = createClient();
      const [pendingResult, approvedResult, listResult] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('status', 'PENDING').neq('role', 'ADMIN'),
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('status', 'APPROVED').neq('role', 'ADMIN'),
        supabase
          .from('profiles')
          .select('*')
          .neq('role', 'ADMIN')
          .eq('status', targetTab === 'pending' ? 'PENDING' : 'APPROVED')
          .order('created_at', { ascending: false }),
      ]);

      if (pendingResult.error) throw new Error(pendingResult.error.message);
      if (approvedResult.error) throw new Error(approvedResult.error.message);
      if (listResult.error) throw new Error(listResult.error.message);

      // Strict logging: inspect rows returned from DB to debug missing fields/files
      const fetched = (listResult.data ?? []) as Profile[];
      // eslint-disable-next-line no-console
      console.log('DB COUNTS:', { pending: pendingResult.count, approved: approvedResult.count });
      fetched.forEach((p) => {
        // eslint-disable-next-line no-console
        console.log('RAW FETCHED USER FROM DB:', p);
        // eslint-disable-next-line no-console
        console.log('PARSED KYC_DATA:', p.kyc_data);
        // eslint-disable-next-line no-console
        console.log('KYC_DATA_KEYS:', Object.keys((p.kyc_data ?? {}) as Record<string, unknown>));
      });

      setPendingCount(pendingResult.count ?? 0);
      setApprovedCount(approvedResult.count ?? 0);
      setProfiles(fetched);
      setExpandedId((current) => {
        if (current && (listResult.data ?? []).some((profile) => profile.id === current)) {
          return current;
        }
        return (listResult.data?.[0]?.id as string | undefined) ?? null;
      });
    } catch (error) {
      setProfiles([]);
      setMessage(error instanceof Error ? error.message : 'Failed to load review queue');
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => {
    void load(tab);
  }, [load, tab]);

  const resolveDocumentUrl = useCallback(async (path: string) => {
    const cached = signedUrlCache.current[path];
    if (cached) return cached;

    // eslint-disable-next-line no-console
    console.log('GENERATING SIGNED URL FOR:', path);
    const url = await getKycSignedUrlAction(path);
    // eslint-disable-next-line no-console
    console.log('GENERATED IMAGE URLS:', path, url);
    signedUrlCache.current[path] = url;
    return url;
  }, []);

  const submitReview = useCallback(
    async (payload: { userId: string; action: ReviewAction; reason?: string }) => {
      setReviewing(true);
      setMessage(null);

      try {
        const response = await fetch('/api/admin/review-user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        const data = (await response.json()) as { ok?: boolean; error?: string; warning?: string; action?: ReviewAction };
        if (!response.ok) {
          throw new Error(data.error ?? 'Review request failed');
        }

        if (payload.action === 'APPROVED') {
          setMessage('User approved successfully and the approval email was queued.');
          setTab('approved');
        } else {
          setMessage(data.warning ? `User removed. ${data.warning}` : 'User rejected, removed, and notified.');
          setRejectTarget(null);
          setRejectReason('');
        }

        await load(payload.action === 'APPROVED' ? 'approved' : 'pending');
      } catch (error) {
        setMessage(error instanceof Error ? error.message : 'Review request failed');
      } finally {
        setReviewing(false);
      }
    },
    [load]
  );

  const handleApprove = useCallback(
    (id: string) => {
      void submitReview({ userId: id, action: 'APPROVED' });
    },
    [submitReview]
  );

  const handleRejectRequest = useCallback(
    (profile: Profile) => {
      setRejectTarget(profile);
      setRejectReason('');
    },
    []
  );

  const handleConfirmReject = useCallback(() => {
    if (!rejectTarget) return;
    void submitReview({ userId: rejectTarget.id, action: 'REJECTED', reason: rejectReason });
  }, [rejectReason, rejectTarget, submitReview]);

  const handleExportApprovedUsers = useCallback(() => {
    setExportingApproved(true);
    try {
      generateAdminApprovedUsersPDF(profiles.filter((profile) => profile.status === 'APPROVED'));
    } finally {
      setExportingApproved(false);
    }
  }, [profiles]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="mx-auto flex w-full min-w-0 max-w-7xl flex-col gap-6 px-0 py-6 sm:px-2 lg:flex-row lg:py-10"
    >
      <aside className="glass-card w-full shrink-0 rounded-2xl p-4 lg:w-56">
        <Logo size="sm" />
        <p className="mt-3 text-lg font-bold text-neutral-950 dark:text-white">Applications</p>
        <nav className="mt-6 flex gap-2 overflow-x-auto lg:flex-col lg:overflow-visible">
          <button
            type="button"
            onClick={() => setTab('pending')}
            className={cn(
              'flex w-full items-center gap-2 rounded-xl px-4 py-3 text-left text-sm font-semibold transition',
              tab === 'pending'
                ? 'bg-brand-500 text-white shadow-glow'
                : 'text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-white/5'
            )}
          >
            <Users size={18} />
            Pending Reviews
            <span className="ml-auto rounded-full bg-white/20 px-2 py-0.5 text-xs">{pendingCount}</span>
          </button>
          <button
            type="button"
            onClick={() => setTab('approved')}
            className={cn(
              'flex w-full items-center gap-2 rounded-xl px-4 py-3 text-left text-sm font-semibold transition',
              tab === 'approved'
                ? 'bg-brand-500 text-white shadow-glow'
                : 'text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-white/5'
            )}
          >
            <ShieldCheck size={18} />
            Approved
            <span className="ml-auto rounded-full bg-white/20 px-2 py-0.5 text-xs">{approvedCount}</span>
          </button>
          <button
            type="button"
            onClick={() => setTab('rejected')}
            className={cn(
              'flex w-full shrink-0 items-center gap-2 rounded-xl px-4 py-3 text-left text-sm font-semibold transition',
              tab === 'rejected'
                ? 'bg-red-500 text-white shadow-glow'
                : 'text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-white/5'
            )}
          >
            <X size={18} />
            Rejected
            <span className="ml-auto rounded-full bg-white/20 px-2 py-0.5 text-xs">{rejectedCount}</span>
          </button>
        </nav>
      </aside>

      <main className="min-w-0 flex-1 overflow-x-auto">
        <>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h1 className="text-2xl font-black text-neutral-950 dark:text-white sm:text-3xl">
                  {tab === 'pending' ? 'Pending Reviews' : tab === 'approved' ? 'Approved Users Vault' : 'Rejected Applications'}
                </h1>
                <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">
                  {tab === 'pending'
                    ? 'Review KYC submissions and approve or permanently reject applicants.'
                    : tab === 'approved'
                      ? 'Secure view of all verified investors and borrowers.'
                      : 'Archived rejections with reasons and timestamps.'}
                </p>
              </div>

              {tab === 'approved' && (
                <button
                  type="button"
                  onClick={handleExportApprovedUsers}
                  disabled={exportingApproved || loading || profiles.length === 0}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-brand-500 px-5 py-3 text-sm font-bold text-white shadow-glow transition hover:bg-brand-400 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {exportingApproved ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                  Export Certified Network
                </button>
              )}
            </div>

            {message && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 rounded-xl border border-brand-200 bg-brand-500/10 px-4 py-3 text-sm text-brand-800 dark:text-brand-200"
              >
                {message}
              </motion.p>
            )}

            {loading ? (
              <div className="mt-12 flex justify-center text-neutral-500">
                <Loader2 className="animate-spin" size={28} />
              </div>
            ) : tab === 'rejected' ? (
              rejections.length === 0 ? (
                <p className="mt-12 text-center text-sm text-neutral-500">No rejected applications archived yet.</p>
              ) : (
                <ul className="mt-6 space-y-3">
                  {rejections.map((row) => (
                    <li key={row.id} className="glass-card rounded-2xl p-4">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="font-bold text-neutral-950 dark:text-white">{row.full_legal_name ?? 'Unknown'}</p>
                          <p className="text-sm text-neutral-500">{row.email}</p>
                          <p className="mt-1 text-xs text-neutral-400">
                            {row.role ?? '—'} · Rejected {new Date(row.rejected_at).toLocaleString('en-GB')}
                          </p>
                        </div>
                        <span className="rounded-full bg-red-500/15 px-3 py-1 text-xs font-bold text-red-700 dark:text-red-300">
                          Rejected
                        </span>
                      </div>
                      <p className="mt-3 text-sm text-neutral-700 dark:text-neutral-200">
                        <span className="font-semibold text-brand-600">Reason:</span> {row.rejection_reason ?? '—'}
                      </p>
                      {row.rejected_by && (
                        <p className="mt-1 text-xs text-neutral-500">Reviewed by {row.rejected_by}</p>
                      )}
                    </li>
                  ))}
                </ul>
              )
            ) : profiles.length === 0 ? (
              <p className="mt-12 text-center text-sm text-neutral-500">No users in this list.</p>
            ) : (
              <ul className="mt-6 space-y-3">
                {profiles.map((profile) => (
                  <ProfileCard
                    key={profile.id}
                    profile={profile}
                    expanded={expandedId === profile.id}
                    onToggle={() => setExpandedId(expandedId === profile.id ? null : profile.id)}
                    onApprove={() => handleApprove(profile.id)}
                    onReject={() => handleRejectRequest(profile)}
                    isReviewing={reviewing}
                    resolveDocumentUrl={resolveDocumentUrl}
                    showActions={tab === 'pending'}
                  />
                ))}
              </ul>
            )}
          </>
      </main>

      <RejectReasonDialog
        open={Boolean(rejectTarget)}
        reason={rejectReason}
        isSubmitting={reviewing}
        onReasonChange={setRejectReason}
        onClose={() => {
          if (reviewing) return;
          setRejectTarget(null);
          setRejectReason('');
        }}
        onConfirm={handleConfirmReject}
      />
    </motion.div>
  );
}

function ProfileCard({
  profile,
  expanded,
  onToggle,
  onApprove,
  onReject,
  isReviewing,
  resolveDocumentUrl,
  showActions,
}: {
  profile: Profile;
  expanded: boolean;
  onToggle: () => void;
  onApprove: () => void;
  onReject: () => void;
  isReviewing: boolean;
  resolveDocumentUrl: (path: string) => Promise<string>;
  showActions: boolean;
}) {
  const dossier = useMemo(() => normalizeKyc(profile), [profile]);
  const documents = useMemo(() => buildDocumentItems(dossier), [dossier]);
  const questionnaireRows = useMemo(() => buildQuestionnaireRows(dossier, profile), [dossier, profile]);
  const [exporting, setExporting] = useState(false);
  const [exportDocuments, setExportDocuments] = useState<ResolvedDocument[] | null>(null);
  const dossierRef = useRef<HTMLDivElement>(null);

  const handleExportPdf = useCallback(async () => {
    if (!dossierRef.current || exporting) return;

    setExporting(true);
    try {
      const resolvedDocuments = await Promise.all(
        documents.map(async (document) => {
          if (!document.path) return document;

          try {
            return {
              ...document,
              url: await resolveDocumentUrl(document.path),
              loaded: true,
              error: undefined,
            };
          } catch {
            return {
              ...document,
              url: null,
              loaded: true,
              error: 'Could not load preview',
            };
          }
        })
      );

      setExportDocuments(resolvedDocuments);
      await new Promise<void>((resolve) => {
        window.requestAnimationFrame(() => resolve());
      });

      await exportKycDossierPdf({
        fileName: `${slugifyFileName(dossier.basic.fullLegalName)}_Oxyile_KYC_Profile.pdf`,
        headerHtml: [
          dossier.basic.fullLegalName,
          dossier.basic.email,
          `ROLE: ${profile.role} · STATUS: ${profile.status}`,
        ].join('\n'),
        sections: [
          {
            title: 'Basic Details',
            rows: [
              ['Legal Name', dossier.basic.fullLegalName],
              ['Email', dossier.basic.email],
              ['UK Phone', dossier.basic.ukPhone],
              ['Postal Code', dossier.basic.postalCode],
              ['Date of Birth', dossier.basic.dateOfBirth],
              ['Current Address', dossier.basic.currentAddress],
              ['3-Year Address History', dossier.basic.addressHistory3Years],
              ...(Number(profile.target_amount ?? 0) > 0
                ? [['Target Amount', formatCurrency(profile.target_amount)] as [string, string]]
                : []),
              ['Expected Interest Rate', formatInterestRate(profile.expected_interest_rate)],
              ['Submitted At', dossier.submittedAt ? new Date(dossier.submittedAt).toLocaleString('en-GB') : 'Not provided'],
            ],
          },
          {
            title: 'Onboarding Questionnaire',
            rows: questionnaireRows.map((row) => [row.question, row.answer]),
          },
          ...(fcaAnswersToRows(dossier.fcaTestAnswers).length > 0
            ? [
                {
                  title: 'FCA Appropriateness Test',
                  rows: fcaAnswersToRows(dossier.fcaTestAnswers).map(
                    (row) => [row.question, row.answer] as [string, string]
                  ),
                },
              ]
            : []),
        ],
        documents: resolvedDocuments.map((doc) => ({
          label: doc.label,
          url: doc.url,
          kind: doc.kind,
          error: doc.error,
        })),
      });
    } finally {
      setExporting(false);
      setExportDocuments(null);
    }
  }, [
    documents,
    dossier,
    exporting,
    profile.expected_interest_rate,
    profile.role,
    profile.status,
    profile.target_amount,
    questionnaireRows,
    resolveDocumentUrl,
  ]);

  const docsForExport = exportDocuments ?? documents;

  return (
    <li className="glass-card overflow-hidden rounded-2xl">
      <div className="flex flex-wrap items-center gap-3 px-4 py-4 sm:px-5">
        <button type="button" onClick={onToggle} className="flex min-w-0 flex-1 items-center gap-3 text-left">
          <span className="text-brand-500">{expanded ? '−' : '+'}</span>
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold text-neutral-950 dark:text-white">{dossier.basic.fullLegalName}</p>
            <p className="truncate text-xs text-neutral-500">{dossier.basic.email}</p>
          </div>
        </button>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-brand-500/10 px-2 py-1 text-[10px] font-bold uppercase text-brand-600 dark:text-brand-300">
            {profile.role}
          </span>
          <span
            className={cn(
              'rounded-full px-2 py-1 text-[10px] font-bold uppercase',
              profile.status === 'PENDING'
                ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
                : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
            )}
          >
            {profile.status}
          </span>
          <button
            type="button"
            onClick={handleExportPdf}
            disabled={exporting}
            className="inline-flex items-center gap-2 rounded-full border border-brand-400/30 bg-brand-500 px-4 py-2 text-xs font-semibold text-white shadow-glow transition hover:bg-brand-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {exporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
            Export Profile to PDF
          </button>
        </div>
      </div>

      <motion.div
        initial={false}
        animate={{ height: expanded ? 'auto' : 0, opacity: expanded ? 1 : 0 }}
        transition={{ duration: 0.25, ease: 'easeInOut' }}
        className="overflow-hidden border-t border-white/60 dark:border-white/10"
      >
        {expanded ? (
          <div className="space-y-4 p-4 sm:p-5">
            <DetailSection title="Basic details">
              <Row label="Legal name" value={dossier.basic.fullLegalName} />
              <Row label="Email" value={dossier.basic.email} />
              <Row label="UK phone" value={dossier.basic.ukPhone} />
              <Row label="Postal code" value={dossier.basic.postalCode} />
              <Row label="Date of birth" value={dossier.basic.dateOfBirth} />
              <Row label="Current address" value={dossier.basic.currentAddress} />
              <Row label="3-year address history" value={dossier.basic.addressHistory3Years} />
              {Number(profile.target_amount ?? 0) > 0 ? (
                <Row label="Target amount" value={formatCurrency(profile.target_amount)} />
              ) : null}
              <Row label="Expected interest rate" value={formatInterestRate(profile.expected_interest_rate)} />
            </DetailSection>

            <DetailSection title="Identity & AML">
              <Row label="ID type" value={dossier.identity.proofOfIdentityType} />
              <Row label="Liveness captured" value={dossier.identity.documents.livenessVideo ? 'Yes' : 'No'} />
            </DetailSection>

            <DetailSection title="Onboarding questionnaire">
              <div className="space-y-2">
                {questionnaireRows.map((row) => (
                  <Row key={row.question} label={row.question} value={row.answer} />
                ))}
              </div>
            </DetailSection>

            <DetailSection title="Submitted documents">
              <DocumentViewer documents={documents} resolveUrl={resolveDocumentUrl} />
            </DetailSection>

            {(profile.role === 'INVESTOR' || dossier.accountRole === 'lender') && dossier.lender && (
              <DetailSection title="Investor (Lender)">
                <Row label="Category" value={dossier.lender.investorCategory} />
                <div className="my-3 space-y-2 border-l-2 border-brand-500 pl-3 text-sm">
                  <p className="text-xs font-bold uppercase text-neutral-500">FCA Appropriateness Test</p>
                  {fcaAnswersToRows(dossier.fcaTestAnswers).length > 0 ? (
                    <ul className="space-y-2 text-neutral-800 dark:text-neutral-200">
                      {fcaAnswersToRows(dossier.fcaTestAnswers).map((row) => (
                        <li key={row.question}>
                          <span className="block text-neutral-600 dark:text-neutral-400">{row.question}</span>
                          <span className="font-bold text-brand-600">{row.answer}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-neutral-500">No FCA answers recorded.</p>
                  )}
                </div>
                <Row label="Source of funds" value={dossier.lender.sourceOfFunds} />
                <Row label="Sort code" value={dossier.lender.bankSortCode} />
                <Row label="Account number" value={dossier.lender.bankAccountNumber} />
              </DetailSection>
            )}

            {(profile.role === 'BORROWER' || dossier.accountRole === 'borrower') && dossier.borrower && (
              <DetailSection title="Borrower">
                <Row label="Purpose of loan" value={dossier.borrower.purposeOfLoan} />
                <Row label="Employment" value={dossier.borrower.employmentStatus} />
                <Row label="Annual income" value={formatCurrency(dossier.borrower.annualIncome)} />
                <Row
                  label="Affordability assessment"
                  value={
                    [
                      dossier.borrower.openBankingConsent ? 'Open banking consent' : null,
                      dossier.borrower.creditCheckConsent ? 'Credit check consent' : null,
                      dossier.borrower.hasIncomeVerification ? 'Income verification uploaded' : null,
                    ]
                      .filter(Boolean)
                      .join(' · ') || '—'
                  }
                />
                <Row label="Rent/EMI" value={formatCurrency(dossier.borrower.monthlyRentOrEmi)} />
                <Row label="Other expenses" value={formatCurrency(dossier.borrower.otherMonthlyExpenses)} />
              </DetailSection>
            )}

            {showActions && (
              <div className="flex flex-wrap gap-3 pt-2">
                <button
                  type="button"
                  disabled={isReviewing}
                  onClick={onApprove}
                  className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-60"
                >
                  {isReviewing ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                  Accept
                </button>
                <button
                  type="button"
                  disabled={isReviewing}
                  onClick={onReject}
                  className="inline-flex items-center gap-2 rounded-full border border-red-300 bg-red-50 px-5 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:opacity-60 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300"
                >
                  {isReviewing ? <Loader2 size={16} className="animate-spin" /> : <X size={16} />}
                  Reject
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="p-4 text-center text-sm text-neutral-500 dark:text-neutral-400">
            No KYC data available for this profile.
          </div>
        )}
      </motion.div>

      <div ref={dossierRef} aria-hidden className="pointer-events-none fixed left-[-12000px] top-0 w-[900px] bg-[#f5f0e6] p-8 text-[#111111]">
        <div className="space-y-6">
          <div className="border-b border-black/10 pb-4">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-brand-500">Oxyile Compliance Dossier</p>
            <h2 className="mt-2 text-3xl font-black text-black">{dossier.basic.fullLegalName}</h2>
            <p className="mt-1 text-sm text-black/70">{dossier.basic.email}</p>
            <p className="mt-2 text-xs font-semibold uppercase tracking-[0.22em] text-black/55">
              {profile.role} · {profile.status} · {dossier.submittedAt ? new Date(dossier.submittedAt).toLocaleString('en-GB') : '—'}
            </p>
          </div>

          <div className="grid gap-4">
            <section className="rounded-2xl border border-black/10 bg-white p-5">
              <h3 className="text-sm font-bold uppercase tracking-[0.24em] text-brand-500">Basic details</h3>
              <div className="mt-4 grid gap-2 text-sm">
                <p><span className="font-semibold">Legal name:</span> {dossier.basic.fullLegalName}</p>
                <p><span className="font-semibold">Email:</span> {dossier.basic.email}</p>
                <p><span className="font-semibold">UK phone:</span> {dossier.basic.ukPhone}</p>
                <p><span className="font-semibold">DOB:</span> {dossier.basic.dateOfBirth}</p>
                <p><span className="font-semibold">Current address:</span> {dossier.basic.currentAddress}</p>
                <p><span className="font-semibold">3-year history:</span> {dossier.basic.addressHistory3Years}</p>
                {Number(profile.target_amount ?? 0) > 0 ? (
                  <p><span className="font-semibold">Target amount:</span> {formatCurrency(profile.target_amount)}</p>
                ) : null}
                <p>
                  <span className="font-semibold">Expected interest rate:</span>{' '}
                  {formatInterestRate(profile.expected_interest_rate)}
                </p>
              </div>
            </section>

            <section className="rounded-2xl border border-black/10 bg-white p-5">
              <h3 className="text-sm font-bold uppercase tracking-[0.24em] text-brand-500">Identity & AML</h3>
              <div className="mt-4 grid gap-2 text-sm">
                <p><span className="font-semibold">ID type:</span> {dossier.identity.proofOfIdentityType}</p>
                <p><span className="font-semibold">Proof of identity:</span> {dossier.identity.documents.proofOfIdentity ? 'Uploaded' : 'Missing'}</p>
                <p><span className="font-semibold">Liveness video:</span> {dossier.identity.documents.livenessVideo ? 'Uploaded' : 'Missing'}</p>
                <p><span className="font-semibold">Proof of address:</span> {dossier.identity.documents.proofOfAddress ? 'Uploaded' : 'Missing'}</p>
              </div>
            </section>

            {(profile.role === 'INVESTOR' || dossier.accountRole === 'lender') && dossier.lender && (
              <section className="rounded-2xl border border-black/10 bg-white p-5">
                <h3 className="text-sm font-bold uppercase tracking-[0.24em] text-brand-500">Investor</h3>
                <div className="mt-4 grid gap-2 text-sm">
                  <p><span className="font-semibold">Category:</span> {dossier.lender.investorCategory}</p>
                  <div className="my-3 space-y-1 text-sm border-l-2 border-brand-500 pl-3">
                    <p className="text-xs font-bold text-neutral-500 uppercase">Appropriateness Test Details:</p>
                    <ul className="space-y-1 text-neutral-800 dark:text-neutral-200">
                      <li>
                        1. Understand capital is at risk? <span className="font-bold text-brand-600">
                          {dossier.lender.appropriatenessAnswers[0] === 0
                            ? 'Yes'
                            : dossier.lender.appropriatenessAnswers[0] === 1
                              ? 'No'
                              : '—'}
                        </span>
                      </li>
                      <li>
                        2. Understand lack of FSCS protection? <span className="font-bold text-brand-600">
                          {dossier.lender.appropriatenessAnswers[1] === 0
                            ? 'Yes'
                            : dossier.lender.appropriatenessAnswers[1] === 1
                              ? 'No'
                              : '—'}
                        </span>
                      </li>
                      <li>
                        3. Understand investments are illiquid? <span className="font-bold text-brand-600">
                          {dossier.lender.appropriatenessAnswers[2] === 0
                            ? 'Yes'
                            : dossier.lender.appropriatenessAnswers[2] === 1
                              ? 'No'
                              : '—'}
                        </span>
                      </li>
                    </ul>
                  </div>
                  <p><span className="font-semibold">Source of funds:</span> {dossier.lender.sourceOfFunds}</p>
                  <p><span className="font-semibold">Bank sort code:</span> {dossier.lender.bankSortCode}</p>
                  <p><span className="font-semibold">Account number:</span> {dossier.lender.bankAccountNumber}</p>
                </div>
              </section>
            )}

            {(profile.role === 'BORROWER' || dossier.accountRole === 'borrower') && dossier.borrower && (
              <section className="rounded-2xl border border-black/10 bg-white p-5">
                <h3 className="text-sm font-bold uppercase tracking-[0.24em] text-brand-500">Borrower</h3>
                <div className="mt-4 grid gap-2 text-sm">
                  <p><span className="font-semibold">Purpose of loan:</span> {dossier.borrower.purposeOfLoan}</p>
                  <p><span className="font-semibold">Employment:</span> {dossier.borrower.employmentStatus}</p>
                  <p><span className="font-semibold">Annual income:</span> {formatCurrency(dossier.borrower.annualIncome)}</p>
                  <p><span className="font-semibold">Open banking:</span> {formatBoolean(dossier.borrower.openBankingConsent)}</p>
                  <p><span className="font-semibold">Credit check:</span> {formatBoolean(dossier.borrower.creditCheckConsent)}</p>
                  <p><span className="font-semibold">Rent/EMI:</span> {formatCurrency(dossier.borrower.monthlyRentOrEmi)}</p>
                  <p><span className="font-semibold">Other expenses:</span> {formatCurrency(dossier.borrower.otherMonthlyExpenses)}</p>
                  <p><span className="font-semibold">Income verification:</span> {dossier.borrower.hasIncomeVerification ? 'Uploaded' : 'Missing'}</p>
                </div>
              </section>
            )}

            <section className="rounded-2xl border border-black/10 bg-white p-5">
              <h3 className="text-sm font-bold uppercase tracking-[0.24em] text-brand-500">Submitted documents</h3>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {docsForExport.map((document) => (
                  <figure
                    key={`${document.label}-${document.path ?? 'missing'}`}
                    className="pdf-export-block overflow-hidden rounded-2xl border border-black/10 bg-[#111111] text-white"
                    style={{ breakInside: 'avoid', pageBreakInside: 'avoid' }}
                  >
                    <div className="flex min-h-[200px] items-center justify-center bg-black/80 p-2">
                      {document.url && document.kind === 'image' ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          data-export-document
                          src={document.url}
                          alt={document.label}
                          className="max-h-[320px] w-auto max-w-full object-contain"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center p-4 text-center text-sm text-white/80">
                          {document.label}
                        </div>
                      )}
                    </div>
                    <figcaption className="border-t border-white/10 px-4 py-3 text-center text-xs font-bold uppercase tracking-[0.2em] text-brand-300">
                      {document.label}
                    </figcaption>
                  </figure>
                ))}
              </div>
            </section>
          </div>
        </div>
      </div>
    </li>
  );
}

function DetailSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-white/60 bg-white/40 p-3 dark:border-white/10 dark:bg-black/30">
      <h4 className="text-xs font-bold uppercase tracking-wider text-brand-500">{title}</h4>
      <dl className="mt-3 space-y-2">{children}</dl>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-1 gap-1 text-sm sm:grid-cols-[140px_1fr]">
      <dt className="text-neutral-500">{label}</dt>
      <dd className="text-neutral-800 dark:text-neutral-200">{value || '—'}</dd>
    </div>
  );
}

