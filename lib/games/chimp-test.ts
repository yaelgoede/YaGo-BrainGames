import { shuffle } from "@/lib/utils";
import type { Difficulty } from "@/lib/difficulty";

export interface ChimpGrid {
  cols: number;
  rows: number;
  /** Map from cell index → display number (1..count) */
  numbers: Map<number, number>;
}

export interface ChimpConfig {
  startingCount: number;
}

export function getChimpConfig(difficulty: Difficulty): ChimpConfig {
  switch (difficulty) {
    case "easy":
      return { startingCount: 4 };
    case "medium":
      return { startingCount: 5 };
    case "hard":
      return { startingCount: 7 };
  }
}

export function generateChimpGrid(
  count: number,
  cols = 8,
  rows = 5,
): ChimpGrid {
  const total = cols * rows;
  const indices = shuffle(Array.from({ length: total }, (_, i) => i)).slice(
    0,
    count,
  );
  const numbers = new Map<number, number>();
  indices.forEach((cellIdx, i) => {
    numbers.set(cellIdx, i + 1);
  });
  return { cols, rows, numbers };
}
