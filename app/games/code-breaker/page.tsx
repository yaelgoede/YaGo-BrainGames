"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import GameShell from "@/components/GameShell";
import DifficultySelector from "@/components/DifficultySelector";
import {
  generateRound,
  checkDecode,
  checkEncode,
  type CodeBreakerRound,
  type Opcode,
} from "@/lib/games/code-breaker";
import { type Difficulty, getSavedDifficulty, saveDifficulty } from "@/lib/difficulty";
import { playSound } from "@/lib/sounds";

const GAME_ID = "code-breaker";
const GAME_DURATION = 60;

type Phase = "idle" | "playing" | "over";

export default function CodeBreakerPage() {
  const [difficulty, setDifficulty] = useState<Difficulty>(() => getSavedDifficulty(GAME_ID));
  const [round, setRound] = useState<CodeBreakerRound>(() => generateRound(0, "easy", 0));
  const [roundIndex, setRoundIndex] = useState(0);
  const [playerBits, setPlayerBits] = useState([0, 0, 0, 0, 0, 0, 0, 0]);
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
    setRoundIndex(0);
    setRound(generateRound(0, difficulty, 0));
    setPlayerBits([0, 0, 0, 0, 0, 0, 0, 0]);
    setFlash(null);
  }, [difficulty]);

  const advanceRound = useCallback(
    (newScore: number) => {
      const newRoundIndex = roundIndex + 1;
      setRoundIndex(newRoundIndex);
      setRound(generateRound(newScore, difficulty, newRoundIndex));
      setPlayerBits([0, 0, 0, 0, 0, 0, 0, 0]);
    },
    [roundIndex, difficulty]
  );

  const handleDecode = useCallback(
    (answer: Opcode) => {
      if (phase !== "playing" || flash) return;

      if (checkDecode(answer, round)) {
        playSound("correct");
        const newScore = score + 1;
        setScore(newScore);
        setFlash("correct");
        if (flashTimeout.current) clearTimeout(flashTimeout.current);
        flashTimeout.current = setTimeout(() => {
          setFlash(null);
          advanceRound(newScore);
        }, 300);
      } else {
        playSound("wrong");
        setFlash("wrong");
        if (flashTimeout.current) clearTimeout(flashTimeout.current);
        flashTimeout.current = setTimeout(() => {
          setFlash(null);
          advanceRound(score);
        }, 500);
      }
    },
    [phase, flash, round, score, advanceRound]
  );

  const handleEncodeSubmit = useCallback(() => {
    if (phase !== "playing" || flash) return;

    if (checkEncode(playerBits, round)) {
      playSound("correct");
      const newScore = score + 1;
      setScore(newScore);
      setFlash("correct");
      if (flashTimeout.current) clearTimeout(flashTimeout.current);
      flashTimeout.current = setTimeout(() => {
        setFlash(null);
        advanceRound(newScore);
      }, 300);
    } else {
      playSound("wrong");
      setFlash("wrong");
      if (flashTimeout.current) clearTimeout(flashTimeout.current);
      flashTimeout.current = setTimeout(() => {
        setFlash(null);
      }, 500);
    }
  }, [phase, flash, playerBits, round, score, advanceRound]);

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

  const handleDifficulty = (d: Difficulty) => {
    setDifficulty(d);
    saveDifficulty(GAME_ID, d);
  };

  // Keyboard
  useEffect(() => {
    if (phase !== "playing") return;
    const handler = (e: KeyboardEvent) => {
      if (flash) return;
      if (round.mode === "decode") {
        const key = parseInt(e.key, 10);
        if (key >= 1 && key <= 4 && round.options[key - 1]) {
          e.preventDefault();
          handleDecode(round.options[key - 1]);
        }
      } else {
        const key = parseInt(e.key, 10);
        if (key >= 1 && key <= 8) {
          e.preventDefault();
          toggleBit(key - 1);
        }
        if (e.key === "Enter") {
          e.preventDefault();
          handleEncodeSubmit();
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [phase, flash, round, handleDecode, toggleBit, handleEncodeSubmit]);

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
      title="Code Breaker"
      score={score}
      onRestart={start}
      showTimer={phase === "playing"}
      timeLeft={timeLeft}
      instructions="Decode: identify the opcode from binary. Encode: build the instruction word from a description. 8-bit format: [3-bit opcode | 5-bit address]. Keys 1-4 for decode, 1-8 toggle bits for encode."
      difficulty={difficulty}
      flash={flash}
    >
      {phase === "idle" && (
        <div className="flex flex-col items-center gap-4 py-12">
          <p className="text-gray-500">Decode and encode machine instructions!</p>
          <DifficultySelector difficulty={difficulty} onChange={handleDifficulty} />
          <p className="text-sm text-gray-400">
            {difficulty === "easy" && "Decode only — identify opcodes from binary"}
            {difficulty === "medium" && "Mixed — decode and encode alternating"}
            {difficulty === "hard" && "Encode only — build instructions from descriptions"}
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
            {round.mode === "decode" ? "DECODE" : "ENCODE"}
          </span>

          {round.mode === "decode" ? (
            <>
              {/* Show instruction bits with colored fields */}
              <div className="flex gap-0.5">
                {round.bits.map((bit, i) => (
                  <div
                    key={i}
                    className={`flex h-12 w-10 items-center justify-center text-lg font-bold sm:h-14 sm:w-12 sm:text-xl ${
                      i < 3
                        ? "rounded-l-lg border-2 border-cyan-300 bg-cyan-100 text-cyan-700"
                        : "border-2 border-gray-200 bg-gray-100 text-gray-600"
                    } ${i === 0 ? "rounded-l-lg" : ""} ${i === 7 ? "rounded-r-lg" : ""} ${i === 2 ? "rounded-r-lg" : ""} ${i === 3 ? "rounded-l-lg" : ""}`}
                  >
                    {bit}
                  </div>
                ))}
              </div>
              <div className="flex gap-8 text-xs text-gray-400">
                <span>opcode (3 bits)</span>
                <span>address (5 bits)</span>
              </div>

              {/* Flash feedback */}
              {flash === "correct" && (
                <p className="text-sm font-medium text-green-600">Correct!</p>
              )}
              {flash === "wrong" && (
                <p className="text-sm font-medium text-red-500">
                  Wrong! It was {round.instruction.opcode}
                </p>
              )}

              {/* Multiple choice */}
              <div className="grid grid-cols-2 gap-3">
                {round.options.map((op, i) => (
                  <button
                    key={op}
                    onClick={() => handleDecode(op)}
                    className="rounded-xl border-2 border-gray-200 bg-white px-6 py-3 text-sm font-semibold text-gray-900 transition-all hover:border-cyan-400 hover:bg-cyan-50"
                  >
                    <span className="text-xs text-gray-400">{i + 1}. </span>
                    {op}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              {/* Show description */}
              <p className="text-xl font-semibold text-gray-900">{round.description}</p>
              <p className="text-sm text-gray-400">
                Build the 8-bit instruction: [3-bit opcode | 5-bit address]
              </p>

              {/* Flash feedback */}
              {flash === "correct" && (
                <p className="text-sm font-medium text-green-600">Correct!</p>
              )}
              {flash === "wrong" && (
                <p className="text-sm font-medium text-red-500">Not quite — adjust your bits!</p>
              )}

              {/* Toggleable bits with field labels */}
              <div className="flex flex-col items-center gap-1">
                <div className="flex gap-0.5">
                  {playerBits.map((bit, i) => (
                    <button
                      key={i}
                      onClick={() => toggleBit(i)}
                      className={`flex h-12 w-10 items-center justify-center text-lg font-bold transition-all sm:h-14 sm:w-12 sm:text-xl ${
                        bit === 1
                          ? i < 3
                            ? "border-2 border-cyan-400 bg-cyan-200 text-cyan-800 shadow-[0_0_8px_rgba(8,145,178,0.4)]"
                            : "border-2 border-yellow-400 bg-yellow-300 text-gray-900 shadow-[0_0_12px_rgba(234,179,8,0.5)]"
                          : "border-2 border-gray-300 bg-gray-200 text-gray-500"
                      } ${i === 0 ? "rounded-l-lg" : ""} ${i === 7 ? "rounded-r-lg" : ""} ${i === 2 ? "rounded-r-lg" : ""} ${i === 3 ? "rounded-l-lg" : ""}`}
                    >
                      {bit}
                    </button>
                  ))}
                </div>
                <div className="flex gap-0.5">
                  {[...Array(8)].map((_, i) => (
                    <span
                      key={i}
                      className="w-10 text-center text-[10px] text-gray-400 sm:w-12"
                    >
                      {i < 3 ? `op${2 - i}` : `a${4 - (i - 3)}`}
                    </span>
                  ))}
                </div>
              </div>

              <p className="text-xs text-gray-400">Keys 1–8 toggle bits · Enter to submit</p>

              <button
                onClick={handleEncodeSubmit}
                className="rounded-xl bg-gray-900 px-8 py-3 text-lg font-medium text-white hover:bg-gray-700"
              >
                Check
              </button>
            </>
          )}
        </div>
      )}
    </GameShell>
  );
}
