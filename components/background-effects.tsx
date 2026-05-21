'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

export function BackgroundEffects() {
  const [pointer, setPointer] = useState({ x: 50, y: 35 });

  useEffect(() => {
    const update = (clientX: number, clientY: number) => {
      const x = (clientX / window.innerWidth) * 100;
      const y = (clientY / window.innerHeight) * 100;
      setPointer({ x, y });
    };

    const onPointerMove = (event: PointerEvent) => update(event.clientX, event.clientY);
    const onTouchMove = (event: TouchEvent) => {
      const touch = event.touches[0];
      if (touch) update(touch.clientX, touch.clientY);
    };

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('touchmove', onTouchMove);
    };
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 -z-20 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,90,31,0.16),transparent_35%),radial-gradient(circle_at_80%_20%,rgba(255,129,74,0.18),transparent_28%),radial-gradient(circle_at_20%_80%,rgba(255,190,140,0.16),transparent_26%),linear-gradient(180deg,rgba(255,255,255,0.96),rgba(255,247,241,0.95))] dark:bg-[radial-gradient(circle_at_top_left,rgba(255,90,31,0.24),transparent_30%),radial-gradient(circle_at_80%_20%,rgba(255,129,74,0.18),transparent_26%),radial-gradient(circle_at_20%_80%,rgba(255,190,140,0.08),transparent_24%),linear-gradient(180deg,rgba(2,6,23,0.96),rgba(15,23,42,0.98))]" />
      <motion.div
        aria-hidden
        animate={{ x: `${pointer.x - 50}%`, y: `${pointer.y - 50}%` }}
        transition={{ type: 'spring', stiffness: 35, damping: 20, mass: 1.5 }}
        className="absolute left-1/2 top-1/3 h-[32rem] w-[32rem] rounded-full bg-[radial-gradient(circle,rgba(255,90,31,0.28),rgba(255,90,31,0.05)_45%,transparent_70%)] blur-3xl will-change-transform"
      />
      <motion.div
        aria-hidden
        animate={{ x: `${pointer.x - 50}%`, y: `${pointer.y - 50}%` }}
        transition={{ type: 'spring', stiffness: 22, damping: 18, mass: 2 }}
        className="absolute right-[-10rem] top-[8rem] h-[24rem] w-[24rem] rounded-full bg-[radial-gradient(circle,rgba(255,129,74,0.18),rgba(255,129,74,0.05)_44%,transparent_72%)] blur-3xl animate-drift"
      />
      <div className="absolute inset-0 opacity-[0.35] [background-image:linear-gradient(rgba(255,255,255,0.28)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.22)_1px,transparent_1px)] [background-size:72px_72px] dark:opacity-[0.12]" />
    </div>
  );
}
