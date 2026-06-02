import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET() {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from('platform_settings')
      .select('emergency_kill_switch_active')
      .eq('id', 1)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ emergencyPause: false });
    }

    return NextResponse.json({
      emergencyPause: Boolean(data?.emergency_kill_switch_active),
    });
  } catch {
    return NextResponse.json({ emergencyPause: false });
  }
}
