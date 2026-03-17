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

// Alternating easy/hard pattern — odd rounds (after 1) are breathers
export const BOARD_PROGRESSION: BoardConfig[] = [
  // Wave 1: intro
  { rows: 3, cols: 4, matchSize: 2 }, // round 1:  12 cards, 6 pairs   — Easy
  { rows: 4, cols: 4, matchSize: 2 }, // round 2:  16 cards, 8 pairs   — Medium
  { rows: 3, cols: 4, matchSize: 2 }, // round 3:  12 cards, 6 pairs   — Breather
  { rows: 4, cols: 5, matchSize: 2 }, // round 4:  20 cards, 10 pairs  — Medium
  { rows: 4, cols: 4, matchSize: 2 }, // round 5:  16 cards, 8 pairs   — Breather
  { rows: 4, cols: 6, matchSize: 2 }, // round 6:  24 cards, 12 pairs  — Hard
  // Wave 2: triples intro
  { rows: 4, cols: 4, matchSize: 2 }, // round 7:  16 cards, 8 pairs   — Breather
  { rows: 4, cols: 6, matchSize: 3 }, // round 8:  24 cards, 8 triples — Hard
  { rows: 3, cols: 4, matchSize: 2 }, // round 9:  12 cards, 6 pairs   — Breather
  { rows: 5, cols: 6, matchSize: 3 }, // round 10: 30 cards, 10 trips  — Hard
  { rows: 4, cols: 6, matchSize: 3 }, // round 11: 24 cards, 8 triples — Breather
  { rows: 6, cols: 6, matchSize: 3 }, // round 12: 36 cards, 12 trips  — Very Hard
  // Wave 3: quads + endgame cycle (repeats from here)
  { rows: 4, cols: 6, matchSize: 2 }, // round 13: 24 cards, 12 pairs  — Breather
  { rows: 6, cols: 6, matchSize: 4 }, // round 14: 36 cards, 9 quads   — Extreme
  { rows: 4, cols: 4, matchSize: 2 }, // round 15: 16 cards, 8 pairs   — Breather
  { rows: 6, cols: 6, matchSize: 4 }, // round 16: 36 cards, 9 quads   — Extreme
];

// After round 16, cycle through the last 4 entries (rounds 13-16)
const CYCLE_START = 12; // index of the repeating cycle start
const CYCLE_LENGTH = 4;

// ── Emoji Pools ────────────────────────────────────────

const TIER_1 = ["🐶", "🐱", "🐸", "🦊", "🐻", "🐼", "🐨", "🦁", "🐯", "🐮", "🐷", "🐙", "🦄", "🐧", "🦋", "🐢"];
const TIER_2 = ["🍎", "🍊", "🍋", "🍇", "🍓", "🍑", "🍒", "🥝", "🍌", "🍐", "🥭", "🍈", "🫐", "🍉", "🥥", "🍍"];
const TIER_3 = ["🔴", "🟠", "🟡", "🟢", "🔵", "🟣", "🟤", "⚫", "⚪", "🩶", "🩷", "🩵", "❤️", "🧡", "💛", "💚"];

// ── Functions ──────────────────────────────────────────

export function getBoardConfig(round: number): BoardConfig {
  const idx = round - 1;
  if (idx < BOARD_PROGRESSION.length) {
    return BOARD_PROGRESSION[Math.max(0, idx)];
  }
  // After round 16, cycle through the last 4 configs (easy-hard-easy-hard)
  const cycleIdx = CYCLE_START + ((idx - CYCLE_START) % CYCLE_LENGTH);
  return BOARD_PROGRESSION[cycleIdx];
}

export function getMatchSize(round: number): number {
  return getBoardConfig(round).matchSize;
}

export function selectEmojis(count: number, round: number): string[] {
  let pool: string[];
  if (round <= 6) {
    pool = [...TIER_1];
  } else if (round <= 12) {
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
