export interface MathProblem {
  question: string;
  answer: number;
}

type Op = "+" | "-" | "×";

export function generateProblem(difficulty: number): MathProblem {
  const ops: Op[] = ["+", "-", "×"];
  const op = ops[Math.floor(Math.random() * (difficulty >= 5 ? 3 : 2))];
  const max = Math.min(10 + difficulty * 5, 50);

  let a: number, b: number, answer: number;

  switch (op) {
    case "+":
      a = Math.floor(Math.random() * max) + 1;
      b = Math.floor(Math.random() * max) + 1;
      answer = a + b;
      break;
    case "-":
      a = Math.floor(Math.random() * max) + 1;
      b = Math.floor(Math.random() * a) + 1;
      answer = a - b;
      break;
    case "×":
      a = Math.floor(Math.random() * 12) + 1;
      b = Math.floor(Math.random() * 12) + 1;
      answer = a * b;
      break;
    default:
      throw new Error(`Unknown op: ${op}`);
  }

  return { question: `${a} ${op} ${b}`, answer };
}
