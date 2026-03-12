import { shuffle } from "@/lib/utils";

const WORDS = [
  "brain", "puzzle", "logic", "memory", "focus", "think", "solve", "learn",
  "quick", "sharp", "smart", "clever", "bright", "agile", "alert", "aware",
  "grasp", "skill", "train", "power", "boost", "spark", "swift", "exact",
  "adapt", "reach", "drive", "quest", "forge", "craft", "blend", "frame",
  "growth", "rhythm", "simple", "change", "create", "method", "reason", "wonder",
];

export function getRandomWord(): string {
  return WORDS[Math.floor(Math.random() * WORDS.length)];
}

export function scrambleWord(word: string): string {
  const scrambled = shuffle(word.split("")).join("");
  return scrambled === word ? scrambleWord(word) : scrambled;
}
