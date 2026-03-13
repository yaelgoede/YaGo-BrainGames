export type RoundMode = "binaryToDecimal" | "decimalToBinary";

export interface BinaryRound {
  mode: RoundMode;
  binary: string;
  decimal: number;
  bitCount: number;
  powers: number[];
}

export function getBitCount(score: number, offset: number): number {
  const adjusted = score + offset;
  if (adjusted < 4) return 4;
  if (adjusted < 8) return 5;
  if (adjusted < 12) return 6;
  if (adjusted < 16) return 7;
  return 8;
}

export function generateBinaryRound(score: number, offset: number, roundIndex: number): BinaryRound {
  const bitCount = getBitCount(score, offset);
  const min = Math.pow(2, bitCount - 1);
  const max = Math.pow(2, bitCount) - 1;
  const decimal = min + Math.floor(Math.random() * (max - min + 1));
  const binary = decimal.toString(2);

  const powers = binary.split("").map((bit, i) => {
    return bit === "1" ? Math.pow(2, bitCount - 1 - i) : 0;
  });

  const mode: RoundMode = roundIndex % 2 === 0 ? "binaryToDecimal" : "decimalToBinary";

  return { mode, binary, decimal, bitCount, powers };
}

export function checkAnswer(round: BinaryRound, answer: string): boolean {
  if (round.mode === "binaryToDecimal") {
    const parsed = parseInt(answer, 10);
    return !isNaN(parsed) && parsed === round.decimal;
  } else {
    const normalized = answer.replace(/^0+/, "") || "0";
    const expected = round.binary.replace(/^0+/, "") || "0";
    return normalized === expected;
  }
}
