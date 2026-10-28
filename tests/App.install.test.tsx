import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import App from "../src/App";
import { captureInstallPrompt } from "../src/install";

beforeEach(() => {
  localStorage.clear();
  history.replaceState(null, "", "/?installieren&keep=1#hilfe");
});
afterEach(() => {
  history.replaceState(null, "", "/");
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

it.each(["Fertig"])("öffnet die Hilfe und entfernt beim %s nur den Installationsparameter", (button) => {
  const first = render(<App />);
  expect(screen.getByRole("heading", { name: "Aufs Handy holen" })).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: button }));
  expect(screen.getByRole("button", { name: "Start" })).toBeInTheDocument();
  expect(location.search).toBe("?keep=1");
  expect(location.hash).toBe("#hilfe");
  first.unmount();
  render(<App />);
  expect(screen.queryByRole("heading", { name: "Aufs Handy holen" })).not.toBeInTheDocument();
});

it.each(["media", "navigator"])("ignoriert den Parameter in der installierten App (%s)", (kind) => {
  if (kind === "media") vi.stubGlobal("matchMedia", () => ({ matches: true }));
  else vi.stubGlobal("navigator", { standalone: true, userAgent: navigator.userAgent });
  render(<App />);
  expect(screen.getByRole("button", { name: "Start" })).toBeInTheDocument();
});

it("bietet auch ein später eintreffendes Installationsereignis an", async () => {
  vi.spyOn(navigator, "userAgent", "get").mockReturnValue("Android");
  captureInstallPrompt();
  render(<App />);
  expect(screen.getByText(/Menü ⋮/)).toBeInTheDocument();
  const prompt = vi.fn().mockResolvedValue(undefined);
  fireEvent(window, Object.assign(new Event("beforeinstallprompt"), {
    prompt, userChoice: Promise.resolve({ outcome: "accepted" }),
  }));
  fireEvent.click(screen.getByRole("button", { name: "App installieren" }));
  expect(prompt).toHaveBeenCalledOnce();
  expect(await screen.findByText(/Menü ⋮/)).toBeInTheDocument();
});
