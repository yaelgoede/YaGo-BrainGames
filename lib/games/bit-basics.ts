import { type Difficulty } from "@/lib/difficulty";
import { randInt, pickRandom } from "@/lib/utils";

export type QuestionType =
  | "bit-value"
  | "bits-in-bytes"
  | "bytes-in-bits"
  | "max-value"
  | "power-of-2";

export interface BitBasicsRound {
  question: string;
  correctAnswer: number;
  questionType: QuestionType;
  highlightBit?: number; // for power-of-2 visual
}

const EASY_GENERATORS: (() => BitBasicsRound)[] = [
  // What is the decimal value of bit position N?
  () => {
    const bit = randInt(0, 7);
    return {
      question: `What is the decimal value of bit position ${bit}?`,
      correctAnswer: Math.pow(2, bit),
      questionType: "bit-value",
    };
  },
  // How many bits in N bytes?
  () => {
    const bytes = randInt(1, 4);
    return {
      question: `How many bits are in ${bytes} byte${bytes > 1 ? "s" : ""}?`,
      correctAnswer: bytes * 8,
      questionType: "bits-in-bytes",
    };
  },
  // What power of 2 is this bit?
  () => {
    const bit = randInt(0, 7);
    return {
      question: `Bit ${bit} is highlighted. What decimal value does it represent?`,
      correctAnswer: Math.pow(2, bit),
      questionType: "power-of-2",
      highlightBit: bit,
    };
  },
];

const MEDIUM_GENERATORS: (() => BitBasicsRound)[] = [
  ...EASY_GENERATORS,
  // What is the largest value in N bits?
  () => {
    const bits = randInt(2, 8);
    return {
      question: `What is the largest unsigned number you can store in ${bits} bits?`,
      correctAnswer: Math.pow(2, bits) - 1,
      questionType: "max-value",
    };
  },
  // How many bytes in N bits?
  () => {
    const bytes = randInt(1, 8);
    const bits = bytes * 8;
    return {
      question: `How many bytes is ${bits} bits?`,
      correctAnswer: bytes,
      questionType: "bytes-in-bits",
    };
  },
  // Nibble questions
  () => {
    return {
      question: "How many bits are in a nibble?",
      correctAnswer: 4,
      questionType: "bits-in-bytes",
    };
  },
];

const HARD_GENERATORS: (() => BitBasicsRound)[] = [
  ...MEDIUM_GENERATORS,
  // Larger bit widths
  () => {
    const bits = pickRandom([16, 32]);
    return {
      question: `How many bytes is a ${bits}-bit value?`,
      correctAnswer: bits / 8,
      questionType: "bytes-in-bits",
    };
  },
  // Max value for larger widths
  () => {
    const bits = pickRandom([10, 12, 16]);
    return {
      question: `What is the max unsigned value in ${bits} bits?`,
      correctAnswer: Math.pow(2, bits) - 1,
      questionType: "max-value",
    };
  },
  // Signed range max
  () => {
    const bits = pickRandom([4, 8]);
    return {
      question: `In ${bits}-bit signed (two's complement), what is the maximum positive value?`,
      correctAnswer: Math.pow(2, bits - 1) - 1,
      questionType: "max-value",
    };
  },
  // Signed range min (absolute)
  () => {
    const bits = pickRandom([4, 8]);
    const min = -Math.pow(2, bits - 1);
    return {
      question: `In ${bits}-bit signed (two's complement), what is the minimum value? (use negative sign)`,
      correctAnswer: min,
      questionType: "max-value",
    };
  },
];

function getGenerators(difficulty: Difficulty) {
  if (difficulty === "easy") return EASY_GENERATORS;
  if (difficulty === "medium") return MEDIUM_GENERATORS;
  return HARD_GENERATORS;
}

export function generateRound(difficulty: Difficulty, previousAnswer?: number): BitBasicsRound {
  const generators = getGenerators(difficulty);
  let round: BitBasicsRound;
  let attempts = 0;
  do {
    round = pickRandom(generators)();
    attempts++;
  } while (round.correctAnswer === previousAnswer && attempts < 10);
  return round;
}

export function checkAnswer(playerAnswer: number, round: BitBasicsRound): boolean {
  return playerAnswer === round.correctAnswer;
}
