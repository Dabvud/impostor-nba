import { useEffect, useRef, useState, type CSSProperties } from "react";

type Props = { label: string; durationMs?: number; onComplete: () => void };

/** Löst erst aus, wenn der Button `durationMs` lang gedrückt gehalten wird. */
export default function HoldButton({ label, durationMs = 1000, onComplete }: Props) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [holding, setHolding] = useState(false);

  function cancel() {
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = null;
    setHolding(false);
  }

  function start() {
    cancel();
    setHolding(true);
    timer.current = setTimeout(() => {
      timer.current = null;
      setHolding(false);
      onComplete();
    }, durationMs);
  }

  useEffect(() => cancel, []);

  return (
    <button
      type="button"
      className={holding ? "primary hold holding" : "primary hold"}
      style={{ "--hold-ms": `${durationMs}ms`, touchAction: "none" } as CSSProperties}
      onPointerDown={start}
      onPointerUp={cancel}
      onPointerLeave={cancel}
      onPointerCancel={cancel}
      onContextMenu={(e) => e.preventDefault()}
    >
      <span className="hold-fill" aria-hidden="true" />
      <span className="hold-label">{label}</span>
    </button>
  );
}
