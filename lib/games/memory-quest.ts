// Memory Quest — Board generation, card logic & difficulty progression (pure functions, no React)

import { shuffle } from "@/lib/utils";

// ── Types ──────────────────────────────────────────────

export interface QuestCard {
  id: number;
  emoji: string;
  groupId: number;
  flipped: boolean;
  matched: boolean;
}

export interface BoardConfig {
  rows: number;
  cols: number;
  matchSize: number; // 2 = pairs, 3 = triples, 4 = quads
}

// ── Board Progression ──────────────────────────────────

export const BOARD_PROGRESSION: BoardConfig[] = [
  { rows: 3, cols: 4, matchSize: 2 }, // round 1: 12 cards, 6 pairs
  { rows: 4, cols: 4, matchSize: 2 }, // round 2: 16 cards, 8 pairs
  { rows: 4, cols: 5, matchSize: 2 }, // round 3: 20 cards, 10 pairs
  { rows: 4, cols: 6, matchSize: 2 }, // round 4: 24 cards, 12 pairs
  { rows: 4, cols: 6, matchSize: 3 }, // round 5: 24 cards, 8 triples
  { rows: 5, cols: 6, matchSize: 3 }, // round 6: 30 cards, 10 triples
  { rows: 6, cols: 6, matchSize: 3 }, // round 7: 36 cards, 12 triples
  { rows: 6, cols: 6, matchSize: 4 }, // round 8+: 36 cards, 9 quads
];

// ── Emoji Pools ────────────────────────────────────────

const TIER_1 = ["🐶", "🐱", "🐸", "🦊", "🐻", "🐼", "🐨", "🦁", "🐯", "🐮", "🐷", "🐙", "🦄", "🐧", "🦋", "🐢"];
const TIER_2 = ["🍎", "🍊", "🍋", "🍇", "🍓", "🍑", "🍒", "🥝", "🍌", "🍐", "🥭", "🍈", "🫐", "🍉", "🥥", "🍍"];
const TIER_3 = ["🔴", "🟠", "🟡", "🟢", "🔵", "🟣", "🟤", "⚫", "⚪", "🩶", "🩷", "🩵", "❤️", "🧡", "💛", "💚"];

// ── Functions ──────────────────────────────────────────

export function getBoardConfig(round: number): BoardConfig {
  const idx = Math.min(round - 1, BOARD_PROGRESSION.length - 1);
  return BOARD_PROGRESSION[Math.max(0, idx)];
}

export function getMatchSize(round: number): number {
  return getBoardConfig(round).matchSize;
}

export function selectEmojis(count: number, round: number): string[] {
  let pool: string[];
  if (round <= 3) {
    pool = [...TIER_1];
  } else if (round <= 6) {
    pool = [...TIER_1, ...TIER_2];
  } else {
    pool = [...TIER_1, ...TIER_2, ...TIER_3];
  }
  return shuffle(pool).slice(0, count);
}

export function createQuestBoard(round: number): QuestCard[] {
  const config = getBoardConfig(round);
  const totalCards = config.rows * config.cols;
  const groupCount = totalCards / config.matchSize;
  const emojis = selectEmojis(groupCount, round);

  const cards: QuestCard[] = [];
  emojis.forEach((emoji, groupId) => {
    for (let j = 0; j < config.matchSize; j++) {
      cards.push({
        id: groupId * config.matchSize + j,
        emoji,
        groupId,
        flipped: false,
        matched: false,
      });
    }
  });

  const shuffled = shuffle(cards);
  // Re-assign sequential IDs after shuffle for stable keys
  return shuffled.map((card, i) => ({ ...card, id: i }));
}

export function isGroupComplete(
  cards: QuestCard[],
  groupId: number,
  matchSize: number,
): boolean {
  const groupCards = cards.filter((c) => c.groupId === groupId);
  return groupCards.filter((c) => c.flipped && !c.matched).length === matchSize;
}

export function isAllMatched(cards: QuestCard[]): boolean {
  return cards.every((c) => c.matched);
}
