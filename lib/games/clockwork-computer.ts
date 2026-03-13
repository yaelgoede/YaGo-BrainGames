import { type Difficulty } from "@/lib/difficulty";

export interface CPUState {
  PC: number;
  IR: number;
  MAR: number;
  MDR: number;
  ACC: number;
  memory: number[];
}

export type MicroStep =
  | "PC_TO_MAR"
  | "READ_MEM"
  | "MDR_TO_IR"
  | "DECODE"
  | "INC_PC"
  | "LOAD_ADDR_TO_MAR"
  | "READ_OPERAND"
  | "MDR_TO_ACC"
  | "ADD_MDR_TO_ACC"
  | "SUB_MDR_FROM_ACC"
  | "ACC_TO_MDR"
  | "WRITE_MEM"
  | "ADDR_TO_PC"
  | "CHECK_ZERO"
  | "HALT";

export const MICRO_STEP_LABELS: Record<MicroStep, string> = {
  PC_TO_MAR: "Copy PC to MAR",
  READ_MEM: "Read memory[MAR] into MDR",
  MDR_TO_IR: "Copy MDR to IR (Instruction Register)",
  DECODE: "Decode instruction",
  INC_PC: "Increment PC",
  LOAD_ADDR_TO_MAR: "Load address field into MAR",
  READ_OPERAND: "Read memory[MAR] into MDR",
  MDR_TO_ACC: "Copy MDR to ACC",
  ADD_MDR_TO_ACC: "Add MDR to ACC",
  SUB_MDR_FROM_ACC: "Subtract MDR from ACC",
  ACC_TO_MDR: "Copy ACC to MDR",
  WRITE_MEM: "Write MDR to memory[MAR]",
  ADDR_TO_PC: "Set PC to address field",
  CHECK_ZERO: "Check if ACC is zero",
  HALT: "Halt execution",
};

export interface CycleStep {
  correctAction: MicroStep;
  options: MicroStep[];
  description: string;
  stateAfter: Partial<CPUState>;
}

export interface ClockworkLevel {
  levelNumber: number;
  title: string;
  description: string;
  initialCPU: CPUState;
  steps: CycleStep[];
}

function decodeInstruction(ir: number): { opcode: string; address: number } {
  const opcodeVal = (ir >> 5) & 0x7;
  const address = ir & 0x1f;
  const names = ["LOAD", "STORE", "ADD", "SUB", "JUMP", "JZ", "HALT"];
  return { opcode: names[opcodeVal] || "???", address };
}

function makeInstruction(opcode: number, address: number): number {
  return ((opcode & 0x7) << 5) | (address & 0x1f);
}

