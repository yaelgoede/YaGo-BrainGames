"use client";

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import GameShell from "@/components/GameShell";
import DifficultySelector from "@/components/DifficultySelector";
import { generateGrid, checkAnswer, type Grid } from "@/lib/games/visual-memory";
import { type Difficulty, DIFFICULTY_OFFSET, getSavedDifficulty, saveDifficulty } from "@/lib/difficulty";
import { playSound } from "@/lib/sounds";

const GAME_ID = "visual-memory";
const MAX_LIVES = 3;
const MEMORIZE_MS = 1500;

type Phase = "idle" | "memorize" | "input" | "correct" | "wrong" | "over";

export default function VisualMemoryPage() {
  const [difficulty, setDifficulty] = useState<Difficulty>(() => getSavedDifficulty(GAME_ID));
  const [grid, setGrid] = useState<Grid>(() => generateGrid(1));
  const [selected, setSelected] = useState<number[]>([]);
  const [level, setLevel] = useState(1);
  const [lives, setLives] = useState(MAX_LIVES);
  const [phase, setPhase] = useState<Phase>("idle");
  const [focusedIndex, setFocusedIndex] = useState(0);
  const [flash, setFlash] = useState<"correct" | "wrong" | null>(null);
  const flashTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const score = level - 1;
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const cancelledRef = useRef(false);

  const offset = DIFFICULTY_OFFSET[difficulty];

  const clearAllTimeouts = useCallback(() => {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
    cancelledRef.current = true;
  }, []);

  const addTimeout = useCallback((fn: () => void, ms: number) => {
    const id = setTimeout(() => {
      if (!cancelledRef.current) fn();
    }, ms);
    timeoutsRef.current.push(id);
    return id;
  }, []);

  useEffect(() => {
    return () => {
      clearAllTimeouts();
      if (flashTimeout.current) clearTimeout(flashTimeout.current);
    };
  }, [clearAllTimeouts]);

  const startLevel = useCallback((lvl: number) => {
    cancelledRef.current = false;
    const newGrid = generateGrid(lvl);
    setGrid(newGrid);
    setSelected([]);
    setFocusedIndex(0);
    setPhase("memorize");
    addTimeout(() => setPhase("input"), MEMORIZE_MS);
  }, [addTimeout]);

  const start = useCallback(() => {
    clearAllTimeouts();
    const startLvl = 1 + offset;
    setLevel(startLvl);
    setLives(MAX_LIVES);
    cancelledRef.current = false;
    startLevel(startLvl);
  }, [clearAllTimeouts, startLevel, offset]);

  const handleTileClick = useCallback((idx: number) => {
    if (phase !== "input") return;
    if (selected.includes(idx)) {
      setSelected(selected.filter((i) => i !== idx));
      return;
    }

    const newSelected = [...selected, idx];
    setSelected(newSelected);

    if (newSelected.length === grid.activeTiles.length) {
      if (checkAnswer(grid.activeTiles, newSelected)) {
        playSound("correct");
        setFlash("correct");
        if (flashTimeout.current) clearTimeout(flashTimeout.current);
        flashTimeout.current = setTimeout(() => setFlash(null), 300);
        playSound("levelUp");
        const newLevel = level + 1;
        setLevel(newLevel);
        setPhase("correct");
        addTimeout(() => startLevel(newLevel), 800);
      } else {
        playSound("wrong");
        setFlash("wrong");
        if (flashTimeout.current) clearTimeout(flashTimeout.current);
        flashTimeout.current = setTimeout(() => setFlash(null), 500);
        const newLives = lives - 1;
        setLives(newLives);
        if (newLives <= 0) {
          playSound("gameOver");
          setPhase("over");
        } else {
          setPhase("wrong");
          addTimeout(() => startLevel(level), 800);
        }
      }
    }
  }, [phase, selected, grid, level, lives, addTimeout, startLevel]);

  const handleDifficulty = (d: Difficulty) => {
    setDifficulty(d);
    saveDifficulty(GAME_ID, d);
  };

  const activeTilesSet = useMemo(() => new Set(grid.activeTiles), [grid]);
  const selectedSet = useMemo(() => new Set(selected), [selected]);

  const tileState = (idx: number) => {
    if (phase === "memorize" && activeTilesSet.has(idx)) return "shown";
    if ((phase === "correct" || phase === "over" || phase === "wrong") && activeTilesSet.has(idx)) return "revealed";
    if (selectedSet.has(idx)) return "selected";
    return "blank";
  };

  const tileClass = (state: string) => {
    switch (state) {
      case "shown":
        return "bg-blue-500 border-blue-400";
      case "selected":
        return "bg-blue-400/60 border-blue-300";
      case "revealed":
        return "bg-blue-500/40 border-blue-300";
      default:
        return "bg-gray-100 border-gray-200 hover:bg-gray-200";
    }
  };

  // Keyboard: arrow keys to navigate, Enter/Space to toggle
  useEffect(() => {
    if (phase !== "input") return;
    const total = grid.size * grid.size;
    const handler = (e: KeyboardEvent) => {
      switch (e.key) {
        case "ArrowRight":
          e.preventDefault();
          setFocusedIndex((i) => Math.min(i + 1, total - 1));
          break;
        case "ArrowLeft":
          e.preventDefault();
          setFocusedIndex((i) => Math.max(i - 1, 0));
          break;
        case "ArrowDown":
          e.preventDefault();
          setFocusedIndex((i) => Math.min(i + grid.size, total - 1));
          break;
        case "ArrowUp":
          e.preventDefault();
          setFocusedIndex((i) => Math.max(i - grid.size, 0));
          break;
        case "Enter":
        case " ":
          e.preventDefault();
          handleTileClick(focusedIndex);
          break;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [phase, grid.size, focusedIndex, handleTileClick]);

  // Enter to start from idle
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
      title="Visual Memory"
      score={score}
      onRestart={() => { clearAllTimeouts(); setPhase("idle"); setLevel(1); }}
      instructions="Memorize the highlighted tiles, then click them from memory. Arrow keys + Enter to navigate. You have 3 lives!"
      difficulty={difficulty}
      flash={flash}
    >
      {phase === "idle" && (
        <div className="flex flex-col items-center gap-4 py-12">
          <p className="text-gray-500">Remember the pattern and recreate it!</p>
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
          <div className="rounded-lg bg-blue-50 p-6 text-center">
            <p className="text-2xl font-bold text-blue-700">Level {level}</p>
            <p className="text-blue-600">You reached level {level} before running out of lives</p>
          </div>
        </div>
      )}

      {phase !== "idle" && phase !== "over" && (
        <div className="flex flex-col items-center gap-4 py-4">
          <div className="flex items-center gap-4">
            <p className="text-sm font-medium text-gray-500">Level {level}</p>
            <div className="flex gap-1">
              {Array.from({ length: MAX_LIVES }).map((_, i) => (
                <span key={i} className={`text-lg ${i < lives ? "text-red-500" : "text-gray-300"}`}>
                  &#9829;
                </span>
              ))}
            </div>
          </div>

          {phase === "memorize" && (
            <p className="text-sm text-gray-400">Memorize the pattern...</p>
          )}
          {phase === "input" && (
            <p className="text-sm text-gray-400">
              Select the tiles ({selected.length}/{grid.activeTiles.length})
            </p>
          )}
          {phase === "correct" && (
            <p className="text-sm font-medium text-green-600">Correct!</p>
          )}
          {phase === "wrong" && (
            <p className="text-sm font-medium text-red-600">Wrong! Try again...</p>
          )}

          <div
            className="mx-auto grid gap-2"
            style={{
              gridTemplateColumns: `repeat(${grid.size}, 1fr)`,
              width: `${grid.size * 56 + (grid.size - 1) * 8}px`,
            }}
          >
            {Array.from({ length: grid.size * grid.size }).map((_, idx) => {
              const state = tileState(idx);
              return (
                <button
                  key={idx}
                  onClick={() => handleTileClick(idx)}
                  disabled={phase !== "input"}
                  className={`h-12 w-12 rounded-lg border-2 transition-all duration-150
                    ${tileClass(state)}
                    ${phase === "input" ? "cursor-pointer" : "cursor-default"}
                    ${phase === "input" && idx === focusedIndex ? "ring-2 ring-blue-500 ring-offset-2" : ""}
                  `}
                />
              );
            })}
          </div>
        </div>
      )}
    </GameShell>
  );
}
