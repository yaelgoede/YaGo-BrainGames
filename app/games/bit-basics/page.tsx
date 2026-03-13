"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import GameShell from "@/components/GameShell";
import DifficultySelector from "@/components/DifficultySelector";
import { generateRound, checkAnswer, type BitBasicsRound } from "@/lib/games/bit-basics";
import { type Difficulty, getSavedDifficulty, saveDifficulty } from "@/lib/difficulty";
import { playSound } from "@/lib/sounds";

const GAME_ID = "bit-basics";

type Phase = "idle" | "playing" | "over";

const POWERS = [128, 64, 32, 16, 8, 4, 2, 1];

export default function BitBasicsPage() {
  const [difficulty, setDifficulty] = useState<Difficulty>(() => getSavedDifficulty(GAME_ID));
  const [round, setRound] = useState<BitBasicsRound>(() => generateRound("easy"));
  const [input, setInput] = useState("");
  const [score, setScore] = useState(0);
  const [phase, setPhase] = useState<Phase>("idle");
  const [flash, setFlash] = useState<"correct" | "wrong" | null>(null);
  const [lives, setLives] = useState(3);
  const flashTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (flashTimeout.current) clearTimeout(flashTimeout.current);
    };
  }, []);

  const start = useCallback(() => {
    setPhase("playing");
    setScore(0);
    setLives(3);
    setInput("");
    setRound(generateRound(difficulty));
    setFlash(null);
    setTimeout(() => inputRef.current?.focus(), 50);
  }, [difficulty]);

  const handleSubmit = useCallback(() => {
    if (phase !== "playing" || flash) return;
    const parsed = parseInt(input.trim(), 10);
    if (isNaN(parsed)) return;

    if (checkAnswer(parsed, round)) {
      playSound("correct");
      const newScore = score + 1;
      setScore(newScore);
      setFlash("correct");
      if (flashTimeout.current) clearTimeout(flashTimeout.current);
      flashTimeout.current = setTimeout(() => {
        setFlash(null);
        setInput("");
        setRound(generateRound(difficulty, round.correctAnswer));
        setTimeout(() => inputRef.current?.focus(), 50);
      }, 300);
    } else {
      playSound("wrong");
      const newLives = lives - 1;
      setLives(newLives);
      setFlash("wrong");
      if (flashTimeout.current) clearTimeout(flashTimeout.current);
      flashTimeout.current = setTimeout(() => {
        setFlash(null);
        if (newLives <= 0) {
          playSound("gameOver");
          setPhase("over");
        } else {
          setInput("");
          setRound(generateRound(difficulty, round.correctAnswer));
          setTimeout(() => inputRef.current?.focus(), 50);
        }
      }, 500);
    }
  }, [phase, flash, input, round, score, difficulty, lives]);

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
      title="Bit Basics"
      score={score}
      onRestart={start}
      instructions="Answer questions about bits, bytes, and binary place values. You have 3 lives!"
      difficulty={difficulty}
      flash={flash}
    >
      {phase === "idle" && (
        <div className="flex flex-col items-center gap-4 py-12">
          <p className="text-gray-500">Master the fundamentals of bits and bytes!</p>
          <DifficultySelector difficulty={difficulty} onChange={handleDifficulty} />
          <p className="text-sm text-gray-400">
            {difficulty === "easy" && "Bit positions and byte conversions"}
            {difficulty === "medium" && "Max values, nibbles, and more"}
            {difficulty === "hard" && "Signed ranges, larger bit widths"}
          </p>
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
          <div className="rounded-lg bg-red-50 p-6 text-center">
            <p className="text-2xl font-bold text-red-700">{score} correct</p>
            <p className="text-red-600">out of lives</p>
            <p className="mt-2 text-sm text-gray-500">
              Answer was: <span className="font-semibold">{round.correctAnswer}</span>
            </p>
          </div>
        </div>
      )}

      {phase === "playing" && (
        <div className="flex flex-col items-center gap-6 py-8">
          <div className="flex items-center gap-3">
            <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-700">
              Score: {score}
            </span>
            <div className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className={`h-3 w-3 rounded-full ${
                    i < lives ? "bg-red-500" : "bg-gray-200"
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Visual bit display for power-of-2 questions */}
          {round.highlightBit !== undefined && (
            <div className="flex flex-col items-center gap-1">
              <div className="flex gap-1.5 sm:gap-2">
                {POWERS.map((p, i) => {
                  const bitIndex = 7 - i; // convert display index to bit position
                  const isHighlighted = bitIndex === round.highlightBit;
                  return (
                    <div
                      key={i}
                      className={`flex h-12 w-10 items-center justify-center rounded-lg border-2 text-lg font-bold sm:h-14 sm:w-14 sm:text-xl ${
                        isHighlighted
                          ? "border-yellow-400 bg-yellow-300 text-gray-900 shadow-[0_0_12px_rgba(234,179,8,0.5)]"
                          : "border-gray-300 bg-gray-200 text-gray-500"
                      }`}
                    >
                      {isHighlighted ? "1" : "0"}
                    </div>
                  );
                })}
              </div>
              <div className="flex gap-1.5 sm:gap-2">
                {POWERS.map((p, i) => (
                  <span
                    key={i}
                    className="w-10 text-center text-[10px] text-gray-400 sm:w-14 sm:text-xs"
                  >
                    {p}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Question */}
          <p className="max-w-md text-center text-xl font-semibold text-gray-900">
            {round.question}
          </p>

          {/* Input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSubmit();
            }}
            className="flex items-center gap-3"
          >
            <input
              ref={inputRef}
              type="text"
              inputMode="numeric"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="w-32 rounded-lg border-2 border-gray-300 px-4 py-3 text-center text-xl font-mono focus:border-gray-900 focus:outline-none"
              placeholder="?"
              autoFocus
              disabled={!!flash}
            />
            <button
              type="submit"
              className="rounded-xl bg-gray-900 px-6 py-3 text-lg font-medium text-white hover:bg-gray-700"
            >
              Check
            </button>
          </form>

          <p className="text-xs text-gray-400">Type your answer and press Enter</p>
        </div>
      )}
    </GameShell>
  );
}