function shuffleOptions(correct: MicroStep, pool: MicroStep[]): MicroStep[] {
  const options = new Set<MicroStep>([correct]);
  const filtered = pool.filter((s) => s !== correct);
  while (options.size < Math.min(4, pool.length)) {
    const pick = filtered[Math.floor(Math.random() * filtered.length)];
    if (pick) options.add(pick);
  }
  const arr = Array.from(options);
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

const DISTRACTOR_POOL: MicroStep[] = [
  "PC_TO_MAR", "READ_MEM", "MDR_TO_IR", "DECODE", "INC_PC",
  "LOAD_ADDR_TO_MAR", "READ_OPERAND", "MDR_TO_ACC",
  "ADD_MDR_TO_ACC", "ACC_TO_MDR", "WRITE_MEM", "ADDR_TO_PC", "HALT",
];

function computeStepsForInstruction(
  cpu: CPUState
): { steps: CycleStep[]; finalCPU: CPUState } {
  const state = {
    PC: cpu.PC,
    IR: cpu.IR,
    MAR: cpu.MAR,
    MDR: cpu.MDR,
    ACC: cpu.ACC,
    memory: [...cpu.memory],
  };

  const steps: CycleStep[] = [];

  // Fetch: PC → MAR
  state.MAR = state.PC;
  steps.push({
    correctAction: "PC_TO_MAR",
    options: shuffleOptions("PC_TO_MAR", DISTRACTOR_POOL),
    description: "Fetch: Where does the CPU look for the next instruction?",
    stateAfter: { MAR: state.MAR },
  });

  // Fetch: Read memory[MAR] → MDR
  state.MDR = state.memory[state.MAR] ?? 0;
  steps.push({
    correctAction: "READ_MEM",
    options: shuffleOptions("READ_MEM", DISTRACTOR_POOL),
    description: "Fetch: Read the instruction from memory.",
    stateAfter: { MDR: state.MDR },
  });

  // Fetch: MDR → IR
  state.IR = state.MDR;
  steps.push({
    correctAction: "MDR_TO_IR",
    options: shuffleOptions("MDR_TO_IR", DISTRACTOR_POOL),
    description: "Fetch: Store the instruction for decoding.",
    stateAfter: { IR: state.IR },
  });

  // Increment PC
  state.PC = state.PC + 1;
  steps.push({
    correctAction: "INC_PC",
    options: shuffleOptions("INC_PC", DISTRACTOR_POOL),
    description: "Advance the program counter.",
    stateAfter: { PC: state.PC },
  });

  // Decode
  const { opcode, address } = decodeInstruction(state.IR);

  steps.push({
    correctAction: "DECODE",
    options: shuffleOptions("DECODE", DISTRACTOR_POOL),
    description: `Decode: IR=${state.IR} → ${opcode} addr=${address}`,
    stateAfter: {},
  });

  // Execute based on opcode
  if (opcode === "LOAD") {
    state.MAR = address;
    steps.push({
      correctAction: "LOAD_ADDR_TO_MAR",
      options: shuffleOptions("LOAD_ADDR_TO_MAR", DISTRACTOR_POOL),
      description: `Execute LOAD: Set MAR to address ${address}.`,
      stateAfter: { MAR: state.MAR },
    });
    state.MDR = state.memory[state.MAR] ?? 0;
    steps.push({
      correctAction: "READ_OPERAND",
      options: shuffleOptions("READ_OPERAND", DISTRACTOR_POOL),
      description: "Execute LOAD: Read the value from memory.",
      stateAfter: { MDR: state.MDR },
    });
    state.ACC = state.MDR;
    steps.push({
      correctAction: "MDR_TO_ACC",
      options: shuffleOptions("MDR_TO_ACC", DISTRACTOR_POOL),
      description: "Execute LOAD: Move value to accumulator.",
      stateAfter: { ACC: state.ACC },
    });
  } else if (opcode === "STORE") {
    state.MAR = address;
    steps.push({
      correctAction: "LOAD_ADDR_TO_MAR",
      options: shuffleOptions("LOAD_ADDR_TO_MAR", DISTRACTOR_POOL),
      description: `Execute STORE: Set MAR to address ${address}.`,
      stateAfter: { MAR: state.MAR },
    });
    state.MDR = state.ACC;
    steps.push({
      correctAction: "ACC_TO_MDR",
      options: shuffleOptions("ACC_TO_MDR", DISTRACTOR_POOL),
      description: "Execute STORE: Copy ACC to MDR.",
      stateAfter: { MDR: state.MDR },
    });
    state.memory[state.MAR] = state.MDR;
    steps.push({
      correctAction: "WRITE_MEM",
      options: shuffleOptions("WRITE_MEM", DISTRACTOR_POOL),
      description: "Execute STORE: Write MDR to memory.",
      stateAfter: { memory: [...state.memory] },
    });
  } else if (opcode === "ADD") {
    state.MAR = address;
    steps.push({
      correctAction: "LOAD_ADDR_TO_MAR",
      options: shuffleOptions("LOAD_ADDR_TO_MAR", DISTRACTOR_POOL),
      description: `Execute ADD: Set MAR to address ${address}.`,
      stateAfter: { MAR: state.MAR },
    });
    state.MDR = state.memory[state.MAR] ?? 0;
    steps.push({
      correctAction: "READ_OPERAND",
      options: shuffleOptions("READ_OPERAND", DISTRACTOR_POOL),
      description: "Execute ADD: Read the operand from memory.",
      stateAfter: { MDR: state.MDR },
    });
    state.ACC = state.ACC + state.MDR;
    steps.push({
      correctAction: "ADD_MDR_TO_ACC",
      options: shuffleOptions("ADD_MDR_TO_ACC", DISTRACTOR_POOL),
      description: "Execute ADD: Add MDR to ACC.",
      stateAfter: { ACC: state.ACC },
    });
  } else if (opcode === "SUB") {
    state.MAR = address;
    steps.push({
      correctAction: "LOAD_ADDR_TO_MAR",
      options: shuffleOptions("LOAD_ADDR_TO_MAR", DISTRACTOR_POOL),
      description: `Execute SUB: Set MAR to address ${address}.`,
      stateAfter: { MAR: state.MAR },
    });
    state.MDR = state.memory[state.MAR] ?? 0;
    steps.push({
      correctAction: "READ_OPERAND",
      options: shuffleOptions("READ_OPERAND", DISTRACTOR_POOL),
      description: "Execute SUB: Read the operand from memory.",
      stateAfter: { MDR: state.MDR },
    });
    state.ACC = state.ACC - state.MDR;
    steps.push({
      correctAction: "SUB_MDR_FROM_ACC",
      options: shuffleOptions("SUB_MDR_FROM_ACC", DISTRACTOR_POOL),
      description: "Execute SUB: Subtract MDR from ACC.",
      stateAfter: { ACC: state.ACC },
    });
  } else if (opcode === "JUMP") {
    state.PC = address;
    steps.push({
      correctAction: "ADDR_TO_PC",
      options: shuffleOptions("ADDR_TO_PC", DISTRACTOR_POOL),
      description: `Execute JUMP: Set PC to ${address}.`,
      stateAfter: { PC: state.PC },
    });
  } else if (opcode === "JZ") {
    if (state.ACC === 0) {
      state.PC = address;
      steps.push({
        correctAction: "ADDR_TO_PC",
        options: shuffleOptions("ADDR_TO_PC", DISTRACTOR_POOL),
        description: `Execute JZ: ACC is 0, jump to ${address}.`,
        stateAfter: { PC: state.PC },
      });
    } else {
      steps.push({
        correctAction: "CHECK_ZERO",
        options: shuffleOptions("CHECK_ZERO", DISTRACTOR_POOL),
        description: "Execute JZ: ACC is not 0, no jump.",
        stateAfter: {},
      });
    }
  } else if (opcode === "HALT") {
    steps.push({
      correctAction: "HALT",
      options: shuffleOptions("HALT", DISTRACTOR_POOL),
      description: "Execute HALT: Stop the CPU.",
      stateAfter: {},
    });
  }

  return { steps, finalCPU: state };
}

interface ProgramDef {
  title: string;
  description: string;
  memory: number[];
  instructionCount: number;
}

const EASY_PROGRAMS: ProgramDef[] = [
  {
    title: "Load a Value",
    description: "This program loads the value at address 4 into ACC.",
    memory: [makeInstruction(0, 4), 0, 0, 0, 42, 0, 0, 0],
    instructionCount: 1,
  },
  {
    title: "Store a Value",
    description: "ACC=10. Store ACC into address 5.",
    memory: [makeInstruction(1, 5), 0, 0, 0, 0, 0, 0, 0],
    instructionCount: 1,
  },
];

const MEDIUM_PROGRAMS: ProgramDef[] = [
  {
    title: "Load and Add",
    description: "Load MEM[4] (=3) into ACC, then add MEM[5] (=7). Result: ACC=10.",
    memory: [makeInstruction(0, 4), makeInstruction(2, 5), 0, 0, 3, 7, 0, 0],
    instructionCount: 2,
  },
  {
    title: "Load, Add, Store",
    description: "Load MEM[5] (=20), add MEM[6] (=15), store result in MEM[7].",
    memory: [makeInstruction(0, 5), makeInstruction(2, 6), makeInstruction(1, 7), 0, 0, 20, 15, 0],
    instructionCount: 3,
  },
];

const HARD_PROGRAMS: ProgramDef[] = [
  {
    title: "Subtract and Store",
    description: "Load MEM[5] (=50), subtract MEM[6] (=30), store in MEM[7].",
    memory: [makeInstruction(0, 5), makeInstruction(3, 6), makeInstruction(1, 7), 0, 0, 50, 30, 0],
    instructionCount: 3,
  },
  {
    title: "Add Three Numbers",
    description: "Load MEM[4] (=5), add MEM[5] (=10), add MEM[6] (=15), store in MEM[7].",
    memory: [
      makeInstruction(0, 4), makeInstruction(2, 5), makeInstruction(2, 6),
      makeInstruction(1, 7), 5, 10, 15, 0,
    ],
    instructionCount: 4,
  },
];

function getPrograms(difficulty: Difficulty): ProgramDef[] {
  if (difficulty === "easy") return EASY_PROGRAMS;
  if (difficulty === "medium") return MEDIUM_PROGRAMS;
  return HARD_PROGRAMS;
}

export function getLevelCount(difficulty: Difficulty): number {
  return getPrograms(difficulty).length;
}

export function generateLevel(levelNumber: number, difficulty: Difficulty): ClockworkLevel {
  const programs = getPrograms(difficulty);
  const idx = Math.min(levelNumber, programs.length - 1);
  const prog = programs[idx];

  const initialCPU: CPUState = {
    PC: 0,
    IR: 0,
    MAR: 0,
    MDR: 0,
    ACC: prog.title === "Store a Value" ? 10 : 0,
    memory: [...prog.memory],
  };

  // Compute all steps for all instructions
  const allSteps: CycleStep[] = [];
  let cpu = { ...initialCPU, memory: [...initialCPU.memory] };

  for (let i = 0; i < prog.instructionCount; i++) {
    const { steps, finalCPU } = computeStepsForInstruction(cpu);
    allSteps.push(...steps);
    cpu = finalCPU;
  }

  return {
    levelNumber: idx,
    title: prog.title,
    description: prog.description,
    initialCPU,
    steps: allSteps,
  };
}
