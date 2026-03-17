"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { SlotResult } from "@/lib/games/memory-quest-shop";
import { SLOT_SYMBOL_EMOJIS, type SlotSymbol } from "@/lib/games/memory-quest-shop";

const SCROLL_EMOJIS: SlotSymbol[] = ["seven", "cherry", "coin", "diamond", "skull"];

interface SlotMachineGameProps {
  slotResult: SlotResult | null;
  slotSpinning: boolean;
  slotReelsStopped: boolean[];
  coins: number;
  onPull: () => void;
  onContinue: () => void;
  onPlayAgain: () => void;
}

export default function SlotMachineGame({
  slotResult,
  slotSpinning,
  slotReelsStopped,
  coins,
  onPull,
  onContinue,
  onPlayAgain,
}: SlotMachineGameProps) {
  const [autoPlay, setAutoPlay] = useState(false);
  const [sessionNet, setSessionNet] = useState(0);
  const autoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasStartedRef = useRef(false);
  const onPlayAgainRef = useRef(onPlayAgain);
  onPlayAgainRef.current = onPlayAgain;
  const onPullRef = useRef(onPull);
  onPullRef.current = onPull;
  const COST = 300;

  const canAfford = coins >= COST;

  // Track session profit/loss (only after all reels stop)
  useEffect(() => {
    if (slotResult && !slotSpinning) {
      setSessionNet((prev) => prev + slotResult.reward.coins - COST);
    }
  }, [slotResult, slotSpinning]);

  // Auto-play: after result shown, wait 1.5s then play again
  useEffect(() => {
    if (autoPlay && slotResult && !slotSpinning) {
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
  }, [autoPlay, slotResult, slotSpinning, canAfford]);

  // Auto-pull after reset (when slotResult becomes null during auto-play)
  useEffect(() => {
    if (autoPlay && !slotResult && !slotSpinning && hasStartedRef.current) {
      const t = setTimeout(() => onPullRef.current(), 300);
      return () => clearTimeout(t);
    }
    if (slotResult) hasStartedRef.current = true;
  }, [autoPlay, slotResult, slotSpinning]);

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
      <h2 className="gradient-gold text-glow-gold text-3xl font-extrabold">🎰 Slot Machine</h2>
      <p className="text-base text-gray-400">Match symbols to win — triple 7s for the jackpot!</p>
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
                  {(() => {
                    const resultSymbol = slotResult?.reels[i];
                    // Build scroll list that includes the actual result symbol
                    const scrollList = resultSymbol
                      ? [...SCROLL_EMOJIS.filter(s => s !== resultSymbol), resultSymbol, ...SCROLL_EMOJIS.filter(s => s !== resultSymbol), resultSymbol]
                      : SCROLL_EMOJIS.concat(SCROLL_EMOJIS);
                    return scrollList.map((sym, j) => (
                      <div key={j} className="flex h-24 w-24 shrink-0 items-center justify-center text-4xl">
                        {SLOT_SYMBOL_EMOJIS[sym]}
                      </div>
                    ));
                  })()}
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
        <div className="flex w-full max-w-sm gap-3">
          <button
            onClick={onPull}
            className="gradient-btn animate-gradient flex-1 rounded-2xl bg-[length:200%_200%] py-4 text-xl font-extrabold text-white shadow-lg transition"
          >
            Pull!
          </button>
          <button
            onClick={toggleAuto}
            className={`rounded-2xl px-5 py-4 text-sm font-bold transition ${
              autoPlay
                ? "animate-auto-play-pulse bg-green-500/30 text-green-300 border border-green-500/50"
                : "bg-white/10 text-gray-400 hover:bg-white/15"
            }`}
          >
            {autoPlay ? "Stop" : "Auto"}
          </button>
        </div>
      )}

      {slotSpinning && (
        <div className="flex w-full max-w-sm items-center justify-between">
          <p className="text-lg font-bold text-gray-400">Spinning...</p>
          {autoPlay && (
            <button
              onClick={toggleAuto}
              className="rounded-xl bg-red-500/20 px-4 py-2 text-sm font-bold text-red-400 border border-red-500/40 transition hover:bg-red-500/30"
            >
              Stop
            </button>
          )}
        </div>
      )}

      {slotResult && !slotSpinning && (
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
                {canAfford ? "Next spin in a moment..." : "Out of coins!"}
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
