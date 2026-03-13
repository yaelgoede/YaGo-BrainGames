"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import GameShell from "@/components/GameShell";
import DifficultySelector from "@/components/DifficultySelector";
import {
  generateRound,
  checkAnswer,
  applyMask,
  bitsToNumber,
  type MaskRound,
  type MaskOp,
} from "@/lib/games/mask-master";
import { type Difficulty, getSavedDifficulty, saveDifficulty } from "@/lib/difficulty";
import { playSound } from "@/lib/sounds";

const GAME_ID = "mask-master";
const POWERS = [128, 64, 32, 16, 8, 4, 2, 1];
const OPS: MaskOp[] = ["AND", "OR", "XOR"];

type Phase = "idle" | "playing" | "over";

export default function MaskMasterPage() {
  const [difficulty, setDifficulty] = useState<Difficulty>(() => getSavedDifficulty(GAME_ID));
  const [round, setRound] = useState<MaskRound>(() => generateRound("easy"));
  const [maskBits, setMaskBits] = useState<number[]>([0, 0, 0, 0, 0, 0, 0, 0]);
  const [selectedOp, setSelectedOp] = useState<MaskOp>("OR");
  const [resultBits, setResultBits] = useState<number[]>([0, 0, 0, 0, 0, 0, 0, 0]);
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

  // Live preview
  const preview = applyMask(round.inputBits, maskBits, selectedOp);

  const start = useCallback(() => {
    const newRound = generateRound(difficulty);
    setPhase("playing");
    setScore(0);
    setLives(3);
    setMaskBits([0, 0, 0, 0, 0, 0, 0, 0]);
    setResultBits([0, 0, 0, 0, 0, 0, 0, 0]);
    setSelectedOp("OR");
    setRound(newRound);
    setFlash(null);
  }, [difficulty]);

  const toggleMaskBit = useCallback(
    (index: number) => {
      if (phase !== "playing" || flash) return;
      playSound("click");
      setMaskBits((prev) => {
        const next = [...prev];
        next[index] = next[index] === 0 ? 1 : 0;
        return next;
      });
    },
    [phase, flash]
  );

  const toggleResultBit = useCallback(
    (index: number) => {
      if (phase !== "playing" || flash || !round.requiresResultCheck) return;
      playSound("click");
      setResultBits((prev) => {
        const next = [...prev];
        next[index] = next[index] === 0 ? 1 : 0;
        return next;
      });
    },
    [phase, flash, round.requiresResultCheck]
  );

  const handleSubmit = useCallback(() => {
    if (phase !== "playing" || flash) return;

    const result = checkAnswer(
      maskBits,
      selectedOp,
      round.requiresResultCheck ? resultBits : null,
      round
    );

    if (result.maskCorrect && result.opCorrect && result.resultCorrect) {
      playSound("correct");
      const bonus = round.requiresResultCheck ? 2 : 1;
      const newScore = score + bonus;
      setScore(newScore);
      setFlash("correct");
      if (flashTimeout.current) clearTimeout(flashTimeout.current);
      flashTimeout.current = setTimeout(() => {
        setFlash(null);
        setMaskBits([0, 0, 0, 0, 0, 0, 0, 0]);
        setResultBits([0, 0, 0, 0, 0, 0, 0, 0]);
        setSelectedOp("OR");
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
          setMaskBits([0, 0, 0, 0, 0, 0, 0, 0]);
          setResultBits([0, 0, 0, 0, 0, 0, 0, 0]);
          setSelectedOp("OR");
          setRound(generateRound(difficulty));
        }
      }, 500);
    }
  }, [phase, flash, maskBits, selectedOp, resultBits, round, score, difficulty, lives]);

  const handleDifficulty = (d: Difficulty) => {
    setDifficulty(d);
    saveDifficulty(GAME_ID, d);
  };

  // Keyboard
  useEffect(() => {
    if (phase !== "playing") return;
    const handler = (e: KeyboardEvent) => {
      if (flash) return;
      const key = parseInt(e.key, 10);
      if (key >= 1 && key <= 8) {
        e.preventDefault();
        toggleMaskBit(key - 1);
      }
      if (e.key === "a" || e.key === "A") {
        e.preventDefault();
        setSelectedOp("AND");
      }
      if (e.key === "o" || e.key === "O") {
        e.preventDefault();
        setSelectedOp("OR");
      }
      if (e.key === "x" || e.key === "X") {
        e.preventDefault();
        setSelectedOp("XOR");
      }
      if (e.key === "Enter") {
        e.preventDefault();
        handleSubmit();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [phase, flash, toggleMaskBit, handleSubmit]);

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
      title="Mask Master"
      score={score}
      onRestart={start}
      instructions="Build bitmasks to set, clear, toggle, or extract bits. Choose the right operation (AND/OR/XOR) and construct the mask. On hard, also predict the result!"
      difficulty={difficulty}
      flash={flash}
    >
      {phase === "idle" && (
        <div className="flex flex-col items-center gap-4 py-12">
          <p className="text-gray-500">Master bitmask operations!</p>
          <DifficultySelector difficulty={difficulty} onChange={handleDifficulty} />
          <p className="text-sm text-gray-400">
            {difficulty === "easy" && "Set bits using OR masks"}
            {difficulty === "medium" && "Set, clear, and toggle bits"}
            {difficulty === "hard" && "All operations + predict the result"}
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
              Correct: <span className="font-mono font-semibold">{round.correctOp}</span> with mask{" "}
              <span className="font-mono font-semibold">{round.correctMask.join("")}</span>
            </p>
          </div>
        </div>
      )}

      {phase === "playing" && (
        <div className="flex flex-col items-center gap-5 py-6">
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

          {/* Task description */}
          <div className="rounded-lg bg-yellow-50 border border-yellow-200 px-4 py-2 text-center">
            <p className="text-lg font-semibold text-yellow-800">{round.taskDescription}</p>
          </div>

          {/* Input value */}
          <div className="flex flex-col items-center gap-1">
            <span className="text-xs font-medium text-gray-500">Input Value</span>
            <div className="flex gap-1.5 sm:gap-2">
              {round.inputBits.map((bit, i) => (
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
            <div className="flex gap-1.5 sm:gap-2">
              {[7, 6, 5, 4, 3, 2, 1, 0].map((pos, i) => (
                <span
                  key={i}
                  className="w-9 text-center text-[10px] text-gray-400 sm:w-12 sm:text-xs"
                >
                  bit {pos}
                </span>
              ))}
            </div>
          </div>

          {/* Operation selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-gray-500 mr-1">Operation:</span>
            {OPS.map((op) => (
              <button
                key={op}
                onClick={() => {
                  if (phase === "playing" && !flash) setSelectedOp(op);
                }}
                className={`rounded-lg px-4 py-2 text-sm font-bold transition-all ${
                  selectedOp === op
                    ? "bg-gray-900 text-white ring-2 ring-gray-900"
                    : "border border-gray-300 text-gray-600 hover:bg-gray-50"
                }`}
              >
                {op}
              </button>
            ))}
          </div>

          {/* Mask bits */}
          <div className="flex flex-col items-center gap-1">
            <span className="text-xs font-medium text-gray-500">Your Mask</span>
            <div className="flex gap-1.5 sm:gap-2">
              {maskBits.map((bit, i) => (
                <button
                  key={i}
                  onClick={() => toggleMaskBit(i)}
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
          </div>

          {/* Live preview */}
          <div className="flex flex-col items-center gap-1">
            <span className="text-xs font-medium text-gray-400">
              Preview: Input {selectedOp} Mask =
            </span>
            <div className="flex gap-1.5 sm:gap-2">
              {preview.map((bit, i) => (
                <div
                  key={i}
                  className={`flex h-8 w-9 items-center justify-center rounded text-sm font-mono font-bold sm:w-12 ${
                    bit === 1 ? "text-gray-700" : "text-gray-400"
                  }`}
                >
                  {bit}
                </div>
              ))}
            </div>
          </div>

          {/* Result prediction (hard mode) */}
          {round.requiresResultCheck && (
            <div className="flex flex-col items-center gap-1">
              <span className="text-xs font-medium text-gray-500">Predict Result</span>
              <div className="flex gap-1.5 sm:gap-2">
                {resultBits.map((bit, i) => (
                  <button
                    key={i}
                    onClick={() => toggleResultBit(i)}
                    className={`flex h-10 w-9 items-center justify-center rounded-lg border-2 text-base font-bold transition-all sm:h-12 sm:w-12 sm:text-lg ${
                      bit === 1
                        ? "border-purple-400 bg-purple-200 text-purple-700"
                        : "border-gray-300 bg-gray-200 text-gray-500"
                    }`}
                  >
                    {bit}
                  </button>
                ))}
              </div>
            </div>
          )}

          <p className="text-xs text-gray-400">
            Keys 1–8: mask bits · A/O/X: operation · Enter: submit
          </p>

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
