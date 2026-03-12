import { shuffle } from "@/lib/utils";

export interface Grid {
  size: number;
  activeTiles: number[];
}

export function generateGrid(level: number): Grid {
  // Level 1: 3×3, 3 tiles → grows gradually
  const size = Math.min(3 + Math.floor((level - 1) / 3), 6);
  const tileCount = Math.min(2 + level, size * size - 1);
  const totalCells = size * size;

  const allIndices = Array.from({ length: totalCells }, (_, i) => i);
  return { size, activeTiles: shuffle(allIndices).slice(0, tileCount) };
}

export function checkAnswer(activeTiles: number[], selected: number[]): boolean {
  if (activeTiles.length !== selected.length) return false;
  const activeSet = new Set(activeTiles);
  return selected.every((v) => activeSet.has(v));
}
