import { displayName } from "../displayName";

type Props = { name: string; onConfirm: () => void };

export default function HandoffScreen({ name, onConfirm }: Props) {
  return (
    <main className="screen handoff">
      <p className="eyebrow">Handy weitergeben</p>
      <h1 className="big-name">{displayName(name)} ist dran</h1>
      <button type="button" className="primary" onClick={onConfirm}>
        Ich bin {displayName(name)}
      </button>
    </main>
  );
}
