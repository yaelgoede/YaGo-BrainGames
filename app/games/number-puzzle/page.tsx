"use client";

import { useState, useCallback, useEffect } from "react";
import GameShell from "@/components/GameShell";
import DifficultySelector from "@/components/DifficultySelector";
import { generatePuzzle, type NumberPuzzle } from "@/lib/games/number-puzzle";
import { type Difficulty, DIFFICULTY_OFFSET, getSavedDifficulty, saveDifficulty } from "@/lib/difficulty";
import { playSound } from "@/lib/sounds";

const GAME_ID = "number-puzzle";

type Phase = "idle" | "playing";

export default function NumberPuzzlePage() {
  const [difficulty, setDifficulty] = useState<Difficulty>(() => getSavedDifficulty(GAME_ID));
  const [puzzle, setPuzzle] = useState<NumberPuzzle>(() => generatePuzzle(1));
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");

  const offset = DIFFICULTY_OFFSET[difficulty];

  const start = useCallback(() => {
    setPuzzle(generatePuzzle(1 + offset));
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

  const handleChoice = useCallback((choice: number) => {
    if (feedback) return;

    if (choice === puzzle.answer) {
      playSound("correct");
      const newStreak = streak + 1;
      setStreak(newStreak);
      setScore((s) => s + 1);
      setFeedback("correct");
      setTimeout(() => {
        setPuzzle(generatePuzzle(newStreak + offset));
        setFeedback(null);
      }, 600);
    } else {
      playSound("wrong");
      setFeedback("wrong");
      setTimeout(() => {
        setStreak(0);
        setPuzzle(generatePuzzle(1 + offset));
        setFeedback(null);
      }, 1200);
    }
  }, [feedback, puzzle, streak, offset]);

  const handleDifficulty = (d: Difficulty) => {
    setDifficulty(d);
    saveDifficulty(GAME_ID, d);
  };

  // Keyboard: 1-4 for choices
  useEffect(() => {
    if (phase !== "playing" || feedback) return;
    const handler = (e: KeyboardEvent) => {
      const idx = parseInt(e.key, 10) - 1;
      if (idx >= 0 && idx < puzzle.choices.length) {
        handleChoice(puzzle.choices[idx]);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [phase, feedback, puzzle, handleChoice]);

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
      title="Number Puzzle"
      score={score}
      onRestart={restart}
      instructions="Find the next number in the sequence. Use keys 1-4 to choose."
      difficulty={difficulty}
    >
      {phase === "idle" && (
        <div className="flex flex-col items-center gap-4 py-12">
          <p className="text-gray-500">Find the pattern and pick the next number!</p>
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
            {puzzle.choices.map((choice, i) => (
              <button
                key={choice}
                onClick={() => handleChoice(choice)}
                className="flex h-14 w-14 flex-col items-center justify-center rounded-xl border-2 border-gray-200 bg-white text-xl font-semibold text-gray-900 transition-all hover:border-green-400 hover:bg-green-50 cursor-pointer"
              >
                {choice}
                <span className="text-[10px] text-gray-400">{i + 1}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </GameShell>
  );
}
