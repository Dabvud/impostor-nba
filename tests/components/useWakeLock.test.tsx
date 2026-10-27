import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useWakeLock } from "../../src/components/useWakeLock";

afterEach(() => vi.unstubAllGlobals());

describe("useWakeLock", () => {
  it("hält den Bildschirm wach, solange ein Timer läuft, und gibt ihn danach frei", async () => {
    const release = vi.fn(() => Promise.resolve());
    const request = vi.fn(() => Promise.resolve({ release }));
    vi.stubGlobal("navigator", { ...navigator, wakeLock: { request } });
    const { unmount } = renderHook(() => useWakeLock(true));
    await waitFor(() => expect(request).toHaveBeenCalledWith("screen"));
    unmount();
    await waitFor(() => expect(release).toHaveBeenCalled());
  });

  it("tut nichts, wenn das Handy es nicht kann", () => {
    vi.stubGlobal("navigator", { ...navigator, wakeLock: undefined });
    expect(() => renderHook(() => useWakeLock(true))).not.toThrow();
  });
});
