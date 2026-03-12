import { shuffle } from "@/lib/utils";

const WORD_POOL = [
  "apple", "river", "cloud", "stone", "flame", "ocean", "pearl", "frost",
  "eagle", "tiger", "honey", "storm", "field", "dream", "ghost", "light",
  "music", "earth", "coral", "steel", "bloom", "shade", "crown", "drift",
  "spark", "grain", "tower", "shelf", "maple", "orbit", "prism", "quest",
  "ridge", "solar", "trace", "unity", "vivid", "watch", "yield", "zesty",
];

export function pickWords(count: number): string[] {
  return shuffle(WORD_POOL).slice(0, count);
}

export function buildTestRound(
  seenWords: string[],
  allPoolWords: string[],
  count: number
): { word: string; wasSeen: boolean }[] {
  const unseenPool = allPoolWords.filter((w) => !seenWords.includes(w));
  const seenCount = Math.min(Math.ceil(count / 2), seenWords.length);
  const unseenCount = count - seenCount;

  const selectedSeen = shuffle(seenWords).slice(0, seenCount);
  const selectedUnseen = shuffle(unseenPool).slice(0, unseenCount);

  const round = [
    ...selectedSeen.map((word) => ({ word, wasSeen: true })),
    ...selectedUnseen.map((word) => ({ word, wasSeen: false })),
  ];

  return shuffle(round);
}

export { WORD_POOL };
