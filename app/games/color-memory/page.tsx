"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import GameShell from "@/components/GameShell";
import DifficultySelector from "@/components/DifficultySelector";
import {
  generateColorGrid,
  getColorConfig,
  isGridCorrect,
  COLOR_PALETTE,
  COLOR_HEX,
  type ColorGrid,
  type GameColor,
} from "@/lib/games/color-memory";
import { type Difficulty, getSavedDifficulty, saveDifficulty } from "@/lib/difficulty";
import { playSound } from "@/lib/sounds";

const GAME_ID = "color-memory";
const MAX_LIVES = 3;

type Phase = "idle" | "memorize" | "input" | "correct" | "wrong" | "over";

export default function ColorMemoryPage() {
  const [difficulty, setDifficulty] = useState<Difficulty>(() => getSavedDifficulty(GAME_ID));
  const [grid, setGrid] = useState<ColorGrid>(() => generateColorGrid(1, 4));
  const [playerColors, setPlayerColors] = useState<(GameColor | null)[]>([]);
  const [selectedCell, setSelectedCell] = useState<number | null>(null);
  const [level, setLevel] = useState(1);
  const [lives, setLives] = useState(MAX_LIVES);
  const [phase, setPhase] = useState<Phase>("idle");
  const [focusedIndex, setFocusedIndex] = useState(0);
  const score = level - 1;
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const cancelledRef = useRef(false);

  const config = getColorConfig(difficulty);
  const activeColors = COLOR_PALETTE.slice(0, config.colorCount);

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
    return clearAllTimeouts;
  }, [clearAllTimeouts]);

  const startLevel = useCallback(
    (lvl: number) => {
      cancelledRef.current = false;
      const newGrid = generateColorGrid(lvl, config.colorCount);
      setGrid(newGrid);
      setPlayerColors(new Array(newGrid.size * newGrid.size).fill(null));
      setSelectedCell(null);
      setFocusedIndex(0);
      setPhase("memorize");
      addTimeout(() => setPhase("input"), config.memorizeMs);
    },
    [addTimeout, config.colorCount, config.memorizeMs],
  );

  const start = useCallback(() => {
    clearAllTimeouts();
    setLevel(1);
    setLives(MAX_LIVES);
    cancelledRef.current = false;
    startLevel(1);
  }, [clearAllTimeouts, startLevel]);

  const handleSubmit = useCallback(() => {
    if (phase !== "input") return;
    if (playerColors.some((c) => c === null)) return;

    if (isGridCorrect(grid.tiles, playerColors)) {
      playSound("correct");
      playSound("levelUp");
      const newLevel = level + 1;
      setLevel(newLevel);
      setPhase("correct");
      addTimeout(() => startLevel(newLevel), 800);
    } else {
      playSound("wrong");
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
  }, [phase, playerColors, grid.tiles, level, lives, addTimeout, startLevel]);

  const handleCellClick = useCallback(
    (idx: number) => {
      if (phase !== "input") return;
      playSound("click");
      setSelectedCell(idx);
      setFocusedIndex(idx);
    },
    [phase],
  );

  const handleColorPick = useCallback(
    (color: GameColor) => {
      if (phase !== "input" || selectedCell === null) return;
      const newColors = [...playerColors];
      newColors[selectedCell] = color;
      setPlayerColors(newColors);

      // Auto-advance to next unassigned cell
      const nextEmpty = newColors.findIndex((c, i) => c === null && i > selectedCell);
      if (nextEmpty !== -1) {
        setSelectedCell(nextEmpty);
        setFocusedIndex(nextEmpty);
      } else {
        const firstEmpty = newColors.findIndex((c) => c === null);
        if (firstEmpty !== -1) {
          setSelectedCell(firstEmpty);
          setFocusedIndex(firstEmpty);
        } else {
          setSelectedCell(null);
        }
      }
    },
    [phase, selectedCell, playerColors],
  );

  const handleDifficulty = (d: Difficulty) => {
    setDifficulty(d);
    saveDifficulty(GAME_ID, d);
  };

  // Keyboard: arrow keys to navigate grid, 1-6 for colors, Enter to submit
  useEffect(() => {
    if (phase !== "input") return;
    const total = grid.size * grid.size;
    const handler = (e: KeyboardEvent) => {
      switch (e.key) {
        case "ArrowRight":
          e.preventDefault();
          setFocusedIndex((i) => { const n = Math.min(i + 1, total - 1); setSelectedCell(n); return n; });
          break;
        case "ArrowLeft":
          e.preventDefault();
          setFocusedIndex((i) => { const n = Math.max(i - 1, 0); setSelectedCell(n); return n; });
          break;
        case "ArrowDown":
          e.preventDefault();
          setFocusedIndex((i) => { const n = Math.min(i + grid.size, total - 1); setSelectedCell(n); return n; });
          break;
        case "ArrowUp":
          e.preventDefault();
          setFocusedIndex((i) => { const n = Math.max(i - grid.size, 0); setSelectedCell(n); return n; });
          break;
        case "Enter":
          e.preventDefault();
          handleSubmit();
          break;
        default: {
          const num = parseInt(e.key);
          if (num >= 1 && num <= activeColors.length && selectedCell !== null) {
            e.preventDefault();
            handleColorPick(activeColors[num - 1]);
          }
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [phase, grid.size, focusedIndex, selectedCell, activeColors, handleColorPick, handleSubmit]);

  // Enter to start from idle
  useEffect(() => {
    if (phase !== "idle") return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Enter") start();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [phase, start]);

  const allFilled = playerColors.every((c) => c !== null);

  return (
    <GameShell
      gameId={GAME_ID}
      title="Color Memory"
      score={score}
      onRestart={() => { clearAllTimeouts(); setPhase("idle"); setLevel(1); }}
      instructions="Memorize the colors on the grid. When they disappear, assign the correct color to each tile using the palette. Arrow keys to navigate, number keys (1-6) to assign colors, Enter to submit."
      difficulty={difficulty}
      flash={phase === "correct" ? "correct" : phase === "wrong" ? "wrong" : null}
    >
      {phase === "idle" && (
        <div className="flex flex-col items-center gap-4 py-12">
          <p className="text-gray-500">Memorize the colors and recreate the pattern!</p>
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
            <p className="text-sm text-gray-400">Memorize the colors...</p>
          )}
          {phase === "input" && (
            <p className="text-sm text-gray-400">
              Assign colors to each tile
              {selectedCell !== null ? ` (tile ${selectedCell + 1} selected)` : " — click a tile"}
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
            {grid.tiles.map((color, idx) => {
              const isMemorize = phase === "memorize";
              const isRevealed = phase === "correct" || phase === "wrong";
              const showColor = isMemorize || isRevealed;
              const displayColor = showColor ? COLOR_HEX[color] : playerColors[idx] ? COLOR_HEX[playerColors[idx]!] : undefined;
              const isSelected = selectedCell === idx;
              const isFocused = phase === "input" && idx === focusedIndex;

              return (
                <button
                  key={idx}
                  onClick={() => handleCellClick(idx)}
                  disabled={phase !== "input"}
                  className={`h-12 w-12 rounded-lg border-2 transition-all duration-150
                    ${phase === "input" ? "cursor-pointer" : "cursor-default"}
                    ${isSelected ? "ring-2 ring-blue-500 ring-offset-2" : ""}
                    ${isFocused && !isSelected ? "ring-2 ring-gray-400 ring-offset-1" : ""}
                    ${!displayColor ? "border-gray-200 bg-gray-100 hover:bg-gray-200" : "border-transparent"}
                  `}
                  style={displayColor ? { backgroundColor: displayColor, borderColor: displayColor } : undefined}
                />
              );
            })}
          </div>

          {/* Color palette */}
          {phase === "input" && (
            <div className="flex flex-col items-center gap-3">
              <div className="flex gap-2">
                {activeColors.map((color, i) => (
                  <button
                    key={color}
                    onClick={() => handleColorPick(color)}
                    disabled={selectedCell === null}
                    className={`h-10 w-10 rounded-full border-2 border-white shadow-md transition-transform hover:scale-110
                      ${selectedCell === null ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
                    `}
                    style={{ backgroundColor: COLOR_HEX[color] }}
                    title={`${color} (${i + 1})`}
                  />
                ))}
              </div>
              {allFilled && (
                <button
                  onClick={handleSubmit}
                  className="rounded-xl bg-gray-900 px-6 py-2 text-sm font-medium text-white hover:bg-gray-700"
                >
                  Submit
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </GameShell>
  );
}
