"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import GameShell from "@/components/GameShell";
import DifficultySelector from "@/components/DifficultySelector";
import {
  generateRound,
  checkAnswer,
  getOpLabel,
  type ALURound,
  type ALUFlags,
} from "@/lib/games/alu-arena";
import { type Difficulty, getSavedDifficulty, saveDifficulty } from "@/lib/difficulty";
import { playSound } from "@/lib/sounds";

const GAME_ID = "alu-arena";
const GAME_DURATION = 60;

type Phase = "idle" | "playing" | "over";

function BitRow({
  bits,
  label,
  interactive,
  onToggle,
}: {
  bits: number[];
  label: string;
  interactive?: boolean;
  onToggle?: (index: number) => void;
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-xs font-medium text-gray-500">{label}</span>
      <div className="flex gap-1.5">
        {bits.map((bit, i) => (
          <button
            key={i}
            onClick={interactive && onToggle ? () => onToggle(i) : undefined}
            disabled={!interactive}
            className={`flex h-12 w-12 items-center justify-center rounded-lg border-2 text-lg font-bold transition-all ${
              interactive
                ? bit === 1
                  ? "border-yellow-400 bg-yellow-300 text-gray-900 shadow-[0_0_12px_rgba(234,179,8,0.5)]"
                  : "border-gray-300 bg-gray-200 text-gray-500 hover:border-gray-400"
                : bit === 1
                  ? "border-cyan-300 bg-cyan-100 text-cyan-700"
                  : "border-gray-200 bg-gray-100 text-gray-400"
            }`}
          >
            {bit}
          </button>
        ))}
      </div>
      <div className="flex gap-1.5">
        {[8, 4, 2, 1].map((p, i) => (
          <span key={i} className="w-12 text-center text-[10px] text-gray-400">
            {p}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function ALUArenaPage() {
  const [difficulty, setDifficulty] = useState<Difficulty>(() => getSavedDifficulty(GAME_ID));
  const [round, setRound] = useState<ALURound>(() => generateRound(0, "easy"));
  const [playerBits, setPlayerBits] = useState([0, 0, 0, 0]);
  const [playerFlags, setPlayerFlags] = useState<ALUFlags>({ zero: 0, carry: 0, negative: 0 });
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
    setPlayerBits([0, 0, 0, 0]);
    setPlayerFlags({ zero: 0, carry: 0, negative: 0 });
    setRound(generateRound(0, difficulty));
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

  const toggleFlag = useCallback(
    (flag: keyof ALUFlags) => {
      if (phase !== "playing" || flash) return;
      playSound("click");
      setPlayerFlags((prev) => ({ ...prev, [flag]: prev[flag] === 0 ? 1 : 0 }));
    },
    [phase, flash]
  );

  const handleSubmit = useCallback(() => {
    if (phase !== "playing" || flash) return;

    const { resultCorrect, flagsCorrect } = checkAnswer(
      playerBits,
      round.showFlags ? playerFlags : null,
      round
    );

    if (resultCorrect && flagsCorrect) {
      playSound("correct");
      const bonus = round.showFlags ? 2 : 1;
      const newScore = score + bonus;
      setScore(newScore);
      setFlash("correct");
      if (flashTimeout.current) clearTimeout(flashTimeout.current);
      flashTimeout.current = setTimeout(() => {
        setFlash(null);
        setPlayerBits([0, 0, 0, 0]);
        setPlayerFlags({ zero: 0, carry: 0, negative: 0 });
        setRound(generateRound(newScore, difficulty));
      }, 300);
    } else {
      playSound("wrong");
      setFlash("wrong");
      if (flashTimeout.current) clearTimeout(flashTimeout.current);
      flashTimeout.current = setTimeout(() => {
        setFlash(null);
      }, 500);
    }
  }, [phase, flash, playerBits, playerFlags, round, score, difficulty]);

  const handleDifficulty = (d: Difficulty) => {
    setDifficulty(d);
    saveDifficulty(GAME_ID, d);
  };

  useEffect(() => {
    if (phase !== "playing") return;
    const handler = (e: KeyboardEvent) => {
      if (flash) return;
      const key = parseInt(e.key, 10);
      if (key >= 1 && key <= 4) {
        e.preventDefault();
        toggleBit(key - 1);
      }
      if (e.key === "z" || e.key === "Z") toggleFlag("zero");
      if (e.key === "c" || e.key === "C") toggleFlag("carry");
      if (e.key === "n" || e.key === "N") toggleFlag("negative");
      if (e.key === "Enter") {
        e.preventDefault();
        handleSubmit();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [phase, flash, toggleBit, toggleFlag, handleSubmit]);

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
      title="Mini-ALU Arena"
      score={score}
      onRestart={start}
      showTimer={phase === "playing"}
      timeLeft={timeLeft}
      instructions="Compute the ALU result! Toggle the 4 result bits (keys 1-4) and flags (Z/C/N) to match the operation output. Enter to submit."
      difficulty={difficulty}
      flash={flash}
    >
      {phase === "idle" && (
        <div className="flex flex-col items-center gap-4 py-12">
          <p className="text-gray-500">Compute ALU operations on 4-bit numbers!</p>
          <DifficultySelector difficulty={difficulty} onChange={handleDifficulty} />
          <p className="text-sm text-gray-400">
            {difficulty === "easy" && "AND, OR — no flags"}
            {difficulty === "medium" && "ADD, SUB, AND, OR — with carry flag"}
            {difficulty === "hard" && "All operations — all flags (Zero, Carry, Negative)"}
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
            <p className="text-2xl font-bold text-cyan-700">{score} points</p>
            <p className="text-cyan-600">in {GAME_DURATION} seconds</p>
          </div>
        </div>
      )}

      {phase === "playing" && (
        <div className="flex flex-col items-center gap-5 py-6">
          <span className="rounded-full bg-cyan-100 px-3 py-1 text-xs font-medium text-cyan-700">
            {getOpLabel(round.operation)}
          </span>

          {/* Inputs A and B */}
          <div className="flex items-center gap-6">
            <BitRow bits={round.a} label="A" />
            {round.operation !== "NOT_A" && <BitRow bits={round.b} label="B" />}
          </div>

          {/* Flash feedback */}
          {flash === "correct" && (
            <p className="text-sm font-medium text-green-600">Correct!</p>
          )}
          {flash === "wrong" && (
            <p className="text-sm font-medium text-red-500">
              Not quite — adjust your answer!
            </p>
          )}

          {/* Result bits */}
          <BitRow bits={playerBits} label="Result" interactive onToggle={toggleBit} />

          {/* Flags */}
          {round.showFlags && (
            <div className="flex flex-col items-center gap-2">
              <span className="text-xs font-medium text-gray-500">Flags</span>
              <div className="flex gap-2">
                {(["zero", "carry", "negative"] as const).map((flag) => (
                  <button
                    key={flag}
                    onClick={() => toggleFlag(flag)}
                    className={`rounded-lg border-2 px-3 py-2 text-sm font-bold transition-all ${
                      playerFlags[flag] === 1
                        ? "border-cyan-400 bg-cyan-100 text-cyan-700"
                        : "border-gray-300 bg-gray-100 text-gray-400"
                    }`}
                  >
                    {flag[0].toUpperCase()}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-400">Z / C / N</p>
            </div>
          )}

          <p className="text-xs text-gray-400">Keys 1–4 toggle bits · Z/C/N flags · Enter submit</p>

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
