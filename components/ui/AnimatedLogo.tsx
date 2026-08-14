'use client';

import { useId } from 'react';
import { cn } from '@/lib/utils';

type AnimatedLogoProps = {
  className?: string;
  title?: string;
};

/**
 * Code-only Oxyile mark: a thin liquid orange ring.
 * Resize with className (e.g. w-8 h-8 navbar, w-24 h-24 auth).
 */
export function AnimatedLogo({ className, title = 'Oxyile' }: AnimatedLogoProps) {
  const uid = useId().replace(/:/g, '');
  const gradientId = `oxyile-ring-${uid}`;
  const liquidId = `oxyile-liquid-${uid}`;
  const glowId = `oxyile-glow-${uid}`;

  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn(
        'oxyile-animated-logo aspect-square overflow-visible text-orange-500',
        'dark:text-[#F97316] dark:drop-shadow-[0_0_8px_rgba(249,115,22,0.8)]',
        className
      )}
      role="img"
      aria-label={title}
    >
      <title>{title}</title>
      <defs>
        <linearGradient id={gradientId} x1="8" y1="6" x2="56" y2="58" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FB923C" />
          <stop offset="45%" stopColor="#F97316" />
          <stop offset="100%" stopColor="#EA580C" />
        </linearGradient>

        <filter
          id={liquidId}
          x="-35%"
          y="-35%"
          width="170%"
          height="170%"
          filterUnits="objectBoundingBox"
        >
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.018"
            numOctaves="2"
            seed="3"
            result="noise"
          >
            <animate
              attributeName="baseFrequency"
              dur="9s"
              values="0.012;0.028;0.016;0.012"
              repeatCount="indefinite"
            />
          </feTurbulence>
          <feDisplacementMap
            in="SourceGraphic"
            in2="noise"
            scale="3.8"
            xChannelSelector="R"
            yChannelSelector="G"
          >
            <animate
              attributeName="scale"
              dur="7s"
              values="2.4;5.2;3.1;2.4"
              repeatCount="indefinite"
            />
          </feDisplacementMap>
        </filter>

        <filter id={glowId} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2.2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Dark-mode halo — hidden in light for a sharp ring */}
      <circle
        cx="32"
        cy="32"
        r="20.5"
        stroke={`url(#${gradientId})`}
        strokeWidth="5"
        strokeLinecap="round"
        className="origin-center opacity-0 dark:opacity-45"
        filter={`url(#${glowId})`}
        aria-hidden
      />

      {/* Liquid ring — vector stroke stays even while the path undulates */}
      <circle
        cx="32"
        cy="32"
        r="20.5"
        stroke={`url(#${gradientId})`}
        strokeWidth="2.35"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
        filter={`url(#${liquidId})`}
        className="origin-center"
      />
    </svg>
  );
}
