"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import GameShell from "@/components/GameShell";
import { pickWords, buildTestRound, WORD_POOL } from "@/lib/games/word-memory";

type Phase = "memorize" | "test" | "results";

const MEMORIZE_WORDS = 8;
const TEST_COUNT = 10;

export default function WordMemoryPage() {
  const [phase, setPhase] = useState<Phase>("memorize");
  const [shownWords, setShownWords] = useState<string[]>([]);
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [testRound, setTestRound] = useState<{ word: string; wasSeen: boolean }[]>([]);
  const [testIndex, setTestIndex] = useState(0);
  const [score, setScore] = useState(0);
  const correctRef = useRef(0);
  const [lastAnswer, setLastAnswer] = useState<"correct" | "wrong" | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startMemorize = useCallback(() => {
    clearTimer();
    const words = pickWords(MEMORIZE_WORDS);
    setShownWords(words);
    setCurrentWordIndex(0);
    setPhase("memorize");
    setScore(0);
    correctRef.current = 0;
    setTestIndex(0);
    setLastAnswer(null);
  }, [clearTimer]);

  // Auto-advance words during memorize phase
  useEffect(() => {
    if (phase !== "memorize") return;
    if (currentWordIndex >= shownWords.length) {
      const round = buildTestRound(shownWords, WORD_POOL, TEST_COUNT);
      setTestRound(round);
      setTestIndex(0);
      setPhase("test");
      return;
    }
    timerRef.current = setTimeout(() => {
      setCurrentWordIndex((i) => i + 1);
    }, 1500);
    return clearTimer;
  }, [phase, currentWordIndex, shownWords, clearTimer]);

  const handleAnswer = (answeredSeen: boolean) => {
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
  };

  useEffect(() => {
    startMemorize();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <GameShell
      gameId="word-memory"
      title="Word Memory"
      score={score}
      onRestart={startMemorize}
      instructions="First, memorize the words shown one by one. Then, for each word, say whether you saw it before or not!"
    >
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
              Seen
            </button>
            <button
              onClick={() => handleAnswer(false)}
              disabled={lastAnswer !== null}
              className="rounded-xl border-2 border-gray-300 bg-gray-50 px-8 py-3 font-semibold text-gray-700 transition-all hover:bg-gray-100 cursor-pointer disabled:opacity-50"
            >
              New
            </button>
          </div>
        </div>
      )}

      {phase === "results" && (
        <div className="flex flex-col items-center gap-4 py-12">
          <div className="rounded-lg bg-blue-50 p-6 text-center">
            <p className="text-3xl font-bold text-blue-700">{score}/{TEST_COUNT}</p>
            <p className="text-blue-600">correct answers</p>
          </div>
        </div>
      )}
    </GameShell>
  );
}
