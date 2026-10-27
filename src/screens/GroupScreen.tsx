import { useState, type FormEvent } from "react";
import { addMember, createGroup, newId, removeMember, renameGroup, type Group } from "../game/groups";

type Props = {
  group: Group | null;
  onSave: (group: Group) => void;
  onDelete: (id: string) => void;
  onBack: () => void;
};

/** Doppelte oder leere Namen in der Bearbeitung – Speichern bleibt dann gesperrt. */
function nameProblem(names: string[]): string | null {
  const trimmed = names.map((n) => n.trim());
  if (trimmed.some((n) => !n)) return "Jedes Mitglied braucht einen Namen";
  const seen = new Set<string>();
  for (const n of trimmed) {
    if (seen.has(n.toLowerCase())) return `${n} gibt es doppelt`;
    seen.add(n.toLowerCase());
  }
  return null;
}

export default function GroupScreen({ group, onSave, onDelete, onBack }: Props) {
  const [draft, setDraft] = useState<Group>(() => group ?? createGroup("", newId));
  const [newName, setNewName] = useState("");
  const [addHint, setAddHint] = useState<string | null>(null);

  const problem = nameProblem(draft.members.map((m) => m.name));
  const canSave = draft.name.trim().length > 0 && problem === null;

  function add(e: FormEvent) {
    e.preventDefault();
    const result = addMember(draft, newName, newId);
    setAddHint(result.error);
    if (!result.error) {
      setDraft(result.group);
      setNewName("");
    }
  }

  function rename(id: string, name: string) {
    setDraft({ ...draft, members: draft.members.map((m) => (m.id === id ? { ...m, name } : m)) });
  }

  function save() {
    const members = draft.members.map((m) => ({ ...m, name: m.name.trim() }));
    onSave(renameGroup({ ...draft, members }, draft.name));
  }

  function remove() {
    if (group && window.confirm(`„${group.name}“ mit Statistik löschen?`)) onDelete(group.id);
  }

  return (
    <main className="screen setup">
      <h1 className="title">{group ? "Gruppe bearbeiten" : "Neue Gruppe"}</h1>

      <section className="panel">
        <h2>Name</h2>
        <input
          className="text-input"
          aria-label="Gruppenname"
          placeholder="z. B. Freitagsrunde"
          value={draft.name}
          maxLength={24}
          autoComplete="off"
          onChange={(e) => setDraft({ ...draft, name: e.target.value })}
        />
      </section>

      <section className="panel">
        <h2>Kader</h2>
        <ul className="member-list">
          {draft.members.map((m) => (
            <li key={m.id}>
              <input
                className="text-input"
                aria-label={`Name von ${group?.members.find((o) => o.id === m.id)?.name ?? m.name}`}
                value={m.name}
                maxLength={20}
                autoComplete="off"
                onChange={(e) => rename(m.id, e.target.value)}
              />
              <button
                type="button"
                className="icon-button"
                aria-label={`${m.name} entfernen`}
                onClick={() => setDraft(removeMember(draft, m.id))}
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
        {problem && <p className="field-hint">{problem}</p>}
        <form className="add-name" onSubmit={add}>
          <input
            aria-label="Neues Mitglied"
            enterKeyHint="enter"
            placeholder="+ Neues Mitglied"
            value={newName}
            maxLength={20}
            autoComplete="off"
            onChange={(e) => setNewName(e.target.value)}
          />
          <button type="submit" onPointerDown={(e) => e.preventDefault()} onMouseDown={(e) => e.preventDefault()}>
            Hinzufügen
          </button>
        </form>
        {addHint && <p className="field-hint">{addHint}</p>}
      </section>

      <button type="button" className="primary" disabled={!canSave} onClick={save}>
        Speichern
      </button>
      <nav className="setup-links">
        <button type="button" onClick={onBack}>
          Zurück
        </button>
        {group && (
          <button type="button" className="danger-link" onClick={remove}>
            Gruppe löschen
          </button>
        )}
      </nav>
    </main>
  );
}
