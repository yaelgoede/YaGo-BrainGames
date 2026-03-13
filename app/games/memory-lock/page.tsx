"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import GameShell from "@/components/GameShell";
import DifficultySelector from "@/components/DifficultySelector";
import { generateRound, type MemoryLockRound } from "@/lib/games/memory-lock";
import { type Difficulty, getSavedDifficulty, saveDifficulty } from "@/lib/difficulty";
import { playSound } from "@/lib/sounds";

const GAME_ID = "memory-lock";
const GAME_DURATION = 60;

type Phase = "idle" | "playing" | "over";

const FF_LABELS: Record<string, string> = {
  SR: "SR Latch",
  D: "D Flip-Flop",
  JK: "JK Flip-Flop",
};

export default function MemoryLockPage() {
  const [difficulty, setDifficulty] = useState<Difficulty>(() => getSavedDifficulty(GAME_ID));
  const [round, setRound] = useState<MemoryLockRound>(() => generateRound(0, "easy"));
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [phase, setPhase] = useState<Phase>("idle");
  const [flash, setFlash] = useState<"correct" | "wrong" | null>(null);
  const flashTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (phase !== "playing") return;
    if (timeLeft <= 0) {
      const t = setTimeout(() => {
        playSound("gameOver");
        setPhase("over");
      }, 0);
      return () => clearTimeout(t);
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
    setRound(generateRound(0, difficulty));
    setFlash(null);
  }, [difficulty]);

  const handleAnswer = useCallback(
    (answer: number) => {
      if (phase !== "playing" || flash) return;

      if (answer === round.correctQ) {
        playSound("correct");
        const newScore = score + 1;
        setScore(newScore);
        setFlash("correct");
        if (flashTimeout.current) clearTimeout(flashTimeout.current);
        flashTimeout.current = setTimeout(() => {
          setFlash(null);
          setRound(generateRound(newScore, difficulty));
        }, 300);
      } else {
        playSound("wrong");
        setFlash("wrong");
        if (flashTimeout.current) clearTimeout(flashTimeout.current);
        flashTimeout.current = setTimeout(() => {
          setFlash(null);
          setRound(generateRound(score, difficulty));
        }, 500);
      }
    },
    [phase, flash, round, score, difficulty]
  );

  const handleDifficulty = (d: Difficulty) => {
    setDifficulty(d);
    saveDifficulty(GAME_ID, d);
  };

  useEffect(() => {
    if (phase !== "playing") return;
    const handler = (e: KeyboardEvent) => {
      if (flash) return;
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

  return (
    <GameShell
      gameId={GAME_ID}
      title="Memory Lock"
      score={score}
      onRestart={start}
      showTimer={phase === "playing"}
      timeLeft={timeLeft}
      instructions="Predict the flip-flop output (Q) after clock pulses! SR: Set/Reset. D: Data passes through. JK: like SR but J=K=1 toggles. Press 0 or 1 to answer."
      difficulty={difficulty}
      flash={flash}
    >
      {phase === "idle" && (
        <div className="flex flex-col items-center gap-4 py-12">
          <p className="text-gray-500">Predict flip-flop outputs after clock pulses!</p>
          <DifficultySelector difficulty={difficulty} onChange={handleDifficulty} />
          <p className="text-sm text-gray-400">
            {difficulty === "easy" && "SR Latch — 1 clock pulse"}
            {difficulty === "medium" && "D Flip-Flop — up to 2 pulses"}
            {difficulty === "hard" && "JK Flip-Flop — up to 3 pulses with toggle"}
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
          <div className="rounded-lg bg-cyan-50 p-6 text-center">
            <p className="text-2xl font-bold text-cyan-700">{score} correct</p>
            <p className="text-cyan-600">in {GAME_DURATION} seconds</p>
          </div>
        </div>
      )}

      {phase === "playing" && (
        <div className="flex flex-col items-center gap-6 py-8">
          <span className="rounded-full bg-cyan-100 px-3 py-1 text-xs font-medium text-cyan-700">
            {FF_LABELS[round.flipFlopType]}
          </span>

          {/* Initial state */}
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500">Initial Q =</span>
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-900 text-lg font-bold text-white">
              {round.initialQ}
            </span>
          </div>

          {/* Clock pulses */}
          <div className="flex flex-col gap-3">
            {round.pulses.map((pulse, i) => (
              <div
                key={i}
                className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3"
              >
                <span className="text-sm font-medium text-gray-500">
                  Pulse {i + 1}:
                </span>
                {round.inputLabels.map((label) => (
                  <span key={label} className="flex items-center gap-1">
                    <span className="text-sm text-gray-600">{label}=</span>
                    <span
                      className={`flex h-8 w-8 items-center justify-center rounded-md text-sm font-bold ${
                        pulse.inputs[label] === 1
                          ? "bg-cyan-100 text-cyan-700"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {pulse.inputs[label]}
                    </span>
                  </span>
                ))}
              </div>
            ))}
          </div>

          {/* Flash feedback */}
          {flash === "correct" && (
            <p className="text-sm font-medium text-green-600">Correct!</p>
          )}
          {flash === "wrong" && (
            <p className="text-sm font-medium text-red-500">
              Wrong! Q = {round.correctQ}
            </p>
          )}

          {/* Answer buttons */}
          <div className="flex flex-col items-center gap-2">
            <p className="text-sm font-medium text-gray-700">After all pulses, Q = ?</p>
            <div className="flex gap-4">
              {[0, 1].map((val) => (
                <button
                  key={val}
                  onClick={() => handleAnswer(val)}
                  className="flex h-16 w-16 items-center justify-center rounded-xl border-2 border-gray-200 bg-white text-2xl font-bold text-gray-900 transition-all hover:border-cyan-400 hover:bg-cyan-50"
                >
                  {val}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-400">Press 0 or 1</p>
          </div>
        </div>
      )}
    </GameShell>
  );
}
