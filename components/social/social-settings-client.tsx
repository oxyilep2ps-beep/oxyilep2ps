'use client';

import { useEffect, useState, useTransition } from 'react';
import { Loader2, Zap } from 'lucide-react';
import { getSocialWebhookHealth, sendTestSocialWebhook } from '@/app/actions/social-campaigns';
import { AuthToast } from '@/components/auth-toast';
import type { WebhookHealth } from '@/lib/social/types';
import { cn } from '@/lib/utils';

function StatusPill({ status }: { status: 'connected' | 'pending' }) {
  return (
    <span
      className={cn(
        'rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider',
        status === 'connected'
          ? 'bg-emerald-500/15 text-emerald-400'
          : 'bg-orange-500/15 text-orange-400'
      )}
    >
      {status === 'connected' ? 'Connected ✅' : 'Pending Setup'}
    </span>
  );
}

export function SocialSettingsClient() {
  const [health, setHealth] = useState<WebhookHealth | null>(null);
  const [pending, startTransition] = useTransition();
  const [toast, setToast] = useState<{ tone: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    void getSocialWebhookHealth().then(setHealth).catch(() => setHealth(null));
  }, []);

  const rows = [
    { label: 'Make.com syndication webhook', key: 'linkedin' as const },
    { label: 'Channel routing (LinkedIn + Instagram flags)', key: 'instagram' as const },
    { label: 'Canva Brand Studio', key: 'canva' as const },
  ];

  const onTestWebhook = () => {
    startTransition(async () => {
      const result = await sendTestSocialWebhook();
      if (!result.ok) {
        setToast({
          tone: 'error',
          message: `⚠️ Failed to reach Webhook: ${result.error}`,
        });
        return;
      }
      setToast({
        tone: 'success',
        message: `🚀 Test payload sent to Make.com successfully (HTTP ${result.status})!`,
      });
      const next = await getSocialWebhookHealth().catch(() => null);
      if (next) setHealth(next);
    });
  };

  return (
    <div className="space-y-4">
      <AuthToast
        open={Boolean(toast)}
        tone={toast?.tone ?? 'error'}
        message={toast?.message ?? ''}
        onClose={() => setToast(null)}
      />

      <section className="rounded-2xl border border-neutral-800 bg-neutral-900/70 p-5 shadow-2xl shadow-black/30 backdrop-blur-md">
        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-orange-500">
          Integrations
        </p>
        <h2 className="mt-1 text-lg font-black text-white">Webhook connection health</h2>
        <p className="mt-1 text-sm text-neutral-400">
          Uses <code className="text-orange-400/90">SOCIAL_SYNDICATION_WEBHOOK_URL</code> (fallback:{' '}
          <code className="text-orange-400/90">NEXT_PUBLIC_SOCIAL_WEBHOOK_URL</code>). Live posts fire
          only after Admin Approve & Publish.
        </p>

        <ul className="mt-5 space-y-3">
          {rows.map((row) => (
            <li
              key={row.key}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-neutral-800 bg-[#0A0A0A] px-4 py-3"
            >
              <span className="text-sm font-semibold text-white">{row.label}</span>
              {health ? (
                <StatusPill status={health[row.key]} />
              ) : (
                <span className="text-xs text-neutral-500">…</span>
              )}
            </li>
          ))}
        </ul>

        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={pending}
            onClick={onTestWebhook}
            className="inline-flex items-center gap-2 rounded-full bg-orange-500 px-4 py-2.5 text-xs font-bold text-white shadow-[0_0_20px_rgba(249,115,22,0.3)] transition hover:bg-orange-600 disabled:opacity-50"
          >
            {pending ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
            ⚡ Send Test Payload to Webhook
          </button>

          {health?.canvaUrl ? (
            <a
              href={health.canvaUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex rounded-full border border-orange-500/40 bg-orange-500/10 px-4 py-2.5 text-xs font-bold text-orange-400 hover:border-orange-500/60"
            >
              Open Canva Brand Studio
            </a>
          ) : null}
        </div>
      </section>
    </div>
  );
}
