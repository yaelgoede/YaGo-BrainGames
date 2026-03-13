"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import GameShell from "@/components/GameShell";
import DifficultySelector from "@/components/DifficultySelector";
import { generateGateRound, getAvailableGates, type GateRound } from "@/lib/games/gate-school";
import { type Difficulty, DIFFICULTY_OFFSET, getSavedDifficulty, saveDifficulty } from "@/lib/difficulty";
import { playSound } from "@/lib/sounds";

const GAME_ID = "gate-school";
const GAME_DURATION = 60;

type Phase = "idle" | "playing" | "over";

export default function GateSchoolPage() {
  const [difficulty, setDifficulty] = useState<Difficulty>(() => getSavedDifficulty(GAME_ID));
  const [round, setRound] = useState<GateRound>(() => generateGateRound(0, 0));
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [phase, setPhase] = useState<Phase>("idle");
  const [flash, setFlash] = useState<"correct" | "wrong" | null>(null);
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
    setRound(generateGateRound(0, offset));
    setFlash(null);
  }, [offset]);

  const handleAnswer = useCallback((answer: number) => {
    if (flash) return;

    if (answer === round.correctOutput) {
      playSound("correct");
      const newScore = score + 1;
      setScore(newScore);
      setFlash("correct");
      if (flashTimeout.current) clearTimeout(flashTimeout.current);
      flashTimeout.current = setTimeout(() => {
        setFlash(null);
        setRound(generateGateRound(newScore, offset));
      }, 300);
    } else {
      playSound("wrong");
      setFlash("wrong");
      if (flashTimeout.current) clearTimeout(flashTimeout.current);
      flashTimeout.current = setTimeout(() => {
        setFlash(null);
        setRound(generateGateRound(score, offset));
      }, 500);
    }
  }, [flash, round, score, offset]);

  const handleDifficulty = (d: Difficulty) => {
    setDifficulty(d);
    saveDifficulty(GAME_ID, d);
  };

  useEffect(() => {
    if (phase !== "playing" || flash) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "0") handleAnswer(0);
      if (e.key === "1") handleAnswer(1);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [phase, flash, handleAnswer]);

  useEffect(() => {
    if (phase !== "idle") return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Enter") start();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [phase, start]);

  const isNotGate = round.gate === "NOT";
  const availableGates = phase === "playing" ? getAvailableGates(score, offset) : [];

  return (
    <GameShell
      gameId={GAME_ID}
      title="Gate School"
      score={score}
      onRestart={start}
      showTimer={phase === "playing"}
      timeLeft={timeLeft}
      instructions="Learn logic gates! A truth table is shown for reference. Given the inputs, pick the correct output (0 or 1). New gates unlock as you score higher. Use keys 0 and 1."
      difficulty={difficulty}
      flash={flash}
    >
      {phase === "idle" && (
        <div className="flex flex-col items-center gap-4 py-12">
          <p className="text-gray-500">Learn logic gates step by step!</p>
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
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-orange-100 px-3 py-1 text-sm font-bold text-orange-700">
              {round.gate}
            </span>
            <span className="text-xs text-gray-400">
              Gates unlocked: {availableGates.join(", ")}
            </span>
          </div>

          {/* Truth table reference */}
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <table className="text-center text-sm">
              <thead>
                <tr className="text-gray-500">
                  <th className="px-3 py-1">A</th>
                  {!isNotGate && <th className="px-3 py-1">B</th>}
                  <th className="px-3 py-1">Out</th>
                </tr>
              </thead>
              <tbody>
                {round.truthTable.map((entry, i) => {
                  const isCurrentRow = isNotGate
                    ? entry.a === round.inputA
                    : entry.a === round.inputA && entry.b === round.inputB;
                  return (
                    <tr
                      key={i}
                      className={isCurrentRow ? "bg-orange-50 font-bold text-orange-700" : "text-gray-700"}
                    >
                      <td className="px-3 py-1">{entry.a}</td>
                      {!isNotGate && <td className="px-3 py-1">{entry.b}</td>}
                      <td className="px-3 py-1">?</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Current inputs */}
          <div className="text-center">
            <p className="text-lg text-gray-600">
              A = <span className="font-bold text-gray-900">{round.inputA}</span>
              {!isNotGate && (
                <>
                  {" "} B = <span className="font-bold text-gray-900">{round.inputB}</span>
                </>
              )}
            </p>
            <p className="mt-1 text-sm text-gray-400">What is the output?</p>
          </div>

          {/* Answer buttons */}
          <div className="flex gap-4">
            {[0, 1].map((val) => (
              <button
                key={val}
                onClick={() => handleAnswer(val)}
                className={`flex h-20 w-20 flex-col items-center justify-center rounded-2xl border-2 text-3xl font-bold transition-all
                  ${flash === "correct" && val === round.correctOutput
                    ? "border-green-400 bg-green-50 text-green-700 scale-105"
                    : flash === "wrong" && val !== round.correctOutput
                      ? ""
                      : "border-gray-200 bg-white text-gray-900 hover:border-orange-400 hover:bg-orange-50 cursor-pointer"
                  }`}
              >
                {val}
                <span className="text-xs font-normal text-gray-400">{val}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </GameShell>
  );
}
