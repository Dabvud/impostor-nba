import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import SetupScreen from "../../src/screens/SetupScreen";
import { poolSizes } from "../../src/game/modes";
import { settings } from "./fixtures";

describe("Spielmodi in der Einrichtung", () => {
  it("kennzeichnet die leeren Spieler-Modi als bald und lässt nur NBA-Teams zu", async () => {
    const user = userEvent.setup();
    render(<SetupScreen initial={null} poolSizes={poolSizes()} onStart={vi.fn()} />);
    expect(screen.getByRole("option", { name: "⭐ Aktuelle Stars (bald)" })).toBeDisabled();
    expect(screen.getByRole("option", { name: "👑 Legenden (bald)" })).toBeDisabled();
    expect(screen.getByRole("option", { name: "🏟️ NBA-Teams" })).toBeEnabled();
    expect(screen.getByLabelText("Spielmodus")).toHaveValue("teams");
    await user.selectOptions(screen.getByLabelText("Spielmodus"), "stars");
    expect(screen.getByLabelText("Spielmodus")).toHaveValue("teams");
    await user.selectOptions(screen.getByLabelText("Spielmodus"), "legenden");
    expect(screen.getByLabelText("Spielmodus")).toHaveValue("teams");
  });

  it("startet eine neue Einrichtung mit NBA-Teams", async () => {
    const onStart = vi.fn();
    const user = userEvent.setup();
    render(<SetupScreen initial={null} poolSizes={poolSizes()} onStart={onStart} />);
    expect(screen.getByRole("heading", { name: "Impostor NBA" })).toBeInTheDocument();
    for (const name of ["Anna", "Ben", "Cem"]) await user.type(screen.getByLabelText("Name"), name + "{Enter}");
    await user.click(screen.getByRole("button", { name: "Start" }));
    expect(onStart).toHaveBeenCalledWith(expect.objectContaining({ mode: "teams", difficulty: 1, names: ["Anna", "Ben", "Cem"] }));
  });

  it("fällt bei gespeichertem Modus stars auf NBA-Teams zurück und startet damit", async () => {
    const onStart = vi.fn();
    const user = userEvent.setup();
    render(<SetupScreen initial={settings} poolSizes={poolSizes()} onStart={onStart} />);
    expect(screen.getByLabelText("Spielmodus")).toHaveValue("teams");
    expect(screen.getByRole("button", { name: "Start" })).toBeEnabled();
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
