'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

type Ripple = { id: number; x: number; y: number; size: number };

/** Lightweight faded-border circular pulse (replaces confetti/sparkle dashes). */
export function ClickSparks() {
  const [ripples, setRipples] = useState<Ripple[]>([]);

  useEffect(() => {
    let id = 0;
    const addRipple = (x: number, y: number) => {
      const ripple = { id: ++id, x, y, size: 56 };
      setRipples((current) => [...current, ripple]);
      window.setTimeout(() => {
        setRipples((current) => current.filter((item) => item.id !== ripple.id));
      }, 420);
    };

    const onPointerDown = (event: PointerEvent) => addRipple(event.clientX, event.clientY);
    window.addEventListener('pointerdown', onPointerDown, { passive: true });
    return () => window.removeEventListener('pointerdown', onPointerDown);
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 z-[60] overflow-hidden" aria-hidden>
      <AnimatePresence>
        {ripples.map((ripple) => (
          <motion.div
            key={ripple.id}
            initial={{ opacity: 0.8, scale: 0.2 }}
            animate={{ opacity: 0, scale: 1.8 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            style={{
              left: ripple.x,
              top: ripple.y,
              width: ripple.size,
              height: ripple.size,
              boxShadow: '0 0 12px rgba(249, 115, 22, 0.4)',
            }}
            className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full border border-orange-500/60 bg-transparent"
          />
        ))}
      </AnimatePresence>
    </div>
  );
}
