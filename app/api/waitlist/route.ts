import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { COLLATERAL_TYPES } from '@/lib/collateral/constants';
import { uploadCollateralProof } from '@/lib/collateral/upload';

type WaitlistPayload = {
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  postal_code?: string;
  role?: 'borrower' | 'investor';
  target_amount?: number;
  expected_interest_rate?: number;
  borrower_source_of_income?: string | null;
  questionnaire_answers?: Record<string, string | boolean>;
  collateral_type?: string | null;
  collateral_value?: number;
  collateral_description?: string | null;
};

async function parseRequest(request: Request): Promise<{
  payload: WaitlistPayload;
  collateralProof: File | null;
}> {
  const contentType = request.headers.get('content-type') ?? '';

  if (contentType.includes('multipart/form-data')) {
    const form = await request.formData();
    const questionnaireRaw = form.get('questionnaire_answers')?.toString() ?? '{}';
    let questionnaire_answers: Record<string, string | boolean> = {};
    try {
      questionnaire_answers = JSON.parse(questionnaireRaw) as Record<string, string | boolean>;
    } catch {
      questionnaire_answers = {};
    }

    const proof = form.get('collateral_proof');
    return {
      payload: {
        name: form.get('name')?.toString(),
        email: form.get('email')?.toString(),
        phone: form.get('phone')?.toString(),
        address: form.get('address')?.toString(),
        postal_code: form.get('postal_code')?.toString(),
        role: form.get('role')?.toString() as 'borrower' | 'investor' | undefined,
        target_amount: Number(form.get('target_amount')),
        expected_interest_rate: Number(form.get('expected_interest_rate')),
        borrower_source_of_income: form.get('borrower_source_of_income')?.toString() ?? null,
        questionnaire_answers,
        collateral_type: form.get('collateral_type')?.toString() ?? null,
        collateral_value: Number(form.get('collateral_value')),
        collateral_description: form.get('collateral_description')?.toString() ?? null,
      },
      collateralProof: proof instanceof File && proof.size > 0 ? proof : null,
    };
  }

  const body = (await request.json()) as WaitlistPayload;
  return { payload: body, collateralProof: null };
}

export async function POST(request: Request) {
  try {
    const { payload: body, collateralProof } = await parseRequest(request);

    if (
      !body.name?.trim() ||
      !body.email?.includes('@') ||
      !body.phone?.trim() ||
      !body.address?.trim() ||
      !body.postal_code?.trim() ||
      !body.role ||
      Number(body.target_amount) <= 0 ||
      Number(body.expected_interest_rate) <= 0
    ) {
      return NextResponse.json(
        { ok: false, error: 'All fields are required, including valid target amount and interest rate' },
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
    let collateralProofPath: string | null = null;

    if (body.role === 'borrower') {
      const collateralType = body.collateral_type?.trim();
      const collateralValue = Number(body.collateral_value);
      const collateralDescription = body.collateral_description?.trim();

      if (
        !collateralType ||
        !COLLATERAL_TYPES.includes(collateralType as (typeof COLLATERAL_TYPES)[number]) ||
        collateralValue <= 0 ||
        !collateralDescription ||
        !collateralProof
      ) {
        return NextResponse.json(
          { ok: false, error: 'Borrower collateral type, value, description, and proof document are required' },
          { status: 400 }
        );
      }

      const folder = `waitlist/${body.email.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_')}`;
      collateralProofPath = await uploadCollateralProof(admin, collateralProof, folder);
    }
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
        expected_interest_rate: Number(body.expected_interest_rate),
        borrower_source_of_income: borrowerSourceOfIncome,
        questionnaire_answers: questionnaireAnswers,
        collateral_type: body.role === 'borrower' ? body.collateral_type?.trim() ?? null : null,
        collateral_value: body.role === 'borrower' ? Number(body.collateral_value) : 0,
        collateral_description: body.role === 'borrower' ? body.collateral_description?.trim() ?? null : null,
        collateral_proof_url: collateralProofPath,
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
