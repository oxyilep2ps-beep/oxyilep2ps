'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { resolveActiveAnimationTheme, type SiteAnimationTheme } from '@/lib/site/animation-theme';

type PrimaryParticle = {
  id: string;
  left: number;
  top: number;
  size: number;
  duration: number;
  delay: number;
  opacity: number;
  tx: number;
  rotation: number;
  color: string;
  char?: string;
};

type Viewport = { width: number; height: number };

type ActiveTheme = Exclude<SiteAnimationTheme, 'auto'>;

const BRAND = ['#FF5A1F', '#FF7B4A', '#FFA382', '#FFD1C1'];

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

function FireflyWing({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 120 100" className="h-full w-full" fill={color}>
      <path d="M60 52c-8-20-25-31-47-30 6 14 22 24 39 28-17 5-30 14-35 29 25 1 38-15 43-27z" />
      <path d="M60 52c8-20 25-31 47-30-6 14-22 24-39 28 17 5 30 14 35 29-25 1-38-15-43-27z" />
      <rect x="54" y="40" width="12" height="34" rx="6" fill="#ffddae" />
    </svg>
  );
}

function FireworkBurst({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 100 100" className="h-full w-full" stroke={color} fill="none" strokeWidth="5" strokeLinecap="round">
      <line x1="50" y1="6" x2="50" y2="30" />
      <line x1="50" y1="70" x2="50" y2="94" />
      <line x1="6" y1="50" x2="30" y2="50" />
      <line x1="70" y1="50" x2="94" y2="50" />
      <line x1="18" y1="18" x2="34" y2="34" />
      <line x1="66" y1="66" x2="82" y2="82" />
      <line x1="18" y1="82" x2="34" y2="66" />
      <line x1="66" y1="34" x2="82" y2="18" />
      <circle cx="50" cy="50" r="10" fill={color} stroke="none" />
    </svg>
  );
}

function Balloon({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 120 170" className="h-full w-full">
      <path d="M60 10c28 0 46 20 46 49 0 32-22 52-46 52S14 91 14 59C14 30 32 10 60 10z" fill={color} />
      <rect x="46" y="113" width="28" height="18" rx="4" fill="#8c5528" />
      <line x1="54" y1="111" x2="50" y2="132" stroke="#6d3c1f" strokeWidth="3" />
      <line x1="66" y1="111" x2="70" y2="132" stroke="#6d3c1f" strokeWidth="3" />
      <line x1="60" y1="131" x2="60" y2="166" stroke="#6d3c1f" strokeWidth="3" />
    </svg>
  );
}

function Cloud({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 220 120" className="h-full w-full" fill={color}>
      <path d="M58 95h112c25 0 44-15 44-34 0-20-17-35-40-35-5-20-26-33-50-33-24 0-45 13-50 33-4-1-8-1-12-1-23 0-42 16-42 36s20 34 38 34z" />
    </svg>
  );
}

function DustGlyph({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 100 100" className="h-full w-full" fill={color}>
      <path d="M50 10l13 23 25 8-18 18 3 27-23-12-23 12 3-27-18-18 25-8z" />
    </svg>
  );
}

function renderShape(theme: ActiveTheme, color: string, char?: string) {
  if (theme === 'jan') return <Snowflake color={color} />;
  if (theme === 'feb') return <Heart color={color} />;
  if (theme === 'mar') return <Blossom color={color} />;
  if (theme === 'apr') return <Raindrop color={color} />;
  if (theme === 'sep') return <MapleLeaf color={color} />;
  if (theme === 'jun') return <FireflyWing color={color} />;
  if (theme === 'jul') return <FireworkBurst color={color} />;
  if (theme === 'aug') return <Balloon color={color} />;
  if (theme === 'nov') return <Cloud color={color} />;
  if (theme === 'may') return <DustGlyph color={color} />;
  if (theme === 'dec') return <Star color={color} />;
  if (theme === 'oct') return <span className="font-mono font-bold">{char ?? '0'}</span>;
  return (
    <svg viewBox="0 0 100 100" className="h-full w-full" fill={color}>
      <path d="M50 8l10 20 20-10-10 22 22 10-22 10 10 22-20-10-10 20-10-20-20 10 10-22-22-10 22-10-10-22 20 10z" />
    </svg>
  );
}

