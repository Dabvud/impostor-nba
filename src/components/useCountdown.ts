import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Countdown mit Endzeitpunkt statt gezählter Ticks: Drosselt das Handy die Timer
 * (Bildschirm aus, App im Hintergrund), stimmt die Restzeit trotzdem.
 */
export function useCountdown(seconds: number, running: boolean) {
  const [remaining, setRemaining] = useState(seconds);
  const endAt = useRef<number | null>(null);

  const tick = useCallback(() => {
    if (endAt.current === null) return;
    setRemaining(Math.max(0, Math.ceil((endAt.current - Date.now()) / 1000)));
  }, []);

  useEffect(() => {
    if (!running) return;
    endAt.current = Date.now() + remaining * 1000;
    const timer = setInterval(tick, 250);
    return () => {
      clearInterval(timer);
      endAt.current = null;
    };
    // remaining nur beim (Wieder-)Start lesen, nicht bei jedem Tick neu ansetzen
  }, [running, tick]);

  const add = useCallback((extra: number) => {
    if (endAt.current !== null) {
      endAt.current = Math.max(endAt.current, Date.now()) + extra * 1000;
      setRemaining(Math.max(0, Math.ceil((endAt.current - Date.now()) / 1000)));
    } else {
      setRemaining((value) => Math.max(0, value + extra));
    }
  }, []);

  return { remaining, add };
}

export function formatTime(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}
