import { NextResponse } from 'next/server';
import { createSubmission } from '@/lib/data/kyc-store';
import type { KycSubmissionPayload } from '@/lib/types/kyc';

/**
 * Accepts sanitized KYC JSON (files referenced by flags, not binary in JSON store).
 */
export async function POST(request: Request) {
  let body: {
    email?: string;
    fullLegalName?: string;
    kyc?: KycSubmissionPayload;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!body.email || !body.fullLegalName || !body.kyc) {
    return NextResponse.json(
      { error: 'email, fullLegalName, and kyc are required' },
      { status: 400 }
    );
  }

  const record = await createSubmission(body.email, body.fullLegalName, body.kyc);
  return NextResponse.json({ ok: true, user: record }, { status: 201 });
}
