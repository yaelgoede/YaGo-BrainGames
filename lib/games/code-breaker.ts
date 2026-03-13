import { type Difficulty } from "@/lib/difficulty";

export type Opcode = "LOAD" | "STORE" | "ADD" | "SUB" | "JUMP" | "JZ" | "HALT";

export type CodeBreakerMode = "decode" | "encode";

export interface InstructionFormat {
  opcode: Opcode;
  opcodeValue: number;
  address: number;
}

export interface CodeBreakerRound {
  mode: CodeBreakerMode;
  instruction: InstructionFormat;
  bits: number[];
  description: string;
  options: Opcode[];
}

const OPCODE_MAP: Record<Opcode, number> = {
  LOAD: 0,
  STORE: 1,
  ADD: 2,
  SUB: 3,
  JUMP: 4,
  JZ: 5,
  HALT: 6,
};

const OPCODE_REVERSE: Record<number, Opcode> = {};
for (const [op, val] of Object.entries(OPCODE_MAP)) {
  OPCODE_REVERSE[val] = op as Opcode;
}

const ALL_OPCODES: Opcode[] = ["LOAD", "STORE", "ADD", "SUB", "JUMP", "JZ", "HALT"];

export function instructionToBits(inst: InstructionFormat): number[] {
  const bits: number[] = [];
  // Bits 7-5: opcode (3 bits)
  for (let i = 2; i >= 0; i--) {
    bits.push((inst.opcodeValue >> i) & 1);
  }
  // Bits 4-0: address (5 bits)
  for (let i = 4; i >= 0; i--) {
    bits.push((inst.address >> i) & 1);
  }
  return bits;
}

export function bitsToInstruction(bits: number[]): InstructionFormat | null {
  let opcodeValue = 0;
  for (let i = 0; i < 3; i++) {
    opcodeValue = (opcodeValue << 1) | bits[i];
  }
  let address = 0;
  for (let i = 3; i < 8; i++) {
    address = (address << 1) | bits[i];
  }
  const opcode = OPCODE_REVERSE[opcodeValue];
  if (!opcode) return null;
  return { opcode, opcodeValue, address };
}

export function describeInstruction(inst: InstructionFormat): string {
  switch (inst.opcode) {
    case "LOAD":
      return `LOAD from address ${inst.address}`;
    case "STORE":
      return `STORE to address ${inst.address}`;
    case "ADD":
      return `ADD address ${inst.address}`;
    case "SUB":
      return `SUB address ${inst.address}`;
    case "JUMP":
      return `JUMP to address ${inst.address}`;
    case "JZ":
      return `JUMP IF ZERO to address ${inst.address}`;
    case "HALT":
      return "HALT";
  }
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateDecodeOptions(correctOpcode: Opcode): Opcode[] {
  const options = new Set<Opcode>([correctOpcode]);
  while (options.size < 4) {
    options.add(pickRandom(ALL_OPCODES));
  }
  // Shuffle
  const arr = Array.from(options);
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function getModeForRound(roundIndex: number, difficulty: Difficulty): CodeBreakerMode {
  if (difficulty === "easy") return "decode";
  if (difficulty === "hard") return "encode";
  return roundIndex % 2 === 0 ? "decode" : "encode";
}

export function generateRound(
  score: number,
  difficulty: Difficulty,
  roundIndex: number
): CodeBreakerRound {
  const mode = getModeForRound(roundIndex, difficulty);
  const opcode = pickRandom(ALL_OPCODES);
  const opcodeValue = OPCODE_MAP[opcode];
  const address = opcode === "HALT" ? 0 : Math.floor(Math.random() * 32);
  const instruction: InstructionFormat = { opcode, opcodeValue, address };
  const bits = instructionToBits(instruction);
  const description = describeInstruction(instruction);
  const options = mode === "decode" ? generateDecodeOptions(opcode) : [];

  return { mode, instruction, bits, description, options };
}

export function checkDecode(answer: Opcode, round: CodeBreakerRound): boolean {
  return answer === round.instruction.opcode;
}

export function checkEncode(playerBits: number[], round: CodeBreakerRound): boolean {
  return playerBits.every((bit, i) => bit === round.bits[i]);
}
