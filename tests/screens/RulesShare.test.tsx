import { APP_NAME, SHARE_TEXT } from "../../src/variant/config";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import RulesScreen from "../../src/screens/RulesScreen";
import ShareScreen from "../../src/screens/ShareScreen";

afterEach(() => vi.unstubAllGlobals());

describe("RulesScreen", () => {
  it("erklärt das Spiel in fünf Abschnitten", async () => {
    const onBack = vi.fn();
    render(<RulesScreen onBack={onBack} />);
    const headings = screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent);
    expect(headings).toEqual(["Ziel", "Ablauf", "Hinweisrunde", "Auflösen & Raten", "Sondermodi"]);
    await userEvent.setup().click(screen.getByRole("button", { name: "Zurück" }));
    expect(onBack).toHaveBeenCalledOnce();
  });
});

describe("ShareScreen", () => {
  const url = "https://example.org/spiel/";

  it("zeigt einen QR-Code und den Link", async () => {
    render(<ShareScreen url={url} onBack={vi.fn()} />);
    expect((await screen.findByTestId("qr")).innerHTML).toContain("<svg");
    expect(screen.getByText(url)).toBeInTheDocument();
  });

  it("teilt über das Teilen-Menü des Handys", async () => {
    const share = vi.fn(() => Promise.resolve());
    vi.stubGlobal("navigator", { ...navigator, share });
    render(<ShareScreen url={url} onBack={vi.fn()} />);
    await userEvent.setup().click(screen.getByRole("button", { name: "Link teilen" }));
    expect(share).toHaveBeenCalledWith({ title: APP_NAME, text: SHARE_TEXT, url });
  });

  it("kopiert den Link, wenn das Handy kein Teilen-Menü hat", async () => {
    const writeText = vi.fn(() => Promise.resolve());
    vi.stubGlobal("navigator", { ...navigator, share: undefined, clipboard: { writeText } });
    render(<ShareScreen url={url} onBack={vi.fn()} />);
    // fireEvent statt userEvent: userEvent.setup() ersetzt navigator.clipboard durch eine eigene Attrappe
    fireEvent.click(screen.getByRole("button", { name: "Link kopieren" }));
    expect(writeText).toHaveBeenCalledWith(url);
    expect(await screen.findByText("Kopiert!")).toBeInTheDocument();
  });
});
