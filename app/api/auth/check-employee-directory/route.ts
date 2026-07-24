import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAllowedEmployeeRole } from '@/lib/auth/allowed-employees';
import { isAdminEmail } from '@/lib/auth/routing';

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return NextResponse.json({ ok: false, error: 'Not signed in.' }, { status: 401 });
  }

  // Hardcoded platform admins always pass.
  if (isAdminEmail(user.email)) {
    return NextResponse.json({ ok: true, role: 'admin' });
  }

  const role = await getAllowedEmployeeRole(user.email);
  if (!role) {
    return NextResponse.json(
      { ok: false, error: 'Unauthorized: Your email is not added in the employee directory.' },
      { status: 403 }
    );
  }

  return NextResponse.json({ ok: true, role });
}
