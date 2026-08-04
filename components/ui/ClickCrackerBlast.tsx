'use client';

import { useEffect, useRef } from 'react';

const COLORS = ['#F97316', '#FDBA74', '#FFFFFF'] as const;
const GRAVITY = 0.35;
const FRICTION = 0.94;
const BURST_MS = 750;
const RING_MS = 300;
const PARTICLE_COUNT = 12;

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  alpha: number;
};

type Ring = {
  x: number;
  y: number;
  born: number;
  maxRadius: number;
  startOpacity: number;
};

type Burst = {
  id: number;
  born: number;
  particles: Particle[];
  rings: Ring[];
};

function rand(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function spawnBurst(x: number, y: number, id: number): Burst {
  const particles: Particle[] = [];
  for (let i = 0; i < PARTICLE_COUNT; i += 1) {
    const angle = (Math.PI * 2 * i) / PARTICLE_COUNT + rand(-0.35, 0.35);
    const speed = rand(4.5, 9.5);
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - rand(0.5, 2.2),
      radius: rand(3, 7),
      color: COLORS[Math.floor(Math.random() * COLORS.length)]!,
      alpha: 1,
    });
  }

  return {
    id,
    born: performance.now(),
    particles,
    rings: [
      { x, y, born: performance.now(), maxRadius: 45, startOpacity: 0.6 },
      { x, y, born: performance.now() + 40, maxRadius: 58, startOpacity: 0.35 },
    ],
  };
}

/**
 * Global click/touch feedback: soft circular bubble burst with gravity fall.
 * Canvas overlay — pointer-events none, cleaned up after ~750ms.
 */
export function ClickCrackerBlast() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const burstsRef = useRef<Burst[]>([]);
  const rafRef = useRef<number>(0);
  const nextIdRef = useRef(0);
  const dprRef = useRef(1);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      dprRef.current = dpr;
      canvas.width = Math.floor(window.innerWidth * dpr);
      canvas.height = Math.floor(window.innerHeight * dpr);
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    window.addEventListener('resize', resize, { passive: true });

    const tick = (now: number) => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      ctx.clearRect(0, 0, w, h);

      const live: Burst[] = [];

      for (const burst of burstsRef.current) {
        const age = now - burst.born;
        if (age > BURST_MS) continue;

        // Expanding concentric rings
        for (const ring of burst.rings) {
          const ringAge = now - ring.born;
          if (ringAge < 0 || ringAge > RING_MS) continue;
          const t = ringAge / RING_MS;
          const radius = 10 + (ring.maxRadius - 10) * t;
          const opacity = ring.startOpacity * (1 - t);
          ctx.beginPath();
          ctx.arc(ring.x, ring.y, radius, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(249, 115, 22, ${opacity})`;
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }

        // Soft circular particles with friction + gravity
        const life = age / BURST_MS;
        for (const p of burst.particles) {
          p.vx *= FRICTION;
          p.vy *= FRICTION;
          p.vy += GRAVITY;
          p.x += p.vx;
          p.y += p.vy;
          p.alpha = Math.max(0, 1 - life);

          if (p.alpha <= 0.01) continue;

          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
          ctx.fillStyle = p.color;
          ctx.globalAlpha = p.alpha;
          ctx.fill();
          ctx.globalAlpha = 1;
        }

        live.push(burst);
      }

      burstsRef.current = live;

      if (live.length > 0) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        rafRef.current = 0;
        ctx.clearRect(0, 0, w, h);
      }
    };

    const ensureLoop = () => {
      if (!rafRef.current) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };

    const spawn = (clientX: number, clientY: number) => {
      const id = ++nextIdRef.current;
      burstsRef.current.push(spawnBurst(clientX, clientY, id));
      ensureLoop();
    };

    const onMouseDown = (event: MouseEvent) => {
      if (event.button !== 0) return;
      spawn(event.clientX, event.clientY);
    };

    const onTouchStart = (event: TouchEvent) => {
      const touch = event.touches[0];
      if (!touch) return;
      spawn(touch.clientX, touch.clientY);
    };

    window.addEventListener('mousedown', onMouseDown, { passive: true });
    window.addEventListener('touchstart', onTouchStart, { passive: true });

    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('touchstart', onTouchStart);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      burstsRef.current = [];
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-[9999]"
      aria-hidden
    />
  );
}
