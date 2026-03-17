"use client";

import type { CoinFlipChoice, CoinFlipResult } from "@/lib/games/memory-quest-shop";

interface CoinFlipGameProps {
  coinFlipChoice: CoinFlipChoice | null;
  coinFlipResult: CoinFlipResult | null;
  coinFlipAnimating: boolean;
  onPick: (choice: CoinFlipChoice) => void;
  onContinue: () => void;
}

export default function CoinFlipGame({
  coinFlipChoice,
  coinFlipResult,
  coinFlipAnimating,
  onPick,
  onContinue,
}: CoinFlipGameProps) {
  return (
    <div className="animate-bounce-in flex flex-col items-center gap-6 py-6">
      <h2 className="gradient-gold text-glow-gold text-3xl font-extrabold">🪙 Coin Flip</h2>
      <p className="text-base text-gray-400">Pick a side — 50/50 shot!</p>

      {/* Coin display */}
      <div
        className={`flex h-32 w-32 items-center justify-center rounded-full text-6xl ${
          coinFlipAnimating ? "animate-coin-toss" : ""
        } ${
          coinFlipResult
            ? coinFlipResult.won
              ? "bg-gold-500/20 shadow-lg glow-bloom-gold"
              : "bg-white/10"
            : "bg-gradient-to-br from-gold-300 to-gold-500 shadow-lg glow-bloom-gold"
        }`}
        style={{ perspective: "600px" }}
      >
        {coinFlipResult
          ? coinFlipResult.outcome === "heads" ? "👑" : "🛡️"
          : coinFlipChoice
            ? coinFlipChoice === "heads" ? "👑" : "🛡️"
            : "🪙"}
      </div>

      {/* Choice buttons or result */}
      {!coinFlipResult && !coinFlipAnimating && (
        <div className="flex gap-4">
          <button
            onClick={() => onPick("heads")}
            className="rounded-2xl coin-badge px-8 py-4 text-center transition hover:brightness-110"
          >
            <span className="block text-3xl">👑</span>
            <span className="mt-1 block text-sm font-bold text-yellow-300">Heads</span>
          </button>
          <button
            onClick={() => onPick("tails")}
            className="rounded-2xl bg-purple-500/20 border border-purple-500/30 px-8 py-4 text-center transition hover:bg-purple-500/30"
          >
            <span className="block text-3xl">🛡️</span>
            <span className="mt-1 block text-sm font-bold text-purple-300">Tails</span>
          </button>
        </div>
      )}

      {coinFlipAnimating && (
        <p className="text-lg font-bold text-gray-400">Flipping...</p>
      )}

      {coinFlipResult && (
        <div className="animate-reward-reveal flex flex-col items-center gap-3">
          <div
            className={`rounded-2xl px-6 py-4 text-center shadow-lg ${
              coinFlipResult.won
                ? "animate-glow-gold reward-frame"
                : "border-2 border-red-500/50 bg-red-500/10"
            }`}
          >
            <p className="text-lg font-bold">
              {coinFlipResult.won ? "You Won!" : "No luck!"}
            </p>
            <p className="text-sm text-gray-400">
              It was {coinFlipResult.outcome === "heads" ? "👑 Heads" : "🛡️ Tails"}
            </p>
            {coinFlipResult.won && (
              <div className="mt-2 flex items-center justify-center gap-3">
                {coinFlipResult.reward.coins > 0 && (
                  <span className="font-bold">🪙 +{coinFlipResult.reward.coins}</span>
                )}
                {coinFlipResult.reward.energy > 0 && (
                  <span className="font-bold">⚡ +{coinFlipResult.reward.energy}</span>
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
