import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "../src/App";
import type { GameState } from "../src/game/state";
import { saveGame } from "../src/storage";

const round = {
  word: { name: "Schalke 04", hints: [] },
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

function revealAndPass() {
  const card = screen.getByTestId("reveal-card");
  fireEvent.pointerDown(card, { clientY: 400, pointerId: 1 });
  fireEvent.pointerMove(card, { clientY: 250, pointerId: 1 });
  fireEvent.pointerUp(card, { clientY: 250, pointerId: 1 });
  fireEvent.click(screen.getByRole("button", { name: "Fertig – weitergeben" }));
}

beforeEach(() => localStorage.clear());
afterEach(() => vi.restoreAllMocks());

describe("App", () => {
  it("spielt eine komplette Runde und startet eine neue", async () => {
    const user = userEvent.setup();
    render(<App />);
    for (const name of ["Anna", "Ben", "Cem"]) await user.type(screen.getByLabelText("Name"), `${name}{Enter}`);
    await user.selectOptions(screen.getByLabelText("Spielmodus"), "vereine-de");
    await user.click(screen.getByRole("button", { name: "Start" }));

    for (let i = 0; i < 3; i++) {
      expect(screen.getByRole("heading", { name: /ist dran$/ })).toBeInTheDocument();
      await user.click(screen.getByRole("button", { name: /^Ich bin / }));
      revealAndPass();
    }

    expect(screen.getByRole("heading", { name: /beginnt$/ })).toBeInTheDocument();
    fireEvent.pointerDown(screen.getByRole("button", { name: "Auflösen" }));
    expect(await screen.findByText(/erwischt\?$/, {}, { timeout: 2000 })).toBeInTheDocument();
    await new Promise((r) => setTimeout(r, 550));
    await user.click(screen.getByRole("button", { name: "Nein" }));
    expect(screen.getByText("Das Wort war")).toBeInTheDocument();
    expect(screen.getByText("Impostor gewinnt 🕵️")).toBeInTheDocument();

    await new Promise((r) => setTimeout(r, 550));
    await user.click(screen.getByRole("button", { name: "Neue Runde" }));
    expect(screen.getByRole("heading", { name: /ist dran$/ })).toBeInTheDocument();
  });

  it("führt mit Überlegzeit durch die Hinweisrunde ab dem Starter", () => {
    saveGame({ phase: "reveal", round: { ...round, thinkSeconds: 15 }, index: 2, seen: true });
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "Ich bin Cem" }));
    revealAndPass();
    expect(screen.getByRole("heading", { name: "Cem" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Weiter ▶" }));
    expect(screen.getByRole("heading", { name: "Anna" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Weiter ▶" }));
    fireEvent.click(screen.getByRole("button", { name: "Weiter ▶" }));
    expect(screen.getByRole("heading", { name: "Diskussion" })).toBeInTheDocument();
  });

  it("zeigt in der Alle-Impostor-Runde jedem seinen eigenen Tipp", () => {
    const personal = { ...round, impostors: ["Anna", "Ben", "Cem"], personalHints: { Anna: "Linksfuß", Ben: "Glatze", Cem: "2010er" } };
    saveGame({ phase: "reveal", round: personal, index: 1, seen: false });
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "Ich bin Ben" }));
    const card = screen.getByTestId("reveal-card");
    fireEvent.pointerDown(card, { clientY: 400, pointerId: 1 });
    fireEvent.pointerMove(card, { clientY: 250, pointerId: 1 });
    expect(screen.getByText("Tipp: Glatze")).toBeInTheDocument();
  });

  it("setzt nach Neuladen beim Übergabe-Bildschirm des aktuellen Spielers fort", () => {
    saveGame({ phase: "reveal", round, index: 1, seen: true } satisfies GameState);
    render(<App />);
    expect(screen.getByRole("heading", { name: "Ben ist dran" })).toBeInTheDocument();
    expect(screen.queryByText("Schalke 04")).not.toBeInTheDocument();
  });

  it("verdeckt die Karte, wenn das Handy gesperrt oder die App gewechselt wird", () => {
    saveGame({ phase: "handoff", round, index: 0 });
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "Ich bin Anna" }));
    expect(screen.getByTestId("reveal-card")).toBeInTheDocument();

    const visibility = vi.spyOn(document, "visibilityState", "get").mockReturnValue("hidden");
    fireEvent(document, new Event("visibilitychange"));
    visibility.mockReturnValue("visible");

    expect(screen.getByRole("heading", { name: "Anna ist dran" })).toBeInTheDocument();
  });

  it("fragt bei der Zurück-Geste, ob die Runde abgebrochen werden soll", () => {
    saveGame({ phase: "handoff", round, index: 0 });
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    render(<App />);

    fireEvent.popState(window);
    expect(confirm).toHaveBeenCalledWith("Runde abbrechen?");
    expect(screen.getByRole("heading", { name: "Anna ist dran" })).toBeInTheDocument();

    confirm.mockReturnValue(true);
    fireEvent.popState(window);
    expect(screen.getByRole("button", { name: "Start" })).toBeInTheDocument();
  });
});

