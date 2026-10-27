import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Round } from "../../src/game/types";
import { alarm } from "../../src/alarm";
import DiscussionScreen from "../../src/screens/DiscussionScreen";

vi.mock("../../src/alarm", () => ({ alarm: vi.fn() }));
import ResolutionScreen from "../../src/screens/ResolutionScreen";

const round: Round = {
  word: { name: "Messi", hints: ["Argentinien"] },
  hint: "Argentinien",
  impostors: ["Ben", "Dana"],
  revealOrder: ["Anna", "Ben", "Cem", "Dana", "Eli"],
  starter: "Jonas",
  id: "r1",
  guessEnabled: true,
  speakingOrder: ["Anna", "Ben", "Cem", "Dana", "Eli"],
  thinkSeconds: null,
  discussSeconds: null,
};

describe("DiscussionScreen", () => {
  it("zeigt den Starter und den Auflösen-Button", () => {
    render(<DiscussionScreen starter="Jonas" seconds={null} onResolve={vi.fn()} />);
    expect(screen.getByText("Jonas beginnt")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Auflösen" })).toBeInTheDocument();
  });
});

describe("DiscussionScreen mit Timer", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.useRealTimers();
    vi.mocked(alarm).mockClear();
  });

  it("zeigt nach der Hinweisrunde „Diskussion“ statt eines Starters", () => {
    render(<DiscussionScreen starter={null} seconds={null} onResolve={vi.fn()} />);
    expect(screen.getByRole("heading", { name: "Diskussion" })).toBeInTheDocument();
  });

  it("zählt herunter, lässt pausieren und um 30 Sekunden verlängern", () => {
    render(<DiscussionScreen starter="Jonas" seconds={60} onResolve={vi.fn()} />);
    expect(screen.getByText("1:00")).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(10000));
    expect(screen.getByText("0:50")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Pause" }));
    act(() => vi.advanceTimersByTime(10000));
    expect(screen.getByText("0:50")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Weiter" }));
    fireEvent.click(screen.getByRole("button", { name: "+30 Sek." }));
    expect(screen.getByText("1:20")).toBeInTheDocument();
  });

  it("meldet bei 0 „Zeit um – stimmt ab!“ und lässt weiter auflösen", () => {
    render(<DiscussionScreen starter="Jonas" seconds={30} onResolve={vi.fn()} />);
    act(() => vi.advanceTimersByTime(30000));
    expect(screen.getByText("Zeit um – stimmt ab!")).toBeInTheDocument();
    expect(alarm).toHaveBeenCalledOnce();
    expect(screen.getByRole("button", { name: "Auflösen" })).toBeInTheDocument();
  });
});

describe("ResolutionScreen", () => {
  it("zeigt Impostor und Wort und bietet neue Runde und Einstellungen", async () => {
    const user = userEvent.setup();
    const onNewRound = vi.fn();
    const onSettings = vi.fn();
    render(<ResolutionScreen round={round} onNewRound={onNewRound} onSettings={onSettings} />);
    expect(screen.getByText("Ben")).toBeInTheDocument();
    expect(screen.getByText("Dana")).toBeInTheDocument();
    expect(screen.getByText("Messi")).toBeInTheDocument();
    expect(screen.getByText("Tipp war: Argentinien")).toBeInTheDocument();
    await new Promise((r) => setTimeout(r, 550));
    await user.click(screen.getByRole("button", { name: "Neue Runde" }));
    await user.click(screen.getByRole("button", { name: "Einstellungen" }));
    expect(onNewRound).toHaveBeenCalledOnce();
    expect(onSettings).toHaveBeenCalledOnce();
  });
});

describe("Regenbogen für Paul", () => {
  it("zeigt ihn beim Starter und bei den Impostorn", () => {
    render(<DiscussionScreen starter="Paul" seconds={null} onResolve={vi.fn()} />);
    expect(screen.getByText("Paul 🌈 beginnt")).toBeInTheDocument();
    render(<ResolutionScreen round={{ ...round, impostors: ["Paul"] }} onNewRound={vi.fn()} onSettings={vi.fn()} />);
    expect(screen.getByText("Paul 🌈")).toBeInTheDocument();
  });
});

describe("ResolutionScreen ohne Impostor", () => {
  it("verrät erst bei der Auflösung, dass keiner Impostor war", () => {
    render(<ResolutionScreen round={{ ...round, impostors: [], hint: null }} onNewRound={vi.fn()} onSettings={vi.fn()} />);
    expect(screen.getByText("Keiner war Impostor! 😄")).toBeInTheDocument();
    expect(screen.queryByText(/Impostor war(en)?$/)).not.toBeInTheDocument();
  });
});

