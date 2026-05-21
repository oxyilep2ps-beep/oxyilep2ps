import { NextResponse } from 'next/server';
import { getSubmissionById, updateSubmissionStatus } from '@/lib/data/kyc-store';
import { sendStatusEmail } from '@/lib/email/send-status-email';
import { UserStatus } from '@/lib/types/user';

type RouteContext = { params: Promise<{ id: string }> };

/**
 * REST scaffold for admin systems / webhooks to update invite-only user status.
 * POST body: { "status": "APPROVED" | "REJECTED", "reviewedBy"?: string }
 */
export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;

  let body: { status?: string; reviewedBy?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const status = body.status as UserStatus | undefined;
  if (status !== UserStatus.APPROVED && status !== UserStatus.REJECTED) {
    return NextResponse.json(
      { error: 'status must be APPROVED or REJECTED' },
      { status: 400 }
    );
  }

  const existing = await getSubmissionById(id);
  if (!existing) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const updated = await updateSubmissionStatus(id, status, body.reviewedBy);
  if (!updated) {
    return NextResponse.json({ error: 'Update failed' }, { status: 500 });
  }

  const emailResult = await sendStatusEmail({
    to: updated.email,
    fullLegalName: updated.fullLegalName,
    status,
  });

  return NextResponse.json({
    ok: true,
    user: updated,
    email: emailResult,
  });
}

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const user = await getSubmissionById(id);
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }
  return NextResponse.json({ user });
}
