import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { uploadAllKycDocuments, type WizardUploadFiles } from '@/lib/kyc/upload';
import { buildStoredKycData, mapWizardRoleToProfileRole } from '@/lib/kyc/build-stored-kyc';
import { buildFcaTestAnswers } from '@/lib/kyc/fca-answers';
import { createSubmission } from '@/lib/data/kyc-store';
import { FIXED_INTEREST_RATE } from '@/lib/platform/constants';
import type { KycSubmissionPayload } from '@/lib/types/kyc';

function toFile(value: FormDataEntryValue | null): File | null {
  return value instanceof File && value.size > 0 ? value : null;
}

export async function POST(request: Request) {
  let formData: FormData;

  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 });
  }

  const userId = formData.get('userId')?.toString().trim();
  const email = formData.get('email')?.toString().trim();
  const fullLegalName = formData.get('fullLegalName')?.toString().trim();
  const kycJson = formData.get('kyc')?.toString();
  if (!userId || !email || !fullLegalName || !kycJson) {
    return NextResponse.json(
      { error: 'userId, email, fullLegalName, and kyc are required' },
      { status: 400 }
    );
  }

  let kyc: KycSubmissionPayload;
  try {
    kyc = JSON.parse(kycJson) as KycSubmissionPayload;
  } catch {
    return NextResponse.json({ error: 'Invalid kyc payload' }, { status: 400 });
  }

  const files: WizardUploadFiles = {
    proofOfIdentity: toFile(formData.get('proofOfIdentity')),
    livenessVideo: toFile(formData.get('livenessVideo')),
    proofOfAddress: toFile(formData.get('proofOfAddress')),
    incomeVerification: toFile(formData.get('incomeVerification')),
  };

  if (!files.proofOfIdentity || !files.livenessVideo || !files.proofOfAddress) {
    return NextResponse.json(
      {
        error:
          'Proof of identity, liveness video, and proof of address files are required before account data can be saved.',
      },
      { status: 400 }
    );
  }

  const admin = createAdminClient();

  // CRITICAL: uploads must succeed BEFORE profile upsert so Admin Portal has document paths.
  let documents;
  try {
    documents = await uploadAllKycDocuments(admin, userId, files);
  } catch (uploadError) {
    return NextResponse.json(
      {
        error:
          uploadError instanceof Error
            ? uploadError.message
            : 'KYC document upload failed. Please try again.',
      },
      { status: 500 }
    );
  }

  if (!documents.proofOfIdentity || !documents.livenessVideo || !documents.proofOfAddress) {
    return NextResponse.json(
      { error: 'One or more KYC documents failed to upload. Please retry.' },
      { status: 500 }
    );
  }

  const kyc_data = buildStoredKycData(kyc, documents);
  const profileRole = mapWizardRoleToProfileRole(kyc.role);
  const fcaTestAnswers =
    kyc.role === 'lender' && kyc.lender
      ? buildFcaTestAnswers(kyc.lender.appropriatenessAnswers)
      : {};

  const { data: existing } = await admin.from('profiles').select('role, is_investor, is_borrower').eq('id', userId).maybeSingle();
  const existingRole = String(existing?.role ?? '').toUpperCase();
  const staffRoles = new Set(['ADMIN', 'HR', 'BLOGGER', 'SOCIAL_MANAGER', 'EMPLOYEE']);
  // Preserve staff system roles; attach financial capabilities instead of overwriting role.
  const nextRole = staffRoles.has(existingRole) ? existingRole : profileRole;

  // Anti-arbitrage: cannot add investor capability while holding active borrower loans.
  if (kyc.role === 'lender') {
    const { data: blocking } = await admin
      .from('handshakes')
      .select('id')
      .eq('borrower_id', userId)
      .in('status', ['ACTIVE', 'PENDING', 'FUNDED', 'MATCHED'])
      .limit(1);
    if ((blocking ?? []).length > 0) {
      return NextResponse.json(
        {
          error:
            'You currently have an active loan. You must clear all outstanding dues before registering as an Investor.',
        },
        { status: 403 }
      );
    }
  }

  const nextIsInvestor =
    kyc.role === 'lender' || Boolean(existing?.is_investor) || nextRole === 'INVESTOR' || existingRole === 'ADMIN';
  const nextIsBorrower =
    kyc.role === 'borrower' || Boolean(existing?.is_borrower) || nextRole === 'BORROWER' || existingRole === 'ADMIN';

  const { error: profileError } = await admin.from('profiles').upsert(
    {
      id: userId,
      full_legal_name: fullLegalName,
      email,
      role: nextRole,
      status: 'PENDING',
      account_status: 'active',
      is_investor: nextIsInvestor,
      is_borrower: nextIsBorrower,
      postal_code: kyc.basic.postalCode?.trim().toUpperCase() ?? null,
      fca_test_answers: fcaTestAnswers,
      proof_of_identity_url: documents.proofOfIdentity,
      liveness_video_url: documents.livenessVideo,
      proof_of_address_url: documents.proofOfAddress,
      income_verification_url: documents.incomeVerification ?? null,
      expected_interest_rate: FIXED_INTEREST_RATE,
      kyc_data,
    },
    { onConflict: 'id' }
  );

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  try {
    await createSubmission(email, fullLegalName, kyc_data);
  } catch {
    // Supabase is primary; file store is secondary
  }

  const { data: profile, error: fetchError } = await admin
    .from('profiles')
    .select(
      'id, email, full_legal_name, role, status, account_status, proof_of_identity_url, liveness_video_url, proof_of_address_url, income_verification_url, kyc_data, created_at, updated_at'
    )
    .eq('id', userId)
    .maybeSingle();

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, profile, documents }, { status: 201 });
}
