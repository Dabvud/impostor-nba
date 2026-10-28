import { useEffect, useRef, useState } from "react";
import { alarm } from "../alarm";
import SpecialRuleCard from "../components/SpecialRuleCard";
import MatchClock from "../components/MatchClock";
import { useCountdown } from "../components/useCountdown";
import { useWakeLock } from "../components/useWakeLock";
import { displayName } from "../displayName";

import type { SpecialRule } from "../game/types";

type Props = { specialRule?: SpecialRule | null; name: string; seconds: number; position: number; total: number; onNext: () => void };

export default function CluesScreen({ name, seconds, position, total, specialRule, onNext }: Props) {
  const [ready, setReady] = useState(!specialRule || position !== 1);
  const { remaining } = useCountdown(seconds, ready);
  const alarmed = useRef(false);
  useWakeLock(ready && remaining > 0);

  useEffect(() => {
    if (ready && remaining === 0 && !alarmed.current) {
      alarmed.current = true;
      alarm();
    }
  }, [remaining, ready]);

  return (
    <main className="screen">
      {specialRule && <SpecialRuleCard rule={specialRule} onReady={ready ? undefined : () => setReady(true)} />}
      {ready && (
        <>
          <p className="eyebrow">Hinweis {position} von {total}</p>
          <h1 className="big-name">{displayName(name)}</h1>
          <MatchClock remaining={remaining} total={seconds} />
          {remaining === 0 && (
            <p className="time-up" role="status">Zeit um!</p>
          )}
          <button type="button" className="primary" onClick={onNext}>
            Weiter ▶
          </button>
        </>
      )}
    </main>
  );
}
