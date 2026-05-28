'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { resolveActiveAnimationTheme, type SiteAnimationTheme } from '@/lib/site/animation-theme';

type ParticleDef = {
  id: string;
  xFrom: number;
  yFrom: number;
  xTo: number;
  yTo: number;
  size: number;
  duration: number;
  delay: number;
  opacity: number;
  rotation: number;
  drift: number;
  color: string;
};

type Viewport = { width: number; height: number };

function MapleLeaf({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 100 100" className="h-full w-full" fill={color}>
      <path d="M50 5l8 18 18-9-8 21 19 5-18 10 11 17-20-5-2 33h-6l-2-33-20 5 11-17-18-10 19-5-8-21 18 9z" />
    </svg>
  );
}

function Star({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 100 100" className="h-full w-full" fill={color}>
      <path d="M50 6l13 27 30 4-22 20 6 30-27-15-27 15 6-30L7 37l30-4z" />
    </svg>
  );
}

function Snowflake({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 100 100" className="h-full w-full" stroke={color} strokeWidth="6" fill="none" strokeLinecap="round">
      <line x1="50" y1="10" x2="50" y2="90" />
      <line x1="15" y1="30" x2="85" y2="70" />
      <line x1="15" y1="70" x2="85" y2="30" />
      <line x1="50" y1="10" x2="42" y2="20" />
      <line x1="50" y1="10" x2="58" y2="20" />
      <line x1="50" y1="90" x2="42" y2="80" />
      <line x1="50" y1="90" x2="58" y2="80" />
    </svg>
  );
}

function Raindrop({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 100 140" className="h-full w-full" fill={color}>
      <path d="M50 4c11 24 32 44 32 71a32 32 0 11-64 0c0-27 21-47 32-71z" />
    </svg>
  );
}

function Heart({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 100 100" className="h-full w-full" fill={color}>
      <path d="M50 86S6 58 6 30a20 20 0 0136-13l8 10 8-10a20 20 0 0136 13c0 28-44 56-44 56z" />
    </svg>
  );
}

function Blossom({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 100 100" className="h-full w-full" fill={color}>
      <circle cx="50" cy="50" r="12" fill="#ffd6f0" />
      <ellipse cx="50" cy="20" rx="14" ry="22" />
      <ellipse cx="79" cy="39" rx="14" ry="22" transform="rotate(72 79 39)" />
      <ellipse cx="68" cy="74" rx="14" ry="22" transform="rotate(144 68 74)" />
      <ellipse cx="32" cy="74" rx="14" ry="22" transform="rotate(216 32 74)" />
      <ellipse cx="21" cy="39" rx="14" ry="22" transform="rotate(288 21 39)" />
    </svg>
  );
}

function renderShape(theme: Exclude<SiteAnimationTheme, 'auto'>, color: string) {
  if (theme === 'jan') return <Snowflake color={color} />;
  if (theme === 'feb' || theme === 'aug') return <Heart color={color} />;
  if (theme === 'mar') return <Blossom color={color} />;
  if (theme === 'apr') return <Raindrop color={color} />;
  if (theme === 'sep') return <MapleLeaf color={color} />;
  if (theme === 'dec') return <Star color={color} />;
  return (
    <svg viewBox="0 0 100 100" className="h-full w-full" fill={color}>
      <circle cx="50" cy="50" r="45" />
    </svg>
  );
}

function autumnTreeStyle() {
  return (
    <motion.div
      className="pointer-events-none absolute -bottom-8 -left-10 w-[42vw] min-w-[320px] max-w-[560px] opacity-35"
      style={{ transformOrigin: 'bottom center', willChange: 'transform' }}
      animate={{ rotate: [-2, 2, -2] }}
      transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
    >
      <svg viewBox="0 0 480 500" className="h-auto w-full">
        <defs>
          <linearGradient id="trunk" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#7a4b2c" />
            <stop offset="100%" stopColor="#4a2b1a" />
          </linearGradient>
        </defs>
        <rect x="210" y="250" width="58" height="230" rx="26" fill="url(#trunk)" />
        <circle cx="145" cy="190" r="78" fill="#ff8a4f" opacity="0.9" />
        <circle cx="235" cy="140" r="96" fill="#ff5a1f" opacity="0.85" />
        <circle cx="320" cy="210" r="82" fill="#e03b00" opacity="0.82" />
        <circle cx="245" cy="230" r="78" fill="#ffb17a" opacity="0.75" />
      </svg>
    </motion.div>
  );
}

