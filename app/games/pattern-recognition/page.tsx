"use client";

import { useState, useCallback, useEffect } from "react";
import GameShell from "@/components/GameShell";
import DifficultySelector from "@/components/DifficultySelector";
import { generateRound, type PatternRound } from "@/lib/games/pattern-recognition";
import { type Difficulty, DIFFICULTY_OFFSET, getSavedDifficulty, saveDifficulty } from "@/lib/difficulty";
import { playSound } from "@/lib/sounds";

const GAME_ID = "pattern-recognition";

type Phase = "idle" | "playing";

export default function PatternRecognitionPage() {
  const [difficulty, setDifficulty] = useState<Difficulty>(() => getSavedDifficulty(GAME_ID));
  const [round, setRound] = useState<PatternRound>(() => generateRound(1));
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");

  const offset = DIFFICULTY_OFFSET[difficulty];

  const start = useCallback(() => {
    setRound(generateRound(1 + offset));
    setScore(0);
    setStreak(0);
    setFeedback(null);
    setPhase("playing");
  }, [offset]);

  const restart = useCallback(() => {
    setPhase("idle");
    setScore(0);
    setStreak(0);
    setFeedback(null);
  }, []);

  const handlePick = useCallback((index: number) => {
    if (feedback) return;

    if (index === round.oddIndex) {
      playSound("correct");
      const newStreak = streak + 1;
      setStreak(newStreak);
      setScore((s) => s + 1);
      setFeedback("correct");
      setTimeout(() => {
        setRound(generateRound(newStreak + offset));
        setFeedback(null);
      }, 600);
    } else {
      playSound("wrong");
      setFeedback("wrong");
      setTimeout(() => {
        setStreak(0);
        setRound(generateRound(1 + offset));
        setFeedback(null);
      }, 1000);
    }
  }, [feedback, round, streak, offset]);

  const handleDifficulty = (d: Difficulty) => {
    setDifficulty(d);
    saveDifficulty(GAME_ID, d);
  };

  // Keyboard: 1-8 for item selection
  useEffect(() => {
    if (phase !== "playing" || feedback) return;
    const handler = (e: KeyboardEvent) => {
      const idx = parseInt(e.key, 10) - 1;
      if (idx >= 0 && idx < round.items.length) {
        handlePick(idx);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [phase, feedback, round, handlePick]);

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
      title="Pattern Recognition"
      score={score}
      onRestart={restart}
      instructions="Find the number that doesn't fit the pattern. Use number keys 1-8 or click!"
      difficulty={difficulty}
    >
      {phase === "idle" && (
        <div className="flex flex-col items-center gap-4 py-12">
          <p className="text-gray-500">Spot the odd one out in the pattern!</p>
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

      {phase === "playing" && (
        <>
          <p className="mb-6 text-center text-gray-500">
            Tap the number that doesn&apos;t belong. Streak: {streak}
          </p>

          {feedback === "correct" && (
            <p className="mb-4 text-center font-medium text-green-600">Correct!</p>
          )}
          {feedback === "wrong" && (
            <p className="mb-4 text-center font-medium text-red-600">
              Wrong! The odd one was: {round.items[round.oddIndex]}
            </p>
          )}

          <div className="mx-auto flex max-w-md flex-wrap items-center justify-center gap-3">
            {round.items.map((num, i) => (
              <button
                key={i}
                onClick={() => handlePick(i)}
                className={`flex h-16 w-16 flex-col items-center justify-center rounded-xl border-2 text-xl font-semibold transition-all
                  ${feedback && i === round.oddIndex
                    ? "border-yellow-500 bg-yellow-50 text-yellow-700"
                    : "border-gray-200 bg-white text-gray-900 hover:border-gray-400 hover:bg-gray-50 cursor-pointer"
                  }
                `}
              >
                {num}
                <span className="text-[10px] text-gray-400">{i + 1}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </GameShell>
  );
}
