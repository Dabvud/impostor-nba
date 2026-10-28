import { describe, expect, it, vi } from "vitest";
import { detectPlatform, wantsInstall } from "../src/install";

const UA = {
  iosSafari: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
  iosChrome: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/130.0 Mobile/15E148 Safari/604.1",
  iosInstagram: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 350.0",
  android: "Mozilla/5.0 (Linux; Android 15; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36",
  desktop: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36",
};

describe("Plattform-Erkennung", () => {
  it.each([
    ["iosSafari", "ios-safari"], ["iosChrome", "ios-other"], ["iosInstagram", "ios-other"],
    ["android", "android"], ["desktop", "other"],
  ] as const)("%s → %s", (ua, expected) => {
    expect(detectPlatform(UA[ua], false)).toBe(expected);
  });
  it("erkennt eine schon installierte App", () => {
    expect(detectPlatform(UA.iosSafari, true)).toBe("installed");
  });
  it("erkennt ?installieren", () => {
    expect(wantsInstall("?installieren")).toBe(true);
    expect(wantsInstall("?installieren=1&x=2")).toBe(true);
    expect(wantsInstall("")).toBe(false);
    expect(wantsInstall("?x=1")).toBe(false);
  });
});


describe("Installationsdialog", () => {
  it("merkt das frühe Ereignis und verwendet es nur einmal", async () => {
    const { captureInstallPrompt, canPromptInstall, promptInstall } = await import("../src/install");
    captureInstallPrompt();
    const prompt = vi.fn().mockResolvedValue(undefined);
    const event = Object.assign(new Event("beforeinstallprompt", { cancelable: true }), {
      prompt, userChoice: Promise.resolve({ outcome: "accepted" }),
    });
    window.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    expect(canPromptInstall()).toBe(true);
    expect(await promptInstall()).toBe(true);
    expect(prompt).toHaveBeenCalledOnce();
    expect(canPromptInstall()).toBe(false);
    expect(await promptInstall()).toBe(false);
  });
  it.each(["dismissed", "error"])("behandelt %s ohne offenen Dialog", async (outcome) => {
    const { canPromptInstall, promptInstall } = await import("../src/install");
    window.dispatchEvent(Object.assign(new Event("beforeinstallprompt"), {
      prompt: outcome === "error" ? () => Promise.reject(new Error("blocked")) : () => Promise.resolve(),
      userChoice: Promise.resolve({ outcome }),
    }));
    expect(await promptInstall()).toBe(false);
    expect(canPromptInstall()).toBe(false);
  });
});
