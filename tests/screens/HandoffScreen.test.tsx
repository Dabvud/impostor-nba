import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import HandoffScreen from "../../src/screens/HandoffScreen";

it("zeigt, wer dran ist, und bestätigt per Button", async () => {
  const onConfirm = vi.fn();
  render(<HandoffScreen name="Luca" onConfirm={onConfirm} />);
  expect(screen.getByText("Luca ist dran")).toBeInTheDocument();
  await userEvent.setup().click(screen.getByRole("button", { name: "Ich bin Luca" }));
  expect(onConfirm).toHaveBeenCalledOnce();
});

it("zeigt bei Paul einen Regenbogen", () => {
  render(<HandoffScreen name="Paul" onConfirm={vi.fn()} />);
  expect(screen.getByText("Paul 🌈 ist dran")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Ich bin Paul 🌈" })).toBeInTheDocument();
});
