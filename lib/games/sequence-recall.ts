export const COLORS = ["red", "blue", "green", "yellow"] as const;
export type Color = (typeof COLORS)[number];

export function generateNextColor(): Color {
  return COLORS[Math.floor(Math.random() * COLORS.length)];
}

export function checkSequence(sequence: Color[], playerInput: Color[]): boolean {
  return playerInput.every((color, i) => color === sequence[i]);
}
