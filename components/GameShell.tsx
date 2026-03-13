"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { getHighScore, setHighScore } from "@/lib/scores";
import { isMuted, toggleMute } from "@/lib/sounds";
import type { Difficulty } from "@/lib/difficulty";

interface GameShellProps {
  gameId: string;
  title: string;
  children: React.ReactNode;
  score: number;
  onRestart: () => void;
  showTimer?: boolean;
  timeLeft?: number;
  instructions?: string;
  difficulty?: Difficulty;
  flash?: "correct" | "wrong" | null;
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
  difficulty,
  flash,
}: GameShellProps) {
  const scoreKey = difficulty ? `${gameId}-${difficulty}` : gameId;
  const [highScore, setHigh] = useState(0);
  const [showHelp, setShowHelp] = useState(false);
  const [muted, setMutedState] = useState(false);
  const [flashKey, setFlashKey] = useState(0);

  useEffect(() => {
    if (flash) setFlashKey((k) => k + 1);
  }, [flash]);

  useEffect(() => {
    setMutedState(isMuted());
  }, []);

  useEffect(() => {
    setHigh(getHighScore(scoreKey));
  }, [scoreKey]);

  useEffect(() => {
    if (score > 0 && score > highScore) {
      setHighScore(scoreKey, score);
      setHigh(score);
    }
  }, [scoreKey, score, highScore]);

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
            onClick={() => { const next = toggleMute(); setMutedState(next); }}
            className="rounded-lg border border-gray-200 px-2 py-1 text-sm text-gray-400 transition-colors hover:bg-gray-50 hover:text-gray-600"
            title={muted ? "Unmute sounds" : "Mute sounds"}
          >
            {muted ? "\u{1F507}" : "\u{1F50A}"}
          </button>
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

      <div
        key={flashKey}
        className={`relative rounded-xl ${
          flash === "correct"
            ? "animate-flash-correct"
            : flash === "wrong"
              ? "animate-flash-wrong"
              : ""
        }`}
      >
        {children}
        {flash && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <span
              className={`animate-icon-pop text-6xl ${
                flash === "correct" ? "text-green-500" : "text-red-500"
              }`}
            >
              {flash === "correct" ? "\u2713" : "\u2717"}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
