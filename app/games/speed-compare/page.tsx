"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import GameShell from "@/components/GameShell";
import DifficultySelector from "@/components/DifficultySelector";
import { generatePair, getCorrectSide, type NumberPair } from "@/lib/games/speed-compare";
import { type Difficulty, DIFFICULTY_OFFSET, getSavedDifficulty, saveDifficulty } from "@/lib/difficulty";
import { playSound } from "@/lib/sounds";

const GAME_ID = "speed-compare";
const GAME_DURATION = 60;

type Phase = "idle" | "playing" | "over";

export default function SpeedComparePage() {
  const [difficulty, setDifficulty] = useState<Difficulty>(() => getSavedDifficulty(GAME_ID));
  const [pair, setPair] = useState<NumberPair>(() => generatePair(1));
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [phase, setPhase] = useState<Phase>("idle");
  const [flash, setFlash] = useState<"left" | "right" | null>(null);
  const flashTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const offset = DIFFICULTY_OFFSET[difficulty];

  useEffect(() => {
    if (phase !== "playing") return;
    if (timeLeft <= 0) {
      playSound("gameOver");
      setPhase("over");
      return;
    }
    const timer = setTimeout(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearTimeout(timer);
  }, [timeLeft, phase]);

  useEffect(() => {
    return () => {
      if (flashTimeout.current) clearTimeout(flashTimeout.current);
    };
  }, []);

  const start = useCallback(() => {
    setPhase("playing");
    setScore(0);
    setTimeLeft(GAME_DURATION);
    setPair(generatePair(1 + offset));
    setFlash(null);
  }, [offset]);

  const handlePick = useCallback((side: "left" | "right") => {
    if (flash) return;

    const correct = getCorrectSide(pair);
    if (side === correct) {
      playSound("correct");
      const newScore = score + 1;
      setScore(newScore);
      setFlash(side);
      if (flashTimeout.current) clearTimeout(flashTimeout.current);
      flashTimeout.current = setTimeout(() => {
        setFlash(null);
        setPair(generatePair(Math.floor(newScore / 5) + 1 + offset));
      }, 300);
    } else {
      playSound("wrong");
      playSound("gameOver");
      setPhase("over");
    }
  }, [flash, pair, score, offset]);

  const handleDifficulty = (d: Difficulty) => {
    setDifficulty(d);
    saveDifficulty(GAME_ID, d);
  };

  // Keyboard: arrow keys / a,d to pick
  useEffect(() => {
    if (phase !== "playing") return;
    const handler = (e: KeyboardEvent) => {
      if (flash) return;
      if (e.key === "ArrowLeft" || e.key === "a") handlePick("left");
      if (e.key === "ArrowRight" || e.key === "d") handlePick("right");
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [phase, flash, handlePick]);

  // Enter to start from idle
  useEffect(() => {
    if (phase !== "idle") return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Enter") start();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [phase, start]);

  return (
    <GameShell
      gameId={GAME_ID}
      title="Speed Compare"
      score={score}
      onRestart={start}
      showTimer={phase === "playing"}
      timeLeft={timeLeft}
      instructions="Two numbers appear — tap the larger one! Get it wrong and the game is over. Use arrow keys or A/D."
      difficulty={difficulty}
      flash={flash ? "correct" as const : null}
    >
      {phase === "idle" && (
        <div className="flex flex-col items-center gap-4 py-12">
          <p className="text-gray-500">Tap the bigger number as fast as you can!</p>
          <DifficultySelector difficulty={difficulty} onChange={handleDifficulty} />
          <button
            onClick={start}
            className="rounded-xl bg-gray-900 px-8 py-3 text-lg font-medium text-white hover:bg-gray-700"
          >
            Start
          </button>
          <p className="text-xs text-gray-400">or press Enter</p>
        </div>
      )}

      {phase === "over" && (
        <div className="flex flex-col items-center gap-4 py-12">
          <div className="rounded-lg bg-green-50 p-6 text-center">
            <p className="text-2xl font-bold text-green-700">{score} correct</p>
            <p className="text-green-600">streak in {GAME_DURATION - timeLeft} seconds</p>
          </div>
        </div>
      )}

      {phase === "playing" && (
        <div className="flex flex-col items-center gap-6 py-8">
          <p className="text-sm text-gray-400">Tap the larger number</p>
          <div className="flex gap-6">
            {(["left", "right"] as const).map((side) => (
              <button
                key={side}
                onClick={() => handlePick(side)}
                className={`flex h-36 w-36 flex-col items-center justify-center rounded-2xl border-2 transition-all duration-150
                  ${flash === side
                    ? "border-green-400 bg-green-50 scale-105 text-green-700"
                    : "border-gray-200 bg-white text-gray-900 hover:border-gray-400 hover:scale-102"
                  }`}
              >
                <span className="text-4xl font-bold">{pair[side]}</span>
                <span className="mt-1 text-xs text-gray-400">
                  {side === "left" ? "← or A" : "→ or D"}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </GameShell>
  );
}
