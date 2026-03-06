import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * useAutoRefresh — calls `callback` every `ms` when enabled.
 * Returns [enabled, toggle, secondsUntilNext]
 */
export function useAutoRefresh(callback, ms = 30_000) {
  const [enabled,  setEnabled]  = useState(false);
  const [countdown, setCountdown] = useState(ms / 1000);
  const cbRef    = useRef(callback);
  const timerRef = useRef(null);

  useEffect(() => { cbRef.current = callback; }, [callback]);

  useEffect(() => {
    if (!enabled) { setCountdown(ms / 1000); return; }

    let remaining = ms / 1000;
    setCountdown(remaining);

    // Countdown ticker
    const tick = setInterval(() => {
      remaining -= 1;
      setCountdown(remaining);
      if (remaining <= 0) {
        cbRef.current?.();
        remaining = ms / 1000;
        setCountdown(remaining);
      }
    }, 1000);

    timerRef.current = tick;
    return () => clearInterval(tick);
  }, [enabled, ms]);

  const toggle = useCallback(() => setEnabled((e) => !e), []);

  return [enabled, toggle, countdown];
}