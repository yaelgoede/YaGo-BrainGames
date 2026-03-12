"use client";

import { useState, useCallback, useEffect } from "react";
import GameShell from "@/components/GameShell";
import { createBoard, isAllMatched, type Card } from "@/lib/games/memory-match";

const PAIR_COUNT = 6;

export default function MemoryMatchPage() {
  const [cards, setCards] = useState<Card[]>(() => createBoard(PAIR_COUNT));
  const [selected, setSelected] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [matched, setMatched] = useState(0);
  const [locked, setLocked] = useState(false);

  const score = matched;

  const restart = useCallback(() => {
    setCards(createBoard(PAIR_COUNT));
    setSelected([]);
    setMoves(0);
    setMatched(0);
    setLocked(false);
  }, []);

  const handleClick = (index: number) => {
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
        newCards[first] = { ...newCards[first], matched: true };
        newCards[second] = { ...newCards[second], matched: true };
        setCards(newCards);
        setMatched((m) => m + 1);
        setSelected([]);
      } else {
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
  };

  const won = isAllMatched(cards);

  return (
    <GameShell
      gameId="memory-match"
      title="Memory Match"
      score={score}
      onRestart={restart}
      instructions="Flip two cards at a time to find matching pairs. Match all pairs to win!"
    >
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
            `}
          >
            {card.flipped || card.matched ? card.emoji : ""}
          </button>
        ))}
      </div>
      <p className="mt-4 text-center text-sm text-gray-400">Moves: {moves}</p>
    </GameShell>
  );
}
