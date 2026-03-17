// Memory Quest — Timed Events, Collectibles & Scratch Cards (pure functions, no React)

import { shuffle, randInt, pickRandom } from "@/lib/utils";
import { safe, store } from "@/lib/storage";

// ── Types ──────────────────────────────────────────────

export type EventTier = "bronze" | "silver" | "gold";

export interface EventTheme {
  name: string;
  collectibleEmoji: string;
  color: string;
}

export interface TimedEvent {
  id: string;
  theme: EventTheme;
  tier: EventTier;
  target: number;
  collected: number;
  startedAt: number;
  durationMs: number;
  completed: boolean;
  rewardClaimed: boolean;
}

export interface EventCooldown {
  lastEventEndedAt: number;
  cooldownMs: number;
}

export type ScratchSymbol = "coins" | "energy" | "bigCoins" | "bigEnergy" | "skull";

export interface ScratchCell {
  symbol: ScratchSymbol;
  emoji: string;
  revealed: boolean;
}

export interface ScratchPrize {
  symbol: ScratchSymbol;
  coins: number;
  energy: number;
}

// ── Constants ──────────────────────────────────────────

export const EVENT_THEMES: EventTheme[] = [
  { name: "Gem Hunt", collectibleEmoji: "💎", color: "#3b82f6" },
  { name: "Star Shower", collectibleEmoji: "⭐", color: "#eab308" },
  { name: "Crystal Cave", collectibleEmoji: "🔮", color: "#a855f7" },
  { name: "Ruby Rush", collectibleEmoji: "❤️‍🔥", color: "#ef4444" },
  { name: "Emerald Quest", collectibleEmoji: "🍀", color: "#22c55e" },
];

const MIN_DURATION_MS = 30 * 60_000;
const MAX_DURATION_MS = 90 * 60_000;
const MIN_COOLDOWN_MS = 10 * 60_000;
const MAX_COOLDOWN_MS = 20 * 60_000;

const TRIGGER_CHANCE = 0.6; // 60% chance per check

const TIER_WEIGHTS: { tier: EventTier; weight: number }[] = [
  { tier: "bronze", weight: 50 },
  { tier: "silver", weight: 35 },
  { tier: "gold", weight: 15 },
];

const TIER_CONFIG: Record<EventTier, { targetMin: number; targetMax: number }> = {
  bronze: { targetMin: 5, targetMax: 8 },
  silver: { targetMin: 10, targetMax: 15 },
  gold: { targetMin: 18, targetMax: 25 },
};

// Collectible count ranges by total card count
const COLLECTIBLE_RANGES: [number, number, number][] = [
  // [maxCards, min, max]
  [12, 1, 2],
  [20, 2, 3],
  [30, 3, 4],
  [36, 4, 5],
];

const SYMBOL_EMOJIS: Record<ScratchSymbol, string> = {
  coins: "🪙",
  energy: "⚡",
  bigCoins: "💎",
  bigEnergy: "🌟",
  skull: "💀",
};

// Prize ranges: [min, max] per tier
const PRIZE_TABLE: Record<ScratchSymbol, Record<EventTier, { coins: [number, number]; energy: [number, number] }>> = {
  coins:     { bronze: { coins: [40, 100],  energy: [0, 0] },  silver: { coins: [100, 250],  energy: [0, 0] },  gold: { coins: [200, 500],  energy: [0, 0] } },
  energy:    { bronze: { coins: [0, 0],     energy: [4, 10] }, silver: { coins: [0, 0],      energy: [10, 20] },gold: { coins: [0, 0],      energy: [20, 40] } },
  bigCoins:  { bronze: { coins: [100, 200], energy: [0, 0] },  silver: { coins: [250, 500],  energy: [0, 0] },  gold: { coins: [500, 1000], energy: [0, 0] } },
  bigEnergy: { bronze: { coins: [0, 0],     energy: [10, 16] },silver: { coins: [0, 0],      energy: [20, 30] },gold: { coins: [0, 0],      energy: [40, 60] } },
  skull:     { bronze: { coins: [0, 0],     energy: [0, 0] },  silver: { coins: [0, 0],      energy: [0, 0] },  gold: { coins: [0, 0],      energy: [0, 0] } },
};

// Skull chance per tier (probability that skulls are the winning triplet)
const SKULL_WEIGHTS: Record<EventTier, number> = { bronze: 25, silver: 15, gold: 10 };

// ── Event Lifecycle ────────────────────────────────────

export function loadTimedEvent(): TimedEvent | null {
  return safe<TimedEvent | null>("mq-timed-event", null);
}

export function saveTimedEvent(event: TimedEvent): void {
  store("mq-timed-event", event);
}

export function clearTimedEvent(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem("mq-timed-event");
}

export function loadEventCooldown(): EventCooldown | null {
  return safe<EventCooldown | null>("mq-event-cooldown", null);
}

export function saveEventCooldown(cooldown: EventCooldown): void {
  store("mq-event-cooldown", cooldown);
}

export function isEventExpired(event: TimedEvent): boolean {
  return Date.now() > event.startedAt + event.durationMs;
}

export function getEventTimeRemaining(event: TimedEvent): number {
  return Math.max(0, event.startedAt + event.durationMs - Date.now());
}

export function canStartNewEvent(): boolean {
  const active = loadTimedEvent();
  if (active && !isEventExpired(active)) return false;

  const cooldown = loadEventCooldown();
  if (!cooldown) return true;
  return Date.now() >= cooldown.lastEventEndedAt + cooldown.cooldownMs;
}

export function shouldTriggerEvent(): boolean {
  if (!canStartNewEvent()) return false;
  return Math.random() < TRIGGER_CHANCE;
}

