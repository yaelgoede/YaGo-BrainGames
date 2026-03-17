"use client";

import { useState } from "react";
import type { LabState, StarPathLevel } from "@/lib/games/memory-quest-economy";
import { getTotalLabLevel, getResearchProgress } from "@/lib/games/memory-quest-economy";
import MiniGameOverlay from "@/components/MiniGameOverlay";

interface FloatingUpgradeButtonsProps {
  labState: LabState;
  starPathLevel: number;
  nextStarPath: StarPathLevel;
  starPathBonusSummary: { emoji: string; label: string }[];
  canAffordStarPath: boolean;
  onOpenLab: () => void;
  onPurchaseStarPath: () => void;
}

export default function FloatingUpgradeButtons({
  labState,
  starPathLevel,
  nextStarPath,
  starPathBonusSummary,
  canAffordStarPath,
  onOpenLab,
  onPurchaseStarPath,
}: FloatingUpgradeButtonsProps) {
  const [showStarPath, setShowStarPath] = useState(false);
  const isResearching = !!labState.research.activeResearch;
  const totalLabLevel = getTotalLabLevel(labState);
  const progress = isResearching ? getResearchProgress(labState) : 0;

  return (
    <>
      <div className="fixed left-4 bottom-28 z-20 flex flex-col gap-3">
        {/* Star Path Button */}
        <button
          onClick={() => setShowStarPath(true)}
          className={`animate-fab-enter flex h-16 w-16 flex-col items-center justify-center rounded-full shadow-lg transition-all ${
            canAffordStarPath
              ? "animate-fab-pulse border-2 border-yellow-500/50 bg-navy-800/95 backdrop-blur-md hover:scale-110"
              : "border border-white/10 bg-navy-800/60 backdrop-blur-md hover:scale-105"
          }`}
          title={`Star Path (Lv. ${starPathLevel})`}
        >
          <span className="text-2xl leading-none">⭐</span>
          <span className={`text-[11px] font-bold leading-none ${canAffordStarPath ? "text-yellow-300" : "text-gray-400"}`}>
            Lv.{starPathLevel}
          </span>
        </button>

        {/* Lab Button with research progress ring */}
        <button
          onClick={onOpenLab}
          className={`animate-fab-enter relative flex h-16 w-16 flex-col items-center justify-center rounded-full shadow-lg transition-all ${
            isResearching
              ? "animate-fab-pulse border-2 border-purple-400/50 bg-navy-800/95 backdrop-blur-md hover:scale-110"
              : "border border-white/10 bg-navy-800/60 backdrop-blur-md hover:scale-105"
          }`}
          style={{ animationDelay: "100ms" }}
          title={`Research Lab (Lv. ${totalLabLevel})`}
        >
          {/* Progress ring overlay */}
          {isResearching && (
            <svg className="absolute inset-0 -rotate-90" viewBox="0 0 64 64">
              <circle
                cx="32" cy="32" r="29"
                fill="none"
                stroke="rgba(168, 85, 247, 0.3)"
                strokeWidth="3"
              />
              <circle
                cx="32" cy="32" r="29"
                fill="none"
                stroke="rgba(168, 85, 247, 0.8)"
                strokeWidth="3"
                strokeDasharray={`${progress * 182} 182`}
                strokeLinecap="round"
                className="transition-all duration-1000"
              />
            </svg>
          )}
          <span className="text-2xl leading-none">🧪</span>
          <span className={`text-[11px] font-bold leading-none ${isResearching ? "text-purple-300" : "text-gray-400"}`}>
            Lv.{totalLabLevel}
          </span>
        </button>
      </div>

      {showStarPath && (
        <MiniGameOverlay onClose={() => setShowStarPath(false)}>
          <div className="text-center">
            <p className="mb-1 text-lg font-bold text-yellow-300">Star Path</p>
            <p className="mb-3 text-sm text-gray-400">Level {starPathLevel}</p>
            <div className="mb-3 flex items-center justify-center gap-3">
              <span className="text-4xl">{nextStarPath.emoji}</span>
              <div className="text-left">
                <p className="font-bold text-yellow-200">{nextStarPath.name}</p>
                <p className="text-sm text-gray-400">{nextStarPath.bonusLabel}</p>
                <p className="text-sm text-yellow-300 text-glow-gold">🪙 {nextStarPath.cost.toLocaleString()}</p>
              </div>
            </div>
            {starPathBonusSummary.length > 0 && (
              <div className="mb-3 flex flex-wrap justify-center gap-2">
                {starPathBonusSummary.map((b, i) => (
                  <span key={i} className="rounded-lg bg-white/5 px-2 py-1 text-xs text-gray-300">
                    {b.emoji} {b.label}
                  </span>
                ))}
              </div>
            )}
            <button
              onClick={() => { onPurchaseStarPath(); }}
              disabled={!canAffordStarPath}
              className={`w-full rounded-xl py-2.5 font-bold text-white transition ${
                canAffordStarPath
                  ? "gradient-btn-gold animate-shimmer"
                  : "cursor-not-allowed bg-gray-700 text-gray-400"
              }`}
            >
              {canAffordStarPath ? "Purchase" : "Not enough coins"}
            </button>
          </div>
        </MiniGameOverlay>
      )}
    </>
  );
}
