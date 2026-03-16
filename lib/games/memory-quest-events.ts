// Memory Quest — Lucky Wheel Event (pure functions, no React)

export interface WheelSegment {
  label: string;
  emoji: string;
  coins: number;
  energy: number;
  color: string;
  weight: number;
}

export const WHEEL_SEGMENTS: WheelSegment[] = [
  { label: "+25",   emoji: "🪙", coins: 25,  energy: 0,  color: "#3b82f6", weight: 18 },
  { label: "+24",   emoji: "⚡", coins: 0,   energy: 24, color: "#22c55e", weight: 22 },
  { label: "+50",   emoji: "🪙", coins: 50,  energy: 0,  color: "#6366f1", weight: 15 },
  { label: "+36",   emoji: "⚡", coins: 0,   energy: 36, color: "#10b981", weight: 14 },
  { label: "Bust",  emoji: "💀", coins: 0,   energy: 0,  color: "#ef4444", weight: 10 },
  { label: "+75",   emoji: "🪙", coins: 75,  energy: 0,  color: "#8b5cf6", weight: 8  },
  { label: "+54",   emoji: "⚡", coins: 0,   energy: 54, color: "#14b8a6", weight: 8  },
  { label: "JACKPOT", emoji: "🎰", coins: 200, energy: 60, color: "#eab308", weight: 5 },
];

const TOTAL_WEIGHT = WHEEL_SEGMENTS.reduce((sum, s) => sum + s.weight, 0);

export function spinWheel(): number {
  let roll = Math.random() * TOTAL_WEIGHT;
  for (let i = 0; i < WHEEL_SEGMENTS.length; i++) {
    roll -= WHEEL_SEGMENTS[i].weight;
    if (roll <= 0) return i;
  }
  return WHEEL_SEGMENTS.length - 1;
}

export const SEGMENT_COUNT = WHEEL_SEGMENTS.length;
export const SEGMENT_ANGLE = 360 / SEGMENT_COUNT; // 45 degrees each
