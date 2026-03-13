import { type Difficulty } from "@/lib/difficulty";

export type ChallengeMode = "binary" | "decimal" | "ascii";

export interface BitFlipperChallenge {
  mode: ChallengeMode;
  targetBits: number[];
  displayValue: string;
  decimalValue: number;
}

export function getModeForDifficulty(difficulty: Difficulty): ChallengeMode {
  if (difficulty === "easy") return "binary";
  if (difficulty === "medium") return "decimal";
  return "ascii";
}

export function numberToBits(n: number): number[] {
  const bits: number[] = [];
  for (let i = 7; i >= 0; i--) {
    bits.push((n >> i) & 1);
  }
  return bits;
}

export function bitsToNumber(bits: number[]): number {
  let n = 0;
  for (let i = 0; i < 8; i++) {
    n = (n << 1) | bits[i];
  }
  return n;
}

export function checkMatch(playerBits: number[], targetBits: number[]): boolean {
  for (let i = 0; i < 8; i++) {
    if (playerBits[i] !== targetBits[i]) return false;
  }
  return true;
}

export function generateChallenge(mode: ChallengeMode, previousValue?: number): BitFlipperChallenge {
  let decimalValue: number;

  if (mode === "ascii") {
    // Printable ASCII: 33–126
    do {
      decimalValue = 33 + Math.floor(Math.random() * 94);
    } while (decimalValue === previousValue);
  } else {
    // 1–255 for binary and decimal modes
    do {
      decimalValue = 1 + Math.floor(Math.random() * 255);
    } while (decimalValue === previousValue);
  }

  const targetBits = numberToBits(decimalValue);

  let displayValue: string;
  if (mode === "binary") {
    displayValue = decimalValue.toString(2).padStart(8, "0");
  } else if (mode === "decimal") {
    displayValue = String(decimalValue);
  } else {
    displayValue = String.fromCharCode(decimalValue);
  }

  return { mode, targetBits, displayValue, decimalValue };
}
