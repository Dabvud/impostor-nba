export type Member = { id: string; name: string };
export type Group = { id: string; name: string; members: Member[]; selected: string[]; evening: number };
export type GroupResult = { group: Group; error: string | null };

export function createGroup(name: string, newId: () => string): Group {
  return { id: newId(), name: name.trim(), members: [], selected: [], evening: 1 };
}

export function renameGroup(g: Group, name: string): Group {
  return { ...g, name: name.trim() };
}

function memberError(g: Group, name: string, id?: string): string | null {
  if (!name) return "Name fehlt";
  const duplicate = g.members.find((m) => m.id !== id && m.name.trim().toLowerCase() === name.toLowerCase());
  return duplicate ? duplicate.name + " ist schon dabei" : null;
}

export function addMember(g: Group, name: string, newId: () => string): GroupResult {
  const trimmed = name.trim();
  const error = memberError(g, trimmed);
  if (error) return { group: g, error };
  const member = { id: newId(), name: trimmed };
  return {
    group: { ...g, members: [...g.members, member], selected: [...g.selected, member.id] },
    error: null,
  };
}

export function renameMember(g: Group, id: string, name: string): GroupResult {
  const trimmed = name.trim();
  const error = memberError(g, trimmed, id);
  if (error) return { group: g, error };
  return {
    group: { ...g, members: g.members.map((m) => m.id === id ? { ...m, name: trimmed } : m) },
    error: null,
  };
}

export function removeMember(g: Group, id: string): Group {
  return { ...g, members: g.members.filter((m) => m.id !== id), selected: g.selected.filter((s) => s !== id) };
}

export function toggleSelected(g: Group, id: string): Group {
  return { ...g, selected: g.selected.includes(id) ? g.selected.filter((s) => s !== id) : [...g.selected, id] };
}

export function selectedNames(g: Group): string[] {
  return g.selected.flatMap((id) => {
    const member = g.members.find((m) => m.id === id);
    return member ? [member.name] : [];
  });
}

export function startEvening(g: Group): Group {
  return { ...g, evening: g.evening + 1 };
}

/** Zufällige ID für Gruppen und Mitglieder (eindeutig genug für ein Handy). */
export function newId(): string {
  return Math.random().toString(36).slice(2, 10);
}
