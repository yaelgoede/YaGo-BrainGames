"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import GameShell from "@/components/GameShell";
import DifficultySelector from "@/components/DifficultySelector";
import { generateRound, getMathChainConfig, type MathChainRound, type MathChainConfig } from "@/lib/games/math-chain";
import { type Difficulty, getSavedDifficulty, saveDifficulty } from "@/lib/difficulty";
import { playSound } from "@/lib/sounds";

const GAME_ID = "math-chain";

type Phase = "idle" | "playing" | "over";

export default function MathChainPage() {
  const [difficulty, setDifficulty] = useState<Difficulty>(() => getSavedDifficulty(GAME_ID));
  const [config, setConfig] = useState<MathChainConfig>(() => getMathChainConfig("medium"));
  const [round, setRound] = useState<MathChainRound | null>(null);
  const [current, setCurrent] = useState(0);
  const [history, setHistory] = useState<number[]>([]);
  const [roundNumber, setRoundNumber] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const [phase, setPhase] = useState<Phase>("idle");
  const phaseRef = useRef<Phase>("idle");
  const [flash, setFlash] = useState<"correct" | "wrong" | null>(null);
  const flashTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  useEffect(() => () => { if (flashTimeout.current) clearTimeout(flashTimeout.current); }, []);

  // Timer
  useEffect(() => {
    if (phase !== "playing") return;
    if (timeLeft <= 0) {
      playSound("gameOver");
      setPhase("over");
      return;
    }
    const timer = setTimeout(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearTimeout(timer);
  }, [timeLeft, phase]);

  const startNewRound = useCallback(
    (cfg: MathChainConfig) => {
      const newRound = generateRound(cfg);
      setRound(newRound);
      setCurrent(newRound.start);
      setHistory([newRound.start]);
      setTimeLeft(cfg.timePerRound);
    },
    [],
  );

  const start = useCallback(() => {
    const cfg = getMathChainConfig(difficulty);
    setConfig(cfg);
    setPhase("playing");
    setRoundNumber(0);
    startNewRound(cfg);
  }, [difficulty, startNewRound]);

  const handleOperation = useCallback(
    (opIndex: number) => {
      if (phase !== "playing" || !round) return;
      const op = round.operations[opIndex];
      if (!op) return;

      playSound("click");
      const result = op.apply(current);
      setCurrent(result);
      setHistory((h) => [...h, result]);

      if (result === round.target) {
        playSound("correct");
        setFlash("correct");
        if (flashTimeout.current) clearTimeout(flashTimeout.current);
        flashTimeout.current = setTimeout(() => setFlash(null), 300);
        const newRoundNumber = roundNumber + 1;
        setRoundNumber(newRoundNumber);
        startNewRound(config);
      }
    },
    [phase, round, current, roundNumber, config, startNewRound],
  );

  const handleUndo = useCallback(() => {
    if (phase !== "playing" || !round) return;
    if (history.length <= 1) return;
    const newHistory = history.slice(0, -1);
    setHistory(newHistory);
    setCurrent(newHistory[newHistory.length - 1]);
  }, [phase, round, history]);

  const handleDifficulty = (d: Difficulty) => {
    setDifficulty(d);
    saveDifficulty(GAME_ID, d);
  };

  // Keyboard: 1-4 for operations, z/Backspace for undo
  useEffect(() => {
    if (phase !== "playing") return;
    const handler = (e: KeyboardEvent) => {
      const num = parseInt(e.key);
      if (num >= 1 && num <= 4) {
        e.preventDefault();
        handleOperation(num - 1);
      } else if (e.key === "z" || e.key === "Backspace") {
        e.preventDefault();
        handleUndo();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [phase, handleOperation, handleUndo]);

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
      title="Math Chain"
      score={roundNumber}
      onRestart={() => setPhase("idle")}
      showTimer={phase === "playing"}
      timeLeft={timeLeft}
      instructions="Chain operations to reach the target number. Pick an operation to apply to your current value. Keys 1-4 to pick, Z or Backspace to undo."
      difficulty={difficulty}
      flash={flash}
    >
      {phase === "idle" && (
        <div className="flex flex-col items-center gap-4 py-12">
          <p className="text-gray-500">Chain operations to hit the target!</p>
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
          <div className="rounded-lg bg-green-50 p-6 text-center">
            <p className="text-2xl font-bold text-green-700">{roundNumber} rounds</p>
            <p className="text-green-600">completed before time ran out</p>
          </div>
        </div>
      )}

      {phase === "playing" && round && (
        <div className="flex flex-col items-center gap-6 py-6">
          {/* Target */}
          <div className="text-center">
            <p className="text-sm font-medium text-gray-400">Target</p>
            <p className="text-3xl font-bold text-green-600">{round.target}</p>
          </div>

          {/* Current value */}
          <div className="text-center">
            <p className="text-sm font-medium text-gray-400">Current</p>
            <p className={`text-5xl font-bold ${current === round.target ? "text-green-600" : "text-gray-900"}`}>
              {current}
            </p>
          </div>

          {/* History breadcrumb */}
          {history.length > 1 && (
            <div className="flex flex-wrap items-center gap-1 text-sm text-gray-400">
              {history.map((val, i) => (
                <span key={i}>
                  {i > 0 && <span className="mx-1">&rarr;</span>}
                  <span className={i === history.length - 1 ? "font-semibold text-gray-700" : ""}>
                    {val}
                  </span>
                </span>
              ))}
            </div>
          )}

          {/* Operations */}
          <div className="grid grid-cols-2 gap-3">
            {round.operations.map((op, i) => (
              <button
                key={i}
                onClick={() => handleOperation(i)}
                className="rounded-xl border-2 border-gray-200 px-6 py-4 text-lg font-semibold text-gray-900 transition-colors hover:border-green-400 hover:bg-green-50"
              >
                <span className="text-xs text-gray-400 mr-2">{i + 1}</span>
                {op.label}
              </button>
            ))}
          </div>

          {/* Undo */}
          {history.length > 1 && (
            <button
              onClick={handleUndo}
              className="rounded-lg border border-gray-200 px-4 py-1.5 text-sm text-gray-500 hover:bg-gray-50"
            >
              Undo (Z)
            </button>
          )}
        </div>
      )}
    </GameShell>
  );
}
