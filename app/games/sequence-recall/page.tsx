"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import GameShell from "@/components/GameShell";
import { COLORS, generateNextColor, checkSequence, type Color } from "@/lib/games/sequence-recall";

const COLOR_MAP: Record<Color, { bg: string; active: string; ring: string }> = {
  red: { bg: "bg-red-500/30", active: "bg-red-500", ring: "ring-red-400" },
  blue: { bg: "bg-blue-500/30", active: "bg-blue-500", ring: "ring-blue-400" },
  green: { bg: "bg-green-500/30", active: "bg-green-500", ring: "ring-green-400" },
  yellow: { bg: "bg-yellow-500/30", active: "bg-yellow-500", ring: "ring-yellow-400" },
};

type Phase = "watching" | "playing" | "gameover";

export default function SequenceRecallPage() {
  const [sequence, setSequence] = useState<Color[]>([]);
  const [playerInput, setPlayerInput] = useState<Color[]>([]);
  const [phase, setPhase] = useState<Phase>("watching");
  const [activeColor, setActiveColor] = useState<Color | null>(null);
  const [score, setScore] = useState(0);
  const cancelledRef = useRef(false);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

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

  const playSequence = useCallback((seq: Color[]) => {
    setPhase("watching");
    cancelledRef.current = false;
    let i = 0;
    const play = () => {
      if (i < seq.length) {
        setActiveColor(seq[i]);
        addTimeout(() => {
          setActiveColor(null);
          i++;
          addTimeout(play, 300);
        }, 600);
      } else {
        setPhase("playing");
      }
    };
    addTimeout(play, 500);
  }, [addTimeout]);

  const startNewRound = useCallback(() => {
    setPlayerInput([]);
    const next = generateNextColor();
    setSequence((prev) => {
      const newSeq = [...prev, next];
      playSequence(newSeq);
      return newSeq;
    });
  }, [playSequence]);

  const restart = useCallback(() => {
    clearAllTimeouts();
    setSequence([]);
    setPlayerInput([]);
    setScore(0);
    setActiveColor(null);
    const first = generateNextColor();
    const newSeq = [first];
    setSequence(newSeq);
    cancelledRef.current = false;
    playSequence(newSeq);
  }, [clearAllTimeouts, playSequence]);

  useEffect(() => {
    restart();
    return clearAllTimeouts;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePress = (color: Color) => {
    if (phase !== "playing") return;

    const newInput = [...playerInput, color];
    setPlayerInput(newInput);

    setActiveColor(color);
    addTimeout(() => setActiveColor(null), 200);

    if (!checkSequence(sequence, newInput)) {
      setPhase("gameover");
      return;
    }

    if (newInput.length === sequence.length) {
      setScore(sequence.length);
      addTimeout(() => startNewRound(), 800);
    }
  };

  return (
    <GameShell
      gameId="sequence-recall"
      title="Sequence Recall"
      score={score}
      onRestart={restart}
      instructions="Watch the colored buttons light up, then repeat the sequence in order. It grows by one each round!"
    >
      {phase === "gameover" && (
        <div className="mb-6 rounded-lg bg-red-50 p-4 text-center text-red-700">
          Game over! You recalled <span className="font-bold">{score}</span> in a row.
        </div>
      )}
      {phase === "watching" && (
        <p className="mb-6 text-center text-gray-500">Watch the sequence...</p>
      )}
      {phase === "playing" && (
        <p className="mb-6 text-center text-gray-500">
          Your turn! ({playerInput.length}/{sequence.length})
        </p>
      )}
      <div className="mx-auto grid max-w-xs grid-cols-2 gap-4">
        {COLORS.map((color) => (
          <button
            key={color}
            onClick={() => handlePress(color)}
            disabled={phase !== "playing"}
            className={`h-28 rounded-2xl transition-all duration-150
              ${activeColor === color ? `${COLOR_MAP[color].active} scale-105 ring-4 ${COLOR_MAP[color].ring}` : COLOR_MAP[color].bg}
              ${phase === "playing" ? "cursor-pointer hover:scale-102" : "cursor-default"}
            `}
          />
        ))}
      </div>
    </GameShell>
  );
}
