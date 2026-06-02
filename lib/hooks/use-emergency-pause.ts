'use client';

import { useEffect, useState } from 'react';

export function useEmergencyPause() {
  const [paused, setPaused] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void fetch('/api/platform/status')
      .then((res) => res.json())
      .then((data: { emergencyPause?: boolean }) => {
        if (!cancelled) {
          setPaused(Boolean(data.emergencyPause));
          setLoaded(true);
        }
      })
      .catch(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { paused, loaded };
}
