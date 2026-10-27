import { afterEach, describe, expect, it, vi } from "vitest";

class FakeContext {
  static created = 0;
  state = "suspended";
  currentTime = 0;
  destination = {};
  constructor() {
    FakeContext.created++;
  }
  resume = vi.fn(() => {
    this.state = "running";
    return Promise.resolve();
  });
  createOscillator = vi.fn(() => ({ frequency: { value: 0 }, connect: vi.fn(), start: vi.fn(), stop: vi.fn() }));
  createGain = vi.fn(() => ({ gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() }, connect: vi.fn() }));
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
  FakeContext.created = 0;
});

describe("alarm", () => {
  it("nutzt den beim Fingertipp freigeschalteten Audio-Kontext (sonst bleibt das iPhone stumm)", async () => {
    vi.stubGlobal("AudioContext", FakeContext);
    const { alarm, unlockAudio } = await import("../src/alarm");
    unlockAudio();
    alarm();
    alarm();
    expect(FakeContext.created).toBe(1);
  });

  it("wirft nicht, wenn es kein Audio gibt", async () => {
    vi.stubGlobal("AudioContext", undefined);
    const { alarm, unlockAudio } = await import("../src/alarm");
    expect(() => {
      unlockAudio();
      alarm();
    }).not.toThrow();
  });
});
