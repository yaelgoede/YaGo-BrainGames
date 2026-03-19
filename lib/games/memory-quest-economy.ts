// Memory Quest — Economy, Persistence & Progression (pure functions, no React)

import { safe, store } from "@/lib/storage";
import { randInt } from "@/lib/utils";

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
  totalPrestiges: number;
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

// ── Energy ─────────────────────────────────────────────



export function computeRegenerated(state: EnergyState, regenMs: number = ENERGY_REGEN_MS, maxEnergy: number = MAX_ENERGY): EnergyState {
  const elapsed = Date.now() - state.lastUpdated;
  const regen = Math.floor(elapsed / regenMs);
  if (regen <= 0) return state;
  const newLastUpdated = state.lastUpdated + regen * regenMs;
  // If already at/above max (from uncapped rewards), just advance the timestamp — never clamp down
  if (state.amount >= maxEnergy) {
    return { amount: state.amount, lastUpdated: newLastUpdated };
  }
  return {
    amount: Math.min(maxEnergy, state.amount + regen),
    lastUpdated: newLastUpdated,
  };
}

export function loadEnergy(maxEnergy: number = MAX_ENERGY): EnergyState {
  const saved = safe<EnergyState>("mq-energy", {
    amount: maxEnergy,
    lastUpdated: Date.now(),
  });
  return computeRegenerated(saved, ENERGY_REGEN_MS, maxEnergy);
}

export function saveEnergy(state: EnergyState): void {
  store("mq-energy", state);
}

export function spendEnergy(state: EnergyState, cost = 1): EnergyState | null {
  if (state.amount < cost) return null;
  return { amount: state.amount - cost, lastUpdated: state.lastUpdated };
}

export function addEnergy(state: EnergyState, amount: number, maxEnergy: number = MAX_ENERGY): EnergyState {
  return {
    amount: Math.min(maxEnergy, state.amount + amount),
    lastUpdated: state.lastUpdated,
  };
}

/** Add energy without capping — used for rewards that should exceed max. */
export function addEnergyUncapped(state: EnergyState, amount: number): EnergyState {
  return { amount: state.amount + amount, lastUpdated: state.lastUpdated };
}

// ── Coins ──────────────────────────────────────────────

export function loadCoins(): number {
  return safe<number>("mq-coins", 0);
}

export function saveCoins(coins: number): void {
  store("mq-coins", coins);
}

// ── Stats ──────────────────────────────────────────────

