import { type Difficulty } from "@/lib/difficulty";

export type MaskOp = "AND" | "OR" | "XOR";
export type TaskType = "set" | "clear" | "toggle" | "check";

export interface MaskRound {
  inputBits: number[];
  taskDescription: string;
  taskType: TaskType;
  targetBitIndices: number[];
  correctMask: number[];
  correctOp: MaskOp;
  correctResult: number[];
  requiresResultCheck: boolean;
}

function randInt(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function numberToBits(n: number): number[] {
  const bits: number[] = [];
  for (let i = 7; i >= 0; i--) {
    bits.push((n >> i) & 1);
  }
  return bits;
}

export function bitsToNumber(bits: number[]): number {
  let n = 0;
  for (let i = 0; i < bits.length; i++) {
    n = (n << 1) | bits[i];
  }
  return n;
}

export function applyMask(input: number[], mask: number[], op: MaskOp): number[] {
  const a = bitsToNumber(input);
  const m = bitsToNumber(mask);
  let result: number;
  switch (op) {
    case "AND":
      result = a & m;
      break;
    case "OR":
      result = a | m;
      break;
    case "XOR":
      result = a ^ m;
      break;
  }
  return numberToBits(result);
}

function getTaskTypes(difficulty: Difficulty): TaskType[] {
  if (difficulty === "easy") return ["set"];
  if (difficulty === "medium") return ["set", "clear", "toggle"];
  return ["set", "clear", "toggle", "check"];
}

function getTargetCount(difficulty: Difficulty): number {
  if (difficulty === "easy") return 1;
  if (difficulty === "medium") return randInt(1, 3);
  return randInt(1, 4);
}

// Pick random bit positions (as bit indices 0-7, where 0 = LSB = rightmost)
function pickTargetBits(count: number): number[] {
  const available = [0, 1, 2, 3, 4, 5, 6, 7];
  const targets: number[] = [];
  for (let i = 0; i < count && available.length > 0; i++) {
    const idx = Math.floor(Math.random() * available.length);
    targets.push(available[idx]);
    available.splice(idx, 1);
  }
  return targets.sort((a, b) => b - a); // descending for display
}

function bitLabel(indices: number[]): string {
  if (indices.length === 1) return `bit ${indices[0]}`;
  return `bits ${indices.join(", ")}`;
}

export function generateRound(difficulty: Difficulty): MaskRound {
  const taskTypes = getTaskTypes(difficulty);
  const taskType = taskTypes[Math.floor(Math.random() * taskTypes.length)];
  const targetCount = getTargetCount(difficulty);
  const targetBitIndices = pickTargetBits(targetCount);

  // Generate input value ensuring the task is meaningful
  let inputValue: number;
  if (taskType === "set") {
    // Target bits should NOT already be set
    do {
      inputValue = randInt(0, 255);
    } while (targetBitIndices.every((bit) => ((inputValue >> bit) & 1) === 1));
  } else if (taskType === "clear") {
    // Target bits should be set
    do {
      inputValue = randInt(0, 255);
    } while (targetBitIndices.every((bit) => ((inputValue >> bit) & 1) === 0));
  } else {
    inputValue = randInt(1, 255);
  }

  const inputBits = numberToBits(inputValue);

  // Build correct mask and operation
  let maskValue = 0;
  let correctOp: MaskOp;
  let taskDescription: string;

  switch (taskType) {
    case "set":
      correctOp = "OR";
      for (const bit of targetBitIndices) maskValue |= (1 << bit);
      taskDescription = `Set ${bitLabel(targetBitIndices)}`;
      break;
    case "clear":
      correctOp = "AND";
      maskValue = 0xff;
      for (const bit of targetBitIndices) maskValue &= ~(1 << bit);
      taskDescription = `Clear ${bitLabel(targetBitIndices)}`;
      break;
    case "toggle":
      correctOp = "XOR";
      for (const bit of targetBitIndices) maskValue |= (1 << bit);
      taskDescription = `Toggle ${bitLabel(targetBitIndices)}`;
      break;
    case "check":
      correctOp = "AND";
      for (const bit of targetBitIndices) maskValue |= (1 << bit);
      taskDescription = `Extract ${bitLabel(targetBitIndices)} (isolate with AND)`;
      break;
  }

  const correctMask = numberToBits(maskValue);
  const correctResult = applyMask(inputBits, correctMask, correctOp);

  return {
    inputBits,
    taskDescription,
    taskType,
    targetBitIndices,
    correctMask,
    correctOp,
    correctResult,
    requiresResultCheck: difficulty === "hard",
  };
}

export function checkAnswer(
  playerMask: number[],
  playerOp: MaskOp,
  playerResult: number[] | null,
  round: MaskRound
): { maskCorrect: boolean; opCorrect: boolean; resultCorrect: boolean } {
  const maskCorrect = playerMask.every((bit, i) => bit === round.correctMask[i]);
  const opCorrect = playerOp === round.correctOp;
  const resultCorrect = !round.requiresResultCheck || !playerResult
    ? true
    : playerResult.every((bit, i) => bit === round.correctResult[i]);

  return { maskCorrect, opCorrect, resultCorrect };
}
