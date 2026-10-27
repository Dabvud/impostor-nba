import { useState } from "react";
import { displayName } from "../displayName";
import type { Group } from "../game/groups";
import { MODES } from "../game/modes";
import { computeStats, type RoundRecord } from "../game/stats";

type Props = {
  group: Group;
  records: RoundRecord[];
  onNewEvening: () => void;
  onClear: () => void;
  onBack: () => void;
};

type Scope = "today" | "all";

const names = (list: string[]) => (list.length ? list.map(displayName).join(", ") : "–");

export default function StatsScreen({ group, records, onNewEvening, onClear, onBack }: Props) {
  const [scope, setScope] = useState<Scope>("today");
  const stats = computeStats(records, group.members, scope === "all" ? "all" : { evening: group.evening });
  const favorite = MODES.find((m) => m.id === stats.favoriteMode)?.label ?? "–";

  function clear() {
    if (window.confirm(`Statistik von „${group.name}“ löschen?`)) onClear();
  }

  return (
    <main className="screen setup stats">
      <p className="eyebrow">Statistik</p>
      <h1 className="title">{group.name}</h1>

      <div className="segmented scope">
        <button type="button" aria-pressed={scope === "today"} onClick={() => setScope("today")}>
          Heute
        </button>
        <button type="button" aria-pressed={scope === "all"} onClick={() => setScope("all")}>
          Allzeit
        </button>
      </div>

      {stats.rounds === 0 ? (
        <p className="hint">{scope === "today" ? "Heute noch keine Runde – los geht's!" : "Noch keine Runde gespielt."}</p>
      ) : (
        <>
          <p className="stats-count">{stats.rounds === 1 ? "1 Runde" : `${stats.rounds} Runden`}</p>

          <dl className="awards">
            <div data-testid="master">
              <dt>🕵️ Meister-Impostor</dt>
              <dd>{names(stats.masterImpostor)}</dd>
            </div>
            <div data-testid="unlucky">
              <dt>🎲 Pechvogel</dt>
              <dd>{names(stats.unlucky)}</dd>
            </div>
            <div data-testid="crew-rate">
              <dt>🎯 Crew-Quote</dt>
              <dd>{stats.crewRate === null ? "–" : `${Math.round(stats.crewRate * 100)} %`}</dd>
            </div>
            <div data-testid="starter">
              <dt>🗣️ Starter-König</dt>
              <dd>{names(stats.starterKing)}</dd>
            </div>
            <div data-testid="mode">
              <dt>📈 Lieblingsmodus</dt>
              <dd>{favorite}</dd>
            </div>
          </dl>

          <table className="stats-table">
            <thead>
              <tr>
                <th scope="col">Name</th>
                <th scope="col">Runden</th>
                <th scope="col">Impostor</th>
                <th scope="col">gewonnen</th>
                <th scope="col">erwischt</th>
              </tr>
            </thead>
            <tbody>
              {stats.table.map((row) => (
                <tr key={row.name} aria-label={row.name}>
                  <td>{displayName(row.name)}</td>
                  <td>{row.rounds}</td>
                  <td>{row.impostor}</td>
                  <td>{row.impostorWins}</td>
                  <td>{row.caught}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      <button
        type="button"
        className="primary"
        onClick={() => window.confirm("Neuen Abend starten? „Heute“ beginnt dann wieder bei null.") && onNewEvening()}
      >
        Neuer Abend
      </button>
      <nav className="setup-links">
        <button type="button" onClick={onBack}>
          Zurück
        </button>
        <button type="button" className="danger-link" onClick={clear}>
          Statistik löschen
        </button>
      </nav>
    </main>
  );
}
