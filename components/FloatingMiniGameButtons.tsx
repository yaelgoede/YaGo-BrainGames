"use client";

import type { ShopGameType } from "@/lib/games/memory-quest-shop";
import { SHOP_ITEMS, canAffordShopItem } from "@/lib/games/memory-quest-shop";

interface FloatingMiniGameButtonsProps {
  coins: number;
  onOpenMiniGame: (gameType: ShopGameType) => void;
}

export default function FloatingMiniGameButtons({ coins, onOpenMiniGame }: FloatingMiniGameButtonsProps) {
  return (
    <div className="fixed right-3 bottom-24 z-20 flex flex-col gap-2">
      {SHOP_ITEMS.map((item, i) => {
        const affordable = canAffordShopItem(coins, item);
        return (
          <button
            key={item.id}
            onClick={() => affordable && onOpenMiniGame(item.id)}
            disabled={!affordable}
            className={`animate-fab-enter flex h-12 w-12 flex-col items-center justify-center rounded-full shadow-lg transition-all ${
              affordable
                ? "animate-fab-pulse border-2 border-purple-500/50 bg-navy-800/95 backdrop-blur-md hover:scale-110"
                : "cursor-not-allowed border border-white/10 bg-navy-800/60 opacity-40 grayscale"
            }`}
            style={{ animationDelay: `${i * 100}ms` }}
            title={`${item.name} (${item.cost} coins)`}
          >
            <span className="text-lg leading-none">{item.emoji}</span>
            <span className={`text-[8px] font-bold leading-none ${affordable ? "text-yellow-300" : "text-gray-500"}`}>
              {item.cost}
            </span>
          </button>
        );
      })}
    </div>
  );
}
