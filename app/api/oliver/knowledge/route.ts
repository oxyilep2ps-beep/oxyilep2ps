import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET() {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from('bot_knowledge')
      .select('keyword_string, answer_text')
      .order('created_at', { ascending: true });

    if (error) return NextResponse.json({ entries: [] });
    return NextResponse.json({ entries: data ?? [] });
  } catch {
    return NextResponse.json({ entries: [] });
  }
}
