import { useRef, useState, type PointerEvent, type ReactNode } from "react";

type Props = { children: ReactNode; owner: string; onReveal: () => void; thresholdPx?: number };

/** Verdeckte Karte: Hochziehen zeigt den Inhalt, Loslassen verdeckt ihn wieder. */
export default function RevealCard({ children, owner, onReveal, thresholdPx = 80 }: Props) {
  const startY = useRef<number | null>(null);
  const [offset, setOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const revealed = offset >= thresholdPx;

  function down(e: PointerEvent<HTMLDivElement>) {
    startY.current = e.clientY;
    setDragging(true);
    e.currentTarget.setPointerCapture?.(e.pointerId);
  }

  function move(e: PointerEvent<HTMLDivElement>) {
    if (startY.current === null) return;
    const next = Math.max(0, startY.current - e.clientY);
    if (next >= thresholdPx && !revealed) onReveal();
    setOffset(next);
  }

  function up() {
    startY.current = null;
    setDragging(false);
    setOffset(0);
  }

  return (
    <div
      className="reveal-card"
      data-testid="reveal-card"
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={up}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div className="reveal-content">{revealed && children}</div>
      <div
        className={dragging ? "reveal-cover" : "reveal-cover snap"}
        style={{ transform: `translateY(${-offset}px)` }}
      >
        <span className="reveal-arrow">↑</span>
        <span className="reveal-owner">Karte von {owner}</span>
        <span>nach oben ziehen</span>
      </div>
    </div>
  );
}
