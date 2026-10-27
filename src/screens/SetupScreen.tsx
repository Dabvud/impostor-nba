import { useEffect, useRef, useState, type FormEvent } from "react";
import { formatTime } from "../components/useCountdown";
import { displayName } from "../displayName";
import { addMember, newId, selectedNames, toggleSelected, type Group } from "../game/groups";
import { firstPlayableMode, MODES } from "../game/modes";
import { maxImpostors, normalizeNames, validateSettings } from "../game/settings";
import type { ModeId, Settings } from "../game/types";

const THINK_TIMES = [
  { seconds: 15, label: "15 Sek." },
  { seconds: 30, label: "30 Sek." },
  { seconds: 60, label: "1 Min." },
  { seconds: 120, label: "2 Min." },
];
const DISCUSS_TIMES = [30, 60, 120, 180, 240, 300, 360, 420, 480, 540, 600];

/** Nächste Stufe nach oben/unten – auch wenn der gespeicherte Wert zwischen zwei Stufen liegt. */
function stepDiscuss(current: number, direction: 1 | -1): number {
  const next =
    direction > 0
      ? DISCUSS_TIMES.find((t) => t > current)
      : [...DISCUSS_TIMES].reverse().find((t) => t < current);
  return next ?? current;
}

export type SetupView = "rules" | "stats" | "share";

type Props = {
  initial: Settings | null;
  poolSizes?: Partial<Record<ModeId, number>>;
  onStart: (s: Settings) => void;
  groups?: Group[];
  onGroupsChange?: (groups: Group[]) => void;
  onEditGroup?: (groupId: string | null) => void;
  onOpen?: (view: SetupView) => void;
  /** Frei eingetippte Namen, damit sie beim Wechsel zu einer Gruppe und zurück erhalten bleiben. */
  initialFreeNames?: string[];
  /** Meldet jede Änderung, damit die Eingaben einen Ausflug zu Regeln/Gruppen überstehen. */
  onDraftChange?: (settings: Settings, freeNames: string[]) => void;
};

const noop = () => {};

