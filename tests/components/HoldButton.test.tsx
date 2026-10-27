import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import HoldButton from "../../src/components/HoldButton";

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("HoldButton", () => {
  it("löst erst nach 1000 ms Halten aus, genau einmal", () => {
    const onComplete = vi.fn();
    render(<HoldButton label="Auflösen" onComplete={onComplete} />);
    fireEvent.pointerDown(screen.getByRole("button", { name: "Auflösen" }));
    act(() => vi.advanceTimersByTime(999));
    expect(onComplete).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1));
    expect(onComplete).toHaveBeenCalledOnce();
    act(() => vi.advanceTimersByTime(5000));
    expect(onComplete).toHaveBeenCalledOnce();
  });

  it("bricht bei vorzeitigem Loslassen ab", () => {
    const onComplete = vi.fn();
    render(<HoldButton label="Auflösen" onComplete={onComplete} />);
    const button = screen.getByRole("button", { name: "Auflösen" });
    fireEvent.pointerDown(button);
    act(() => vi.advanceTimersByTime(500));
    fireEvent.pointerUp(button);
    act(() => vi.advanceTimersByTime(2000));
    expect(onComplete).not.toHaveBeenCalled();
  });
});

it("verhindert Scroll-Gesten, damit Android das Halten nicht abbricht", () => {
  render(<HoldButton label="Auflösen" onComplete={vi.fn()} />);
  expect(screen.getByRole("button", { name: "Auflösen" })).toHaveStyle({ touchAction: "none" });
});
