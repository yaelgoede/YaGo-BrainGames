"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import GameShell from "@/components/GameShell";
import DifficultySelector from "@/components/DifficultySelector";
import {
  generateLevel,
  checkMatch,
  countDifferences,
  createEmptyGrid,
  getLevelCount,
  type PixelPainterLevel,
} from "@/lib/games/pixel-painter";
import { type Difficulty, getSavedDifficulty, saveDifficulty } from "@/lib/difficulty";
import { playSound } from "@/lib/sounds";

const GAME_ID = "pixel-painter";

type Phase = "idle" | "playing";

function PixelGrid({
  grid,
  size,
  interactive,
  focusedCell,
  onToggle,
}: {
  grid: number[];
  size: number;
  interactive?: boolean;
  focusedCell?: number;
  onToggle?: (index: number) => void;
}) {
  const cellSize = size === 4 ? "w-10 h-10 sm:w-12 sm:h-12" : "w-6 h-6 sm:w-8 sm:h-8";
  return (
    <div
      className="inline-grid gap-0.5"
      style={{ gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))` }}
    >
      {grid.map((val, i) => (
        <button
          key={i}
          onClick={interactive && onToggle ? () => onToggle(i) : undefined}
          disabled={!interactive}
          className={`${cellSize} rounded-sm transition-all ${
            val === 1 ? "bg-cyan-500" : "bg-gray-200"
          } ${
            focusedCell !== undefined && i === focusedCell
              ? "ring-2 ring-cyan-600 ring-offset-1"
              : ""
          }`}
        />
      ))}
    </div>
  );
}

export default function PixelPainterPage() {
  const [difficulty, setDifficulty] = useState<Difficulty>(() => getSavedDifficulty(GAME_ID));
  const [level, setLevel] = useState<PixelPainterLevel>(() => generateLevel(0, "easy"));
  const [playerGrid, setPlayerGrid] = useState<number[]>(() => createEmptyGrid(4));
  const [clicks, setClicks] = useState(0);
  const [score, setScore] = useState(0);
  const [levelIndex, setLevelIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("idle");
  const [solved, setSolved] = useState(false);
  const [focusedCell, setFocusedCell] = useState(0);
  const [flash, setFlash] = useState<"correct" | "wrong" | null>(null);
  const flashTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (flashTimeout.current) clearTimeout(flashTimeout.current); }, []);

  const start = useCallback(() => {
    const lv = generateLevel(0, difficulty);
    setLevel(lv);
    setPlayerGrid(createEmptyGrid(lv.gridSize));
    setClicks(0);
    setScore(0);
    setLevelIndex(0);
    setPhase("playing");
    setSolved(false);
    setFocusedCell(0);
  }, [difficulty]);

  const nextLevel = useCallback(() => {
    const maxLevel = getLevelCount(difficulty);
    const newIndex = levelIndex + 1;
    if (newIndex >= maxLevel) {
      playSound("gameOver");
      return;
    }
    const lv = generateLevel(newIndex, difficulty);
    setLevel(lv);
    setLevelIndex(newIndex);
    setPlayerGrid(createEmptyGrid(lv.gridSize));
    setClicks(0);
    setSolved(false);
    setFocusedCell(0);
    playSound("levelUp");
  }, [levelIndex, difficulty]);

  const toggleCell = useCallback(
    (index: number) => {
      if (solved) return;
      playSound("click");
      setPlayerGrid((prev) => {
        const next = [...prev];
        next[index] = next[index] === 0 ? 1 : 0;
        return next;
      });
      setClicks((c) => c + 1);
    },
    [solved]
  );

  // Auto-check match after each toggle
  useEffect(() => {
    if (phase !== "playing" || solved) return;
    if (checkMatch(playerGrid, level.targetPattern)) {
      const t = setTimeout(() => {
        playSound("correct");
        setFlash("correct");
        if (flashTimeout.current) clearTimeout(flashTimeout.current);
        flashTimeout.current = setTimeout(() => setFlash(null), 300);
        const levelScore = Math.max(1, level.optimalClicks * 2 - clicks);
        setScore((prev) => prev + levelScore);
        setSolved(true);
      }, 0);
      return () => clearTimeout(t);
    }
  }, [playerGrid, level, phase, solved, clicks]);

  const handleDifficulty = (d: Difficulty) => {
    setDifficulty(d);
    saveDifficulty(GAME_ID, d);
  };

  // Keyboard
  useEffect(() => {
    if (phase !== "playing") return;
    const size = level.gridSize;
    const total = size * size;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") {
        e.preventDefault();
        setFocusedCell((i) => Math.min(i + 1, total - 1));
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        setFocusedCell((i) => Math.max(i - 1, 0));
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setFocusedCell((i) => Math.min(i + size, total - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setFocusedCell((i) => Math.max(i - size, 0));
      } else if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        if (solved) {
          nextLevel();
        } else {
          toggleCell(focusedCell);
        }
      } else if (e.key === "r" || e.key === "R") {
        if (!solved) {
          setPlayerGrid(createEmptyGrid(level.gridSize));
          setClicks(0);
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [phase, level, focusedCell, solved, toggleCell, nextLevel]);

  useEffect(() => {
    if (phase !== "idle") return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Enter") start();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [phase, start]);

  const differences = countDifferences(playerGrid, level.targetPattern);
  const maxLevel = getLevelCount(difficulty);
  const allDone = solved && levelIndex >= maxLevel - 1;

  return (
    <GameShell
      gameId={GAME_ID}
      title="Pixel Painter"
      score={score}
      flash={flash}
      onRestart={start}
      instructions="Toggle memory cells to paint the target pattern! Each cell is a memory address: 0=off, 1=on. Arrow keys to navigate, Space to toggle, R to reset."
      difficulty={difficulty}
    >
      {phase === "idle" && (
        <div className="flex flex-col items-center gap-4 py-12">
          <p className="text-gray-500">Paint pixel patterns by toggling memory addresses!</p>
          <DifficultySelector difficulty={difficulty} onChange={handleDifficulty} />
          <p className="text-sm text-gray-400">
            {difficulty === "easy" && "4×4 grid — simple shapes"}
            {difficulty === "medium" && "8×8 grid — letters and symbols"}
            {difficulty === "hard" && "8×8 grid — detailed sprites"}
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

      {phase === "playing" && (
        <div className="flex flex-col items-center gap-5 py-6">
          {/* Level info */}
          <div className="flex items-center gap-3">
            <span className="rounded-full bg-cyan-100 px-3 py-1 text-xs font-medium text-cyan-700">
              Level {levelIndex + 1}/{maxLevel}
            </span>
            <span className="text-sm font-semibold text-gray-900">{level.patternName}</span>
          </div>

          {/* Grids side by side */}
          <div className="flex flex-wrap items-start justify-center gap-6">
            <div className="flex flex-col items-center gap-2">
              <span className="text-xs font-medium text-gray-500">Target</span>
              <PixelGrid grid={level.targetPattern} size={level.gridSize} />
            </div>
            <div className="flex flex-col items-center gap-2">
              <span className="text-xs font-medium text-gray-500">Your Grid</span>
              <PixelGrid
                grid={playerGrid}
                size={level.gridSize}
                interactive={!solved}
                focusedCell={!solved ? focusedCell : undefined}
                onToggle={toggleCell}
              />
            </div>
          </div>

          {/* Stats */}
          <div className="flex gap-4 text-sm text-gray-500">
            <span>Clicks: {clicks}</span>
            <span>Optimal: {level.optimalClicks}</span>
            {!solved && <span>Remaining: {differences}</span>}
          </div>

          {/* Solved feedback */}
          {solved && (
            <div className="flex flex-col items-center gap-2">
              <p className="text-lg font-bold text-green-600">Pattern matched!</p>
              {allDone ? (
                <p className="text-sm font-medium text-cyan-700">
                  All levels complete! Total score: {score}
                </p>
              ) : (
                <button
                  onClick={nextLevel}
                  className="rounded-xl bg-cyan-600 px-6 py-2 text-sm font-medium text-white hover:bg-cyan-700"
                >
                  Next Level →
                </button>
              )}
            </div>
          )}

          <p className="text-xs text-gray-400">Arrow keys · Space toggle · R reset</p>
        </div>
      )}
    </GameShell>
  );
}
