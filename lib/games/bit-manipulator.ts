export type BitOperation = "NOT" | "AND" | "OR" | "XOR" | "SHIFT_LEFT" | "SHIFT_RIGHT";

export interface PuzzleLevel {
  startBits: number[];
  targetBits: number[];
  bitCount: number;
  availableOps: BitOperation[];
  optimalSteps: number;
  levelNumber: number;
}

export const OPERATION_DESCRIPTIONS: Record<BitOperation, string> = {
  NOT: "NOT flips a bit: 0 becomes 1, 1 becomes 0.",
  AND: "AND keeps a bit only if both bits are 1.",
  OR: "OR sets a bit to 1 if either bit is 1.",
  XOR: "XOR flips a bit if the mask bit is 1.",
  SHIFT_LEFT: "SHIFT LEFT moves all bits one position left. The rightmost bit becomes 0.",
  SHIFT_RIGHT: "SHIFT RIGHT moves all bits one position right. The leftmost bit becomes 0.",
};

function getConfigForLevel(level: number): { bitCount: number; ops: BitOperation[]; steps: number } {
  if (level <= 3) return { bitCount: 4, ops: ["NOT"], steps: Math.min(level, 3) };
  if (level <= 6) return { bitCount: 4, ops: ["NOT", "AND", "OR"], steps: Math.min(level - 2, 3) };
  if (level <= 9) return { bitCount: 6, ops: ["NOT", "AND", "OR", "XOR"], steps: Math.min(level - 4, 4) };
  return { bitCount: 8, ops: ["NOT", "AND", "OR", "XOR", "SHIFT_LEFT", "SHIFT_RIGHT"], steps: Math.min(level - 6, 5) };
}

function randomBits(count: number): number[] {
  return Array.from({ length: count }, () => Math.random() < 0.5 ? 0 : 1);
}

function randomMask(count: number): number[] {
  return Array.from({ length: count }, (): number => Math.random() < 0.5 ? 0 : 1);
}

export function applyOperation(bits: number[], op: BitOperation, mask?: number[]): number[] {
  const result = [...bits];
  switch (op) {
    case "NOT":
      if (mask) {
        for (let i = 0; i < result.length; i++) {
          if (mask[i]) result[i] = result[i] === 0 ? 1 : 0;
        }
      } else {
        for (let i = 0; i < result.length; i++) {
          result[i] = result[i] === 0 ? 1 : 0;
        }
      }
      return result;
    case "AND":
      for (let i = 0; i < result.length; i++) {
        result[i] = result[i] & (mask?.[i] ?? 1);
      }
      return result;
    case "OR":
      for (let i = 0; i < result.length; i++) {
        result[i] = result[i] | (mask?.[i] ?? 0);
      }
      return result;
    case "XOR":
      for (let i = 0; i < result.length; i++) {
        result[i] = result[i] ^ (mask?.[i] ?? 0);
      }
      return result;
    case "SHIFT_LEFT": {
      const shifted = result.slice(1);
      shifted.push(0);
      return shifted;
    }
    case "SHIFT_RIGHT": {
      const shifted = [0, ...result.slice(0, -1)];
      return shifted;
    }
  }
}

export function generateLevel(levelNumber: number): PuzzleLevel {
  const config = getConfigForLevel(levelNumber);
  const startBits = randomBits(config.bitCount);
  let current = [...startBits];

  for (let i = 0; i < config.steps; i++) {
    const op = config.ops[Math.floor(Math.random() * config.ops.length)];
    if (op === "SHIFT_LEFT" || op === "SHIFT_RIGHT") {
      current = applyOperation(current, op);
    } else if (op === "NOT") {
      let mask = randomMask(config.bitCount);
      // Ensure at least one bit is flipped
      if (!mask.some((b) => b === 1)) {
        mask = [...mask];
        mask[Math.floor(Math.random() * mask.length)] = 1;
      }
      current = applyOperation(current, op, mask);
    } else {
      const mask = randomMask(config.bitCount);
      current = applyOperation(current, op, mask);
    }
  }

  // Ensure start and target are different
  if (current.every((b, i) => b === startBits[i])) {
    const flipIdx = Math.floor(Math.random() * config.bitCount);
    current[flipIdx] = current[flipIdx] === 0 ? 1 : 0;
  }

  return {
    startBits,
    targetBits: current,
    bitCount: config.bitCount,
    availableOps: config.ops,
    optimalSteps: config.steps,
    levelNumber,
  };
}

export function checkSolution(current: number[], target: number[]): boolean {
  return current.length === target.length && current.every((b, i) => b === target[i]);
}

export function getNewOpsAtLevel(level: number): BitOperation[] {
  if (level === 1) return ["NOT"];
  if (level === 4) return ["AND", "OR"];
  if (level === 7) return ["XOR"];
  if (level === 10) return ["SHIFT_LEFT", "SHIFT_RIGHT"];
  return [];
}
