"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import GameShell from "@/components/GameShell";
import DifficultySelector from "@/components/DifficultySelector";
import { COLORS, generateNextColor, checkSequence, type Color } from "@/lib/games/sequence-recall";
import { type Difficulty, DIFFICULTY_OFFSET, getSavedDifficulty, saveDifficulty } from "@/lib/difficulty";

const GAME_ID = "sequence-recall";

const COLOR_MAP: Record<Color, { bg: string; active: string; ring: string }> = {
  red: { bg: "bg-red-500/30", active: "bg-red-500", ring: "ring-red-400" },
  blue: { bg: "bg-blue-500/30", active: "bg-blue-500", ring: "ring-blue-400" },
  green: { bg: "bg-green-500/30", active: "bg-green-500", ring: "ring-green-400" },
  yellow: { bg: "bg-yellow-500/30", active: "bg-yellow-500", ring: "ring-yellow-400" },
};

const KEY_MAP: Record<string, Color> = { r: "red", b: "blue", g: "green", y: "yellow" };
const COLOR_KEYS: Record<Color, string> = { red: "R", blue: "B", green: "G", yellow: "Y" };

type Phase = "idle" | "watching" | "playing" | "gameover";

export default function SequenceRecallPage() {
  const [difficulty, setDifficulty] = useState<Difficulty>(() => getSavedDifficulty(GAME_ID));
  const [sequence, setSequence] = useState<Color[]>([]);
  const [playerInput, setPlayerInput] = useState<Color[]>([]);
  const [phase, setPhase] = useState<Phase>("idle");
  const [activeColor, setActiveColor] = useState<Color | null>(null);
  const [score, setScore] = useState(0);
  const cancelledRef = useRef(false);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

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

  const start = useCallback(() => {
    clearAllTimeouts();
    setScore(0);
    setActiveColor(null);
    setPlayerInput([]);
    cancelledRef.current = false;
    // Build initial sequence based on difficulty offset
    const initialLength = 1 + offset;
    const newSeq: Color[] = [];
    for (let i = 0; i < initialLength; i++) {
      newSeq.push(generateNextColor());
    }
    setSequence(newSeq);
    playSequence(newSeq);
  }, [clearAllTimeouts, playSequence, offset]);

  useEffect(() => {
    return clearAllTimeouts;
  }, [clearAllTimeouts]);

  const handlePress = useCallback((color: Color) => {
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
  }, [phase, playerInput, sequence, addTimeout, startNewRound]);

  const handleDifficulty = (d: Difficulty) => {
    setDifficulty(d);
    saveDifficulty(GAME_ID, d);
  };

  // Keyboard: R/B/G/Y to press color
  useEffect(() => {
    if (phase !== "playing") return;
    const handler = (e: KeyboardEvent) => {
      const color = KEY_MAP[e.key.toLowerCase()];
      if (color) handlePress(color);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [phase, handlePress]);

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
      title="Sequence Recall"
      score={score}
      onRestart={() => { clearAllTimeouts(); setPhase("idle"); setScore(0); }}
      instructions="Watch the colored buttons light up, then repeat the sequence. Press R/B/G/Y keys or click!"
      difficulty={difficulty}
    >
      {phase === "idle" && (
        <div className="flex flex-col items-center gap-4 py-12">
          <p className="text-gray-500">Watch and repeat the color sequence!</p>
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

      {phase !== "idle" && (
        <div className="mx-auto grid max-w-xs grid-cols-2 gap-4">
          {COLORS.map((color) => (
            <button
              key={color}
              onClick={() => handlePress(color)}
              disabled={phase !== "playing"}
              className={`relative h-28 rounded-2xl transition-all duration-150
                ${activeColor === color ? `${COLOR_MAP[color].active} scale-105 ring-4 ${COLOR_MAP[color].ring}` : COLOR_MAP[color].bg}
                ${phase === "playing" ? "cursor-pointer hover:scale-102" : "cursor-default"}
              `}
            >
              <span className="absolute bottom-2 right-3 text-xs font-medium text-white/60">
                {COLOR_KEYS[color]}
              </span>
            </button>
          ))}
        </div>
      )}
    </GameShell>
  );
}
