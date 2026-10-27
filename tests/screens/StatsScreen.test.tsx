import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Group } from "../../src/game/groups";
import type { RoundRecord } from "../../src/game/stats";
import StatsScreen from "../../src/screens/StatsScreen";

afterEach(() => vi.restoreAllMocks());

const group: Group = {
  id: "g1",
  name: "Freitagsrunde",
  members: [
    { id: "a", name: "Anna" },
    { id: "b", name: "Ben" },
    { id: "c", name: "Cem" },
  ],
  selected: ["a", "b", "c"],
  evening: 2,
};
const rec = (evening: number, impostor: string, winner: "crew" | "impostor"): RoundRecord => ({
  roundId: `${evening}${impostor}${winner}`,
  evening,
  at: "2026-10-26T20:00:00.000Z",
  mode: "stars",
  players: ["a", "b", "c"],
  impostors: [impostor],
  starter: "c",
  winner,
  caught: winner === "crew",
});
const records = [rec(1, "a", "impostor"), rec(1, "a", "crew"), rec(2, "b", "impostor")];

function setup(extra: Partial<Parameters<typeof StatsScreen>[0]> = {}) {
  const props = { group, records, onNewEvening: vi.fn(), onClear: vi.fn(), onBack: vi.fn(), ...extra };
  render(<StatsScreen {...props} />);
  return props;
}

describe("StatsScreen", () => {
  it("zeigt standardmäßig den heutigen Abend", () => {
    setup();
    expect(screen.getByRole("button", { name: "Heute" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("1 Runde")).toBeInTheDocument();
    expect(within(screen.getByTestId("master")).getByText("Ben")).toBeInTheDocument();
    expect(within(screen.getByTestId("crew-rate")).getByText("0 %")).toBeInTheDocument();
  });

  it("schaltet auf Allzeit um", async () => {
    const user = userEvent.setup();
    setup();
    await user.click(screen.getByRole("button", { name: "Allzeit" }));
    expect(screen.getByText("3 Runden")).toBeInTheDocument();
    expect(within(screen.getByTestId("unlucky")).getByText("Anna")).toBeInTheDocument();
    expect(within(screen.getByTestId("crew-rate")).getByText("33 %")).toBeInTheDocument();
    const anna = screen.getByRole("row", { name: /Anna/ });
    expect(within(anna).getAllByRole("cell").map((c) => c.textContent)).toEqual(["Anna", "3", "2", "1", "1"]);
  });

  it("zeigt einen leeren Abend einladend", () => {
    setup({ records: [rec(1, "a", "crew")] });
    expect(screen.getByText("Heute noch keine Runde – los geht's!")).toBeInTheDocument();
  });

  it("startet einen neuen Abend und löscht nur nach Rückfrage", async () => {
    const user = userEvent.setup();
    const props = setup();
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    await user.click(screen.getByRole("button", { name: "Neuer Abend" }));
    expect(confirm).toHaveBeenCalledWith("Neuen Abend starten? „Heute“ beginnt dann wieder bei null.");
    expect(props.onNewEvening).not.toHaveBeenCalled();
    confirm.mockReturnValue(true);
    await user.click(screen.getByRole("button", { name: "Neuer Abend" }));
    expect(props.onNewEvening).toHaveBeenCalledOnce();
    confirm.mockReturnValue(false);
    await user.click(screen.getByRole("button", { name: "Statistik löschen" }));
    expect(props.onClear).not.toHaveBeenCalled();
    confirm.mockReturnValue(true);
    await user.click(screen.getByRole("button", { name: "Statistik löschen" }));
    expect(props.onClear).toHaveBeenCalledOnce();
    await user.click(screen.getByRole("button", { name: "Zurück" }));
    expect(props.onBack).toHaveBeenCalledOnce();
  });
});
