import { describe, expect, it } from "vitest";
import { reducer, restore, type Action, type GameState } from "../../src/game/state";
import type { Round } from "../../src/game/types";

const round: Round = {
  word: { name: "Messi", hints: [] },
  hint: null,
  impostors: ["Ben"],
  revealOrder: ["Anna", "Ben", "Cem"],
  starter: "Cem",
  id: "r1",
  guessEnabled: true,
  speakingOrder: ["Cem", "Anna", "Ben"],
  thinkSeconds: null,
  discussSeconds: null,
};
const withClues: Round = { ...round, thinkSeconds: 15 };
const setup: GameState = { phase: "setup" };
const run = (state: GameState, ...actions: Action[]) => actions.reduce(reducer, state);
const turn: Action[] = [{ type: "confirm" }, { type: "seen" }, { type: "passOn" }];

describe("reducer", () => {
  it("durchläuft eine komplette Runde mit drei Spielern", () => {
    let s = run(setup, { type: "start", round });
    expect(s).toEqual({ phase: "handoff", round, index: 0 });
    s = run(s, { type: "confirm" });
    expect(s).toEqual({ phase: "reveal", round, index: 0, seen: false });
    s = run(s, { type: "seen" }, { type: "passOn" });
    expect(s).toEqual({ phase: "handoff", round, index: 1 });
    s = run(s, ...turn, ...turn);
    expect(s).toEqual({ phase: "discussion", round });
    s = run(s, { type: "resolve" });
    expect(s).toEqual({ phase: "resolution", round, step: "caught?", winner: null, caught: null });
    s = run(s, { type: "caught", yes: false });
    const next = { ...round, starter: "Anna" };
    expect(run(s, { type: "start", round: next })).toEqual({ phase: "handoff", round: next, index: 0 });
  });

  it("lässt nicht weitergeben, bevor aufgedeckt wurde", () => {
    const s: GameState = { phase: "reveal", round, index: 0, seen: false };
    expect(reducer(s, { type: "passOn" })).toBe(s);
  });

  it("überspringt bei doppeltem Weitergeben keinen Spieler", () => {
    const s = run(setup, { type: "start", round }, ...turn, { type: "passOn" });
    expect(s).toEqual({ phase: "handoff", round, index: 1 });
  });

  it.each<[GameState, Action]>([
    [setup, { type: "confirm" }],
    [setup, { type: "passOn" }],
    [{ phase: "handoff", round, index: 0 }, { type: "resolve" }],
    [{ phase: "handoff", round, index: 0 }, { type: "start", round }],
    [{ phase: "handoff", round, index: 0 }, { type: "seen" }],
    [{ phase: "reveal", round, index: 0, seen: true }, { type: "confirm" }],
    [{ phase: "discussion", round }, { type: "passOn" }],
    [{ phase: "resolution", round, step: "done", winner: "crew", caught: true }, { type: "resolve" }],
  ])("ignoriert ungültige Aktionen (%o, %o)", (state, action) => {
    expect(reducer(state, action)).toBe(state);
  });

  it("bricht aus jeder Phase zur Einrichtung ab", () => {
    expect(reducer({ phase: "reveal", round, index: 1, seen: true }, { type: "toSetup" })).toEqual(setup);
  });
});

