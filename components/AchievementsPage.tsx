"use client";

import type { PlayerStats } from "@/lib/games/memory-quest-economy";
import { getMilestonesByCategory, getMilestoneProgress } from "@/lib/games/memory-quest-economy";

interface AchievementsPageProps {
  stats: PlayerStats;
  achievedMilestones: string[];
}

const CATEGORY_META: Record<keyof PlayerStats, { label: string; emoji: string }> = {
  totalMatches: { label: "Matches", emoji: "🃏" },
  totalBoardsCleared: { label: "Boards Cleared", emoji: "🗺️" },
  highestCombo: { label: "Combos", emoji: "🔥" },
  highestRound: { label: "Rounds", emoji: "🏔️" },
  totalCoinsEarned: { label: "Lifetime Coins", emoji: "💰" },
};

const CATEGORY_ORDER: (keyof PlayerStats)[] = [
  "totalMatches", "totalBoardsCleared", "highestCombo", "highestRound", "totalCoinsEarned",
];

export default function AchievementsPage({ stats, achievedMilestones }: AchievementsPageProps) {
  const categories = getMilestonesByCategory();
  const achievedSet = new Set(achievedMilestones);

  return (
    <div className="animate-bounce-in flex flex-col gap-5 pb-4">
      <div className="text-center">
        <h2 className="gradient-gold text-glow-gold text-2xl font-extrabold">🏆 Achievements</h2>
        <p className="mt-1 text-sm text-gray-400">
          {achievedMilestones.length} unlocked
        </p>
      </div>

      <div className="flex flex-col gap-4 overflow-y-auto" style={{ maxHeight: "calc(100vh - 240px)" }}>
        {CATEGORY_ORDER.map((statKey) => {
          const meta = CATEGORY_META[statKey];
          const milestones = categories[statKey];
          if (!milestones.length) return null;

          return (
            <div key={statKey} className="rounded-2xl panel-dark p-4">
              <div className="mb-3 flex items-center gap-2">
                <span className="text-xl">{meta.emoji}</span>
                <h3 className="font-bold text-purple-300">{meta.label}</h3>
                <span className="ml-auto text-xs text-gray-400">
                  {milestones.filter((m) => achievedSet.has(m.id)).length}/{milestones.length}
                </span>
              </div>

              <div className="flex flex-col gap-2">
                {milestones.map((m) => {
                  const achieved = achievedSet.has(m.id);
                  const progress = getMilestoneProgress(m, stats);

                  return (
                    <div
                      key={m.id}
                      className={`flex items-center gap-3 rounded-xl px-3 py-2 ${
                        achieved ? "bg-gold-500/10 border border-gold-500/20" : "bg-white/5"
                      }`}
                    >
                      {/* Status icon */}
                      <span className="text-sm">
                        {achieved ? "✅" : "🔒"}
                      </span>

                      {/* Description + progress */}
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium ${achieved ? "text-yellow-300" : "text-gray-300"}`}>
                          {m.description}
                        </p>
                        {!achieved && (
                          <div className="mt-1 flex items-center gap-2">
                            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-black/40">
                              <div
                                className="h-full rounded-full animate-progress-fill"
                                style={{
                                  width: `${progress * 100}%`,
                                  background: "linear-gradient(90deg, #7c3aed, #FFD700)",
                                }}
                              />
                            </div>
                            <span className="text-[10px] text-gray-500 text-number-bold whitespace-nowrap">
                              {stats[m.stat].toLocaleString()}/{m.threshold.toLocaleString()}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Reward badge */}
                      <div className="flex flex-col items-end text-[10px]">
                        {m.reward.coins > 0 && (
                          <span className={achieved ? "text-yellow-300/50" : "text-yellow-300"}>
                            🪙 {m.reward.coins.toLocaleString()}
                          </span>
                        )}
                        {m.reward.energy > 0 && (
                          <span className={achieved ? "text-blue-300/50" : "text-blue-300"}>
                            ⚡ {m.reward.energy}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
