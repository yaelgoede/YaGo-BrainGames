import { type Difficulty } from "@/lib/difficulty";

export type BitOperation = "AND" | "OR" | "XOR" | "NOT" | "SHL" | "SHR" | "ASHR";

export interface BitOpsRound {
  operandA: number[];
  operandB: number[]; // empty for NOT/shift
  operation: BitOperation;
  shiftAmount?: number;
  correctResult: number[];
  displayLabel: string;
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

function performOperation(a: number, b: number, op: BitOperation, shift?: number): number {
  switch (op) {
    case "AND":
      return (a & b) & 0xff;
    case "OR":
      return (a | b) & 0xff;
    case "XOR":
      return (a ^ b) & 0xff;
    case "NOT":
      return (~a) & 0xff;
    case "SHL":
      return (a << (shift ?? 1)) & 0xff;
    case "SHR":
      return (a >>> (shift ?? 1)) & 0xff;
    case "ASHR": {
      // Arithmetic right shift: treat as signed 8-bit
      const signed = a > 127 ? a - 256 : a;
      return (signed >> (shift ?? 1)) & 0xff;
    }
  }
}

function getOpsForDifficulty(difficulty: Difficulty): BitOperation[] {
  if (difficulty === "easy") return ["AND", "OR"];
  if (difficulty === "medium") return ["AND", "OR", "XOR", "NOT"];
  return ["AND", "OR", "XOR", "NOT", "SHL", "SHR", "ASHR"];
}

function isSingleOperand(op: BitOperation): boolean {
  return op === "NOT" || op === "SHL" || op === "SHR" || op === "ASHR";
}

function getDisplayLabel(op: BitOperation, shift?: number): string {
  switch (op) {
    case "AND": return "A AND B";
    case "OR": return "A OR B";
    case "XOR": return "A XOR B";
    case "NOT": return "NOT A";
    case "SHL": return `A << ${shift}`;
    case "SHR": return `A >>> ${shift}`;
    case "ASHR": return `A >> ${shift} (arithmetic)`;
  }
}

export function generateRound(difficulty: Difficulty): BitOpsRound {
  const ops = getOpsForDifficulty(difficulty);
  const operation = ops[Math.floor(Math.random() * ops.length)];

  const maxVal = difficulty === "easy" ? 15 : 255;
  const a = randInt(1, maxVal);
  const b = isSingleOperand(operation) ? 0 : randInt(1, maxVal);

  let shiftAmount: number | undefined;
  if (operation === "SHL" || operation === "SHR" || operation === "ASHR") {
    shiftAmount = randInt(1, 4);
  }

  const result = performOperation(a, b, operation, shiftAmount);

  return {
    operandA: numberToBits(a),
    operandB: numberToBits(b),
    operation,
    shiftAmount,
    correctResult: numberToBits(result),
    displayLabel: getDisplayLabel(operation, shiftAmount),
  };
}

export function checkAnswer(playerBits: number[], round: BitOpsRound): boolean {
  return playerBits.every((bit, i) => bit === round.correctResult[i]);
}

export { isSingleOperand };
