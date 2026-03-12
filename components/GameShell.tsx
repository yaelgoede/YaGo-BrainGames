"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getHighScore, setHighScore } from "@/lib/scores";

interface GameShellProps {
  gameId: string;
  title: string;
  children: React.ReactNode;
  score: number;
  onRestart: () => void;
  showTimer?: boolean;
  timeLeft?: number;
  instructions?: string;
}

export default function GameShell({
  gameId,
  title,
  children,
  score,
  onRestart,
  showTimer,
  timeLeft,
  instructions,
}: GameShellProps) {
  const [highScore, setHigh] = useState(0);
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    setHigh(getHighScore(gameId));
  }, [gameId]);

  useEffect(() => {
    if (score > 0 && score > highScore) {
      setHighScore(gameId, score);
      setHigh(score);
    }
  }, [gameId, score, highScore]);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600 transition-colors hover:bg-gray-50"
          >
            &larr; Back
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
          {instructions && (
            <button
              onClick={() => setShowHelp(!showHelp)}
              className="rounded-lg border border-gray-200 px-2 py-1 text-sm text-gray-400 transition-colors hover:bg-gray-50 hover:text-gray-600"
              title="How to play"
            >
              ?
            </button>
          )}
        </div>
        <div className="flex items-center gap-4">
          {showTimer && timeLeft !== undefined && (
            <span className={`text-lg font-mono font-semibold ${timeLeft <= 10 ? "text-red-500" : "text-gray-700"}`}>
              {timeLeft}s
            </span>
          )}
          <span className="text-sm text-gray-500">
            Score: <span className="font-semibold text-gray-900">{score}</span>
          </span>
          <span className="text-sm text-gray-500">
            Best: <span className="font-semibold text-gray-900">{highScore}</span>
          </span>
          <button
            onClick={onRestart}
            className="rounded-lg bg-gray-900 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-gray-700"
          >
            Restart
          </button>
        </div>
      </div>

      {showHelp && instructions && (
        <div className="mb-6 rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
          {instructions}
        </div>
      )}

      {children}
    </div>
  );
}
