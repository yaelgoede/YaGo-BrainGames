"use client";

import { useState, useCallback, useEffect } from "react";
import GameShell from "@/components/GameShell";
import DifficultySelector from "@/components/DifficultySelector";
import {
  generateLevel,
  getLevelCount,
  MICRO_STEP_LABELS,
  type ClockworkLevel,
  type CPUState,
  type MicroStep,
} from "@/lib/games/clockwork-computer";
import { type Difficulty, getSavedDifficulty, saveDifficulty } from "@/lib/difficulty";
import { playSound } from "@/lib/sounds";

const GAME_ID = "clockwork-computer";

type Phase = "idle" | "playing";

export default function ClockworkComputerPage() {
  const [difficulty, setDifficulty] = useState<Difficulty>(() => getSavedDifficulty(GAME_ID));
  const [level, setLevel] = useState<ClockworkLevel>(() => generateLevel(0, "easy"));
  const [cpuState, setCpuState] = useState<CPUState>(level.initialCPU);
  const [stepIndex, setStepIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [levelIndex, setLevelIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("idle");
  const [solved, setSolved] = useState(false);
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);

  const start = useCallback(() => {
    const lv = generateLevel(0, difficulty);
    setLevel(lv);
    setCpuState({ ...lv.initialCPU, memory: [...lv.initialCPU.memory] });
    setStepIndex(0);
    setScore(0);
    setMistakes(0);
    setLevelIndex(0);
    setPhase("playing");
    setSolved(false);
    setFeedback(null);
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
    setCpuState({ ...lv.initialCPU, memory: [...lv.initialCPU.memory] });
    setStepIndex(0);
    setMistakes(0);
    setSolved(false);
    setFeedback(null);
    playSound("levelUp");
  }, [levelIndex, difficulty]);

  const handleAnswer = useCallback(
    (answer: MicroStep) => {
      if (solved || feedback) return;
      const currentStep = level.steps[stepIndex];
      if (!currentStep) return;

      if (answer === currentStep.correctAction) {
        playSound("correct");
        setFeedback("correct");

        // Apply state changes
        setCpuState((prev) => {
          const next = { ...prev, memory: [...prev.memory] };
          const after = currentStep.stateAfter;
          if (after.PC !== undefined) next.PC = after.PC;
          if (after.IR !== undefined) next.IR = after.IR;
          if (after.MAR !== undefined) next.MAR = after.MAR;
          if (after.MDR !== undefined) next.MDR = after.MDR;
          if (after.ACC !== undefined) next.ACC = after.ACC;
          if (after.memory) next.memory = [...after.memory];
          return next;
        });

        setTimeout(() => {
          setFeedback(null);
          const nextStep = stepIndex + 1;
          if (nextStep >= level.steps.length) {
            // Level complete
            const levelScore = Math.max(1, (level.steps.length - mistakes) * (levelIndex + 1));
            setScore((prev) => prev + levelScore);
            setSolved(true);
            playSound("levelUp");
          } else {
            setStepIndex(nextStep);
          }
        }, 400);
      } else {
        playSound("wrong");
        setFeedback("wrong");
        setMistakes((m) => m + 1);
        setTimeout(() => setFeedback(null), 500);
      }
    },
    [solved, feedback, level, stepIndex, mistakes, levelIndex]
  );

  const handleDifficulty = (d: Difficulty) => {
    setDifficulty(d);
    saveDifficulty(GAME_ID, d);
  };

  // Keyboard
  useEffect(() => {
    if (phase !== "playing") return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Enter" && solved) {
        e.preventDefault();
        nextLevel();
        return;
      }
      if (feedback) return;
      const currentStep = level.steps[stepIndex];
      if (!currentStep) return;
      const key = parseInt(e.key, 10);
      if (key >= 1 && key <= currentStep.options.length) {
        e.preventDefault();
        handleAnswer(currentStep.options[key - 1]);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [phase, solved, feedback, level, stepIndex, handleAnswer, nextLevel]);

  useEffect(() => {
    if (phase !== "idle") return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Enter") start();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [phase, start]);

  const currentStep = level.steps[stepIndex];
  const maxLevel = getLevelCount(difficulty);
  const allDone = solved && levelIndex >= maxLevel - 1;
  const progress = level.steps.length > 0 ? Math.round((stepIndex / level.steps.length) * 100) : 0;

  const REG_NAMES: (keyof Omit<CPUState, "memory">)[] = ["PC", "IR", "MAR", "MDR", "ACC"];

  return (
    <GameShell
      gameId={GAME_ID}
      title="Clockwork Computer"
      score={score}
      onRestart={start}
      instructions="Step through the CPU cycle! At each micro-step, choose the correct action. The CPU fetches, decodes, and executes instructions. Keys 1-4 to choose, Enter to advance."
      difficulty={difficulty}
      flash={feedback}
    >
      {phase === "idle" && (
        <div className="flex flex-col items-center gap-4 py-12">
          <p className="text-gray-500">Step through the CPU fetch-decode-execute cycle!</p>
          <DifficultySelector difficulty={difficulty} onChange={handleDifficulty} />
          <p className="text-sm text-gray-400">
            {difficulty === "easy" && "1 instruction — learn the basic cycle"}
            {difficulty === "medium" && "2-3 instructions — multi-step programs"}
            {difficulty === "hard" && "3-4 instructions — subtraction and more"}
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
        <div className="flex flex-col items-center gap-4 py-4">
          {/* Level info */}
          <div className="flex items-center gap-3">
            <span className="rounded-full bg-cyan-100 px-3 py-1 text-xs font-medium text-cyan-700">
              Level {levelIndex + 1}/{maxLevel}
            </span>
            <span className="text-sm font-semibold text-gray-900">{level.title}</span>
          </div>
          <p className="max-w-md text-center text-xs text-gray-500">{level.description}</p>

          {/* Progress bar */}
          <div className="w-full max-w-xs">
            <div className="h-2 rounded-full bg-gray-200">
              <div
                className="h-2 rounded-full bg-cyan-500 transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="mt-1 text-center text-[10px] text-gray-400">
              Step {stepIndex + 1} / {level.steps.length}
            </p>
          </div>

          {/* CPU Registers */}
          <div className="flex flex-wrap justify-center gap-2">
            {REG_NAMES.map((name) => (
              <div
                key={name}
                className="flex flex-col items-center rounded-lg border border-gray-200 bg-white px-3 py-2"
              >
                <span className="text-[10px] font-medium text-gray-400">{name}</span>
                <span className="text-lg font-bold text-gray-900">{cpuState[name]}</span>
              </div>
            ))}
          </div>

          {/* Memory */}
          <div className="flex flex-col items-center gap-1">
            <span className="text-[10px] font-medium text-gray-400">Memory</span>
            <div className="flex gap-1">
              {cpuState.memory.map((val, i) => (
                <div
                  key={i}
                  className={`flex flex-col items-center rounded border px-1.5 py-1 text-[10px] ${
                    i === cpuState.MAR
                      ? "border-cyan-400 bg-cyan-50"
                      : "border-gray-200 bg-white"
                  }`}
                >
                  <span className="text-gray-400">[{i}]</span>
                  <span className="font-bold text-gray-700">{val}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Current step question */}
          {!solved && currentStep && (
            <div className="flex flex-col items-center gap-3">
              <p className="text-sm text-gray-600">{currentStep.description}</p>

              {feedback === "correct" && (
                <p className="text-sm font-medium text-green-600">Correct!</p>
              )}
              {feedback === "wrong" && (
                <p className="text-sm font-medium text-red-500">Try again!</p>
              )}

              <p className="text-sm font-medium text-gray-700">What happens next?</p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {currentStep.options.map((opt, i) => (
                  <button
                    key={opt}
                    onClick={() => handleAnswer(opt)}
                    disabled={!!feedback}
                    className="rounded-lg border-2 border-gray-200 bg-white px-4 py-2 text-left text-sm text-gray-900 transition-all hover:border-cyan-400 hover:bg-cyan-50 disabled:opacity-60"
                  >
                    <span className="text-xs text-gray-400">{i + 1}. </span>
                    {MICRO_STEP_LABELS[opt]}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Solved */}
          {solved && (
            <div className="flex flex-col items-center gap-2">
              <p className="text-lg font-bold text-green-600">Program complete!</p>
              <p className="text-sm text-gray-500">
                {mistakes === 0 ? "Perfect!" : `${mistakes} mistake${mistakes > 1 ? "s" : ""}`}
              </p>
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
