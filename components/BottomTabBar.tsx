"use client";

type TabId = "home" | "play" | "achievements";

interface BottomTabBarProps {
  activeTab: TabId;
  gameInProgress: boolean;
  onNavigate: (tab: TabId) => void;
}

const TABS: { id: TabId; label: string; emoji: string }[] = [
  { id: "home", label: "Home", emoji: "🏠" },
  { id: "play", label: "Play", emoji: "🎮" },
  { id: "achievements", label: "Awards", emoji: "🏆" },
];

export default function BottomTabBar({ activeTab, gameInProgress, onNavigate }: BottomTabBarProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t-2 border-gold-premium/30 panel-dark-strong safe-bottom">
      <div className="mx-auto flex max-w-5xl">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onNavigate(tab.id)}
              className={`flex flex-1 flex-col items-center gap-0.5 py-3 transition-all active:scale-90 ${
                isActive
                  ? "text-gold-bright"
                  : "text-gray-400 hover:text-gray-200"
              }`}
            >
              <span className={`text-2xl transition-transform ${isActive ? "scale-110" : ""}`}>
                {tab.emoji}
              </span>
              <span className={`text-xs font-semibold ${isActive ? "text-gold-bright" : ""}`}>
                {tab.id === "play" && gameInProgress ? "Resume" : tab.label}
              </span>
              {isActive && (
                <div className="tab-active-dot mt-0.5" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
