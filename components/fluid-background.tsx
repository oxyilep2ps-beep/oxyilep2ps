'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

export function FluidBackground() {
  const [pointer, setPointer] = useState({ x: 50, y: 40 });

  useEffect(() => {
    const update = (clientX: number, clientY: number) => {
      setPointer({
        x: (clientX / window.innerWidth) * 100,
        y: (clientY / window.innerHeight) * 100,
      });
    };

    const onMove = (event: PointerEvent) => update(event.clientX, event.clientY);
    const onTouchMove = (event: TouchEvent) => {
      const touch = event.touches[0];
      if (touch) update(touch.clientX, touch.clientY);
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('touchmove', onTouchMove);
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[-1] pointer-events-none overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_12%,rgba(255,90,31,0.18),transparent_26%),radial-gradient(circle_at_80%_18%,rgba(255,129,74,0.14),transparent_24%),radial-gradient(circle_at_30%_82%,rgba(255,219,196,0.16),transparent_28%),radial-gradient(circle_at_75%_72%,rgba(255,245,239,0.12),transparent_22%),linear-gradient(180deg,rgba(255,255,255,0.96),rgba(255,247,241,0.96))] dark:bg-[radial-gradient(circle_at_15%_12%,rgba(255,90,31,0.16),transparent_24%),radial-gradient(circle_at_80%_18%,rgba(255,129,74,0.12),transparent_22%),radial-gradient(circle_at_30%_82%,rgba(255,150,96,0.08),transparent_24%),radial-gradient(circle_at_75%_72%,rgba(255,90,31,0.06),transparent_20%),linear-gradient(180deg,rgba(5,5,5,0.98),rgba(0,0,0,0.99))]" />

      <motion.div
        aria-hidden
        animate={{ x: `${pointer.x - 50}%`, y: `${pointer.y - 50}%` }}
        transition={{ type: 'spring', stiffness: 24, damping: 22, mass: 2 }}
        className="absolute left-[10%] top-[12%] h-[34rem] w-[34rem] rounded-full bg-[radial-gradient(circle,rgba(255,90,31,0.28),rgba(255,90,31,0.05)_46%,transparent_72%)] blur-3xl"
      />

      <motion.div
        aria-hidden
        animate={{ x: `${pointer.x - 50}%`, y: `${pointer.y - 50}%` }}
        transition={{ type: 'spring', stiffness: 18, damping: 20, mass: 2.3 }}
        className="absolute right-[-8rem] top-[18%] h-[28rem] w-[28rem] rounded-full bg-[radial-gradient(circle,rgba(255,129,74,0.18),rgba(255,129,74,0.03)_44%,transparent_74%)] blur-3xl animate-drift"
      />

      <motion.div
        aria-hidden
        animate={{ x: `${pointer.x - 50}%`, y: `${pointer.y - 50}%` }}
        transition={{ type: 'spring', stiffness: 16, damping: 18, mass: 2.5 }}
        className="absolute bottom-[-12rem] left-[18%] h-[30rem] w-[30rem] rounded-full bg-[radial-gradient(circle,rgba(255,219,196,0.14),rgba(255,219,196,0.03)_46%,transparent_75%)] blur-3xl"
      />

      <div className="absolute inset-0 opacity-[0.28] [background-image:linear-gradient(rgba(255,255,255,0.22)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.18)_1px,transparent_1px)] [background-size:78px_78px] dark:opacity-[0.08]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,transparent_0%,transparent_68%,rgba(255,255,255,0.06)_100%)] dark:bg-[radial-gradient(circle_at_50%_0%,transparent_0%,transparent_72%,rgba(255,90,31,0.04)_100%)]" />
    </div>
  );
}
