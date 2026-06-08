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

  const admin = createAdminClient();
  const documents = await uploadAllKycDocuments(admin, userId, files);
  const kyc_data = buildStoredKycData(kyc, documents);
  const profileRole = mapWizardRoleToProfileRole(kyc.role);
  const fcaTestAnswers =
    kyc.role === 'lender' && kyc.lender
      ? buildFcaTestAnswers(kyc.lender.appropriatenessAnswers)
      : {};

  const { error: profileError } = await admin.from('profiles').upsert(
    {
      id: userId,
      full_legal_name: fullLegalName,
      email,
      role: profileRole,
      status: 'PENDING',
      postal_code: kyc.basic.postalCode?.trim().toUpperCase() ?? null,
      fca_test_answers: fcaTestAnswers,
      proof_of_identity_url: documents.proofOfIdentity ?? null,
      liveness_video_url: documents.livenessVideo ?? null,
      proof_of_address_url: documents.proofOfAddress ?? null,
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
    .select('id, email, full_legal_name, role, status, kyc_data, created_at, updated_at')
    .eq('id', userId)
    .maybeSingle();

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, profile, documents }, { status: 201 });
}
