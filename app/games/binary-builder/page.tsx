"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import GameShell from "@/components/GameShell";
import DifficultySelector from "@/components/DifficultySelector";
import {
  generateRound,
  checkColumn,
  type ArithRound,
} from "@/lib/games/binary-builder";
import { type Difficulty, getSavedDifficulty, saveDifficulty } from "@/lib/difficulty";
import { playSound } from "@/lib/sounds";

const GAME_ID = "binary-builder";

type Phase = "idle" | "playing" | "over";

export default function BinaryBuilderPage() {
  const [difficulty, setDifficulty] = useState<Difficulty>(() => getSavedDifficulty(GAME_ID));
  const [round, setRound] = useState<ArithRound>(() => generateRound("easy"));
  const [score, setScore] = useState(0);
  const [phase, setPhase] = useState<Phase>("idle");
  const [flash, setFlash] = useState<"correct" | "wrong" | null>(null);
  const [currentCol, setCurrentCol] = useState(0); // 0 = LSB
  const [sumBit, setSumBit] = useState(0);
  const [carryBit, setCarryBit] = useState(0);
  const [strikes, setStrikes] = useState(0);
  const [solvedCols, setSolvedCols] = useState<{ sum: number; carry: number }[]>([]);
  const [perfectRound, setPerfectRound] = useState(true);
  const flashTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (flashTimeout.current) clearTimeout(flashTimeout.current);
    };
  }, []);

  const startNewProblem = useCallback(
    (diff: Difficulty) => {
      const newRound = generateRound(diff);
      setRound(newRound);
      setCurrentCol(0);
      setSumBit(0);
      setCarryBit(0);
      setSolvedCols([]);
      setPerfectRound(true);
    },
    []
  );

  const start = useCallback(() => {
    setPhase("playing");
    setScore(0);
    setStrikes(0);
    setFlash(null);
    startNewProblem(difficulty);
  }, [difficulty, startNewProblem]);

  const submitColumn = useCallback(() => {
    if (phase !== "playing" || flash) return;

    const correct = checkColumn(sumBit, carryBit, round, currentCol);

    if (correct) {
      playSound("correct");
      const newSolved = [...solvedCols, { sum: sumBit, carry: carryBit }];
      setSolvedCols(newSolved);
      setFlash("correct");

      if (flashTimeout.current) clearTimeout(flashTimeout.current);
      flashTimeout.current = setTimeout(() => {
        setFlash(null);

        if (currentCol + 1 >= round.width) {
          // Problem complete
          const bonus = perfectRound ? 1 : 0;
          const newScore = score + 1 + bonus;
          setScore(newScore);
          playSound("levelUp");
          // Start next problem
          startNewProblem(difficulty);
        } else {
          setCurrentCol(currentCol + 1);
          setSumBit(0);
          setCarryBit(0);
        }
      }, 300);
    } else {
      playSound("wrong");
      setPerfectRound(false);
      const newStrikes = strikes + 1;
      setStrikes(newStrikes);
      setFlash("wrong");

      if (flashTimeout.current) clearTimeout(flashTimeout.current);
      flashTimeout.current = setTimeout(() => {
        setFlash(null);

        if (newStrikes >= 3) {
          // Game over
          playSound("gameOver");
          setPhase("over");
        } else {
          // Reset current column input
          setSumBit(0);
          setCarryBit(0);
        }
      }, 500);
    }
  }, [phase, flash, sumBit, carryBit, round, currentCol, solvedCols, strikes, score, perfectRound, difficulty, startNewProblem]);

  const handleDifficulty = (d: Difficulty) => {
    setDifficulty(d);
    saveDifficulty(GAME_ID, d);
  };

  // Keyboard
  useEffect(() => {
    if (phase !== "playing") return;
    const handler = (e: KeyboardEvent) => {
      if (flash) return;
      if (e.key === "s" || e.key === "S") {
        e.preventDefault();
        setSumBit((b) => (b === 0 ? 1 : 0));
        playSound("click");
      }
      if (e.key === "c" || e.key === "C") {
        e.preventDefault();
        setCarryBit((b) => (b === 0 ? 1 : 0));
        playSound("click");
      }
      if (e.key === "Enter") {
        e.preventDefault();
        submitColumn();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [phase, flash, submitColumn]);

  useEffect(() => {
    if (phase !== "idle") return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Enter") start();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [phase, start]);

  // Build display arrays (MSB first, index 0 = leftmost)
  const width = round.width;
  const displayColIndex = width - 1 - currentCol; // convert LSB-index to display-index

  return (
    <GameShell
      gameId={GAME_ID}
      title="Binary Builder"
      score={score}
      onRestart={start}
      instructions="Add or subtract binary numbers column by column. Enter the sum/difference bit and carry/borrow for each column. 3 strikes and the game is over!"
      difficulty={difficulty}
      flash={flash}
    >
      {phase === "idle" && (
        <div className="flex flex-col items-center gap-4 py-12">
          <p className="text-gray-500">Step-by-step binary arithmetic!</p>
          <DifficultySelector difficulty={difficulty} onChange={handleDifficulty} />
          <p className="text-sm text-gray-400">
            {difficulty === "easy" && "4-bit addition"}
            {difficulty === "medium" && "6-bit addition and subtraction"}
            {difficulty === "hard" && "8-bit with tricky carry chains"}
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
            <p className="text-2xl font-bold text-red-700">{score} problems solved</p>
            <p className="text-red-600">3 strikes — game over</p>
          </div>
        </div>
      )}

      {phase === "playing" && (
        <div className="flex flex-col items-center gap-5 py-6">
          <div className="flex items-center gap-3">
            <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-700">
              Score: {score}
            </span>
            <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
              {round.operation === "add" ? "Addition" : "Subtraction"}
            </span>
            {/* Strike indicators */}
            <div className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className={`h-3 w-3 rounded-full ${
                    i < strikes ? "bg-red-500" : "bg-gray-200"
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Pencil-and-paper layout */}
          <div className="font-mono text-lg sm:text-xl">
            {/* Carry/Borrow row */}
            <div className="flex items-center">
              <span className="w-16 text-right text-xs text-gray-400 sm:w-20">
                {round.operation === "add" ? "Carry" : "Borrow"}
              </span>
              <div className="flex">
                {Array.from({ length: width }).map((_, i) => {
                  // i is display index (0=MSB), column index in solvedCols = width-1-i
                  const colIdx = width - 1 - i;
                  const solved = solvedCols[colIdx];
                  return (
                    <div
                      key={i}
                      className={`flex h-10 w-10 items-center justify-center sm:h-12 sm:w-12 ${
                        i === displayColIndex
                          ? "rounded-t-lg bg-yellow-50"
                          : ""
                      }`}
                    >
                      <span className="text-sm text-gray-400">
                        {solved ? solved.carry : ""}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Operand A */}
            <div className="flex items-center">
              <span className="w-16 text-right text-xs text-gray-400 sm:w-20" />
              <div className="flex">
                {round.operandA.map((bit, i) => (
                  <div
                    key={i}
                    className={`flex h-10 w-10 items-center justify-center font-bold sm:h-12 sm:w-12 ${
                      i === displayColIndex
                        ? "bg-yellow-50"
                        : ""
                    }`}
                  >
                    {bit}
                  </div>
                ))}
              </div>
            </div>

            {/* Operand B with operator */}
            <div className="flex items-center">
              <span className="w-16 text-right text-sm font-bold text-gray-600 sm:w-20">
                {round.operation === "add" ? "+" : "−"}
              </span>
              <div className="flex">
                {round.operandB.map((bit, i) => (
                  <div
                    key={i}
                    className={`flex h-10 w-10 items-center justify-center font-bold sm:h-12 sm:w-12 ${
                      i === displayColIndex
                        ? "bg-yellow-50"
                        : ""
                    }`}
                  >
                    {bit}
                  </div>
                ))}
              </div>
            </div>

            {/* Divider */}
            <div className="flex items-center">
              <span className="w-16 sm:w-20" />
              <div className="flex">
                {Array.from({ length: width }).map((_, i) => (
                  <div key={i} className="h-0.5 w-10 bg-gray-400 sm:w-12" />
                ))}
              </div>
            </div>

            {/* Result row */}
            <div className="flex items-center">
              <span className="w-16 text-right text-xs text-gray-400 sm:w-20">Result</span>
              <div className="flex">
                {Array.from({ length: width }).map((_, i) => {
                  const colIdx = width - 1 - i;
                  const solved = solvedCols[colIdx];
                  const isActive = i === displayColIndex && !solved;
                  return (
                    <div
                      key={i}
                      className={`flex h-10 w-10 items-center justify-center font-bold sm:h-12 sm:w-12 ${
                        isActive
                          ? "rounded-b-lg bg-yellow-100 ring-2 ring-yellow-400"
                          : i === displayColIndex
                            ? "rounded-b-lg bg-yellow-50"
                            : ""
                      }`}
                    >
                      {solved ? (
                        <span className="text-green-600">{solved.sum}</span>
                      ) : isActive ? (
                        <span className="text-yellow-600">_</span>
                      ) : (
                        ""
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Current column input */}
          <div className="flex flex-col items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 p-4">
            <p className="text-sm font-medium text-gray-600">
              Column {currentCol} (from right)
              {currentCol > 0 && solvedCols[currentCol - 1] && (
                <span className="ml-2 text-gray-400">
                  carry in: {solvedCols[currentCol - 1].carry}
                </span>
              )}
            </p>
            <div className="flex items-center gap-6">
              <div className="flex flex-col items-center gap-1">
                <span className="text-xs text-gray-500">
                  {round.operation === "add" ? "Sum" : "Diff"} bit
                </span>
                <button
                  onClick={() => {
                    if (phase === "playing" && !flash) {
                      playSound("click");
                      setSumBit((b) => (b === 0 ? 1 : 0));
                    }
                  }}
                  className={`flex h-14 w-14 items-center justify-center rounded-xl border-2 text-2xl font-bold transition-all ${
                    sumBit === 1
                      ? "border-yellow-400 bg-yellow-300 text-gray-900"
                      : "border-gray-300 bg-gray-200 text-gray-500"
                  }`}
                >
                  {sumBit}
                </button>
                <span className="text-[10px] text-gray-400">S key</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <span className="text-xs text-gray-500">
                  {round.operation === "add" ? "Carry" : "Borrow"} out
                </span>
                <button
                  onClick={() => {
                    if (phase === "playing" && !flash) {
                      playSound("click");
                      setCarryBit((b) => (b === 0 ? 1 : 0));
                    }
                  }}
                  className={`flex h-14 w-14 items-center justify-center rounded-xl border-2 text-2xl font-bold transition-all ${
                    carryBit === 1
                      ? "border-orange-400 bg-orange-300 text-gray-900"
                      : "border-gray-300 bg-gray-200 text-gray-500"
                  }`}
                >
                  {carryBit}
                </button>
                <span className="text-[10px] text-gray-400">C key</span>
              </div>
            </div>
          </div>

          <p className="text-xs text-gray-400">S: toggle sum · C: toggle carry · Enter: submit</p>

          <button
            onClick={submitColumn}
            className="rounded-xl bg-gray-900 px-8 py-3 text-lg font-medium text-white hover:bg-gray-700"
          >
            Submit Column
          </button>
        </div>
      )}
    </GameShell>
  );
}
