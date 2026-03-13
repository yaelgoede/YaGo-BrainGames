"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import GameShell from "@/components/GameShell";
import DifficultySelector from "@/components/DifficultySelector";
import { generateChimpGrid, getChimpConfig, type ChimpGrid } from "@/lib/games/chimp-test";
import { type Difficulty, getSavedDifficulty, saveDifficulty } from "@/lib/difficulty";
import { playSound } from "@/lib/sounds";

const GAME_ID = "chimp-test";

type Phase = "idle" | "showing" | "playing" | "over";

export default function ChimpTestPage() {
  const [difficulty, setDifficulty] = useState<Difficulty>(() => getSavedDifficulty(GAME_ID));
  const [grid, setGrid] = useState<ChimpGrid>(() => generateChimpGrid(4));
  const [round, setRound] = useState(4);
  const [nextExpected, setNextExpected] = useState(1);
  const [clicked, setClicked] = useState<Set<number>>(new Set());
  const [phase, setPhase] = useState<Phase>("idle");
  const [focusedIndex, setFocusedIndex] = useState(0);
  const bestRoundRef = useRef(0);
  const score = phase === "over" ? bestRoundRef.current : Math.max(round - 1, 0);

  const start = useCallback(() => {
    const config = getChimpConfig(difficulty);
    const count = config.startingCount;
    const newGrid = generateChimpGrid(count);
    setGrid(newGrid);
    setRound(count);
    setNextExpected(1);
    setClicked(new Set());
    setFocusedIndex(0);
    bestRoundRef.current = 0;
    setPhase("showing");
  }, [difficulty]);

  const handleCellClick = useCallback(
    (cellIdx: number) => {
      if (phase !== "showing" && phase !== "playing") return;

      const num = grid.numbers.get(cellIdx);
      if (num === undefined) {
        // Clicked empty cell
        if (phase === "playing") {
          playSound("wrong");
          playSound("gameOver");
          setPhase("over");
        }
        return;
      }

      if (num !== nextExpected) {
        playSound("wrong");
        playSound("gameOver");
        setPhase("over");
        return;
      }

      // Correct click
      playSound("click");
      const newClicked = new Set(clicked);
      newClicked.add(cellIdx);
      setClicked(newClicked);

      if (phase === "showing") {
        // First click (number 1) — hide all numbers
        setPhase("playing");
      }

      if (nextExpected === round) {
        // Completed this round
        bestRoundRef.current = round;
        playSound("levelUp");
        const newRound = round + 1;
        const newGrid = generateChimpGrid(newRound);
        setGrid(newGrid);
        setRound(newRound);
        setNextExpected(1);
        setClicked(new Set());
        setFocusedIndex(0);
        setPhase("showing");
      } else {
        setNextExpected(nextExpected + 1);
      }
    },
    [phase, grid, nextExpected, round, clicked],
  );

  const handleDifficulty = (d: Difficulty) => {
    setDifficulty(d);
    saveDifficulty(GAME_ID, d);
  };

  // Keyboard: arrow keys + Enter/Space
  useEffect(() => {
    if (phase !== "showing" && phase !== "playing") return;
    const total = grid.cols * grid.rows;
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
          setFocusedIndex((i) => Math.min(i + grid.cols, total - 1));
          break;
        case "ArrowUp":
          e.preventDefault();
          setFocusedIndex((i) => Math.max(i - grid.cols, 0));
          break;
        case "Enter":
        case " ":
          e.preventDefault();
          handleCellClick(focusedIndex);
          break;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [phase, grid.cols, grid.rows, focusedIndex, handleCellClick]);

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
      title="Chimp Test"
      score={score}
      onRestart={() => setPhase("idle")}
      instructions="Numbers appear on a grid. Click them in ascending order (1, 2, 3...). After you click the first number, the rest will hide. Each round adds one more number."
      difficulty={difficulty}
    >
      {phase === "idle" && (
        <div className="flex flex-col items-center gap-4 py-12">
          <p className="text-gray-500">How many numbers can you remember?</p>
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
            <p className="text-2xl font-bold text-blue-700">{score} numbers</p>
            <p className="text-blue-600">You successfully tracked {score} numbers</p>
          </div>
        </div>
      )}

      {(phase === "showing" || phase === "playing") && (
        <div className="flex flex-col items-center gap-4 py-4">
          <div className="flex items-center gap-4">
            <p className="text-sm font-medium text-gray-500">Round: {round} numbers</p>
            <p className="text-sm text-gray-400">
              Next: {nextExpected}
            </p>
          </div>

          {phase === "showing" && (
            <p className="text-sm text-gray-400">Click number 1 to begin</p>
          )}

          <div
            className="mx-auto grid gap-1"
            style={{
              gridTemplateColumns: `repeat(${grid.cols}, 1fr)`,
              width: `${grid.cols * 48 + (grid.cols - 1) * 4}px`,
            }}
          >
            {Array.from({ length: grid.cols * grid.rows }).map((_, idx) => {
              const num = grid.numbers.get(idx);
              const isClicked = clicked.has(idx);
              const showNumber = phase === "showing" && num !== undefined && !isClicked;
              const isActive = num !== undefined && !isClicked;

              return (
                <button
                  key={idx}
                  onClick={() => handleCellClick(idx)}
                  disabled={isClicked}
                  className={`flex h-11 w-11 items-center justify-center rounded-lg border-2 text-sm font-bold transition-all duration-100
                    ${isClicked
                      ? "border-transparent bg-transparent"
                      : isActive
                        ? "border-blue-400 bg-blue-500 text-white hover:bg-blue-600 cursor-pointer"
                        : "border-gray-200 bg-gray-100"
                    }
                    ${(phase === "showing" || phase === "playing") && idx === focusedIndex && !isClicked
                      ? "ring-2 ring-blue-500 ring-offset-2"
                      : ""
                    }
                  `}
                >
                  {showNumber ? num : ""}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </GameShell>
  );
}
