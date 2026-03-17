"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { TreasureChest as TreasureChestType } from "@/lib/games/memory-quest-shop";
import { CHEST_RARITY_COLORS, CHEST_RARITY_LABELS } from "@/lib/games/memory-quest-shop";

interface TreasureChestGameProps {
  chests: TreasureChestType[];
  openedIndex: number | null;
  coins: number;
  onPick: (index: number) => void;
  onContinue: () => void;
  onPlayAgain: () => void;
}

export default function TreasureChestGame({
  chests,
  openedIndex,
  coins,
  onPick,
  onContinue,
  onPlayAgain,
}: TreasureChestGameProps) {
  const [autoPlay, setAutoPlay] = useState(false);
  const [sessionNet, setSessionNet] = useState(0);
  const autoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onPlayAgainRef = useRef(onPlayAgain);
  onPlayAgainRef.current = onPlayAgain;
  const onPickRef = useRef(onPick);
  onPickRef.current = onPick;
  const COST = 150;

  const canAfford = coins >= COST;

  // Track session profit/loss
  useEffect(() => {
    if (openedIndex !== null && chests[openedIndex]) {
      setSessionNet((prev) => prev + chests[openedIndex].reward.coins - COST);
    }
  }, [openedIndex, chests]);

  // Auto-play: after result shown, wait 1.5s then play again
  useEffect(() => {
    if (autoPlay && openedIndex !== null && chests[openedIndex]) {
      if (!canAfford) {
        setAutoPlay(false);
        return;
      }
      autoTimerRef.current = setTimeout(() => {
        onPlayAgainRef.current();
      }, 1500);
      return () => {
        if (autoTimerRef.current) clearTimeout(autoTimerRef.current);
      };
    }
  }, [autoPlay, openedIndex, chests, canAfford]);

  // Auto-pick after reset (when chests refresh during auto-play)
  useEffect(() => {
    if (autoPlay && openedIndex === null && chests.length > 0) {
      const t = setTimeout(() => {
        // Pick a random chest
        const idx = Math.floor(Math.random() * chests.length);
        onPickRef.current(idx);
      }, 300);
      return () => clearTimeout(t);
    }
  }, [autoPlay, openedIndex, chests]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (autoTimerRef.current) clearTimeout(autoTimerRef.current);
    };
  }, []);

  const toggleAuto = useCallback(() => {
    setAutoPlay((prev) => !prev);
  }, []);

  return (
    <div className="animate-bounce-in flex flex-col items-center gap-6 py-6">
      <h2 className="gradient-gold text-glow-gold text-3xl font-extrabold">📦 Treasure Chest</h2>
      <p className="text-base text-gray-400">Pick a chest — every one has a prize!</p>
      <div className="coin-badge rounded-full px-4 py-1.5 text-sm font-bold">
        <span>🪙</span> <span className="text-yellow-300">{coins.toLocaleString()}</span>
      </div>

      {/* Session net counter */}
      {sessionNet !== 0 && (
        <div className={`rounded-xl px-4 py-1.5 text-sm font-bold ${
          sessionNet > 0
            ? "bg-green-500/15 text-green-400"
            : "bg-red-500/15 text-red-400"
        }`}>
          Session: {sessionNet > 0 ? "+" : ""}{sessionNet} 🪙
        </div>
      )}

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

      {/* Auto toggle (shown before opening) */}
      {openedIndex === null && chests.length > 0 && (
        <button
          onClick={toggleAuto}
          className={`rounded-2xl px-5 py-2 text-sm font-bold transition ${
            autoPlay
              ? "animate-auto-play-pulse bg-green-500/30 text-green-300 border border-green-500/50"
              : "bg-white/10 text-gray-400 hover:bg-white/15"
          }`}
        >
          {autoPlay ? "Stop Auto" : "Auto"}
        </button>
      )}

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

          {!autoPlay && (
            <div className="flex w-full max-w-sm gap-3">
              <button
                onClick={onContinue}
                className="gradient-btn flex-1 rounded-2xl py-3 text-lg font-bold text-white shadow-lg"
              >
                Continue
              </button>
              {canAfford && (
                <button
                  onClick={onPlayAgain}
                  className="rounded-2xl bg-white/10 px-5 py-3 text-sm font-bold text-gray-300 transition hover:bg-white/15"
                >
                  Again 🪙{COST}
                </button>
              )}
            </div>
          )}

          {autoPlay && (
            <div className="flex items-center gap-3">
              <p className="text-sm text-gray-500">
                {canAfford ? "Next chest in a moment..." : "Out of coins!"}
              </p>
              <button
                onClick={toggleAuto}
                className="rounded-xl bg-red-500/20 px-4 py-2 text-sm font-bold text-red-400 border border-red-500/40 transition hover:bg-red-500/30"
              >
                Stop
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
