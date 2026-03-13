"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import GameShell from "@/components/GameShell";
import DifficultySelector from "@/components/DifficultySelector";
import {
  generateRound,
  checkBits,
  checkTypedAnswer,
  bitsToNumber,
  isToggleMode,
  MODE_LABELS,
  type ConvertRound,
} from "@/lib/games/binary-convert";
import { type Difficulty, getSavedDifficulty, saveDifficulty } from "@/lib/difficulty";
import { playSound } from "@/lib/sounds";

const GAME_ID = "binary-convert";
const POWERS_8 = [128, 64, 32, 16, 8, 4, 2, 1];
const POWERS_4 = [8, 4, 2, 1];

type Phase = "idle" | "playing" | "over";

export default function BinaryConvertPage() {
  const [difficulty, setDifficulty] = useState<Difficulty>(() => getSavedDifficulty(GAME_ID));
  const [round, setRound] = useState<ConvertRound>(() => generateRound("easy"));
  const [playerBits, setPlayerBits] = useState<number[]>([0, 0, 0, 0, 0, 0, 0, 0]);
  const [input, setInput] = useState("");
  const [score, setScore] = useState(0);
  const [phase, setPhase] = useState<Phase>("idle");
  const [flash, setFlash] = useState<"correct" | "wrong" | null>(null);
  const [lives, setLives] = useState(3);
  const flashTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (flashTimeout.current) clearTimeout(flashTimeout.current);
    };
  }, []);

  const start = useCallback(() => {
    const newRound = generateRound(difficulty);
    setPhase("playing");
    setScore(0);
    setLives(3);
    setInput("");
    setPlayerBits(new Array(newRound.bitWidth).fill(0));
    setRound(newRound);
    setFlash(null);
    setTimeout(() => inputRef.current?.focus(), 50);
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

    const toggle = isToggleMode(round.mode);
    const correct = toggle
      ? checkBits(playerBits, round)
      : checkTypedAnswer(input, round);

    if (correct) {
      playSound("correct");
      const newScore = score + 1;
      setScore(newScore);
      setFlash("correct");
      if (flashTimeout.current) clearTimeout(flashTimeout.current);
      flashTimeout.current = setTimeout(() => {
        setFlash(null);
        const newRound = generateRound(difficulty, round.value);
        setRound(newRound);
        setPlayerBits(new Array(newRound.bitWidth).fill(0));
        setInput("");
        setTimeout(() => inputRef.current?.focus(), 50);
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
          const newRound = generateRound(difficulty, round.value);
          setRound(newRound);
          setPlayerBits(new Array(newRound.bitWidth).fill(0));
          setInput("");
          setTimeout(() => inputRef.current?.focus(), 50);
        }
      }, 500);
    }
  }, [phase, flash, input, playerBits, round, score, difficulty, lives]);

  const handleDifficulty = (d: Difficulty) => {
    setDifficulty(d);
    saveDifficulty(GAME_ID, d);
  };

  // Keyboard: 1-8 toggle bits (in toggle mode), Enter to submit
  useEffect(() => {
    if (phase !== "playing") return;
    const handler = (e: KeyboardEvent) => {
      if (flash) return;
      if (isToggleMode(round.mode)) {
        const key = parseInt(e.key, 10);
        if (key >= 1 && key <= round.bitWidth) {
          e.preventDefault();
          toggleBit(key - 1);
        }
      }
      if (e.key === "Enter" && !isToggleMode(round.mode)) {
        // form handles Enter for typed input
      } else if (e.key === "Enter" && isToggleMode(round.mode)) {
        e.preventDefault();
        handleSubmit();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [phase, flash, toggleBit, handleSubmit, round]);

  useEffect(() => {
    if (phase !== "idle") return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Enter") start();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [phase, start]);

  const toggle = isToggleMode(round.mode);
  const powers = round.bitWidth === 4 ? POWERS_4 : POWERS_8;
  const playerDecimal = bitsToNumber(playerBits);

  return (
    <GameShell
      gameId={GAME_ID}
      title="Binary Convert"
      score={score}
      onRestart={start}
      instructions="Convert between binary and decimal (and hex on hard). Toggle bits or type the answer. You have 3 lives!"
      difficulty={difficulty}
      flash={flash}
    >
      {phase === "idle" && (
        <div className="flex flex-col items-center gap-4 py-12">
          <p className="text-gray-500">Master binary ↔ decimal conversions!</p>
          <DifficultySelector difficulty={difficulty} onChange={handleDifficulty} />
          <p className="text-sm text-gray-400">
            {difficulty === "easy" && "4-bit binary → decimal"}
            {difficulty === "medium" && "8-bit, both directions"}
            {difficulty === "hard" && "Includes hexadecimal conversions"}
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
              Answer was: <span className="font-mono font-semibold">{round.correctAnswer}</span>
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
              {MODE_LABELS[round.mode]}
            </span>
          </div>

          {/* Display value */}
          <div className="flex flex-col items-center gap-2">
            {(round.mode === "bin-to-dec" || round.mode === "bin-to-hex") ? (
              <div className="flex gap-2">
                {round.displayValue.split("").map((bit, i) => (
                  <div
                    key={i}
                    className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-900 text-xl font-bold font-mono text-white sm:h-14 sm:w-14 sm:text-2xl"
                  >
                    {bit}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-5xl font-bold font-mono text-gray-900">{round.displayValue}</p>
            )}
          </div>

          {/* Toggle mode: bit buttons */}
          {toggle && (
            <>
              <div className="flex flex-col items-center gap-1">
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
                  {powers.map((p, i) => (
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
                = <span className="font-semibold text-gray-700">{playerDecimal}</span>
              </p>
              <p className="text-xs text-gray-400">Keys 1–{round.bitWidth} toggle bits · Enter to submit</p>
              <button
                onClick={handleSubmit}
                className="rounded-xl bg-gray-900 px-8 py-3 text-lg font-medium text-white hover:bg-gray-700"
              >
                Check
              </button>
            </>
          )}

          {/* Type mode: text input */}
          {!toggle && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSubmit();
              }}
              className="flex items-center gap-3"
            >
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                className="w-40 rounded-lg border-2 border-gray-300 px-4 py-3 text-center text-xl font-mono focus:border-gray-900 focus:outline-none"
                placeholder={round.mode === "bin-to-hex" ? "hex" : "decimal"}
                autoFocus
                disabled={!!flash}
              />
              <button
                type="submit"
                className="rounded-xl bg-gray-900 px-6 py-3 text-lg font-medium text-white hover:bg-gray-700"
              >
                Check
              </button>
            </form>
          )}
        </div>
      )}
    </GameShell>
  );
}
