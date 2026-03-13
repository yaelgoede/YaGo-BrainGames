import { type Difficulty } from "@/lib/difficulty";

export type GateType = "AND" | "OR" | "XOR" | "NOT" | "NAND" | "PASS";

export interface GateSlot {
  type: GateType;
  input1: number; // -1=A, -2=B, -3=Cin, 0..N=gate slot index
  input2: number;
}

export interface CircuitLevel {
  levelNumber: number;
  title: string;
  description: string;
  inputLabels: string[];
  outputLabel: string;
  expectedTable: { inputs: number[]; output: number }[];
  slotCount: number;
  availableGates: GateType[];
  outputSlotIndex: number;
}

export function evaluateGate(type: GateType, a: number, b: number): number {
  switch (type) {
    case "AND": return a & b;
    case "OR": return a | b;
    case "XOR": return a ^ b;
    case "NOT": return a === 0 ? 1 : 0;
    case "NAND": return (a & b) === 1 ? 0 : 1;
    case "PASS": return a;
  }
}

export function evaluateCircuit(
  slots: GateSlot[],
  inputs: number[]
): (number | null)[] {
  const results: (number | null)[] = new Array(slots.length).fill(null);

  function resolve(source: number): number | null {
    if (source < 0) {
      const idx = -(source + 1); // -1→0, -2→1, -3→2
      return inputs[idx] ?? null;
    }
    if (results[source] !== null) return results[source];
    return computeSlot(source);
  }

  function computeSlot(idx: number): number | null {
    const slot = slots[idx];
    const v1 = resolve(slot.input1);
    if (v1 === null) return null;
    const v2 = slot.type === "NOT" || slot.type === "PASS" ? 0 : resolve(slot.input2);
    if (v2 === null && slot.type !== "NOT" && slot.type !== "PASS") return null;
    const result = evaluateGate(slot.type, v1, v2 ?? 0);
    results[idx] = result;
    return result;
  }

  for (let i = 0; i < slots.length; i++) {
    if (results[i] === null) computeSlot(i);
  }
  return results;
}

export function checkAllCombinations(
  slots: GateSlot[],
  level: CircuitLevel
): { correct: boolean; results: { inputs: number[]; expected: number; got: number | null }[] } {
  const results = level.expectedTable.map((row) => {
    const gateResults = evaluateCircuit(slots, row.inputs);
    const got = gateResults[level.outputSlotIndex];
    return { inputs: row.inputs, expected: row.output, got };
  });

  const correct = results.every((r) => r.got === r.expected);
  return { correct, results };
}

interface LevelDef {
  title: string;
  description: string;
  inputLabels: string[];
  outputLabel: string;
  table: { inputs: number[]; output: number }[];
  slotCount: number;
  gates: GateType[];
  outputSlot: number;
}

const ALL_LEVELS: LevelDef[] = [
  {
    title: "Half Adder (Sum)",
    description: "Build a circuit where output = A XOR B (the sum bit of a half adder).",
    inputLabels: ["A", "B"],
    outputLabel: "Sum",
    table: [
      { inputs: [0, 0], output: 0 },
      { inputs: [0, 1], output: 1 },
      { inputs: [1, 0], output: 1 },
      { inputs: [1, 1], output: 0 },
    ],
    slotCount: 3,
    gates: ["AND", "OR", "XOR", "NOT"],
    outputSlot: 0,
  },
  {
    title: "Half Adder (Carry)",
    description: "Build a circuit where output = A AND B (the carry bit).",
    inputLabels: ["A", "B"],
    outputLabel: "Carry",
    table: [
      { inputs: [0, 0], output: 0 },
      { inputs: [0, 1], output: 0 },
      { inputs: [1, 0], output: 0 },
      { inputs: [1, 1], output: 1 },
    ],
    slotCount: 3,
    gates: ["AND", "OR", "XOR", "NOT"],
    outputSlot: 0,
  },
  {
    title: "2:1 Multiplexer",
    description: "Output A when Sel=0, output B when Sel=1. Inputs: A, B, Sel.",
    inputLabels: ["A", "B", "Sel"],
    outputLabel: "Out",
    table: [
      { inputs: [0, 0, 0], output: 0 },
      { inputs: [0, 0, 1], output: 0 },
      { inputs: [0, 1, 0], output: 0 },
      { inputs: [0, 1, 1], output: 1 },
      { inputs: [1, 0, 0], output: 1 },
      { inputs: [1, 0, 1], output: 0 },
      { inputs: [1, 1, 0], output: 1 },
      { inputs: [1, 1, 1], output: 1 },
    ],
    slotCount: 5,
    gates: ["AND", "OR", "XOR", "NOT", "NAND"],
    outputSlot: 4,
  },
  {
    title: "A > B Comparator",
    description: "Output 1 when A=1 and B=0, otherwise 0.",
    inputLabels: ["A", "B"],
    outputLabel: "A>B",
    table: [
      { inputs: [0, 0], output: 0 },
      { inputs: [0, 1], output: 0 },
      { inputs: [1, 0], output: 1 },
      { inputs: [1, 1], output: 0 },
    ],
    slotCount: 3,
    gates: ["AND", "OR", "XOR", "NOT", "NAND"],
    outputSlot: 1,
  },
  {
    title: "Full Adder (Sum)",
    description: "Sum = A XOR B XOR Cin. Build it with the available gates.",
    inputLabels: ["A", "B", "Cin"],
    outputLabel: "Sum",
    table: [
      { inputs: [0, 0, 0], output: 0 },
      { inputs: [0, 0, 1], output: 1 },
      { inputs: [0, 1, 0], output: 1 },
      { inputs: [0, 1, 1], output: 0 },
      { inputs: [1, 0, 0], output: 1 },
      { inputs: [1, 0, 1], output: 0 },
      { inputs: [1, 1, 0], output: 0 },
      { inputs: [1, 1, 1], output: 1 },
    ],
    slotCount: 5,
    gates: ["AND", "OR", "XOR", "NOT", "NAND"],
    outputSlot: 1,
  },
];

function getLevelsForDifficulty(difficulty: Difficulty): LevelDef[] {
  if (difficulty === "easy") return ALL_LEVELS.slice(0, 2);
  if (difficulty === "medium") return ALL_LEVELS.slice(0, 4);
  return ALL_LEVELS;
}

export function getLevelCount(difficulty: Difficulty): number {
  return getLevelsForDifficulty(difficulty).length;
}

export function generateLevel(levelNumber: number, difficulty: Difficulty): CircuitLevel {
  const levels = getLevelsForDifficulty(difficulty);
  const idx = Math.min(levelNumber, levels.length - 1);
  const def = levels[idx];

  return {
    levelNumber: idx,
    title: def.title,
    description: def.description,
    inputLabels: def.inputLabels,
    outputLabel: def.outputLabel,
    expectedTable: def.table,
    slotCount: def.slotCount,
    availableGates: def.gates,
    outputSlotIndex: def.outputSlot,
  };
}

export function createEmptySlots(count: number): GateSlot[] {
  return Array.from({ length: count }, () => ({
    type: "AND" as GateType,
    input1: -1,
    input2: -2,
  }));
}

export function getInputOptions(
  slotIndex: number,
  level: CircuitLevel
): { value: number; label: string }[] {
  const options: { value: number; label: string }[] = [];
  level.inputLabels.forEach((label, i) => {
    options.push({ value: -(i + 1), label });
  });
  for (let i = 0; i < level.slotCount; i++) {
    if (i !== slotIndex) {
      options.push({ value: i, label: `Gate ${i + 1}` });
    }
  }
  return options;
}
