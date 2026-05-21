'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

type Shard = {
  id: string;
  x: number;
  y: number;
  dx: number;
  dy: number;
  rotate: number;
  delay: number;
  color: string;
  width: number;
  height: number;
};

type Blast = {
  id: number;
  x: number;
  y: number;
  shards: Shard[];
};

const shardColors = ['#FF5A1F', '#FF814A', '#FFFFFF', '#E5E7EB', '#D4D4D8'];

function createShards(x: number, y: number): Shard[] {
  return Array.from({ length: 12 }).map((_, index) => {
    const angle = (Math.PI * 2 * index) / 12 + (Math.random() * 0.55 - 0.28);
    const distance = 20 + Math.random() * 24;
    const dx = Math.cos(angle) * distance;
    const dy = Math.sin(angle) * distance - (Math.random() * 8 + 4);
    return {
      id: `${Date.now()}-${index}-${Math.random().toString(36).slice(2, 7)}`,
      x,
      y,
      dx,
      dy,
      rotate: (Math.random() * 160 - 80) * (Math.random() > 0.5 ? 1 : -1),
      delay: index * 0.01,
      color: shardColors[index % shardColors.length],
      width: 7 + Math.round(Math.random() * 5),
      height: 3 + Math.round(Math.random() * 3),
    };
  });
}

export function ClickPaperBlast() {
  const [blasts, setBlasts] = useState<Blast[]>([]);

  useEffect(() => {
    let nextId = 0;

    const addBlast = (x: number, y: number) => {
      const id = ++nextId;
      const blast = { id, x, y, shards: createShards(x, y) };
      setBlasts((current) => [...current, blast]);
      window.setTimeout(() => {
        setBlasts((current) => current.filter((entry) => entry.id !== id));
      }, 720);
    };

    const handleClick = (event: MouseEvent) => addBlast(event.clientX, event.clientY);
    window.addEventListener('click', handleClick, { passive: true });
    return () => window.removeEventListener('click', handleClick);
  }, []);

  const renderBlasts = useMemo(
    () =>
      blasts.flatMap((blast) =>
        blast.shards.map((shard) => (
          <motion.span
            key={shard.id}
            initial={{ opacity: 0, x: 0, y: 0, rotate: 0, scale: 0.7 }}
            animate={{
              opacity: [0, 1, 1, 0],
              x: [0, shard.dx * 0.55, shard.dx],
              y: [0, shard.dy * 0.55, shard.dy],
              rotate: [0, shard.rotate * 0.4, shard.rotate],
              scale: [0.7, 1, 0.96],
            }}
            transition={{ duration: 0.72, ease: 'easeOut', times: [0, 0.22, 1], delay: shard.delay }}
            style={{
              left: blast.x,
              top: blast.y,
              width: shard.width,
              height: shard.height,
              backgroundColor: shard.color,
              boxShadow: '0 0 0 1px rgba(255,255,255,0.08)',
            }}
            className="absolute -translate-x-1/2 -translate-y-1/2 rounded-[2px]"
          />
        ))
      ),
    [blasts]
  );

  return (
    <div className="pointer-events-none fixed inset-0 z-[9999] overflow-hidden">
      <AnimatePresence>{renderBlasts}</AnimatePresence>
    </div>
  );
}
