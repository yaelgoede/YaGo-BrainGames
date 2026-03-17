"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { CoinFlipChoice, CoinFlipResult } from "@/lib/games/memory-quest-shop";

interface CoinFlipGameProps {
  coinFlipChoice: CoinFlipChoice | null;
  coinFlipResult: CoinFlipResult | null;
  coinFlipAnimating: boolean;
  coins: number;
  onPick: (choice: CoinFlipChoice) => void;
  onContinue: () => void;
  onPlayAgain: () => void;
}

export default function CoinFlipGame({
  coinFlipChoice,
  coinFlipResult,
  coinFlipAnimating,
  coins,
  onPick,
  onContinue,
  onPlayAgain,
}: CoinFlipGameProps) {
  const [autoPlay, setAutoPlay] = useState(false);
  const [autoChoice, setAutoChoice] = useState<CoinFlipChoice | null>(null);
  const [sessionNet, setSessionNet] = useState(0);
  const autoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onPlayAgainRef = useRef(onPlayAgain);
  onPlayAgainRef.current = onPlayAgain;
  const onPickRef = useRef(onPick);
  onPickRef.current = onPick;
  const COST = 50;

  const canAfford = coins >= COST;

  // Track session profit/loss
  useEffect(() => {
    if (coinFlipResult) {
      setSessionNet((prev) => prev + coinFlipResult.reward.coins - COST);
    }
  }, [coinFlipResult]);

  // Auto-play: after result shown, wait 1.5s then play again
  useEffect(() => {
    if (autoPlay && coinFlipResult && !coinFlipAnimating && autoChoice) {
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
  }, [autoPlay, coinFlipResult, coinFlipAnimating, canAfford, autoChoice]);

  // Auto-pick after reset (when coinFlipResult becomes null during auto-play)
  useEffect(() => {
    if (autoPlay && !coinFlipResult && !coinFlipAnimating && autoChoice) {
      const t = setTimeout(() => onPickRef.current(autoChoice), 300);
      return () => clearTimeout(t);
    }
  }, [autoPlay, coinFlipResult, coinFlipAnimating, autoChoice]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (autoTimerRef.current) clearTimeout(autoTimerRef.current);
    };
  }, []);

  const handlePickWithAuto = useCallback((choice: CoinFlipChoice) => {
    setAutoChoice(choice);
    onPick(choice);
  }, [onPick]);

  const toggleAuto = useCallback(() => {
    setAutoPlay((prev) => {
      if (prev) setAutoChoice(null);
      return !prev;
    });
  }, []);

  return (
    <div className="animate-bounce-in flex flex-col items-center gap-6 py-6">
      <h2 className="gradient-gold text-glow-gold text-3xl font-extrabold">🪙 Coin Flip</h2>
      <p className="text-base text-gray-400">Pick a side — 50/50 shot!</p>
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
        <div className="flex flex-col items-center gap-3">
          <div className="flex gap-4">
            <button
              onClick={() => handlePickWithAuto("heads")}
              className="rounded-2xl coin-badge px-8 py-4 text-center transition hover:brightness-110"
            >
              <span className="block text-3xl">👑</span>
              <span className="mt-1 block text-sm font-bold text-yellow-300">Heads</span>
            </button>
            <button
              onClick={() => handlePickWithAuto("tails")}
              className="rounded-2xl bg-purple-500/20 border border-purple-500/30 px-8 py-4 text-center transition hover:bg-purple-500/30"
            >
              <span className="block text-3xl">🛡️</span>
              <span className="mt-1 block text-sm font-bold text-purple-300">Tails</span>
            </button>
          </div>
          {autoChoice && (
            <button
              onClick={toggleAuto}
              className={`rounded-2xl px-5 py-2 text-sm font-bold transition ${
                autoPlay
                  ? "animate-auto-play-pulse bg-green-500/30 text-green-300 border border-green-500/50"
                  : "bg-white/10 text-gray-400 hover:bg-white/15"
              }`}
            >
              {autoPlay ? "Stop Auto" : `Auto (${autoChoice === "heads" ? "👑" : "🛡️"})`}
            </button>
          )}
        </div>
      )}

      {coinFlipAnimating && (
        <div className="flex items-center gap-3">
          <p className="text-lg font-bold text-gray-400">Flipping...</p>
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
                {canAfford ? "Next flip in a moment..." : "Out of coins!"}
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
