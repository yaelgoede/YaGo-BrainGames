import { type Difficulty } from "@/lib/difficulty";

export type AsciiMode = "decode" | "encode" | "word";

export interface AsciiRound {
  mode: AsciiMode;
  charCode: number;
  character: string;
  bits: number[];
  // For word mode
  word?: string;
  wordIndex?: number;
  wordLength?: number;
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
  for (let i = 0; i < 8; i++) {
    n = (n << 1) | bits[i];
  }
  return n;
}

const UPPERCASE = Array.from({ length: 26 }, (_, i) => 65 + i); // A-Z
const LOWERCASE = Array.from({ length: 26 }, (_, i) => 97 + i); // a-z
const DIGITS = Array.from({ length: 10 }, (_, i) => 48 + i); // 0-9

const EASY_WORDS = ["HI", "OK", "GO", "UP", "NO", "YES", "RUN", "BIT"];
const MEDIUM_WORDS = ["Hello", "World", "Code", "Byte", "Data"];
const HARD_WORDS = ["ASCII", "Binary", "Debug", "Stack", "Query", "pixel"];

function getCharPool(difficulty: Difficulty): number[] {
  if (difficulty === "easy") return UPPERCASE;
  if (difficulty === "medium") return [...UPPERCASE, ...LOWERCASE, ...DIGITS];
  // Hard: printable ASCII 33-126
  return Array.from({ length: 94 }, (_, i) => 33 + i);
}

function getModes(difficulty: Difficulty): AsciiMode[] {
  if (difficulty === "easy") return ["decode"];
  if (difficulty === "medium") return ["decode", "encode"];
  return ["decode", "encode", "word"];
}

function getWords(difficulty: Difficulty): string[] {
  if (difficulty === "easy") return EASY_WORDS;
  if (difficulty === "medium") return MEDIUM_WORDS;
  return HARD_WORDS;
}

export function generateRound(
  difficulty: Difficulty,
  previousCharCode?: number,
  wordState?: { word: string; index: number }
): AsciiRound {
  // Continue word if in progress
  if (wordState && wordState.index < wordState.word.length) {
    const ch = wordState.word[wordState.index];
    const code = ch.charCodeAt(0);
    return {
      mode: "word",
      charCode: code,
      character: ch,
      bits: numberToBits(code),
      word: wordState.word,
      wordIndex: wordState.index,
      wordLength: wordState.word.length,
    };
  }

  const modes = getModes(difficulty);
  const mode = modes[Math.floor(Math.random() * modes.length)];

  if (mode === "word") {
    const words = getWords(difficulty);
    const word = words[Math.floor(Math.random() * words.length)];
    const ch = word[0];
    const code = ch.charCodeAt(0);
    return {
      mode: "word",
      charCode: code,
      character: ch,
      bits: numberToBits(code),
      word,
      wordIndex: 0,
      wordLength: word.length,
    };
  }

  const pool = getCharPool(difficulty);
  let charCode: number;
  do {
    charCode = pool[Math.floor(Math.random() * pool.length)];
  } while (charCode === previousCharCode);

  const character = String.fromCharCode(charCode);
  return {
    mode,
    charCode,
    character,
    bits: numberToBits(charCode),
  };
}

export function checkBits(playerBits: number[], round: AsciiRound): boolean {
  return playerBits.every((bit, i) => bit === round.bits[i]);
}

export function checkCharacter(answer: string, round: AsciiRound): boolean {
  return answer === round.character;
}
