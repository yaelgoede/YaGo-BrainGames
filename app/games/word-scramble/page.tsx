"use client";

import { useState, useCallback, useRef } from "react";
import GameShell from "@/components/GameShell";
import { getRandomWord, scrambleWord } from "@/lib/games/word-scramble";

function newRound() {
  const word = getRandomWord();
  return { word, scrambled: scrambleWord(word) };
}

export default function WordScramblePage() {
  const [round, setRound] = useState(newRound);
  const [input, setInput] = useState("");
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const restart = useCallback(() => {
    setRound(newRound());
    setInput("");
    setScore(0);
    setFeedback(null);
    setTimeout(() => inputRef.current?.focus(), 50);
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

  return (
    <GameShell
      gameId="word-scramble"
      title="Word Scramble"
      score={score}
      onRestart={restart}
      instructions="Unscramble the letters to find the hidden word. Type your answer and press Enter!"
    >
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
          Skip word
        </button>
      </div>
    </GameShell>
  );
}
