'use client';

import { useEffect, useRef } from 'react';
import { useTheme } from '@/components/theme-provider';
import { resolveActiveAnimationTheme, type SiteAnimationTheme } from '@/lib/site/animation-theme';

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  char?: string;
  color: string;
};

function themeParticles(theme: Exclude<SiteAnimationTheme, 'auto'>, width: number, height: number): Particle[] {
  const count =
    theme === 'oct' ? 80 : theme === 'jul' ? 55 : theme === 'sep' ? 45 : 40;
  const palette: Record<string, string[]> = {
    jan: ['#e8f4ff', '#ffffff', '#b8d4f0'],
    feb: ['#ff6b9d', '#ff8fab', '#ffc2d4'],
    mar: ['#ffb7d5', '#ffd6e8', '#ff9ec7'],
    apr: ['#7ec8e3', '#a8d8ea', '#5ba8c9'],
    may: ['#ffd166', '#ffe08a', '#f4a261'],
    jun: ['#c8f27a', '#e9ff9a', '#9ae66e'],
    jul: ['#ff5a1f', '#ffd166', '#ff8fab', '#7ec8e3'],
    aug: ['#ff5a1f', '#ff8fab', '#7ec8e3', '#c8f27a'],
    sep: ['#ff5a1f', '#ff814a', '#e03b00'],
    oct: ['#00ff41', '#00cc33', '#39ff14'],
    nov: ['#d4d4d8', '#a1a1aa', '#e4e4e7'],
    dec: ['#ffffff', '#fde68a', '#fef3c7'],
  };

  const colors = palette[theme] ?? palette.sep;
  return Array.from({ length: count }, () => ({
    x: Math.random() * width,
    y: Math.random() * height,
    vx: (Math.random() - 0.5) * (theme === 'oct' ? 0.4 : 1.2),
    vy: theme === 'apr' ? 2 + Math.random() * 2 : theme === 'jan' ? 0.5 + Math.random() : 0.3 + Math.random() * 0.8,
    size: theme === 'oct' ? 10 + Math.random() * 6 : 2 + Math.random() * 5,
    alpha: 0.35 + Math.random() * 0.45,
    char: theme === 'oct' ? String.fromCharCode(0x30a0 + Math.floor(Math.random() * 96)) : undefined,
    color: colors[Math.floor(Math.random() * colors.length)],
  }));
}

export function MonthlyThemeBackground({ setting }: { setting: SiteAnimationTheme }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { theme } = useTheme();
  const active = resolveActiveAnimationTheme(setting);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);
    let particles = themeParticles(active, width, height);
    let frame = 0;

    const onResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
      particles = themeParticles(active, width, height);
    };
    window.addEventListener('resize', onResize);

    const draw = () => {
      frame += 1;
      ctx.clearRect(0, 0, width, height);

      const isDark = theme === 'dark';
      if (active === 'nov') {
        ctx.fillStyle = isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)';
        ctx.fillRect(0, 0, width, height);
      }

      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.y > height + 10) {
          p.y = -10;
          p.x = Math.random() * width;
        }
        if (p.x < -10) p.x = width + 10;
        if (p.x > width + 10) p.x = -10;

        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;

        if (active === 'feb' || active === 'aug') {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        } else if (active === 'oct' && p.char) {
          ctx.font = `${p.size}px monospace`;
          ctx.fillText(p.char, p.x, p.y);
        } else if (active === 'sep') {
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(frame * 0.01 + p.x * 0.001);
          ctx.beginPath();
          ctx.ellipse(0, 0, p.size, p.size * 0.6, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        } else if (active === 'may') {
          const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 4);
          grad.addColorStop(0, p.color);
          grad.addColorStop(1, 'transparent');
          ctx.fillStyle = grad;
          ctx.fillRect(p.x - p.size * 4, p.y - p.size * 4, p.size * 8, p.size * 8);
        } else {
          ctx.fillRect(p.x, p.y, p.size, active === 'jan' ? p.size : p.size * 0.4);
        }
      }

      ctx.globalAlpha = 1;
      requestAnimationFrame(draw);
    };

    const id = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(id);
      window.removeEventListener('resize', onResize);
    };
  }, [active, theme]);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 -z-10 h-full w-full"
      aria-hidden
    />
  );
}
