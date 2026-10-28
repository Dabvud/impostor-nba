import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "../../src/App";
import { alarm } from "../../src/alarm";
import { MODES } from "../../src/game/modes";
import type { Round, Settings } from "../../src/game/types";
import CluesScreen from "../../src/screens/CluesScreen";
import DiscussionScreen from "../../src/screens/DiscussionScreen";
import RulesScreen from "../../src/screens/RulesScreen";
import SetupScreen from "../../src/screens/SetupScreen";
import { saveGame } from "../../src/storage";
import { SPECIAL_RULES, SPECIAL_RULES_LABEL, SPECIAL_RULE_HEADING, SPECIAL_RULE_START } from "../../src/variant/config";

vi.mock("../../src/alarm", () => ({ alarm: vi.fn(), unlockAudio: vi.fn() }));
vi.mock("../../src/variant/config", async (importOriginal) => ({
  ...await importOriginal<typeof import("../../src/variant/config")>(),
  SPECIAL_RULES: [
    { id: "regel-a", title: "Regel A", text: "Hinweise nach Regel A geben." },
    { id: "regel-b", title: "Regel B", text: "Hinweise nach Regel B geben." },
  ],
}));
vi.mock("../../src/variant/modes", async (importOriginal) => ({
  ...await importOriginal<typeof import("../../src/variant/modes")>(),
  poolFor: () => [{ name: "Begriff A", hints: [] }],
}));

const initial: Settings = {
  names: ["Anna", "Ben", "Cem"], mode: MODES[0].id, difficulty: 1, impostorCount: 1,
  hintsEnabled: true, secretImpostors: false, specialRules: false, thinkSeconds: null,
  discussSeconds: null, groupId: null, guessEnabled: true, excludedFilters: [], casual: false, choice: null,
};
const round: Round = {
  id: "runde", word: { name: "Begriff A", hints: [] }, hint: null, impostors: ["Ben"],
  revealOrder: initial.names, speakingOrder: initial.names, starter: "Anna", guessEnabled: true,
  thinkSeconds: null, discussSeconds: null, specialRule: SPECIAL_RULES[0],
};

beforeEach(() => { localStorage.clear(); vi.useFakeTimers(); });
afterEach(() => { vi.useRealTimers(); vi.clearAllMocks(); });

describe("Sonderregeln im Setup und Regelwerk", () => {
  it("ist standardmäßig aus und meldet den Schalter im Start und Entwurf", () => {
    const onStart = vi.fn();
    const onDraftChange = vi.fn();
    const view = render(<SetupScreen initial={initial} onStart={onStart} onDraftChange={onDraftChange} />);
    const toggle = screen.getByRole("switch", { name: SPECIAL_RULES_LABEL });
    expect(toggle).not.toBeChecked();
    fireEvent.click(toggle);
    expect(toggle).toBeChecked();
    expect(onDraftChange).toHaveBeenLastCalledWith({ ...initial, specialRules: true }, initial.names);
    fireEvent.click(screen.getByRole("button", { name: "Start" }));
    expect(onStart).toHaveBeenCalledWith({ ...initial, specialRules: true });
    view.unmount();
    render(<SetupScreen initial={{ ...initial, specialRules: true }} onStart={onStart} />);
    expect(screen.getByRole("switch", { name: SPECIAL_RULES_LABEL })).toBeChecked();
  });

  it("versteckt Schalter und Regelliste, wenn die Variante keine Regeln hat", () => {
    const rules = SPECIAL_RULES.splice(0);
    try {
      const onStart = vi.fn();
      render(<SetupScreen initial={{ ...initial, specialRules: true }} onStart={onStart} />);
      expect(screen.queryByRole("switch", { name: SPECIAL_RULES_LABEL })).not.toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: "Start" }));
      expect(onStart).toHaveBeenCalledWith(initial);
      render(<RulesScreen onBack={vi.fn()} />);
      expect(screen.queryByRole("heading", { name: SPECIAL_RULES_LABEL })).not.toBeInTheDocument();
    } finally { SPECIAL_RULES.push(...rules); }
  });

  it("zeigt alle Regeltexte aus der Variante im Regelwerk", () => {
    render(<RulesScreen onBack={vi.fn()} />);
    expect(screen.getByRole("heading", { name: SPECIAL_RULES_LABEL })).toBeInTheDocument();
    for (const rule of SPECIAL_RULES) {
      expect(screen.getByText(rule.title)).toBeInTheDocument();
      expect(screen.getByText(new RegExp(rule.text))).toBeInTheDocument();
    }
  });
});

