// Memory Quest — Streaks, Combos, Daily Challenges & XP/Leveling (pure functions, no React)

import { safe, store } from "@/lib/storage";

// ── Streak System ─────────────────────────────────────
// Consecutive successful matches within a level multiply coin rewards.
// Missing a match resets the streak to 0.

export function getStreakMultiplier(consecutiveMatches: number): number {
  if (consecutiveMatches >= 6) return 4;
  if (consecutiveMatches >= 4) return 3;
  if (consecutiveMatches >= 2) return 2;
  return 1;
}

// ── Time-Based Combo System ──────────────────────────
// Matching 3+ pairs within 5 seconds triggers a combo bonus.

const COMBO_TIME_WINDOW_MS = 5_000;
const COMBO_MIN_MATCHES = 3;
export const COMBO_FLAT_BONUS_COINS = 25;

export interface MatchTimestamp {
  time: number;
}

export function recordMatchTime(history: MatchTimestamp[]): MatchTimestamp[] {
  const now = Date.now();
  const cutoff = now - COMBO_TIME_WINDOW_MS;
  const recent = history.filter((m) => m.time >= cutoff);
  recent.push({ time: now });
  return recent;
}

export function isTimeComboTriggered(history: MatchTimestamp[]): boolean {
  if (history.length < COMBO_MIN_MATCHES) return false;
  const now = Date.now();
  const cutoff = now - COMBO_TIME_WINDOW_MS;
  const recentCount = history.filter((m) => m.time >= cutoff).length;
  return recentCount >= COMBO_MIN_MATCHES;
}

// ── Daily Challenges ─────────────────────────────────
// 3 rotating challenges per day, seeded by date. No backend needed.

export type ChallengeType =
  | "perfect_matches"
  | "complete_level_under_time"
  | "earn_coins_session";

export interface DailyChallenge {
  id: string;
  type: ChallengeType;
  description: string;
  target: number;
  reward: number;
  param?: number; // e.g. level number or time limit
}

export interface DailyChallengeProgress {
  date: string; // YYYY-MM-DD
  completed: string[]; // challenge IDs
  progress: Record<string, number>; // challenge ID → current progress
}

function getDateSeed(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function seededRandom(seed: string): () => number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(31, h) + seed.charCodeAt(i) | 0;
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
    h = Math.imul(h ^ (h >>> 13), 0x45d9f3b);
    h = (h ^ (h >>> 16)) >>> 0;
    return h / 0x100000000;
  };
}

const CHALLENGE_TEMPLATES: {
  type: ChallengeType;
  gen: (rng: () => number) => { description: string; target: number; reward: number; param?: number };
}[] = [
  {
    type: "perfect_matches",
    gen: (rng) => {
      const targets = [5, 8, 10, 15];
      const target = targets[Math.floor(rng() * targets.length)];
      return {
        description: `Match ${target} pairs without a miss`,
        target,
        reward: target <= 8 ? 100 : target <= 10 ? 200 : 300,
      };
    },
  },
  {
    type: "complete_level_under_time",
    gen: (rng) => {
      const levels = [1, 2, 3, 4, 5];
      const level = levels[Math.floor(rng() * levels.length)];
      const times = [90, 75, 60, 45];
      const time = times[Math.floor(rng() * times.length)];
      return {
        description: `Complete Level ${level} under ${time}s`,
        target: 1,
        reward: time <= 45 ? 300 : time <= 60 ? 200 : 100,
        param: level * 1000 + time, // encode level and time
      };
    },
  },
  {
    type: "earn_coins_session",
    gen: (rng) => {
      const amounts = [300, 500, 750, 1000];
      const amount = amounts[Math.floor(rng() * amounts.length)];
      return {
        description: `Earn ${amount} coins in one session`,
        target: amount,
        reward: amount <= 500 ? 150 : amount <= 750 ? 200 : 300,
      };
    },
  },
];

export function getDailyChallenges(): DailyChallenge[] {
  const date = getDateSeed();
  const rng = seededRandom(date);

  const indices = [0, 1, 2];
  // Shuffle to get varied order
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }

  return indices.map((templateIdx, i) => {
    const template = CHALLENGE_TEMPLATES[templateIdx];
    const challenge = template.gen(rng);
    return {
      id: `${date}-${i}`,
      type: template.type,
      ...challenge,
    };
  });
}

