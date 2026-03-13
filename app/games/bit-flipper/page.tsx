"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import GameShell from "@/components/GameShell";
import DifficultySelector from "@/components/DifficultySelector";
import {
  generateChallenge,
  getModeForDifficulty,
  checkMatch,
  bitsToNumber,
  type BitFlipperChallenge,
  type ChallengeMode,
} from "@/lib/games/bit-flipper";
import { type Difficulty, getSavedDifficulty, saveDifficulty } from "@/lib/difficulty";
import { playSound } from "@/lib/sounds";

const GAME_ID = "bit-flipper";
const GAME_DURATION = 60;
const POWERS = [128, 64, 32, 16, 8, 4, 2, 1];

type Phase = "idle" | "playing" | "over";

const MODE_LABELS: Record<ChallengeMode, string> = {
  binary: "Match the Pattern",
  decimal: "Decimal → Binary",
  ascii: "ASCII → Binary",
};

export default function BitFlipperPage() {
  const [difficulty, setDifficulty] = useState<Difficulty>(() => getSavedDifficulty(GAME_ID));
  const [challenge, setChallenge] = useState<BitFlipperChallenge>(() =>
    generateChallenge("binary")
  );
  const [playerBits, setPlayerBits] = useState<number[]>([0, 0, 0, 0, 0, 0, 0, 0]);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [phase, setPhase] = useState<Phase>("idle");
  const [flash, setFlash] = useState<"correct" | "wrong" | null>(null);
  const flashTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Timer
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

  // Cleanup flash timeout on unmount
  useEffect(() => {
    return () => {
      if (flashTimeout.current) clearTimeout(flashTimeout.current);
    };
  }, []);

  const start = useCallback(() => {
    const mode = getModeForDifficulty(difficulty);
    setPhase("playing");
    setScore(0);
    setTimeLeft(GAME_DURATION);
    setPlayerBits([0, 0, 0, 0, 0, 0, 0, 0]);
    setChallenge(generateChallenge(mode));
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

    if (checkMatch(playerBits, challenge.targetBits)) {
      playSound("correct");
      const newScore = score + 1;
      setScore(newScore);
      setFlash("correct");
      if (flashTimeout.current) clearTimeout(flashTimeout.current);
      flashTimeout.current = setTimeout(() => {
        setFlash(null);
        setPlayerBits([0, 0, 0, 0, 0, 0, 0, 0]);
        setChallenge(generateChallenge(challenge.mode, challenge.decimalValue));
      }, 300);
    } else {
      playSound("wrong");
      setFlash("wrong");
      if (flashTimeout.current) clearTimeout(flashTimeout.current);
      flashTimeout.current = setTimeout(() => {
        setFlash(null);
      }, 500);
    }
  }, [phase, flash, playerBits, challenge, score]);

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

  // Enter to start from idle
  useEffect(() => {
    if (phase !== "idle") return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Enter") start();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [phase, start]);

  const playerDecimal = bitsToNumber(playerBits);

  return (
    <GameShell
      gameId={GAME_ID}
      title="Bit Flipper"
      score={score}
      onRestart={start}
      showTimer={phase === "playing"}
      timeLeft={timeLeft}
      instructions="Toggle the 8 light bulb bits to match the target! Easy: match a binary pattern. Medium: convert a decimal number. Hard: find the ASCII code. Keys 1–8 toggle bits, Enter to submit."
      difficulty={difficulty}
      flash={flash}
    >
      {phase === "idle" && (
        <div className="flex flex-col items-center gap-4 py-12">
          <p className="text-gray-500">Toggle bits to match targets — binary, decimal, or ASCII!</p>
          <DifficultySelector difficulty={difficulty} onChange={handleDifficulty} />
          <p className="text-sm text-gray-400">
            {difficulty === "easy" && "Match the binary pattern shown"}
            {difficulty === "medium" && "Convert decimal numbers to binary"}
            {difficulty === "hard" && "Find the ASCII code in binary"}
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
          {/* Mode badge */}
          <span className="rounded-full bg-cyan-100 px-3 py-1 text-xs font-medium text-cyan-700">
            {MODE_LABELS[challenge.mode]}
          </span>

          {/* Target display */}
          <div className="flex flex-col items-center gap-2">
            {challenge.mode === "binary" ? (
              <div className="flex gap-2">
                {challenge.displayValue.split("").map((bit, i) => (
                  <div
                    key={i}
                    className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-900 text-xl font-bold text-white sm:h-14 sm:w-14 sm:text-2xl"
                  >
                    {bit}
                  </div>
                ))}
              </div>
            ) : challenge.mode === "decimal" ? (
              <p className="text-5xl font-bold text-gray-900">{challenge.displayValue}</p>
            ) : (
              <div className="flex flex-col items-center gap-1">
                <p className="text-5xl font-bold text-gray-900">
                  &lsquo;{challenge.displayValue}&rsquo;
                </p>
                <p className="text-sm text-gray-400">ASCII character</p>
              </div>
            )}
          </div>

          {/* Flash feedback */}
          {flash === "correct" && (
            <p className="text-sm font-medium text-green-600">Correct!</p>
          )}
          {flash === "wrong" && (
            <p className="text-sm font-medium text-red-500">Not quite — adjust your bits!</p>
          )}

          {/* Toggleable bits */}
          <div className="flex flex-col items-center gap-1">
            <div className="flex gap-1.5 sm:gap-2">
              {playerBits.map((bit, i) => (
                <button
                  key={i}
                  onClick={() => toggleBit(i)}
                  className={`flex h-12 w-10 flex-col items-center justify-center rounded-lg border-2 text-lg font-bold transition-all sm:h-14 sm:w-14 sm:text-xl ${
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

          {/* Live decimal preview */}
          <p className="text-sm text-gray-500">
            = <span className="font-semibold text-gray-700">{playerDecimal}</span>
            {challenge.mode === "ascii" && playerDecimal >= 33 && playerDecimal <= 126 && (
              <span className="ml-2 text-gray-400">
                (&lsquo;{String.fromCharCode(playerDecimal)}&rsquo;)
              </span>
            )}
          </p>

          {/* Keyboard hint */}
          <p className="text-xs text-gray-400">Keys 1–8 toggle bits · Enter to submit</p>

          {/* Submit button */}
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
