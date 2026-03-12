export interface NumberPair {
  left: number;
  right: number;
}

export function generatePair(difficulty: number): NumberPair {
  const maxRange = Math.min(10 + difficulty * 10, 200);
  const minDiff = Math.max(1, Math.floor(5 - difficulty * 0.5));
  const maxDiff = Math.max(minDiff + 1, Math.floor(maxRange * 0.4));

  const diff = minDiff + Math.floor(Math.random() * (maxDiff - minDiff + 1));
  const smaller = Math.floor(Math.random() * (maxRange - diff + 1));
  const larger = smaller + diff;

  // Randomly assign left/right
  if (Math.random() < 0.5) {
    return { left: larger, right: smaller };
  }
  return { left: smaller, right: larger };
}

export function getCorrectSide(pair: NumberPair): "left" | "right" {
  return pair.left > pair.right ? "left" : "right";
}
