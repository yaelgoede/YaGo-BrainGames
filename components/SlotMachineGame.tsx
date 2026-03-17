"use client";

import type { SlotResult } from "@/lib/games/memory-quest-shop";
import { SLOT_SYMBOL_EMOJIS, type SlotSymbol } from "@/lib/games/memory-quest-shop";

const SCROLL_EMOJIS: SlotSymbol[] = ["seven", "cherry", "coin", "diamond", "skull"];

interface SlotMachineGameProps {
  slotResult: SlotResult | null;
  slotSpinning: boolean;
  slotReelsStopped: boolean[];
  onPull: () => void;
  onContinue: () => void;
}

export default function SlotMachineGame({
  slotResult,
  slotSpinning,
  slotReelsStopped,
  onPull,
  onContinue,
}: SlotMachineGameProps) {
  return (
    <div className="animate-bounce-in flex flex-col items-center gap-6 py-6">
      <h2 className="gradient-gold text-glow-gold text-3xl font-extrabold">🎰 Slot Machine</h2>
      <p className="text-base text-gray-400">Match symbols to win — triple 7s for the jackpot!</p>

      {/* Reels */}
      <div
        className={`flex items-center gap-3 rounded-2xl bg-gray-900 px-6 py-5 shadow-xl ${
          slotResult?.isJackpot ? "animate-slot-jackpot" : ""
        }`}
      >
        {[0, 1, 2].map((i) => {
          const stopped = slotReelsStopped[i];
          const symbol = slotResult?.reels[i];
          const isMatch = slotResult && slotResult.matchCount >= 2 && symbol === slotResult.reels[0];

          return (
            <div
              key={i}
              className={`h-24 w-24 overflow-hidden rounded-xl transition-all ${
                stopped && symbol
                  ? isMatch
                    ? "bg-gold-500/20 shadow-md glow-bloom-gold"
                    : "bg-white/10"
                  : "bg-white/10"
              }`}
            >
              {slotSpinning && !stopped ? (
                <div className="animate-reel-scroll flex flex-col items-center justify-center">
                  {SCROLL_EMOJIS.concat(SCROLL_EMOJIS).map((sym, j) => (
                    <div key={j} className="flex h-24 w-24 shrink-0 items-center justify-center text-4xl">
                      {SLOT_SYMBOL_EMOJIS[sym]}
                    </div>
                  ))}
                </div>
              ) : (
                <div className={`flex h-24 w-24 items-center justify-center text-4xl ${stopped ? "animate-reel-land" : ""}`}>
                  {stopped && symbol
                    ? SLOT_SYMBOL_EMOJIS[symbol]
                    : "🎰"}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Pull or Result */}
      {!slotResult && !slotSpinning && (
        <button
          onClick={onPull}
          className="gradient-btn animate-gradient w-full max-w-sm rounded-2xl bg-[length:200%_200%] py-4 text-xl font-extrabold text-white shadow-lg transition"
        >
          Pull!
        </button>
      )}

      {slotSpinning && (
        <p className="text-lg font-bold text-gray-400">Spinning...</p>
      )}

      {slotResult && (
        <div className="animate-reward-reveal flex flex-col items-center gap-3">
          <div
            className={`rounded-2xl px-6 py-4 text-center shadow-lg ${
              slotResult.isJackpot
                ? "animate-glow-gold reward-frame"
                : slotResult.reward.coins === 0 && slotResult.reward.energy === 0
                  ? "border-2 border-red-500/50 bg-red-500/10"
                  : slotResult.matchCount === 3
                    ? "border-2 border-purple-500/50 bg-purple-500/10"
                    : "border-2 border-blue-500/50 bg-blue-500/10"
            }`}
          >
            <p className="text-lg font-bold">
              {slotResult.isJackpot
                ? "🎉 JACKPOT!"
                : slotResult.reward.coins === 0 && slotResult.reward.energy === 0
                  ? "💀 Bust!"
                  : slotResult.matchCount === 3
                    ? "Triple Match!"
                    : slotResult.matchCount === 2
                      ? "Double Match!"
                      : "Consolation Prize"}
            </p>
            {(slotResult.reward.coins > 0 || slotResult.reward.energy > 0) && (
              <div className="mt-2 flex items-center justify-center gap-3">
                {slotResult.reward.coins > 0 && (
                  <span className="font-bold">🪙 +{slotResult.reward.coins}</span>
                )}
                {slotResult.reward.energy > 0 && (
                  <span className="font-bold">⚡ +{slotResult.reward.energy}</span>
                )}
                {slotResult.reward.triggerEvent && (
                  <span className="font-bold">🌟 Event!</span>
                )}
              </div>
            )}
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