describe("Gruppen", () => {
  it("legt eine Gruppe an, kehrt zur Einrichtung zurück und startet mit ihr", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.type(screen.getByLabelText("Name"), "Gast{Enter}");
    await user.click(screen.getByRole("button", { name: "+ Neue Gruppe" }));
    await user.type(screen.getByLabelText("Gruppenname"), "Freitagsrunde");
    for (const n of ["Luca", "Fabi", "Jonas"]) await user.type(screen.getByLabelText("Neues Mitglied"), `${n}{Enter}`);
    await user.click(screen.getByRole("button", { name: "Speichern" }));
    expect(screen.getByRole("button", { name: "Freitagsrunde" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: /^Fabi/ })).toHaveTextContent("2");
    await user.click(screen.getByRole("button", { name: "Ohne Gruppe" }));
    expect(screen.getByText("Gast")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Freitagsrunde" }));
    await user.click(screen.getByRole("button", { name: "Start" }));
    expect(screen.getByRole("heading", { name: /ist dran$/ })).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem("impostor:v1:groups") ?? "[]")[0].name).toBe("Freitagsrunde");
  });

  it("löscht eine Gruppe samt Statistik und fällt auf „Ohne Gruppe“ zurück", async () => {
    const user = userEvent.setup();
    localStorage.setItem(
      "impostor:v1:groups",
      JSON.stringify([{ id: "g1", name: "Alt", members: [{ id: "a", name: "Anna" }], selected: ["a"], evening: 1 }]),
    );
    localStorage.setItem("impostor:v1:stats:g1", JSON.stringify([]));
    vi.spyOn(window, "confirm").mockReturnValue(true);
    render(<App />);
    await user.click(screen.getByRole("button", { name: "Alt" }));
    await user.click(screen.getByRole("button", { name: "Gruppe bearbeiten" }));
    await user.click(screen.getByRole("button", { name: "Gruppe löschen" }));
    expect(screen.queryByRole("button", { name: "Alt" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ohne Gruppe" })).toHaveAttribute("aria-pressed", "true");
    expect(localStorage.getItem("impostor:v1:stats:g1")).toBeNull();
  });
});

describe("Statistik-Protokoll", () => {
  const group = {
    id: "g1",
    name: "Freitagsrunde",
    members: [
      { id: "a", name: "Anna" },
      { id: "b", name: "Ben" },
      { id: "c", name: "Cem" },
    ],
    selected: ["a", "b", "c"],
    evening: 1,
  };
  const settings = {
    names: ["Anna", "Ben", "Cem"],
    impostorCount: 1,
    mode: "vereine-de",
    difficulty: 1,
    hintsEnabled: true,
    secretImpostors: false,
    thinkSeconds: null,
    discussSeconds: null,
    groupId: "g1",
    guessEnabled: true,
  };
  const stats = () => JSON.parse(localStorage.getItem("impostor:v1:stats:g1") ?? "[]");

  beforeEach(() => {
    localStorage.setItem("impostor:v1:groups", JSON.stringify([group]));
    localStorage.setItem("impostor:v1:settings", JSON.stringify(settings));
  });

  it("trägt eine abgeschlossene Runde genau einmal ein – auch nach Neuladen", async () => {
    saveGame({ phase: "resolution", round, step: "caught?", winner: null, caught: null });
    const first = render(<App />);
    await new Promise((r) => setTimeout(r, 550));
    fireEvent.click(screen.getByRole("button", { name: "Nein" }));
    expect(stats()).toHaveLength(1);
    expect(stats()[0]).toMatchObject({
      roundId: "r1",
      impostors: ["b"],
      starter: "c",
      winner: "impostor",
      caught: false,
      mode: "vereine-de",
    });
    first.unmount();
    render(<App />);
    expect(screen.getByText("Impostor gewinnt 🕵️")).toBeInTheDocument();
    expect(stats()).toHaveLength(1);
  });

  it("führt durchs Raten und trägt den Crew-Sieg ein", async () => {
    saveGame({ phase: "resolution", round, step: "caught?", winner: null, caught: null });
    render(<App />);
    const click = async (name: string) => {
      await new Promise((r) => setTimeout(r, 550));
      fireEvent.click(screen.getByRole("button", { name }));
    };
    await click("Ja");
    expect(screen.getByText("Ben darf jetzt das Wort raten")).toBeInTheDocument();
    expect(stats()).toHaveLength(0);
    await click("Wort aufdecken");
    await click("Nein");
    expect(screen.getByText("Crew gewinnt 🎯")).toBeInTheDocument();
    expect(stats()[0].winner).toBe("crew");
  });

  it("trägt ohne Gruppe nichts ein", async () => {
    localStorage.setItem("impostor:v1:settings", JSON.stringify({ ...settings, groupId: null }));
    saveGame({ phase: "resolution", round, step: "caught?", winner: null, caught: null });
    render(<App />);
    await new Promise((r) => setTimeout(r, 550));
    fireEvent.click(screen.getByRole("button", { name: "Nein" }));
    expect(localStorage.getItem("impostor:v1:stats:g1")).toBeNull();
  });
});

describe("Regeln, Statistik und Teilen", () => {
  it("öffnet die Bildschirme aus der Einrichtung und kehrt zurück", async () => {
    const user = userEvent.setup();
    localStorage.setItem(
      "impostor:v1:groups",
      JSON.stringify([{ id: "g1", name: "Freitagsrunde", members: [{ id: "a", name: "Anna" }], selected: ["a"], evening: 1 }]),
    );
    render(<App />);
    await user.click(screen.getByRole("button", { name: "Regeln" }));
    expect(screen.getByRole("heading", { name: "Regeln" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Zurück" }));

    await user.click(screen.getByRole("button", { name: "Freitagsrunde" }));
    await user.click(screen.getByRole("button", { name: "Statistik" }));
    expect(screen.getByRole("heading", { name: "Freitagsrunde" })).toBeInTheDocument();
    vi.spyOn(window, "confirm").mockReturnValue(true);
    await user.click(screen.getByRole("button", { name: "Neuer Abend" }));
    expect(JSON.parse(localStorage.getItem("impostor:v1:groups") ?? "[]")[0].evening).toBe(2);
    await user.click(screen.getByRole("button", { name: "Zurück" }));
    expect(screen.getByRole("button", { name: "Freitagsrunde" })).toHaveAttribute("aria-pressed", "true");

    await user.click(screen.getByRole("button", { name: "App teilen" }));
    expect(await screen.findByTestId("qr")).toBeInTheDocument();
    expect(screen.getByText(/^http/)).toBeInTheDocument();
  });
});

describe("Runde beenden", () => {
  it("ist während der Runde immer sichtbar und fragt vor dem Abbrechen nach", async () => {
    saveGame({ phase: "reveal", round, index: 1, seen: false });
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "Runde beenden" }));
    expect(confirm).toHaveBeenCalledWith("Runde beenden? Namen und Einstellungen bleiben erhalten.");
    expect(screen.getByRole("heading", { name: "Ben ist dran" })).toBeInTheDocument();
    confirm.mockReturnValue(true);
    fireEvent.click(screen.getByRole("button", { name: "Runde beenden" }));
    expect(screen.getByRole("button", { name: "Start" })).toBeInTheDocument();
  });

  it("fehlt in der Einrichtung", () => {
    render(<App />);
    expect(screen.queryByRole("button", { name: "Runde beenden" })).not.toBeInTheDocument();
  });
});

describe("Signatur", () => {
  it("zeigt unten die Signatur von Dabvud", () => {
    render(<App />);
    expect(screen.getByText("von Dabvud")).toBeInTheDocument();
  });
});

describe("Versionsanzeige", () => {
  it("zeigt Version und Build-Datum auf jedem Bildschirm", () => {
    render(<App />);
    expect(screen.getByText(/^v\d+\.\d+\.\d+ · \d{2}\.\d{2}\.\d{4}$/)).toBeInTheDocument();
  });
});
