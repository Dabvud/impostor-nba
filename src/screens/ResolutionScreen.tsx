import { useEffect, useState } from "react";
import { displayName } from "../displayName";
import type { ResolutionStep, Winner } from "../game/state";
import type { Round } from "../game/types";

/**
 * Nach dem Gedrückthalten von „Auflösen“ kann iOS beim Loslassen einen Klick nachschicken –
 * deshalb reagieren die Buttons nach jedem Schrittwechsel erst nach einer halben Sekunde.
 */
const CLICK_GUARD_MS = 500;

type Props = {
  round: Round;
  step?: ResolutionStep;
  winner?: Winner | null;
  caught?: boolean | null;
  onCaught?: (yes: boolean) => void;
  onRevealWord?: () => void;
  onGuessed?: (yes: boolean) => void;
  onNewRound: () => void;
  onSettings: () => void;
};

const noop = () => {};

export default function ResolutionScreen({
  round,
  step = "done",
  winner = null,
  caught = null,
  onCaught = noop,
  onRevealWord = noop,
  onGuessed = noop,
  onNewRound,
  onSettings,
}: Props) {
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    setArmed(false);
    const timer = setTimeout(() => setArmed(true), CLICK_GUARD_MS);
    return () => clearTimeout(timer);
  }, [step]);

  const guard = (action: () => void) => () => armed && action();

  // Alle Impostor: die Tipps stammen von verschiedenen Spielern, ein gemeinsames Wort gab es nicht.
  const everyone = round.impostors.length > 0 && round.impostors.length === round.revealOrder.length;
  const several = round.impostors.length > 1;
  const who = displayName(round.impostors[0] ?? "");
  const wordVisible = !everyone && (step === "guessed?" || step === "done");

  return (
    <main className="screen">
      {round.impostors.length === 0 ? (
        <h1 className="big-name">Keiner war Impostor! 😄</h1>
      ) : everyone ? (
        <>
          <h1 className="big-name">Alle waren Impostor! 🤯</h1>
          <p className="hint">Es gab gar keinen Spieler.</p>
          {round.personalHints && (
            <ul className="personal-tips">
              {Object.entries(round.personalHints).map(([name, tip]) => (
                <li key={name}>
                  {displayName(name)}: {tip}
                </li>
              ))}
            </ul>
          )}
        </>
      ) : (
        <>
          <p className="eyebrow">{several ? "Die Impostor waren" : "Der Impostor war"}</p>
          <ul className="impostor-list">
            {round.impostors.map((name) => (
              <li key={name}>{displayName(name)}</li>
            ))}
          </ul>
        </>
      )}

      {wordVisible && (
        <>
          <p className="eyebrow">Das Wort war</p>
          <p className="word">{round.word.name}</p>
          {round.hint && <p className="hint">Tipp war: {round.hint}</p>}
        </>
      )}

      {step === "caught?" && (
        <div className="verdict">
          <p className="verdict-question">{several ? "Wurden die Impostor erwischt?" : `Wurde ${who} erwischt?`}</p>
          <div className="verdict-answers">
            <button type="button" onClick={guard(() => onCaught(true))}>
              Ja
            </button>
            <button type="button" onClick={guard(() => onCaught(false))}>
              Nein
            </button>
          </div>
        </div>
      )}

      {step === "guess" && (
        <div className="verdict">
          <p className="verdict-question">{several ? "Die Impostor dürfen jetzt das Wort raten" : `${who} darf jetzt das Wort raten`}</p>
          <button type="button" className="primary" onClick={guard(onRevealWord)}>
            Wort aufdecken
          </button>
        </div>
      )}

      {step === "guessed?" && (
        <div className="verdict">
          <p className="verdict-question">{several ? "Hat einer richtig geraten?" : `Hat ${who} richtig geraten?`}</p>
          <div className="verdict-answers">
            <button type="button" onClick={guard(() => onGuessed(true))}>
              Ja
            </button>
            <button type="button" onClick={guard(() => onGuessed(false))}>
              Nein
            </button>
          </div>
        </div>
      )}

      {step === "done" && (
        <>
          {winner && (
            <p className={`winner winner-${winner}`}>{winner === "crew" ? "Crew gewinnt 🎯" : caught ? "Impostor gewinnt trotzdem 🕵️" : "Impostor gewinnt 🕵️"}</p>
          )}
          <button type="button" className="primary" onClick={guard(onNewRound)}>
            Neue Runde
          </button>
          <button type="button" onClick={guard(onSettings)}>
            Einstellungen
          </button>
        </>
      )}
    </main>
  );
}
