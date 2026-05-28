import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      name?: string;
      email?: string;
      subject?: string;
      description?: string;
      priority?: 'low' | 'normal' | 'high';
    };

    if (!body.name?.trim() || !body.email?.includes('@') || !body.subject?.trim() || !body.description?.trim()) {
      return NextResponse.json({ ok: false, error: 'All fields are required' }, { status: 400 });
    }

    const admin = createAdminClient();
    const { error } = await admin.from('complaints').insert({
      name: body.name.trim(),
      email: body.email.trim(),
      subject: body.subject.trim(),
      description: body.description.trim(),
      priority: body.priority ?? 'normal',
    });

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : 'Failed to submit complaint' },
      { status: 500 }
    );
  }
}
