import { type Difficulty } from "@/lib/difficulty";

export interface PixelPainterLevel {
  levelNumber: number;
  gridSize: number;
  targetPattern: number[];
  patternName: string;
  optimalClicks: number;
}

interface PatternDef {
  name: string;
  size: number;
  grid: number[];
}

const PATTERNS_4x4: PatternDef[] = [
  {
    name: "Arrow Right",
    size: 4,
    grid: [
      0, 1, 0, 0,
      0, 0, 1, 0,
      1, 1, 1, 1,
      0, 0, 1, 0,
    ],
  },
  {
    name: "Cross",
    size: 4,
    grid: [
      0, 1, 1, 0,
      1, 0, 0, 1,
      1, 0, 0, 1,
      0, 1, 1, 0,
    ],
  },
  {
    name: "Diagonal",
    size: 4,
    grid: [
      1, 0, 0, 0,
      0, 1, 0, 0,
      0, 0, 1, 0,
      0, 0, 0, 1,
    ],
  },
  {
    name: "Corner",
    size: 4,
    grid: [
      1, 1, 0, 0,
      1, 0, 0, 0,
      0, 0, 0, 0,
      0, 0, 0, 0,
    ],
  },
  {
    name: "Border",
    size: 4,
    grid: [
      1, 1, 1, 1,
      1, 0, 0, 1,
      1, 0, 0, 1,
      1, 1, 1, 1,
    ],
  },
];

const PATTERNS_8x8_EASY: PatternDef[] = [
  {
    name: "Smiley",
    size: 8,
    grid: [
      0, 0, 1, 1, 1, 1, 0, 0,
      0, 1, 0, 0, 0, 0, 1, 0,
      1, 0, 1, 0, 0, 1, 0, 1,
      1, 0, 0, 0, 0, 0, 0, 1,
      1, 0, 1, 0, 0, 1, 0, 1,
      1, 0, 0, 1, 1, 0, 0, 1,
      0, 1, 0, 0, 0, 0, 1, 0,
      0, 0, 1, 1, 1, 1, 0, 0,
    ],
  },
  {
    name: "Letter H",
    size: 8,
    grid: [
      1, 0, 0, 0, 0, 0, 1, 0,
      1, 0, 0, 0, 0, 0, 1, 0,
      1, 0, 0, 0, 0, 0, 1, 0,
      1, 1, 1, 1, 1, 1, 1, 0,
      1, 0, 0, 0, 0, 0, 1, 0,
      1, 0, 0, 0, 0, 0, 1, 0,
      1, 0, 0, 0, 0, 0, 1, 0,
      0, 0, 0, 0, 0, 0, 0, 0,
    ],
  },
  {
    name: "Arrow Up",
    size: 8,
    grid: [
      0, 0, 0, 1, 0, 0, 0, 0,
      0, 0, 1, 1, 1, 0, 0, 0,
      0, 1, 0, 1, 0, 1, 0, 0,
      1, 0, 0, 1, 0, 0, 1, 0,
      0, 0, 0, 1, 0, 0, 0, 0,
      0, 0, 0, 1, 0, 0, 0, 0,
      0, 0, 0, 1, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0,
    ],
  },
];

const PATTERNS_8x8_HARD: PatternDef[] = [
  {
    name: "Heart",
    size: 8,
    grid: [
      0, 1, 1, 0, 0, 1, 1, 0,
      1, 1, 1, 1, 1, 1, 1, 1,
      1, 1, 1, 1, 1, 1, 1, 1,
      1, 1, 1, 1, 1, 1, 1, 1,
      0, 1, 1, 1, 1, 1, 1, 0,
      0, 0, 1, 1, 1, 1, 0, 0,
      0, 0, 0, 1, 1, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0,
    ],
  },
  {
    name: "Spaceship",
    size: 8,
    grid: [
      0, 0, 0, 1, 1, 0, 0, 0,
      0, 0, 1, 1, 1, 1, 0, 0,
      0, 1, 1, 1, 1, 1, 1, 0,
      1, 1, 0, 1, 1, 0, 1, 1,
      1, 1, 1, 1, 1, 1, 1, 1,
      0, 0, 1, 0, 0, 1, 0, 0,
      0, 1, 0, 0, 0, 0, 1, 0,
      0, 0, 0, 0, 0, 0, 0, 0,
    ],
  },
  {
    name: "Checkerboard",
    size: 8,
    grid: [
      1, 0, 1, 0, 1, 0, 1, 0,
      0, 1, 0, 1, 0, 1, 0, 1,
      1, 0, 1, 0, 1, 0, 1, 0,
      0, 1, 0, 1, 0, 1, 0, 1,
      1, 0, 1, 0, 1, 0, 1, 0,
      0, 1, 0, 1, 0, 1, 0, 1,
      1, 0, 1, 0, 1, 0, 1, 0,
      0, 1, 0, 1, 0, 1, 0, 1,
    ],
  },
];

function getPatterns(difficulty: Difficulty): PatternDef[] {
  if (difficulty === "easy") return PATTERNS_4x4;
  if (difficulty === "medium") return PATTERNS_8x8_EASY;
  return PATTERNS_8x8_HARD;
}

export function generateLevel(
  levelNumber: number,
  difficulty: Difficulty
): PixelPainterLevel {
  const patterns = getPatterns(difficulty);
  const idx = levelNumber % patterns.length;
  const pattern = patterns[idx];
  const optimalClicks = pattern.grid.filter((v) => v === 1).length;

  return {
    levelNumber,
    gridSize: pattern.size,
    targetPattern: [...pattern.grid],
    patternName: pattern.name,
    optimalClicks,
  };
}

export function checkMatch(playerGrid: number[], targetGrid: number[]): boolean {
  return playerGrid.every((v, i) => v === targetGrid[i]);
}

export function countDifferences(playerGrid: number[], targetGrid: number[]): number {
  return playerGrid.reduce((count, v, i) => count + (v !== targetGrid[i] ? 1 : 0), 0);
}

export function addressToCoord(
  address: number,
  gridSize: number
): { row: number; col: number } {
  return { row: Math.floor(address / gridSize), col: address % gridSize };
}

export function coordToAddress(
  row: number,
  col: number,
  gridSize: number
): number {
  return row * gridSize + col;
}

export function createEmptyGrid(size: number): number[] {
  return new Array(size * size).fill(0);
}

export function getLevelCount(difficulty: Difficulty): number {
  return getPatterns(difficulty).length;
}