function pickWeightedTier(): EventTier {
  const total = TIER_WEIGHTS.reduce((s, t) => s + t.weight, 0);
  let roll = Math.random() * total;
  for (const { tier, weight } of TIER_WEIGHTS) {
    roll -= weight;
    if (roll <= 0) return tier;
  }
  return "bronze";
}

export function createNewEvent(): TimedEvent {
  const tier = pickWeightedTier();
  const theme = pickRandom(EVENT_THEMES);
  const config = TIER_CONFIG[tier];

  // Duration: bronze tends shorter, gold tends longer
  const durationBias = tier === "bronze" ? 0.3 : tier === "silver" ? 0.5 : 0.7;
  const durationMs = Math.round(
    MIN_DURATION_MS + durationBias * (MAX_DURATION_MS - MIN_DURATION_MS) + (Math.random() - 0.5) * 10 * 60_000,
  );
  const clampedDuration = Math.max(MIN_DURATION_MS, Math.min(MAX_DURATION_MS, durationMs));

  return {
    id: `evt-${Date.now()}`,
    theme,
    tier,
    target: randInt(config.targetMin, config.targetMax),
    collected: 0,
    startedAt: Date.now(),
    durationMs: clampedDuration,
    completed: false,
    rewardClaimed: false,
  };
}

export function endEvent(): void {
  clearTimedEvent();
  const cooldownMs = randInt(MIN_COOLDOWN_MS, MAX_COOLDOWN_MS);
  saveEventCooldown({ lastEventEndedAt: Date.now(), cooldownMs });
}

// ── Collectibles ───────────────────────────────────────

export function getCollectibleCount(totalCards: number): number {
  for (const [maxCards, min, max] of COLLECTIBLE_RANGES) {
    if (totalCards <= maxCards) return randInt(min, max);
  }
  // Fallback for very large boards
  return randInt(4, 5);
}

export function assignCollectibles(totalCards: number): Set<number> {
  const count = getCollectibleCount(totalCards);
  const indices = shuffle(Array.from({ length: totalCards }, (_, i) => i));
  return new Set(indices.slice(0, count));
}

export function checkCollectibleEarned(
  matchedIndices: number[],
  collectibleIndices: Set<number>,
): number {
  let earned = 0;
  for (const idx of matchedIndices) {
    if (collectibleIndices.has(idx)) earned++;
  }
  return earned;
}

// ── Scratch Card ───────────────────────────────────────

function pickWinningSymbol(tier: EventTier): ScratchSymbol {
  const skullChance = SKULL_WEIGHTS[tier];
  if (randInt(1, 100) <= skullChance) return "skull";

  // Weighted among non-skull symbols
  const symbols: { sym: ScratchSymbol; weight: number }[] = [
    { sym: "coins", weight: 30 },
    { sym: "energy", weight: 30 },
    { sym: "bigCoins", weight: 15 },
    { sym: "bigEnergy", weight: 15 },
  ];
  const total = symbols.reduce((s, v) => s + v.weight, 0);
  let roll = Math.random() * total;
  for (const { sym, weight } of symbols) {
    roll -= weight;
    if (roll <= 0) return sym;
  }
  return "coins";
}

export function generateScratchCard(tier: EventTier): ScratchCell[] {
  const winner = pickWinningSymbol(tier);

  // Place 3 of the winning symbol
  const cells: ScratchSymbol[] = [winner, winner, winner];

  // Fill remaining 6 with other symbols (no other symbol gets 3+)
  const others: ScratchSymbol[] = (["coins", "energy", "bigCoins", "bigEnergy", "skull"] as ScratchSymbol[])
    .filter((s) => s !== winner);

  const counts: Record<string, number> = {};
  for (let i = 0; i < 6; i++) {
    // Pick random from others, but cap each at 2
    const available = others.filter((s) => (counts[s] || 0) < 2);
    const pick = pickRandom(available);
    counts[pick] = (counts[pick] || 0) + 1;
    cells.push(pick);
  }

  return shuffle(cells).map((symbol) => ({
    symbol,
    emoji: SYMBOL_EMOJIS[symbol],
    revealed: false,
  }));
}

export function revealCell(cells: ScratchCell[], index: number): ScratchCell[] {
  if (cells[index].revealed) return cells;
  const next = [...cells];
  next[index] = { ...next[index], revealed: true };
  return next;
}

export function checkScratchResult(cells: ScratchCell[]): ScratchSymbol | null {
  const counts: Partial<Record<ScratchSymbol, number>> = {};
  for (const cell of cells) {
    if (!cell.revealed) continue;
    counts[cell.symbol] = (counts[cell.symbol] || 0) + 1;
    if (counts[cell.symbol]! >= 3) return cell.symbol;
  }
  return null;
}

export function calculateScratchPrize(symbol: ScratchSymbol, tier: EventTier): ScratchPrize {
  const ranges = PRIZE_TABLE[symbol][tier];
  return {
    symbol,
    coins: randInt(ranges.coins[0], ranges.coins[1]),
    energy: randInt(ranges.energy[0], ranges.energy[1]),
  };
}

export function isScratchComplete(cells: ScratchCell[]): boolean {
  return cells.every((c) => c.revealed) || checkScratchResult(cells) !== null;
}

// ── Formatting helpers ─────────────────────────────────

export function formatTimeRemaining(ms: number): string {
  const totalSec = Math.ceil(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${sec.toString().padStart(2, "0")}`;
}

export function tierLabel(tier: EventTier): string {
  return tier.charAt(0).toUpperCase() + tier.slice(1);
}

export const TIER_COLORS: Record<EventTier, string> = {
  bronze: "#cd7f32",
  silver: "#c0c0c0",
  gold: "#ffd700",
};
