import { shuffle } from "@/lib/utils";

export interface NumberPuzzle {
  sequence: number[];
  answer: number;
  choices: number[];
}

export function generatePuzzle(difficulty: number): NumberPuzzle {
  const type = Math.floor(Math.random() * 3);
  let sequence: number[];
  let answer: number;

  if (type === 0) {
    // Arithmetic: constant difference
    const start = Math.floor(Math.random() * 10) + 1;
    const diff = Math.floor(Math.random() * (3 + difficulty)) + 1;
    sequence = Array.from({ length: 4 }, (_, i) => start + diff * i);
    answer = start + diff * 4;
  } else if (type === 1) {
    // Geometric: multiply by factor
    const start = Math.floor(Math.random() * 3) + 2;
    const factor = Math.floor(Math.random() * 2) + 2;
    sequence = Array.from({ length: 4 }, (_, i) => start * Math.pow(factor, i));
    answer = start * Math.pow(factor, 4);
  } else {
    // Alternating add two different values
    const start = Math.floor(Math.random() * 5) + 1;
    const addA = Math.floor(Math.random() * 5) + 1;
    const addB = Math.floor(Math.random() * 5) + 1;
    sequence = [start];
    for (let i = 1; i < 4; i++) {
      sequence.push(sequence[i - 1] + (i % 2 === 1 ? addA : addB));
    }
    answer = sequence[3] + (4 % 2 === 1 ? addA : addB);
  }

  const choices = generateChoices(answer);
  return { sequence, answer, choices };
}

function generateChoices(correct: number): number[] {
  const set = new Set<number>([correct]);
  while (set.size < 4) {
    const offset = Math.floor(Math.random() * 5) + 1;
    set.add(correct + (Math.random() > 0.5 ? offset : -offset));
  }
  return shuffle([...set]);
}
