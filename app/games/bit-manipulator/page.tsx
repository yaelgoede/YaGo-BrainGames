"use client";

import { useState, useCallback, useEffect } from "react";
import GameShell from "@/components/GameShell";
import {
  generateLevel,
  applyOperation,
  checkSolution,
  getNewOpsAtLevel,
  OPERATION_DESCRIPTIONS,
  type BitOperation,
  type PuzzleLevel,
} from "@/lib/games/bit-manipulator";
import { playSound } from "@/lib/sounds";

const GAME_ID = "bit-manipulator";

type Phase = "idle" | "playing" | "intro";

export default function BitManipulatorPage() {
  const [level, setLevel] = useState<PuzzleLevel>(() => generateLevel(1));
  const [currentBits, setCurrentBits] = useState<number[]>([]);
  const [score, setScore] = useState(0);
  const [steps, setSteps] = useState(0);
  const [phase, setPhase] = useState<Phase>("idle");
  const [selectedOp, setSelectedOp] = useState<BitOperation | null>(null);
  const [mask, setMask] = useState<number[]>([]);
  const [introOps, setIntroOps] = useState<BitOperation[]>([]);

  const startLevel = useCallback((levelNum: number) => {
    const newLevel = generateLevel(levelNum);
    const newOps = getNewOpsAtLevel(levelNum);

    if (newOps.length > 0) {
      setIntroOps(newOps);
      setPhase("intro");
      setLevel(newLevel);
      setCurrentBits([...newLevel.startBits]);
      setSteps(0);
      setSelectedOp(null);
      setMask([]);
    } else {
      setLevel(newLevel);
      setCurrentBits([...newLevel.startBits]);
      setSteps(0);
      setSelectedOp(null);
      setMask([]);
      setPhase("playing");
    }
  }, []);

  const start = useCallback(() => {
    setScore(0);
    startLevel(1);
  }, [startLevel]);

  const restart = useCallback(() => {
    setPhase("idle");
    setScore(0);
    setSteps(0);
  }, []);

  const dismissIntro = useCallback(() => {
    setPhase("playing");
  }, []);

  const handleSelectOp = useCallback((op: BitOperation) => {
    setSelectedOp(op);
    if (op === "SHIFT_LEFT" || op === "SHIFT_RIGHT") {
      setMask([]);
    } else {
      setMask(new Array(level.bitCount).fill(0));
    }
  }, [level.bitCount]);

  const handleToggleMaskBit = useCallback((index: number) => {
    setMask((prev) => {
      const next = [...prev];
      next[index] = next[index] === 0 ? 1 : 0;
      return next;
    });
  }, []);

  const handleApply = useCallback(() => {
    if (!selectedOp) return;

    let newBits: number[];
    if (selectedOp === "SHIFT_LEFT" || selectedOp === "SHIFT_RIGHT") {
      newBits = applyOperation(currentBits, selectedOp);
    } else if (selectedOp === "NOT") {
      // For NOT, if no mask bits are set, flip all
      const hasSelection = mask.some((b) => b === 1);
      newBits = applyOperation(currentBits, selectedOp, hasSelection ? mask : undefined);
    } else {
      newBits = applyOperation(currentBits, selectedOp, mask);
    }

    setCurrentBits(newBits);
    setSteps((s) => s + 1);
    setSelectedOp(null);
    setMask([]);

    if (checkSolution(newBits, level.targetBits)) {
      playSound("levelUp");
      const levelScore = Math.max(1, level.optimalSteps * 2 - (steps + 1));
      const newScore = score + levelScore;
      setScore(newScore);
      setTimeout(() => {
        startLevel(level.levelNumber + 1);
      }, 600);
    }
  }, [selectedOp, currentBits, mask, level, steps, score, startLevel]);

  const handleReset = useCallback(() => {
    setCurrentBits([...level.startBits]);
    setSteps(0);
    setSelectedOp(null);
    setMask([]);
  }, [level.startBits]);

  useEffect(() => {
    if (phase !== "idle") return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Enter") start();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [phase, start]);

  useEffect(() => {
    if (phase !== "intro") return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") dismissIntro();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [phase, dismissIntro]);

  return (
    <GameShell
      gameId={GAME_ID}
      title="Bit Manipulator"
      score={score}
      onRestart={restart}
      instructions="Transform the start bits into the target using bitwise operations. Select an operation, set a mask (if needed), then apply. Fewer steps = higher score!"
    >
      {phase === "idle" && (
        <div className="flex flex-col items-center gap-4 py-12">
          <p className="text-gray-500">Apply bitwise operations to match the target pattern!</p>
          <button
            onClick={start}
            className="rounded-xl bg-gray-900 px-8 py-3 text-lg font-medium text-white hover:bg-gray-700"
          >
            Start
          </button>
          <p className="text-xs text-gray-400">or press Enter</p>
        </div>
      )}

      {phase === "intro" && (
        <div className="flex flex-col items-center gap-4 py-12">
          <p className="text-lg font-semibold text-orange-700">
            Level {level.levelNumber} — New Operation{introOps.length > 1 ? "s" : ""}!
          </p>
          {introOps.map((op) => (
            <div key={op} className="rounded-lg border border-orange-200 bg-orange-50 p-4 text-center max-w-md">
              <p className="font-bold text-orange-700">{op.replace("_", " ")}</p>
              <p className="text-sm text-orange-600 mt-1">{OPERATION_DESCRIPTIONS[op]}</p>
            </div>
          ))}
          <button
            onClick={dismissIntro}
            className="rounded-xl bg-gray-900 px-8 py-3 text-lg font-medium text-white hover:bg-gray-700"
          >
            Got it!
          </button>
          <p className="text-xs text-gray-400">or press Enter</p>
        </div>
      )}

      {phase === "playing" && (
        <div className="flex flex-col items-center gap-6 py-6">
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <span>Level {level.levelNumber}</span>
            <span>Steps: {steps}</span>
            <span className="text-xs text-gray-400">(optimal: {level.optimalSteps})</span>
          </div>

          {/* Bit grids */}
          <div className="flex flex-col gap-4 w-full max-w-md">
            {/* Start reference */}
            <div className="flex items-center gap-3">
              <span className="w-16 text-xs text-gray-400 text-right">Start</span>
              <div className="flex gap-1">
                {level.startBits.map((bit, i) => (
                  <div
                    key={i}
                    className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100 text-sm font-mono font-bold text-gray-400"
                  >
                    {bit}
                  </div>
                ))}
              </div>
            </div>

            {/* Current */}
            <div className="flex items-center gap-3">
              <span className="w-16 text-xs text-gray-600 text-right font-medium">Current</span>
              <div className="flex gap-1">
                {currentBits.map((bit, i) => (
                  <div
                    key={i}
                    className={`flex h-10 w-10 items-center justify-center rounded-lg text-sm font-mono font-bold ${
                      bit === level.targetBits[i]
                        ? "bg-green-100 text-green-700"
                        : "bg-white border-2 border-gray-300 text-gray-900"
                    }`}
                  >
                    {bit}
                  </div>
                ))}
              </div>
            </div>

            {/* Target */}
            <div className="flex items-center gap-3">
              <span className="w-16 text-xs text-orange-600 text-right font-medium">Target</span>
              <div className="flex gap-1">
                {level.targetBits.map((bit, i) => (
                  <div
                    key={i}
                    className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-100 text-sm font-mono font-bold text-orange-700"
                  >
                    {bit}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Operation toolbar */}
          <div className="flex flex-wrap justify-center gap-2">
            {level.availableOps.map((op) => (
              <button
                key={op}
                onClick={() => handleSelectOp(op)}
                className={`rounded-lg px-3 py-2 text-xs font-medium transition-all cursor-pointer ${
                  selectedOp === op
                    ? "bg-orange-500 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {op.replace("_", " ")}
              </button>
            ))}
          </div>

          {/* Mask builder (for non-shift operations) */}
          {selectedOp && selectedOp !== "SHIFT_LEFT" && selectedOp !== "SHIFT_RIGHT" && (
            <div className="flex flex-col items-center gap-2">
              <p className="text-xs text-gray-500">
                {selectedOp === "NOT" ? "Click bits to toggle (empty = flip all)" : "Click to set mask bits"}
              </p>
              <div className="flex gap-1">
                {mask.map((bit, i) => (
                  <button
                    key={i}
                    onClick={() => handleToggleMaskBit(i)}
                    className={`flex h-10 w-10 items-center justify-center rounded-lg text-sm font-mono font-bold cursor-pointer transition-all ${
                      bit === 1
                        ? "bg-orange-200 text-orange-800 border-2 border-orange-400"
                        : "bg-gray-50 text-gray-300 border-2 border-gray-200 hover:border-gray-400"
                    }`}
                  >
                    {bit}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Apply / Reset buttons */}
          <div className="flex gap-3">
            {selectedOp && (
              <button
                onClick={handleApply}
                className="rounded-xl bg-orange-500 px-6 py-2 font-medium text-white hover:bg-orange-600 cursor-pointer"
              >
                Apply {selectedOp.replace("_", " ")}
              </button>
            )}
            <button
              onClick={handleReset}
              className="rounded-xl border-2 border-gray-200 px-6 py-2 font-medium text-gray-600 hover:bg-gray-50 cursor-pointer"
            >
              Reset
            </button>
          </div>
        </div>
      )}
    </GameShell>
  );
}
