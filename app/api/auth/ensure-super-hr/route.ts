import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isSuperHrEmail } from '@/lib/auth/routing';

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email || !isSuperHrEmail(user.email)) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  const admin = createAdminClient();
  const fullLegalName =
    (typeof user.user_metadata?.full_legal_name === 'string' && user.user_metadata.full_legal_name.trim()) ||
    (typeof user.user_metadata?.name === 'string' && user.user_metadata.name.trim()) ||
    user.email.split('@')[0] ||
    'HR Tester';

  const { error } = await admin.from('profiles').upsert(
    {
      id: user.id,
      email: user.email,
      full_legal_name: fullLegalName,
      role: 'HR',
      status: 'APPROVED',
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'id' }
  );

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
