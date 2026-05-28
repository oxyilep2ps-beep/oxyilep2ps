import { getSiteAnimationSetting } from '@/app/actions/admin-site-settings';
import { MonthlyThemeBackground } from '@/components/animations/monthly-theme-background';

export async function GlobalThemeBackground() {
  const setting = await getSiteAnimationSetting();
  return <MonthlyThemeBackground setting={setting} />;
}