function autumnTreeStyle() {
  return (
    <motion.div
      className="pointer-events-none absolute -bottom-8 -left-10 w-[42vw] min-w-[320px] max-w-[560px] opacity-40"
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

function secondaryEnvironment(theme: ActiveTheme) {
  if (theme === 'jan') {
    return <div className="absolute bottom-0 h-24 w-full bg-gradient-to-t from-[#ffe6dd]/45 via-[#fff8f4]/20 to-transparent backdrop-blur-[2px]" />;
  }
  if (theme === 'feb') {
    return <div className="absolute -bottom-28 -left-24 h-[34rem] w-[34rem] rounded-full bg-[radial-gradient(circle,rgba(255,90,31,0.30),rgba(255,123,74,0.10),transparent_70%)]" />;
  }
  if (theme === 'mar') {
    return (
      <motion.div
        className="absolute -top-6 right-0 w-[42vw] max-w-[540px] opacity-40"
        style={{ transformOrigin: 'top right', willChange: 'transform' }}
        animate={{ rotate: [0, 2, 0, -1, 0] }}
        transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
      >
        <svg viewBox="0 0 600 260" className="h-auto w-full" fill="none" stroke="#ff7b4a" strokeWidth="10" strokeLinecap="round">
          <path d="M600 30c-120 30-180 40-260 95-80 55-142 70-250 95" />
          <path d="M460 72c-40 18-55 28-85 58" />
          <path d="M360 105c-42 18-62 36-84 62" />
        </svg>
      </motion.div>
    );
  }
  if (theme === 'apr') {
    return (
      <div className="absolute bottom-0 h-28 w-full overflow-hidden">
        {Array.from({ length: 10 }).map((_, i) => (
          <span
            key={`ripple-${i}`}
            className="absolute bottom-0 h-20 w-20 rounded-full border border-[#ff9e7a]/50"
            style={{
              left: `${i * 10}%`,
              animation: `ripple ${4 + (i % 3)}s ease-out infinite`,
              animationDelay: `${i * 0.6}s`,
            }}
          />
        ))}
      </div>
    );
  }
  if (theme === 'may') {
    return (
      <motion.div
        className="absolute -top-[40rem] left-1/2 h-[90rem] w-[90rem] -translate-x-1/2 opacity-30"
        style={{ willChange: 'transform' }}
        animate={{ rotate: [0, 360] }}
        transition={{ duration: 140, repeat: Infinity, ease: 'linear' }}
      >
        <div className="h-full w-full rounded-full bg-[conic-gradient(from_0deg,transparent,rgba(255,90,31,0.30),transparent,rgba(255,163,130,0.25),transparent)]" />
      </motion.div>
    );
  }
  if (theme === 'jun') {
    return (
      <motion.div
        className="absolute bottom-0 h-28 w-full bg-[linear-gradient(to_top,rgba(120,80,50,0.35),transparent)]"
        style={{ transformOrigin: 'bottom center', willChange: 'transform' }}
        animate={{ rotate: [-1.2, 1.2, -1.2] }}
        transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
      />
    );
  }
  if (theme === 'jul') {
    return (
      <svg viewBox="0 0 1440 200" className="absolute bottom-0 h-24 w-full opacity-35" fill="#7a3a1f">
        <path d="M0 180h80v-34h30v34h92v-48h34v48h120v-58h28v58h95v-45h20v45h110v-64h30v64h128v-40h26v40h104v-54h30v54h98v-66h33v66h125v-52h21v52h144v20H0z" />
      </svg>
    );
  }
  if (theme === 'aug') {
    return (
      <div className="absolute inset-0">
        {Array.from({ length: 6 }).map((_, i) => (
          <motion.div
            key={`cloud-aug-${i}`}
            className="absolute opacity-30"
            style={{ top: `${8 + i * 10}%`, width: `${180 + i * 24}px` }}
            initial={{ x: -260 }}
            animate={{ x: '115vw' }}
            transition={{ duration: 45 + i * 4, repeat: Infinity, ease: 'linear', delay: i * 2 }}
          >
            <Cloud color={BRAND[(i + 1) % BRAND.length]} />
          </motion.div>
        ))}
      </div>
    );
  }
  if (theme === 'sep') return autumnTreeStyle();
  if (theme === 'oct') {
    return (
      <div className="absolute bottom-0 h-48 w-full bg-[linear-gradient(to_top,rgba(255,90,31,0.16),transparent)]">
        <svg viewBox="0 0 1000 220" className="h-full w-full opacity-35" stroke="#ff7b4a" strokeWidth="1.4" fill="none">
          {Array.from({ length: 12 }).map((_, i) => (
            <path key={`grid-v-${i}`} d={`M${80 + i * 76} 220 L500 80`} />
          ))}
          {Array.from({ length: 6 }).map((_, i) => (
            <path key={`grid-h-${i}`} d={`M0 ${220 - i * 28} L1000 ${220 - i * 28}`} />
          ))}
        </svg>
      </div>
    );
  }
  if (theme === 'nov') {
    return (
      <div className="absolute inset-0">
        {Array.from({ length: 5 }).map((_, i) => (
          <motion.div
            key={`fog-${i}`}
            className="absolute opacity-28"
            style={{ top: `${10 + i * 13}%`, width: `${420 + i * 110}px` }}
            initial={{ x: '-40vw' }}
            animate={{ x: '110vw' }}
            transition={{ duration: 40 + i * 5, repeat: Infinity, ease: 'linear', delay: i * 2 }}
          >
            <Cloud color={i % 2 === 0 ? '#ffd1c1' : '#ffa382'} />
          </motion.div>
        ))}
      </div>
    );
  }
  if (theme === 'dec') {
    return (
      <div className="absolute inset-0">
        <div className="absolute left-12 top-10 h-40 w-40 rounded-full bg-[#ff9e63]/25 blur-sm" />
        <svg viewBox="0 0 200 200" className="absolute left-8 top-6 h-48 w-48 opacity-45" fill="#ff9e63">
          <path d="M142 30a78 78 0 100 140 70 70 0 110-140z" />
        </svg>
      </div>
    );
  }
  return null;
}

function makeParticles(theme: ActiveTheme, viewport: Viewport): PrimaryParticle[] {
  const { width, height } = viewport;
  const countByTheme: Record<ActiveTheme, number> = {
    jan: 56,
    feb: 56,
    mar: 56,
    apr: 64,
    may: 52,
    jun: 18,
    jul: 52,
    aug: 52,
    sep: 58,
    oct: 70,
    nov: 52,
    dec: 56,
  };

  const colors: Record<ActiveTheme, string[]> = {
    jan: ['#ffd1c1', '#fff7f2', '#ffa382'],
    feb: BRAND,
    mar: ['#ffa382', '#ffd1c1', '#ff7b4a'],
    apr: ['#ff7b4a', '#ffa382', '#ffd1c1'],
    may: BRAND,
    jun: ['#ff5a1f', '#ffd1c1', '#ff7b4a'],
    jul: ['#ff5a1f', '#ff7b4a', '#ffcf8a', '#ffd1c1'],
    aug: BRAND,
    sep: ['#ff5a1f', '#ff7b4a', '#c35124', '#ffb38f'],
    oct: ['#ff7b4a', '#ffa382', '#ffd1c1', '#ff5a1f'],
    nov: ['#ffd1c1', '#ffc2aa', '#ffa382'],
    dec: ['#ffcf8a', '#ffb86d', '#ffd1c1'],
  };
  const glyphs = ['0', '1', 'ア', 'カ', 'ナ'];
  const autumnSizes = [30, 50, 70, 100];
  const items: PrimaryParticle[] = [];

  for (let i = 0; i < countByTheme[theme]; i += 1) {
    const isAutumn = theme === 'sep';
    const isRain = theme === 'apr';
    const isMatrix = theme === 'oct';
    const isBalloon = theme === 'aug';
    const isCloud = theme === 'nov';
    const isFloater = theme === 'may' || theme === 'jun';
    const isFirework = theme === 'jul';
    const size = isAutumn
      ? autumnSizes[i % autumnSizes.length]
      : 30 + Math.random() * 70;

    let tx = (Math.random() - 0.5) * 20;
    if (isAutumn) tx = 50 + Math.random() * 20;
    if (isRain) tx = -6 + Math.random() * 8;

    items.push({
      id: `${theme}-${i}`,
      left: isAutumn
        ? -18 + Math.random() * 22
        : isCloud
          ? -20 + Math.random() * 10
          : (Math.random() * width * 1.1) / width * 100,
      top: isBalloon
        ? height + 40 + Math.random() * 180
        : isCloud
          ? 20 + Math.random() * (height * 0.55)
          : isFloater
            ? 18 + Math.random() * (height * 0.72)
            : isFirework
              ? height * (0.24 + Math.random() * 0.58)
          : -130 - Math.random() * (height * 0.7),
      size,
      duration: isCloud
        ? 60 + Math.random() * 6
        : isAutumn
          ? 15 + Math.random() * 10
        : isRain || isMatrix
          ? 5 + Math.random() * 2
          : isFloater
            ? 14 + Math.random() * 5
            : 10 + Math.random() * 5,
      delay: Math.random() * 15,
      opacity: 0.3 + Math.random() * 0.3,
      tx,
      rotation: isMatrix ? 0 : 220 + Math.random() * 260,
      color: colors[theme][Math.floor(Math.random() * colors[theme].length)],
      char: isMatrix ? glyphs[Math.floor(Math.random() * glyphs.length)] : undefined,
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
  const secondary = useMemo(() => secondaryEnvironment(active), [active]);
  const classNameByTheme: Record<ActiveTheme, string> = {
    jan: 'gentleDrifter',
    feb: 'gentleDrifter',
    mar: 'tumbler',
    apr: 'fastDropper',
    may: 'floater',
    jun: 'floater',
    jul: 'firework',
    aug: 'balloonRiser',
    sep: 'tumbler',
    oct: 'matrixDropper',
    nov: 'cloudDrifter',
    dec: 'gentleDrifter',
  };

  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden>
      {secondary}

      {particles.map((p) => (
        <div
          key={p.id}
          className={`absolute ${classNameByTheme[active]}`}
          style={{
            width: p.size,
            height: p.size,
            opacity: p.opacity,
            willChange: 'transform',
            left: `${p.left}%`,
            top: `${p.top}px`,
            filter:
              active === 'jun'
                ? 'drop-shadow(0 0 14px rgba(255,122,74,0.9))'
                : active === 'sep'
                  ? 'drop-shadow(0 8px 10px rgba(0,0,0,0.16))'
                  : 'none',
            ['--tx' as string]: `${p.tx}vw`,
            ['--dur' as string]: `${p.duration}s`,
            ['--delay' as string]: `${p.delay}s`,
            ['--r2' as string]: `${p.rotation}deg`,
            zIndex: 0,
          }}
        >
          <div className="shape">{renderShape(active, p.color, p.char)}</div>
        </div>
      ))}

      <style jsx>{`
        .tumbler {
          animation:
            fallDiagonal var(--dur) linear infinite,
            spin360 5.5s linear infinite;
          animation-delay: calc(var(--delay) * -1);
        }
        .floater {
          animation: floatErratic var(--dur) ease-in-out infinite;
          animation-delay: calc(var(--delay) * -1);
        }
        .fastDropper {
          animation:
            fastDrop var(--dur) linear infinite;
          animation-delay: calc(var(--delay) * -1);
        }
        .matrixDropper {
          animation: matrixDrop var(--dur) linear infinite;
          animation-delay: calc(var(--delay) * -1);
        }
        .balloonRiser {
          animation: balloonRise var(--dur) linear infinite;
          animation-delay: calc(var(--delay) * -1);
        }
        .cloudDrifter {
          animation: cloudDrift var(--dur) linear infinite;
          animation-delay: calc(var(--delay) * -1);
        }
        .gentleDrifter {
          animation:
            gentleFall var(--dur) linear infinite,
            pendulumSway 7.5s cubic-bezier(0.4, 0, 0.2, 1) infinite;
          animation-delay: calc(var(--delay) * -1);
        }
        .firework {
          animation:
            burst var(--dur) ease-out infinite;
          animation-delay: calc(var(--delay) * -1);
        }
        .shape {
          width: 100%;
          height: 100%;
          display: grid;
          place-items: center;
          will-change: transform;
        }
        @keyframes gentleFall {
          0% {
            transform: translate(0, -10vh);
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          95% {
            transform: translate(var(--tx), 110vh);
            opacity: 1;
          }
          100% {
            transform: translate(var(--tx), 120vh);
            opacity: 0;
          }
        }
        @keyframes fallDiagonal {
          0% {
            transform: translate(0, -10vh);
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          95% {
            transform: translate(var(--tx), 110vh);
            opacity: 1;
          }
          100% {
            transform: translate(var(--tx), 120vh);
            opacity: 0;
          }
        }
        @keyframes spin360 {
          from {
            rotate: 0deg;
          }
          to {
            rotate: 360deg;
          }
        }
        @keyframes floatErratic {
          0% {
            transform: translate(0, 0);
            opacity: 0.35;
          }
          25% {
            transform: translate(20vw, -30vh);
            opacity: 0.6;
          }
          50% {
            transform: translate(-10vw, -10vh);
            opacity: 0.45;
          }
          75% {
            transform: translate(8vw, -24vh);
            opacity: 0.55;
          }
          100% {
            transform: translate(0, 0);
            opacity: 0.35;
          }
        }
        @keyframes fastDrop {
          0% {
            transform: translate(0, -10vh);
            opacity: 0;
          }
          8% {
            opacity: 1;
          }
          95% {
            transform: translate(10vw, 110vh);
            opacity: 1;
          }
          100% {
            transform: translate(10vw, 120vh);
            opacity: 0;
          }
        }
        @keyframes matrixDrop {
          0% {
            transform: translateY(-10vh);
            opacity: 0;
          }
          8% {
            opacity: 1;
          }
          95% {
            transform: translateY(110vh);
            opacity: 1;
          }
          100% {
            transform: translateY(120vh);
            opacity: 0;
          }
        }
        @keyframes balloonRise {
          0% {
            transform: translate(0, 110vh);
            opacity: 0;
          }
          15% {
            opacity: 0.6;
          }
          90% {
            transform: translate(var(--tx), -20vh);
            opacity: 0.6;
          }
          100% {
            transform: translate(var(--tx), -26vh);
            opacity: 0;
          }
        }
        @keyframes cloudDrift {
          0% {
            transform: translateX(0);
            opacity: 0.32;
          }
          100% {
            transform: translateX(140vw);
            opacity: 0.32;
          }
        }
        @keyframes pendulumSway {
          0% {
            margin-left: 0;
            rotate: -4deg;
          }
          50% {
            margin-left: 8px;
            rotate: 4deg;
          }
          100% {
            margin-left: 0;
            rotate: -4deg;
          }
        }
        @keyframes burst {
          0% {
            transform: scale(0.2) translateY(0);
            opacity: 0;
          }
          20% {
            opacity: 0.6;
          }
          70% {
            transform: scale(1.45) translateY(-8vh);
            opacity: 0.45;
          }
          100% {
            transform: scale(2.1) translateY(-16vh);
            opacity: 0;
          }
        }
        @keyframes ripple {
          0% {
            transform: scale(0.3);
            opacity: 0.45;
          }
          100% {
            transform: scale(2.2);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}
