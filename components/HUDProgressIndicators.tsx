"use client";

import type { PlayerStats } from "@/lib/games/memory-quest-economy";
import { WHEEL_TRIGGER_EVERY, getClosestMilestone, getMilestoneProgress } from "@/lib/games/memory-quest-economy";

interface HUDProgressIndicatorsProps {
  eventClears: number;
  stats: PlayerStats;
  achievedMilestones: string[];
}

export default function HUDProgressIndicators({
  eventClears,
  stats,
  achievedMilestones,
}: HUDProgressIndicatorsProps) {
  const boardsUntilWheel = WHEEL_TRIGGER_EVERY - (eventClears % WHEEL_TRIGGER_EVERY);
  const nextMilestone = getClosestMilestone(stats, achievedMilestones);
  const milestoneProgress = nextMilestone ? getMilestoneProgress(nextMilestone, stats) : 0;

  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      {/* Wheel countdown */}
      <div
        className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold ${
          boardsUntilWheel === 1
            ? "animate-glow-gold border border-gold-500/40 bg-gold-500/10 text-gold-bright"
            : "bg-purple-500/15 border border-purple-500/20 text-purple-300"
        }`}
      >
        <span>🎡</span>
        <span>Wheel in {boardsUntilWheel} {boardsUntilWheel === 1 ? "board" : "boards"}</span>
      </div>

      {/* Next milestone */}
      {nextMilestone && (
        <div className="flex items-center gap-1.5 rounded-full bg-white/5 border border-white/10 px-2.5 py-1 text-[10px] text-gray-400">
          <span>🏆</span>
          <span className="max-w-[120px] truncate">{nextMilestone.description}</span>
          <div className="h-1 w-10 overflow-hidden rounded-full bg-black/40">
            <div
              className="h-full rounded-full"
              style={{
                width: `${milestoneProgress * 100}%`,
                background: "linear-gradient(90deg, #7c3aed, #FFD700)",
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
