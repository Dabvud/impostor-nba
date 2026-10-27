import { formatTime } from "./useCountdown";

type Props = { remaining: number; total: number };

/** Ab hier wird die Uhr rot. */
const FINAL_SECONDS = 10;
const RADIUS = 92;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/** Countdown im Kreis: der Ring leert sich im Uhrzeigersinn. */
export default function MatchClock({ remaining, total }: Props) {
  const share = total > 0 ? Math.min(1, remaining / total) : 0;
  const state = remaining === 0 ? "over" : remaining <= FINAL_SECONDS ? "final" : "running";

  return (
    <div className={`match-clock ${state}`}>
      <svg viewBox="0 0 200 200" aria-hidden="true">
        <circle className="match-clock-track" cx="100" cy="100" r={RADIUS} />
        <circle
          className="match-clock-ring"
          cx="100"
          cy="100"
          r={RADIUS}
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={CIRCUMFERENCE * (1 - share)}
        />
        <circle className="match-clock-spot" cx="100" cy="100" r="3" />
      </svg>
      <span className="match-clock-time" role="timer">
        {formatTime(remaining)}
      </span>
    </div>
  );
}
