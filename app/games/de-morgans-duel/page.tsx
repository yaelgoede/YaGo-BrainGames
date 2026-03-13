"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import GameShell from "@/components/GameShell";
import DifficultySelector from "@/components/DifficultySelector";
import { generateDuelRound, type DuelRound } from "@/lib/games/de-morgans-duel";
import { type Difficulty, DIFFICULTY_OFFSET, getSavedDifficulty, saveDifficulty } from "@/lib/difficulty";
import { playSound } from "@/lib/sounds";

const GAME_ID = "de-morgans-duel";
const GAME_DURATION = 60;

type Phase = "idle" | "playing" | "over";

export default function DeMorgansDuelPage() {
  const [difficulty, setDifficulty] = useState<Difficulty>(() => getSavedDifficulty(GAME_ID));
  const [round, setRound] = useState<DuelRound>(() => generateDuelRound(0, 0));
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [phase, setPhase] = useState<Phase>("idle");
  const [feedback, setFeedback] = useState<{ correct: boolean; rule: string } | null>(null);
  const feedbackTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

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
      if (feedbackTimeout.current) clearTimeout(feedbackTimeout.current);
    };
  }, []);

  const start = useCallback(() => {
    setPhase("playing");
    setScore(0);
    setStreak(0);
    setTimeLeft(GAME_DURATION);
    setRound(generateDuelRound(0, offset));
    setFeedback(null);
  }, [offset]);

  const handleAnswer = useCallback((answerEquivalent: boolean) => {
    if (feedback) return;

    const isCorrect = answerEquivalent === round.isEquivalent;

    if (isCorrect) {
      playSound("correct");
      const newStreak = streak + 1;
      const bonus = newStreak % 3 === 0 ? 1 : 0;
      const newScore = score + 1 + bonus;
      setScore(newScore);
      setStreak(newStreak);
      setFeedback({ correct: true, rule: round.rule });
    } else {
      playSound("wrong");
      setStreak(0);
      setFeedback({ correct: false, rule: round.rule });
    }

    if (feedbackTimeout.current) clearTimeout(feedbackTimeout.current);
    feedbackTimeout.current = setTimeout(() => {
      setFeedback(null);
      setRound(generateDuelRound(isCorrect ? score + 1 : score, offset));
    }, 800);
  }, [feedback, round, score, streak, offset]);

  const handleDifficulty = (d: Difficulty) => {
    setDifficulty(d);
    saveDifficulty(GAME_ID, d);
  };

  useEffect(() => {
    if (phase !== "playing" || feedback) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "e" || e.key === "E") handleAnswer(true);
      if (e.key === "n" || e.key === "N") handleAnswer(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [phase, feedback, handleAnswer]);

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
      title="De Morgan's Duel"
      score={score}
      onRestart={start}
      showTimer={phase === "playing"}
      timeLeft={timeLeft}
      instructions="Two boolean expressions are shown. Decide if they're equivalent or not! Learn De Morgan's Laws, absorption, distribution, and more. Press E for Equivalent, N for Not Equivalent."
      difficulty={difficulty}
      flash={feedback ? (feedback.correct ? "correct" : "wrong") : null}
    >
      {phase === "idle" && (
        <div className="flex flex-col items-center gap-4 py-12">
          <p className="text-gray-500">Are these boolean expressions equivalent?</p>
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
            <p className="text-2xl font-bold text-orange-700">{score} points</p>
            <p className="text-orange-600">in {GAME_DURATION} seconds</p>
          </div>
        </div>
      )}

      {phase === "playing" && (
        <div className="flex flex-col items-center gap-6 py-8">
          <p className="text-sm text-gray-400">
            Streak: {streak} {streak >= 3 && "🔥"}
          </p>

          {/* Expression pair */}
          <div className="flex w-full max-w-lg flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
            <div className="flex-1 rounded-xl border-2 border-gray-200 bg-white p-4 text-center">
              <p className="text-xs text-gray-400 mb-1">Expression A</p>
              <p className="text-lg font-mono font-bold text-gray-900">{round.expressionA}</p>
            </div>
            <span className="text-center text-2xl text-gray-300">=?</span>
            <div className="flex-1 rounded-xl border-2 border-gray-200 bg-white p-4 text-center">
              <p className="text-xs text-gray-400 mb-1">Expression B</p>
              <p className="text-lg font-mono font-bold text-gray-900">{round.expressionB}</p>
            </div>
          </div>

          {/* Feedback flash */}
          {feedback && (
            <div
              className={`rounded-lg px-4 py-2 text-center text-sm font-medium ${
                feedback.correct
                  ? "bg-green-50 text-green-700 border border-green-300"
                  : "bg-red-50 text-red-700 border border-red-300"
              }`}
            >
              <p>{feedback.correct ? "Correct!" : "Wrong!"}</p>
              <p className="text-xs mt-1 opacity-75">{feedback.rule}</p>
            </div>
          )}

          {/* Answer buttons */}
          <div className="flex gap-4">
            <button
              onClick={() => handleAnswer(true)}
              className="rounded-xl border-2 border-gray-200 bg-white px-6 py-3 font-semibold text-gray-900 transition-all hover:border-green-400 hover:bg-green-50 cursor-pointer"
            >
              Equivalent
              <span className="ml-2 text-xs text-gray-400">E</span>
            </button>
            <button
              onClick={() => handleAnswer(false)}
              className="rounded-xl border-2 border-gray-200 bg-white px-6 py-3 font-semibold text-gray-900 transition-all hover:border-red-400 hover:bg-red-50 cursor-pointer"
            >
              Not Equivalent
              <span className="ml-2 text-xs text-gray-400">N</span>
            </button>
          </div>
        </div>
      )}
    </GameShell>
  );
}
