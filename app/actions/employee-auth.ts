'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import {
  assertEmailAllowedForEmployeeSignup,
  employeeRoleToProfileRole,
} from '@/lib/auth/allowed-employees';

function formatDbError(error: unknown, fallback: string): string {
  if (!error || typeof error !== 'object') {
    return error instanceof Error ? error.message : fallback;
  }

  const record = error as {
    message?: string;
    details?: string;
    hint?: string;
    code?: string;
  };

  const parts = [record.message, record.details, record.hint, record.code ? `code=${record.code}` : null]
    .map((part) => (typeof part === 'string' ? part.trim() : ''))
    .filter(Boolean);

  return parts.length > 0 ? parts.join(' | ') : fallback;
}

/**
 * Staff signup for emails listed in public.allowed_employees.
 * Creates Auth user → profiles row (via trigger + upsert) → platform_access grant.
 */
export async function registerEmployeeAccount(input: {
  email: string;
  password: string;
  confirmPassword: string;
}): Promise<{ ok: boolean; error?: string }> {
  const email = input.email.trim().toLowerCase();
  const password = input.password;
  const confirmPassword = input.confirmPassword;

  try {
    if (!email.includes('@')) {
      return { ok: false, error: 'Enter a valid email address.' };
    }
    if (password.length < 8) {
      return { ok: false, error: 'Password must be at least 8 characters.' };
    }
    if (password !== confirmPassword) {
      return { ok: false, error: 'Passwords do not match.' };
    }

    let employeeRole;
    try {
      employeeRole = await assertEmailAllowedForEmployeeSignup(email);
    } catch (e) {
      return {
        ok: false,
        error: e instanceof Error ? e.message : 'Unauthorized: Your email is not added in the employee directory.',
      };
    }

    const profileRole = employeeRoleToProfileRole(employeeRole);
    const admin = createAdminClient();
    const displayName = email.split('@')[0] || profileRole;

    // Ensure platform_access exists BEFORE auth.createUser so handle_new_user
    // can resolve ADMIN/HR/BLOGGER without relying only on metadata.
    const { error: accessError } = await admin.from('platform_access').upsert(
      {
        email,
        role: profileRole,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'email' }
    );

    if (accessError) {
      console.error('🚨 EMPLOYEE SIGNUP CRASH (platform_access):', accessError.message, accessError.details, accessError.hint);
      return {
        ok: false,
        error: `DB Error: ${formatDbError(accessError, 'Failed to grant staff platform access')}`,
      };
    }

    // Keep directory row in sync (email already allowed, but role may have drifted).
    const { error: directoryError } = await admin.from('allowed_employees').upsert(
      { email, role: employeeRole },
      { onConflict: 'email' }
    );

    if (directoryError) {
      console.error('🚨 EMPLOYEE SIGNUP CRASH (allowed_employees):', directoryError.message, directoryError.details, directoryError.hint);
      return {
        ok: false,
        error: `DB Error: ${formatDbError(directoryError, 'Failed to sync employee directory')}`,
      };
    }

    console.info('[employee-signup] admin.createUser', { email, profileRole, employeeRole });

    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_legal_name: displayName,
        role: profileRole,
        account_role: employeeRole,
        staff_employee: true,
      },
      app_metadata: {
        account_role: employeeRole,
        staff_employee: true,
      },
    });

    if (error) {
      console.error('🚨 EMPLOYEE SIGNUP CRASH (auth.createUser):', error.message, (error as { status?: number }).status);
      if (/already|registered|exists/i.test(error.message)) {
        return { ok: false, error: 'An account with this email already exists. Please sign in.' };
      }
      return {
        ok: false,
        error: `DB Error: ${error.message || 'Failed to create staff Auth account'}`,
      };
    }

    const userId = data.user?.id ? String(data.user.id) : null;
    if (!userId) {
      console.error('🚨 EMPLOYEE SIGNUP CRASH: createUser returned no user id', data);
      return { ok: false, error: 'DB Error: Auth user was created without an id.' };
    }

    // Explicit profile upsert — maps auth userId → public.profiles with required columns.
    const { error: profileError } = await admin.from('profiles').upsert(
      {
        id: userId,
        email,
        full_legal_name: displayName,
        role: profileRole,
        status: 'APPROVED',
        expected_interest_rate: 0,
        target_amount: 0,
        collateral_value: 0,
        account_status: 'active',
        kyc_data: {
          accountRole: 'staff',
          staff: { employeeRole, profileRole },
          submittedAt: new Date().toISOString(),
        },
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    );

    if (profileError) {
      console.error('🚨 EMPLOYEE SIGNUP CRASH (profiles upsert):', profileError.message, profileError.details, profileError.hint);
      // Roll back orphan auth user so signup can be retried cleanly.
      try {
        await admin.auth.admin.deleteUser(userId);
      } catch (rollbackError) {
        console.error('🚨 EMPLOYEE SIGNUP rollback failed:', rollbackError);
      }
      return {
        ok: false,
        error: `DB Error: ${formatDbError(profileError, 'Failed to create staff profile')}`,
      };
    }

    console.info('[employee-signup] success', { userId, email, profileRole });
    return { ok: true };
  } catch (error: unknown) {
    const record = error as { message?: string; details?: string; hint?: string };
    console.error('🚨 EMPLOYEE SIGNUP CRASH:', record.message, record.details, record.hint, error);
    return {
      ok: false,
      error: `DB Error: ${formatDbError(error, 'Failed to create staff account')}`,
    };
  }
}
