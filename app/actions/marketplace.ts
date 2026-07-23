'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { COLLATERAL_TYPES } from '@/lib/collateral/constants';
import { uploadCollateralProof } from '@/lib/collateral/upload';
import { calculateFlatEmi } from '@/lib/handshake/calculations';
import { sendGuarantorInvite } from '@/lib/guarantor/invite';
import { FIXED_INTEREST_RATE } from '@/lib/platform/constants';
import type { MarketplaceHandshakeRow } from '@/lib/types/marketplace-handshake';

const TENURE_OPTIONS = [6, 12, 24, 36] as const;

function normalizeGuarantorStatus(
  status: string | null | undefined
): MarketplaceHandshakeRow['guarantor_status'] {
  const normalized = (status ?? 'none').toLowerCase();
  switch (normalized) {
    case 'invited':
    case 'accepted':
    case 'rejected':
      return normalized;
    case 'pending':
      return 'invited';
    case 'verified':
    case 'signed':
      return 'accepted';
    default:
      return 'none';
  }
}

function mapRow(row: Record<string, unknown>): MarketplaceHandshakeRow {
  return {
    id: row.id as string,
    borrower_id: row.borrower_id as string,
    investor_id: (row.lender_id as string | null) ?? null,
    loan_amount: Number(row.amount),
    tenure_months: Number(row.duration),
    interest_rate: Number(row.rate ?? FIXED_INTEREST_RATE),
    emi_amount: Number(row.emi_amount ?? 0),
    collateral_type: String(row.collateral_type ?? ''),
    collateral_value: Number(row.collateral_value ?? 0),
    collateral_description: String(row.collateral_description ?? ''),
    collateral_proof_url: String(row.collateral_proof_url ?? ''),
    status: row.status as MarketplaceHandshakeRow['status'],
    gocardless_mandate_id: (row.gocardless_mandate_id as string | null) ?? null,
    smart_contract_address: (row.smart_contract_address as string | null) ?? null,
    next_emi_date: (row.next_emi_date as string | null) ?? null,
    tx_hash: (row.tx_hash as string | null) ?? null,
    payment_id: (row.payment_id as string | null) ?? null,
    guarantor_email: (row.guarantor_email as string | null) ?? null,
    guarantor_status: normalizeGuarantorStatus(row.guarantor_status as string | null | undefined),
    created_at: row.created_at as string,
  };
}

async function loadBorrowerProfile(userId: string): Promise<{ full_legal_name: string | null }> {
  const admin = createAdminClient();
  const { data } = await admin.from('profiles').select('full_legal_name').eq('id', userId).maybeSingle();
  return { full_legal_name: (data?.full_legal_name as string | null) ?? null };
}

export async function applyForMarketplaceLoan(formData: FormData): Promise<{ ok: boolean; error?: string; id?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ok: false, error: 'Sign in to apply for a loan.' };

  const { data: profile } = await supabase.from('profiles').select('role, status').eq('id', user.id).maybeSingle();
  if (!profile || profile.role !== 'BORROWER') {
    return { ok: false, error: 'Only approved borrowers can submit loan applications.' };
  }

  const loanAmount = Number(formData.get('loan_amount'));
  const tenureMonths = Number(formData.get('tenure_months'));
  const collateralType = formData.get('collateral_type')?.toString().trim() ?? '';
  const collateralValue = Number(formData.get('collateral_value'));
  const collateralDescription = formData.get('collateral_description')?.toString().trim() ?? '';
  const proofFile = formData.get('collateral_proof');
  const guarantorEmail = formData.get('guarantor_email')?.toString().trim().toLowerCase() ?? '';

  if (!loanAmount || loanAmount <= 0) return { ok: false, error: 'Enter a valid loan amount.' };
  if (guarantorEmail && !guarantorEmail.includes('@')) {
    return { ok: false, error: 'Enter a valid guarantor email or leave the field empty.' };
  }
  if (!TENURE_OPTIONS.includes(tenureMonths as (typeof TENURE_OPTIONS)[number])) {
    return { ok: false, error: 'Select a valid tenure (6, 12, 24, or 36 months).' };
  }
  if (!collateralType || !COLLATERAL_TYPES.includes(collateralType as (typeof COLLATERAL_TYPES)[number])) {
    return { ok: false, error: 'Select a collateral type.' };
  }
  if (!collateralValue || collateralValue <= 0) return { ok: false, error: 'Enter a valid collateral value.' };
  if (!collateralDescription) return { ok: false, error: 'Collateral description is required.' };
  if (!(proofFile instanceof File) || proofFile.size === 0) {
    return { ok: false, error: 'Upload proof of ownership.' };
  }

  try {
    const admin = createAdminClient();
    const proofPath = await uploadCollateralProof(admin, proofFile, user.id);
    const { emi_amount, total_repayment } = calculateFlatEmi(loanAmount, tenureMonths, FIXED_INTEREST_RATE);
    const borrowerProfile = await loadBorrowerProfile(user.id);

    const { data, error } = await supabase
      .from('handshakes')
      .insert({
        borrower_id: user.id,
        lender_id: null,
        amount: loanAmount,
        rate: FIXED_INTEREST_RATE,
        duration: tenureMonths,
        emi_amount,
        total_return: total_repayment,
        collateral_type: collateralType,
        collateral_value: collateralValue,
        collateral_description: collateralDescription,
        collateral_proof_url: proofPath,
        collateral_status: 'pending',
        asset_declared_value: collateralValue,
        asset_approved_value: 0,
        max_ltv_amount: 0,
        collateral_docs_url: proofPath,
        status: 'PENDING',
        marketplace: true,
        guarantor_email: guarantorEmail || null,
        guarantor_status: guarantorEmail ? 'invited' : 'none',
      })
      .select('id')
      .single();

    if (error) return { ok: false, error: error.message };

    if (guarantorEmail) {
      await sendGuarantorInvite({
        loanId: data.id as string,
        guarantorEmail,
        borrowerName: borrowerProfile.full_legal_name ?? undefined,
        amount: loanAmount,
        emiAmount: emi_amount,
      });
    }

    revalidatePath('/dashboard/apply');
    revalidatePath('/dashboard/marketplace');
    revalidatePath('/admin-dashboard/handshakes');
    return { ok: true, id: data.id as string };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Could not submit application.' };
  }
}

