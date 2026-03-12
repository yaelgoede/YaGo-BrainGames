import { shuffle } from "@/lib/utils";

export interface Card {
  id: number;
  emoji: string;
  flipped: boolean;
  matched: boolean;
}

const EMOJIS = ["🐶", "🐱", "🐸", "🦊", "🐻", "🐼", "🐨", "🦁", "🐯", "🐮", "🐷", "🐙"];

export function createBoard(pairCount: number): Card[] {
  const selected = EMOJIS.slice(0, pairCount);
  const cards: Card[] = [];
  selected.forEach((emoji, i) => {
    cards.push({ id: i * 2, emoji, flipped: false, matched: false });
    cards.push({ id: i * 2 + 1, emoji, flipped: false, matched: false });
  });
  return shuffle(cards);
}

export function isAllMatched(cards: Card[]): boolean {
  return cards.every((c) => c.matched);
}
