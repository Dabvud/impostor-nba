import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useCountdown } from "../../src/components/useCountdown";

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("useCountdown", () => {
  it("rechnet mit der echten Uhrzeit, auch wenn das Handy die Ticks gedrosselt hat", () => {
    const { result } = renderHook(() => useCountdown(60, true));
    // Bildschirm aus: 20 Sekunden vergehen, ohne dass ein Tick feuert
    act(() => vi.setSystemTime(Date.now() + 20_000));
    act(() => vi.advanceTimersByTime(300));
    expect(result.current.remaining).toBe(40);
  });

  it("hält bei Pause die Restzeit fest und läuft danach weiter", () => {
    let running = true;
    const { result, rerender } = renderHook(() => useCountdown(30, running));
    act(() => vi.advanceTimersByTime(10_000));
    expect(result.current.remaining).toBe(20);
    running = false;
    rerender();
    act(() => vi.advanceTimersByTime(10_000));
    expect(result.current.remaining).toBe(20);
    running = true;
    rerender();
    act(() => vi.advanceTimersByTime(5_000));
    expect(result.current.remaining).toBe(15);
  });

  it("verlängert um die gewünschten Sekunden, auch nach Ablauf", () => {
    const { result } = renderHook(() => useCountdown(5, true));
    act(() => vi.advanceTimersByTime(6_000));
    expect(result.current.remaining).toBe(0);
    act(() => result.current.add(30));
    expect(result.current.remaining).toBe(30);
    act(() => vi.advanceTimersByTime(10_000));
    expect(result.current.remaining).toBe(20);
  });
});