export function loadDailyChallengeProgress(): DailyChallengeProgress {
  const today = getDateSeed();
  const saved = safe<DailyChallengeProgress>("mq-daily-challenges", {
    date: today,
    completed: [],
    progress: {},
  });
  if (saved.date !== today) {
    return { date: today, completed: [], progress: {} };
  }
  return saved;
}

export function saveDailyChallengeProgress(progress: DailyChallengeProgress): void {
  store("mq-daily-challenges", progress);
}

export function updateChallengeProgress(
  progress: DailyChallengeProgress,
  challengeId: string,
  newValue: number,
): DailyChallengeProgress {
  if (progress.completed.includes(challengeId)) return progress;
  return {
    ...progress,
    progress: { ...progress.progress, [challengeId]: newValue },
  };
}

export function completeChallengeIfDone(
  progress: DailyChallengeProgress,
  challenge: DailyChallenge,
): { progress: DailyChallengeProgress; justCompleted: boolean } {
  if (progress.completed.includes(challenge.id)) {
    return { progress, justCompleted: false };
  }
  const current = progress.progress[challenge.id] ?? 0;
  if (current >= challenge.target) {
    return {
      progress: {
        ...progress,
        completed: [...progress.completed, challenge.id],
      },
      justCompleted: true,
    };
  }
  return { progress, justCompleted: false };
}

export function decodeLevelTimeParam(param: number): { level: number; timeSeconds: number } {
  return {
    level: Math.floor(param / 1000),
    timeSeconds: param % 1000,
  };
}

// ── Player XP & Leveling ─────────────────────────────
// XP from: level completions, challenges, combos
// Levels 1-50, increasing XP thresholds

export interface PlayerXP {
  xp: number;
  level: number;
}

export function getXPThreshold(level: number): number {
  // Progressive curve: each level needs more XP
  return Math.floor(100 * Math.pow(1.15, level - 1));
}

export function getTotalXPForLevel(level: number): number {
  let total = 0;
  for (let i = 1; i < level; i++) {
    total += getXPThreshold(i);
  }
  return total;
}

export const MAX_PLAYER_LEVEL = 50;

export function addXP(state: PlayerXP, amount: number): { newState: PlayerXP; levelsGained: number } {
  let { xp, level } = state;
  xp += amount;
  let levelsGained = 0;

  while (level < MAX_PLAYER_LEVEL) {
    const threshold = getXPThreshold(level);
    if (xp >= threshold) {
      xp -= threshold;
      level += 1;
      levelsGained += 1;
    } else {
      break;
    }
  }

  if (level >= MAX_PLAYER_LEVEL) {
    level = MAX_PLAYER_LEVEL;
  }

  return { newState: { xp, level }, levelsGained };
}

export function getXPProgress(state: PlayerXP): number {
  if (state.level >= MAX_PLAYER_LEVEL) return 1;
  const threshold = getXPThreshold(state.level);
  return threshold > 0 ? state.xp / threshold : 0;
}

export function getLevelTitle(level: number): string {
  if (level >= 50) return "Grand Master";
  if (level >= 40) return "Master";
  if (level >= 30) return "Expert";
  if (level >= 20) return "Veteran";
  if (level >= 10) return "Apprentice";
  return "Novice";
}

// XP rewards
export const XP_BOARD_CLEAR = 25;
export const XP_CHALLENGE_COMPLETE = 50;
export const XP_COMBO_BONUS = 10; // per time-based combo triggered
export const XP_MATCH = 2;

export function loadPlayerXP(): PlayerXP {
  return safe<PlayerXP>("mq-player-xp", { xp: 0, level: 1 });
}

export function savePlayerXP(state: PlayerXP): void {
  store("mq-player-xp", state);
}

// Level-up bonuses: higher coin cap unlock thresholds
export function getLevelCoinCapBonus(level: number): number {
  return Math.floor(level / 5) * 500;
}
