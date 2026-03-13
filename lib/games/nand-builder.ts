import { type Difficulty } from "@/lib/difficulty";

export type NandGateInput = "A" | "B" | "NAND1" | "NAND2" | "NAND3" | "NAND4" | null;

export interface NandGate {
  input1: NandGateInput;
  input2: NandGateInput;
}

export type TargetGate = "NOT" | "AND" | "OR" | "XOR" | "HALF_ADDER_SUM" | "HALF_ADDER_CARRY";

export interface TruthRow {
  a: number;
  b: number;
  expected: number[];
}

export interface NandBuilderLevel {
  levelNumber: number;
  target: TargetGate;
  nandCount: number;
  description: string;
  hintText: string;
  expectedTable: TruthRow[];
  outputGateIndices: number[];
  optimalNands: number;
}

function nandOp(a: number, b: number): number {
  return (a & b) === 1 ? 0 : 1;
}

export function evaluateCircuit(
  gates: NandGate[],
  inputA: number,
  inputB: number
): (number | null)[] {
  const values: Record<string, number> = { A: inputA, B: inputB };
  const results: (number | null)[] = [];

  for (let i = 0; i < gates.length; i++) {
    const gate = gates[i];
    if (!gate.input1 || !gate.input2) {
      results.push(null);
      continue;
    }
    const v1 = values[gate.input1];
    const v2 = values[gate.input2];
    if (v1 === undefined || v2 === undefined) {
      results.push(null);
      continue;
    }
    const out = nandOp(v1, v2);
    values[`NAND${i + 1}`] = out;
    results.push(out);
  }

  return results;
}

function getTargetTable(target: TargetGate): TruthRow[] {
  const rows: [number, number][] = [[0, 0], [0, 1], [1, 0], [1, 1]];
  return rows.map(([a, b]) => {
    let expected: number[];
    switch (target) {
      case "NOT":
        expected = [a === 0 ? 1 : 0];
        break;
      case "AND":
        expected = [a & b];
        break;
      case "OR":
        expected = [a | b];
        break;
      case "XOR":
        expected = [a ^ b];
        break;
      case "HALF_ADDER_SUM":
        expected = [a ^ b];
        break;
      case "HALF_ADDER_CARRY":
        expected = [a & b];
        break;
    }
    return { a, b, expected };
  });
}

const TARGET_LABELS: Record<TargetGate, string> = {
  NOT: "NOT (inverter)",
  AND: "AND gate",
  OR: "OR gate",
  XOR: "XOR gate",
  HALF_ADDER_SUM: "Half-Adder Sum",
  HALF_ADDER_CARRY: "Half-Adder Carry",
};

export function getTargetLabel(target: TargetGate): string {
  return TARGET_LABELS[target];
}

interface LevelDef {
  target: TargetGate;
  nandCount: number;
  optimalNands: number;
  outputIndices: number[];
  hint: string;
  description: string;
}

const ALL_LEVELS: LevelDef[] = [
  {
    target: "NOT",
    nandCount: 1,
    optimalNands: 1,
    outputIndices: [0],
    hint: "Feed the same signal to both inputs of a NAND.",
    description: "Invert input A using NAND gates.",
  },
  {
    target: "AND",
    nandCount: 2,
    optimalNands: 2,
    outputIndices: [1],
    hint: "NAND then NOT. Use 2 NANDs.",
    description: "Build an AND gate: output 1 only when both A and B are 1.",
  },
  {
    target: "OR",
    nandCount: 3,
    optimalNands: 3,
    outputIndices: [2],
    hint: "NOT each input, then NAND the results.",
    description: "Build an OR gate: output 1 when A or B (or both) are 1.",
  },
  {
    target: "XOR",
    nandCount: 4,
    optimalNands: 4,
    outputIndices: [3],
    hint: "NAND(A,B), then NAND that with A and with B, then NAND those two.",
    description: "Build an XOR gate: output 1 when A and B differ.",
  },
  {
    target: "HALF_ADDER_SUM",
    nandCount: 4,
    optimalNands: 4,
    outputIndices: [3],
    hint: "The sum of a half-adder is just XOR. Build XOR from 4 NANDs.",
    description: "Build the SUM output of a half-adder (same as XOR).",
  },
  {
    target: "HALF_ADDER_CARRY",
    nandCount: 2,
    optimalNands: 2,
    outputIndices: [1],
    hint: "The carry of a half-adder is AND. NAND then NOT.",
    description: "Build the CARRY output of a half-adder (same as AND).",
  },
];

export function getLevelCount(difficulty: Difficulty): number {
  if (difficulty === "easy") return 3; // NOT, AND, OR
  if (difficulty === "medium") return 4; // + XOR
  return ALL_LEVELS.length; // + half-adder
}

export function generateLevel(levelNumber: number, difficulty: Difficulty): NandBuilderLevel {
  const maxLevel = getLevelCount(difficulty);
  const idx = Math.min(levelNumber, maxLevel - 1);
  const def = ALL_LEVELS[idx];

  return {
    levelNumber: idx,
    target: def.target,
    nandCount: def.nandCount,
    description: def.description,
    hintText: difficulty === "easy" ? def.hint : "",
    expectedTable: getTargetTable(def.target),
    outputGateIndices: def.outputIndices,
    optimalNands: def.optimalNands,
  };
}

export function checkCircuit(
  gates: NandGate[],
  level: NandBuilderLevel
): { correct: boolean; matchingRows: boolean[] } {
  const matchingRows: boolean[] = [];

  for (const row of level.expectedTable) {
    const results = evaluateCircuit(gates, row.a, row.b);
    const outputValues = level.outputGateIndices.map((i) => results[i]);
    const matches = outputValues.every((v, j) => v === row.expected[j]);
    matchingRows.push(matches);
  }

  return { correct: matchingRows.every(Boolean), matchingRows };
}

export function getStarRating(usedNands: number, optimalNands: number): number {
  if (usedNands <= optimalNands) return 3;
  if (usedNands <= optimalNands + 1) return 2;
  return 1;
}

export function createEmptyGates(count: number): NandGate[] {
  return Array.from({ length: count }, () => ({ input1: null, input2: null }));
}

export function getAvailableInputs(gateIndex: number): NandGateInput[] {
  const inputs: NandGateInput[] = ["A", "B"];
  for (let i = 0; i < gateIndex; i++) {
    inputs.push(`NAND${i + 1}` as NandGateInput);
  }
  return inputs;
}
