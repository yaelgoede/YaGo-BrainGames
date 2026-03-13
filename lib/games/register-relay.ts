import { type Difficulty } from "@/lib/difficulty";

export type RegisterName = "A" | "B" | "ACC" | "PC" | "MAR" | "MDR";

export type RegisterState = Record<RegisterName, number>;
export type MemoryState = Record<number, number>;

export interface RelayLevel {
  levelNumber: number;
  title: string;
  goal: string;
  initialRegisters: RegisterState;
  initialMemory: MemoryState;
  optimalSteps: number;
  availableRegisters: RegisterName[];
  checkGoal: (regs: RegisterState, mem: MemoryState) => boolean;
}

const DEFAULT_REGS: RegisterState = { A: 0, B: 0, ACC: 0, PC: 0, MAR: 0, MDR: 0 };

interface LevelDef {
  title: string;
  goal: string;
  regs: Partial<RegisterState>;
  mem: MemoryState;
  optimal: number;
  registers: RegisterName[];
  check: (regs: RegisterState, mem: MemoryState) => boolean;
}

const EASY_LEVELS: LevelDef[] = [
  {
    title: "Simple Swap",
    goal: "Move the value from A to B.",
    regs: { A: 42 },
    mem: {},
    optimal: 1,
    registers: ["A", "B"],
    check: (r) => r.B === 42,
  },
  {
    title: "Copy Value",
    goal: "Copy A into both B and ACC. (A=7)",
    regs: { A: 7 },
    mem: {},
    optimal: 2,
    registers: ["A", "B", "ACC"],
    check: (r) => r.B === 7 && r.ACC === 7,
  },
  {
    title: "Sum Two",
    goal: "Put A + B into ACC. (A=3, B=5)",
    regs: { A: 3, B: 5 },
    mem: {},
    optimal: 2,
    registers: ["A", "B", "ACC"],
    check: (r) => r.ACC === 8,
  },
];

const MEDIUM_LEVELS: LevelDef[] = [
  {
    title: "Load and Add",
    goal: "Load value from A into ACC, add B. (A=10, B=20)",
    regs: { A: 10, B: 20 },
    mem: {},
    optimal: 2,
    registers: ["A", "B", "ACC", "PC"],
    check: (r) => r.ACC === 30,
  },
  {
    title: "Swap Registers",
    goal: "Swap A and B using ACC as temp. (A=15, B=25)",
    regs: { A: 15, B: 25 },
    mem: {},
    optimal: 3,
    registers: ["A", "B", "ACC", "PC"],
    check: (r) => r.A === 25 && r.B === 15,
  },
  {
    title: "Count Up",
    goal: "Set PC to 5 by incrementing from 0. (Use ACC as helper, add A=1 five times)",
    regs: { A: 1 },
    mem: {},
    optimal: 5,
    registers: ["A", "B", "ACC", "PC"],
    check: (r) => r.PC === 5,
  },
];

const HARD_LEVELS: LevelDef[] = [
  {
    title: "Memory Read",
    goal: "Read memory address 3 into ACC. (MEM[3]=99)",
    regs: {},
    mem: { 3: 99 },
    optimal: 3,
    registers: ["A", "B", "ACC", "PC", "MAR", "MDR"],
    check: (r) => r.ACC === 99,
  },
  {
    title: "Memory Write",
    goal: "Store ACC value (42) into memory address 7.",
    regs: { ACC: 42 },
    mem: {},
    optimal: 3,
    registers: ["A", "B", "ACC", "PC", "MAR", "MDR"],
    check: (_r, m) => m[7] === 42,
  },
  {
    title: "Load, Compute, Store",
    goal: "Read MEM[2] (=10) into ACC, add A (=5), store result in MEM[4].",
    regs: { A: 5 },
    mem: { 2: 10 },
    optimal: 6,
    registers: ["A", "B", "ACC", "PC", "MAR", "MDR"],
    check: (_r, m) => m[4] === 15,
  },
];

function getLevels(difficulty: Difficulty): LevelDef[] {
  if (difficulty === "easy") return EASY_LEVELS;
  if (difficulty === "medium") return MEDIUM_LEVELS;
  return HARD_LEVELS;
}

export function getLevelCount(difficulty: Difficulty): number {
  return getLevels(difficulty).length;
}

export function generateLevel(levelNumber: number, difficulty: Difficulty): RelayLevel {
  const levels = getLevels(difficulty);
  const idx = Math.min(levelNumber, levels.length - 1);
  const def = levels[idx];
  const initialRegisters = { ...DEFAULT_REGS, ...def.regs };

  return {
    levelNumber: idx,
    title: def.title,
    goal: def.goal,
    initialRegisters,
    initialMemory: { ...def.mem },
    optimalSteps: def.optimal,
    availableRegisters: def.registers,
    checkGoal: def.check,
  };
}

export type TransferSource = RegisterName | `MEM[${number}]`;
export type TransferDest = RegisterName | `MEM[${number}]`;

export function executeTransfer(
  source: TransferSource,
  dest: TransferDest,
  regs: RegisterState,
  mem: MemoryState,
  operation?: "add"
): { regs: RegisterState; mem: MemoryState } {
  const newRegs = { ...regs };
  const newMem = { ...mem };

  // Get source value
  let value: number;
  if (source.startsWith("MEM[")) {
    const addr = parseInt(source.slice(4, -1), 10);
    value = newMem[addr] ?? 0;
  } else {
    value = newRegs[source as RegisterName];
  }

  // Set dest value
  if (dest.startsWith("MEM[")) {
    const addr = parseInt(dest.slice(4, -1), 10);
    newMem[addr] = operation === "add" ? (newMem[addr] ?? 0) + value : value;
  } else {
    const destReg = dest as RegisterName;
    newRegs[destReg] = operation === "add" ? newRegs[destReg] + value : value;
  }

  return { regs: newRegs, mem: newMem };
}

export function isMemorySource(name: string): name is `MEM[${number}]` {
  return name.startsWith("MEM[");
}
