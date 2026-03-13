import { type Difficulty } from "@/lib/difficulty";

export type FlipFlopType = "SR" | "D" | "JK";

export interface ClockPulse {
  inputs: Record<string, number>;
}

export interface MemoryLockRound {
  flipFlopType: FlipFlopType;
  initialQ: number;
  pulses: ClockPulse[];
  correctQ: number;
  inputLabels: string[];
}

export function simulateSR(q: number, s: number, r: number): number {
  if (s === 1 && r === 1) return q; // invalid — hold
  if (s === 1) return 1;
  if (r === 1) return 0;
  return q;
}

export function simulateD(q: number, d: number): number {
  return d;
}

export function simulateJK(q: number, j: number, k: number): number {
  if (j === 1 && k === 1) return q === 0 ? 1 : 0; // toggle
  if (j === 1) return 1;
  if (k === 1) return 0;
  return q;
}

function simulateOnePulse(type: FlipFlopType, q: number, pulse: ClockPulse): number {
  if (type === "SR") return simulateSR(q, pulse.inputs["S"], pulse.inputs["R"]);
  if (type === "D") return simulateD(q, pulse.inputs["D"]);
  return simulateJK(q, pulse.inputs["J"], pulse.inputs["K"]);
}

export function simulateSequence(
  type: FlipFlopType,
  initialQ: number,
  pulses: ClockPulse[]
): number {
  let q = initialQ;
  for (const pulse of pulses) {
    q = simulateOnePulse(type, q, pulse);
  }
  return q;
}

function getInputLabels(type: FlipFlopType): string[] {
  if (type === "SR") return ["S", "R"];
  if (type === "D") return ["D"];
  return ["J", "K"];
}

function randomBit(): number {
  return Math.random() < 0.5 ? 0 : 1;
}

function randomPulse(type: FlipFlopType): ClockPulse {
  const inputs: Record<string, number> = {};
  if (type === "SR") {
    inputs["S"] = randomBit();
    inputs["R"] = randomBit();
  } else if (type === "D") {
    inputs["D"] = randomBit();
  } else {
    inputs["J"] = randomBit();
    inputs["K"] = randomBit();
  }
  return { inputs };
}

function getTypeForDifficulty(difficulty: Difficulty): FlipFlopType[] {
  if (difficulty === "easy") return ["SR"];
  if (difficulty === "medium") return ["D", "SR"];
  return ["JK", "D", "SR"];
}

function getPulseCount(score: number, difficulty: Difficulty): number {
  if (difficulty === "easy") return 1;
  if (difficulty === "medium") return score >= 5 ? 2 : 1;
  if (score >= 8) return 3;
  if (score >= 4) return 2;
  return 1;
}

export function generateRound(score: number, difficulty: Difficulty): MemoryLockRound {
  const types = getTypeForDifficulty(difficulty);
  const flipFlopType = types[Math.floor(Math.random() * types.length)];
  const initialQ = randomBit();
  const pulseCount = getPulseCount(score, difficulty);
  const pulses: ClockPulse[] = [];

  for (let i = 0; i < pulseCount; i++) {
    pulses.push(randomPulse(flipFlopType));
  }

  const correctQ = simulateSequence(flipFlopType, initialQ, pulses);

  return {
    flipFlopType,
    initialQ,
    pulses,
    correctQ,
    inputLabels: getInputLabels(flipFlopType),
  };
}