export default function SetupScreen({
  initial,
  poolSizes,
  onStart,
  groups = [],
  onGroupsChange = noop,
  onEditGroup = noop,
  onOpen = noop,
  initialFreeNames,
  onDraftChange = noop,
}: Props) {
  // Gespeicherte Gruppe, die es nicht mehr gibt → ohne Gruppe weiter
  const [groupId, setGroupId] = useState<string | null>(
    groups.some((g) => g.id === initial?.groupId) ? (initial?.groupId ?? null) : null,
  );
  const group = groups.find((g) => g.id === groupId) ?? null;
  const [freeNames, setNames] = useState<string[]>(
    initialFreeNames ?? (initial?.groupId && group ? [] : (initial?.names ?? [])),
  );
  const names = group ? selectedNames(group) : freeNames;
  const [memberDraft, setMemberDraft] = useState("");
  const [memberHint, setMemberHint] = useState<string | null>(null);
  const [guessEnabled, setGuessEnabled] = useState(initial?.guessEnabled ?? true);
  const [draft, setDraft] = useState("");
  const [duplicateHint, setDuplicateHint] = useState<string | null>(null);
  const nameInput = useRef<HTMLInputElement>(null);
  const [impostorCount, setImpostorCount] = useState(initial?.impostorCount ?? 1);
  const sizes = Object.fromEntries(MODES.map((m) => [m.id, poolSizes?.[m.id] ?? 1])) as Record<ModeId, number>;
  const [mode, setMode] = useState<ModeId>(() =>
    initial?.mode && sizes[initial.mode] > 0 ? initial.mode : firstPlayableMode(sizes),
  );
  const [hintsEnabled, setHintsEnabled] = useState(initial?.hintsEnabled ?? true);

  const [secretImpostors, setSecretImpostors] = useState(initial?.secretImpostors ?? false);
  const [thinkSeconds, setThinkSeconds] = useState<number | null>(initial?.thinkSeconds ?? null);
  const [discussSeconds, setDiscussSeconds] = useState<number | null>(initial?.discussSeconds ?? null);

  const max = maxImpostors(names.length);
  // Gewählte Anzahl bleibt erhalten (z. B. beim Umsortieren der Sitzreihenfolge), angezeigt und
  // gespielt wird höchstens das, was bei der aktuellen Spielerzahl erlaubt ist.
  const effectiveImpostors = Math.min(impostorCount, max);
  const settings: Settings = {
    names,
    impostorCount: effectiveImpostors,
    mode,
    hintsEnabled,
    secretImpostors,
    thinkSeconds,
    discussSeconds,
    groupId,
    guessEnabled,
  };
  const errors = validateSettings(settings, poolSizes?.[mode]);

  const draftKey = JSON.stringify([settings, freeNames]);
  // nur bei echten Änderungen melden (Objekte entstehen bei jedem Rendern neu)
  useEffect(() => onDraftChange(settings, freeNames), [draftKey]);

  function addName(e: FormEvent) {
    e.preventDefault();
    const [name] = normalizeNames([draft]);
    const existing = name && names.find((n) => n.toLowerCase() === name.toLowerCase());
    if (existing) {
      // Name bleibt stehen, damit man nur noch z. B. „M.“ ergänzen muss.
      setDuplicateHint(`${existing} ist schon dabei – z. B. „${existing} M.“ eintragen`);
      setDraft(`${name} `);
    } else {
      if (name) setNames([...names, name]);
      setDuplicateHint(null);
      setDraft("");
    }
    // Fokus behalten, damit die Handy-Tastatur für den nächsten Namen offen bleibt.
    nameInput.current?.focus();
  }

  function removeName(index: number) {
    const next = freeNames.filter((_, i) => i !== index);
    setNames(next);
  }

  function updateGroup(next: Group) {
    onGroupsChange(groups.map((g) => (g.id === next.id ? next : g)));
  }

  function addToGroup(e: FormEvent) {
    e.preventDefault();
    if (!group) return;
    const result = addMember(group, memberDraft, newId);
    setMemberHint(result.error);
    if (!result.error) {
      updateGroup(result.group);
      setMemberDraft("");
    }
  }

  return (
    <main className="screen setup">
      <h1 className="title">Impostor NBA</h1>

      <section className="panel">
        <h2>Spieler</h2>
        <div className="group-bar" role="group" aria-label="Gruppe">
          <button type="button" aria-pressed={group === null} onClick={() => setGroupId(null)}>
            Ohne Gruppe
          </button>
          {groups.map((g) => (
            <button key={g.id} type="button" aria-pressed={g.id === groupId} onClick={() => setGroupId(g.id)}>
              {g.name}
            </button>
          ))}
          <button type="button" className="group-new" onClick={() => onEditGroup(null)}>
            + Neue Gruppe
          </button>
        </div>
        {group ? (
          <>
            <ul className="roster">
              {group.members.map((m) => {
                const seat = group.selected.indexOf(m.id) + 1;
                return (
                  <li key={m.id}>
                    <button type="button" aria-pressed={seat > 0} onClick={() => updateGroup(toggleSelected(group, m.id))}>
                      {displayName(m.name)}
                      {seat > 0 && <span className="seat">{seat}</span>}
                    </button>
                  </li>
                );
              })}
            </ul>
            <p className="hint">In Sitzreihenfolge antippen</p>
            <form className="add-name" onSubmit={addToGroup}>
              <input
                aria-label="Neues Mitglied"
                enterKeyHint="enter"
                placeholder="+ Neues Mitglied"
                value={memberDraft}
                maxLength={20}
                autoComplete="off"
                onChange={(e) => setMemberDraft(e.target.value)}
              />
              <button type="submit" onPointerDown={(e) => e.preventDefault()} onMouseDown={(e) => e.preventDefault()}>
                Hinzufügen
              </button>
            </form>
            {memberHint && <p className="field-hint">{memberHint}</p>}
            <button type="button" className="text-button" onClick={() => onEditGroup(group.id)}>
              Gruppe bearbeiten
            </button>
          </>
        ) : (
          <>
            <ul className="name-list">
              {freeNames.map((name, i) => (
                <li key={`${name}-${i}`}>
                  <span>{displayName(name)}</span>
                  <button type="button" className="icon-button" aria-label={`${name} entfernen`} onClick={() => removeName(i)}>
                    ✕
                  </button>
                </li>
              ))}
            </ul>
            <p className="hint">Namen so eintragen, wie ihr sitzt</p>
            <form className="add-name" onSubmit={addName}>
              <input
                ref={nameInput}
                aria-label="Name"
                enterKeyHint="enter"
                placeholder="Name"
                value={draft}
                maxLength={20}
                autoComplete="off"
                onChange={(e) => setDraft(e.target.value)}
              />
              {/* preventDefault: Tippen auf den Button soll das Namensfeld nicht verlassen */}
              <button type="submit" onPointerDown={(e) => e.preventDefault()} onMouseDown={(e) => e.preventDefault()}>
                Hinzufügen
              </button>
            </form>
            {duplicateHint && <p className="field-hint">{duplicateHint}</p>}
          </>
        )}
      </section>

      <section className="panel">
        <h2>Impostor</h2>
        <label className="switch-row">
          <span>Tipp für Impostor</span>
          <input
            type="checkbox"
            role="switch"
            checked={hintsEnabled}
            onChange={(e) => setHintsEnabled(e.target.checked)}
          />
        </label>
        <label className="switch-row">
          <span>Impostor darf raten</span>
          <input
            type="checkbox"
            role="switch"
            checked={guessEnabled}
            onChange={(e) => setGuessEnabled(e.target.checked)}
          />
        </label>
        <label className="switch-row">
          <span>Geheime Anzahl</span>
          <input
            type="checkbox"
            role="switch"
            checked={secretImpostors}
            onChange={(e) => setSecretImpostors(e.target.checked)}
          />
        </label>
        {secretImpostors ? (
          <p className="hint">Lasst euch überraschen</p>
        ) : (
          <div className="stepper">
            <button
              type="button"
              aria-label="Weniger Impostor"
              disabled={effectiveImpostors <= 1}
              onClick={() => setImpostorCount(effectiveImpostors - 1)}
            >
              −
            </button>
            <output aria-label="Anzahl Impostor">{effectiveImpostors}</output>
            <button
              type="button"
              aria-label="Mehr Impostor"
              disabled={effectiveImpostors >= max}
              onClick={() => setImpostorCount(effectiveImpostors + 1)}
            >
              +
            </button>
          </div>
        )}
      </section>

      <section className="panel">
        <h2>Timer</h2>
        <label className="switch-row">
          <span>Überlegzeit</span>
          <input
            type="checkbox"
            role="switch"
            checked={thinkSeconds !== null}
            onChange={(e) => setThinkSeconds(e.target.checked ? 30 : null)}
          />
        </label>
        {thinkSeconds !== null && (
          <div className="segmented think-times">
            {THINK_TIMES.map((time) => (
              <button
                key={time.seconds}
                type="button"
                aria-pressed={thinkSeconds === time.seconds}
                onClick={() => setThinkSeconds(time.seconds)}
              >
                {time.label}
              </button>
            ))}
          </div>
        )}
        <label className="switch-row">
          <span>Diskussionszeit</span>
          <input
            type="checkbox"
            role="switch"
            checked={discussSeconds !== null}
            onChange={(e) => setDiscussSeconds(e.target.checked ? 120 : null)}
          />
        </label>
        {discussSeconds !== null && (
          <div className="stepper">
            <button
              type="button"
              aria-label="Weniger Zeit"
              disabled={discussSeconds <= DISCUSS_TIMES[0]}
              onClick={() => setDiscussSeconds(stepDiscuss(discussSeconds, -1))}
            >
              −
            </button>
            <output aria-label="Dauer Diskussion">{formatTime(discussSeconds)}</output>
            <button
              type="button"
              aria-label="Mehr Zeit"
              disabled={discussSeconds >= DISCUSS_TIMES[DISCUSS_TIMES.length - 1]}
              onClick={() => setDiscussSeconds(stepDiscuss(discussSeconds, 1))}
            >
              +
            </button>
          </div>
        )}
      </section>

      <section className="panel">
        <h2>Spielmodus</h2>
        <select aria-label="Spielmodus" value={mode} onChange={(e) => setMode(e.target.value as ModeId)}>
          {MODES.map((m) => (
            <option key={m.id} value={m.id} disabled={sizes[m.id] === 0}>
              {m.label}{sizes[m.id] === 0 ? " (bald)" : ""}
            </option>
          ))}
        </select>
      </section>

      {errors.length > 0 && (
        <ul className="errors">
          {errors.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      )}

      <button type="button" className="primary" disabled={errors.length > 0} onClick={() => onStart({ ...settings, names: normalizeNames(names) })}>
        Start
      </button>

      <nav className="setup-links">
        <button type="button" onClick={() => onOpen("rules")}>
          Regeln
        </button>
        {group && (
          <button type="button" onClick={() => onOpen("stats")}>
            Statistik
          </button>
        )}
        <button type="button" onClick={() => onOpen("share")}>
          App teilen
        </button>
      </nav>
    </main>
  );
}
