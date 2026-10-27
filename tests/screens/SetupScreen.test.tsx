import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { useState } from "react";
import type { Group } from "../../src/game/groups";
import type { Settings } from "../../src/game/types";
import { settings } from "../helpers/nba";
import SetupScreen from "../../src/screens/SetupScreen";

async function addNames(user: ReturnType<typeof userEvent.setup>, names: string[]) {
  for (const n of names) {
    await user.type(screen.getByLabelText("Name"), `${n}{Enter}`);
  }
}

describe("SetupScreen", () => {
  it("fügt Namen per Enter und Button hinzu und entfernt sie", async () => {
    const user = userEvent.setup();
    render(<SetupScreen initial={null} onStart={vi.fn()} />);
    await addNames(user, ["Anna"]);
    await user.type(screen.getByLabelText("Name"), "Ben");
    await user.click(screen.getByRole("button", { name: "Hinzufügen" }));
    expect(screen.getByText("Anna")).toBeInTheDocument();
    expect(screen.getByText("Ben")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Anna entfernen" }));
    expect(screen.queryByText("Anna")).not.toBeInTheDocument();
  });

  it("zeigt Paul in der Namensliste mit Regenbogen, speichert aber den echten Namen", async () => {
    const user = userEvent.setup();
    const onStart = vi.fn();
    render(<SetupScreen initial={null} onStart={onStart} />);
    await addNames(user, ["Paul", "Ben", "Cem"]);
    expect(screen.getByText("Paul 🌈")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Start" }));
    expect(onStart).toHaveBeenCalledWith(expect.objectContaining({ names: ["Paul", "Ben", "Cem"] }));
  });

  it("lässt das Namensfeld nach Enter und nach „Hinzufügen“ aktiv, damit die Tastatur offen bleibt", async () => {
    const user = userEvent.setup();
    render(<SetupScreen initial={null} onStart={vi.fn()} />);
    const input = screen.getByLabelText("Name");
    await user.type(input, "Anna{Enter}");
    expect(input).toHaveFocus();
    await user.type(input, "Ben");
    await user.click(screen.getByRole("button", { name: "Hinzufügen" }));
    expect(input).toHaveFocus();
    expect(screen.getByText("Ben")).toBeInTheDocument();
  });

  it("nimmt doppelte Namen nicht auf und lässt den Namen zum Ergänzen stehen", async () => {
    const user = userEvent.setup();
    render(<SetupScreen initial={null} onStart={vi.fn()} />);
    const input = screen.getByLabelText("Name");
    await user.type(input, "Luca{Enter}");
    await user.type(input, " luca {Enter}");
    expect(screen.getAllByRole("button", { name: /entfernen$/ })).toHaveLength(1);
    expect(screen.getByText("Luca ist schon dabei – z. B. „Luca M.“ eintragen")).toBeInTheDocument();
    expect(input).toHaveValue("luca ");
    expect(input).toHaveFocus();
    await user.type(input, "M.{Enter}");
    expect(screen.getByText("luca M.")).toBeInTheDocument();
    expect(screen.queryByText(/ist schon dabei/)).not.toBeInTheDocument();
  });

  it("bittet darum, die Namen in Sitzreihenfolge einzutragen", () => {
    render(<SetupScreen initial={null} onStart={vi.fn()} />);
    expect(screen.getByText("Namen so eintragen, wie ihr sitzt")).toBeInTheDocument();
  });

  it("lost die Impostor-Anzahl im geheimen Modus aus und blendet die Zahl aus", async () => {
    const user = userEvent.setup();
    const onStart = vi.fn();
    render(<SetupScreen initial={null} onStart={onStart} />);
    await addNames(user, ["Anna", "Ben", "Cem"]);
    await user.click(screen.getByRole("switch", { name: "Geheime Anzahl" }));
    expect(screen.queryByLabelText("Anzahl Impostor")).not.toBeInTheDocument();
    expect(screen.getByText("Lasst euch überraschen")).toBeInTheDocument();
    expect(screen.queryByText(/0 bis/)).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Start" }));
    expect(onStart).toHaveBeenCalledWith(expect.objectContaining({ secretImpostors: true }));
  });

  it("lässt die Überlegzeit an- und abschalten und aus 15 Sek. bis 2 Min. wählen", async () => {
    const user = userEvent.setup();
    const onStart = vi.fn();
    render(<SetupScreen initial={null} onStart={onStart} />);
    await addNames(user, ["Anna", "Ben", "Cem"]);
    expect(screen.queryByRole("button", { name: "1 Min." })).not.toBeInTheDocument();
    await user.click(screen.getByRole("switch", { name: "Überlegzeit" }));
    for (const label of ["15 Sek.", "30 Sek.", "1 Min.", "2 Min."]) {
      expect(screen.getByRole("button", { name: label })).toBeInTheDocument();
    }
    expect(screen.getByRole("button", { name: "30 Sek." })).toHaveAttribute("aria-pressed", "true");
    await user.click(screen.getByRole("button", { name: "1 Min." }));
    await user.click(screen.getByRole("button", { name: "Start" }));
    expect(onStart).toHaveBeenCalledWith(expect.objectContaining({ thinkSeconds: 60, discussSeconds: null }));
  });

  it("stellt die Diskussionszeit von 30 Sek. in Minutenschritten bis 10 Min. ein", async () => {
    const user = userEvent.setup();
    const onStart = vi.fn();
    render(<SetupScreen initial={null} onStart={onStart} />);
    await addNames(user, ["Anna", "Ben", "Cem"]);
    await user.click(screen.getByRole("switch", { name: "Diskussionszeit" }));
    const value = screen.getByLabelText("Dauer Diskussion");
    expect(value).toHaveTextContent("2:00");
    await user.click(screen.getByRole("button", { name: "Weniger Zeit" }));
    expect(value).toHaveTextContent("1:00");
    await user.click(screen.getByRole("button", { name: "Weniger Zeit" }));
    expect(value).toHaveTextContent("0:30");
    expect(screen.getByRole("button", { name: "Weniger Zeit" })).toBeDisabled();
    for (let i = 0; i < 12; i++) await user.click(screen.getByRole("button", { name: "Mehr Zeit" }));
    expect(value).toHaveTextContent("10:00");
    expect(screen.getByRole("button", { name: "Mehr Zeit" })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Start" }));
    expect(onStart).toHaveBeenCalledWith(expect.objectContaining({ discussSeconds: 600, thinkSeconds: null }));
  });

  it("springt bei einem krummen gespeicherten Wert auf die nächste Stufe", async () => {
    const user = userEvent.setup();
    const initial: Settings = {
      names: ["Anna", "Ben", "Cem"],
      impostorCount: 1,
      mode: "stars",
      hintsEnabled: true,
      secretImpostors: false,
      thinkSeconds: null,
      discussSeconds: 90,
      groupId: null,
      guessEnabled: true,
    };
    render(<SetupScreen initial={initial} onStart={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: "Mehr Zeit" }));
    expect(screen.getByLabelText("Dauer Diskussion")).toHaveTextContent("2:00");
    await user.click(screen.getByRole("button", { name: "Weniger Zeit" }));
    await user.click(screen.getByRole("button", { name: "Weniger Zeit" }));
    expect(screen.getByLabelText("Dauer Diskussion")).toHaveTextContent("0:30");
  });

  it("übernimmt gespeicherte Timer- und Geheim-Einstellungen", () => {
    const initial: Settings = {
      names: ["Anna", "Ben", "Cem"],
      impostorCount: 1,
      mode: "stars",
      hintsEnabled: true,
      secretImpostors: true,
      thinkSeconds: 15,
      discussSeconds: 180,
      groupId: null,
      guessEnabled: true,
    };
    render(<SetupScreen initial={initial} onStart={vi.fn()} />);
    expect(screen.getByRole("switch", { name: "Geheime Anzahl" })).toBeChecked();
    expect(screen.getByRole("button", { name: "15 Sek." })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByLabelText("Dauer Diskussion")).toHaveTextContent("3:00");
  });

  it("aktiviert Start erst ab 3 Spielern und zeigt die Fehlermeldung", async () => {
    const user = userEvent.setup();
    render(<SetupScreen initial={null} onStart={vi.fn()} />);
    await addNames(user, ["Anna", "Ben"]);
    expect(screen.getByRole("button", { name: "Start" })).toBeDisabled();
    expect(screen.getByText("Mindestens 3 Spieler")).toBeInTheDocument();
    await addNames(user, ["Cem"]);
    expect(screen.getByRole("button", { name: "Start" })).toBeEnabled();
  });

  it("lässt die Impostor-Anzahl nicht über das Maximum steigen", async () => {
    const user = userEvent.setup();
    render(<SetupScreen initial={null} onStart={vi.fn()} />);
    await addNames(user, ["Anna", "Ben", "Cem", "Dana"]);
    expect(screen.getByRole("button", { name: "Mehr Impostor" })).toBeDisabled();
    expect(screen.getByLabelText("Anzahl Impostor")).toHaveTextContent("1");
  });

  it("korrigiert die Impostor-Anzahl, wenn Spieler entfernt werden", async () => {
    const user = userEvent.setup();
    const onStart = vi.fn();
    const initial: Settings = {
      names: ["Anna", "Ben", "Cem", "Dana", "Eli", "Finn"],
      impostorCount: 2,
      mode: "stars",
      hintsEnabled: true,
      secretImpostors: false,
      thinkSeconds: null,
      discussSeconds: null,
      groupId: null,
      guessEnabled: true,
    };
    render(<SetupScreen initial={initial} onStart={onStart} />);
    await user.click(screen.getByRole("button", { name: "Finn entfernen" }));
    expect(screen.getByLabelText("Anzahl Impostor")).toHaveTextContent("2");
    await user.click(screen.getByRole("button", { name: "Eli entfernen" }));
    expect(screen.getByLabelText("Anzahl Impostor")).toHaveTextContent("1");
    await user.click(screen.getByRole("button", { name: "Start" }));
    expect(onStart).toHaveBeenCalledWith(expect.objectContaining({ impostorCount: 1 }));
  });

  it("füllt die letzten Einstellungen vor und startet mit normalisierten Namen", async () => {
    const user = userEvent.setup();
    const onStart = vi.fn();
    const initial: Settings = {
      names: ["Anna", "Ben", "Cem"],
      impostorCount: 1,
      mode: "stars",
      hintsEnabled: true,
      secretImpostors: false,
      thinkSeconds: null,
      discussSeconds: null,
      groupId: null,
      guessEnabled: true,
    };
    render(<SetupScreen initial={initial} onStart={onStart} />);
    await addNames(user, ["  Dana  "]);
    await user.selectOptions(screen.getByLabelText("Spielmodus"), "legenden");
    await user.click(screen.getByRole("button", { name: "Start" }));
    expect(onStart).toHaveBeenCalledWith({
      names: ["Anna", "Ben", "Cem", "Dana"],
      impostorCount: 1,
      mode: "legenden",
      hintsEnabled: true,
      secretImpostors: false,
      thinkSeconds: null,
      discussSeconds: null,
      groupId: null,
      guessEnabled: true,
    });
  });

  it("schaltet den Tipp für Impostor an und aus", async () => {
    const user = userEvent.setup();
    const onStart = vi.fn();
    render(<SetupScreen initial={null} onStart={onStart} />);
    const toggle = screen.getByRole("switch", { name: "Tipp für Impostor" });
    expect(toggle).toBeChecked();
    await user.click(toggle);
    expect(toggle).not.toBeChecked();
    for (const n of ["Anna", "Ben", "Cem"]) await user.type(screen.getByLabelText("Name"), `${n}{Enter}`);
    await user.click(screen.getByRole("button", { name: "Start" }));
    expect(onStart).toHaveBeenCalledWith(expect.objectContaining({ hintsEnabled: false }));
  });
});

describe("SetupScreen mit Gruppen", () => {
  const group: Group = {
    id: "g1",
    name: "Freitagsrunde",
    members: [
      { id: "a", name: "Anna" },
      { id: "b", name: "Ben" },
      { id: "c", name: "Cem" },
      { id: "d", name: "Dana" },
    ],
    selected: [],
    evening: 1,
  };

  function Harness(props: { initial?: Settings | null; onStart?: (s: Settings) => void; onOpen?: () => void }) {
    const [groups, setGroups] = useState<Group[]>([group]);
    return (
      <SetupScreen
        initial={props.initial ?? null}
        onStart={props.onStart ?? vi.fn()}
        groups={groups}
        onGroupsChange={setGroups}
        onEditGroup={vi.fn()}
        onOpen={props.onOpen ?? vi.fn()}
      />
    );
  }

  it("wählt Mitspieler in Sitzreihenfolge aus und startet mit Gruppe", async () => {
    const user = userEvent.setup();
    const onStart = vi.fn();
    render(<Harness onStart={onStart} />);
    await user.click(screen.getByRole("button", { name: "Freitagsrunde" }));
    expect(screen.queryByLabelText("Name")).not.toBeInTheDocument();
    for (const n of ["Cem", "Anna", "Dana"]) await user.click(screen.getByRole("button", { name: new RegExp(`^${n}`) }));
    expect(screen.getByRole("button", { name: /^Cem/ })).toHaveTextContent("1");
    expect(screen.getByRole("button", { name: /^Dana/ })).toHaveTextContent("3");
    await user.click(screen.getByRole("button", { name: /^Anna/ }));
    expect(screen.getByRole("button", { name: /^Dana/ })).toHaveTextContent("2");
    await user.click(screen.getByRole("button", { name: /^Ben/ }));
    await user.click(screen.getByRole("button", { name: "Start" }));
    expect(onStart).toHaveBeenCalledWith(expect.objectContaining({ names: ["Cem", "Dana", "Ben"], groupId: "g1" }));
  });

  it("behält die gewählte Impostor-Anzahl, wenn man zum Umsortieren alle ab- und wieder anwählt", async () => {
    const user = userEvent.setup();
    const onStart = vi.fn();
    const big: Group = {
      ...group,
      members: ["A", "B", "C", "D", "E", "F", "G"].map((n) => ({ id: n, name: n })),
      selected: ["A", "B", "C", "D", "E", "F", "G"],
    };
    function BigHarness() {
      const [groups, setGroups] = useState<Group[]>([big]);
      const initial: Settings = {
        names: [], impostorCount: 3, mode: "stars", hintsEnabled: true, secretImpostors: false,
        thinkSeconds: null, discussSeconds: null, groupId: "g1", guessEnabled: true,
      };
      return <SetupScreen initial={initial} onStart={onStart} groups={groups} onGroupsChange={setGroups} />;
    }
    render(<BigHarness />);
    expect(screen.getByLabelText("Anzahl Impostor")).toHaveTextContent("3");
    for (const n of "ABCDEFG") await user.click(screen.getByRole("button", { name: new RegExp(`^${n}[0-9]*$`) }));
    for (const n of "GFEDCBA") await user.click(screen.getByRole("button", { name: new RegExp(`^${n}[0-9]*$`) }));
    expect(screen.getByLabelText("Anzahl Impostor")).toHaveTextContent("3");
    await user.click(screen.getByRole("button", { name: "Start" }));
    expect(onStart).toHaveBeenCalledWith(expect.objectContaining({ impostorCount: 3, names: [..."GFEDCBA"] }));
  });

  it("sperrt Start bei weniger als 3 ausgewählten Mitspielern", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole("button", { name: "Freitagsrunde" }));
    await user.click(screen.getByRole("button", { name: /^Anna/ }));
    await user.click(screen.getByRole("button", { name: /^Ben/ }));
    expect(screen.getByRole("button", { name: "Start" })).toBeDisabled();
    expect(screen.getByText("Mindestens 3 Spieler")).toBeInTheDocument();
  });

  it("nimmt neue Mitglieder direkt in den Kader auf und wählt sie aus", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole("button", { name: "Freitagsrunde" }));
    await user.type(screen.getByLabelText("Neues Mitglied"), "Eli{Enter}");
    expect(screen.getByRole("button", { name: /^Eli/ })).toHaveTextContent("1");
    await user.type(screen.getByLabelText("Neues Mitglied"), "anna{Enter}");
    expect(screen.getByText("Anna ist schon dabei")).toBeInTheDocument();
  });

  it("fällt auf „Ohne Gruppe“ zurück, wenn die gespeicherte Gruppe gelöscht wurde", () => {
    const initial: Settings = {
      names: ["X", "Y", "Z"],
      impostorCount: 1,
      mode: "stars",
      hintsEnabled: true,
      secretImpostors: false,
      thinkSeconds: null,
      discussSeconds: null,
      groupId: "geloescht",
      guessEnabled: true,
    };
    render(<Harness initial={initial} />);
    expect(screen.getByRole("button", { name: "Ohne Gruppe" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("X")).toBeInTheDocument();
  });

  it("schaltet „Impostor darf raten“ und öffnet Regeln, Statistik und Teilen", async () => {
    const user = userEvent.setup();
    const onOpen = vi.fn();
    const onStart = vi.fn();
    render(<Harness onOpen={onOpen} onStart={onStart} />);
    expect(screen.queryByRole("button", { name: "Statistik" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Freitagsrunde" }));
    for (const n of ["Anna", "Ben", "Cem"]) await user.click(screen.getByRole("button", { name: new RegExp(`^${n}`) }));
    const guess = screen.getByRole("switch", { name: "Impostor darf raten" });
    expect(guess).toBeChecked();
    await user.click(guess);
    for (const view of ["Regeln", "Statistik", "App teilen"]) await user.click(screen.getByRole("button", { name: view }));
    expect(onOpen.mock.calls.map((c) => c[0])).toEqual(["rules", "stats", "share"]);
    await user.click(screen.getByRole("button", { name: "Start" }));
    expect(onStart).toHaveBeenCalledWith(expect.objectContaining({ guessEnabled: false }));
  });
});

describe("SetupScreen mit leeren Töpfen", () => {
  it("sperrt leere Modi im Select und ergänzt bald", () => {
    render(<SetupScreen initial={null} poolSizes={{ stars: 0, legenden: 0, teams: 30 }} onStart={vi.fn()} />);
    expect(screen.getByRole("option", { name: "⭐ Aktuelle Stars (bald)" })).toBeDisabled();
    expect(screen.getByRole("option", { name: "👑 Legenden (bald)" })).toBeDisabled();
    expect(screen.getByRole("option", { name: "🏟️ NBA-Teams" })).toBeEnabled();
    expect(screen.getByLabelText("Spielmodus")).toHaveValue("teams");
  });
  it.each([null, "stars", "legenden"] as const)("fällt bei leerem Startmodus %s auf Teams zurück", (mode) => {
    render(<SetupScreen initial={mode ? { ...settings, mode } : null}
      poolSizes={{ stars: 0, legenden: 0, teams: 30 }} onStart={vi.fn()} />);
    expect(screen.getByLabelText("Spielmodus")).toHaveValue("teams");
  });
  it("fällt in MODES-Reihenfolge auf Legenden zurück", () => {
    render(<SetupScreen initial={settings} poolSizes={{ stars: 0, legenden: 2, teams: 30 }} onStart={vi.fn()} />);
    expect(screen.getByLabelText("Spielmodus")).toHaveValue("legenden");
  });
  it("behält einen spielbaren gespeicherten Modus", () => {
    render(<SetupScreen initial={{ ...settings, mode: "teams" }} poolSizes={{ stars: 2, teams: 30 }} onStart={vi.fn()} />);
    expect(screen.getByLabelText("Spielmodus")).toHaveValue("teams");
  });
  it("behandelt fehlende Größen als spielbar", () => {
    render(<SetupScreen initial={null} poolSizes={{ teams: 0 }} onStart={vi.fn()} />);
    expect(screen.getByLabelText("Spielmodus")).toHaveValue("stars");
    expect(screen.getByRole("option", { name: "👑 Legenden" })).toBeEnabled();
  });
  it("startet ohne Größenangaben mit Stars", () => {
    render(<SetupScreen initial={null} onStart={vi.fn()} />);
    expect(screen.getByLabelText("Spielmodus")).toHaveValue("stars");
    for (const option of screen.getAllByRole("option")) expect(option).toBeEnabled();
  });
  it("sperrt Start, wenn alle Töpfe leer sind", async () => {
    const onStart = vi.fn();
    render(<SetupScreen initial={settings} poolSizes={{ stars: 0, legenden: 0, teams: 0 }} onStart={onStart} />);
    expect(screen.getByText("In diesem Modus gibt es noch keine Begriffe")).toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole("button", { name: "Start" }));
    expect(onStart).not.toHaveBeenCalled();
  });
});