describe("ResolutionScreen alle Impostor", () => {
  it("feiert, wenn alle Impostor waren", () => {
    render(<ResolutionScreen round={{ ...round, impostors: [...round.revealOrder] }} onNewRound={vi.fn()} onSettings={vi.fn()} />);
    expect(screen.getByText("Alle waren Impostor! 🤯")).toBeInTheDocument();
    expect(screen.getByText("Es gab gar keinen Spieler.")).toBeInTheDocument();
    expect(screen.queryByText("Das Wort war")).not.toBeInTheDocument();
  });

  it("zeigt, wer welchen Tipp hatte", () => {
    const personalHints = { Anna: "Linksfuß", Ben: "Glatze", Cem: "2010er", Dana: "Südamerika", Eli: "Finaltor" };
    render(
      <ResolutionScreen
        round={{ ...round, impostors: [...round.revealOrder], hint: null, personalHints }}
        onNewRound={vi.fn()}
        onSettings={vi.fn()}
      />,
    );
    expect(screen.getByText("Anna: Linksfuß")).toBeInTheDocument();
    expect(screen.getByText("Eli: Finaltor")).toBeInTheDocument();
  });
});

describe("ResolutionScreen Klickschutz", () => {
  it("ignoriert Klicks in den ersten 500 ms (Geisterklick nach dem Halten)", () => {
    vi.useFakeTimers();
    try {
      const onNewRound = vi.fn();
      const onSettings = vi.fn();
      render(<ResolutionScreen round={round} onNewRound={onNewRound} onSettings={onSettings} />);
      fireEvent.click(screen.getByRole("button", { name: "Neue Runde" }));
      fireEvent.click(screen.getByRole("button", { name: "Einstellungen" }));
      expect(onNewRound).not.toHaveBeenCalled();
      expect(onSettings).not.toHaveBeenCalled();
      act(() => vi.advanceTimersByTime(500));
      fireEvent.click(screen.getByRole("button", { name: "Neue Runde" }));
      expect(onNewRound).toHaveBeenCalledOnce();
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("ResolutionScreen Ablauf mit Ergebnis", () => {
  const single = { ...round, impostors: ["Ben"], hint: null };
  const wait = () => new Promise((r) => setTimeout(r, 550));

  it("fragt zuerst, ob der Impostor erwischt wurde – ohne das Wort zu verraten", async () => {
    const onCaught = vi.fn();
    render(<ResolutionScreen round={single} step="caught?" winner={null} onCaught={onCaught} onNewRound={vi.fn()} onSettings={vi.fn()} />);
    expect(screen.getByText("Wurde Ben erwischt?")).toBeInTheDocument();
    expect(screen.queryByText("Messi")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Ja" }));
    expect(onCaught).not.toHaveBeenCalled(); // Klickschutz nach dem Gedrückthalten
    await wait();
    fireEvent.click(screen.getByRole("button", { name: "Ja" }));
    expect(onCaught).toHaveBeenCalledWith(true);
  });

  it("fragt bei mehreren Impostorn gemeinsam", () => {
    render(<ResolutionScreen round={round} step="caught?" winner={null} onNewRound={vi.fn()} onSettings={vi.fn()} />);
    expect(screen.getByText("Wurden die Impostor erwischt?")).toBeInTheDocument();
  });

  it("lässt den Impostor raten, bevor das Wort aufgedeckt wird", async () => {
    const onRevealWord = vi.fn();
    render(<ResolutionScreen round={single} step="guess" winner={null} onRevealWord={onRevealWord} onNewRound={vi.fn()} onSettings={vi.fn()} />);
    expect(screen.getByText("Ben darf jetzt das Wort raten")).toBeInTheDocument();
    expect(screen.queryByText("Messi")).not.toBeInTheDocument();
    await wait();
    fireEvent.click(screen.getByRole("button", { name: "Wort aufdecken" }));
    expect(onRevealWord).toHaveBeenCalledOnce();
  });

  it("zeigt das Wort und fragt, ob richtig geraten wurde", async () => {
    const onGuessed = vi.fn();
    render(<ResolutionScreen round={single} step="guessed?" winner={null} onGuessed={onGuessed} onNewRound={vi.fn()} onSettings={vi.fn()} />);
    expect(screen.getByText("Messi")).toBeInTheDocument();
    expect(screen.getByText("Hat Ben richtig geraten?")).toBeInTheDocument();
    await wait();
    fireEvent.click(screen.getByRole("button", { name: "Nein" }));
    expect(onGuessed).toHaveBeenCalledWith(false);
  });

  it("zeigt am Ende den Gewinner", () => {
    const { unmount } = render(<ResolutionScreen round={single} step="done" winner="crew" onNewRound={vi.fn()} onSettings={vi.fn()} />);
    expect(screen.getByText("Crew gewinnt 🎯")).toBeInTheDocument();
    expect(screen.getByText("Messi")).toBeInTheDocument();
    unmount();
    const again = render(<ResolutionScreen round={single} step="done" winner="impostor" caught={false} onNewRound={vi.fn()} onSettings={vi.fn()} />);
    expect(screen.getByText("Impostor gewinnt 🕵️")).toBeInTheDocument();
    again.unmount();
    render(<ResolutionScreen round={single} step="done" winner="impostor" caught onNewRound={vi.fn()} onSettings={vi.fn()} />);
    expect(screen.getByText("Impostor gewinnt trotzdem 🕵️")).toBeInTheDocument();
  });
});
