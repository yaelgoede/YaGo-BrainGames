"use client";

import type { TreasureChest as TreasureChestType } from "@/lib/games/memory-quest-shop";
import { CHEST_RARITY_COLORS, CHEST_RARITY_LABELS } from "@/lib/games/memory-quest-shop";

interface TreasureChestGameProps {
  chests: TreasureChestType[];
  openedIndex: number | null;
  onPick: (index: number) => void;
  onContinue: () => void;
}

export default function TreasureChestGame({
  chests,
  openedIndex,
  onPick,
  onContinue,
}: TreasureChestGameProps) {
  return (
    <div className="animate-bounce-in flex flex-col items-center gap-6 py-6">
      <h2 className="gradient-gold text-glow-gold text-3xl font-extrabold">📦 Treasure Chest</h2>
      <p className="text-base text-gray-400">Pick a chest — every one has a prize!</p>

      <div className="flex gap-4">
        {chests.map((chest, i) => {
          const isSelected = openedIndex === i;
          const isOther = openedIndex !== null && openedIndex !== i;

          return (
            <button
              key={chest.id}
              onClick={() => onPick(i)}
              disabled={openedIndex !== null}
              className={`relative flex h-32 w-28 flex-col items-center justify-center rounded-2xl text-center transition ${
                isSelected
                  ? "animate-chest-open shadow-xl"
                  : isOther
                    ? "animate-chest-fade"
                    : "animate-chest-wiggle cursor-pointer hover:scale-105"
              } ${
                isSelected
                  ? "border-2 bg-white/5"
                  : "bg-gradient-to-b from-purple-700 to-purple-900 shadow-lg"
              }`}
              style={isSelected ? { borderColor: CHEST_RARITY_COLORS[chest.rarity] } : undefined}
            >
              {isSelected ? (
                <>
                  <div className="animate-chest-sparkle pointer-events-none absolute inset-0 rounded-2xl border-2 border-gold-400/50" />
                  <span className="text-3xl">{chest.reward.triggerEvent ? "⭐" : chest.reward.coins > 0 ? "🪙" : "⚡"}</span>
                  <span
                    className="mt-1 text-xs font-bold"
                    style={{ color: CHEST_RARITY_COLORS[chest.rarity] }}
                  >
                    {CHEST_RARITY_LABELS[chest.rarity]}
                  </span>
                </>
              ) : (
                <>
                  <span className="text-4xl">📦</span>
                  <span className="mt-1 text-xs font-bold text-white">#{i + 1}</span>
                </>
              )}
            </button>
          );
        })}
      </div>

      {/* Opened chest result */}
      {openedIndex !== null && chests[openedIndex] && (
        <div className="animate-reward-reveal flex flex-col items-center gap-3">
          <div
            className="rounded-2xl border-2 px-6 py-4 text-center shadow-lg"
            style={{ borderColor: CHEST_RARITY_COLORS[chests[openedIndex].rarity], backgroundColor: `${CHEST_RARITY_COLORS[chests[openedIndex].rarity]}15` }}
          >
            <p className="text-lg font-bold" style={{ color: CHEST_RARITY_COLORS[chests[openedIndex].rarity] }}>
              {CHEST_RARITY_LABELS[chests[openedIndex].rarity]} Chest!
            </p>
            <div className="mt-2 flex items-center justify-center gap-3">
              {chests[openedIndex].reward.coins > 0 && (
                <span className="font-bold">🪙 +{chests[openedIndex].reward.coins}</span>
              )}
              {chests[openedIndex].reward.energy > 0 && (
                <span className="font-bold">⚡ +{chests[openedIndex].reward.energy}</span>
              )}
              {chests[openedIndex].reward.triggerEvent && (
                <span className="font-bold">🌟 Event!</span>
              )}
            </div>
          </div>
          <button
            onClick={onContinue}
            className="gradient-btn w-full max-w-sm rounded-2xl py-3 text-lg font-bold text-white shadow-lg"
          >
            Continue
          </button>
        </div>
      )}
    </div>
  );
}
