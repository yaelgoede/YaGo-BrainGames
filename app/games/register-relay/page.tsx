"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import GameShell from "@/components/GameShell";
import DifficultySelector from "@/components/DifficultySelector";
import {
  generateLevel,
  executeTransfer,
  getLevelCount,
  type RelayLevel,
  type RegisterState,
  type MemoryState,
  type RegisterName,
  type TransferSource,
  type TransferDest,
} from "@/lib/games/register-relay";
import { type Difficulty, getSavedDifficulty, saveDifficulty } from "@/lib/difficulty";
import { playSound } from "@/lib/sounds";

const GAME_ID = "register-relay";

type Phase = "idle" | "playing";
type TransferMode = "copy" | "add";

export default function RegisterRelayPage() {
  const [difficulty, setDifficulty] = useState<Difficulty>(() => getSavedDifficulty(GAME_ID));
  const [level, setLevel] = useState<RelayLevel>(() => generateLevel(0, "easy"));
  const [regs, setRegs] = useState<RegisterState>(level.initialRegisters);
  const [mem, setMem] = useState<MemoryState>(level.initialMemory);
  const [selectedSource, setSelectedSource] = useState<TransferSource | null>(null);
  const [steps, setSteps] = useState(0);
  const [score, setScore] = useState(0);
  const [levelIndex, setLevelIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("idle");
  const [solved, setSolved] = useState(false);
  const [mode, setMode] = useState<TransferMode>("copy");
  const [history, setHistory] = useState<{ regs: RegisterState; mem: MemoryState }[]>([]);
  const [flash, setFlash] = useState<"correct" | "wrong" | null>(null);
  const flashTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (flashTimeout.current) clearTimeout(flashTimeout.current); }, []);

  const start = useCallback(() => {
    const lv = generateLevel(0, difficulty);
    setLevel(lv);
    setRegs(lv.initialRegisters);
    setMem(lv.initialMemory);
    setSelectedSource(null);
    setSteps(0);
    setScore(0);
    setLevelIndex(0);
    setPhase("playing");
    setSolved(false);
    setMode("copy");
    setHistory([]);
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
    setRegs(lv.initialRegisters);
    setMem(lv.initialMemory);
    setSelectedSource(null);
    setSteps(0);
    setSolved(false);
    setMode("copy");
    setHistory([]);
    playSound("levelUp");
  }, [levelIndex, difficulty]);

  const handleSelect = useCallback(
    (name: TransferSource | TransferDest) => {
      if (solved) return;
      if (!selectedSource) {
        // First click = select source
        playSound("click");
        setSelectedSource(name as TransferSource);
      } else {
        // Second click = select dest and execute
        if (name === selectedSource) {
          // Deselect
          setSelectedSource(null);
          return;
        }
        setHistory((prev) => [...prev, { regs: { ...regs }, mem: { ...mem } }]);
        const result = executeTransfer(
          selectedSource,
          name as TransferDest,
          regs,
          mem,
          mode === "add" ? "add" : undefined
        );
        setRegs(result.regs);
        setMem(result.mem);
        setSteps((s) => s + 1);
        setSelectedSource(null);
        playSound("click");

        // Check goal
        if (level.checkGoal(result.regs, result.mem)) {
          playSound("correct");
          setFlash("correct");
          if (flashTimeout.current) clearTimeout(flashTimeout.current);
          flashTimeout.current = setTimeout(() => setFlash(null), 300);
          const levelScore = Math.max(1, level.optimalSteps * 3 - steps - 1);
          setScore((prev) => prev + levelScore);
          setSolved(true);
        }
      }
    },
    [solved, selectedSource, regs, mem, mode, level, steps]
  );

  const undo = useCallback(() => {
    if (solved || history.length === 0) return;
    const prev = history[history.length - 1];
    setRegs(prev.regs);
    setMem(prev.mem);
    setHistory((h) => h.slice(0, -1));
    setSteps((s) => s - 1);
    setSelectedSource(null);
  }, [solved, history]);

  const resetLevel = useCallback(() => {
    if (solved) return;
    setRegs(level.initialRegisters);
    setMem(level.initialMemory);
    setSteps(0);
    setSelectedSource(null);
    setHistory([]);
  }, [solved, level]);

  const handleDifficulty = (d: Difficulty) => {
    setDifficulty(d);
    saveDifficulty(GAME_ID, d);
  };

  // Keyboard
  useEffect(() => {
    if (phase !== "playing") return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        if (solved) nextLevel();
      }
      if (e.key === "u" || e.key === "U") undo();
      if (e.key === "r" || e.key === "R") resetLevel();
      if (e.key === "t" || e.key === "T") {
        setMode((m) => (m === "copy" ? "add" : "copy"));
      }
      // Register shortcuts
      const regKeys: Record<string, RegisterName> = {
        a: "A", b: "B", c: "ACC", p: "PC", m: "MAR", d: "MDR",
      };
      const lower = e.key.toLowerCase();
      if (regKeys[lower] && level.availableRegisters.includes(regKeys[lower])) {
        handleSelect(regKeys[lower]);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [phase, solved, nextLevel, undo, resetLevel, handleSelect, level]);

  useEffect(() => {
    if (phase !== "idle") return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Enter") start();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [phase, start]);

  const memAddresses = Object.keys(level.initialMemory)
    .map(Number)
    .concat(Object.keys(mem).map(Number))
    .filter((v, i, a) => a.indexOf(v) === i)
    .sort((a, b) => a - b);

  const maxLevel = getLevelCount(difficulty);
  const allDone = solved && levelIndex >= maxLevel - 1;

  return (
    <GameShell
      gameId={GAME_ID}
      title="Register Relay"
      score={score}
      flash={flash}
      onRestart={start}
      instructions="Move data between registers! Click source then destination to transfer. T to toggle copy/add mode. U to undo, R to reset. Register keys: A, B, C(ACC), P(PC), M(MAR), D(MDR)."
      difficulty={difficulty}
    >
      {phase === "idle" && (
        <div className="flex flex-col items-center gap-4 py-12">
          <p className="text-gray-500">Move data between CPU registers using the bus!</p>
          <DifficultySelector difficulty={difficulty} onChange={handleDifficulty} />
          <p className="text-sm text-gray-400">
            {difficulty === "easy" && "2-3 registers, simple transfers"}
            {difficulty === "medium" && "4 registers, swaps and arithmetic"}
            {difficulty === "hard" && "6 registers + memory access"}
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
            <span className="text-sm font-semibold text-gray-900">{level.title}</span>
          </div>
          <p className="max-w-md text-center text-sm text-gray-500">{level.goal}</p>

          {/* Mode toggle */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Mode:</span>
            <button
              onClick={() => setMode((m) => (m === "copy" ? "add" : "copy"))}
              className={`rounded-lg px-3 py-1 text-xs font-medium transition-all ${
                mode === "add"
                  ? "bg-cyan-100 text-cyan-700"
                  : "bg-gray-100 text-gray-600"
              }`}
            >
              {mode === "copy" ? "COPY" : "ADD"} (T)
            </button>
          </div>

          {/* Bus visualization */}
          <div className="w-full max-w-md rounded-lg border border-gray-200 bg-gray-50 p-1">
            <div className="h-2 rounded bg-cyan-200" />
          </div>

          {/* Registers */}
          <div className="flex flex-wrap justify-center gap-3">
            {level.availableRegisters.map((name) => (
              <button
                key={name}
                onClick={() => handleSelect(name)}
                className={`flex flex-col items-center rounded-xl border-2 px-4 py-3 transition-all ${
                  selectedSource === name
                    ? "border-cyan-500 bg-cyan-50 shadow-md"
                    : "border-gray-200 bg-white hover:border-cyan-300"
                }`}
              >
                <span className="text-xs font-medium text-gray-500">{name}</span>
                <span className="text-xl font-bold text-gray-900">{regs[name]}</span>
              </button>
            ))}
          </div>

          {/* Memory cells (if any) */}
          {memAddresses.length > 0 && (
            <div className="flex flex-col items-center gap-2">
              <span className="text-xs font-medium text-gray-500">Memory</span>
              <div className="flex flex-wrap justify-center gap-2">
                {memAddresses.map((addr) => (
                  <button
                    key={addr}
                    onClick={() => handleSelect(`MEM[${addr}]`)}
                    className={`flex flex-col items-center rounded-lg border-2 px-3 py-2 transition-all ${
                      selectedSource === `MEM[${addr}]`
                        ? "border-cyan-500 bg-cyan-50"
                        : "border-gray-200 bg-white hover:border-cyan-300"
                    }`}
                  >
                    <span className="text-[10px] text-gray-400">[{addr}]</span>
                    <span className="text-sm font-bold text-gray-900">{mem[addr] ?? 0}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Status */}
          <div className="flex gap-4 text-sm text-gray-500">
            <span>Steps: {steps}</span>
            <span>Optimal: {level.optimalSteps}</span>
          </div>

          {selectedSource && (
            <p className="text-sm text-cyan-600">
              Source: <span className="font-bold">{selectedSource}</span> → click destination
            </p>
          )}

          {/* Action buttons */}
          {!solved && (
            <div className="flex gap-2">
              <button
                onClick={undo}
                disabled={history.length === 0}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40"
              >
                Undo (U)
              </button>
              <button
                onClick={resetLevel}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
              >
                Reset (R)
              </button>
            </div>
          )}

          {solved && (
            <div className="flex flex-col items-center gap-2">
              <p className="text-lg font-bold text-green-600">Goal reached!</p>
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
        </div>
      )}
    </GameShell>
  );
}
