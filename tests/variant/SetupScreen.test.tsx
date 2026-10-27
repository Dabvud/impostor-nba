import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import SetupScreen from "../../src/screens/SetupScreen";
import { poolSizes } from "../../src/game/modes";
import { settings } from "./fixtures";

describe("Spielmodi in der Einrichtung", () => {
  it("bietet Stars, spielbare Legenden ohne bald und NBA-Teams an", async () => {
    const user = userEvent.setup();
    render(<SetupScreen initial={null} poolSizes={poolSizes()} onStart={vi.fn()} />);
    expect(screen.getByRole("option", { name: "⭐ Aktuelle Stars" })).toBeEnabled();
    expect(screen.getByRole("option", { name: "👑 Legenden" })).toBeEnabled();
    expect(screen.queryByRole("option", { name: "👑 Legenden (bald)" })).not.toBeInTheDocument();
    expect(screen.getByRole("option", { name: "🏟️ NBA-Teams" })).toBeEnabled();
    expect(screen.getByLabelText("Spielmodus")).toHaveValue("stars");
    await user.selectOptions(screen.getByLabelText("Spielmodus"), "teams");
    expect(screen.getByLabelText("Spielmodus")).toHaveValue("teams");
    await user.selectOptions(screen.getByLabelText("Spielmodus"), "stars");
    expect(screen.getByLabelText("Spielmodus")).toHaveValue("stars");
    await user.selectOptions(screen.getByLabelText("Spielmodus"), "legenden");
    expect(screen.getByLabelText("Spielmodus")).toHaveValue("legenden");
  });

  it("startet mit dem ausgewählten Legenden-Modus", async () => {
    const onStart = vi.fn();
    const user = userEvent.setup();
    render(<SetupScreen initial={settings} poolSizes={poolSizes()} onStart={onStart} />);
    await user.selectOptions(screen.getByLabelText("Spielmodus"), "legenden");
    await user.click(screen.getByRole("button", { name: "Start" }));
    expect(onStart).toHaveBeenCalledWith({ ...settings, mode: "legenden" });
  });

  it("startet eine neue Einrichtung mit aktuellen Stars", async () => {
    const onStart = vi.fn();
    const user = userEvent.setup();
    render(<SetupScreen initial={null} poolSizes={poolSizes()} onStart={onStart} />);
    expect(screen.getByRole("heading", { name: "Impostor NBA" })).toBeInTheDocument();
    for (const name of ["Anna", "Ben", "Cem"]) await user.type(screen.getByLabelText("Name"), name + "{Enter}");
    await user.click(screen.getByRole("button", { name: "Start" }));
    expect(onStart).toHaveBeenCalledWith(expect.objectContaining({ mode: "stars", difficulty: 1, names: ["Anna", "Ben", "Cem"] }));
  });

  it("behält den gespeicherten spielbaren Modus stars und startet damit", async () => {
    const onStart = vi.fn();
    const user = userEvent.setup();
    render(<SetupScreen initial={settings} poolSizes={poolSizes()} onStart={onStart} />);
    expect(screen.getByLabelText("Spielmodus")).toHaveValue("stars");
    expect(screen.getByRole("button", { name: "Start" })).toBeEnabled();
    await user.click(screen.getByRole("button", { name: "Start" }));
    expect(onStart).toHaveBeenCalledWith(settings);
  });

  it("fällt bei leeren Spieler-Töpfen auf NBA-Teams zurück", async () => {
    const onStart = vi.fn();
    const user = userEvent.setup();
    render(<SetupScreen initial={settings} poolSizes={{ stars: 0, legenden: 0, teams: 30 }} onStart={onStart} />);
    expect(screen.getByRole("option", { name: "⭐ Aktuelle Stars (bald)" })).toBeDisabled();
    expect(screen.getByLabelText("Spielmodus")).toHaveValue("teams");
    await user.click(screen.getByRole("button", { name: "Start" }));
    expect(onStart).toHaveBeenCalledWith({ ...settings, mode: "teams" });
  });

  it("zeigt mit den echten Topfgrößen keine Schwierigkeits-Buttons", () => {
    render(<SetupScreen initial={null} poolSizes={poolSizes()} onStart={vi.fn()} />);
    for (const name of ["Leicht", "Mittel", "Schwer"]) {
      expect(screen.queryByRole("button", { name })).not.toBeInTheDocument();
    }
  });
});
