"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import GameShell from "@/components/GameShell";
import DifficultySelector from "@/components/DifficultySelector";
import {
  generateLevel,
  checkCircuit,
  getStarRating,
  createEmptyGates,
  getAvailableInputs,
  getTargetLabel,
  getLevelCount,
  evaluateCircuit,
  type NandBuilderLevel,
  type NandGate,
  type NandGateInput,
} from "@/lib/games/nand-builder";
import { type Difficulty, getSavedDifficulty, saveDifficulty } from "@/lib/difficulty";
import { playSound } from "@/lib/sounds";

const GAME_ID = "nand-builder";

type Phase = "idle" | "playing";

export default function NandBuilderPage() {
  const [difficulty, setDifficulty] = useState<Difficulty>(() => getSavedDifficulty(GAME_ID));
  const [level, setLevel] = useState<NandBuilderLevel>(() => generateLevel(0, "easy"));
  const [gates, setGates] = useState<NandGate[]>(() => createEmptyGates(1));
  const [score, setScore] = useState(0);
  const [levelIndex, setLevelIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("idle");
  const [solved, setSolved] = useState(false);
  const [stars, setStars] = useState(0);
  const [matchingRows, setMatchingRows] = useState<boolean[]>([]);
  const [flash, setFlash] = useState<"correct" | "wrong" | null>(null);
  const flashTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (flashTimeout.current) clearTimeout(flashTimeout.current); }, []);

  const start = useCallback(() => {
    const lv = generateLevel(0, difficulty);
    setLevel(lv);
    setGates(createEmptyGates(lv.nandCount));
    setScore(0);
    setLevelIndex(0);
    setPhase("playing");
    setSolved(false);
    setStars(0);
    setMatchingRows([]);
  }, [difficulty]);

  const nextLevel = useCallback(() => {
    const maxLevel = getLevelCount(difficulty);
    const newIndex = levelIndex + 1;
    if (newIndex >= maxLevel) {
      // All levels complete
      playSound("gameOver");
      return;
    }
    const lv = generateLevel(newIndex, difficulty);
    setLevel(lv);
    setLevelIndex(newIndex);
    setGates(createEmptyGates(lv.nandCount));
    setSolved(false);
    setStars(0);
    setMatchingRows([]);
    playSound("levelUp");
  }, [levelIndex, difficulty]);

  const updateGateInput = useCallback(
    (gateIndex: number, inputSlot: "input1" | "input2", value: NandGateInput) => {
      if (solved) return;
      playSound("click");
      setGates((prev) => {
        const next = [...prev];
        next[gateIndex] = { ...next[gateIndex], [inputSlot]: value };
        return next;
      });
    },
    [solved]
  );

  const handleTest = useCallback(() => {
    if (solved) return;
    const { correct, matchingRows: rows } = checkCircuit(gates, level);
    setMatchingRows(rows);

    if (correct) {
      playSound("correct");
      setFlash("correct");
      if (flashTimeout.current) clearTimeout(flashTimeout.current);
      flashTimeout.current = setTimeout(() => setFlash(null), 300);
      const usedNands = gates.filter((g) => g.input1 && g.input2).length;
      const s = getStarRating(usedNands, level.optimalNands);
      setStars(s);
      setSolved(true);
      setScore((prev) => prev + s);
    } else {
      playSound("wrong");
      setFlash("wrong");
      if (flashTimeout.current) clearTimeout(flashTimeout.current);
      flashTimeout.current = setTimeout(() => setFlash(null), 500);
    }
  }, [solved, gates, level]);

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

  // Live truth table evaluation
  const liveOutputs = level.expectedTable.map((row) => {
    const results = evaluateCircuit(gates, row.a, row.b);
    return level.outputGateIndices.map((i) => results[i]);
  });

  const maxLevel = getLevelCount(difficulty);
  const allDone = solved && levelIndex >= maxLevel - 1;

  return (
    <GameShell
      gameId={GAME_ID}
      title="NAND Builder"
      score={score}
      flash={flash}
      onRestart={start}
      instructions="Build logic gates using only NAND gates! Select inputs for each NAND gate from the dropdowns. The output gate is marked with a star. Enter to test or advance."
      difficulty={difficulty}
    >
      {phase === "idle" && (
        <div className="flex flex-col items-center gap-4 py-12">
          <p className="text-gray-500">Build any logic gate using only NAND gates!</p>
          <DifficultySelector difficulty={difficulty} onChange={handleDifficulty} />
          <p className="text-sm text-gray-400">
            {difficulty === "easy" && "NOT, AND, OR — with hints"}
            {difficulty === "medium" && "NOT, AND, OR, XOR — no hints"}
            {difficulty === "hard" && "All gates + half-adder — no hints"}
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
            <span className="text-sm font-semibold text-gray-900">
              {getTargetLabel(level.target)}
            </span>
          </div>
          <p className="text-sm text-gray-500">{level.description}</p>
          {level.hintText && (
            <p className="rounded-lg bg-cyan-50 px-4 py-2 text-xs text-cyan-700">
              Hint: {level.hintText}
            </p>
          )}

          {/* NAND gate cards */}
          <div className="flex flex-wrap justify-center gap-3">
            {gates.map((gate, i) => {
              const isOutput = level.outputGateIndices.includes(i);
              const available = getAvailableInputs(i);
              return (
                <div
                  key={i}
                  className={`rounded-xl border-2 p-4 ${
                    isOutput
                      ? "border-cyan-400 bg-cyan-50"
                      : "border-gray-200 bg-white"
                  }`}
                >
                  <div className="mb-2 flex items-center gap-2">
                    <span className="text-sm font-bold text-gray-700">
                      NAND{i + 1}
                    </span>
                    {isOutput && <span className="text-yellow-500">★</span>}
                  </div>
                  {(["input1", "input2"] as const).map((slot) => (
                    <div key={slot} className="mb-1">
                      <select
                        value={gate[slot] || ""}
                        onChange={(e) =>
                          updateGateInput(
                            i,
                            slot,
                            (e.target.value || null) as NandGateInput
                          )
                        }
                        disabled={solved}
                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700"
                      >
                        <option value="">— select —</option>
                        {available.map((inp) => (
                          <option key={inp} value={inp!}>
                            {inp}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>

          {/* Truth table */}
          <div className="w-full max-w-xs">
            <table className="w-full text-center text-sm">
              <thead>
                <tr className="text-gray-500">
                  <th className="py-1">A</th>
                  <th className="py-1">B</th>
                  <th className="py-1">Expected</th>
                  <th className="py-1">Got</th>
                  <th className="py-1" />
                </tr>
              </thead>
              <tbody>
                {level.expectedTable.map((row, i) => {
                  const got = liveOutputs[i];
                  const match = matchingRows.length > 0 ? matchingRows[i] : null;
                  return (
                    <tr key={i} className="border-t border-gray-100">
                      <td className="py-1">{row.a}</td>
                      <td className="py-1">{row.b}</td>
                      <td className="py-1 font-medium">{row.expected.join(", ")}</td>
                      <td className="py-1 font-medium">
                        {got.map((v) => (v === null ? "?" : v)).join(", ")}
                      </td>
                      <td className="py-1">
                        {match === true && <span className="text-green-600">✓</span>}
                        {match === false && <span className="text-red-500">✗</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Solved feedback */}
          {solved && (
            <div className="flex flex-col items-center gap-2">
              <p className="text-lg font-bold text-green-600">
                {"★".repeat(stars)}{"☆".repeat(3 - stars)} — Solved!
              </p>
              {allDone ? (
                <p className="text-sm text-cyan-700 font-medium">
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

          {!solved && (
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
