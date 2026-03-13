"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import GameShell from "@/components/GameShell";
import DifficultySelector from "@/components/DifficultySelector";
import {
  generateRound,
  checkAnswer,
  bitsToNumber,
  isSingleOperand,
  type BitOpsRound,
} from "@/lib/games/bit-ops";
import { type Difficulty, getSavedDifficulty, saveDifficulty } from "@/lib/difficulty";
import { playSound } from "@/lib/sounds";

const GAME_ID = "bit-ops";
const POWERS = [128, 64, 32, 16, 8, 4, 2, 1];

type Phase = "idle" | "playing" | "over";

export default function BitOpsPage() {
  const [difficulty, setDifficulty] = useState<Difficulty>(() => getSavedDifficulty(GAME_ID));
  const [round, setRound] = useState<BitOpsRound>(() => generateRound("easy"));
  const [playerBits, setPlayerBits] = useState<number[]>([0, 0, 0, 0, 0, 0, 0, 0]);
  const [score, setScore] = useState(0);
  const [phase, setPhase] = useState<Phase>("idle");
  const [flash, setFlash] = useState<"correct" | "wrong" | null>(null);
  const [lives, setLives] = useState(3);
  const flashTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (flashTimeout.current) clearTimeout(flashTimeout.current);
    };
  }, []);

  const start = useCallback(() => {
    setPhase("playing");
    setScore(0);
    setLives(3);
    setPlayerBits([0, 0, 0, 0, 0, 0, 0, 0]);
    setRound(generateRound(difficulty));
    setFlash(null);
  }, [difficulty]);

  const toggleBit = useCallback(
    (index: number) => {
      if (phase !== "playing" || flash) return;
      playSound("click");
      setPlayerBits((prev) => {
        const next = [...prev];
        next[index] = next[index] === 0 ? 1 : 0;
        return next;
      });
    },
    [phase, flash]
  );

  const handleSubmit = useCallback(() => {
    if (phase !== "playing" || flash) return;

    if (checkAnswer(playerBits, round)) {
      playSound("correct");
      const bonus =
        (round.operation === "SHL" || round.operation === "SHR" || round.operation === "ASHR") &&
        difficulty === "hard"
          ? 2
          : 1;
      const newScore = score + bonus;
      setScore(newScore);
      setFlash("correct");
      if (flashTimeout.current) clearTimeout(flashTimeout.current);
      flashTimeout.current = setTimeout(() => {
        setFlash(null);
        setPlayerBits([0, 0, 0, 0, 0, 0, 0, 0]);
        setRound(generateRound(difficulty));
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
          setPlayerBits([0, 0, 0, 0, 0, 0, 0, 0]);
          setRound(generateRound(difficulty));
        }
      }, 500);
    }
  }, [phase, flash, playerBits, round, score, difficulty, lives]);

  const handleDifficulty = (d: Difficulty) => {
    setDifficulty(d);
    saveDifficulty(GAME_ID, d);
  };

  // Keyboard: 1-8 toggle bits, Enter to submit
  useEffect(() => {
    if (phase !== "playing") return;
    const handler = (e: KeyboardEvent) => {
      if (flash) return;
      const key = parseInt(e.key, 10);
      if (key >= 1 && key <= 8) {
        e.preventDefault();
        toggleBit(key - 1);
      }
      if (e.key === "Enter") {
        e.preventDefault();
        handleSubmit();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [phase, flash, toggleBit, handleSubmit]);

  useEffect(() => {
    if (phase !== "idle") return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Enter") start();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [phase, start]);

  const singleOp = isSingleOperand(round.operation);

  return (
    <GameShell
      gameId={GAME_ID}
      title="Bit Ops"
      score={score}
      onRestart={start}
      instructions="Compute the result of bitwise operations (AND, OR, XOR, NOT, shifts). Toggle the output bits to match. You have 3 lives!"
      difficulty={difficulty}
      flash={flash}
    >
      {phase === "idle" && (
        <div className="flex flex-col items-center gap-4 py-12">
          <p className="text-gray-500">Master bitwise operations!</p>
          <DifficultySelector difficulty={difficulty} onChange={handleDifficulty} />
          <p className="text-sm text-gray-400">
            {difficulty === "easy" && "AND, OR on simple values"}
            {difficulty === "medium" && "AND, OR, XOR, NOT on 8-bit values"}
            {difficulty === "hard" && "All operations including shifts"}
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
              Answer was: <span className="font-mono font-semibold">{round.correctResult.join("")}</span>
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
            <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
              {round.displayLabel}
            </span>
          </div>

          {/* Operand A */}
          <div className="flex flex-col items-center gap-1">
            <span className="text-xs font-medium text-gray-500">A</span>
            <div className="flex gap-1.5 sm:gap-2">
              {round.operandA.map((bit, i) => (
                <div
                  key={i}
                  className={`flex h-10 w-9 items-center justify-center rounded-lg border-2 text-base font-bold sm:h-12 sm:w-12 sm:text-lg ${
                    bit === 1
                      ? "border-blue-300 bg-blue-100 text-blue-700"
                      : "border-gray-200 bg-gray-100 text-gray-400"
                  }`}
                >
                  {bit}
                </div>
              ))}
            </div>
          </div>

          {/* Operand B (if not single operand) */}
          {!singleOp && (
            <div className="flex flex-col items-center gap-1">
              <span className="text-xs font-medium text-gray-500">B</span>
              <div className="flex gap-1.5 sm:gap-2">
                {round.operandB.map((bit, i) => (
                  <div
                    key={i}
                    className={`flex h-10 w-9 items-center justify-center rounded-lg border-2 text-base font-bold sm:h-12 sm:w-12 sm:text-lg ${
                      bit === 1
                        ? "border-green-300 bg-green-100 text-green-700"
                        : "border-gray-200 bg-gray-100 text-gray-400"
                    }`}
                  >
                    {bit}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Divider */}
          <div className="w-full max-w-xs border-t-2 border-gray-300" />

          {/* Result: toggleable bits */}
          <div className="flex flex-col items-center gap-1">
            <span className="text-xs font-medium text-gray-500">Result</span>
            <div className="flex gap-1.5 sm:gap-2">
              {playerBits.map((bit, i) => (
                <button
                  key={i}
                  onClick={() => toggleBit(i)}
                  className={`flex h-12 w-10 items-center justify-center rounded-lg border-2 text-lg font-bold transition-all sm:h-14 sm:w-14 sm:text-xl ${
                    bit === 1
                      ? "border-yellow-400 bg-yellow-300 text-gray-900 shadow-[0_0_12px_rgba(234,179,8,0.5)]"
                      : "border-gray-300 bg-gray-200 text-gray-500"
                  }`}
                >
                  {bit}
                </button>
              ))}
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

          <p className="text-sm text-gray-500">
            = <span className="font-semibold text-gray-700">{bitsToNumber(playerBits)}</span>
          </p>

          <p className="text-xs text-gray-400">Keys 1–8 toggle bits · Enter to submit</p>

          <button
            onClick={handleSubmit}
            className="rounded-xl bg-gray-900 px-8 py-3 text-lg font-medium text-white hover:bg-gray-700"
          >
            Check
          </button>
        </div>
      )}
    </GameShell>
  );
}
