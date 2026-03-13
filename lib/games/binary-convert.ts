import { type Difficulty } from "@/lib/difficulty";

export type ConvertMode = "bin-to-dec" | "dec-to-bin" | "bin-to-hex" | "hex-to-bin";

export interface ConvertRound {
  mode: ConvertMode;
  value: number;
  displayValue: string;
  correctBits: number[];
  correctAnswer: string; // decimal or hex string for typed answers
  bitWidth: number;
}

function randInt(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function numberToBits(n: number, width: number): number[] {
  const bits: number[] = [];
  for (let i = width - 1; i >= 0; i--) {
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

function getModesForDifficulty(difficulty: Difficulty): ConvertMode[] {
  if (difficulty === "easy") return ["bin-to-dec"];
  if (difficulty === "medium") return ["bin-to-dec", "dec-to-bin"];
  return ["bin-to-dec", "dec-to-bin", "bin-to-hex", "hex-to-bin"];
}

function getBitWidth(difficulty: Difficulty): number {
  if (difficulty === "easy") return 4;
  return 8;
}

export function generateRound(difficulty: Difficulty, previousValue?: number): ConvertRound {
  const modes = getModesForDifficulty(difficulty);
  const mode = modes[Math.floor(Math.random() * modes.length)];
  const bitWidth = getBitWidth(difficulty);
  const maxVal = Math.pow(2, bitWidth) - 1;

  let value: number;
  do {
    value = randInt(1, maxVal);
  } while (value === previousValue);

  const correctBits = numberToBits(value, bitWidth);
  const binaryStr = value.toString(2).padStart(bitWidth, "0");
  const hexStr = value.toString(16).toUpperCase();

  let displayValue: string;
  let correctAnswer: string;

  switch (mode) {
    case "bin-to-dec":
      displayValue = binaryStr;
      correctAnswer = String(value);
      break;
    case "dec-to-bin":
      displayValue = String(value);
      correctAnswer = binaryStr;
      break;
    case "bin-to-hex":
      displayValue = binaryStr;
      correctAnswer = hexStr;
      break;
    case "hex-to-bin":
      displayValue = `0x${hexStr}`;
      correctAnswer = binaryStr;
      break;
  }

  return { mode, value, displayValue, correctBits, correctAnswer, bitWidth };
}

export function checkBits(playerBits: number[], round: ConvertRound): boolean {
  return playerBits.every((bit, i) => bit === round.correctBits[i]);
}

export function checkTypedAnswer(answer: string, round: ConvertRound): boolean {
  const cleaned = answer.trim().toUpperCase().replace(/^0X/, "");
  const expected = round.correctAnswer.toUpperCase().replace(/^0X/, "");
  // For binary answers, strip leading zeros
  if (round.mode === "dec-to-bin" || round.mode === "hex-to-bin") {
    return cleaned.replace(/^0+/, "") === expected.replace(/^0+/, "") || cleaned === expected;
  }
  return cleaned === expected;
}

export const MODE_LABELS: Record<ConvertMode, string> = {
  "bin-to-dec": "Binary → Decimal",
  "dec-to-bin": "Decimal → Binary",
  "bin-to-hex": "Binary → Hex",
  "hex-to-bin": "Hex → Binary",
};

export function isToggleMode(mode: ConvertMode): boolean {
  return mode === "dec-to-bin" || mode === "hex-to-bin";
}
