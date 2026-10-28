import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MODES, poolFor } from "../../src/game/modes";
import type { Settings } from "../../src/game/types";
import SetupScreen from "../../src/screens/SetupScreen";

vi.mock("../../src/variant/modes", async (importOriginal) => {
  const original = await importOriginal<typeof import("../../src/variant/modes")>();
  return {
    ...original,
    MODES: original.MODES.map((mode, i) => ({
      id: mode.id, label: "Modus " + i, hasDifficulty: false,
      ...(i === 0 ? { choices: [
        { id: "small", label: "Klein" }, { id: "a", label: "Auswahl A" }, { id: "b", label: "Auswahl B" },
      ], choiceLabel: "Kategorie", minChoicePool: 5 } : i === 1 ? {
        choices: [{ id: "small", label: "Klein" }, { id: "c", label: "Auswahl C" }],
        choiceLabel: "Andere Kategorie", minChoicePool: 5,
      } : {}),
    })),
    poolFor: vi.fn(),
  };
});
const initial: Settings = {
  names: ["Anna", "Ben", "Cem"], impostorCount: 1, mode: MODES[0].id, difficulty: 1,
  hintsEnabled: true, specialRules: false, secretImpostors: false, thinkSeconds: null, discussSeconds: null,
  groupId: null, guessEnabled: true, excludedFilters: [], casual: false, choice: null,
};
beforeEach(() => {
  vi.mocked(poolFor).mockClear();
  vi.mocked(poolFor).mockImplementation((_mode, _difficulty, options) =>
    Array.from({ length: options?.choice === "small" ? 4 : options?.choice === "b" ? 7 : options?.choice ? 5 : 0 },
      (_, i) => ({ name: "Begriff " + i, hints: [] })));
});

describe("Einfachauswahl", () => {
  it.each([null, "unbekannt", "small"])("ersetzt %s durch die erste spielbare Option", (choice) => {
    const onDraftChange = vi.fn();
    render(<SetupScreen initial={{ ...initial, choice }} onStart={vi.fn()} onDraftChange={onDraftChange} />);
    expect(screen.getByLabelText("Kategorie")).toHaveValue("a");
    expect(screen.getByRole("option", { name: "Klein (zu wenige)" })).toBeDisabled();
    expect(screen.getByRole("option", { name: "Auswahl A" })).toBeEnabled();
    expect(screen.getByText("5 im Topf")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Start" })).toBeEnabled();
    expect(onDraftChange).toHaveBeenLastCalledWith({ ...initial, choice: "a" }, initial.names);
  });

  it("behält eine gültige Wahl und übergibt Änderungen an Start und Entwurf", async () => {
    const user = userEvent.setup();
    const onStart = vi.fn();
    const onDraftChange = vi.fn();
    render(<SetupScreen initial={{ ...initial, choice: "b" }} onStart={onStart} onDraftChange={onDraftChange} />);
    expect(screen.getByLabelText("Kategorie")).toHaveValue("b");
    expect(screen.getByText("7 im Topf")).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText("Kategorie"), "small");
    expect(screen.getByLabelText("Kategorie")).toHaveValue("b");
    await user.selectOptions(screen.getByLabelText("Kategorie"), "a");
    expect(screen.getByText("5 im Topf")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Start" }));
    expect(onStart).toHaveBeenCalledWith({ ...initial, choice: "a" });
    expect(onDraftChange).toHaveBeenLastCalledWith({ ...initial, choice: "a" }, initial.names);
  });

  it("korrigiert die Wahl beim Wechsel zu anderen Optionen und blendet sie ohne choices aus", async () => {
    const user = userEvent.setup();
    render(<SetupScreen initial={{ ...initial, choice: "b" }} onStart={vi.fn()} />);
    await user.selectOptions(screen.getByLabelText("Spielmodus"), MODES[1].id);
    expect(screen.getByLabelText("Andere Kategorie")).toHaveValue("c");
    await user.selectOptions(screen.getByLabelText("Spielmodus"), MODES[2].id);
    expect(screen.queryByLabelText("Andere Kategorie")).not.toBeInTheDocument();
  });

  it("berechnet die Topfgrößen beim Ändern von Namen nicht neu", async () => {
    const user = userEvent.setup();
    render(<SetupScreen initial={initial} onStart={vi.fn()} />);
    vi.mocked(poolFor).mockClear();
    await user.type(screen.getByLabelText("Name"), "Dana{Enter}");
    expect(poolFor).not.toHaveBeenCalled();
  });

  it.each([0, 4])("sperrt Start, wenn alle Optionen nur %i Begriffe enthalten", (size) => {
    vi.mocked(poolFor).mockReturnValue(Array.from({ length: size }, (_, i) => ({ name: "Begriff " + i, hints: [] })));
    const onDraftChange = vi.fn();
    render(<SetupScreen initial={{ ...initial, choice: "b" }} onStart={vi.fn()} onDraftChange={onDraftChange} />);
    expect(screen.getByLabelText("Kategorie")).toHaveValue("");
    expect(screen.getByRole("option", { name: "Auswahl B (zu wenige)" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Start" })).toBeDisabled();
    expect(screen.getByText("Mindestens eine Auswahl nötig")).toBeInTheDocument();
    expect(onDraftChange).toHaveBeenLastCalledWith({ ...initial, choice: null }, initial.names);
  });
});
