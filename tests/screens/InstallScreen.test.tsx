import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import InstallScreen from "../../src/screens/InstallScreen";

describe("InstallScreen", () => {
  it("bietet auf Android den Installieren-Knopf an", async () => {
    const onPrompt = vi.fn();
    render(<InstallScreen platform="android" canPrompt onPrompt={onPrompt} onClose={() => {}} />);
    await userEvent.click(screen.getByRole("button", {name: "App installieren"}));
    expect(onPrompt).toHaveBeenCalledOnce();
  });
  it("erklärt Android ohne System-Dialog über das Menü", () => {
    render(<InstallScreen platform="android" canPrompt={false} onPrompt={() => {}} onClose={() => {}} />);
    expect(screen.getByText(/Menü ⋮/)).toBeInTheDocument();
    expect(screen.getByText(/App installieren/)).toBeInTheDocument();
  });
  it("erklärt das iPhone in Safari", () => {
    render(<InstallScreen platform="ios-safari" canPrompt={false} onPrompt={() => {}} onClose={() => {}} />);
    expect(screen.getByText(/Zum Home-Bildschirm/)).toBeInTheDocument();
  });
  it("schickt iPhone-Nutzer anderer Browser zu Safari", () => {
    render(<InstallScreen platform="ios-other" canPrompt={false} onPrompt={() => {}} onClose={() => {}} />);
    expect(screen.getByText(/Link in Safari öffnen/)).toBeInTheDocument();
  });
  it("zeigt nichts, wenn die App schon installiert ist", () => {
    const {container} = render(<InstallScreen platform="installed" canPrompt={false} onPrompt={() => {}} onClose={() => {}} />);
    expect(container).toBeEmptyDOMElement();
  });
});


it("gibt auf dem Desktop einen Hinweis und schließt die Hilfe", async () => {
  const onClose = vi.fn();
  render(<InstallScreen platform="other" canPrompt={false} onPrompt={() => {}} onClose={onClose} />);
  expect(screen.getByText(/Öffne diese Seite auf deinem Handy/)).toBeInTheDocument();
  await userEvent.click(screen.getByRole("button", { name: "Fertig" }));
  expect(onClose).toHaveBeenCalledOnce();
});

it("lässt die Installation auf Android mit „Später“ aus", async () => {
  const onClose = vi.fn();
  render(<InstallScreen platform="android" canPrompt onPrompt={() => {}} onClose={onClose} />);
  expect(screen.queryByRole("button", { name: "Fertig" })).not.toBeInTheDocument();
  await userEvent.click(screen.getByRole("button", { name: "Später" }));
  expect(onClose).toHaveBeenCalledOnce();
});
