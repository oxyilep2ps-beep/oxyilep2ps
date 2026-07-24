'use server';

import { runRegisterWithDocs, type RegisterWithDocsResult } from '@/lib/auth/register-with-docs';

/**
 * Server Action wrapper — never throws across the Server/Client boundary.
 * Prefer `/api/auth/register` for large multipart KYC uploads (more reliable).
 */
export async function registerUserWithDocs(formData: FormData): Promise<RegisterWithDocsResult> {
  try {
    return await runRegisterWithDocs(formData);
  } catch (error: unknown) {
    console.error('🚨 SERVER ACTION CRASHED:', error);
    const message =
      error && typeof error === 'object' && 'message' in error
        ? String((error as { message?: unknown }).message || 'Unknown internal server error')
        : 'Unknown internal server error';
    return { success: false, error: message };
  }
}
