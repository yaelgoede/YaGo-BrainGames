import { shuffle } from "@/lib/utils";
import type { Difficulty } from "@/lib/difficulty";

const EASY_WORDS = [
  "game", "play", "mind", "fast", "test", "math", "word", "code",
  "find", "sort", "pick", "move", "flip", "jump", "spin", "turn",
];

const MEDIUM_WORDS = [
  "brain", "puzzle", "logic", "memory", "focus", "think", "solve", "learn",
  "quick", "sharp", "smart", "clever", "bright", "agile", "alert", "aware",
  "grasp", "skill", "train", "power", "boost", "spark", "swift", "exact",
  "adapt", "reach", "drive", "quest", "forge", "craft", "blend", "frame",
  "growth", "rhythm", "simple", "change", "create", "method", "reason", "wonder",
];

const HARD_WORDS = [
  "abstract", "strategy", "sequence", "optimize", "navigate", "creative",
  "profound", "generate", "remember", "capacity", "cognitive", "reaction",
  "compound", "evaluate", "discover", "momentum", "practice", "progress",
];

const POOLS: Record<Difficulty, string[]> = {
  easy: EASY_WORDS,
  medium: MEDIUM_WORDS,
  hard: HARD_WORDS,
};

export function getRandomWord(difficulty: Difficulty = "medium"): string {
  const pool = POOLS[difficulty];
  return pool[Math.floor(Math.random() * pool.length)];
}

export function scrambleWord(word: string): string {
  const scrambled = shuffle(word.split("")).join("");
  return scrambled === word ? scrambleWord(word) : scrambled;
}
