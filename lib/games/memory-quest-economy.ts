// Memory Quest — Economy, Persistence & Progression (pure functions, no React)

import { safe, store } from "@/lib/storage";

export const MAX_ENERGY = 50;
export const ENERGY_REGEN_MS = 60_000; // 1 minute
const ENERGY_REFUND_PER_MATCH = 2;
const COMBO_ENERGY_BONUS = [0, 1, 2, 3, 4, 6]; // index = combo streak
const MATCH_PAIR_ENERGY_BONUS = 3; // instant reward per successful match
const BASE_COINS_PER_MATCH = 10;
const BOARD_CLEAR_BONUS = 50;

// ── Safety Net & Second Wind ──────────────────────────
export const LOW_ENERGY_THRESHOLD = 8;
const SAFETY_NET_GIFT_MIN = 10;
const SAFETY_NET_GIFT_MAX = 20;
export const SAFETY_NET_COOLDOWN_BOARDS = 2;
export const SECOND_WIND_COOLDOWN_MS = 20 * 60_000; // 20 minutes

// ── Streak Bonuses ────────────────────────────────────
export const STREAK_ENERGY_INTERVAL = 3;
export const STREAK_ENERGY_AMOUNT = 5;

// ── Types ──────────────────────────────────────────────

export interface EnergyState {
  amount: number;
  lastUpdated: number; // Date.now() timestamp
}

export interface PlayerStats {
  totalMatches: number;
  totalBoardsCleared: number;
  highestCombo: number;
  totalCoinsEarned: number;
  highestRound: number;
}

export interface LabUpgrade {
  level: number;
  name: string;
  emoji: string;
  cost: number;
}

export interface Milestone {
  id: string;
  description: string;
  stat: keyof PlayerStats;
  threshold: number;
  reward: { coins: number; energy: number };
}

// ── Infinite Procedural Upgrades ───────────────────────

const PREFIXES = [
  "Neural", "Quantum", "Cosmic", "Hyper", "Mega",
  "Ultra", "Supreme", "Infinite", "Astral", "Divine",
];
const SUFFIXES = [
  "Scanner", "Amplifier", "Processor", "Core", "Matrix",
  "Engine", "Reactor", "Nexus", "Beacon", "Singularity",
];
const UPGRADE_EMOJIS = [
  "🧠", "🔬", "⚡", "🗺️", "💡",
  "🕸️", "🔮", "🐝", "🌌", "👁️",
  "⭐", "🚀", "💎", "🌟", "🎯",
];

export function getUpgrade(level: number): LabUpgrade {
  const prefixIdx = level % PREFIXES.length;
  const suffixIdx = Math.floor(level / PREFIXES.length) % SUFFIXES.length;
  const tier = Math.floor(level / (PREFIXES.length * SUFFIXES.length));
  const tierSuffix = tier > 0 ? ` Mk.${tier + 1}` : "";
  return {
    level,
    name: `${PREFIXES[prefixIdx]} ${SUFFIXES[suffixIdx]}${tierSuffix}`,
    emoji: UPGRADE_EMOJIS[level % UPGRADE_EMOJIS.length],
    cost: level === 0 ? 0 : Math.floor(100 * Math.pow(1.5, level - 1)),
  };
}

export function canAffordUpgrade(coins: number, currentLevel: number): boolean {
  const next = getUpgrade(currentLevel + 1);
  return coins >= next.cost;
}

export function purchaseUpgrade(
  coins: number,
  currentLevel: number,
): { newCoins: number; newLevel: number } | null {
  const next = getUpgrade(currentLevel + 1);
  if (coins < next.cost) return null;
  return { newCoins: coins - next.cost, newLevel: currentLevel + 1 };
}

// ── Energy ─────────────────────────────────────────────



export function computeRegenerated(state: EnergyState): EnergyState {
  const elapsed = Date.now() - state.lastUpdated;
  const regen = Math.floor(elapsed / ENERGY_REGEN_MS);
  if (regen <= 0) return state;
  return {
    amount: Math.min(MAX_ENERGY, state.amount + regen),
    lastUpdated: state.lastUpdated + regen * ENERGY_REGEN_MS,
  };
}

export function loadEnergy(): EnergyState {
  const saved = safe<EnergyState>("mq-energy", {
    amount: MAX_ENERGY,
    lastUpdated: Date.now(),
  });
  return computeRegenerated(saved);
}

export function saveEnergy(state: EnergyState): void {
  store("mq-energy", state);
}

export function spendEnergy(state: EnergyState, cost = 1): EnergyState | null {
  if (state.amount < cost) return null;
  return { amount: state.amount - cost, lastUpdated: state.lastUpdated };
}

export function addEnergy(state: EnergyState, amount: number): EnergyState {
  return {
    amount: state.amount + amount,
    lastUpdated: state.lastUpdated,
  };
}

// ── Coins ──────────────────────────────────────────────

export function loadCoins(): number {
  return safe<number>("mq-coins", 0);
}

