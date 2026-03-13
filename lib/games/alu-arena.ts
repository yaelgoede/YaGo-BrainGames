import { type Difficulty } from "@/lib/difficulty";

export type ALUOperation = "AND" | "OR" | "XOR" | "NOT_A" | "ADD" | "SUB";

export interface ALUFlags {
  zero: number;
  carry: number;
  negative: number;
}

export interface ALURound {
  a: number[];
  b: number[];
  operation: ALUOperation;
  correctResult: number[];
  correctFlags: ALUFlags;
  showFlags: boolean;
}

export function bitsToInt(bits: number[]): number {
  let n = 0;
  for (let i = 0; i < bits.length; i++) {
    n = (n << 1) | bits[i];
  }
  return n;
}

export function intTo4Bits(n: number): number[] {
  return [
    (n >> 3) & 1,
    (n >> 2) & 1,
    (n >> 1) & 1,
    n & 1,
  ];
}

function random4Bits(): number[] {
  const n = Math.floor(Math.random() * 16);
  return intTo4Bits(n);
}

export function performALU(
  a: number[],
  b: number[],
  op: ALUOperation
): { result: number[]; flags: ALUFlags } {
  const aVal = bitsToInt(a);
  const bVal = bitsToInt(b);
  let raw: number;

  switch (op) {
    case "AND":
      raw = aVal & bVal;
      break;
    case "OR":
      raw = aVal | bVal;
      break;
    case "XOR":
      raw = aVal ^ bVal;
      break;
    case "NOT_A":
      raw = (~aVal) & 0xf;
      break;
    case "ADD":
      raw = aVal + bVal;
      break;
    case "SUB":
      raw = aVal - bVal;
      break;
  }

  const carry = op === "ADD" && raw > 15 ? 1 : op === "SUB" && raw < 0 ? 1 : 0;
  const truncated = ((raw % 16) + 16) % 16; // handle negative wrap
  const result = intTo4Bits(truncated);
  const zero = truncated === 0 ? 1 : 0;
  const negative = op === "SUB" && raw < 0 ? 1 : 0;

  return { result, flags: { zero, carry, negative } };
}

const OP_LABELS: Record<ALUOperation, string> = {
  AND: "A AND B",
  OR: "A OR B",
  XOR: "A XOR B",
  NOT_A: "NOT A",
  ADD: "A + B",
  SUB: "A - B",
};

export function getOpLabel(op: ALUOperation): string {
  return OP_LABELS[op];
}

function getOpsForDifficulty(difficulty: Difficulty): ALUOperation[] {
  if (difficulty === "easy") return ["AND", "OR"];
  if (difficulty === "medium") return ["AND", "OR", "ADD", "SUB"];
  return ["AND", "OR", "XOR", "NOT_A", "ADD", "SUB"];
}

export function generateRound(score: number, difficulty: Difficulty): ALURound {
  const ops = getOpsForDifficulty(difficulty);
  const operation = ops[Math.floor(Math.random() * ops.length)];
  const a = random4Bits();
  const b = operation === "NOT_A" ? [0, 0, 0, 0] : random4Bits();
  const { result, flags } = performALU(a, b, operation);
  const showFlags = difficulty !== "easy";

  return { a, b, operation, correctResult: result, correctFlags: flags, showFlags };
}

export function checkAnswer(
  playerResult: number[],
  playerFlags: ALUFlags | null,
  round: ALURound
): { resultCorrect: boolean; flagsCorrect: boolean } {
  const resultCorrect = playerResult.every((bit, i) => bit === round.correctResult[i]);

  if (!round.showFlags || !playerFlags) {
    return { resultCorrect, flagsCorrect: true };
  }

  const flagsCorrect =
    playerFlags.zero === round.correctFlags.zero &&
    playerFlags.carry === round.correctFlags.carry &&
    playerFlags.negative === round.correctFlags.negative;

  return { resultCorrect, flagsCorrect };
}
