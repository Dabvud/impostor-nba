import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import RevealScreen from "../../src/screens/RevealScreen";

function setup(props: Partial<Parameters<typeof RevealScreen>[0]> = {}) {
  const onSeen = vi.fn();
  const onPassOn = vi.fn();
  render(
    <RevealScreen
      name="Fabi"
      isImpostor={false}
      word="Begriff A"
      hint={null}
      canPass={false}
      onSeen={onSeen}
      onPassOn={onPassOn}
      {...props}
    />,
  );
  return { onSeen, onPassOn, card: screen.getByTestId("reveal-card") };
}

function drag(card: HTMLElement, fromY: number, toY: number) {
  fireEvent.pointerDown(card, { clientY: fromY, pointerId: 1 });
  fireEvent.pointerMove(card, { clientY: toY, pointerId: 1 });
}

describe("RevealScreen", () => {
  it("zeigt das Wort nur, solange die Karte hochgezogen ist", () => {
    const { onSeen, card } = setup();
    expect(screen.queryByText("Begriff A")).not.toBeInTheDocument();
    drag(card, 400, 300);
    expect(screen.getByText("Begriff A")).toBeInTheDocument();
    expect(onSeen).toHaveBeenCalled();
    fireEvent.pointerUp(card, { clientY: 300, pointerId: 1 });
    expect(screen.queryByText("Begriff A")).not.toBeInTheDocument();
  });

  it("zeigt immer, wessen Karte es ist – auch nach dem Zurückschieben", () => {
    const { card } = setup();
    expect(screen.getByRole("heading", { name: "Fabi" })).toBeInTheDocument();
    expect(screen.getByText("Karte von Fabi")).toBeInTheDocument();
    drag(card, 400, 300);
    fireEvent.pointerUp(card, { clientY: 300, pointerId: 1 });
    expect(screen.getByRole("heading", { name: "Fabi" })).toBeInTheDocument();
    expect(screen.getByText("Karte von Fabi")).toBeInTheDocument();
  });

  it("zeigt Paul auch hier mit Regenbogen", () => {
    setup({ name: "Paul" });
    expect(screen.getByRole("heading", { name: "Paul 🌈" })).toBeInTheDocument();
  });

  it("deckt bei zu kurzem Zug nicht auf", () => {
    const { onSeen, card } = setup();
    drag(card, 400, 360);
    expect(screen.queryByText("Begriff A")).not.toBeInTheDocument();
    expect(onSeen).not.toHaveBeenCalled();
  });

  it("zeigt dem Impostor nicht das Wort", () => {
    const { card } = setup({ isImpostor: true });
    drag(card, 400, 300);
    expect(screen.getByText("🕵️ Du bist der Impostor")).toBeInTheDocument();
    expect(screen.queryByText("Begriff A")).not.toBeInTheDocument();
  });

  it("zeigt dem Impostor den Tipp", () => {
    const { card } = setup({ isImpostor: true, hint: "Merkmal A" });
    drag(card, 400, 300);
    expect(screen.getByText("Tipp: Merkmal A")).toBeInTheDocument();
  });

  it("zeigt der Crew keinen Tipp", () => {
    const { card } = setup({ hint: "Merkmal A" });
    drag(card, 400, 300);
    expect(screen.queryByText(/Tipp/)).not.toBeInTheDocument();
  });

  it("aktiviert Weitergeben erst mit canPass", () => {
    setup();
    expect(screen.getByRole("button", { name: "Fertig – weitergeben" })).toBeDisabled();
  });

  it("gibt mit canPass weiter", () => {
    const { onPassOn } = setup({ canPass: true });
    fireEvent.click(screen.getByRole("button", { name: "Fertig – weitergeben" }));
    expect(onPassOn).toHaveBeenCalledOnce();
  });
});
