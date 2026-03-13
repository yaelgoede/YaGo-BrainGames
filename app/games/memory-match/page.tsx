"use client";

import { useState, useCallback, useEffect } from "react";
import GameShell from "@/components/GameShell";
import DifficultySelector from "@/components/DifficultySelector";
import { createBoard, isAllMatched, type Card } from "@/lib/games/memory-match";
import { type Difficulty, getSavedDifficulty, saveDifficulty } from "@/lib/difficulty";
import { playSound } from "@/lib/sounds";

const GAME_ID = "memory-match";

const PAIR_COUNTS: Record<Difficulty, number> = { easy: 4, medium: 6, hard: 8 };

type Phase = "idle" | "playing";

export default function MemoryMatchPage() {
  const [difficulty, setDifficulty] = useState<Difficulty>(() => getSavedDifficulty(GAME_ID));
  const [cards, setCards] = useState<Card[]>(() => createBoard(6));
  const [selected, setSelected] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [matched, setMatched] = useState(0);
  const [locked, setLocked] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [focusedIndex, setFocusedIndex] = useState(0);

  const pairCount = PAIR_COUNTS[difficulty];
  const cols = 4;
  const score = matched;

  const start = useCallback(() => {
    setCards(createBoard(pairCount));
    setSelected([]);
    setMoves(0);
    setMatched(0);
    setLocked(false);
    setPhase("playing");
    setFocusedIndex(0);
  }, [pairCount]);

  const restart = useCallback(() => {
    setPhase("idle");
    setMatched(0);
    setMoves(0);
  }, []);

  const handleClick = useCallback((index: number) => {
    if (locked) return;
    const card = cards[index];
    if (card.flipped || card.matched) return;
    if (selected.includes(index)) return;

    const newCards = [...cards];
    newCards[index] = { ...card, flipped: true };
    const newSelected = [...selected, index];
    setCards(newCards);
    setSelected(newSelected);

    if (newSelected.length === 2) {
      setMoves((m) => m + 1);
      const [first, second] = newSelected;
      if (newCards[first].emoji === newCards[second].emoji) {
        playSound("correct");
        newCards[first] = { ...newCards[first], matched: true };
        newCards[second] = { ...newCards[second], matched: true };
        setCards(newCards);
        setMatched((m) => m + 1);
        setSelected([]);
      } else {
        playSound("wrong");
        setLocked(true);
        setTimeout(() => {
          newCards[first] = { ...newCards[first], flipped: false };
          newCards[second] = { ...newCards[second], flipped: false };
          setCards([...newCards]);
          setSelected([]);
          setLocked(false);
        }, 800);
      }
    }
  }, [locked, cards, selected]);

  const handleDifficulty = (d: Difficulty) => {
    setDifficulty(d);
    saveDifficulty(GAME_ID, d);
  };

  // Keyboard: arrow keys to navigate, Enter/Space to flip
  useEffect(() => {
    if (phase !== "playing") return;
    const total = cards.length;
    const handler = (e: KeyboardEvent) => {
      if (locked) return;
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
          setFocusedIndex((i) => Math.min(i + cols, total - 1));
          break;
        case "ArrowUp":
          e.preventDefault();
          setFocusedIndex((i) => Math.max(i - cols, 0));
          break;
        case "Enter":
        case " ":
          e.preventDefault();
          handleClick(focusedIndex);
          break;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [phase, locked, focusedIndex, cards.length, handleClick]);

  // Enter to start from idle
  useEffect(() => {
    if (phase !== "idle") return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Enter") start();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [phase, start]);

  const won = phase === "playing" && isAllMatched(cards);

  return (
    <GameShell
      gameId={GAME_ID}
      title="Memory Match"
      score={score}
      onRestart={restart}
      instructions="Flip two cards at a time to find matching pairs. Use arrow keys to navigate, Enter to flip."
      difficulty={difficulty}
    >
      {phase === "idle" && (
        <div className="flex flex-col items-center gap-4 py-12">
          <p className="text-gray-500">Match all the pairs from memory!</p>
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

      {phase === "playing" && (
        <>
          {won && (
            <div className="mb-6 rounded-lg bg-green-50 p-4 text-center text-green-700">
              You matched all pairs in <span className="font-bold">{moves}</span> moves!
            </div>
          )}
          <div className="grid grid-cols-4 gap-3 sm:grid-cols-4">
            {cards.map((card, i) => (
              <button
                key={card.id}
                onClick={() => handleClick(i)}
                className={`flex h-20 items-center justify-center rounded-xl text-3xl transition-all duration-200 sm:h-24
                  ${card.flipped || card.matched
                    ? "bg-white border-2 border-blue-300 scale-105"
                    : "bg-gray-200 border-2 border-gray-200 hover:bg-gray-300 cursor-pointer"
                  }
                  ${card.matched ? "opacity-60" : ""}
                  ${i === focusedIndex && !card.matched ? "ring-2 ring-blue-500 ring-offset-2" : ""}
                `}
              >
                {card.flipped || card.matched ? card.emoji : ""}
              </button>
            ))}
          </div>
          <p className="mt-4 text-center text-sm text-gray-400">Moves: {moves}</p>
        </>
      )}
    </GameShell>
  );
}
