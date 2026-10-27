import { useEffect, useRef, useState } from "react";
import { alarm } from "../alarm";
import HoldButton from "../components/HoldButton";
import MatchClock from "../components/MatchClock";
import { useCountdown } from "../components/useCountdown";
import { useWakeLock } from "../components/useWakeLock";
import { displayName } from "../displayName";

type Props = { starter: string | null; seconds: number | null; onResolve: () => void };

export default function DiscussionScreen({ starter, seconds, onResolve }: Props) {
  const [paused, setPaused] = useState(false);
  const { remaining, add } = useCountdown(seconds ?? 0, seconds !== null && !paused);
  const alarmed = useRef(false);
  const [total, setTotal] = useState(seconds ?? 0);
  useWakeLock(seconds !== null && !paused && remaining > 0);

  useEffect(() => {
    if (remaining > 0) alarmed.current = false;
    if (seconds !== null && remaining === 0 && !alarmed.current) {
      alarmed.current = true;
      alarm();
    }
  }, [remaining, seconds]);

  return (
    <main className="screen">
      <p className="eyebrow">Alle haben ihr Wort gesehen</p>
      <h1 className="big-name">{starter === null ? "Diskussion" : `${displayName(starter)} beginnt`}</h1>
      {seconds !== null && (
        <>
          <MatchClock remaining={remaining} total={total} />
          {remaining === 0 && (
            <p className="time-up" role="status">Zeit um – stimmt ab!</p>
          )}
          <div className="timer-controls">
            <button type="button" onClick={() => setPaused((value) => !value)}>
              {paused ? "Weiter" : "Pause"}
            </button>
            <button
              type="button"
              onClick={() => {
                // Ring bezieht sich auf die verlängerte Gesamtzeit
                setTotal(Math.max(total, remaining + 30));
                add(30);
              }}
            >
              +30 Sek.
            </button>
          </div>
        </>
      )}
      <p className="hint">Zum Auflösen gedrückt halten</p>
      <HoldButton label="Auflösen" onComplete={onResolve} />
    </main>
  );
}