describe("Gemeinsame Regelanzeige vor Hinweisen", () => {
  it("wartet in der ersten Hinweisrunde mit dem Timer bis alle die Regel kennen", () => {
    render(<CluesScreen name="Anna" seconds={15} position={1} total={3} specialRule={round.specialRule} onNext={vi.fn()} />);
    expect(screen.getByRole("region", { name: SPECIAL_RULE_HEADING })).toHaveTextContent(SPECIAL_RULES[0].text);
    expect(screen.queryByText("Hinweis 1 von 3")).not.toBeInTheDocument();
    act(() => vi.advanceTimersByTime(20000));
    expect(alarm).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: SPECIAL_RULE_START }));
    expect(screen.getByText("0:15")).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(1000));
    expect(screen.getByText("0:14")).toBeInTheDocument();
  });

  it("zeigt dieselbe Karte bei späteren Hinweisen ohne erneut zu warten", () => {
    render(<CluesScreen name="Ben" seconds={15} position={2} total={3} specialRule={round.specialRule} onNext={vi.fn()} />);
    expect(screen.getByText(SPECIAL_RULES[0].text)).toBeInTheDocument();
    expect(screen.getByText("Hinweis 2 von 3")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: SPECIAL_RULE_START })).not.toBeInTheDocument();
  });

  it("wartet ohne Hinweisrunde in der Diskussion vor dem Start", () => {
    render(<DiscussionScreen starter="Anna" seconds={30} specialRule={round.specialRule} onResolve={vi.fn()} />);
    expect(screen.getByText(SPECIAL_RULES[0].text)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Auflösen" })).not.toBeInTheDocument();
    act(() => vi.advanceTimersByTime(40000));
    expect(alarm).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: SPECIAL_RULE_START }));
    expect(screen.getByText("0:30")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Anna beginnt" })).toBeInTheDocument();
  });

  it.each([null, 15])("erscheint im App-Ablauf erst nach allen Rollen, Überlegzeit %s", (thinkSeconds) => {
    saveGame({ phase: "reveal", round: { ...round, thinkSeconds }, index: 2, seen: true });
    render(<App />);
    expect(screen.queryByText(SPECIAL_RULES[0].text)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Ich bin Cem" }));
    expect(screen.queryByText(SPECIAL_RULES[0].text)).not.toBeInTheDocument();
    const card = screen.getByTestId("reveal-card");
    fireEvent.pointerDown(card, { clientY: 400, pointerId: 1 });
    fireEvent.pointerMove(card, { clientY: 250, pointerId: 1 });
    fireEvent.pointerUp(card, { clientY: 250, pointerId: 1 });
    fireEvent.click(screen.getByRole("button", { name: "Fertig – weitergeben" }));
    expect(screen.getByRole("region", { name: SPECIAL_RULE_HEADING })).toHaveTextContent(SPECIAL_RULES[0].text);
    fireEvent.click(screen.getByRole("button", { name: SPECIAL_RULE_START }));
    if (thinkSeconds) {
      for (let i = 0; i < 3; i++) fireEvent.click(screen.getByRole("button", { name: "Weiter ▶" }));
      expect(screen.queryByRole("button", { name: SPECIAL_RULE_START })).not.toBeInTheDocument();
      expect(screen.getByRole("heading", { name: "Diskussion" })).toBeInTheDocument();
    } else expect(screen.getByRole("heading", { name: "Anna beginnt" })).toBeInTheDocument();
    expect(screen.getByText(SPECIAL_RULES[0].text)).toBeInTheDocument();
  });
});
