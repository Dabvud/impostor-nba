import { useEffect, useReducer, useRef, useState } from "react";
import { unlockAudio } from "./alarm";
import { startEvening, type Group } from "./game/groups";
import { poolSizes } from "./game/modes";
import { nextRound } from "./game/session";
import { toRecord } from "./game/stats";
import { reducer, restore, type GameState } from "./game/state";
import type { Settings } from "./game/types";
import CluesScreen from "./screens/CluesScreen";
import GroupScreen from "./screens/GroupScreen";
import DiscussionScreen from "./screens/DiscussionScreen";
import HandoffScreen from "./screens/HandoffScreen";
import ResolutionScreen from "./screens/ResolutionScreen";
import RevealScreen from "./screens/RevealScreen";
import RulesScreen from "./screens/RulesScreen";
import ShareScreen from "./screens/ShareScreen";
import StatsScreen from "./screens/StatsScreen";
import SetupScreen from "./screens/SetupScreen";
import {
  appendRecord,
  clearStats,
  loadGame,
  loadGroups,
  loadSettings,
  loadStats,
  loadUsed,
  saveGame,
  saveGroups,
  saveSettings,
  saveUsed,
} from "./storage";

const sizes = poolSizes();

/** Bildschirme neben dem Spiel – nicht gespeichert, nach Neuladen geht es ins Spiel. */
type View = { kind: "game" } | { kind: "group"; groupId: string | null } | { kind: "rules" | "stats" | "share" };

function initialState(): GameState {
  const saved = loadGame();
  return saved ? restore(saved) : { phase: "setup" };
}

