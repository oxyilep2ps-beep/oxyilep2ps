import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

type MetricsPayload = {
  campaignId?: string;
  metrics?: {
    likes?: number;
    comments?: number;
    impressions?: number;
    ctr?: number;
    clicks?: number;
  };
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as MetricsPayload;
    const campaignId = body?.campaignId;
    const metrics = body?.metrics;

    if (!campaignId || !metrics) {
      return NextResponse.json(
        { ok: false, error: 'Invalid payload. Expected { campaignId, metrics }.' },
        { status: 400 }
      );
    }

    const admin = createAdminClient();
    const { data: existing, error: fetchError } = await admin
      .from('social_campaigns')
      .select('metrics')
      .eq('id', campaignId)
      .maybeSingle();

    if (fetchError) {
      return NextResponse.json({ ok: false, error: fetchError.message }, { status: 500 });
    }
    if (!existing) {
      return NextResponse.json({ ok: false, error: 'Campaign not found.' }, { status: 404 });
    }

    const prev = ((existing.metrics ?? {}) as Record<string, unknown>) ?? {};
    const nextMetrics = {
      likes: Number(metrics.likes ?? prev.likes ?? 0),
      comments: Number(metrics.comments ?? prev.comments ?? 0),
      impressions: Number(metrics.impressions ?? prev.impressions ?? 0),
      ctr: Number(metrics.ctr ?? prev.ctr ?? 0),
      clicks: Number(metrics.clicks ?? prev.clicks ?? 0),
    };

    const { error: updateError } = await admin
      .from('social_campaigns')
      .update({ metrics: nextMetrics, updated_at: new Date().toISOString() })
      .eq('id', campaignId);

    if (updateError) {
      return NextResponse.json({ ok: false, error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, campaignId, metrics: nextMetrics });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Failed to process social metrics webhook',
      },
      { status: 500 }
    );
  }
}
