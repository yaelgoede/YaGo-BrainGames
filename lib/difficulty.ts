export type Difficulty = "easy" | "medium" | "hard";

export const DIFFICULTY_OFFSET: Record<Difficulty, number> = {
  easy: 0,
  medium: 2,
  hard: 5,
};

export function getSavedDifficulty(gameId: string): Difficulty {
  if (typeof window === "undefined") return "medium";
  return (localStorage.getItem(`difficulty-${gameId}`) as Difficulty) || "medium";
}

export function saveDifficulty(gameId: string, d: Difficulty): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(`difficulty-${gameId}`, d);
}
