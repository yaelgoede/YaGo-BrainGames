// Memory Quest — Shop & Mini Gambling Games (pure functions, no React)

import { randInt } from "@/lib/utils";
import { safe, store } from "@/lib/storage";

// ── Types ──────────────────────────────────────────────

export type ShopGameType = "coin-flip" | "treasure-chest" | "slot-machine";

export interface ShopItem {
  id: ShopGameType;
  name: string;
  emoji: string;
  description: string;
  cost: number;
  color: string;
}

export interface PackReward {
  coins: number;
  energy: number;
  triggerEvent: boolean;
}

// ── Coin Flip ──────────────────────────────────────────

export type CoinFlipChoice = "heads" | "tails";

export interface CoinFlipResult {
  choice: CoinFlipChoice;
  outcome: CoinFlipChoice;
  won: boolean;
  reward: PackReward;
}

// ── Treasure Chest ─────────────────────────────────────

export type ChestRarity = "common" | "rare" | "legendary";

export interface TreasureChest {
  id: number;
  reward: PackReward;
  rarity: ChestRarity;
  opened: boolean;
}

// ── Slot Machine ───────────────────────────────────────

export type SlotSymbol = "cherry" | "coin" | "diamond" | "seven" | "skull";

export interface SlotResult {
  reels: [SlotSymbol, SlotSymbol, SlotSymbol];
  reward: PackReward;
  matchCount: number; // 0, 2, or 3
  isJackpot: boolean;
}

// ── Constants ──────────────────────────────────────────

export const SHOP_ITEMS: ShopItem[] = [
  {
    id: "coin-flip",
    name: "Coin Flip",
    emoji: "🪙",
    description: "Call it! 50/50 shot to nearly double up",
    cost: 50,
    color: "#eab308",
  },
  {
    id: "treasure-chest",
    name: "Treasure Chest",
    emoji: "📦",
    description: "Pick a chest — guaranteed loot, maybe legendary",
    cost: 150,
    color: "#8b5cf6",
  },
  {
    id: "slot-machine",
    name: "Slot Machine",
    emoji: "🎰",
    description: "Spin the reels for a shot at the jackpot",
    cost: 300,
    color: "#ef4444",
  },
];

export const SLOT_SYMBOL_EMOJIS: Record<SlotSymbol, string> = {
  cherry: "🍒",
  coin: "🪙",
  diamond: "💎",
  seven: "7️⃣",
  skull: "💀",
};

export const CHEST_RARITY_COLORS: Record<ChestRarity, string> = {
  common: "#9ca3af",
  rare: "#3b82f6",
  legendary: "#eab308",
};

export const CHEST_RARITY_LABELS: Record<ChestRarity, string> = {
  common: "Common",
  rare: "Rare",
  legendary: "Legendary",
};

// ── Coin Flip Logic ────────────────────────────────────

export function playCoinFlip(choice: CoinFlipChoice): CoinFlipResult {
  const outcome: CoinFlipChoice = Math.random() < 0.5 ? "heads" : "tails";
  const won = choice === outcome;
  const reward: PackReward = won
    ? generateCoinFlipReward()
    : { coins: 0, energy: 0, triggerEvent: false };
  return { choice, outcome, won, reward };
}

function generateCoinFlipReward(): PackReward {
  // 60% coins, 40% energy
  if (Math.random() < 0.6) {
    return { coins: randInt(120, 240), energy: 0, triggerEvent: false };
  }
  return { coins: 0, energy: randInt(6, 16), triggerEvent: false };
}

// ── Treasure Chest Logic ───────────────────────────────

function pickChestRarity(): ChestRarity {
  const roll = Math.random();
  if (roll < 0.5) return "common";
  if (roll < 0.85) return "rare";
  return "legendary";
}

function generateChestReward(rarity: ChestRarity): PackReward {
  switch (rarity) {
    case "common": {
      const isCoins = Math.random() < 0.6;
      return {
        coins: isCoins ? randInt(100, 200) : 0,
        energy: isCoins ? 0 : randInt(6, 10),
        triggerEvent: false,
      };
    }
    case "rare": {
      const isCoins = Math.random() < 0.5;
      return {
        coins: isCoins ? randInt(240, 400) : 0,
        energy: isCoins ? 0 : randInt(16, 24),
        triggerEvent: false,
      };
    }
    case "legendary": {
      const isCoins = Math.random() < 0.5;
      return {
        coins: isCoins ? randInt(500, 800) : 0,
        energy: isCoins ? 0 : randInt(30, 50),
        triggerEvent: Math.random() < 0.5,
      };
    }
  }
}

