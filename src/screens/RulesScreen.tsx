type Props = { onBack: () => void };

export default function RulesScreen({ onBack }: Props) {
  return (
    <main className="screen setup rules">
      <h1 className="title">Regeln</h1>

      <section className="panel">
        <h2>Ziel</h2>
        <p>
          Alle bekommen denselben Fußballer oder Verein – nur der Impostor nicht. Die Crew will den Impostor
          entlarven, der Impostor will unerkannt bleiben.
        </p>
      </section>

      <section className="panel">
        <h2>Ablauf</h2>
        <p>
          Das Handy geht reihum. Wer dran ist, zieht die Karte hoch, merkt sich das Wort und gibt weiter.
          Der Impostor sieht stattdessen „Du bist der Impostor“, je nach Einstellung mit einem Tipp.
        </p>
      </section>

      <section className="panel">
        <h2>Hinweisrunde</h2>
        <p>
          Ab dem Starter sagt jeder ein Wort, das zum Begriff passt – nicht zu offensichtlich, sonst weiß es der
          Impostor. Danach wird diskutiert und gemeinsam abgestimmt, wer der Impostor ist.
        </p>
      </section>

      <section className="panel">
        <h2>Auflösen &amp; Raten</h2>
        <p>
          „Auflösen“ gedrückt halten. Wurde der Impostor erwischt, darf er noch das Wort raten – liegt er richtig,
          gewinnt er trotzdem. Sonst gewinnt die Crew.
        </p>
      </section>

      <section className="panel">
        <h2>Sondermodi</h2>
        <p>
          Bei „Geheime Anzahl“ weiß niemand, wie viele Impostor es gibt: Manchmal ist es keiner – und ganz selten
          sind es alle.
        </p>
      </section>

      <nav className="setup-links">
        <button type="button" onClick={onBack}>
          Zurück
        </button>
      </nav>
    </main>
  );
}
