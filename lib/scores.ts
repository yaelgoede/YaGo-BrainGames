export function getHighScore(gameId: string): number {
  if (typeof window === "undefined") return 0;
  const val = localStorage.getItem(`highscore-${gameId}`);
  return val ? parseInt(val, 10) : 0;
}

export function setHighScore(gameId: string, score: number): void {
  if (typeof window === "undefined") return;
  const current = getHighScore(gameId);
  if (score > current) {
    localStorage.setItem(`highscore-${gameId}`, String(score));
  }
}