function makeParticles(theme: Exclude<SiteAnimationTheme, 'auto'>, viewport: Viewport): ParticleDef[] {
  const { width, height } = viewport;
  const countByTheme: Record<Exclude<SiteAnimationTheme, 'auto'>, number> = {
    jan: 24,
    feb: 24,
    mar: 22,
    apr: 28,
    may: 18,
    jun: 18,
    jul: 20,
    aug: 20,
    sep: 22,
    oct: 30,
    nov: 16,
    dec: 24,
  };

  const colors: Record<Exclude<SiteAnimationTheme, 'auto'>, string[]> = {
    jan: ['#f8fcff', '#d8ecff', '#b7d9ff'],
    feb: ['#ff6b9d', '#ff8fab', '#ffc2d4'],
    mar: ['#ff9ec7', '#ffc5dd', '#ffd6ea'],
    apr: ['#7ec8e3', '#9ed6ea', '#62b5db'],
    may: ['#ffd166', '#ffe08a', '#ffc14d'],
    jun: ['#d8ff84', '#bfff4f', '#f4ffbf'],
    jul: ['#ff5a1f', '#ffd166', '#7ec8e3', '#ff8fab'],
    aug: ['#ff5a1f', '#ff8fab', '#7ec8e3', '#c8f27a'],
    sep: ['#ff5a1f', '#ff814a', '#e03b00', '#ffb17a'],
    oct: ['#00ff41', '#00cc33', '#7cff7c'],
    nov: ['#d4d4d8', '#e4e4e7', '#a1a1aa'],
    dec: ['#ffffff', '#fef3c7', '#fde68a'],
  };

  const autumnSizes = [30, 50, 70];
  const baseMin = 16;
  const baseMax = 34;
  const items: ParticleDef[] = [];

  for (let i = 0; i < countByTheme[theme]; i += 1) {
    const size =
      theme === 'sep'
        ? autumnSizes[i % autumnSizes.length]
        : baseMin + Math.random() * (baseMax - baseMin);

    const isRain = theme === 'apr';
    const diagAutumn = theme === 'sep';
    const xFrom = diagAutumn ? -width * (0.2 + Math.random() * 0.15) : Math.random() * width;
    const yFrom = diagAutumn ? -120 - Math.random() * 220 : -120 - Math.random() * height;
    const xTo = diagAutumn
      ? width + width * (0.1 + Math.random() * 0.15)
      : isRain
        ? xFrom + (Math.random() - 0.5) * 30
        : xFrom + (Math.random() - 0.5) * 180;
    const yTo = height + 180;

    items.push({
      id: `${theme}-${i}`,
      xFrom,
      yFrom,
      xTo,
      yTo,
      size,
      duration: isRain ? 3 + Math.random() * 1.6 : 11 + Math.random() * 8,
      delay: Math.random() * 8,
      opacity: 0.3 + Math.random() * 0.3,
      rotation: diagAutumn ? 360 : 180 + Math.random() * 240,
      drift: (Math.random() - 0.5) * 40,
      color: colors[theme][Math.floor(Math.random() * colors[theme].length)],
    });
  }

  return items;
}

export function MonthlyThemeBackground({ setting }: { setting: SiteAnimationTheme }) {
  const active = resolveActiveAnimationTheme(setting);
  const [viewport, setViewport] = useState<Viewport>({ width: 1400, height: 900 });

  useEffect(() => {
    const onResize = () => {
      setViewport({ width: window.innerWidth, height: window.innerHeight });
    };
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const particles = useMemo(() => makeParticles(active, viewport), [active, viewport]);

  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden>
      {active === 'sep' ? autumnTreeStyle() : null}

      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute"
          style={{
            width: p.size,
            height: p.size,
            opacity: p.opacity,
            willChange: 'transform',
            filter: active === 'sep' ? 'drop-shadow(0 8px 10px rgba(0,0,0,0.16))' : 'none',
          }}
          initial={{ x: p.xFrom, y: p.yFrom, rotate: 0 }}
          animate={{
            x: [p.xFrom, p.xTo + p.drift, p.xTo],
            y: [p.yFrom, p.yTo],
            rotate: [0, p.rotation],
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            repeat: Infinity,
            ease: active === 'apr' ? 'linear' : 'easeInOut',
          }}
        >
          {renderShape(active, p.color)}
        </motion.div>
      ))}
    </div>
  );
}