export async function inviteGuarantor(
  loanId: string,
  guarantorEmail: string
): Promise<{ ok: boolean; error?: string; inviteUrl?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ok: false, error: 'Sign in required.' };

  const loan = loanId.trim();
  const email = guarantorEmail.trim().toLowerCase();
  if (!loan) return { ok: false, error: 'loanId is required.' };
  if (!email || !email.includes('@')) return { ok: false, error: 'Enter a valid guarantor email.' };

  const admin = createAdminClient();
  const { data: handshake, error } = await admin
    .from('handshakes')
    .select('id, borrower_id, amount, emi_amount, guarantor_status')
    .eq('id', loan)
    .maybeSingle();

  if (error || !handshake) {
    return { ok: false, error: 'Loan not found.' };
  }

  if (handshake.borrower_id !== user.id) {
    return { ok: false, error: 'Only the borrower can invite a guarantor.' };
  }

  const { error: updateError } = await admin
    .from('handshakes')
    .update({
      guarantor_email: email,
      guarantor_status: 'invited',
    })
    .eq('id', loan);

  if (updateError) {
    return { ok: false, error: updateError.message };
  }

  const borrowerProfile = await loadBorrowerProfile(user.id);
  const invite = await sendGuarantorInvite({
    loanId: loan,
    guarantorEmail: email,
    borrowerName: borrowerProfile.full_legal_name ?? undefined,
    amount: Number(handshake.amount ?? 0),
    emiAmount: Number(handshake.emi_amount ?? 0) || undefined,
  });

  revalidatePath('/dashboard/apply');
  revalidatePath('/dashboard/marketplace');
  revalidatePath('/admin-dashboard/handshakes');

  return { ok: true, inviteUrl: invite.inviteUrl };
}

export async function listMarketplaceOpportunities(): Promise<{ rows: MarketplaceHandshakeRow[]; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { rows: [], error: 'Sign in required.' };

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
  if (!profile || profile.role !== 'INVESTOR') {
    return { rows: [], error: 'Only investors can browse the marketplace.' };
  }

  const { data, error } = await supabase
    .from('handshakes')
    .select(
      'id, borrower_id, lender_id, amount, duration, rate, emi_amount, collateral_type, collateral_value, collateral_description, collateral_proof_url, status, gocardless_mandate_id, smart_contract_address, next_emi_date, tx_hash, payment_id, guarantor_email, guarantor_status, created_at'
    )
    .eq('marketplace', true)
    .eq('status', 'PENDING')
    .eq('collateral_status', 'verified')
    .is('lender_id', null)
    .order('created_at', { ascending: false });

  if (error) return { rows: [], error: error.message };
  return { rows: (data ?? []).map((row) => mapRow(row as Record<string, unknown>)) };
}

export async function fundMarketplaceLoan(handshakeId: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ok: false, error: 'Sign in required.' };

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
  if (!profile || profile.role !== 'INVESTOR') {
    return { ok: false, error: 'Only investors can fund loans.' };
  }

  const nextEmi = new Date();
  nextEmi.setMonth(nextEmi.getMonth() + 1);

  const { data, error } = await supabase
    .from('handshakes')
    .update({
      lender_id: user.id,
      status: 'MATCHED',
      next_emi_date: nextEmi.toISOString(),
    })
    .eq('id', handshakeId)
    .eq('marketplace', true)
    .eq('status', 'PENDING')
    .eq('collateral_status', 'verified')
    .is('lender_id', null)
    .select('id')
    .maybeSingle();

  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: 'This opportunity is no longer available.' };

  revalidatePath('/dashboard/marketplace');
  revalidatePath('/admin-dashboard/handshakes');
  return { ok: true };
}

export { TENURE_OPTIONS };
