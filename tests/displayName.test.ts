import { describe, expect, it } from "vitest";
import { displayName } from "../src/displayName";

describe("displayName", () => {
  it.each(["Paul", "paul", "PAUL", "Paul M.", "  Paul  "])("hängt bei %j einen Regenbogen an", (name) => {
    expect(displayName(name)).toBe(`${name.trim()} 🌈`);
  });

  it.each(["Paula", "Pauli", "Jean-Paul", "Anna"])("lässt %j unverändert", (name) => {
    expect(displayName(name)).toBe(name);
  });
});
