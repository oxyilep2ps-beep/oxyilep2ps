export type SiteAnimationTheme =
  | 'auto'
  | 'jan'
  | 'feb'
  | 'mar'
  | 'apr'
  | 'may'
  | 'jun'
  | 'jul'
  | 'aug'
  | 'sep'
  | 'oct'
  | 'nov'
  | 'dec';

export const SITE_ANIMATION_OPTIONS: { value: SiteAnimationTheme; label: string }[] = [
  { value: 'auto', label: 'Auto (by calendar month)' },
  { value: 'jan', label: 'January — Snowflakes' },
  { value: 'feb', label: 'February — Hearts' },
  { value: 'mar', label: 'March — Cherry Blossoms' },
  { value: 'apr', label: 'April — Raindrops' },
  { value: 'may', label: 'May — Sun Rays' },
  { value: 'jun', label: 'June — Fireflies' },
  { value: 'jul', label: 'July — Fireworks' },
  { value: 'aug', label: 'August — Balloons' },
  { value: 'sep', label: 'September — Falling Leaves' },
  { value: 'oct', label: 'October — Matrix Code' },
  { value: 'nov', label: 'November — Fog Clouds' },
  { value: 'dec', label: 'December — Stars' },
];

const MONTH_TO_THEME: Exclude<SiteAnimationTheme, 'auto'>[] = [
  'jan',
  'feb',
  'mar',
  'apr',
  'may',
  'jun',
  'jul',
  'aug',
  'sep',
  'oct',
  'nov',
  'dec',
];

export function resolveActiveAnimationTheme(setting: SiteAnimationTheme | null | undefined): Exclude<
  SiteAnimationTheme,
  'auto'
> {
  if (setting && setting !== 'auto') return setting;
  return MONTH_TO_THEME[new Date().getMonth()] ?? 'sep';
}
