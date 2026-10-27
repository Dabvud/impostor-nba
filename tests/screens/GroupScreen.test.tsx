import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Group } from "../../src/game/groups";
import GroupScreen from "../../src/screens/GroupScreen";

afterEach(() => vi.restoreAllMocks());

const group: Group = {
  id: "g1",
  name: "Freitagsrunde",
  members: [
    { id: "a", name: "Anna" },
    { id: "b", name: "Ben" },
  ],
  selected: ["b"],
  evening: 2,
};

describe("GroupScreen", () => {
  it("legt eine neue Gruppe mit Mitgliedern an", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(<GroupScreen group={null} onSave={onSave} onDelete={vi.fn()} onBack={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Speichern" })).toBeDisabled();
    await user.type(screen.getByLabelText("Gruppenname"), "Runde");
    await user.type(screen.getByLabelText("Neues Mitglied"), "Luca{Enter}");
    await user.type(screen.getByLabelText("Neues Mitglied"), "Fabi{Enter}");
    await user.click(screen.getByRole("button", { name: "Speichern" }));
    const saved: Group = onSave.mock.calls[0][0];
    expect(saved.name).toBe("Runde");
    expect(saved.members.map((m) => m.name)).toEqual(["Luca", "Fabi"]);
    expect(saved.evening).toBe(1);
  });

  it("benennt Gruppe und Mitglieder um, ohne IDs zu ändern", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(<GroupScreen group={group} onSave={onSave} onDelete={vi.fn()} onBack={vi.fn()} />);
    const name = screen.getByLabelText("Gruppenname");
    await user.clear(name);
    await user.type(name, "Freitag");
    const ben = screen.getByLabelText("Name von Ben");
    await user.clear(ben);
    await user.type(ben, "Benni");
    await user.click(screen.getByRole("button", { name: "Speichern" }));
    expect(onSave).toHaveBeenCalledWith({ ...group, name: "Freitag", members: [group.members[0], { id: "b", name: "Benni" }] });
  });

  it("verhindert doppelte Namen beim Umbenennen und Hinzufügen", async () => {
    const user = userEvent.setup();
    render(<GroupScreen group={group} onSave={vi.fn()} onDelete={vi.fn()} onBack={vi.fn()} />);
    await user.type(screen.getByLabelText("Neues Mitglied"), "anna{Enter}");
    expect(screen.getByText("Anna ist schon dabei")).toBeInTheDocument();
    const ben = screen.getByLabelText("Name von Ben");
    await user.clear(ben);
    await user.type(ben, "Anna");
    expect(screen.getByRole("button", { name: "Speichern" })).toBeDisabled();
  });

  it("entfernt Mitglieder", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(<GroupScreen group={group} onSave={onSave} onDelete={vi.fn()} onBack={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: "Ben entfernen" }));
    await user.click(screen.getByRole("button", { name: "Speichern" }));
    expect(onSave).toHaveBeenCalledWith({ ...group, members: [group.members[0]], selected: [] });
  });

  it("löscht die Gruppe nur nach Rückfrage", async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    render(<GroupScreen group={group} onSave={vi.fn()} onDelete={onDelete} onBack={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: "Gruppe löschen" }));
    expect(confirm).toHaveBeenCalledWith("„Freitagsrunde“ mit Statistik löschen?");
    expect(onDelete).not.toHaveBeenCalled();
    confirm.mockReturnValue(true);
    await user.click(screen.getByRole("button", { name: "Gruppe löschen" }));
    expect(onDelete).toHaveBeenCalledWith("g1");
  });

  it("geht ohne Speichern zurück", async () => {
    const user = userEvent.setup();
    const onBack = vi.fn();
    render(<GroupScreen group={null} onSave={vi.fn()} onDelete={vi.fn()} onBack={onBack} />);
    expect(screen.queryByRole("button", { name: "Gruppe löschen" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Zurück" }));
    expect(onBack).toHaveBeenCalledOnce();
  });
});
