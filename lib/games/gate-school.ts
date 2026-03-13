export type GateType = "NOT" | "AND" | "OR" | "XOR" | "NAND" | "NOR";

export interface TruthTableEntry {
  a: number;
  b: number;
  output: number;
}

export interface GateRound {
  gate: GateType;
  inputA: number;
  inputB: number;
  correctOutput: number;
  truthTable: TruthTableEntry[];
}

const GATE_TRUTH_TABLES: Record<GateType, TruthTableEntry[]> = {
  NOT: [
    { a: 0, b: 0, output: 1 },
    { a: 1, b: 0, output: 0 },
  ],
  AND: [
    { a: 0, b: 0, output: 0 },
    { a: 0, b: 1, output: 0 },
    { a: 1, b: 0, output: 0 },
    { a: 1, b: 1, output: 1 },
  ],
  OR: [
    { a: 0, b: 0, output: 0 },
    { a: 0, b: 1, output: 1 },
    { a: 1, b: 0, output: 1 },
    { a: 1, b: 1, output: 1 },
  ],
  XOR: [
    { a: 0, b: 0, output: 0 },
    { a: 0, b: 1, output: 1 },
    { a: 1, b: 0, output: 1 },
    { a: 1, b: 1, output: 0 },
  ],
  NAND: [
    { a: 0, b: 0, output: 1 },
    { a: 0, b: 1, output: 1 },
    { a: 1, b: 0, output: 1 },
    { a: 1, b: 1, output: 0 },
  ],
  NOR: [
    { a: 0, b: 0, output: 1 },
    { a: 0, b: 1, output: 0 },
    { a: 1, b: 0, output: 0 },
    { a: 1, b: 1, output: 0 },
  ],
};

export function getAvailableGates(score: number, offset: number): GateType[] {
  const thresholds: [number, GateType[]][] = [
    [0, ["NOT", "AND"]],
    [3 - offset, ["OR"]],
    [6 - offset, ["XOR"]],
    [9 - offset, ["NAND", "NOR"]],
  ];

  const gates: GateType[] = [];
  for (const [threshold, newGates] of thresholds) {
    if (score >= Math.max(0, threshold)) {
      gates.push(...newGates);
    }
  }
  return gates;
}

export function generateGateRound(score: number, offset: number): GateRound {
  const available = getAvailableGates(score, offset);
  const gate = available[Math.floor(Math.random() * available.length)];
  const table = GATE_TRUTH_TABLES[gate];

  const inputA = Math.random() < 0.5 ? 0 : 1;
  const inputB = Math.random() < 0.5 ? 0 : 1;

  let correctOutput: number;
  if (gate === "NOT") {
    correctOutput = table.find((e) => e.a === inputA)!.output;
  } else {
    correctOutput = table.find((e) => e.a === inputA && e.b === inputB)!.output;
  }

  return { gate, inputA, inputB, correctOutput, truthTable: table };
}
