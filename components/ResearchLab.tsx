"use client";

import { useState, useEffect } from "react";
import MiniGameOverlay from "@/components/MiniGameOverlay";
import {
  type LabState,
  type EquipmentId,
  EQUIPMENT_CATEGORIES,
  getEquipmentInfo,
  getResearchCost,
  getResearchDuration,
  getRushCost,
  getResearchTimeRemaining,
  getResearchProgress,
  isResearchComplete,
} from "@/lib/games/memory-quest-economy";

interface ResearchLabProps {
  labState: LabState;
  coins: number;
  onStartResearch: (id: EquipmentId) => void;
  onRushResearch: () => void;
  onCompleteResearch: () => void;
  onClose: () => void;
}

function formatTime(ms: number): string {
  const totalSec = Math.ceil(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  if (m >= 60) {
    const h = Math.floor(m / 60);
    const rm = m % 60;
    return `${h}h ${rm}m`;
  }
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function ResearchLab({
  labState,
  coins,
  onStartResearch,
  onRushResearch,
  onCompleteResearch,
  onClose,
}: ResearchLabProps) {
  const [selected, setSelected] = useState<EquipmentId | null>(null);
  const [, setTick] = useState(0);

  // Tick every second to update progress bar and timer
  useEffect(() => {
    if (!labState.research.activeResearch) return;
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [labState.research.activeResearch]);

  // Auto-complete when research finishes
  useEffect(() => {
    if (isResearchComplete(labState)) {
      onCompleteResearch();
    }
  }, [labState, onCompleteResearch]);

  const activeId = labState.research.activeResearch;
  const remaining = getResearchTimeRemaining(labState);
  const progress = getResearchProgress(labState);
  const rushCost = activeId ? getRushCost(remaining) : 0;

  return (
    <MiniGameOverlay onClose={onClose}>
      <div className="text-center">
        <p className="mb-1 text-lg font-bold text-purple-300">🧪 Research Lab</p>

        {/* Active Research */}
        {activeId && remaining > 0 && (() => {
          const info = getEquipmentInfo(activeId, labState.levels[activeId] + 1);
          return (
            <div className="mb-4 rounded-2xl bg-purple-500/10 border border-purple-500/20 p-3">
              <div className="flex items-center justify-center gap-2 mb-2">
                <span className="text-2xl animate-research-bubble">{info.emoji}</span>
                <div className="text-left">
                  <p className="text-sm font-bold text-purple-300">Researching: {info.name}</p>
                  <p className="text-xs text-gray-400">Lv. {labState.levels[activeId]} → {labState.levels[activeId] + 1}</p>
                </div>
              </div>
              {/* Progress bar */}
              <div className="relative h-3 w-full rounded-full bg-white/10 overflow-hidden mb-2">
                <div
                  className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 animate-research-progress transition-all duration-1000"
                  style={{ width: `${Math.min(100, progress * 100)}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-400">{Math.round(progress * 100)}%</span>
                <span className="text-purple-300 font-mono">{formatTime(remaining)}</span>
              </div>
              <button
                onClick={onRushResearch}
                disabled={coins < rushCost}
                className={`mt-2 w-full rounded-xl py-2 text-sm font-bold transition ${
                  coins >= rushCost
                    ? "gradient-btn animate-shimmer text-white"
                    : "cursor-not-allowed bg-gray-700 text-gray-400"
                }`}
              >
                {coins >= rushCost ? `Rush — 🪙 ${rushCost.toLocaleString()}` : `Need 🪙 ${rushCost.toLocaleString()}`}
              </button>
            </div>
          );
        })()}

        {/* Equipment Grid */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          {EQUIPMENT_CATEGORIES.map((cat) => {
            const level = labState.levels[cat.id];
            const isActive = activeId === cat.id;
            const isSelected = selected === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelected(isSelected ? null : cat.id)}
                className={`rounded-xl p-2.5 transition-all border ${
                  isActive
                    ? "border-purple-400/50 bg-purple-500/20 animate-research-bubble"
                    : isSelected
                    ? "border-purple-400/40 bg-purple-500/15 scale-105"
                    : "border-white/10 bg-white/5 hover:bg-white/10"
                }`}
              >
                <span className="text-2xl block">{cat.emoji}</span>
                <p className="text-xs font-bold text-gray-200 mt-1">{cat.name}</p>
                <p className="text-[10px] text-gray-400">Lv. {level}</p>
                {level > 0 && (
                  <p className="text-[10px] text-purple-300 mt-0.5">{cat.bonusLabel(level)}</p>
                )}
              </button>
            );
          })}
        </div>

        {/* Selected Equipment Detail */}
        {selected && !activeId && (() => {
          const level = labState.levels[selected];
          const nextLevel = level + 1;
          const cat = EQUIPMENT_CATEGORIES.find((c) => c.id === selected)!;
          const info = getEquipmentInfo(selected, nextLevel);
          const cost = getResearchCost(nextLevel);
          const duration = getResearchDuration(nextLevel);
          const canAfford = coins >= cost;
          return (
            <div className="animate-bounce-in rounded-2xl bg-white/5 border border-white/10 p-3">
              <div className="flex items-center justify-center gap-3 mb-2">
                <span className="text-3xl">{info.emoji}</span>
                <div className="text-left">
                  <p className="font-bold text-purple-300">{info.name}</p>
                  <p className="text-xs text-gray-400">
                    {cat.bonusLabel(level)} → <span className="text-purple-300">{cat.bonusLabel(nextLevel)}</span>
                  </p>
                </div>
              </div>
              <div className="flex justify-center gap-4 mb-2 text-xs text-gray-400">
                <span>⏱️ {formatTime(duration)}</span>
                <span>🪙 {cost.toLocaleString()}</span>
              </div>
              <button
                onClick={() => onStartResearch(selected)}
                disabled={!canAfford}
                className={`w-full rounded-xl py-2.5 font-bold text-white transition ${
                  canAfford
                    ? "gradient-btn animate-shimmer"
                    : "cursor-not-allowed bg-gray-700 text-gray-400"
                }`}
              >
                {canAfford ? "Start Research" : "Not enough coins"}
              </button>
            </div>
          );
        })()}

        {/* Hint when research active and user selects something */}
        {selected && activeId && activeId !== selected && (
          <p className="text-xs text-gray-500 mt-2">Finish current research first</p>
        )}
      </div>
    </MiniGameOverlay>
  );
}
