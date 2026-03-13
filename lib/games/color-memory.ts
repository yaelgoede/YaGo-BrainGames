import type { Difficulty } from "@/lib/difficulty";

export type GameColor =
  | "red"
  | "blue"
  | "green"
  | "yellow"
  | "purple"
  | "orange";

export const COLOR_PALETTE: GameColor[] = [
  "red",
  "blue",
  "green",
  "yellow",
  "purple",
  "orange",
];

export const COLOR_HEX: Record<GameColor, string> = {
  red: "#ef4444",
  blue: "#3b82f6",
  green: "#22c55e",
  yellow: "#eab308",
  purple: "#a855f7",
  orange: "#f97316",
};

export interface ColorGrid {
  size: number;
  tiles: GameColor[];
}

export interface ColorConfig {
  memorizeMs: number;
  colorCount: number;
}

export function getColorConfig(difficulty: Difficulty): ColorConfig {
  switch (difficulty) {
    case "easy":
      return { memorizeMs: 3000, colorCount: 4 };
    case "medium":
      return { memorizeMs: 2000, colorCount: 5 };
    case "hard":
      return { memorizeMs: 1500, colorCount: 6 };
  }
}

export function generateColorGrid(
  level: number,
  colorCount: number,
): ColorGrid {
  const size = Math.min(2 + Math.floor((level - 1) / 2), 5);
  const total = size * size;
  const available = COLOR_PALETTE.slice(0, colorCount);
  const tiles: GameColor[] = Array.from(
    { length: total },
    () => available[Math.floor(Math.random() * available.length)],
  );
  return { size, tiles };
}

export function isGridCorrect(
  correct: GameColor[],
  player: (GameColor | null)[],
): boolean {
  return correct.every((c, i) => c === player[i]);
}