export function saveCoins(coins: number): void {
  store("mq-coins", coins);
}

// ── Lab Level ──────────────────────────────────────────

export function loadLabLevel(): number {
  return safe<number>("mq-lab-level", 0);
}

export function saveLabLevel(level: number): void {
  store("mq-lab-level", level);
}

// ── Stats ──────────────────────────────────────────────

const DEFAULT_STATS: PlayerStats = {
  totalMatches: 0,
  totalBoardsCleared: 0,
  highestCombo: 0,
  totalCoinsEarned: 0,
  highestRound: 0,
};

export function loadStats(): PlayerStats {
  return safe<PlayerStats>("mq-stats", { ...DEFAULT_STATS });
}

export function saveStats(stats: PlayerStats): void {
  store("mq-stats", stats);
}

// ── Milestones ─────────────────────────────────────────

function ms(
  id: string,
  stat: keyof PlayerStats,
  threshold: number,
  coins: number,
  energy: number,
  desc: string,
): Milestone {
  return { id, stat, threshold, reward: { coins, energy }, description: desc };
}

export const MILESTONES: Milestone[] = [
  // Matches
  ms("matches-10", "totalMatches", 10, 50, 3, "10 Matches"),
  ms("matches-25", "totalMatches", 25, 100, 5, "25 Matches"),
  ms("matches-50", "totalMatches", 50, 200, 5, "50 Matches"),
  ms("matches-100", "totalMatches", 100, 400, 10, "100 Matches"),
  ms("matches-250", "totalMatches", 250, 800, 10, "250 Matches"),
  ms("matches-500", "totalMatches", 500, 1500, 15, "500 Matches"),
  ms("matches-1000", "totalMatches", 1000, 3000, 20, "1,000 Matches"),
  ms("matches-2500", "totalMatches", 2500, 6000, 25, "2,500 Matches"),
  ms("matches-5000", "totalMatches", 5000, 10000, 30, "5,000 Matches"),
  ms("matches-10000", "totalMatches", 10000, 20000, 30, "10,000 Matches"),
  // Boards cleared
  ms("boards-3", "totalBoardsCleared", 3, 75, 3, "3 Boards Cleared"),
  ms("boards-10", "totalBoardsCleared", 10, 200, 5, "10 Boards Cleared"),
  ms("boards-25", "totalBoardsCleared", 25, 500, 10, "25 Boards Cleared"),
  ms("boards-50", "totalBoardsCleared", 50, 1000, 15, "50 Boards Cleared"),
  ms("boards-100", "totalBoardsCleared", 100, 2500, 20, "100 Boards Cleared"),
  ms("boards-250", "totalBoardsCleared", 250, 5000, 25, "250 Boards Cleared"),
  ms("boards-500", "totalBoardsCleared", 500, 10000, 30, "500 Boards Cleared"),
  // Combo
  ms("combo-3", "highestCombo", 3, 100, 3, "3x Combo"),
  ms("combo-5", "highestCombo", 5, 250, 5, "5x Combo"),
  ms("combo-8", "highestCombo", 8, 500, 8, "8x Combo"),
  ms("combo-10", "highestCombo", 10, 800, 10, "10x Combo"),
  ms("combo-15", "highestCombo", 15, 1500, 15, "15x Combo"),
  ms("combo-20", "highestCombo", 20, 3000, 20, "20x Combo"),
  // Rounds
  ms("round-5", "highestRound", 5, 200, 5, "Round 5 Reached"),
  ms("round-10", "highestRound", 10, 500, 10, "Round 10 Reached"),
  ms("round-15", "highestRound", 15, 1000, 15, "Round 15 Reached"),
  ms("round-20", "highestRound", 20, 2000, 20, "Round 20 Reached"),
  ms("round-30", "highestRound", 30, 4000, 25, "Round 30 Reached"),
  ms("round-50", "highestRound", 50, 8000, 30, "Round 50 Reached"),
  // Lifetime coins
  ms("coins-500", "totalCoinsEarned", 500, 100, 5, "500 Coins Earned"),
  ms("coins-2000", "totalCoinsEarned", 2000, 300, 10, "2,000 Coins Earned"),
  ms("coins-5000", "totalCoinsEarned", 5000, 600, 10, "5,000 Coins Earned"),
  ms("coins-10000", "totalCoinsEarned", 10000, 1200, 15, "10,000 Coins Earned"),
  ms("coins-50000", "totalCoinsEarned", 50000, 5000, 20, "50,000 Coins Earned"),
  ms("coins-100000", "totalCoinsEarned", 100000, 10000, 30, "100,000 Coins Earned"),
];

export function loadMilestones(): string[] {
  return safe<string[]>("mq-milestones", []);
}

export function saveMilestones(ids: string[]): void {
  store("mq-milestones", ids);
}

export function checkNewMilestones(
  stats: PlayerStats,
  achieved: string[],
): Milestone[] {
  const set = new Set(achieved);
  return MILESTONES.filter((m) => !set.has(m.id) && stats[m.stat] >= m.threshold);
}