describe("Auflösung", () => {
  const at = (
    step: "caught?" | "guess" | "guessed?" | "done",
    winner: "crew" | "impostor" | null = null,
    caught: boolean | null = null,
  ): GameState => ({ phase: "resolution", round, step, winner, caught });
  const discussion: GameState = { phase: "discussion", round };

  it("fragt zuerst, ob der Impostor erwischt wurde", () => {
    expect(reducer(discussion, { type: "resolve" })).toEqual(at("caught?"));
  });

  it("nicht erwischt → Impostor gewinnt", () => {
    expect(reducer(at("caught?"), { type: "caught", yes: false })).toEqual(at("done", "impostor", false));
  });

  it("erwischt mit Raten → raten, Wort aufdecken, Ergebnis", () => {
    let s = reducer(at("caught?"), { type: "caught", yes: true });
    expect(s).toEqual(at("guess", null, true));
    s = reducer(s, { type: "revealWord" });
    expect(s).toEqual(at("guessed?", null, true));
    // erwischt, aber richtig geraten: Impostor gewinnt trotzdem – „erwischt“ bleibt gespeichert
    expect(reducer(s, { type: "guessed", yes: true })).toEqual(at("done", "impostor", true));
    expect(reducer(s, { type: "guessed", yes: false })).toEqual(at("done", "crew", true));
  });

  it("erwischt ohne Raten → Crew gewinnt", () => {
    const noGuess: GameState = {
      phase: "resolution",
      round: { ...round, guessEnabled: false },
      step: "caught?",
      winner: null,
      caught: null,
    };
    expect(reducer(noGuess, { type: "caught", yes: true })).toEqual({ ...noGuess, step: "done", winner: "crew", caught: true });
  });

  it.each([
    ["kein Impostor", [] as string[]],
    ["alle Impostor", ["Anna", "Ben", "Cem"]],
  ])("überspringt bei %s alle Fragen", (_, impostors) => {
    const s: GameState = { phase: "discussion", round: { ...round, impostors } };
    expect(reducer(s, { type: "resolve" })).toEqual({
      phase: "resolution",
      round: { ...round, impostors },
      step: "done",
      winner: null,
      caught: null,
    });
  });

  it.each<[GameState, Action]>([
    [at("caught?"), { type: "revealWord" }],
    [at("caught?"), { type: "guessed", yes: true }],
    [at("caught?"), { type: "start", round }],
    [at("guess"), { type: "caught", yes: false }],
    [at("guessed?"), { type: "revealWord" }],
    [at("done", "crew"), { type: "caught", yes: true }],
  ])("ignoriert ungültige Schritte (%o, %o)", (state, action) => {
    expect(reducer(state, action)).toBe(state);
  });
});

describe("Hinweisrunde", () => {
  it("folgt nach dem Aufdecken, wenn eine Überlegzeit eingestellt ist", () => {
    const s = run(setup, { type: "start", round: withClues }, ...turn, ...turn, ...turn);
    expect(s).toEqual({ phase: "clues", round: withClues, index: 0 });
  });

  it("geht mit Weiter durch alle Spieler und dann in die Diskussion", () => {
    let s: GameState = { phase: "clues", round: withClues, index: 0 };
    s = run(s, { type: "nextClue" });
    expect(s).toEqual({ phase: "clues", round: withClues, index: 1 });
    s = run(s, { type: "nextClue" }, { type: "nextClue" });
    expect(s).toEqual({ phase: "discussion", round: withClues });
  });

  it("ignoriert Weiter außerhalb der Hinweisrunde", () => {
    const s: GameState = { phase: "discussion", round: withClues };
    expect(reducer(s, { type: "nextClue" })).toBe(s);
  });

  it("bleibt beim Wiederherstellen beim aktuellen Spieler", () => {
    const s: GameState = { phase: "clues", round: withClues, index: 2 };
    expect(restore(s)).toBe(s);
  });
});

describe("restore", () => {
  it("setzt eine offene Karte auf den Übergabe-Bildschirm zurück", () => {
    expect(restore({ phase: "reveal", round, index: 2, seen: true })).toEqual({ phase: "handoff", round, index: 2 });
  });

  it("lässt andere Phasen unverändert", () => {
    const s: GameState = { phase: "discussion", round };
    expect(restore(s)).toBe(s);
  });
});

describe("hide", () => {
  it("verdeckt eine offene Karte, wenn die App in den Hintergrund geht", () => {
    expect(reducer({ phase: "reveal", round, index: 1, seen: true }, { type: "hide" })).toEqual({
      phase: "handoff",
      round,
      index: 1,
    });
  });

  it("lässt andere Phasen unverändert", () => {
    const s: GameState = { phase: "discussion", round };
    expect(reducer(s, { type: "hide" })).toBe(s);
  });
});
