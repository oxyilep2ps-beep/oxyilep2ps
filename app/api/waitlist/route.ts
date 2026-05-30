import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      name?: string;
      email?: string;
      phone?: string;
      address?: string;
      postal_code?: string;
      role?: 'borrower' | 'investor';
      questionnaire_answers?: Record<string, string | boolean>;
    };

    if (!body.name?.trim() || !body.email?.includes('@') || !body.role) {
      return NextResponse.json({ ok: false, error: 'Name, valid email, and role are required' }, { status: 400 });
    }

    const rawAnswers = body.questionnaire_answers ?? {};
    const questionnaireAnswers = Object.fromEntries(
      Object.entries(rawAnswers).filter(
        ([key]) => key !== 'Current Company/Employer' && key !== 'current_company'
      )
    );

    const admin = createAdminClient();
    const { data, error } = await admin
      .from('waitlist')
      .insert({
        name: body.name.trim(),
        email: body.email.trim().toLowerCase(),
        phone: body.phone?.trim() || null,
        address: body.address?.trim() || null,
        postal_code: body.postal_code?.trim() || null,
        role: body.role,
        questionnaire_answers: questionnaireAnswers,
      })
      .select('id, waitlist_rank')
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ ok: false, error: 'This email is already on the waitlist' }, { status: 409 });
      }
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, id: data.id, waitlist_rank: data.waitlist_rank });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Waitlist submission failed';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
