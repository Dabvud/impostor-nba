import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MODES, poolFor } from "../../src/game/modes";
import type { Settings } from "../../src/game/types";
import SetupScreen from "../../src/screens/SetupScreen";
import { CASUAL_LABEL, FILTER_LABEL } from "../../src/variant/config";

vi.mock("../../src/variant/modes", async (importOriginal) => {
  const original = await importOriginal<typeof import("../../src/variant/modes")>();
  return {
    ...original,
    MODES: original.MODES.map((mode, i) => ({
      ...mode,
      filters: i === 0 ? [{ id: "a", label: "Auswahl A" }, { id: "b", label: "Auswahl B" }] : undefined,
      hasCasual: i === 0,
    })),
    poolFor: vi.fn(),
  };
});

const initial: Settings = {
  names: ["Anna", "Ben", "Cem"], impostorCount: 1, mode: MODES[0].id, difficulty: 1,
  hintsEnabled: true, secretImpostors: false, thinkSeconds: null, discussSeconds: null,
  groupId: null, guessEnabled: true, excludedFilters: [], casual: false,
};

beforeEach(() => {
  vi.mocked(poolFor).mockImplementation((mode, _difficulty, options) => {
    if (mode === MODES[0].id && options?.excludedFilters.includes("a") && options.excludedFilters.includes("b")) return [];
    return [{ name: "Begriff A", hints: [] }];
  });
});

describe("Setup mit Topfoptionen", () => {
  it("schaltet Filter aus und wieder an und übergibt beide Optionen an onStart und den Entwurf", async () => {
    const user = userEvent.setup();
    const onStart = vi.fn();
    const onDraftChange = vi.fn();
    render(<SetupScreen initial={initial} onStart={onStart} onDraftChange={onDraftChange} />);
    expect(screen.getByRole("group", { name: FILTER_LABEL })).toBeInTheDocument();
    const a = screen.getByRole("button", { name: "Auswahl A" });
    expect(a).toHaveAttribute("aria-pressed", "true");
    await user.click(a);
    expect(a).toHaveAttribute("aria-pressed", "false");
    await user.click(a);
    expect(a).toHaveAttribute("aria-pressed", "true");
    await user.click(a);
    await user.click(screen.getByRole("switch", { name: CASUAL_LABEL }));
    expect(poolFor).toHaveBeenLastCalledWith(initial.mode, 1, { excludedFilters: ["a"], casual: true });
    await user.click(screen.getByRole("button", { name: "Start" }));
    const expected = { ...initial, excludedFilters: ["a"], casual: true };
    expect(onStart).toHaveBeenCalledWith(expected);
    expect(onDraftChange).toHaveBeenLastCalledWith(expected, initial.names);
  });

  it("übernimmt gespeicherte Optionen und behält sie bei einem Moduswechsel", async () => {
    const user = userEvent.setup();
    const onStart = vi.fn();
    const saved = { ...initial, excludedFilters: ["a", "unbekannt"], casual: true };
    render(<SetupScreen initial={saved} onStart={onStart} />);
    expect(screen.getByRole("button", { name: "Auswahl A" })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("switch", { name: CASUAL_LABEL })).toBeChecked();
    await user.selectOptions(screen.getByLabelText("Spielmodus"), MODES[1].id);
    expect(screen.queryByRole("group", { name: FILTER_LABEL })).not.toBeInTheDocument();
    expect(screen.queryByRole("switch", { name: CASUAL_LABEL })).not.toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText("Spielmodus"), initial.mode);
    expect(screen.getByRole("button", { name: "Auswahl A" })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("switch", { name: CASUAL_LABEL })).toBeChecked();
    await user.click(screen.getByRole("button", { name: "Start" }));
    expect(onStart).toHaveBeenCalledWith(saved);
  });

  it("sperrt Start bei vollständig abgewählten Filtern und erlaubt es nach Wiederwahl", async () => {
    const user = userEvent.setup();
    const onStart = vi.fn();
    render(<SetupScreen initial={initial} onStart={onStart} />);
    await user.click(screen.getByRole("button", { name: "Auswahl A" }));
    await user.click(screen.getByRole("button", { name: "Auswahl B" }));
    expect(screen.getByText("Mindestens eine Auswahl nötig")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Start" })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Start" }));
    expect(onStart).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Auswahl A" }));
    expect(screen.queryByText("Mindestens eine Auswahl nötig")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Start" })).toBeEnabled();
  });

  it("validiert die aktuelle gefilterte Größe auch ohne übergebene Topfgrößen", async () => {
    vi.mocked(poolFor).mockImplementation((_mode, _difficulty, options) => options?.casual ? [] : [{ name: "A", hints: [] }]);
    const user = userEvent.setup();
    render(<SetupScreen initial={initial} onStart={vi.fn()} />);
    await user.click(screen.getByRole("switch", { name: CASUAL_LABEL }));
    expect(screen.getByText("Mit dieser Auswahl gibt es keine Begriffe")).toBeInTheDocument();
    expect(screen.queryByText("In diesem Modus gibt es noch keine Begriffe")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Start" })).toBeDisabled();
    await user.click(screen.getByRole("switch", { name: CASUAL_LABEL }));
    expect(screen.getByRole("button", { name: "Start" })).toBeEnabled();
  });
});
