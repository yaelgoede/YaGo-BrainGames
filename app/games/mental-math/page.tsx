"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import GameShell from "@/components/GameShell";
import DifficultySelector from "@/components/DifficultySelector";
import { generateProblem, type MathProblem } from "@/lib/games/mental-math";
import { type Difficulty, DIFFICULTY_OFFSET, getSavedDifficulty, saveDifficulty } from "@/lib/difficulty";
import { playSound } from "@/lib/sounds";

const GAME_ID = "mental-math";
const GAME_DURATION = 60;

type Phase = "idle" | "playing" | "over";

export default function MentalMathPage() {
  const [difficulty, setDifficulty] = useState<Difficulty>(() => getSavedDifficulty(GAME_ID));
  const [problem, setProblem] = useState<MathProblem>(() => generateProblem(1));
  const [input, setInput] = useState("");
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [phase, setPhase] = useState<Phase>("idle");
  const inputRef = useRef<HTMLInputElement>(null);

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

  const start = useCallback(() => {
    setPhase("playing");
    setScore(0);
    setTimeLeft(GAME_DURATION);
    setProblem(generateProblem(1 + offset));
    setInput("");
    setTimeout(() => inputRef.current?.focus(), 50);
  }, [offset]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (phase !== "playing") return;

    const answer = parseInt(input, 10);
    if (answer === problem.answer) {
      playSound("correct");
      const newScore = score + 1;
      setScore(newScore);
      setProblem(generateProblem(Math.floor(newScore / 3) + 1 + offset));
    }
    setInput("");
    inputRef.current?.focus();
  };

  const handleDifficulty = (d: Difficulty) => {
    setDifficulty(d);
    saveDifficulty(GAME_ID, d);
  };

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
      title="Mental Math"
      score={score}
      onRestart={start}
      showTimer={phase === "playing"}
      timeLeft={timeLeft}
      instructions="Solve as many arithmetic problems as you can in 60 seconds. Type your answer and press Enter!"
      difficulty={difficulty}
    >
      {phase === "idle" && (
        <div className="flex flex-col items-center gap-4 py-12">
          <p className="text-gray-500">Solve math problems as fast as you can!</p>
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
            <p className="text-green-600">in {GAME_DURATION} seconds</p>
          </div>
        </div>
      )}

      {phase === "playing" && (
        <div className="flex flex-col items-center gap-6 py-8">
          <p className="text-5xl font-bold text-gray-900">{problem.question}</p>
          <form onSubmit={handleSubmit} className="flex items-center gap-3">
            <input
              ref={inputRef}
              type="number"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="w-32 rounded-xl border-2 border-gray-200 px-4 py-3 text-center text-2xl font-semibold focus:border-blue-500 focus:outline-none"
              autoFocus
            />
            <button
              type="submit"
              className="rounded-xl bg-gray-900 px-6 py-3 text-lg font-medium text-white hover:bg-gray-700"
            >
              Go
            </button>
          </form>
        </div>
      )}
    </GameShell>
  );
}
