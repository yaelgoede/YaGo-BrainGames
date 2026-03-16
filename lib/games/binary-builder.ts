import { type Difficulty } from "@/lib/difficulty";
import { randInt } from "@/lib/utils";
import { numberToBits } from "@/lib/bit-utils";

export type ArithOp = "add" | "sub";

export interface ColumnAnswer {
  sumBit: number;
  carryOut: number;
}

export interface ArithRound {
  operandA: number[];
  operandB: number[];
  operation: ArithOp;
  columns: ColumnAnswer[]; // index 0 = LSB (rightmost)
  resultBits: number[]; // MSB first for display
  width: number;
}

export function computeColumns(aBits: number[], bBits: number[], op: ArithOp): ColumnAnswer[] {
  const width = aBits.length;
  const columns: ColumnAnswer[] = [];
  let carry = 0;

  for (let i = width - 1; i >= 0; i--) {
    const a = aBits[i];
    const b = bBits[i];

    if (op === "add") {
      const sum = a + b + carry;
      columns.push({ sumBit: sum % 2, carryOut: Math.floor(sum / 2) });
      carry = Math.floor(sum / 2);
    } else {
      // Subtraction with borrow
      const diff = a - b - carry;
      if (diff < 0) {
        columns.push({ sumBit: diff + 2, carryOut: 1 });
        carry = 1;
      } else {
        columns.push({ sumBit: diff, carryOut: 0 });
        carry = 0;
      }
    }
  }

  return columns; // index 0 = LSB
}

function getWidth(difficulty: Difficulty): number {
  if (difficulty === "easy") return 4;
  if (difficulty === "medium") return 6;
  return 8;
}

function getOps(difficulty: Difficulty): ArithOp[] {
  if (difficulty === "easy") return ["add"];
  return ["add", "sub"];
}

function generateTrickyInputs(width: number, op: ArithOp): { a: number; b: number } {
  const max = Math.pow(2, width) - 1;
  if (op === "add") {
    // Create long carry chains
    const patterns = [
      // e.g., 0111...1 + 1 = 1000...0
      { a: max >> 1, b: 1 },
      // e.g., random with many 1s
      { a: randInt(max >> 1, max), b: randInt(max >> 2, max >> 1) },
    ];
    return patterns[Math.floor(Math.random() * patterns.length)];
  }
  // Subtraction: create borrow chains
  const a = randInt(max >> 2, max);
  const b = randInt(1, a); // ensure a >= b for non-negative result
  return { a, b };
}

export function generateRound(difficulty: Difficulty): ArithRound {
  const width = getWidth(difficulty);
  const ops = getOps(difficulty);
  const operation = ops[Math.floor(Math.random() * ops.length)];
  const max = Math.pow(2, width) - 1;

  let a: number, b: number;

  if (difficulty === "hard") {
    const inputs = generateTrickyInputs(width, operation);
    a = inputs.a;
    b = inputs.b;
  } else {
    a = randInt(1, max);
    b = randInt(1, operation === "sub" ? a : max); // ensure a >= b for subtraction
  }

  // For subtraction, ensure a >= b
  if (operation === "sub" && a < b) {
    [a, b] = [b, a];
  }

  const operandA = numberToBits(a, width);
  const operandB = numberToBits(b, width);
  const columns = computeColumns(operandA, operandB, operation);

  // Build result bits (MSB first for display)
  const resultBits = columns.map((c) => c.sumBit).reverse();

  return { operandA, operandB, operation, columns, resultBits, width };
}

export function checkColumn(
  playerSum: number,
  playerCarry: number,
  round: ArithRound,
  columnIndex: number
): boolean {
  const col = round.columns[columnIndex];
  return playerSum === col.sumBit && playerCarry === col.carryOut;
}
