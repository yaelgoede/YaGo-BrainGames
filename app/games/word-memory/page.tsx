"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import GameShell from "@/components/GameShell";
import DifficultySelector from "@/components/DifficultySelector";
import { pickWords, buildTestRound, WORD_POOL } from "@/lib/games/word-memory";
import { type Difficulty, getSavedDifficulty, saveDifficulty } from "@/lib/difficulty";

const GAME_ID = "word-memory";

type Phase = "idle" | "memorize" | "test" | "results";

const SETTINGS: Record<Difficulty, { memCount: number; testCount: number; displayMs: number }> = {
  easy: { memCount: 5, testCount: 8, displayMs: 2000 },
  medium: { memCount: 8, testCount: 10, displayMs: 1500 },
  hard: { memCount: 12, testCount: 15, displayMs: 1000 },
};

export default function WordMemoryPage() {
  const [difficulty, setDifficulty] = useState<Difficulty>(() => getSavedDifficulty(GAME_ID));
  const [phase, setPhase] = useState<Phase>("idle");
  const [shownWords, setShownWords] = useState<string[]>([]);
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [testRound, setTestRound] = useState<{ word: string; wasSeen: boolean }[]>([]);
  const [testIndex, setTestIndex] = useState(0);
  const [score, setScore] = useState(0);
  const correctRef = useRef(0);
  const [lastAnswer, setLastAnswer] = useState<"correct" | "wrong" | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { memCount, testCount, displayMs } = SETTINGS[difficulty];

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startMemorize = useCallback(() => {
    clearTimer();
    const words = pickWords(memCount);
    setShownWords(words);
    setCurrentWordIndex(0);
    setPhase("memorize");
    setScore(0);
    correctRef.current = 0;
    setTestIndex(0);
    setLastAnswer(null);
  }, [clearTimer, memCount]);

  // Auto-advance words during memorize phase
  useEffect(() => {
    if (phase !== "memorize") return;
    if (currentWordIndex >= shownWords.length) {
      const round = buildTestRound(shownWords, WORD_POOL, testCount);
      setTestRound(round);
      setTestIndex(0);
      setPhase("test");
      return;
    }
    timerRef.current = setTimeout(() => {
      setCurrentWordIndex((i) => i + 1);
    }, displayMs);
    return clearTimer;
  }, [phase, currentWordIndex, shownWords, clearTimer, testCount, displayMs]);

  const handleAnswer = useCallback((answeredSeen: boolean) => {
    if (phase !== "test" || lastAnswer !== null) return;
    const current = testRound[testIndex];
    const correct = answeredSeen === current.wasSeen;

    if (correct) {
      correctRef.current += 1;
    }
    setLastAnswer(correct ? "correct" : "wrong");

    timerRef.current = setTimeout(() => {
      setLastAnswer(null);
      if (testIndex + 1 >= testRound.length) {
        setScore(correctRef.current);
        setPhase("results");
      } else {
        setTestIndex((i) => i + 1);
      }
    }, 600);
  }, [phase, lastAnswer, testRound, testIndex]);

  const handleDifficulty = (d: Difficulty) => {
    setDifficulty(d);
    saveDifficulty(GAME_ID, d);
  };

  // Keyboard: Y/← = Seen, N/→ = New
  useEffect(() => {
    if (phase !== "test" || lastAnswer !== null) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" || e.key === "y") handleAnswer(true);
      if (e.key === "ArrowRight" || e.key === "n") handleAnswer(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [phase, lastAnswer, handleAnswer]);

  // Enter to start from idle
  useEffect(() => {
    if (phase !== "idle") return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Enter") startMemorize();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [phase, startMemorize]);

  return (
    <GameShell
      gameId={GAME_ID}
      title="Word Memory"
      score={score}
      onRestart={() => setPhase("idle")}
      instructions="Memorize the words shown one by one. Then say whether each word was seen or new! Use Y/← for Seen, N/→ for New."
      difficulty={difficulty}
    >
      {phase === "idle" && (
        <div className="flex flex-col items-center gap-4 py-12">
          <p className="text-gray-500">Memorize words and test your recall!</p>
          <DifficultySelector difficulty={difficulty} onChange={handleDifficulty} />
          <button
            onClick={startMemorize}
            className="rounded-xl bg-gray-900 px-8 py-3 text-lg font-medium text-white hover:bg-gray-700"
          >
            Start
          </button>
          <p className="text-xs text-gray-400">or press Enter</p>
        </div>
      )}

      {phase === "memorize" && currentWordIndex < shownWords.length && (
        <div className="flex flex-col items-center gap-4 py-16">
          <p className="text-sm text-gray-400">
            Memorize! ({currentWordIndex + 1}/{shownWords.length})
          </p>
          <p className="text-4xl font-bold text-gray-900">{shownWords[currentWordIndex]}</p>
        </div>
      )}

      {phase === "memorize" && currentWordIndex >= shownWords.length && (
        <div className="flex flex-col items-center py-16">
          <p className="text-xl text-gray-500">Get ready for the test...</p>
        </div>
      )}

      {phase === "test" && testIndex < testRound.length && (
        <div className="flex flex-col items-center gap-6 py-12">
          <p className="text-sm text-gray-400">
            Did you see this word? ({testIndex + 1}/{testRound.length})
          </p>
          <p className="text-4xl font-bold text-gray-900">{testRound[testIndex].word}</p>

          {lastAnswer === "correct" && <p className="font-medium text-green-600">Correct!</p>}
          {lastAnswer === "wrong" && <p className="font-medium text-red-600">Wrong!</p>}

          <div className="flex gap-4">
            <button
              onClick={() => handleAnswer(true)}
              disabled={lastAnswer !== null}
              className="rounded-xl border-2 border-green-300 bg-green-50 px-8 py-3 font-semibold text-green-700 transition-all hover:bg-green-100 cursor-pointer disabled:opacity-50"
            >
              Seen <span className="text-xs text-green-500">Y / ←</span>
            </button>
            <button
              onClick={() => handleAnswer(false)}
              disabled={lastAnswer !== null}
              className="rounded-xl border-2 border-gray-300 bg-gray-50 px-8 py-3 font-semibold text-gray-700 transition-all hover:bg-gray-100 cursor-pointer disabled:opacity-50"
            >
              New <span className="text-xs text-gray-500">N / →</span>
            </button>
          </div>
        </div>
      )}

      {phase === "results" && (
        <div className="flex flex-col items-center gap-4 py-12">
          <div className="rounded-lg bg-blue-50 p-6 text-center">
            <p className="text-3xl font-bold text-blue-700">{score}/{testCount}</p>
            <p className="text-blue-600">correct answers</p>
          </div>
        </div>
      )}
    </GameShell>
  );
}
