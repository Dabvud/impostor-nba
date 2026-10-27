import { useEffect, useRef } from "react";
import { alarm } from "../alarm";
import MatchClock from "../components/MatchClock";
import { useCountdown } from "../components/useCountdown";
import { useWakeLock } from "../components/useWakeLock";
import { displayName } from "../displayName";

type Props = { name: string; seconds: number; position: number; total: number; onNext: () => void };

export default function CluesScreen({ name, seconds, position, total, onNext }: Props) {
  const { remaining } = useCountdown(seconds, true);
  const alarmed = useRef(false);
  useWakeLock(remaining > 0);

  useEffect(() => {
    if (remaining === 0 && !alarmed.current) {
      alarmed.current = true;
      alarm();
    }
  }, [remaining]);

  return (
    <main className="screen">
      <p className="eyebrow">Hinweis {position} von {total}</p>
      <h1 className="big-name">{displayName(name)}</h1>
      <MatchClock remaining={remaining} total={seconds} />
      {remaining === 0 && (
        <p className="time-up" role="status">Zeit um!</p>
      )}
      <button type="button" className="primary" onClick={onNext}>
        Weiter ▶
      </button>
    </main>
  );
}
