"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import GameShell from "@/components/GameShell";
import DifficultySelector from "@/components/DifficultySelector";
import {
  generateRound,
  checkBits,
  checkCharacter,
  bitsToNumber,
  type AsciiRound,
} from "@/lib/games/ascii-encoder";
import { type Difficulty, getSavedDifficulty, saveDifficulty } from "@/lib/difficulty";
import { playSound } from "@/lib/sounds";

const GAME_ID = "ascii-encoder";
const POWERS = [128, 64, 32, 16, 8, 4, 2, 1];

type Phase = "idle" | "playing" | "over";

export default function AsciiEncoderPage() {
  const [difficulty, setDifficulty] = useState<Difficulty>(() => getSavedDifficulty(GAME_ID));
  const [round, setRound] = useState<AsciiRound>(() => generateRound("easy"));
  const [playerBits, setPlayerBits] = useState<number[]>([0, 0, 0, 0, 0, 0, 0, 0]);
  const [input, setInput] = useState("");
  const [score, setScore] = useState(0);
  const [phase, setPhase] = useState<Phase>("idle");
  const [flash, setFlash] = useState<"correct" | "wrong" | null>(null);
  const [lives, setLives] = useState(3);
  const [wordProgress, setWordProgress] = useState<string[]>([]);
  const flashTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (flashTimeout.current) clearTimeout(flashTimeout.current);
    };
  }, []);

  const start = useCallback(() => {
    setPhase("playing");
    setScore(0);
    setLives(3);
    setInput("");
    setPlayerBits([0, 0, 0, 0, 0, 0, 0, 0]);
    setRound(generateRound(difficulty));
    setWordProgress([]);
    setFlash(null);
    setTimeout(() => inputRef.current?.focus(), 50);
  }, [difficulty]);

  const isEncodeMode = round.mode === "encode" || round.mode === "word";

  const advanceRound = useCallback(
    (prevRound: AsciiRound, newScore: number) => {
      // Word mode: advance to next character
      if (prevRound.mode === "word" && prevRound.word && prevRound.wordIndex !== undefined) {
        const nextIndex = prevRound.wordIndex + 1;
        if (nextIndex < prevRound.word.length) {
          setRound(
            generateRound(difficulty, undefined, {
              word: prevRound.word,
              index: nextIndex,
            })
          );
          setPlayerBits([0, 0, 0, 0, 0, 0, 0, 0]);
          return;
        }
        // Word completed — bonus points
        setScore(newScore + 3);
        playSound("levelUp");
      }
      setRound(generateRound(difficulty, prevRound.charCode));
      setPlayerBits([0, 0, 0, 0, 0, 0, 0, 0]);
      setInput("");
      setTimeout(() => inputRef.current?.focus(), 50);
    },
    [difficulty]
  );

  const handleSubmit = useCallback(() => {
    if (phase !== "playing" || flash) return;

    const correct = isEncodeMode
      ? checkBits(playerBits, round)
      : checkCharacter(input.trim(), round);

    if (correct) {
      playSound("correct");
      const newScore = score + 1;
      setScore(newScore);

      if (round.mode === "word" && round.word) {
        setWordProgress((prev) => [...prev, round.character]);
      }

      setFlash("correct");
      if (flashTimeout.current) clearTimeout(flashTimeout.current);
      flashTimeout.current = setTimeout(() => {
        setFlash(null);
        advanceRound(round, newScore);
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
          setInput("");
          setRound(generateRound(difficulty, round.charCode));
          setWordProgress([]);
          setTimeout(() => inputRef.current?.focus(), 50);
        }
      }, 500);
    }
  }, [phase, flash, input, playerBits, round, score, isEncodeMode, advanceRound, lives, difficulty]);

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

  // Keyboard shortcuts
  useEffect(() => {
    if (phase !== "playing") return;
    const handler = (e: KeyboardEvent) => {
      if (flash) return;
      if (isEncodeMode) {
        const key = parseInt(e.key, 10);
        if (key >= 1 && key <= 8) {
          e.preventDefault();
          toggleBit(key - 1);
        }
        if (e.key === "Enter") {
          e.preventDefault();
          handleSubmit();
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [phase, flash, isEncodeMode, toggleBit, handleSubmit]);

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
      title="ASCII Encoder"
      score={score}
      onRestart={start}
      instructions="Convert between characters and their ASCII binary codes. Encode (char→binary) or decode (binary→char). On hard mode, encode entire words!"
      difficulty={difficulty}
      flash={flash}
    >
      {phase === "idle" && (
        <div className="flex flex-col items-center gap-4 py-12">
          <p className="text-gray-500">Master ASCII ↔ Binary conversions!</p>
          <DifficultySelector difficulty={difficulty} onChange={handleDifficulty} />
          <p className="text-sm text-gray-400">
            {difficulty === "easy" && "Decode: binary → uppercase letters"}
            {difficulty === "medium" && "Both directions, upper + lowercase + digits"}
            {difficulty === "hard" && "Full printable ASCII, encode whole words"}
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
              Answer was:{" "}
              <span className="font-mono font-semibold">
                {isEncodeMode
                  ? round.bits.join("")
                  : `'${round.character}' (${round.charCode})`}
              </span>
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
              {round.mode === "decode"
                ? "Binary → Character"
                : round.mode === "word"
                  ? "Encode Word"
                  : "Character → Binary"}
            </span>
          </div>

          {/* Word progress */}
          {round.mode === "word" && round.word && (
            <div className="flex gap-2">
              {round.word.split("").map((ch, i) => (
                <div
                  key={i}
                  className={`flex h-10 w-10 items-center justify-center rounded-lg border-2 text-lg font-bold ${
                    i < (round.wordIndex ?? 0)
                      ? "border-green-400 bg-green-100 text-green-700"
                      : i === round.wordIndex
                        ? "border-yellow-400 bg-yellow-100 text-yellow-700"
                        : "border-gray-200 bg-gray-50 text-gray-300"
                  }`}
                >
                  {i <= (round.wordIndex ?? 0) ? ch : "?"}
                </div>
              ))}
            </div>
          )}

          {/* Display: show bits for decode, show character for encode */}
          {round.mode === "decode" ? (
            <div className="flex flex-col items-center gap-2">
              <div className="flex gap-2">
                {round.bits.map((bit, i) => (
                  <div
                    key={i}
                    className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-900 text-xl font-bold font-mono text-white sm:h-14 sm:w-14 sm:text-2xl"
                  >
                    {bit}
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                {POWERS.map((p, i) => (
                  <span
                    key={i}
                    className="w-12 text-center text-[10px] text-gray-400 sm:w-14 sm:text-xs"
                  >
                    {p}
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-1">
              <p className="text-6xl font-bold text-gray-900">
                &lsquo;{round.character}&rsquo;
              </p>
              <p className="text-sm text-gray-400">ASCII character</p>
            </div>
          )}

          {/* Encode mode: toggle bits */}
          {isEncodeMode && (
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
                = <span className="font-semibold text-gray-700">{playerDecimal}</span>
                {playerDecimal >= 33 && playerDecimal <= 126 && (
                  <span className="ml-2 text-gray-400">
                    (&lsquo;{String.fromCharCode(playerDecimal)}&rsquo;)
                  </span>
                )}
              </p>
              <p className="text-xs text-gray-400">Keys 1–8 toggle bits · Enter to submit</p>
              <button
                onClick={handleSubmit}
                className="rounded-xl bg-gray-900 px-8 py-3 text-lg font-medium text-white hover:bg-gray-700"
              >
                Check
              </button>
            </>
          )}

          {/* Decode mode: type character */}
          {!isEncodeMode && (
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
                maxLength={1}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                className="w-20 rounded-lg border-2 border-gray-300 px-4 py-3 text-center text-2xl font-mono focus:border-gray-900 focus:outline-none"
                placeholder="?"
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
