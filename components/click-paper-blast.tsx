'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

type Ripple = {
  id: number;
  x: number;
  y: number;
};

/**
 * Global click / touch feedback: faded-border radar ripple.
 * Transparent fill, orange glow border, scale + fade — never blocks pointer events.
 */
export function ClickPaperBlast() {
  const [ripples, setRipples] = useState<Ripple[]>([]);

  useEffect(() => {
    let nextId = 0;

    const spawn = (clientX: number, clientY: number) => {
      const id = ++nextId;
      setRipples((current) => [...current, { id, x: clientX, y: clientY }]);
      window.setTimeout(() => {
        setRipples((current) => current.filter((entry) => entry.id !== id));
      }, 420);
    };

    const onPointerDown = (event: PointerEvent) => {
      // Ignore non-primary mouse buttons; allow mouse, touch, and pen.
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      spawn(event.clientX, event.clientY);
    };

    window.addEventListener('pointerdown', onPointerDown, { passive: true });
    return () => window.removeEventListener('pointerdown', onPointerDown);
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 z-[9999] overflow-hidden" aria-hidden>
      <AnimatePresence>
        {ripples.map((ripple) => (
          <motion.span
            key={ripple.id}
            initial={{ opacity: 0.8, scale: 0.2 }}
            animate={{ opacity: 0, scale: 1.8 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            style={{
              left: ripple.x,
              top: ripple.y,
              width: 56,
              height: 56,
              boxShadow: '0 0 12px rgba(249, 115, 22, 0.4)',
            }}
            className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full border border-orange-500/60 bg-transparent"
          />
        ))}
      </AnimatePresence>
    </div>
  );
}
