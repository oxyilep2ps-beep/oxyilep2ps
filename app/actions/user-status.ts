'use server';

import { revalidatePath } from 'next/cache';
import { getSubmissionById, updateSubmissionStatus } from '@/lib/data/kyc-store';
import { sendStatusEmail } from '@/lib/email/send-status-email';
import { UserStatus } from '@/lib/types/user';

export type UpdateStatusResult =
  | { success: true; status: UserStatus }
  | { success: false; error: string };

/**
 * Server action: approve or reject a pending KYC submission and notify the user.
 */
export async function updateUserStatusAction(
  userId: string,
  status: UserStatus.APPROVED | UserStatus.REJECTED,
  reviewedBy?: string
): Promise<UpdateStatusResult> {
  if (!userId) {
    return { success: false, error: 'User ID is required.' };
  }

  const existing = await getSubmissionById(userId);
  if (!existing) {
    return { success: false, error: 'Submission not found.' };
  }

  if (existing.status !== UserStatus.PENDING && existing.status !== status) {
    return { success: false, error: `User is already ${existing.status}.` };
  }

  const updated = await updateSubmissionStatus(userId, status, reviewedBy);
  if (!updated) {
    return { success: false, error: 'Failed to update status.' };
  }

  await sendStatusEmail({
    to: updated.email,
    fullLegalName: updated.fullLegalName,
    status,
  });

  revalidatePath('/admin');
  return { success: true, status };
}
