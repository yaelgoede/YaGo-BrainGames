"use client";

import { useState, useCallback } from "react";
import GameShell from "@/components/GameShell";
import { generateRound, type PatternRound } from "@/lib/games/pattern-recognition";

export default function PatternRecognitionPage() {
  const [round, setRound] = useState<PatternRound>(() => generateRound(1));
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);

  const restart = useCallback(() => {
    setRound(generateRound(1));
    setScore(0);
    setStreak(0);
    setFeedback(null);
  }, []);

  const handlePick = (index: number) => {
    if (feedback) return;

    if (index === round.oddIndex) {
      const newStreak = streak + 1;
      setStreak(newStreak);
      setScore((s) => s + 1);
      setFeedback("correct");
      setTimeout(() => {
        setRound(generateRound(newStreak));
        setFeedback(null);
      }, 600);
    } else {
      setFeedback("wrong");
      setTimeout(() => {
        setStreak(0);
        setRound(generateRound(1));
        setFeedback(null);
      }, 1000);
    }
  };

  return (
    <GameShell
      gameId="pattern-recognition"
      title="Pattern Recognition"
      score={score}
      onRestart={restart}
      instructions="Find the number that doesn't fit the pattern. The sequence follows a rule — one number breaks it!"
    >
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
            className={`flex h-16 w-16 items-center justify-center rounded-xl border-2 text-xl font-semibold transition-all
              ${feedback && i === round.oddIndex
                ? "border-yellow-500 bg-yellow-50 text-yellow-700"
                : "border-gray-200 bg-white text-gray-900 hover:border-gray-400 hover:bg-gray-50 cursor-pointer"
              }
            `}
          >
            {num}
          </button>
        ))}
      </div>
    </GameShell>
  );
}
