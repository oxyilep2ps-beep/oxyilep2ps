'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { getSiteAnimationSetting, updateSiteAnimationSetting } from '@/app/actions/admin-site-settings';
import { SITE_ANIMATION_OPTIONS, type SiteAnimationTheme } from '@/lib/site/animation-theme';

export function AdminThemeSettingsTab() {
  const [current, setCurrent] = useState<SiteAnimationTheme>('auto');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void getSiteAnimationSetting().then((v) => {
      setCurrent(v);
      setLoading(false);
    });
  }, []);

  const save = async (theme: SiteAnimationTheme) => {
    setSaving(true);
    try {
      await updateSiteAnimationSetting(theme);
      setCurrent(theme);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-black text-neutral-950 dark:text-white">Theme Settings</h2>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">
          Override the global background animation or use Auto to follow the calendar month.
        </p>
      </div>

      {loading ? (
        <Loader2 className="animate-spin text-brand-500" size={28} />
      ) : (
        <div className="glass-card grid gap-2 rounded-2xl p-4 sm:grid-cols-2">
          {SITE_ANIMATION_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              disabled={saving}
              onClick={() => void save(opt.value)}
              className={`rounded-xl border px-4 py-3 text-left text-sm font-semibold transition ${
                current === opt.value
                  ? 'border-brand-400 bg-brand-500/15 text-brand-700 dark:text-brand-300'
                  : 'border-white/50 bg-white/40 dark:border-white/10 dark:bg-black/30'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
