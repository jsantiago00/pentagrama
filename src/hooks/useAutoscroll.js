import { useCallback, useEffect, useRef, useState } from 'react';

export function useAutoscroll(scrollElRef) {
  const [scrolling, setScrolling] = useState(false);
  const [speed, setSpeed] = useState(3);
  const rafRef = useRef(null);
  const accumRef = useRef(0);
  const lastTsRef = useRef(null);
  const speedRef = useRef(speed);
  speedRef.current = speed;

  const stop = useCallback(() => setScrolling(false), []);

  useEffect(() => {
    if (!scrolling) return undefined;
    lastTsRef.current = null;
    accumRef.current = 0;
    function step(ts) {
      const el = scrollElRef.current;
      if (!el) return;
      if (!lastTsRef.current) lastTsRef.current = ts;
      const dt = ts - lastTsRef.current;
      lastTsRef.current = ts;
      const pxPerSec = 8 + (speedRef.current - 1) * 12.4;
      accumRef.current += pxPerSec * dt / 1000;
      if (accumRef.current >= 1) {
        const px = Math.floor(accumRef.current);
        accumRef.current -= px;
        el.scrollTop += px;
        if (el.scrollTop + el.clientHeight >= el.scrollHeight - 2) {
          setScrolling(false);
          return;
        }
      }
      rafRef.current = requestAnimationFrame(step);
    }
    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
  }, [scrolling, scrollElRef]);

  const toggle = useCallback(() => {
    setScrolling(prev => {
      if (prev) return false;
      const el = scrollElRef.current;
      if (el && el.scrollTop + el.clientHeight >= el.scrollHeight - 4) el.scrollTop = 0;
      return true;
    });
  }, [scrollElRef]);

  return { scrolling, speed, setSpeed, toggle, stop };
}
