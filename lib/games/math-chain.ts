import { shuffle, randInt } from "@/lib/utils";
import type { Difficulty } from "@/lib/difficulty";

export interface Operation {
  label: string;
  apply: (n: number) => number;
}

export interface MathChainRound {
  start: number;
  target: number;
  operations: Operation[];
}

export interface MathChainConfig {
  maxNumber: number;
  includeMultiply: boolean;
  timePerRound: number;
}

export function getMathChainConfig(difficulty: Difficulty): MathChainConfig {
  switch (difficulty) {
    case "easy":
      return { maxNumber: 20, includeMultiply: false, timePerRound: 30 };
    case "medium":
      return { maxNumber: 50, includeMultiply: true, timePerRound: 20 };
    case "hard":
      return { maxNumber: 100, includeMultiply: true, timePerRound: 15 };
  }
}

function makeAddOp(n: number): Operation {
  return { label: `+${n}`, apply: (x) => x + n };
}

function makeSubOp(n: number): Operation {
  return { label: `\u2212${n}`, apply: (x) => x - n };
}

function makeMulOp(n: number): Operation {
  return { label: `\u00D7${n}`, apply: (x) => x * n };
}

export function generateRound(config: MathChainConfig): MathChainRound {
  const { maxNumber, includeMultiply } = config;

  // Pick a starting number
  const start = randInt(Math.max(5, Math.floor(maxNumber / 5)), Math.floor(maxNumber / 2));

  // Build a solution path of 2-3 steps
  const steps = randInt(2, 3);
  let current = start;
  const solutionOps: Operation[] = [];

  for (let i = 0; i < steps; i++) {
    const candidates: Operation[] = [];

    // Addition
    const addVal = randInt(1, Math.min(10, Math.floor(maxNumber / 3)));
    if (current + addVal <= maxNumber) {
      candidates.push(makeAddOp(addVal));
    }

    // Subtraction
    const subVal = randInt(1, Math.min(10, Math.floor(maxNumber / 3)));
    if (current - subVal > 0) {
      candidates.push(makeSubOp(subVal));
    }

    // Multiplication
    if (includeMultiply) {
      if (current * 2 <= maxNumber) candidates.push(makeMulOp(2));
      if (current * 3 <= maxNumber) candidates.push(makeMulOp(3));
    }

    if (candidates.length === 0) {
      // Fallback: just add a small number
      candidates.push(makeAddOp(1));
    }

    const chosen = candidates[Math.floor(Math.random() * candidates.length)];
    solutionOps.push(chosen);
    current = chosen.apply(current);
  }

  const target = current;

  // The first correct operation is solutionOps[0]
  // Generate 3 distractors
  const correctOp = solutionOps[0];
  const distractors: Operation[] = [];
  const usedLabels = new Set([correctOp.label]);

  const attempts = 30;
  for (let i = 0; i < attempts && distractors.length < 3; i++) {
    let op: Operation;
    const roll = Math.random();

    if (roll < 0.4) {
      const v = randInt(1, Math.min(10, Math.floor(maxNumber / 3)));
      op = makeAddOp(v);
    } else if (roll < 0.8) {
      const v = randInt(1, Math.min(10, Math.floor(maxNumber / 3)));
      op = makeSubOp(v);
    } else if (includeMultiply) {
      op = makeMulOp(Math.random() < 0.5 ? 2 : 3);
    } else {
      const v = randInt(1, Math.min(10, Math.floor(maxNumber / 3)));
      op = makeAddOp(v);
    }

    // Ensure no duplicate labels and result stays in range
    const result = op.apply(start);
    if (!usedLabels.has(op.label) && result > 0 && result <= maxNumber * 2) {
      distractors.push(op);
      usedLabels.add(op.label);
    }
  }

  // Fill remaining distractors if needed
  let fill = 1;
  while (distractors.length < 3) {
    const label = `+${fill}`;
    if (!usedLabels.has(label)) {
      distractors.push(makeAddOp(fill));
      usedLabels.add(label);
    }
    fill++;
  }

  return {
    start,
    target,
    operations: shuffle([correctOp, ...distractors]),
  };
}
