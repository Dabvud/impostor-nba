import type { Round } from "./types";

export type Winner = "crew" | "impostor";
/**
 * Auflösung in Schritten: erst „erwischt?“, dann ggf. raten lassen und das Wort aufdecken.
 * Steht im Zustand, damit Neuladen beim gleichen Schritt weitermacht.
 */
export type ResolutionStep = "caught?" | "guess" | "guessed?" | "done";

export type GameState =
  | { phase: "setup" }
  | { phase: "handoff"; round: Round; index: number }
  | { phase: "reveal"; round: Round; index: number; seen: boolean }
  | { phase: "clues"; round: Round; index: number }
  | { phase: "discussion"; round: Round }
  | { phase: "resolution"; round: Round; step: ResolutionStep; winner: Winner | null; caught: boolean | null };

export type Action =
  | { type: "start"; round: Round }
  | { type: "confirm" }
  | { type: "seen" }
  | { type: "passOn" }
  | { type: "nextClue" }
  | { type: "resolve" }
  | { type: "caught"; yes: boolean }
  | { type: "revealWord" }
  | { type: "guessed"; yes: boolean }
  | { type: "toSetup" }
  | { type: "hide" }; // App geht in den Hintergrund: offene Karte verdecken

/** Aktionen, die in der aktuellen Phase nicht gültig sind, lassen den Zustand unverändert. */
export function reducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case "start":
      return state.phase === "setup" || (state.phase === "resolution" && state.step === "done")
        ? { phase: "handoff", round: action.round, index: 0 }
        : state;
    case "confirm":
      return state.phase === "handoff" ? { ...state, phase: "reveal", seen: false } : state;
    case "seen":
      return state.phase === "reveal" && !state.seen ? { ...state, seen: true } : state;
    case "passOn": {
      if (state.phase !== "reveal" || !state.seen) return state;
      const index = state.index + 1;
      if (index < state.round.revealOrder.length) return { phase: "handoff", round: state.round, index };
      return state.round.thinkSeconds
        ? { phase: "clues", round: state.round, index: 0 }
        : { phase: "discussion", round: state.round };
    }
    case "nextClue": {
      if (state.phase !== "clues") return state;
      const index = state.index + 1;
      return index < state.round.speakingOrder.length
        ? { phase: "clues", round: state.round, index }
        : { phase: "discussion", round: state.round };
    }
    case "resolve": {
      if (state.phase !== "discussion") return state;
      const { impostors, revealOrder } = state.round;
      // Ohne oder mit nur Impostorn gibt es nichts zu entscheiden
      const decided = impostors.length === 0 || impostors.length === revealOrder.length;
      return { phase: "resolution", round: state.round, step: decided ? "done" : "caught?", winner: null, caught: null };
    }
    case "caught":
      if (state.phase !== "resolution" || state.step !== "caught?") return state;
      if (!action.yes) return { ...state, step: "done", winner: "impostor", caught: false };
      return state.round.guessEnabled
        ? { ...state, step: "guess", caught: true }
        : { ...state, step: "done", winner: "crew", caught: true };
    case "revealWord":
      return state.phase === "resolution" && state.step === "guess" ? { ...state, step: "guessed?" } : state;
    case "guessed":
      return state.phase === "resolution" && state.step === "guessed?"
        ? { ...state, step: "done", winner: action.yes ? "impostor" : "crew" }
        : state;
    case "toSetup":
      return state.phase === "setup" ? state : { phase: "setup" };
    case "hide":
      return restore(state);
  }
}

/** Nach Neuladen nie eine offene Karte zeigen, sondern zurück zur Übergabe. */
export function restore(saved: GameState): GameState {
  return saved.phase === "reveal" ? { phase: "handoff", round: saved.round, index: saved.index } : saved;
}
