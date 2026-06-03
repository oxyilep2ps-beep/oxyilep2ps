import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@/lib/utils';

const SIZES = {
  sm: { width: 120, height: 32, className: 'h-6 w-auto' },
  md: { width: 150, height: 40, className: 'h-8 w-auto' },
  lg: { width: 180, height: 48, className: 'h-10 w-auto' },
} as const;

export type LogoSize = keyof typeof SIZES;

type LogoProps = {
  size?: LogoSize;
  className?: string;
  priority?: boolean;
  href?: string;
};

export function Logo({ size = 'md', className, priority = false, href = '/' }: LogoProps) {
  const dims = SIZES[size];

  return (
    <Link
      href={href}
      className="inline-flex shrink-0 items-center rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50"
      aria-label="Oxyile home"
    >
      <Image
        src="/logo.png"
        alt="Oxyile Logo"
        width={dims.width}
        height={dims.height}
        className={cn(dims.className, 'object-contain', className)}
        priority={priority}
      />
    </Link>
  );
}
