'use server';

import { revalidatePath } from 'next/cache';
import { assertAdmin } from '@/lib/auth/assert-admin';
import { createAdminClient } from '@/lib/supabase/admin';
import type { SiteAnimationTheme } from '@/lib/site/animation-theme';

export async function getSiteAnimationSetting(): Promise<SiteAnimationTheme> {
  const admin = createAdminClient();
  const { data } = await admin.from('site_settings').select('current_animation').eq('id', 1).maybeSingle();
  return (data?.current_animation as SiteAnimationTheme) ?? 'auto';
}

export async function updateSiteAnimationSetting(theme: SiteAnimationTheme) {
  await assertAdmin();
  const admin = createAdminClient();
  const { data: user } = await admin.auth.getUser();

  const { error } = await admin
    .from('site_settings')
    .update({
      current_animation: theme,
      updated_at: new Date().toISOString(),
      updated_by: user?.user?.id ?? null,
    })
    .eq('id', 1);

  if (error) throw new Error(error.message);
  revalidatePath('/', 'layout');
  revalidatePath('/admin-dashboard/theme');
  return { success: true };
}
