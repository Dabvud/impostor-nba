import { describe, expect, it } from "vitest";
import {
  addMember,
  createGroup,
  removeMember,
  renameGroup,
  renameMember,
  selectedNames,
  startEvening,
  toggleSelected,
  type Group,
} from "../../src/game/groups";

function ids() {
  let n = 0;
  return () => `id${++n}`;
}

function squad(): Group {
  const newId = ids();
  let g = createGroup("Freitagsrunde", newId);
  for (const name of ["Anna", "Ben", "Cem"]) g = addMember(g, name, newId).group;
  return g;
}

describe("Gruppen", () => {
  it("legt eine leere Gruppe am ersten Abend an", () => {
    expect(createGroup(" Freitagsrunde ", () => "g1")).toEqual({
      id: "g1",
      name: "Freitagsrunde",
      members: [],
      selected: [],
      evening: 1,
    });
  });

  it("nimmt neue Mitglieder getrimmt auf und wählt sie gleich aus", () => {
    const g = squad();
    expect(g.members.map((m) => m.name)).toEqual(["Anna", "Ben", "Cem"]);
    expect(selectedNames(g)).toEqual(["Anna", "Ben", "Cem"]);
  });

  it("lehnt doppelte Namen ab, ohne die Gruppe zu ändern", () => {
    const g = squad();
    const result = addMember(g, " ben ", () => "x");
    expect(result.error).toBe("Ben ist schon dabei");
    expect(result.group).toBe(g);
    expect(addMember(g, "  ", () => "x").error).toBe("Name fehlt");
  });

  it("wählt in Sitzreihenfolge aus und rückt beim Abwählen nach", () => {
    let g = squad();
    for (const id of [...g.selected]) g = toggleSelected(g, id);
    expect(selectedNames(g)).toEqual([]);
    const [anna, ben, cem] = g.members.map((m) => m.id);
    g = toggleSelected(toggleSelected(toggleSelected(g, anna), cem), ben);
    expect(selectedNames(g)).toEqual(["Anna", "Cem", "Ben"]);
    g = toggleSelected(g, cem);
    expect(selectedNames(g)).toEqual(["Anna", "Ben"]);
  });

  it("benennt Mitglieder um, behält die ID und prüft Duplikate", () => {
    const g = squad();
    const ben = g.members[1];
    const renamed = renameMember(g, ben.id, "Benni");
    expect(renamed.error).toBeNull();
    expect(renamed.group.members[1]).toEqual({ id: ben.id, name: "Benni" });
    expect(renameMember(g, ben.id, "anna").error).toBe("Anna ist schon dabei");
    expect(renameMember(g, ben.id, "Ben").error).toBeNull();
  });

  it("entfernt Mitglieder auch aus der Auswahl", () => {
    const g = squad();
    const removed = removeMember(g, g.members[0].id);
    expect(removed.members.map((m) => m.name)).toEqual(["Ben", "Cem"]);
    expect(selectedNames(removed)).toEqual(["Ben", "Cem"]);
  });

  it("benennt die Gruppe um und startet einen neuen Abend", () => {
    const g = squad();
    expect(renameGroup(g, " Runde ").name).toBe("Runde");
    expect(startEvening(startEvening(g)).evening).toBe(3);
  });
});
