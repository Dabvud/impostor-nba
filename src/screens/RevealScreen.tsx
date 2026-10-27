import RevealCard from "../components/RevealCard";
import { displayName } from "../displayName";

type Props = {
  name: string;
  isImpostor: boolean;
  word: string;
  hint: string | null;
  canPass: boolean;
  onSeen: () => void;
  onPassOn: () => void;
};

export default function RevealScreen({ name, isImpostor, word, hint, canPass, onSeen, onPassOn }: Props) {
  return (
    <main className="screen reveal">
      {/* Name bleibt sichtbar, falls beim Weiterreichen versehentlich gewischt wurde */}
      <h1 className="reveal-name">{displayName(name)}</h1>
      <RevealCard owner={displayName(name)} onReveal={onSeen}>
        {isImpostor ? (
          <div className="impostor-card">
            <span className="impostor">🕵️ Du bist der Impostor</span>
            {hint && <span className="tip">Tipp: {hint}</span>}
          </div>
        ) : (
          <span className="word">{word}</span>
        )}
      </RevealCard>
      <button type="button" className="primary" disabled={!canPass} onClick={onPassOn}>
        Fertig – weitergeben
      </button>
    </main>
  );
}
