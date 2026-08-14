import Link from 'next/link';
import { AnimatedLogo } from '@/components/ui/AnimatedLogo';
import { cn } from '@/lib/utils';

const SIZES = {
  sm: 'h-8 w-8',
  md: 'h-10 w-10',
  lg: 'h-16 w-16',
} as const;

export type LogoSize = keyof typeof SIZES;

type LogoProps = {
  size?: LogoSize;
  className?: string;
  /** Kept for API compatibility with the previous next/image logo. */
  priority?: boolean;
  href?: string;
};

export function Logo({ size = 'md', className, href = '/' }: LogoProps) {
  const mark = (
    <AnimatedLogo
      className={cn(SIZES[size], className)}
    />
  );

  if (!href) {
    return mark;
  }

  return (
    <Link
      href={href}
      className="inline-flex shrink-0 items-center rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50"
      aria-label="Oxyile home"
    >
      {mark}
    </Link>
  );
}
