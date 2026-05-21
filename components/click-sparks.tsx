'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

type Spark = { id: number; x: number; y: number; size: number };

export function ClickSparks() {
  const [sparks, setSparks] = useState<Spark[]>([]);

  useEffect(() => {
    let id = 0;
    const addSpark = (x: number, y: number) => {
      const size = 42 + Math.random() * 18;
      const spark = { id: ++id, x, y, size };
      setSparks((current) => [...current, spark]);
      window.setTimeout(() => {
        setSparks((current) => current.filter((item) => item.id !== spark.id));
      }, 650);
    };

    const onPointerDown = (event: PointerEvent) => addSpark(event.clientX, event.clientY);
    window.addEventListener('pointerdown', onPointerDown, { passive: true });
    return () => window.removeEventListener('pointerdown', onPointerDown);
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 z-[60] overflow-hidden">
      <AnimatePresence>
        {sparks.map((spark) => (
          <motion.div
            key={spark.id}
            initial={{ opacity: 0.9, scale: 0.2 }}
            animate={{ opacity: [0.85, 0.45, 0], scale: [0.2, 1, 1.5] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.62, ease: 'easeOut' }}
            style={{ left: spark.x, top: spark.y, width: spark.size, height: spark.size }}
            className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full border border-brand-400/50 bg-[radial-gradient(circle,rgba(255,129,74,0.45),rgba(255,90,31,0.12)_45%,transparent_70%)] shadow-[0_0_40px_rgba(255,90,31,0.3)]"
          />
        ))}
      </AnimatePresence>
    </div>
  );
}