export function generateTreasureChests(): TreasureChest[] {
  return [0, 1, 2].map((id) => {
    const rarity = pickChestRarity();
    return { id, rarity, reward: generateChestReward(rarity), opened: false };
  });
}

export function openChest(
  chests: TreasureChest[],
  index: number,
): TreasureChest[] {
  return chests.map((c, i) => (i === index ? { ...c, opened: true } : c));
}

// ── Slot Machine Logic ─────────────────────────────────

const SLOT_WEIGHTS: { symbols: [SlotSymbol, SlotSymbol, SlotSymbol]; weight: number; label: string }[] = [
  // Jackpot — triple 7s (5%)
  { symbols: ["seven", "seven", "seven"], weight: 5, label: "jackpot" },
  // 3 matching (20% total)
  { symbols: ["diamond", "diamond", "diamond"], weight: 5, label: "triple" },
  { symbols: ["coin", "coin", "coin"], weight: 8, label: "triple" },
  { symbols: ["cherry", "cherry", "cherry"], weight: 7, label: "triple" },
  // 2 matching (35% total)
  { symbols: ["diamond", "diamond", "cherry"], weight: 7, label: "double" },
  { symbols: ["coin", "coin", "cherry"], weight: 7, label: "double" },
  { symbols: ["cherry", "cherry", "coin"], weight: 7, label: "double" },
  { symbols: ["seven", "seven", "diamond"], weight: 4, label: "double" },
  { symbols: ["coin", "coin", "skull"], weight: 5, label: "double" },
  { symbols: ["diamond", "diamond", "skull"], weight: 5, label: "double" },
  // No match (35% total)
  { symbols: ["cherry", "coin", "diamond"], weight: 8, label: "none" },
  { symbols: ["cherry", "diamond", "skull"], weight: 7, label: "none" },
  { symbols: ["coin", "diamond", "seven"], weight: 6, label: "none" },
  { symbols: ["skull", "cherry", "coin"], weight: 7, label: "none" },
  // Triple skull bust (5%)
  { symbols: ["skull", "skull", "skull"], weight: 5, label: "bust" },
  { symbols: ["skull", "coin", "seven"], weight: 7, label: "none" },
];

function slotReward(label: string): PackReward {
  switch (label) {
    case "jackpot":
      return {
        coins: randInt(1600, 2400),
        energy: 50,
        triggerEvent: true,
      };
    case "triple":
      return {
        coins: randInt(800, 1200),
        energy: randInt(0, 5) > 3 ? randInt(40, 60) : 0,
        triggerEvent: false,
      };
    case "double":
      return {
        coins: randInt(300, 500),
        energy: Math.random() < 0.3 ? randInt(16, 30) : 0,
        triggerEvent: false,
      };
    case "bust":
      return { coins: 0, energy: 0, triggerEvent: false };
    default: // none
      return { coins: randInt(50, 100), energy: 0, triggerEvent: false };
  }
}

export function generateSlotResult(): SlotResult {
  const totalWeight = SLOT_WEIGHTS.reduce((s, w) => s + w.weight, 0);
  let roll = Math.random() * totalWeight;
  let pick = SLOT_WEIGHTS[0];
  for (const entry of SLOT_WEIGHTS) {
    roll -= entry.weight;
    if (roll <= 0) {
      pick = entry;
      break;
    }
  }

  const reward = slotReward(pick.label);
  const matchCount =
    pick.label === "jackpot" || pick.label === "triple" || pick.label === "bust"
      ? 3
      : pick.label === "double"
        ? 2
        : 0;

  return {
    reels: pick.symbols,
    reward,
    matchCount,
    isJackpot: pick.label === "jackpot",
  };
}

// ── Purchase Helpers ───────────────────────────────────

export function canAffordShopItem(coins: number, item: ShopItem): boolean {
  return coins >= item.cost;
}

export function purchaseShopItem(
  coins: number,
  item: ShopItem,
): number | null {
  if (coins < item.cost) return null;
  return coins - item.cost;
}

// ── Shop Stats (optional persistence) ──────────────────

export interface ShopStats {
  totalSpent: number;
  totalPlayed: number;
}

export function loadShopStats(): ShopStats {
  return safe<ShopStats>("mq-shop-stats", { totalSpent: 0, totalPlayed: 0 });
}

export function saveShopStats(stats: ShopStats): void {
  store("mq-shop-stats", stats);
}

export function recordShopPurchase(cost: number): void {
  const stats = loadShopStats();
  stats.totalSpent += cost;
  stats.totalPlayed += 1;
  saveShopStats(stats);
}
