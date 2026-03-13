"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import GameShell from "@/components/GameShell";
import DifficultySelector from "@/components/DifficultySelector";
import { generateBinaryRound, checkAnswer, type BinaryRound } from "@/lib/games/binary-decode";
import { type Difficulty, DIFFICULTY_OFFSET, getSavedDifficulty, saveDifficulty } from "@/lib/difficulty";
import { playSound } from "@/lib/sounds";

const GAME_ID = "binary-decode";
const GAME_DURATION = 60;

type Phase = "idle" | "playing" | "over";

export default function BinaryDecodePage() {
  const [difficulty, setDifficulty] = useState<Difficulty>(() => getSavedDifficulty(GAME_ID));
  const [round, setRound] = useState<BinaryRound>(() => generateBinaryRound(0, 0, 0));
  const [roundIndex, setRoundIndex] = useState(0);
  const [input, setInput] = useState("");
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [phase, setPhase] = useState<Phase>("idle");
  const [flash, setFlash] = useState<"correct" | "wrong" | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
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
    setRoundIndex(0);
    setRound(generateBinaryRound(0, offset, 0));
    setInput("");
    setFlash(null);
    setTimeout(() => inputRef.current?.focus(), 50);
  }, [offset]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (phase !== "playing" || flash) return;

    const isCorrect = checkAnswer(round, input);

    if (isCorrect) {
      playSound("correct");
      const newScore = score + 1;
      const newRoundIndex = roundIndex + 1;
      setScore(newScore);
      setFlash("correct");
      if (flashTimeout.current) clearTimeout(flashTimeout.current);
      flashTimeout.current = setTimeout(() => {
        setFlash(null);
        setRoundIndex(newRoundIndex);
        setRound(generateBinaryRound(newScore, offset, newRoundIndex));
        setInput("");
        inputRef.current?.focus();
      }, 300);
    } else {
      playSound("wrong");
      setFlash("wrong");
      if (flashTimeout.current) clearTimeout(flashTimeout.current);
      flashTimeout.current = setTimeout(() => {
        setFlash(null);
        setInput("");
        inputRef.current?.focus();
      }, 500);
    }
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

  const isBinaryToDecimal = round.mode === "binaryToDecimal";

  return (
    <GameShell
      gameId={GAME_ID}
      title="Binary Decode"
      score={score}
      onRestart={start}
      showTimer={phase === "playing"}
      timeLeft={timeLeft}
      instructions="Convert between binary and decimal! The powers of 2 are shown as a visual aid. Rounds alternate between binary→decimal and decimal→binary."
      difficulty={difficulty}
      flash={flash}
    >
      {phase === "idle" && (
        <div className="flex flex-col items-center gap-4 py-12">
          <p className="text-gray-500">Convert between binary and decimal numbers!</p>
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
          <div className="rounded-lg bg-orange-50 p-6 text-center">
            <p className="text-2xl font-bold text-orange-700">{score} correct</p>
            <p className="text-orange-600">in {GAME_DURATION} seconds</p>
          </div>
        </div>
      )}

      {phase === "playing" && (
        <div className="flex flex-col items-center gap-6 py-8">
          <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-medium text-orange-700">
            {isBinaryToDecimal ? "Binary → Decimal" : "Decimal → Binary"}
          </span>

          {isBinaryToDecimal ? (
            /* Binary to Decimal: show binary digits with powers */
            <div className="flex flex-col items-center gap-2">
              <div className="flex gap-2">
                {round.binary.split("").map((bit, i) => (
                  <div key={i} className="flex flex-col items-center">
                    <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gray-900 text-2xl font-bold text-white">
                      {bit}
                    </div>
                    <span className="mt-1 text-xs text-gray-400">
                      {Math.pow(2, round.bitCount - 1 - i)}
                    </span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-2">
                = {round.powers.filter((p) => p > 0).join(" + ")} = ?
              </p>
            </div>
          ) : (
            /* Decimal to Binary: show decimal number with power reference */
            <div className="flex flex-col items-center gap-2">
              <p className="text-5xl font-bold text-gray-900">{round.decimal}</p>
              <div className="flex gap-2 mt-2">
                {Array.from({ length: round.bitCount }, (_, i) => (
                  <span key={i} className="text-xs text-gray-400">
                    {Math.pow(2, round.bitCount - 1 - i)}
                  </span>
                ))}
              </div>
              <p className="text-xs text-gray-400">Write as binary ({round.bitCount} bits)</p>
            </div>
          )}

          {/* Flash feedback */}
          {flash === "wrong" && (
            <p className="text-sm font-medium text-red-600">
              Wrong! Answer: {isBinaryToDecimal ? round.decimal : round.binary}
            </p>
          )}

          {/* Input */}
          <form onSubmit={handleSubmit} className="flex items-center gap-3">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={isBinaryToDecimal ? "Decimal..." : "Binary..."}
              className="w-40 rounded-xl border-2 border-gray-200 px-4 py-3 text-center text-2xl font-semibold focus:border-orange-500 focus:outline-none"
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
