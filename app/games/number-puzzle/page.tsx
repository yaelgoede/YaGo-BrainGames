"use client";

import { useState, useCallback } from "react";
import GameShell from "@/components/GameShell";
import { generatePuzzle, type NumberPuzzle } from "@/lib/games/number-puzzle";

export default function NumberPuzzlePage() {
  const [puzzle, setPuzzle] = useState<NumberPuzzle>(() => generatePuzzle(1));
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);

  const restart = useCallback(() => {
    setPuzzle(generatePuzzle(1));
    setScore(0);
    setStreak(0);
    setFeedback(null);
  }, []);

  const handleChoice = (choice: number) => {
    if (feedback) return;

    if (choice === puzzle.answer) {
      const newStreak = streak + 1;
      setStreak(newStreak);
      setScore((s) => s + 1);
      setFeedback("correct");
      setTimeout(() => {
        setPuzzle(generatePuzzle(newStreak));
        setFeedback(null);
      }, 600);
    } else {
      setFeedback("wrong");
      setTimeout(() => {
        setStreak(0);
        setPuzzle(generatePuzzle(1));
        setFeedback(null);
      }, 1200);
    }
  };

  return (
    <GameShell
      gameId="number-puzzle"
      title="Number Puzzle"
      score={score}
      onRestart={restart}
      instructions="Find the next number in the sequence. Choose from the options below."
    >
      <div className="flex flex-col items-center gap-8 py-8">
        <p className="text-sm text-gray-500">What comes next? Streak: {streak}</p>

        <div className="flex items-center gap-3">
          {puzzle.sequence.map((num, i) => (
            <span
              key={i}
              className="flex h-14 w-14 items-center justify-center rounded-xl bg-gray-100 text-xl font-bold text-gray-900"
            >
              {num}
            </span>
          ))}
          <span className="flex h-14 w-14 items-center justify-center rounded-xl border-2 border-dashed border-gray-300 text-xl font-bold text-gray-400">
            ?
          </span>
        </div>

        {feedback === "correct" && (
          <p className="font-medium text-green-600">Correct!</p>
        )}
        {feedback === "wrong" && (
          <p className="font-medium text-red-600">
            Wrong! The answer was {puzzle.answer}
          </p>
        )}

        <div className="flex flex-wrap justify-center gap-3">
          {puzzle.choices.map((choice) => (
            <button
              key={choice}
              onClick={() => handleChoice(choice)}
              className="flex h-14 w-14 items-center justify-center rounded-xl border-2 border-gray-200 bg-white text-xl font-semibold text-gray-900 transition-all hover:border-green-400 hover:bg-green-50 cursor-pointer"
            >
              {choice}
            </button>
          ))}
        </div>
      </div>
    </GameShell>
  );
}
