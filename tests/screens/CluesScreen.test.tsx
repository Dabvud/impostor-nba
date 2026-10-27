import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { alarm } from "../../src/alarm";
import CluesScreen from "../../src/screens/CluesScreen";

vi.mock("../../src/alarm", () => ({ alarm: vi.fn() }));

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  vi.useRealTimers();
  vi.mocked(alarm).mockClear();
});

describe("CluesScreen", () => {
  it("zeigt den Spieler, die Position und die Restzeit", () => {
    render(<CluesScreen name="Jonas" seconds={15} position={2} total={5} onNext={vi.fn()} />);
    expect(screen.getByRole("heading", { name: "Jonas" })).toBeInTheDocument();
    expect(screen.getByText("Hinweis 2 von 5")).toBeInTheDocument();
    expect(screen.getByText("0:15")).toBeInTheDocument();
  });

  it("zählt herunter und meldet bei 0 einmal „Zeit um!“", () => {
    render(<CluesScreen name="Jonas" seconds={15} position={1} total={3} onNext={vi.fn()} />);
    act(() => vi.advanceTimersByTime(5000));
    expect(screen.getByText("0:10")).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(10000));
    expect(screen.getByText("Zeit um!")).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(5000));
    expect(alarm).toHaveBeenCalledOnce();
  });

  it("geht mit Weiter zum nächsten Spieler", () => {
    const onNext = vi.fn();
    render(<CluesScreen name="Jonas" seconds={15} position={1} total={3} onNext={onNext} />);
    fireEvent.click(screen.getByRole("button", { name: "Weiter ▶" }));
    expect(onNext).toHaveBeenCalledOnce();
  });

  it("zeigt Paul mit Regenbogen", () => {
    render(<CluesScreen name="Paul" seconds={15} position={1} total={3} onNext={vi.fn()} />);
    expect(screen.getByRole("heading", { name: "Paul 🌈" })).toBeInTheDocument();
  });
});