// ── Milestone Helpers (for Achievements page & HUD) ───

const STAT_KEYS: (keyof PlayerStats)[] = [
  "totalMatches", "totalBoardsCleared", "highestCombo", "highestRound", "totalCoinsEarned",
];

export function getMilestonesByCategory(): Record<keyof PlayerStats, Milestone[]> {
  const categories = Object.fromEntries(
    STAT_KEYS.map((k) => [k, [] as Milestone[]]),
  ) as Record<keyof PlayerStats, Milestone[]>;
  for (const m of MILESTONES) {
    categories[m.stat].push(m);
  }
  // Sort each category by threshold
  for (const k of STAT_KEYS) {
    categories[k].sort((a, b) => a.threshold - b.threshold);
  }
  return categories;
}

export function getNextMilestone(
  stat: keyof PlayerStats,
  stats: PlayerStats,
  achieved: string[],
): Milestone | null {
  const set = new Set(achieved);
  const candidates = MILESTONES
    .filter((m) => m.stat === stat && !set.has(m.id))
    .sort((a, b) => a.threshold - b.threshold);
  return candidates[0] ?? null;
}

export function getMilestoneProgress(
  milestone: Milestone,
  stats: PlayerStats,
): number {
  return Math.min(1, stats[milestone.stat] / milestone.threshold);
}

export function getClosestMilestone(
  stats: PlayerStats,
  achieved: string[],
): Milestone | null {
  const set = new Set(achieved);
  let best: Milestone | null = null;
  let bestProgress = -1;
  for (const m of MILESTONES) {
    if (set.has(m.id)) continue;
    const progress = Math.min(1, stats[m.stat] / m.threshold);
    if (progress > bestProgress) {
      bestProgress = progress;
      best = m;
    }
  }
  return best;
}

// ── Reward Calculations ────────────────────────────────

export function calculateMatchReward(combo: number, round: number = 1): {
  coins: number;
  energyRefund: number;
} {
  const bonusIdx = Math.min(combo, COMBO_ENERGY_BONUS.length - 1);
  const baseRefund = ENERGY_REFUND_PER_MATCH + COMBO_ENERGY_BONUS[bonusIdx];
  // Late-game scaling: +1 energy per match starting at round 5
  const lateGameBonus = round >= 5 ? Math.floor((round - 4) / 2) + 1 : 0;
  return {
    coins: BASE_COINS_PER_MATCH * Math.max(1, combo),
    energyRefund: baseRefund + lateGameBonus + MATCH_PAIR_ENERGY_BONUS,
  };
}

export function calculateBoardClearReward(round: number): { coins: number; energy: number } {
  return {
    coins: BOARD_CLEAR_BONUS + round * 25,
    energy: Math.min(8, 3 + Math.floor(round / 2)),
  };
}

// ── Event Tracking (Lucky Wheel) ─────────────────────────

export const WHEEL_TRIGGER_EVERY = 3;

export function loadEventClears(): number {
  return safe<number>("mq-event-clears", 0);
}

export function saveEventClears(n: number): void {
  store("mq-event-clears", n);
}

export function resetEventClears(): void {
  store("mq-event-clears", 0);
}

// ── Streak Bonus ──────────────────────────────────────

export function calculateStreakBonus(boardsThisSession: number): number {
  if (boardsThisSession > 0 && boardsThisSession % STREAK_ENERGY_INTERVAL === 0) {
    return STREAK_ENERGY_AMOUNT;
  }
  return 0;
}

// ── Safety Net ────────────────────────────────────────

export function shouldTriggerSafetyNet(
  energyAmount: number,
  boardsSinceLastSafetyNet: number,
): boolean {
  return energyAmount <= LOW_ENERGY_THRESHOLD && boardsSinceLastSafetyNet >= SAFETY_NET_COOLDOWN_BOARDS;
}

export function calculateSafetyNetGift(): number {
  return SAFETY_NET_GIFT_MIN + Math.floor(Math.random() * (SAFETY_NET_GIFT_MAX - SAFETY_NET_GIFT_MIN + 1));
}

// ── Second Wind ───────────────────────────────────────

export function loadSecondWindTimestamp(): number {
  return safe<number>("mq-second-wind", 0);
}

export function saveSecondWindTimestamp(ts: number): void {
  store("mq-second-wind", ts);
}

export function isSecondWindAvailable(lastUsed: number): boolean {
  return Date.now() - lastUsed >= SECOND_WIND_COOLDOWN_MS;
}

export function getSecondWindCooldownRemaining(lastUsed: number): number {
  const elapsed = Date.now() - lastUsed;
  return Math.max(0, SECOND_WIND_COOLDOWN_MS - elapsed);
}

// ── High Score (simple) ────────────────────────────────

export function loadHighScore(): number {
  return safe<number>("mq-highscore", 0);
}

export function saveHighScore(score: number): void {
  const current = loadHighScore();
  if (score > current) store("mq-highscore", score);
}
