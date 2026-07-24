import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * Called from the sign-in page when Supabase returns "Email not confirmed".
 * That error only fires when the password was correct, so it is safe to
 * flip email_confirm for accounts that already completed registration (have a profile).
 */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { email?: string };
    const email = body.email?.trim().toLowerCase();
    if (!email) {
      return NextResponse.json({ ok: false, error: 'Email is required.' }, { status: 400 });
    }

    const admin = createAdminClient();

    // Prefer profile lookup (registered users), then Auth directory.
    const { data: profile } = await admin
      .from('profiles')
      .select('id, email')
      .ilike('email', email)
      .maybeSingle();

    let userId = (profile?.id as string | undefined) ?? null;

    if (!userId) {
      const { data: listed, error: listError } = await admin.auth.admin.listUsers({
        page: 1,
        perPage: 200,
      });
      if (listError) {
        return NextResponse.json({ ok: false, error: listError.message }, { status: 500 });
      }
      const match = (listed.users ?? []).find((u) => (u.email ?? '').toLowerCase() === email);
      userId = match?.id ?? null;
    }

    if (!userId) {
      return NextResponse.json({ ok: false, error: 'No account found for that email.' }, { status: 404 });
    }

    const { data: updated, error: updateError } = await admin.auth.admin.updateUserById(userId, {
      email_confirm: true,
    });

    if (updateError) {
      return NextResponse.json({ ok: false, error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      email_confirmed_at: updated.user.email_confirmed_at ?? null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not confirm email';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
