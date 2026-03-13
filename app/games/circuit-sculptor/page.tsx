"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import GameShell from "@/components/GameShell";
import DifficultySelector from "@/components/DifficultySelector";
import {
  generateLevel,
  checkAllCombinations,
  createEmptySlots,
  getInputOptions,
  getLevelCount,
  type CircuitLevel,
  type GateSlot,
  type GateType,
} from "@/lib/games/circuit-sculptor";
import { type Difficulty, getSavedDifficulty, saveDifficulty } from "@/lib/difficulty";
import { playSound } from "@/lib/sounds";

const GAME_ID = "circuit-sculptor";

type Phase = "idle" | "playing";

export default function CircuitSculptorPage() {
  const [difficulty, setDifficulty] = useState<Difficulty>(() => getSavedDifficulty(GAME_ID));
  const [level, setLevel] = useState<CircuitLevel>(() => generateLevel(0, "easy"));
  const [slots, setSlots] = useState<GateSlot[]>(() => createEmptySlots(3));
  const [score, setScore] = useState(0);
  const [levelIndex, setLevelIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("idle");
  const [solved, setSolved] = useState(false);
  const [flash, setFlash] = useState<"correct" | "wrong" | null>(null);
  const flashTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [testResults, setTestResults] = useState<
    { inputs: number[]; expected: number; got: number | null }[] | null
  >(null);

  useEffect(() => () => { if (flashTimeout.current) clearTimeout(flashTimeout.current); }, []);

  const start = useCallback(() => {
    const lv = generateLevel(0, difficulty);
    setLevel(lv);
    setSlots(createEmptySlots(lv.slotCount));
    setScore(0);
    setLevelIndex(0);
    setPhase("playing");
    setSolved(false);
    setTestResults(null);
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
    setSlots(createEmptySlots(lv.slotCount));
    setSolved(false);
    setTestResults(null);
    playSound("levelUp");
  }, [levelIndex, difficulty]);

  const updateSlot = useCallback(
    (index: number, field: keyof GateSlot, value: GateType | number) => {
      if (solved) return;
      playSound("click");
      setSlots((prev) => {
        const next = [...prev];
        next[index] = { ...next[index], [field]: value };
        return next;
      });
      setTestResults(null);
    },
    [solved]
  );

  const handleTest = useCallback(() => {
    if (solved) return;
    const { correct, results } = checkAllCombinations(slots, level);
    setTestResults(results);

    if (correct) {
      playSound("correct");
      setFlash("correct");
      if (flashTimeout.current) clearTimeout(flashTimeout.current);
      flashTimeout.current = setTimeout(() => setFlash(null), 300);
      const levelScore = (levelIndex + 1) * 10;
      setScore((prev) => prev + levelScore);
      setSolved(true);
    } else {
      playSound("wrong");
      setFlash("wrong");
      if (flashTimeout.current) clearTimeout(flashTimeout.current);
      flashTimeout.current = setTimeout(() => setFlash(null), 500);
    }
  }, [solved, slots, level, levelIndex]);

  const handleDifficulty = (d: Difficulty) => {
    setDifficulty(d);
    saveDifficulty(GAME_ID, d);
  };

  useEffect(() => {
    if (phase !== "playing") return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        if (solved) nextLevel();
        else handleTest();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [phase, solved, handleTest, nextLevel]);

  useEffect(() => {
    if (phase !== "idle") return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Enter") start();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [phase, start]);

  const maxLevel = getLevelCount(difficulty);
  const allDone = solved && levelIndex >= maxLevel - 1;
  const GATE_TYPES: GateType[] = level.availableGates;

  return (
    <GameShell
      gameId={GAME_ID}
      title="Circuit Sculptor"
      score={score}
      flash={flash}
      onRestart={start}
      instructions="Design combinational circuits! Set each gate's type and inputs to match the target truth table. The starred gate is the output. Enter to test."
      difficulty={difficulty}
    >
      {phase === "idle" && (
        <div className="flex flex-col items-center gap-4 py-12">
          <p className="text-gray-500">Design combinational logic circuits!</p>
          <DifficultySelector difficulty={difficulty} onChange={handleDifficulty} />
          <p className="text-sm text-gray-400">
            {difficulty === "easy" && "Half adder — 2 levels"}
            {difficulty === "medium" && "Adders, mux, comparator — 4 levels"}
            {difficulty === "hard" && "All circuits including full adder — 5 levels"}
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
          <p className="max-w-md text-center text-sm text-gray-500">{level.description}</p>

          {/* Gate slots */}
          <div className="flex flex-wrap justify-center gap-3">
            {slots.map((slot, i) => {
              const isOutput = i === level.outputSlotIndex;
              const inputOptions = getInputOptions(i, level);
              const isUnary = slot.type === "NOT" || slot.type === "PASS";
              return (
                <div
                  key={i}
                  className={`rounded-xl border-2 p-3 ${
                    isOutput ? "border-cyan-400 bg-cyan-50" : "border-gray-200 bg-white"
                  }`}
                >
                  <div className="mb-2 flex items-center gap-2">
                    <span className="text-sm font-bold text-gray-700">Gate {i + 1}</span>
                    {isOutput && (
                      <span className="text-xs text-cyan-600">
                        → {level.outputLabel} ★
                      </span>
                    )}
                  </div>
                  {/* Gate type selector */}
                  <select
                    value={slot.type}
                    onChange={(e) => updateSlot(i, "type", e.target.value as GateType)}
                    disabled={solved}
                    className="mb-2 w-full rounded-lg border border-gray-300 bg-white px-2 py-1 text-sm font-medium text-gray-700"
                  >
                    {GATE_TYPES.map((gt) => (
                      <option key={gt} value={gt}>
                        {gt}
                      </option>
                    ))}
                  </select>
                  {/* Input 1 */}
                  <select
                    value={slot.input1}
                    onChange={(e) => updateSlot(i, "input1", parseInt(e.target.value, 10))}
                    disabled={solved}
                    className="mb-1 w-full rounded-lg border border-gray-300 bg-white px-2 py-1 text-xs text-gray-600"
                  >
                    {inputOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        In1: {opt.label}
                      </option>
                    ))}
                  </select>
                  {/* Input 2 (hidden for NOT/PASS) */}
                  {!isUnary && (
                    <select
                      value={slot.input2}
                      onChange={(e) => updateSlot(i, "input2", parseInt(e.target.value, 10))}
                      disabled={solved}
                      className="w-full rounded-lg border border-gray-300 bg-white px-2 py-1 text-xs text-gray-600"
                    >
                      {inputOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          In2: {opt.label}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              );
            })}
          </div>

          {/* Truth table / test results */}
          <div className="w-full max-w-sm">
            <table className="w-full text-center text-sm">
              <thead>
                <tr className="text-gray-500">
                  {level.inputLabels.map((label) => (
                    <th key={label} className="py-1">{label}</th>
                  ))}
                  <th className="py-1">Expected</th>
                  {testResults && <th className="py-1">Got</th>}
                  {testResults && <th className="py-1" />}
                </tr>
              </thead>
              <tbody>
                {level.expectedTable.map((row, i) => {
                  const tr = testResults?.[i];
                  return (
                    <tr key={i} className="border-t border-gray-100">
                      {row.inputs.map((v, j) => (
                        <td key={j} className="py-1">{v}</td>
                      ))}
                      <td className="py-1 font-medium">{row.output}</td>
                      {tr && (
                        <td className="py-1 font-medium">
                          {tr.got === null ? "?" : tr.got}
                        </td>
                      )}
                      {tr && (
                        <td className="py-1">
                          {tr.got === tr.expected ? (
                            <span className="text-green-600">✓</span>
                          ) : (
                            <span className="text-red-500">✗</span>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Solved / action */}
          {solved ? (
            <div className="flex flex-col items-center gap-2">
              <p className="text-lg font-bold text-green-600">Circuit works!</p>
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
          ) : (
            <button
              onClick={handleTest}
              className="rounded-xl bg-gray-900 px-8 py-3 text-lg font-medium text-white hover:bg-gray-700"
            >
              Test Circuit
            </button>
          )}
        </div>
      )}
    </GameShell>
  );
}
