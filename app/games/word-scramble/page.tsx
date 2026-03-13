"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import GameShell from "@/components/GameShell";
import DifficultySelector from "@/components/DifficultySelector";
import { getRandomWord, scrambleWord } from "@/lib/games/word-scramble";
import { type Difficulty, getSavedDifficulty, saveDifficulty } from "@/lib/difficulty";

const GAME_ID = "word-scramble";

type Phase = "idle" | "playing";

export default function WordScramblePage() {
  const [difficulty, setDifficulty] = useState<Difficulty>(() => getSavedDifficulty(GAME_ID));
  const [round, setRound] = useState(() => {
    const word = getRandomWord("medium");
    return { word, scrambled: scrambleWord(word) };
  });
  const [input, setInput] = useState("");
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const inputRef = useRef<HTMLInputElement>(null);

  const newRound = useCallback(() => {
    const word = getRandomWord(difficulty);
    return { word, scrambled: scrambleWord(word) };
  }, [difficulty]);

  const start = useCallback(() => {
    setRound(newRound());
    setInput("");
    setScore(0);
    setFeedback(null);
    setPhase("playing");
    setTimeout(() => inputRef.current?.focus(), 50);
  }, [newRound]);

  const restart = useCallback(() => {
    setPhase("idle");
    setScore(0);
    setFeedback(null);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (feedback) return;

    if (input.toLowerCase().trim() === round.word) {
      setScore((s) => s + 1);
      setFeedback("correct");
      setTimeout(() => {
        setRound(newRound());
        setInput("");
        setFeedback(null);
        inputRef.current?.focus();
      }, 600);
    } else {
      setFeedback("wrong");
      setTimeout(() => {
        setFeedback(null);
        setInput("");
        inputRef.current?.focus();
      }, 800);
    }
  };

  const handleSkip = () => {
    setRound(newRound());
    setInput("");
    setFeedback(null);
    inputRef.current?.focus();
  };

  const handleDifficulty = (d: Difficulty) => {
    setDifficulty(d);
    saveDifficulty(GAME_ID, d);
  };

  // Escape to skip
  useEffect(() => {
    if (phase !== "playing") return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleSkip();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  });

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
      title="Word Scramble"
      score={score}
      onRestart={restart}
      instructions="Unscramble the letters to find the hidden word. Type your answer and press Enter! Escape to skip."
      difficulty={difficulty}
    >
      {phase === "idle" && (
        <div className="flex flex-col items-center gap-4 py-12">
          <p className="text-gray-500">Unscramble the letters to find the word!</p>
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
        <div className="flex flex-col items-center gap-6 py-8">
          <div className="flex gap-2">
            {round.scrambled.split("").map((letter, i) => (
              <span
                key={i}
                className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-100 text-xl font-bold uppercase text-purple-700"
              >
                {letter}
              </span>
            ))}
          </div>

          {feedback === "correct" && (
            <p className="font-medium text-green-600">Correct!</p>
          )}
          {feedback === "wrong" && (
            <p className="font-medium text-red-600">Try again!</p>
          )}

          <form onSubmit={handleSubmit} className="flex items-center gap-3">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="w-48 rounded-xl border-2 border-gray-200 px-4 py-3 text-center text-lg font-semibold focus:border-purple-500 focus:outline-none"
              placeholder="Your answer..."
              autoFocus
            />
            <button
              type="submit"
              className="rounded-xl bg-gray-900 px-6 py-3 font-medium text-white hover:bg-gray-700"
            >
              Go
            </button>
          </form>

          <button
            onClick={handleSkip}
            className="text-sm text-gray-400 hover:text-gray-600"
          >
            Skip word <span className="text-xs">(Esc)</span>
          </button>
        </div>
      )}
    </GameShell>
  );
}
