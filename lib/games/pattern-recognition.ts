export interface PatternRound {
  items: number[];
  oddIndex: number;
}

export function generateRound(difficulty: number): PatternRound {
  const base = Math.floor(Math.random() * 20) + 1;
  const step = Math.floor(Math.random() * 5) + 1;
  const count = Math.min(4 + Math.floor(difficulty / 3), 8);
  const items = Array.from({ length: count }, (_, i) => base + step * i);
  const oddIndex = Math.floor(Math.random() * count);
  const offset = (Math.random() > 0.5 ? 1 : -1) * (Math.floor(Math.random() * 3) + 1);
  items[oddIndex] = items[oddIndex] + offset;
  return { items, oddIndex };
}