const DEFAULT_STATS: PlayerStats = {
  totalMatches: 0,
  totalBoardsCleared: 0,
  highestCombo: 0,
  totalCoinsEarned: 0,
  highestRound: 0,
  totalPrestiges: 0,
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
  // Prestige
  ms("prestige-1", "totalPrestiges", 1, 500, 10, "First Prestige"),
  ms("prestige-3", "totalPrestiges", 3, 1500, 15, "3 Prestiges"),
  ms("prestige-5", "totalPrestiges", 5, 3000, 20, "5 Prestiges"),
  ms("prestige-10", "totalPrestiges", 10, 8000, 30, "10 Prestiges"),
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
  "totalMatches", "totalBoardsCleared", "highestCombo", "highestRound", "totalCoinsEarned", "totalPrestiges",
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

export function getPrestigeMultiplier(starRank: number): number {
  return 1 + starRank * 0.10;
}

export function calculateMatchReward(combo: number, round: number = 1, starRank: number = 0, spBonuses?: StarPathBonuses, labBonuses?: LabBonuses): {
  coins: number;
  energyRefund: number;
} {
  const bonusIdx = Math.min(combo, COMBO_ENERGY_BONUS.length - 1);
  const baseRefund = ENERGY_REFUND_PER_MATCH + COMBO_ENERGY_BONUS[bonusIdx] + (spBonuses?.matchEnergyBonus ?? 0) + (labBonuses?.matchEnergyRefund ?? 0);
  // Late-game scaling: +1 energy per match starting at round 5
  const lateGameBonus = round >= 5 ? Math.floor((round - 4) / 2) + 1 : 0;
  const baseCoins = BASE_COINS_PER_MATCH * Math.max(1, combo);
  const comboMultiplier = combo > 1 ? (1 + (labBonuses?.comboMultiplier ?? 0)) : 1;
  const coinMultiplier = getPrestigeMultiplier(starRank) * (1 + (spBonuses?.coinBoostPercent ?? 0) + (labBonuses?.coinMultiplier ?? 0));
  return {
    coins: Math.floor(baseCoins * coinMultiplier * comboMultiplier),
    energyRefund: baseRefund + lateGameBonus + MATCH_PAIR_ENERGY_BONUS,
  };
}

export function calculateBoardClearReward(round: number, starRank: number = 0, spBonuses?: StarPathBonuses, labBonuses?: LabBonuses): { coins: number; energy: number } {
  const baseCoins = BOARD_CLEAR_BONUS + round * 25 + (spBonuses?.boardClearCoinBonus ?? 0) + (labBonuses?.boardClearCoinBonus ?? 0);
  const coinMultiplier = getPrestigeMultiplier(starRank) * (1 + (spBonuses?.coinBoostPercent ?? 0) + (labBonuses?.coinMultiplier ?? 0));
  return {
    coins: Math.floor(baseCoins * coinMultiplier),
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
  return randInt(SAFETY_NET_GIFT_MIN, SAFETY_NET_GIFT_MAX);
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

// ── Star Rank (Prestige) ─────────────────────────────

export function loadStarRank(): number {
  return safe<number>("mq-star-rank", 0);
}

export function saveStarRank(rank: number): void {
  store("mq-star-rank", rank);
}

// ── Star Path (Infinite Prestige Leveling — Coin Sink) ──

export type StarPathBonusType =
  | "coinBoost"
  | "energyRegen"
  | "matchEnergy"
  | "boardClearBonus"
  | "maxEnergy";

export interface StarPathLevel {
  level: number;
  name: string;
  emoji: string;
  cost: number;
  bonusType: StarPathBonusType;
  bonusLabel: string;
}

export interface StarPathBonuses {
  coinBoostPercent: number;      // e.g. 0.06 = +6%
  energyRegenReduction: number;  // ms to subtract from ENERGY_REGEN_MS (capped)
  matchEnergyBonus: number;      // added to refund
  boardClearCoinBonus: number;   // added to base clear reward
  maxEnergyBonus: number;        // added to MAX_ENERGY
}

const STAR_PATH_BONUS_CYCLE: { type: StarPathBonusType; value: number; label: string; emoji: string }[] = [
  { type: "coinBoost",       value: 0.02,  label: "+2% Coin Boost",     emoji: "🪙" },
  { type: "energyRegen",     value: 500,   label: "-0.5s Energy Regen", emoji: "⏱️" },
  { type: "matchEnergy",     value: 1,     label: "+1 Match Energy",    emoji: "⚡" },
  { type: "boardClearBonus", value: 15,    label: "+15 Clear Bonus",    emoji: "🎯" },
  { type: "maxEnergy",       value: 1,     label: "+1 Max Energy",      emoji: "🔋" },
];

const STAR_NAMES = [
  "Nova", "Lunar", "Solar", "Astral", "Cosmic",
  "Radiant", "Stellar", "Celestial", "Galactic", "Eternal",
];
const STAR_SUFFIXES = [
  "Spark", "Surge", "Pulse", "Bloom", "Flare",
  "Glow", "Burst", "Wave", "Core", "Crest",
];

export function getStarPathLevel(level: number): StarPathLevel {
  const nameIdx = (level - 1) % STAR_NAMES.length;
  const suffIdx = Math.floor((level - 1) / STAR_NAMES.length) % STAR_SUFFIXES.length;
  const tier = Math.floor((level - 1) / (STAR_NAMES.length * STAR_SUFFIXES.length));
  const tierSuffix = tier > 0 ? ` ${tier + 1}` : "";
  const bonus = STAR_PATH_BONUS_CYCLE[(level - 1) % STAR_PATH_BONUS_CYCLE.length];
  return {
    level,
    name: `${STAR_NAMES[nameIdx]} ${STAR_SUFFIXES[suffIdx]}${tierSuffix}`,
    emoji: bonus.emoji,
    cost: Math.floor(500 * Math.pow(2, level - 1)),
    bonusType: bonus.type,
    bonusLabel: bonus.label,
  };
}

export function getStarPathBonuses(currentLevel: number): StarPathBonuses {
  const bonuses: StarPathBonuses = {
    coinBoostPercent: 0,
    energyRegenReduction: 0,
    matchEnergyBonus: 0,
    boardClearCoinBonus: 0,
    maxEnergyBonus: 0,
  };
  for (let i = 1; i <= currentLevel; i++) {
    const cycle = STAR_PATH_BONUS_CYCLE[(i - 1) % STAR_PATH_BONUS_CYCLE.length];
    switch (cycle.type) {
      case "coinBoost":       bonuses.coinBoostPercent += cycle.value; break;
      case "energyRegen":     bonuses.energyRegenReduction += cycle.value; break;
      case "matchEnergy":     bonuses.matchEnergyBonus += cycle.value; break;
      case "boardClearBonus": bonuses.boardClearCoinBonus += cycle.value; break;
      case "maxEnergy":       bonuses.maxEnergyBonus += cycle.value; break;
    }
  }
  // Cap regen reduction so regen never goes below 30s
  bonuses.energyRegenReduction = Math.min(bonuses.energyRegenReduction, ENERGY_REGEN_MS - 30_000);
  return bonuses;
}

export function getStarPathBonusSummary(currentLevel: number): { emoji: string; label: string }[] {
  const bonuses = getStarPathBonuses(currentLevel);
  const summary: { emoji: string; label: string }[] = [];
  if (bonuses.coinBoostPercent > 0) summary.push({ emoji: "🪙", label: `+${Math.round(bonuses.coinBoostPercent * 100)}% coins` });
  if (bonuses.energyRegenReduction > 0) summary.push({ emoji: "⏱️", label: `-${(bonuses.energyRegenReduction / 1000).toFixed(1)}s regen` });
  if (bonuses.matchEnergyBonus > 0) summary.push({ emoji: "⚡", label: `+${bonuses.matchEnergyBonus} match energy` });
  if (bonuses.boardClearCoinBonus > 0) summary.push({ emoji: "🎯", label: `+${bonuses.boardClearCoinBonus} clear bonus` });
  if (bonuses.maxEnergyBonus > 0) summary.push({ emoji: "🔋", label: `+${bonuses.maxEnergyBonus} max energy` });
  return summary;
}

export function canAffordStarPath(coins: number, currentLevel: number): boolean {
  const next = getStarPathLevel(currentLevel + 1);
  return coins >= next.cost;
}

export function purchaseStarPath(
  coins: number,
  currentLevel: number,
): { newCoins: number; newLevel: number } | null {
  const next = getStarPathLevel(currentLevel + 1);
  if (coins < next.cost) return null;
  return { newCoins: coins - next.cost, newLevel: currentLevel + 1 };
}

export function loadStarPathLevel(): number {
  return safe<number>("mq-star-path-level", 0);
}

export function saveStarPathLevel(level: number): void {
  store("mq-star-path-level", level);
}

export function getEffectiveMaxEnergy(bonuses: StarPathBonuses, labBonuses?: LabBonuses): number {
  return MAX_ENERGY + bonuses.maxEnergyBonus + (labBonuses?.energyCapacity ?? 0);
}

export function getEffectiveRegenMs(bonuses: StarPathBonuses, labBonuses?: LabBonuses): number {
  return Math.max(20_000, ENERGY_REGEN_MS - bonuses.energyRegenReduction - (labBonuses?.regenReduction ?? 0));
}

// ── Lab Equipment Research System ─────────────────────

export type EquipmentId = "scanner" | "amplifier" | "reactor" | "processor" | "matrix" | "beacon";

export interface EquipmentCategory {
  id: EquipmentId;
  name: string;
  emoji: string;
  bonusLabel: (level: number) => string;
}

export interface ResearchState {
  activeResearch: EquipmentId | null;
  startedAt: number;
  baseDurationMs: number;
  playAcceleration: number;
}

export interface LabState {
  levels: Record<EquipmentId, number>;
  research: ResearchState;
}

export interface LabBonuses {
  coinMultiplier: number;
  comboMultiplier: number;
  energyCapacity: number;
  regenReduction: number;
  matchEnergyRefund: number;
  boardClearCoinBonus: number;
}

export const EQUIPMENT_CATEGORIES: EquipmentCategory[] = [
  { id: "scanner",   name: "Scanner",   emoji: "🔬", bonusLabel: (l) => `+${l * 3}% coins` },
  { id: "amplifier", name: "Amplifier", emoji: "⚡", bonusLabel: (l) => `+${l * 5}% combo` },
  { id: "reactor",   name: "Reactor",   emoji: "🔋", bonusLabel: (l) => `+${l * 2} max energy` },
  { id: "processor", name: "Processor", emoji: "⏱️", bonusLabel: (l) => `-${(l * 0.8).toFixed(1)}s regen` },
  { id: "matrix",    name: "Matrix",    emoji: "🧩", bonusLabel: (l) => `+${l} match energy` },
  { id: "beacon",    name: "Beacon",    emoji: "🎯", bonusLabel: (l) => `+${l * 20} clear bonus` },
];

const EQUIPMENT_IDS: EquipmentId[] = ["scanner", "amplifier", "reactor", "processor", "matrix", "beacon"];

export function getEquipmentInfo(id: EquipmentId, level: number): { name: string; emoji: string } {
  const cat = EQUIPMENT_CATEGORIES.find((c) => c.id === id)!;
  if (level === 0) return { name: cat.name, emoji: cat.emoji };
  const prefixIdx = (level - 1) % PREFIXES.length;
  const tier = Math.floor((level - 1) / PREFIXES.length);
  const tierSuffix = tier > 0 ? ` Mk.${tier + 1}` : "";
  return {
    name: `${PREFIXES[prefixIdx]} ${cat.name}${tierSuffix}`,
    emoji: cat.emoji,
  };
}

export function getResearchCost(targetLevel: number): number {
  return Math.floor(150 * Math.pow(1.6, targetLevel - 1));
}

export function getResearchDuration(targetLevel: number): number {
  return Math.floor(5 * 60_000 * Math.pow(1.4, targetLevel - 1));
}

export function getRushCost(remainingMs: number): number {
  return Math.max(10, Math.floor(remainingMs / 6000));
}

export function createDefaultLabState(): LabState {
  return {
    levels: { scanner: 0, amplifier: 0, reactor: 0, processor: 0, matrix: 0, beacon: 0 },
    research: { activeResearch: null, startedAt: 0, baseDurationMs: 0, playAcceleration: 0 },
  };
}

export function loadLabState(): LabState {
  return safe<LabState>("mq-lab-state", createDefaultLabState());
}

export function saveLabState(state: LabState): void {
  store("mq-lab-state", state);
}

export function startResearch(
  state: LabState,
  id: EquipmentId,
  coins: number,
): { newState: LabState; newCoins: number } | null {
  if (state.research.activeResearch) return null;
  const targetLevel = state.levels[id] + 1;
  const cost = getResearchCost(targetLevel);
  if (coins < cost) return null;
  return {
    newState: {
      ...state,
      research: {
        activeResearch: id,
        startedAt: Date.now(),
        baseDurationMs: getResearchDuration(targetLevel),
        playAcceleration: 0,
      },
    },
    newCoins: coins - cost,
  };
}

export function accelerateResearch(state: LabState, reductionMs: number): LabState {
  if (!state.research.activeResearch) return state;
  return {
    ...state,
    research: {
      ...state.research,
      playAcceleration: state.research.playAcceleration + reductionMs,
    },
  };
}

export function getResearchTimeRemaining(state: LabState): number {
  if (!state.research.activeResearch) return 0;
  const elapsed = Date.now() - state.research.startedAt;
  return Math.max(0, state.research.baseDurationMs - elapsed - state.research.playAcceleration);
}

export function getResearchProgress(state: LabState): number {
  if (!state.research.activeResearch || state.research.baseDurationMs === 0) return 0;
  const remaining = getResearchTimeRemaining(state);
  return Math.min(1, 1 - remaining / state.research.baseDurationMs);
}

export function isResearchComplete(state: LabState): boolean {
  if (!state.research.activeResearch) return false;
  return getResearchTimeRemaining(state) <= 0;
}

export function completeResearch(state: LabState): LabState {
  const id = state.research.activeResearch;
  if (!id) return state;
  return {
    levels: { ...state.levels, [id]: state.levels[id] + 1 },
    research: { activeResearch: null, startedAt: 0, baseDurationMs: 0, playAcceleration: 0 },
  };
}

export function rushResearch(
  state: LabState,
  coins: number,
): { newState: LabState; newCoins: number } | null {
  if (!state.research.activeResearch) return null;
  const remaining = getResearchTimeRemaining(state);
  if (remaining <= 0) return null;
  const cost = getRushCost(remaining);
  if (coins < cost) return null;
  return {
    newState: completeResearch(state),
    newCoins: coins - cost,
  };
}

export function getLabBonuses(state: LabState): LabBonuses {
  const bonuses: LabBonuses = {
    coinMultiplier: 0,
    comboMultiplier: 0,
    energyCapacity: 0,
    regenReduction: 0,
    matchEnergyRefund: 0,
    boardClearCoinBonus: 0,
  };
  bonuses.coinMultiplier = state.levels.scanner * 0.03;
  bonuses.comboMultiplier = state.levels.amplifier * 0.05;
  bonuses.energyCapacity = state.levels.reactor * 2;
  bonuses.regenReduction = state.levels.processor * 800;
  bonuses.matchEnergyRefund = state.levels.matrix;
  bonuses.boardClearCoinBonus = state.levels.beacon * 20;
  return bonuses;
}

export function getTotalLabLevel(state: LabState): number {
  return EQUIPMENT_IDS.reduce((sum, id) => sum + state.levels[id], 0);
}

export function getLabBonusSummary(state: LabState): { emoji: string; label: string }[] {
  const summary: { emoji: string; label: string }[] = [];
  for (const cat of EQUIPMENT_CATEGORIES) {
    const level = state.levels[cat.id];
    if (level > 0) {
      summary.push({ emoji: cat.emoji, label: cat.bonusLabel(level) });
    }
  }
  return summary;
}
