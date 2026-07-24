'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import {
  assertEmailAllowedForEmployeeSignup,
  employeeRoleToProfileRole,
} from '@/lib/auth/allowed-employees';

export async function registerEmployeeAccount(input: {
  email: string;
  password: string;
  confirmPassword: string;
}): Promise<{ ok: boolean; error?: string }> {
  const email = input.email.trim().toLowerCase();
  const password = input.password;
  const confirmPassword = input.confirmPassword;

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

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_legal_name: email.split('@')[0],
      role: profileRole,
      account_role: employeeRole,
      staff_employee: true,
    },
  });

  if (error) {
    // Fall back to public signUp when admin create is unavailable / user exists path
    if (/already|registered|exists/i.test(error.message)) {
      return { ok: false, error: 'An account with this email already exists. Please sign in.' };
    }
    return { ok: false, error: error.message };
  }

  if (data.user?.id) {
    await admin.from('profiles').upsert(
      {
        id: data.user.id,
        email,
        full_legal_name: email.split('@')[0] ?? profileRole,
        role: profileRole,
        status: 'APPROVED',
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    );

    await admin.from('platform_access').upsert(
      {
        email,
        role: profileRole,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'email' }
    );
  }

  return { ok: true };
}
