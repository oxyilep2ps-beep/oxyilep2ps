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
      target_amount?: number;
      borrower_source_of_income?: string | null;
      questionnaire_answers?: Record<string, string | boolean>;
    };

    if (
      !body.name?.trim() ||
      !body.email?.includes('@') ||
      !body.phone?.trim() ||
      !body.address?.trim() ||
      !body.postal_code?.trim() ||
      !body.role ||
      Number(body.target_amount) <= 0
    ) {
      return NextResponse.json(
        { ok: false, error: 'All fields are required, including a valid target amount' },
        { status: 400 }
      );
    }

    const rawAnswers = body.questionnaire_answers ?? {};
    const questionnaireAnswers = Object.fromEntries(
      Object.entries(rawAnswers).filter(
        ([key]) => key !== 'Current Company/Employer' && key !== 'current_company'
      )
    );
    const sourceOfIncome = String(questionnaireAnswers['Source of Income'] ?? '').trim();
    const borrowerSourceOfIncome =
      body.role === 'borrower'
        ? (body.borrower_source_of_income?.trim() || sourceOfIncome || null)
        : null;

    if (body.role === 'borrower' && !borrowerSourceOfIncome) {
      return NextResponse.json({ ok: false, error: 'Borrower source of income is required' }, { status: 400 });
    }
    if (body.role === 'investor' && !sourceOfIncome) {
      return NextResponse.json({ ok: false, error: 'Investor source of income is required' }, { status: 400 });
    }

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
        target_amount: Number(body.target_amount),
        borrower_source_of_income: borrowerSourceOfIncome,
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