export default function App() {
  const [state, dispatch] = useReducer(reducer, undefined, initialState);
  const [settings, setSettings] = useState<Settings | null>(loadSettings);
  const [groups, setGroups] = useState<Group[]>(loadGroups);
  const [draft, setDraft] = useState<{ settings: Settings; freeNames: string[] } | null>(null);
  const [view, setView] = useState<View>({ kind: "game" });
  // erhöht sich nach „Statistik löschen“, damit das Protokoll neu gelesen wird
  const [statsVersion, setStatsVersion] = useState(0);
  const phase = useRef(state.phase);
  const guarded = useRef(false);
  phase.current = state.phase;

  useEffect(() => saveGame(state), [state]);

  // Abgeschlossene Runde in die Statistik der Gruppe – appendRecord ignoriert Doppelte (Neuladen).
  useEffect(() => {
    if (state.phase !== "resolution" || state.step !== "done" || !state.round.id || !settings?.groupId) return;
    const group = groups.find((g) => g.id === settings.groupId);
    if (group) appendRecord(group.id, toRecord(state.round, group, settings.mode, { winner: state.winner, caught: state.caught }, new Date().toISOString()));
  }, [state, settings, groups]);

  // Jeder Fingertipp schaltet den Ton frei, damit der Timer-Piep auch auf dem iPhone kommt.
  useEffect(() => {
    document.addEventListener("pointerdown", unlockAudio);
    return () => document.removeEventListener("pointerdown", unlockAudio);
  }, []);

  function endRound() {
    if (window.confirm("Runde beenden? Namen und Einstellungen bleiben erhalten.")) dispatch({ type: "toSetup" });
  }

  // Sperrbildschirm oder App-Wechsel: offene Karte verdecken, zurück zur Übergabe.
  useEffect(() => {
    function onVisibilityChange() {
      if (document.visibilityState === "hidden") dispatch({ type: "hide" });
    }
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, []);

  // Während einer Runde liegt ein zusätzlicher History-Eintrag oben, damit die
  // Zurück-Geste abgefangen wird statt die App zu verlassen.
  useEffect(() => {
    if (state.phase !== "setup" && !guarded.current) {
      history.pushState({ impostor: true }, "");
      guarded.current = true;
    }
  }, [state.phase]);

  useEffect(() => {
    function onPopState() {
      guarded.current = false;
      if (phase.current === "setup") return;
      if (window.confirm("Runde abbrechen?")) {
        dispatch({ type: "toSetup" });
      } else {
        history.pushState({ impostor: true }, "");
        guarded.current = true;
      }
    }
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  function updateGroups(next: Group[]) {
    setGroups(next);
    saveGroups(next);
  }

  function saveGroup(group: Group) {
    const exists = groups.some((g) => g.id === group.id);
    updateGroups(exists ? groups.map((g) => (g.id === group.id ? group : g)) : [...groups, group]);
    // Neu angelegte bzw. bearbeitete Gruppe ist danach ausgewählt
    if (draft) setDraft({ ...draft, settings: { ...draft.settings, groupId: group.id } });
    setView({ kind: "game" });
  }

  function deleteGroup(id: string) {
    updateGroups(groups.filter((g) => g.id !== id));
    clearStats(id);
    if (draft?.settings.groupId === id) setDraft({ ...draft, settings: { ...draft.settings, groupId: null } });
    setView({ kind: "game" });
  }

  function startRound(s: Settings) {
    const { round, used } = nextRound(s, loadUsed(), Math.random);
    saveUsed(used);
    dispatch({ type: "start", round });
  }

  function renderScreen() {
    switch (state.phase) {
      case "setup": {
        const back = () => setView({ kind: "game" });
        const selected = groups.find((g) => g.id === draft?.settings.groupId) ?? null;
        if (view.kind === "rules") return <RulesScreen onBack={back} />;
        if (view.kind === "share") return <ShareScreen url={location.origin + import.meta.env.BASE_URL} onBack={back} />;
        if (view.kind === "stats" && selected) {
          return (
            <StatsScreen
              key={statsVersion}
              group={selected}
              records={loadStats(selected.id)}
              onNewEvening={() => updateGroups(groups.map((g) => (g.id === selected.id ? startEvening(g) : g)))}
              onClear={() => {
                clearStats(selected.id);
                setStatsVersion((v) => v + 1);
              }}
              onBack={back}
            />
          );
        }
        if (view.kind === "group") {
          return (
            <GroupScreen
              group={groups.find((g) => g.id === view.groupId) ?? null}
              onSave={saveGroup}
              onDelete={deleteGroup}
              onBack={() => setView({ kind: "game" })}
            />
          );
        }
        return (
          <SetupScreen
            poolSizes={sizes}
            initial={draft?.settings ?? settings}
            initialFreeNames={draft?.freeNames}
            groups={groups}
            onGroupsChange={updateGroups}
            onEditGroup={(groupId) => setView({ kind: "group", groupId })}
            onDraftChange={(s, freeNames) => setDraft({ settings: s, freeNames })}
            onOpen={(kind) => setView({ kind })}
            onStart={(s) => {
              setSettings(s);
              saveSettings(s);
              startRound(s);
            }}
          />
        );
      }
      case "handoff":
        return <HandoffScreen name={state.round.revealOrder[state.index]} onConfirm={() => dispatch({ type: "confirm" })} />;
      case "reveal": {
        const name = state.round.revealOrder[state.index];
        return (
          <RevealScreen
            key={state.index}
            name={name}
            isImpostor={state.round.impostors.includes(name)}
            word={state.round.word.name}
            hint={state.round.personalHints?.[name] ?? state.round.hint}
            canPass={state.seen}
            onSeen={() => dispatch({ type: "seen" })}
            onPassOn={() => dispatch({ type: "passOn" })}
          />
        );
      }
      case "clues":
        return (
          <CluesScreen
            key={state.index}
            name={state.round.speakingOrder[state.index]}
            seconds={state.round.thinkSeconds ?? 0}
            position={state.index + 1}
            total={state.round.speakingOrder.length}
            onNext={() => dispatch({ type: "nextClue" })}
          />
        );
      case "discussion":
        return (
          <DiscussionScreen
            starter={state.round.thinkSeconds ? null : state.round.starter}
            seconds={state.round.discussSeconds}
            onResolve={() => dispatch({ type: "resolve" })}
          />
        );
      case "resolution":
        return (
          <ResolutionScreen
            round={state.round}
            step={state.step}
            winner={state.winner}
            caught={state.caught}
            onCaught={(yes) => dispatch({ type: "caught", yes })}
            onRevealWord={() => dispatch({ type: "revealWord" })}
            onGuessed={(yes) => dispatch({ type: "guessed", yes })}
            onNewRound={() => (settings ? startRound(settings) : dispatch({ type: "toSetup" }))}
            onSettings={() => dispatch({ type: "toSetup" })}
          />
        );
    }
  }

  return (
    <>
      {state.phase !== "setup" && (
        <button type="button" className="end-round" onClick={endRound}>
          <span aria-hidden="true">✕</span> Runde beenden
        </button>
      )}
      {renderScreen()}
      <footer className="signature">von Dabvud</footer>
      <footer className="version">
        {__APP_VERSION__} · {__BUILD_DATE__}
      </footer>
    </>
  );
}
