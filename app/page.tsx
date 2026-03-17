"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import {
  type EnergyState,
  type PlayerStats,
  type Milestone,
  MAX_ENERGY,
  ENERGY_REGEN_MS,
  loadEnergy,
  saveEnergy,
  computeRegenerated,
  spendEnergy,
  addEnergy,
  loadCoins,
  saveCoins,
  loadLabLevel,
  saveLabLevel,
  getUpgrade,
  canAffordUpgrade,
  purchaseUpgrade,
  loadStats,
  saveStats,
  loadMilestones,
  saveMilestones,
  checkNewMilestones,
  calculateMatchReward,
  calculateBoardClearReward,
  loadHighScore,
  saveHighScore,
  WHEEL_TRIGGER_EVERY,
  loadEventClears,
  saveEventClears,
  LOW_ENERGY_THRESHOLD,
  calculateStreakBonus,
  shouldTriggerSafetyNet,
  calculateSafetyNetGift,
  loadSecondWindTimestamp,
  saveSecondWindTimestamp,
  isSecondWindAvailable,
  getSecondWindCooldownRemaining,
  loadStarRank,
  saveStarRank,
} from "@/lib/games/memory-quest-economy";
import {
  type QuestCard,
  getBoardConfig,
  createQuestBoard,
  getMatchSize,
  isAllMatched,
} from "@/lib/games/memory-quest";
import {
  WHEEL_SEGMENTS,
  SEGMENT_ANGLE,
  spinWheel,
} from "@/lib/games/memory-quest-events";
import {
  type TimedEvent,
  type ScratchCell,
  type ScratchPrize,
  loadTimedEvent,
  saveTimedEvent,
  isEventExpired,
  getEventTimeRemaining,
  shouldTriggerEvent,
  createNewEvent,
  endEvent,
  assignCollectibles,
  checkCollectibleEarned,
  generateScratchCard,
  revealCell,
  checkScratchResult,
  calculateScratchPrize,
  isScratchComplete,
  formatTimeRemaining,
  tierLabel,
  TIER_COLORS,
} from "@/lib/games/memory-quest-timed-events";
import { playSound, isMuted, toggleMute } from "@/lib/sounds";
import {
  type ShopGameType,
  type CoinFlipChoice,
  type CoinFlipResult,
  type TreasureChest as TreasureChestType,
  type SlotResult,
  SHOP_ITEMS,
  canAffordShopItem,
  purchaseShopItem,
  playCoinFlip,
  generateTreasureChests,
  openChest,
  generateSlotResult,
  recordShopPurchase,
} from "@/lib/games/memory-quest-shop";
import BottomTabBar from "@/components/BottomTabBar";
import FloatingMiniGameButtons from "@/components/FloatingMiniGameButtons";
import MiniGameOverlay from "@/components/MiniGameOverlay";
import CoinFlipGame from "@/components/CoinFlipGame";
import TreasureChestGame from "@/components/TreasureChestGame";
import SlotMachineGame from "@/components/SlotMachineGame";
import AchievementsPage from "@/components/AchievementsPage";
import HUDProgressIndicators from "@/components/HUDProgressIndicators";

// ── Types ──────────────────────────────────────────────

type Phase = "idle" | "playing" | "board-clear" | "event-wheel" | "event-scratch" | "quit-summary" | "shop" | "shop-coin-flip" | "shop-treasure" | "shop-slots" | "achievements";

interface MilestoneToast {
  key: number;
  milestone: Milestone;
}

interface CoinFloat {
  id: number;
  amount: number;
  x: number;
  y: number;
}

const EMPTY_SET = new Set<number>();

// ── Component ──────────────────────────────────────────

export default function MemoryQuestPage() {
  // Phase
  const [phase, setPhase] = useState<Phase>("idle");

  // Economy (loaded from localStorage)
  const [energy, setEnergy] = useState<EnergyState>(() => ({ amount: MAX_ENERGY, lastUpdated: Date.now() }));
  const [coins, setCoins] = useState(0);
  const [labLevel, setLabLevel] = useState(0);
  const [stats, setStats] = useState<PlayerStats>({
    totalMatches: 0, totalBoardsCleared: 0, highestCombo: 0, totalCoinsEarned: 0, highestRound: 0, totalPrestiges: 0,
  });
  const [achievedMilestones, setAchievedMilestones] = useState<string[]>([]);
  const [highScore, setHighScore] = useState(0);
  const [starRank, setStarRank] = useState(0);
  const [timeToNextEnergy, setTimeToNextEnergy] = useState(0);

  // Game state
  const [round, setRound] = useState(1);
  const [cards, setCards] = useState<QuestCard[]>([]);
  const [flippedIndices, setFlippedIndices] = useState<number[]>([]);
  const [locked, setLocked] = useState(false);
  const [combo, setCombo] = useState(0);
  const [sessionScore, setSessionScore] = useState(0);
  const [sessionCoins, setSessionCoins] = useState(0);
  const [boardCoins, setBoardCoins] = useState(0);

  // UI state
  const [focusedIndex, setFocusedIndex] = useState(0);
  const [showHelp, setShowHelp] = useState(false);
  const [showLab, setShowLab] = useState(false);
  const [muted, setMuted] = useState(false);
  const [comboAnim, setComboAnim] = useState(false);
  const [coinFloats, setCoinFloats] = useState<CoinFloat[]>([]);
  const [milestoneToasts, setMilestoneToasts] = useState<MilestoneToast[]>([]);
  const milestoneToastId = useRef(0);
  const [boardEntering, setBoardEntering] = useState(false);
  const [boardClearing, setBoardClearing] = useState(false);
  const [matchedIds, setMatchedIds] = useState<Set<number>>(new Set());
  const [shakeIds, setShakeIds] = useState<Set<number>>(new Set());
  const [energyFlash, setEnergyFlash] = useState<"drain" | "gain" | null>(null);
  const [coinBump, setCoinBump] = useState(false);
  const [displayedBoardCoins, setDisplayedBoardCoins] = useState(0);
  const prevCoinsRef = useRef(0);
  const [phaseAnimating, setPhaseAnimating] = useState(false);

  // Wheel event state
  const [eventClears, setEventClears] = useState(0);
  const [wheelRotation, setWheelRotation] = useState(0);
  const [wheelSpinning, setWheelSpinning] = useState(false);
  const [wheelResult, setWheelResult] = useState<number | null>(null);
  const [wheelShowResult, setWheelShowResult] = useState(false);
  const wheelTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wheelTickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Timed event & collectible state
  const [timedEvent, setTimedEvent] = useState<TimedEvent | null>(null);
  const [collectibleIndices, setCollectibleIndices] = useState<Set<number>>(EMPTY_SET);
  const [scratchCells, setScratchCells] = useState<ScratchCell[]>([]);
  const [scratchPrize, setScratchPrize] = useState<ScratchPrize | null>(null);
  const [collectibleFloats, setCollectibleFloats] = useState<{ id: number; emoji: string; x: number; y: number }[]>([]);
  const collectibleFloatId = useRef(0);

  // Shop state
  const [coinFlipChoice, setCoinFlipChoice] = useState<CoinFlipChoice | null>(null);
  const [coinFlipResult, setCoinFlipResult] = useState<CoinFlipResult | null>(null);
  const [coinFlipAnimating, setCoinFlipAnimating] = useState(false);
  const [treasureChests, setTreasureChests] = useState<TreasureChestType[]>([]);
  const [treasureOpenedIndex, setTreasureOpenedIndex] = useState<number | null>(null);
  const [slotResult, setSlotResult] = useState<SlotResult | null>(null);
  const [slotSpinning, setSlotSpinning] = useState(false);
  const [slotReelsStopped, setSlotReelsStopped] = useState([false, false, false]);
  const coinFlipTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const slotTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Energy reward system state
  const [sessionBoardsCleared, setSessionBoardsCleared] = useState(0);
  const [boardsSinceLastSafetyNet, setBoardsSinceLastSafetyNet] = useState(0);
  const [safetyNetGift, setSafetyNetGift] = useState<number | null>(null);
  const [showSecondWind, setShowSecondWind] = useState(false);
  const [lastSecondWindTime, setLastSecondWindTime] = useState(0);
  const [energyFlyup, setEnergyFlyup] = useState<number | null>(null);
  const [streakToast, setStreakToast] = useState<number | null>(null);

  // Mini-game overlay (plays ON TOP of game board without changing phase)
  const [miniGameOverlay, setMiniGameOverlay] = useState<ShopGameType | null>(null);

  // Saved game phase for tab navigation (resume game when tapping Play tab)
  const savedGamePhase = useRef<Phase | null>(null);

  // Refs
  const flipBackTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const energyTickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const boardClearTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const coinFloatId = useRef(0);
  const gridRef = useRef<HTMLDivElement>(null);

  // ── Init from localStorage ───────────────────────────

  useEffect(() => {
    setEnergy(loadEnergy());
    setCoins(loadCoins());
    setLabLevel(loadLabLevel());
    setStats(loadStats());
    setAchievedMilestones(loadMilestones());
    setHighScore(loadHighScore());
    setStarRank(loadStarRank());
    setMuted(isMuted());
    setEventClears(loadEventClears());

    // Load timed event, check if expired
    const saved = loadTimedEvent();
    if (saved) {
      if (isEventExpired(saved)) {
        endEvent();
      } else if (!saved.rewardClaimed) {
        setTimedEvent(saved);
      }
    }
  }, []);

  // ── Energy regen tick + countdown timer ───────────────

  const energyRef = useRef(energy);
  energyRef.current = energy;
  const timedEventRef = useRef(timedEvent);
  timedEventRef.current = timedEvent;

  useEffect(() => {
    const tick = () => {
      const prev = energyRef.current;
      const updated = computeRegenerated(prev);
      if (updated.amount !== prev.amount) {
        saveEnergy(updated);
        setEnergy(updated);
      }
      const nextEnergySec = updated.amount < MAX_ENERGY
        ? Math.max(0, Math.ceil((updated.lastUpdated + ENERGY_REGEN_MS - Date.now()) / 1000))
        : 0;
      setTimeToNextEnergy((prev) => (prev === nextEnergySec ? prev : nextEnergySec));

      // Timed event expiry check
      const evt = timedEventRef.current;
      if (evt && !evt.completed && isEventExpired(evt)) {
        setTimedEvent(null);
        setCollectibleIndices(EMPTY_SET);
        endEvent();
      }
    };
    tick();
    energyTickRef.current = setInterval(tick, 1000);
    return () => {
      if (energyTickRef.current) clearInterval(energyTickRef.current);
    };
  }, []);

  // ── Cleanup timeouts on unmount ──────────────────────

  useEffect(() => {
    return () => {
      if (flipBackTimeout.current) clearTimeout(flipBackTimeout.current);
      if (boardClearTimeout.current) clearTimeout(boardClearTimeout.current);
      if (wheelTimeoutRef.current) clearTimeout(wheelTimeoutRef.current);
      if (wheelTickRef.current) clearInterval(wheelTickRef.current);
    };
  }, []);

  // ── Phase enter animation ───────────────────────────

  useEffect(() => {
    setPhaseAnimating(true);
    const t = setTimeout(() => setPhaseAnimating(false), 300);
    return () => clearTimeout(t);
  }, [phase]);

  // ── Coin bump effect ────────────────────────────────

  useEffect(() => {
    if (coins > prevCoinsRef.current && prevCoinsRef.current > 0) {
      setCoinBump(true);
      const t = setTimeout(() => setCoinBump(false), 300);
      return () => clearTimeout(t);
    }
    prevCoinsRef.current = coins;
  }, [coins]);

  // ── Board clear coin counter animation ─────────────

  useEffect(() => {
    if (phase !== "board-clear") {
      setDisplayedBoardCoins(0);
      return;
    }
    if (boardCoins <= 0) return;
    const steps = Math.min(boardCoins, 20);
    const stepSize = Math.ceil(boardCoins / steps);
    const interval = Math.floor(800 / steps);
    let current = 0;
    const id = setInterval(() => {
      current = Math.min(current + stepSize, boardCoins);
      setDisplayedBoardCoins(current);
      if (current >= boardCoins) clearInterval(id);
    }, interval);
    return () => clearInterval(id);
  }, [phase, boardCoins]);

  // ── Helpers ──────────────────────────────────────────

  const config = getBoardConfig(round);
  const matchSize = getMatchSize(round);
  const currentUpgrade = getUpgrade(labLevel);
  const nextUpgrade = getUpgrade(labLevel + 1);

  // Derived state (no useState needed)
  const pendingScratchCard = timedEvent !== null && timedEvent.completed && !timedEvent.rewardClaimed;
  const scratchFinished = scratchPrize !== null || (scratchCells.length > 0 && isScratchComplete(scratchCells));
  const eventTimeRemaining = timedEvent && !timedEvent.completed ? getEventTimeRemaining(timedEvent) : 0;

  // Derived: is a game currently in progress?
  const gameInProgress = phase === "playing" || phase === "board-clear" || phase === "event-wheel" || phase === "event-scratch";

  // Derived: active tab for bottom nav
  const activeTab = phase === "achievements" ? "achievements" as const
    : phase === "shop" || phase === "shop-coin-flip" || phase === "shop-treasure" || phase === "shop-slots" ? "shop" as const
    : gameInProgress ? "play" as const
    : "home" as const;

  const addCoinFloat = useCallback((amount: number, cardIdx: number) => {
    const grid = gridRef.current;
    if (!grid) return;
    const cardEl = grid.children[cardIdx] as HTMLElement | undefined;
    if (!cardEl) return;
    const rect = cardEl.getBoundingClientRect();
    const gridRect = grid.getBoundingClientRect();
    const id = ++coinFloatId.current;
    setCoinFloats((prev) => [
      ...prev,
      { id, amount, x: rect.left - gridRect.left + rect.width / 2, y: rect.top - gridRect.top },
    ]);
    setTimeout(() => setCoinFloats((prev) => prev.filter((f) => f.id !== id)), 800);
  }, []);

  const addCollectibleFloat = useCallback((emoji: string, cardIdx: number) => {
    const grid = gridRef.current;
    if (!grid) return;
    const cardEl = grid.children[cardIdx] as HTMLElement | undefined;
    if (!cardEl) return;
    const rect = cardEl.getBoundingClientRect();
    const gridRect = grid.getBoundingClientRect();
    const id = ++collectibleFloatId.current;
    setCollectibleFloats((prev) => [
      ...prev,
      { id, emoji, x: rect.left - gridRect.left + rect.width / 2, y: rect.top - gridRect.top },
    ]);
    setTimeout(() => setCollectibleFloats((prev) => prev.filter((f) => f.id !== id)), 1000);
  }, []);

  const showMilestoneToast = useCallback((milestone: Milestone) => {
    const key = ++milestoneToastId.current;
    setMilestoneToasts((prev) => [...prev, { key, milestone }]);
    setTimeout(() => setMilestoneToasts((prev) => prev.filter((t) => t.key !== key)), 3200);
  }, []);

  // ── Advance to Next Round helper ─────────────────────

  const advanceToNextRound = useCallback((nextRound: number) => {
    const newCards = createQuestBoard(nextRound);
    setRound(nextRound);
    setCards(newCards);
    setFlippedIndices([]);
    setBoardCoins(0);
    setFocusedIndex(0);
    setBoardEntering(true);
    setPhase("playing");
    setTimeout(() => setBoardEntering(false), 600);

    // Assign collectibles if event active
    const evt = timedEventRef.current;
    if (evt && !evt.completed && !isEventExpired(evt)) {
      setCollectibleIndices(assignCollectibles(newCards.length));
    } else {
      setCollectibleIndices(EMPTY_SET);
    }
  }, []);

  // ── Start Game ───────────────────────────────────────

  const start = useCallback(() => {
    const newRound = 1;
    setPhase("playing");
    setRound(newRound);
    const newCards = createQuestBoard(newRound);
    setCards(newCards);
    setFlippedIndices([]);
    setCombo(0);
    setSessionScore(0);
    setSessionCoins(0);
    setBoardCoins(0);
    setFocusedIndex(0);
    setLocked(false);
    setMatchedIds(new Set());
    setShakeIds(new Set());
    setSessionBoardsCleared(0);
    setBoardsSinceLastSafetyNet(0);
    setSafetyNetGift(null);
    setLastSecondWindTime(loadSecondWindTimestamp());

    setBoardEntering(true);
    setTimeout(() => setBoardEntering(false), 600);
    playSound("click");

    // Check for timed event
    let currentEvent = timedEventRef.current;
    if (!currentEvent && shouldTriggerEvent()) {
      currentEvent = createNewEvent();
      saveTimedEvent(currentEvent);
      setTimedEvent(currentEvent);

      playSound("eventStart");
    }

    // Assign collectibles if event active
    if (currentEvent && !currentEvent.completed && !isEventExpired(currentEvent)) {
      setCollectibleIndices(assignCollectibles(newCards.length));
    } else {
      setCollectibleIndices(EMPTY_SET);
    }
  }, []);

  // ── Card Flip ────────────────────────────────────────

  const handleFlip = useCallback(
    (index: number) => {
      if (locked || phase !== "playing") return;
      const card = cards[index];
      if (card.flipped || card.matched) return;

      // Spend energy
      const newEnergy = spendEnergy(energy, 1);
      if (!newEnergy) {
        // Second Wind: full recharge on 20-minute cooldown
        if (isSecondWindAvailable(lastSecondWindTime)) {
          const now = Date.now();
          setLastSecondWindTime(now);
          saveSecondWindTimestamp(now);
          const revived = addEnergy(energy, MAX_ENERGY - energy.amount);
          setEnergy(revived);
          saveEnergy(revived);
          setShowSecondWind(true);
          playSound("levelUp");
          setTimeout(() => setShowSecondWind(false), 2500);
          return; // Block this flip, player can continue next click
        }
        return; // No energy — block flip, wait for regen
      }
      setEnergy(newEnergy);
      saveEnergy(newEnergy);
      setEnergyFlash("drain");
      setTimeout(() => setEnergyFlash(null), 300);

      // Flip the card
      const newCards = [...cards];
      newCards[index] = { ...card, flipped: true };
      const newFlipped = [...flippedIndices, index];

      setCards(newCards);
      setFlippedIndices(newFlipped);

      // Check match logic
      const flippedEmojis = newFlipped.map((i) => newCards[i].emoji);
      const lastEmoji = card.emoji;

      // Are all flipped cards the same emoji?
      const allSame = flippedEmojis.every((e) => e === lastEmoji);

      if (!allSame) {
        // ── Mismatch ─────────────────────────────────
        setCombo(0);
        playSound("wrong");
        setShakeIds(new Set(newFlipped));
        setLocked(true);
        if (flipBackTimeout.current) clearTimeout(flipBackTimeout.current);
        flipBackTimeout.current = setTimeout(() => {
          setCards((prev) => {
            const c = [...prev];
            for (const fi of newFlipped) {
              if (!c[fi].matched) c[fi] = { ...c[fi], flipped: false };
            }
            return c;
          });
          setFlippedIndices([]);
          setShakeIds(new Set());
          setLocked(false);
        }, 800);
        return;
      }

      if (newFlipped.length < matchSize) {
        // Same emoji but not enough yet — keep flipped, wait for more
        return;
      }

      // ── Match Complete ───────────────────────────────
      const newCombo = combo + 1;
      setCombo(newCombo);
      playSound("correct");

      // Animate combo
      setComboAnim(true);
      setTimeout(() => setComboAnim(false), 300);

      // Mark matched
      for (const fi of newFlipped) {
        newCards[fi] = { ...newCards[fi], matched: true };
      }
      setCards(newCards);
      setMatchedIds((prev) => {
        const s = new Set(prev);
        newFlipped.forEach((fi) => s.add(fi));
        return s;
      });
      setTimeout(() => setMatchedIds((prev) => {
        const s = new Set(prev);
        newFlipped.forEach((fi) => s.delete(fi));
        return s;
      }), 500);
      setFlippedIndices([]);

      // Rewards
      const reward = calculateMatchReward(newCombo, round, starRank);
      const newCoins = coins + reward.coins;
      setCoins(newCoins);
      saveCoins(newCoins);
      setSessionCoins((sc) => sc + reward.coins);
      setBoardCoins((bc) => bc + reward.coins);
      addCoinFloat(reward.coins, index);

      // Energy refund
      const refundedEnergy = addEnergy(newEnergy, reward.energyRefund);
      setEnergy(refundedEnergy);
      saveEnergy(refundedEnergy);
      if (reward.energyRefund > 0) {
        setEnergyFlash("gain");
        setTimeout(() => setEnergyFlash(null), 300);
        // Instant flyup showing energy gained
        setEnergyFlyup(reward.energyRefund);
        setTimeout(() => setEnergyFlyup(null), 700);
      }

      // Check collectibles
      if (timedEvent && !timedEvent.completed && !isEventExpired(timedEvent)) {
        const earned = checkCollectibleEarned(newFlipped, collectibleIndices);
        if (earned > 0) {
          const updatedEvent = {
            ...timedEvent,
            collected: timedEvent.collected + earned,
          };
          // Check if target reached
          if (updatedEvent.collected >= updatedEvent.target) {
            updatedEvent.completed = true;

            playSound("eventComplete");
          } else {
            playSound("collectible");
          }
          setTimedEvent(updatedEvent);
          saveTimedEvent(updatedEvent);

          // Float animation for each collectible earned
          for (const fi of newFlipped) {
            if (collectibleIndices.has(fi)) {
              addCollectibleFloat(timedEvent.theme.collectibleEmoji, fi);
            }
          }
        }
      }

      // Update stats
      const newSessionScore = sessionScore + 1;
      setSessionScore(newSessionScore);
      setStats((prev) => {
        const updated = {
          ...prev,
          totalMatches: prev.totalMatches + 1,
          highestCombo: Math.max(prev.highestCombo, newCombo),
          totalCoinsEarned: prev.totalCoinsEarned + reward.coins,
        };
        saveStats(updated);

        // Check milestones
        const newMs = checkNewMilestones(updated, achievedMilestones);
        if (newMs.length > 0) {
          const newAchieved = [...achievedMilestones, ...newMs.map((m) => m.id)];
          setAchievedMilestones(newAchieved);
          saveMilestones(newAchieved);

          let bonusCoins = 0;
          let bonusEnergy = 0;
          for (const m of newMs) {
            bonusCoins += m.reward.coins;
            bonusEnergy += m.reward.energy;
            showMilestoneToast(m);
          }
          if (bonusCoins > 0) {
            const withBonus = newCoins + bonusCoins;
            setCoins(withBonus);
            saveCoins(withBonus);
          }
          if (bonusEnergy > 0) {
            setEnergy((prev) => {
              const e = addEnergy(prev, bonusEnergy);
              saveEnergy(e);
              return e;
            });
          }
        }
        return updated;
      });

      // Check board clear
      if (isAllMatched(newCards)) {
        const clearReward = calculateBoardClearReward(round, starRank);
        const clearedCoins = newCoins + clearReward.coins;
        setCoins(clearedCoins);
        saveCoins(clearedCoins);
        setSessionCoins((sc) => sc + clearReward.coins);

        // Board clear energy reward
        if (clearReward.energy > 0) {
          setEnergy((prev) => {
            const e = addEnergy(prev, clearReward.energy);
            saveEnergy(e);
            return e;
          });
        }

        // Streak bonus
        const newSessionBoards = sessionBoardsCleared + 1;
        setSessionBoardsCleared(newSessionBoards);
        const streakBonusAmount = calculateStreakBonus(newSessionBoards);
        if (streakBonusAmount > 0) {
          setEnergy((prev) => {
            const e = addEnergy(prev, streakBonusAmount);
            saveEnergy(e);
            return e;
          });
          setStreakToast(streakBonusAmount);
          setTimeout(() => setStreakToast(null), 2000);
        }

        // Safety net check (between boards)
        setBoardsSinceLastSafetyNet((prev) => {
          const newCount = prev + 1;
          // We need to read energy after all updates, so use setTimeout
          setTimeout(() => {
            setEnergy((currentEnergy) => {
              if (shouldTriggerSafetyNet(currentEnergy.amount, newCount)) {
                const gift = calculateSafetyNetGift();
                setSafetyNetGift(gift);
                setBoardsSinceLastSafetyNet(0);
                setTimeout(() => setSafetyNetGift(null), 2500);
                const e = addEnergy(currentEnergy, gift);
                saveEnergy(e);
                return e;
              }
              return currentEnergy;
            });
          }, 100);
          return newCount;
        });

        setStats((prev) => {
          const updated = {
            ...prev,
            totalBoardsCleared: prev.totalBoardsCleared + 1,
            highestRound: Math.max(prev.highestRound, round),
          };
          saveStats(updated);

          const newMs = checkNewMilestones(updated, achievedMilestones);
          if (newMs.length > 0) {
            const newAchieved = [...achievedMilestones, ...newMs.map((m) => m.id)];
            setAchievedMilestones(newAchieved);
            saveMilestones(newAchieved);
            for (const m of newMs) showMilestoneToast(m);
          }
          return updated;
        });

        playSound("levelUp");
        setBoardClearing(true);
        setPhase("board-clear");

        // Track clears for wheel trigger
        const newClears = eventClears + 1;
        setEventClears(newClears);
        saveEventClears(newClears);

        if (boardClearTimeout.current) clearTimeout(boardClearTimeout.current);

        const shouldTriggerWheel = newClears % WHEEL_TRIGGER_EVERY === 0;

        boardClearTimeout.current = setTimeout(() => {
          setBoardClearing(false);

          // Priority: scratch card > wheel > next round
          if (pendingScratchCard && timedEvent) {
            // Show scratch card
            const cells = generateScratchCard(timedEvent.tier);
            setScratchCells(cells);
            setScratchPrize(null);

            setPhase("event-scratch");
          } else if (shouldTriggerWheel) {
            setWheelResult(null);
            setWheelShowResult(false);
            setWheelSpinning(false);
            setPhase("event-wheel");
          } else {
            // Try to start a new event if none active
            if (!timedEvent && shouldTriggerEvent()) {
              const newEvt = createNewEvent();
              saveTimedEvent(newEvt);
              setTimedEvent(newEvt);

              playSound("eventStart");
            }
            advanceToNextRound(round + 1);
          }
        }, 2500);
      }
    },
    [locked, phase, cards, flippedIndices, energy, combo, coins, sessionScore, round, matchSize, achievedMilestones, addCoinFloat, showMilestoneToast, eventClears, timedEvent, collectibleIndices, addCollectibleFloat, advanceToNextRound, lastSecondWindTime, sessionBoardsCleared, boardsSinceLastSafetyNet, starRank],
  );

  // ── Quit (show summary, then back to idle) ──────────

  const quit = useCallback(() => {
    if (flipBackTimeout.current) clearTimeout(flipBackTimeout.current);
    if (boardClearTimeout.current) clearTimeout(boardClearTimeout.current);
    saveHighScore(sessionScore);
    setHighScore(loadHighScore());
    setPhase("quit-summary");
  }, [sessionScore]);

  // ── Skip Board (advance without rewards) ──────────

  const skipBoard = useCallback(() => {
    if (phase !== "playing") return;
    if (flipBackTimeout.current) clearTimeout(flipBackTimeout.current);
    setLocked(false);
    setCombo(0);
    playSound("click");
    advanceToNextRound(round + 1);
  }, [phase, round, advanceToNextRound]);

  const backToMenu = useCallback(() => {
    setPhase("idle");
    setEnergy(loadEnergy());
    setCoins(loadCoins());
    setLabLevel(loadLabLevel());
    setStats(loadStats());
    setAchievedMilestones(loadMilestones());
    setHighScore(loadHighScore());
    setStarRank(loadStarRank());
    setShowPrestigeConfirm(false);
    setShowLab(false);
    setLocked(false);
    setBoardClearing(false);
    setBoardEntering(false);
    setWheelShowResult(false);
    setWheelResult(null);
    setWheelSpinning(false);

    setScratchCells([]);
    setScratchPrize(null);

    setCollectibleIndices(EMPTY_SET);
    const saved = loadTimedEvent();
    if (saved && !isEventExpired(saved) && !saved.rewardClaimed) {
      setTimedEvent(saved);
    } else {
      setTimedEvent(null);
    }
  }, []);

  // ── Prestige (Star Rank) ──────────────────────────────

  const [showPrestigeConfirm, setShowPrestigeConfirm] = useState(false);

  const handlePrestige = useCallback(() => {
    const newRank = starRank + 1;
    setStarRank(newRank);
    saveStarRank(newRank);
    setStats((prev) => {
      const updated = { ...prev, totalPrestiges: prev.totalPrestiges + 1 };
      saveStats(updated);
      // Check milestones
      const newMs = checkNewMilestones(updated, achievedMilestones);
      if (newMs.length > 0) {
        const newAchieved = [...achievedMilestones, ...newMs.map((m) => m.id)];
        setAchievedMilestones(newAchieved);
        saveMilestones(newAchieved);
      }
      return updated;
    });
    setShowPrestigeConfirm(false);
    playSound("levelUp");
  }, [starRank, achievedMilestones]);

  // ── Lab Upgrade ──────────────────────────────────────

  const handleUpgrade = useCallback(() => {
    const result = purchaseUpgrade(coins, labLevel);
    if (!result) return;
    setCoins(result.newCoins);
    saveCoins(result.newCoins);
    setLabLevel(result.newLevel);
    saveLabLevel(result.newLevel);
    playSound("levelUp");
  }, [coins, labLevel]);

  // ── Wheel Spin ─────────────────────────────────────

  const handleWheelSpin = useCallback(() => {
    if (wheelSpinning || wheelShowResult) return;
    setWheelSpinning(true);

    const winIndex = spinWheel();
    setWheelResult(winIndex);

    // Calculate final rotation: multiple full spins + land on the winning segment
    // Segment 0 is at top (0°), each segment spans SEGMENT_ANGLE
    // We want the pointer (at top) to land in the middle of the winning segment
    const segmentCenter = winIndex * SEGMENT_ANGLE + SEGMENT_ANGLE / 2;
    // Wheel spins clockwise, so to land pointer on segment, rotate -(segmentCenter) + full spins
    const fullSpins = 5 + Math.floor(Math.random() * 3); // 5-7 full rotations
    const targetRotation = wheelRotation + fullSpins * 360 + (360 - segmentCenter);
    setWheelRotation(targetRotation);

    // Play tick sounds during spin
    let tickCount = 0;
    wheelTickRef.current = setInterval(() => {
      tickCount++;
      playSound("wheelTick");
      // Slow down ticks after a while
      if (tickCount > 30) {
        if (wheelTickRef.current) clearInterval(wheelTickRef.current);
      }
    }, 80);

    // After spin animation ends, show result
    wheelTimeoutRef.current = setTimeout(() => {
      if (wheelTickRef.current) clearInterval(wheelTickRef.current);
      setWheelSpinning(false);
      setWheelShowResult(true);

      const segment = WHEEL_SEGMENTS[winIndex];
      if (segment.coins === 0 && segment.energy === 0) {
        playSound("bust");
      } else if (segment.label === "JACKPOT") {
        playSound("jackpot");
      } else {
        playSound("levelUp");
      }

      // Apply rewards
      if (segment.coins > 0) {
        setCoins((prev) => {
          const n = prev + segment.coins;
          saveCoins(n);
          return n;
        });
        setSessionCoins((sc) => sc + segment.coins);
      }
      if (segment.energy > 0) {
        setEnergy((prev) => {
          const e = addEnergy(prev, segment.energy);
          saveEnergy(e);
          return e;
        });
      }
    }, 4200); // Match CSS transition duration
  }, [wheelSpinning, wheelShowResult, wheelRotation]);

  const handleWheelContinue = useCallback(() => {
    setWheelShowResult(false);
    setWheelResult(null);
    advanceToNextRound(round + 1);
  }, [round, advanceToNextRound]);

  // ── Scratch Card ───────────────────────────────────

  const handleScratchReveal = useCallback((index: number) => {
    if (scratchFinished) return;
    if (scratchCells[index]?.revealed) return;

    playSound("scratch");
    const newCells = revealCell(scratchCells, index);
    setScratchCells(newCells);

    const winSymbol = checkScratchResult(newCells);
    if (winSymbol) {
      const prize = calculateScratchPrize(winSymbol, timedEvent?.tier ?? "bronze");
      setScratchPrize(prize);


      if (prize.coins > 0 || prize.energy > 0) {
        playSound("scratchWin");
      } else {
        playSound("bust");
      }

      // Apply rewards
      if (prize.coins > 0) {
        setCoins((prev) => {
          const n = prev + prize.coins;
          saveCoins(n);
          return n;
        });
        setSessionCoins((sc) => sc + prize.coins);
      }
      if (prize.energy > 0) {
        setEnergy((prev) => {
          const e = addEnergy(prev, prize.energy);
          saveEnergy(e);
          return e;
        });
      }
    } else if (isScratchComplete(newCells)) {
      // All cells revealed but no 3-match (shouldn't happen with our generation, but safety)

      playSound("bust");
    }
  }, [scratchCells, scratchPrize, timedEvent]);

  const handleScratchContinue = useCallback(() => {
    // Mark event reward as claimed
    if (timedEvent) {
      const updated = { ...timedEvent, rewardClaimed: true };
      saveTimedEvent(updated);
      setTimedEvent(null);
      endEvent();
    }

    setScratchCells([]);
    setScratchPrize(null);

    advanceToNextRound(round + 1);
  }, [timedEvent, round, advanceToNextRound]);

  // ── Shop ──────────────────────────────────────────────

  const resetShopState = useCallback(() => {
    setCoinFlipChoice(null);
    setCoinFlipResult(null);
    setCoinFlipAnimating(false);
    setTreasureChests([]);
    setTreasureOpenedIndex(null);
    setSlotResult(null);
    setSlotSpinning(false);
    setSlotReelsStopped([false, false, false]);
    if (coinFlipTimeoutRef.current) clearTimeout(coinFlipTimeoutRef.current);
    if (slotTimeoutRef.current) clearTimeout(slotTimeoutRef.current);
  }, []);

  const handleOpenShop = useCallback(() => {
    playSound("click");
    setShowLab(false);
    setPhase("shop");
  }, []);

  const handleShopBack = useCallback(() => {
    playSound("click");
    resetShopState();
    setPhase("idle");
  }, [resetShopState]);

  const handleBuyGame = useCallback((gameType: ShopGameType) => {
    const item = SHOP_ITEMS.find((i) => i.id === gameType);
    if (!item) return;
    const newCoins = purchaseShopItem(coins, item);
    if (newCoins === null) return;

    playSound("click");
    setCoins(newCoins);
    saveCoins(newCoins);
    recordShopPurchase(item.cost);

    resetShopState();

    switch (gameType) {
      case "coin-flip":
        setPhase("shop-coin-flip");
        break;
      case "treasure-chest":
        setTreasureChests(generateTreasureChests());
        setPhase("shop-treasure");
        break;
      case "slot-machine":
        setPhase("shop-slots");
        break;
    }
  }, [coins, resetShopState]);

  const applyShopReward = useCallback((reward: { coins: number; energy: number; triggerEvent: boolean }) => {
    if (reward.coins > 0) {
      setCoins((prev) => {
        const n = prev + reward.coins;
        saveCoins(n);
        return n;
      });
    }
    if (reward.energy > 0) {
      setEnergy((prev) => {
        const e = addEnergy(prev, reward.energy);
        saveEnergy(e);
        return e;
      });
    }
    if (reward.triggerEvent) {
      // Shop drops bypass cooldown — only check for active event
      const active = loadTimedEvent();
      if (!active || isEventExpired(active)) {
        const newEvent = createNewEvent();
        saveTimedEvent(newEvent);
        setTimedEvent(newEvent);
      } else {
        // Already has an active event — give coins instead
        const bonus = 100;
        setCoins((prev) => {
          const n = prev + bonus;
          saveCoins(n);
          return n;
        });
      }
    }
  }, []);

  const handleCoinFlipPick = useCallback((choice: CoinFlipChoice) => {
    if (coinFlipAnimating) return;
    setCoinFlipChoice(choice);
    setCoinFlipAnimating(true);
    playSound("click");

    coinFlipTimeoutRef.current = setTimeout(() => {
      const result = playCoinFlip(choice);
      setCoinFlipResult(result);
      setCoinFlipAnimating(false);

      if (result.won) {
        playSound("levelUp");
        applyShopReward(result.reward);
      } else {
        playSound("bust");
      }
    }, 1500);
  }, [coinFlipAnimating, applyShopReward]);

  const handleTreasureChestPick = useCallback((index: number) => {
    if (treasureOpenedIndex !== null) return;
    playSound("scratch");
    setTreasureOpenedIndex(index);
    const updated = openChest(treasureChests, index);
    setTreasureChests(updated);

    setTimeout(() => {
      const chest = updated[index];
      if (chest.rarity === "legendary") {
        playSound("jackpot");
      } else {
        playSound("scratchWin");
      }
      applyShopReward(chest.reward);
    }, 600);
  }, [treasureChests, treasureOpenedIndex, applyShopReward]);

  const handleSlotPull = useCallback(() => {
    if (slotSpinning || slotResult) return;
    setSlotSpinning(true);
    playSound("click");

    const result = generateSlotResult();
    setSlotResult(result);

    // Stop reels sequentially
    const stopReel = (i: number) => {
      slotTimeoutRef.current = setTimeout(() => {
        playSound("wheelTick");
        setSlotReelsStopped((prev) => {
          const next = [...prev];
          next[i] = true;
          return next;
        });
        if (i < 2) {
          stopReel(i + 1);
        } else {
          // All reels stopped
          setSlotSpinning(false);

          if (result.isJackpot) {
            playSound("jackpot");
          } else if (result.matchCount === 3) {
            playSound("scratchWin");
          } else if (result.matchCount === 2) {
            playSound("levelUp");
          } else if (result.reward.coins === 0 && result.reward.energy === 0) {
            playSound("bust");
          } else {
            playSound("click");
          }

          applyShopReward(result.reward);
        }
      }, 600 + i * 500);
    };

    stopReel(0);
  }, [slotSpinning, slotResult, applyShopReward]);

  const handleShopGameContinue = useCallback(() => {
    playSound("click");
    resetShopState();
    setPhase("shop");
  }, [resetShopState]);

  const handleShopPlayAgain = useCallback((gameType: ShopGameType) => {
    const item = SHOP_ITEMS.find((i) => i.id === gameType);
    if (!item) return;
    const newCoins = purchaseShopItem(coins, item);
    if (newCoins === null) return;

    playSound("click");
    setCoins(newCoins);
    saveCoins(newCoins);
    recordShopPurchase(item.cost);

    // Reset game-specific state for fresh round
    switch (gameType) {
      case "coin-flip":
        setCoinFlipChoice(null);
        setCoinFlipResult(null);
        setCoinFlipAnimating(false);
        if (coinFlipTimeoutRef.current) clearTimeout(coinFlipTimeoutRef.current);
        break;
      case "treasure-chest":
        setTreasureChests(generateTreasureChests());
        setTreasureOpenedIndex(null);
        break;
      case "slot-machine":
        setSlotResult(null);
        setSlotSpinning(false);
        setSlotReelsStopped([false, false, false]);
        if (slotTimeoutRef.current) clearTimeout(slotTimeoutRef.current);
        break;
    }
  }, [coins]);

  // ── Overlay Mini-Game (during gameplay) ───────────────

  const handleOverlayBuyGame = useCallback((gameType: ShopGameType) => {
    const item = SHOP_ITEMS.find((i) => i.id === gameType);
    if (!item) return;
    const newCoins = purchaseShopItem(coins, item);
    if (newCoins === null) return;

    playSound("click");
    setCoins(newCoins);
    saveCoins(newCoins);
    recordShopPurchase(item.cost);
    resetShopState();

    if (gameType === "treasure-chest") {
      setTreasureChests(generateTreasureChests());
    }

    setMiniGameOverlay(gameType);
    setLocked(true);
  }, [coins, resetShopState]);

  const handleOverlayContinue = useCallback(() => {
    playSound("click");
    resetShopState();
    setMiniGameOverlay(null);
    setLocked(false);
  }, [resetShopState]);

  const handleOverlayPlayAgain = useCallback((gameType: ShopGameType) => {
    const item = SHOP_ITEMS.find((i) => i.id === gameType);
    if (!item) return;
    const newCoins = purchaseShopItem(coins, item);
    if (newCoins === null) return;

    playSound("click");
    setCoins(newCoins);
    saveCoins(newCoins);
    recordShopPurchase(item.cost);

    switch (gameType) {
      case "coin-flip":
        setCoinFlipChoice(null);
        setCoinFlipResult(null);
        setCoinFlipAnimating(false);
        if (coinFlipTimeoutRef.current) clearTimeout(coinFlipTimeoutRef.current);
        break;
      case "treasure-chest":
        setTreasureChests(generateTreasureChests());
        setTreasureOpenedIndex(null);
        break;
      case "slot-machine":
        setSlotResult(null);
        setSlotSpinning(false);
        setSlotReelsStopped([false, false, false]);
        if (slotTimeoutRef.current) clearTimeout(slotTimeoutRef.current);
        break;
    }
  }, [coins]);

  // ── Tab Navigation ──────────────────────────────────

  const handleTabNavigate = useCallback((tab: "home" | "play" | "shop" | "achievements") => {
    playSound("click");

    // Save current game phase if navigating away from game
    if (gameInProgress && tab !== "play") {
      savedGamePhase.current = phase;
    }

    switch (tab) {
      case "home":
        setShowLab(false);
        setPhase("idle");
        break;
      case "play":
        if (savedGamePhase.current && !gameInProgress) {
          // Resume saved game
          setPhase(savedGamePhase.current);
          savedGamePhase.current = null;
        } else if (!gameInProgress) {
          // Start new game
          start();
        }
        // If already in game, do nothing
        break;
      case "shop":
        resetShopState();
        setPhase("shop");
        break;
      case "achievements":
        setPhase("achievements");
        break;
    }
  }, [gameInProgress, phase, start, resetShopState]);

  // ── Keyboard Navigation ──────────────────────────────

  useEffect(() => {
    if (phase === "idle") {
      const handler = (e: KeyboardEvent) => {
        if (e.key === "Enter") start();
      };
      window.addEventListener("keydown", handler);
      return () => window.removeEventListener("keydown", handler);
    }

    if (phase !== "playing") return;

    const cols = config.cols;
    const total = cards.length;
    const handler = (e: KeyboardEvent) => {
      if (locked) return;
      switch (e.key) {
        case "ArrowRight":
          e.preventDefault();
          setFocusedIndex((i) => Math.min(i + 1, total - 1));
          break;
        case "ArrowLeft":
          e.preventDefault();
          setFocusedIndex((i) => Math.max(i - 1, 0));
          break;
        case "ArrowDown":
          e.preventDefault();
          setFocusedIndex((i) => Math.min(i + cols, total - 1));
          break;
        case "ArrowUp":
          e.preventDefault();
          setFocusedIndex((i) => Math.max(i - cols, 0));
          break;
        case "Enter":
        case " ":
          e.preventDefault();
          handleFlip(focusedIndex);
          break;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [phase, locked, focusedIndex, cards.length, config.cols, handleFlip, start]);

  // ── Mute Toggle ──────────────────────────────────────

  const handleMute = () => {
    const next = toggleMute();
    setMuted(next);
  };

  // ── Render Helpers ───────────────────────────────────

  const energyPercent = Math.min(100, (energy.amount / MAX_ENERGY) * 100);
  const energyOverflow = energy.amount > MAX_ENERGY;

  const cardHeight = config.cols <= 4 ? "h-24 sm:h-32" : config.cols <= 5 ? "h-20 sm:h-28" : "h-18 sm:h-24";
  const cardFontSize = config.cols <= 4 ? "text-4xl sm:text-5xl" : config.cols <= 5 ? "text-3xl sm:text-4xl" : "text-2xl sm:text-3xl";

  // ── JSX ──────────────────────────────────────────────

  return (
    <div className={`relative pb-8 text-white ${phaseAnimating ? "animate-phase-enter" : ""}`}>
      {/* ── Header ──────────────────────────────────── */}
      <div className="mb-4 flex items-center justify-between">
        <h1 className="gradient-text text-glow-purple text-3xl font-extrabold tracking-tight sm:text-4xl">
          Memory Quest
        </h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowHelp((h) => !h)}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 border border-white/20 text-white transition hover:bg-white/20"
            title="Help"
          >
            ?
          </button>
          <button
            onClick={handleMute}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 border border-white/20 text-white transition hover:bg-white/20"
            title={muted ? "Unmute" : "Mute"}
          >
            {muted ? "🔇" : "🔊"}
          </button>
        </div>
      </div>

      {/* ── Help Panel ──────────────────────────────── */}
      {showHelp && (
        <div className="animate-bounce-in mb-4 rounded-2xl panel-dark p-4 text-sm text-gray-300 shadow-lg">
          <p className="mb-2 font-semibold text-purple-300">How to Play</p>
          <ul className="list-inside list-disc space-y-1">
            <li>Flip cards to find matching sets (pairs, triples, or quads)</li>
            <li>Each flip costs 1 energy — energy regenerates over time</li>
            <li>Consecutive matches build combos for bonus coins & energy</li>
            <li>Clear boards to advance to harder rounds</li>
            <li>Spend coins to upgrade your Brain Lab</li>
            <li>Unlock achievement milestones for big rewards</li>
            <li>Keyboard: Arrow keys to navigate, Enter/Space to flip</li>
          </ul>
        </div>
      )}

      {/* ── Economy HUD ─────────────────────────────── */}
      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl panel-dark-strong gold-frame p-3 shadow-xl">
        {/* Energy */}
        <div className="relative flex flex-1 items-center gap-2">
          <span className={`text-lg ${energy.amount <= 5 ? "animate-energy-pulse" : ""}`}>
            ⚡
          </span>
          <div className="flex-1">
            <div className={`h-4 overflow-hidden rounded-full energy-bar-track ${energyOverflow ? "animate-glow-gold" : ""} ${energyFlash === "drain" ? "animate-energy-drain" : ""} ${energyFlash === "gain" ? "animate-energy-gain" : ""} ${!energyOverflow && energy.amount <= LOW_ENERGY_THRESHOLD && phase === "playing" ? "animate-energy-low" : ""}`}>
              <div
                className={`h-full rounded-full transition-all duration-300 ${energyOverflow ? "bg-gradient-to-r from-yellow-400 to-amber-400" : energy.amount <= LOW_ENERGY_THRESHOLD && !energyOverflow ? "bg-gradient-to-r from-red-500 to-orange-400" : "energy-bar-gradient"}`}
                style={{ width: `${energyPercent}%` }}
              />
            </div>
            <p className="mt-0.5 text-sm text-gray-300">
              {energy.amount}/{MAX_ENERGY}
              {energyOverflow && (
                <span className="ml-1 font-bold text-gold-bright text-glow-gold">OVERCHARGED</span>
              )}
              {!energyOverflow && energy.amount <= LOW_ENERGY_THRESHOLD && phase === "playing" && (
                <span className="ml-1 font-semibold text-red-400">Low Energy!</span>
              )}
              {!energyOverflow && energy.amount > LOW_ENERGY_THRESHOLD && energy.amount < MAX_ENERGY && timeToNextEnergy > 0 && (
                <span className="ml-1 text-gray-400">+1 in {timeToNextEnergy}s</span>
              )}
              {!energyOverflow && !isSecondWindAvailable(lastSecondWindTime) && phase === "playing" && (
                <span className="ml-1 text-green-400/60 text-xs">⟳ {Math.ceil(getSecondWindCooldownRemaining(lastSecondWindTime) / 60_000)}m</span>
              )}
            </p>
          </div>
          {/* Energy flyup on match */}
          {energyFlyup !== null && (
            <div className="animate-energy-flyup pointer-events-none absolute -top-1 right-0 z-10 font-bold text-green-400 text-sm">
              +{energyFlyup} ⚡
            </div>
          )}
        </div>

        {/* Coins */}
        <div className={`sparkle-container flex items-center gap-1 rounded-xl coin-badge px-3 py-1.5 ${coinBump ? "animate-counter-bump" : ""}`}>
          <span>🪙</span>
          <span className="font-bold text-yellow-300 text-glow-gold text-number-bold">{coins.toLocaleString()}</span>
        </div>

        {/* Round (during game) */}
        {phase === "playing" && (
          <div className="flex items-center gap-1 rounded-xl bg-purple-500/20 border border-purple-500/30 px-3 py-1.5">
            <span className="text-sm font-semibold text-purple-300">R{round}</span>
          </div>
        )}

        {/* Combo (during game) */}
        {phase === "playing" && combo > 1 && (
          <div
            className={`flex items-center gap-1 rounded-xl bg-green-500/20 border border-green-500/30 px-3 py-1.5 font-bold text-green-400 text-glow-gold ${
              comboAnim ? "animate-combo-pop" : ""
            } ${combo >= 5 ? "animate-combo-fire" : ""}`}
          >
            {combo}x
          </div>
        )}
      </div>

      {/* ── HUD Progress Indicators (during gameplay) ── */}
      {phase === "playing" && (
        <HUDProgressIndicators
          eventClears={eventClears}
          stats={stats}
          achievedMilestones={achievedMilestones}
        />
      )}

      {/* ── IDLE PHASE ──────────────────────────────── */}
      {phase === "idle" && (
        <div className="animate-bounce-in flex flex-col items-center gap-6 py-6">
          {/* Lab Display */}
          <div className="flex flex-col items-center gap-2">
            <div className="hero-glow animate-upgrade-glow glow-bloom flex h-36 w-36 items-center justify-center rounded-3xl bg-purple-500/20 border-2 border-purple-500/30 text-6xl">
              {currentUpgrade.emoji}
            </div>
            <p className="font-bold text-purple-300 text-glow-purple">{currentUpgrade.name}</p>
            <p className="text-sm text-gray-400 text-number-bold">Lab Level {labLevel}</p>
          </div>

          {/* Upgrade Button */}
          <button
            onClick={() => setShowLab((l) => !l)}
            className="rounded-xl bg-purple-500/20 border-2 border-purple-500/30 px-4 py-2 text-base font-semibold text-purple-300 transition hover:bg-purple-500/30"
          >
            {showLab ? "Hide Lab" : "Upgrade Lab"}
          </button>

          {showLab && (
            <div className="animate-bounce-in w-full max-w-md rounded-2xl panel-dark p-4 shadow-lg">
              <p className="mb-2 text-center text-base font-semibold text-gray-300">Next Upgrade</p>
              <div className="mb-3 flex items-center justify-center gap-3">
                <span className="text-3xl">{nextUpgrade.emoji}</span>
                <div>
                  <p className="font-bold text-purple-300">{nextUpgrade.name}</p>
                  <p className="text-sm text-yellow-300 text-glow-gold">🪙 {nextUpgrade.cost.toLocaleString()}</p>
                </div>
              </div>
              <button
                onClick={handleUpgrade}
                disabled={!canAffordUpgrade(coins, labLevel)}
                className={`w-full rounded-xl py-2.5 font-bold text-white transition ${
                  canAffordUpgrade(coins, labLevel)
                    ? "gradient-btn animate-shimmer"
                    : "cursor-not-allowed bg-gray-700 text-gray-400"
                }`}
              >
                {canAffordUpgrade(coins, labLevel) ? "Purchase" : "Not enough coins"}
              </button>
            </div>
          )}

          {/* Shop Button */}
          <button
            onClick={handleOpenShop}
            className="sparkle-container rounded-xl coin-badge px-4 py-2 text-sm font-semibold text-yellow-300 text-glow-gold transition hover:brightness-110"
          >
            🏪 Shop
          </button>

          {/* Star Rank & Prestige */}
          {starRank > 0 && (
            <p className="text-sm text-yellow-300 text-glow-gold">
              {"⭐".repeat(Math.min(starRank, 10))} Star Rank {starRank} <span className="text-gray-400">(+{starRank * 10}% coins)</span>
            </p>
          )}
          {stats.highestRound >= 14 && !showPrestigeConfirm && (
            <button
              onClick={() => setShowPrestigeConfirm(true)}
              className="rounded-xl bg-yellow-500/20 border-2 border-yellow-500/30 px-4 py-2 text-base font-semibold text-yellow-300 transition hover:bg-yellow-500/30"
            >
              ⭐ Go Prestige
            </button>
          )}
          {showPrestigeConfirm && (
            <div className="animate-bounce-in w-full max-w-md rounded-2xl panel-dark p-4 shadow-lg text-center">
              <p className="mb-2 text-base font-semibold text-yellow-300">Prestige to Star Rank {starRank + 1}?</p>
              <p className="mb-3 text-sm text-gray-400">
                Next game starts at Round 1. You keep all coins, upgrades & milestones. Coin rewards permanently boosted by +{(starRank + 1) * 10}%.
              </p>
              <div className="flex gap-2 justify-center">
                <button
                  onClick={handlePrestige}
                  className="rounded-xl gradient-btn-gold px-4 py-2 text-sm font-bold text-purple-900"
                >
                  Prestige
                </button>
                <button
                  onClick={() => setShowPrestigeConfirm(false)}
                  className="rounded-xl bg-white/10 border border-white/20 px-4 py-2 text-sm font-medium text-gray-400"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Stats */}
          <div className="grid w-full max-w-md grid-cols-2 gap-3">
            <StatCard label="Total Matches" value={stats.totalMatches} />
            <StatCard label="Boards Cleared" value={stats.totalBoardsCleared} />
            <StatCard label="Best Combo" value={`${stats.highestCombo}x`} />
            <StatCard label="Best Round" value={stats.highestRound} />
          </div>

          <div className="divider-ornate" />

          {highScore > 0 && (
            <p className="text-base text-gold-400 text-glow-gold">
              High Score: <span className="font-bold text-number-bold">{highScore}</span> matches in one run
            </p>
          )}

          {/* Start Button */}
          <button
            onClick={start}
            className="gradient-btn-gold glow-bloom-gold animate-gradient w-full max-w-sm rounded-2xl bg-[length:200%_200%] py-4 text-xl font-extrabold text-purple-900 shadow-lg transition"
          >
            Start Quest
          </button>
          <p className="text-sm text-gray-500">or press Enter</p>
        </div>
      )}

      {/* ── PLAYING PHASE ───────────────────────────── */}
      {phase === "playing" && (
        <div className="relative">
          {/* Quit & Skip buttons */}
          <div className="mb-2 flex justify-end gap-2">
            <button
              onClick={skipBoard}
              className="rounded-lg bg-white/10 border border-white/20 px-3 py-1.5 text-sm font-medium text-gray-400 transition hover:bg-white/20 hover:text-white"
            >
              Skip
            </button>
            <button
              onClick={quit}
              className="rounded-lg bg-white/10 border border-white/20 px-3 py-1.5 text-sm font-medium text-gray-400 transition hover:bg-white/20 hover:text-white"
            >
              Quit
            </button>
          </div>

          {/* Event HUD Banner */}
          {timedEvent && !timedEvent.completed && !isEventExpired(timedEvent) && (
            <div
              className="animate-event-pulse mb-3 flex items-center justify-between gap-3 rounded-2xl panel-dark-strong px-4 py-2.5 shadow-md"
              style={{ "--event-color": `${timedEvent.theme.color}40` } as React.CSSProperties}
            >
              <div className="flex items-center gap-2">
                <span className="text-lg">{timedEvent.theme.collectibleEmoji}</span>
                <div>
                  <p className="text-sm font-bold" style={{ color: timedEvent.theme.color }}>
                    {timedEvent.theme.name}
                  </p>
                  <p className="text-sm text-gray-400">
                    <span
                      className="mr-1 inline-block rounded-full px-1.5 py-0.5 text-xs font-bold text-white"
                      style={{ backgroundColor: TIER_COLORS[timedEvent.tier] }}
                    >
                      {tierLabel(timedEvent.tier)}
                    </span>
                    {formatTimeRemaining(eventTimeRemaining)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-20">
                  <div className="h-2.5 overflow-hidden rounded-full bg-black/40">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${Math.min(100, (timedEvent.collected / timedEvent.target) * 100)}%`,
                        backgroundColor: timedEvent.theme.color,
                      }}
                    />
                  </div>
                </div>
                <span className="text-sm font-bold text-gray-300">
                  {timedEvent.collected}/{timedEvent.target}
                </span>
              </div>
            </div>
          )}

          {/* Match size indicator */}
          {matchSize > 2 && (
            <div className="mb-3 text-center">
              <span className="animate-bounce-in inline-block rounded-full bg-purple-600 px-4 py-1 text-base font-bold text-white shadow-md">
                Match {matchSize}!
              </span>
            </div>
          )}

          {/* Card Grid */}
          <div
            ref={gridRef}
            className="relative mx-auto grid gap-2"
            style={{ gridTemplateColumns: `repeat(${config.cols}, 1fr)`, maxWidth: `${config.cols * 110}px` }}
          >
            {cards.map((card, i) => {
              const isFlipped = card.flipped || card.matched;
              const justMatched = matchedIds.has(i);
              const isShaking = shakeIds.has(i);
              const row = Math.floor(i / config.cols);
              const col = i % config.cols;

              return (
                <div
                  key={card.id}
                  className={`card-container ${cardHeight} relative cursor-pointer ${
                    boardEntering ? "animate-board-enter" : ""
                  } ${boardClearing ? "animate-board-clear" : ""} ${justMatched ? "animate-match-ring" : ""}`}
                  style={
                    boardEntering
                      ? { animationDelay: `${(row + col) * 40}ms` }
                      : boardClearing
                        ? { animationDelay: `${(cards.length - 1 - i) * 25}ms` }
                        : undefined
                  }
                  onClick={() => handleFlip(i)}
                >
                  <div
                    className={`card-inner h-full w-full ${isFlipped ? "flipped" : ""} ${
                      justMatched ? "animate-card-match" : ""
                    } ${isShaking ? "animate-shake" : ""}`}
                  >
                    {/* Back face (hidden side, shown by default) */}
                    <div
                      className={`card-back card-shadow ${cardFontSize} select-none ${
                        i === focusedIndex && !card.matched ? "ring-3 ring-gold-400 ring-offset-2 animate-focus-ring" : ""
                      } ${card.matched ? "opacity-50" : "hover:brightness-110"}`}
                    >
                      <span className="text-white/80">?</span>
                    </div>
                    {/* Front face (emoji side) */}
                    <div
                      className={`card-front ${cardFontSize} select-none ${
                        card.matched ? "card-shadow-matched opacity-70" : "card-shadow"
                      } ${i === focusedIndex && !card.matched ? "ring-3 ring-gold-400 ring-offset-2" : ""} ${isShaking ? "animate-mismatch-flash" : ""}`}
                    >
                      {card.emoji}
                    </div>
                  </div>
                  {/* Collectible badge */}
                  {collectibleIndices.has(i) && !card.matched && timedEvent && (
                    <div className="animate-collectible-sparkle pointer-events-none absolute -right-1 -top-1 z-10 text-base">
                      {timedEvent.theme.collectibleEmoji}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Coin floats */}
            {coinFloats.map((f) => (
              <div
                key={f.id}
                className="animate-coins-fly pointer-events-none absolute z-10 font-bold text-gold-500"
                style={{ left: f.x, top: f.y }}
              >
                +{f.amount} 🪙
              </div>
            ))}

            {/* Collectible floats */}
            {collectibleFloats.map((f) => (
              <div
                key={f.id}
                className="animate-collectible-earned pointer-events-none absolute z-10 text-2xl"
                style={{ left: f.x, top: f.y }}
              >
                {f.emoji}
              </div>
            ))}
          </div>

          {/* Waiting for energy overlay */}
          {energy.amount <= 0 && (
            <div className="animate-bounce-in mt-4 flex flex-col items-center gap-2 rounded-2xl panel-dark-strong py-4 shadow-lg">
              <span className="animate-energy-pulse text-3xl">⚡</span>
              <p className="font-bold text-purple-300">Waiting for energy...</p>
              {timeToNextEnergy > 0 && (
                <p className="text-base text-gray-400">+1 in {timeToNextEnergy}s</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── BOARD CLEAR PHASE ───────────────────────── */}
      {phase === "board-clear" && (
        <>
          <div className="confetti-container">
            <span /><span /><span /><span /><span /><span /><span /><span />
            <span /><span /><span /><span /><span /><span /><span /><span />
          </div>
          <div className="gold-flash-overlay" />
          <div className="animate-elastic-bounce flex flex-col items-center gap-4 py-12 text-center">
            <div className="reward-frame rounded-3xl mx-4 px-8 py-8 flex flex-col items-center gap-4">
              <p className="text-5xl">🎉</p>
              <h2 className="gradient-gold text-glow-gold text-3xl font-extrabold">Board Cleared!</h2>
              <p className="text-lg text-gray-300">Round {round} complete</p>
              <div className="flex items-center gap-2 text-lg">
                <span>🪙</span>
                <span className={`font-bold text-yellow-300 text-glow-gold text-number-bold ${displayedBoardCoins < boardCoins ? "animate-count-glow" : ""}`}>
                  +{displayedBoardCoins.toLocaleString()} coins
                </span>
              </div>
              <div className="mt-4 rounded-2xl panel-dark px-6 py-3">
                <p className="text-sm text-gray-400">Next up:</p>
                <p className="font-bold text-purple-300">
                  {getBoardConfig(round + 1).rows}x{getBoardConfig(round + 1).cols} board
                  {getMatchSize(round + 1) > 2 && (
                    <span className="ml-2 rounded-full bg-purple-500/20 border border-purple-500/30 px-2 py-0.5 text-sm">
                      Match {getMatchSize(round + 1)}
                    </span>
                  )}
                </p>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── LUCKY WHEEL PHASE ─────────────────────── */}
      {phase === "event-wheel" && (
        <div className="animate-bounce-in flex flex-col items-center gap-6 py-6">
          <h2 className="gradient-gold text-glow-gold text-3xl font-extrabold">Lucky Wheel!</h2>
          <p className="text-base text-gray-400">Spin to win coins & energy</p>

          {/* Wheel container */}
          <div className="relative">
            {/* Pointer */}
            <div className={`absolute -top-3 left-1/2 z-10 -translate-x-1/2 text-2xl ${!wheelSpinning && !wheelShowResult ? "animate-pointer-bounce" : ""}`}>
              ▼
            </div>

            {/* Wheel */}
            <div
              className="relative h-72 w-72 rounded-full border-4 border-gold-premium shadow-xl glow-bloom-gold sm:h-80 sm:w-80"
              style={{
                transform: `rotate(${wheelRotation}deg)`,
                transition: wheelSpinning
                  ? "transform 4s cubic-bezier(0.2, 0.8, 0.3, 1)"
                  : "none",
              }}
            >
              {WHEEL_SEGMENTS.map((seg, i) => {
                const startAngle = i * SEGMENT_ANGLE;
                const endAngle = startAngle + SEGMENT_ANGLE;
                const startRad = ((startAngle - 90) * Math.PI) / 180;
                const endRad = ((endAngle - 90) * Math.PI) / 180;
                const r = 50; // percentage
                const x1 = 50 + r * Math.cos(startRad);
                const y1 = 50 + r * Math.sin(startRad);
                const x2 = 50 + r * Math.cos(endRad);
                const y2 = 50 + r * Math.sin(endRad);
                const largeArc = SEGMENT_ANGLE > 180 ? 1 : 0;

                // Label position (middle of segment arc)
                const midRad = (((startAngle + endAngle) / 2 - 90) * Math.PI) / 180;
                const labelR = 33;
                const lx = 50 + labelR * Math.cos(midRad);
                const ly = 50 + labelR * Math.sin(midRad);

                return (
                  <svg
                    key={i}
                    className="absolute inset-0 h-full w-full"
                    viewBox="0 0 100 100"
                  >
                    <path
                      d={`M 50 50 L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`}
                      fill={seg.color}
                      stroke="white"
                      strokeWidth="0.5"
                    />
                    <text
                      x={lx}
                      y={ly}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fill="white"
                      fontWeight="bold"
                      fontSize="4.5"
                    >
                      {seg.emoji}
                    </text>
                    <text
                      x={lx}
                      y={ly + 5.5}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fill="white"
                      fontWeight="bold"
                      fontSize="3.2"
                    >
                      {seg.label}
                    </text>
                  </svg>
                );
              })}
            </div>
          </div>

          {/* Spin / Result */}
          {!wheelShowResult ? (
            <button
              onClick={handleWheelSpin}
              disabled={wheelSpinning}
              className={`w-full max-w-sm rounded-2xl py-4 text-xl font-extrabold text-white shadow-lg transition ${
                wheelSpinning
                  ? "cursor-not-allowed bg-gray-700 text-gray-400"
                  : "gradient-btn animate-gradient bg-[length:200%_200%]"
              }`}
            >
              {wheelSpinning ? "Spinning..." : "Spin!"}
            </button>
          ) : (
            <div className="animate-prize-pop flex flex-col items-center gap-3">
              {wheelResult !== null && (
                <>
                  <div
                    className={`rounded-2xl px-6 py-4 text-center shadow-lg ${
                      WHEEL_SEGMENTS[wheelResult].label === "JACKPOT"
                        ? "animate-glow-gold reward-frame"
                        : WHEEL_SEGMENTS[wheelResult].coins === 0 && WHEEL_SEGMENTS[wheelResult].energy === 0
                        ? "border-2 border-red-500/50 bg-red-500/10"
                        : "border-2 border-purple-500/50 bg-purple-500/10"
                    }`}
                  >
                    <p className="text-4xl">{WHEEL_SEGMENTS[wheelResult].emoji}</p>
                    <p className="mt-1 text-lg font-bold">
                      {WHEEL_SEGMENTS[wheelResult].label === "JACKPOT"
                        ? "JACKPOT!"
                        : WHEEL_SEGMENTS[wheelResult].coins === 0 && WHEEL_SEGMENTS[wheelResult].energy === 0
                        ? "Bust! Nothing this time."
                        : WHEEL_SEGMENTS[wheelResult].coins > 0
                        ? `+${WHEEL_SEGMENTS[wheelResult].coins} coins!`
                        : `+${WHEEL_SEGMENTS[wheelResult].energy} energy!`}
                    </p>
                    {WHEEL_SEGMENTS[wheelResult].label === "JACKPOT" && (
                      <p className="text-sm text-yellow-300 text-glow-gold">
                        +{WHEEL_SEGMENTS[wheelResult].coins} coins & +{WHEEL_SEGMENTS[wheelResult].energy} energy
                      </p>
                    )}
                  </div>
                  <button
                    onClick={handleWheelContinue}
                    className="gradient-btn w-full max-w-sm rounded-2xl py-3 text-lg font-bold text-white shadow-lg"
                  >
                    Continue
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── SCRATCH CARD PHASE ────────────────────── */}
      {phase === "event-scratch" && timedEvent && (
        <div className="animate-bounce-in flex flex-col items-center gap-5 py-6">
          <div className="flex items-center gap-2">
            <span className="text-3xl">{timedEvent.theme.collectibleEmoji}</span>
            <div>
              <h2 className="gradient-gold text-glow-gold text-3xl font-extrabold">Scratch Card!</h2>
              <p className="text-sm text-gray-400">
                <span
                  className="mr-1 inline-block rounded-full px-1.5 py-0.5 text-xs font-bold text-white"
                  style={{ backgroundColor: TIER_COLORS[timedEvent.tier] }}
                >
                  {tierLabel(timedEvent.tier)}
                </span>
                Match 3 symbols to win
              </p>
            </div>
          </div>

          {/* 3x3 Scratch Grid */}
          <div
            className="mx-auto grid gap-2"
            style={{ gridTemplateColumns: "repeat(3, 1fr)", maxWidth: "320px" }}
          >
            {scratchCells.map((cell, i) => {
              const isWinner = scratchPrize && cell.revealed && cell.symbol === scratchPrize.symbol;
              return (
                <button
                  key={i}
                  onClick={() => handleScratchReveal(i)}
                  disabled={cell.revealed || scratchFinished}
                  className={`relative flex h-24 w-24 items-center justify-center rounded-xl text-3xl transition-all ${
                    cell.revealed
                      ? isWinner
                        ? "animate-scratch-win border-2 border-gold-400 bg-gold-500/10"
                        : "border-2 border-white/20 bg-white/5"
                      : "cursor-pointer border-2 border-purple-500/50 hover:brightness-110"
                  } ${cell.revealed ? "animate-scratch-reveal" : ""}`}
                >
                  {cell.revealed ? cell.emoji : (
                    <div className="scratch-cover absolute inset-0 flex items-center justify-center rounded-xl text-3xl">?</div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Result */}
          {scratchFinished && (
            <div className="animate-prize-pop flex flex-col items-center gap-3">
              {scratchPrize && (scratchPrize.coins > 0 || scratchPrize.energy > 0) ? (
                <div className="animate-glow-gold reward-frame rounded-2xl px-6 py-4 text-center shadow-lg">
                  <p className="text-lg font-bold text-yellow-300 text-glow-gold">You Won!</p>
                  <div className="mt-1 flex items-center justify-center gap-3">
                    {scratchPrize.coins > 0 && (
                      <span className="font-bold">🪙 +{scratchPrize.coins}</span>
                    )}
                    {scratchPrize.energy > 0 && (
                      <span className="font-bold">⚡ +{scratchPrize.energy}</span>
                    )}
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border-2 border-red-500/50 bg-red-500/10 px-6 py-4 text-center shadow-lg">
                  <p className="text-lg font-bold text-red-400">💀 No luck this time!</p>
                </div>
              )}
              <button
                onClick={handleScratchContinue}
                className="gradient-btn w-full max-w-sm rounded-2xl py-3 text-lg font-bold text-white shadow-lg"
              >
                Continue
              </button>
            </div>
          )}

          {!scratchFinished && (
            <p className="text-sm text-gray-400">Tap cells to reveal symbols</p>
          )}
        </div>
      )}

      {/* ── SHOP PHASE ────────────────────────────── */}
      {phase === "shop" && (
        <div className="animate-bounce-in flex flex-col items-center gap-6 py-6">
          <h2 className="gradient-gold text-glow-gold text-3xl font-extrabold">🏪 Shop</h2>
          <p className="text-base text-gray-400">Spend coins on mini games for a chance to win big!</p>

          <div className="flex w-full max-w-md flex-col gap-4">
            {SHOP_ITEMS.map((item) => {
              const affordable = canAffordShopItem(coins, item);
              return (
                <div
                  key={item.id}
                  className={`rounded-2xl panel-dark p-4 shadow-lg transition ${
                    affordable ? "animate-shop-item-hover" : "opacity-60"
                  }`}
                >
                  <div className="mb-2 flex items-center gap-3">
                    <span className="text-3xl">{item.emoji}</span>
                    <div className="flex-1">
                      <p className="font-bold text-white">{item.name}</p>
                      <p className="text-sm text-gray-400">{item.description}</p>
                    </div>
                    <span className="rounded-full coin-badge px-3 py-1 text-sm font-bold text-yellow-300">
                      🪙 {item.cost}
                    </span>
                  </div>
                  <button
                    onClick={() => handleBuyGame(item.id)}
                    disabled={!affordable}
                    className={`w-full rounded-xl py-2.5 font-bold text-white transition ${
                      affordable
                        ? "gradient-btn animate-shimmer"
                        : "cursor-not-allowed bg-gray-700 text-gray-400"
                    }`}
                  >
                    {affordable ? "Play" : "Not enough coins"}
                  </button>
                </div>
              );
            })}
          </div>

          <button
            onClick={handleShopBack}
            className="rounded-xl bg-white/10 border border-white/20 px-6 py-2 text-base font-medium text-gray-300 transition hover:bg-white/20"
          >
            Back to Menu
          </button>
        </div>
      )}

      {/* ── COIN FLIP PHASE ──────────────────────── */}
      {phase === "shop-coin-flip" && (
        <CoinFlipGame
          coinFlipChoice={coinFlipChoice}
          coinFlipResult={coinFlipResult}
          coinFlipAnimating={coinFlipAnimating}
          coins={coins}
          onPick={handleCoinFlipPick}
          onContinue={handleShopGameContinue}
          onPlayAgain={() => handleShopPlayAgain("coin-flip")}
        />
      )}

      {/* ── TREASURE CHEST PHASE ─────────────────── */}
      {phase === "shop-treasure" && (
        <TreasureChestGame
          chests={treasureChests}
          openedIndex={treasureOpenedIndex}
          coins={coins}
          onPick={handleTreasureChestPick}
          onContinue={handleShopGameContinue}
          onPlayAgain={() => handleShopPlayAgain("treasure-chest")}
        />
      )}

      {/* ── SLOT MACHINE PHASE ───────────────────── */}
      {phase === "shop-slots" && (
        <SlotMachineGame
          slotResult={slotResult}
          slotSpinning={slotSpinning}
          slotReelsStopped={slotReelsStopped}
          coins={coins}
          onPull={handleSlotPull}
          onContinue={handleShopGameContinue}
          onPlayAgain={() => handleShopPlayAgain("slot-machine")}
        />
      )}

      {/* ── QUIT SUMMARY PHASE ─────────────────────── */}
      {phase === "quit-summary" && (
        <div className="animate-elastic-bounce flex flex-col items-center gap-4 py-8 text-center">
          <div className="reward-frame rounded-3xl mx-4 px-8 py-8 flex flex-col items-center gap-4">
          <p className="text-5xl">🧠</p>
          <h2 className="gradient-gold text-glow-gold text-3xl font-extrabold">Session Summary</h2>
          <div className="grid w-full max-w-md grid-cols-2 gap-3">
            <StatCard label="Matches" value={sessionScore} highlight />
            <StatCard label="Rounds" value={round} />
            <StatCard label="Coins Earned" value={sessionCoins} />
            <StatCard label="Best Combo" value={`${stats.highestCombo}x`} />
          </div>
          {sessionScore > 0 && sessionScore >= highScore && (
            <p className="font-bold text-yellow-300 text-glow-gold">New High Score! 🏆</p>
          )}
          <button
            onClick={backToMenu}
            className="gradient-btn-gold mt-4 w-full max-w-sm rounded-2xl py-3 text-lg font-bold text-purple-900 shadow-lg"
          >
            Back to Menu
          </button>
          </div>
        </div>
      )}

      {/* ── ACHIEVEMENTS PHASE ─────────────────────── */}
      {phase === "achievements" && (
        <AchievementsPage
          stats={stats}
          achievedMilestones={achievedMilestones}
        />
      )}

      {/* ── Floating Mini-Game Buttons (during gameplay) ── */}
      {phase === "playing" && !miniGameOverlay && (
        <FloatingMiniGameButtons
          coins={coins}
          onOpenMiniGame={handleOverlayBuyGame}
        />
      )}

      {/* ── Mini-Game Overlay (during gameplay) ──────── */}
      {miniGameOverlay && (
        <MiniGameOverlay onClose={handleOverlayContinue}>
          {miniGameOverlay === "coin-flip" && (
            <CoinFlipGame
              coinFlipChoice={coinFlipChoice}
              coinFlipResult={coinFlipResult}
              coinFlipAnimating={coinFlipAnimating}
              coins={coins}
              onPick={handleCoinFlipPick}
              onContinue={handleOverlayContinue}
              onPlayAgain={() => handleOverlayPlayAgain("coin-flip")}
            />
          )}
          {miniGameOverlay === "treasure-chest" && (
            <TreasureChestGame
              chests={treasureChests}
              openedIndex={treasureOpenedIndex}
              coins={coins}
              onPick={handleTreasureChestPick}
              onContinue={handleOverlayContinue}
              onPlayAgain={() => handleOverlayPlayAgain("treasure-chest")}
            />
          )}
          {miniGameOverlay === "slot-machine" && (
            <SlotMachineGame
              slotResult={slotResult}
              slotSpinning={slotSpinning}
              slotReelsStopped={slotReelsStopped}
              coins={coins}
              onPull={handleSlotPull}
              onContinue={handleOverlayContinue}
              onPlayAgain={() => handleOverlayPlayAgain("slot-machine")}
            />
          )}
        </MiniGameOverlay>
      )}

      {/* ── Bottom Tab Bar ───────────────────────────── */}
      <BottomTabBar
        activeTab={activeTab}
        gameInProgress={gameInProgress || savedGamePhase.current !== null}
        onNavigate={handleTabNavigate}
      />

      {/* ── Second Wind Overlay ─────────────────────── */}
      {showSecondWind && (
        <div className="animate-second-wind pointer-events-none fixed inset-0 z-[60] flex items-center justify-center bg-green-500/30 backdrop-blur-sm">
          <div className="text-center">
            <p className="text-5xl font-black text-white drop-shadow-[0_0_20px_rgba(34,197,94,0.8)]">
              ⚡ SECOND WIND ⚡
            </p>
            <p className="mt-2 text-2xl font-bold text-green-300 drop-shadow-lg">
              Energy fully recharged!
            </p>
          </div>
        </div>
      )}

      {/* ── Safety Net Toast ──────────────────────────── */}
      {safetyNetGift !== null && (
        <div className="pointer-events-none fixed bottom-20 left-1/2 z-50 -translate-x-1/2">
          <div className="animate-safety-net rounded-2xl border-2 border-purple-400 bg-navy-800/95 backdrop-blur-md px-5 py-3 shadow-xl text-center">
            <p className="text-sm font-bold text-purple-300">🔬 Lab Emergency Recharge</p>
            <p className="text-lg font-black text-green-400">+{safetyNetGift} ⚡</p>
          </div>
        </div>
      )}

      {/* ── Streak Toast ──────────────────────────────── */}
      {streakToast !== null && (
        <div className="pointer-events-none fixed bottom-20 left-1/2 z-50 -translate-x-1/2">
          <div className="animate-streak-bonus rounded-2xl border-2 border-yellow-400 bg-navy-800/95 backdrop-blur-md px-5 py-3 shadow-xl text-center">
            <p className="text-sm font-bold text-yellow-300">🔥 Streak Bonus!</p>
            <p className="text-lg font-black text-green-400">+{streakToast} ⚡</p>
          </div>
        </div>
      )}

      {/* ── Milestone Toasts ────────────────────────── */}
      <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex flex-col gap-2">
        {milestoneToasts.map((t) => (
          <div
            key={t.key}
            className="animate-milestone pointer-events-auto rounded-2xl border-2 border-gold-premium bg-navy-800/95 backdrop-blur-md px-4 py-3 shadow-xl"
          >
            <p className="text-sm font-bold text-purple-300">🏆 {t.milestone.description}</p>
            <p className="text-sm text-yellow-300 text-glow-gold">
              +{t.milestone.reward.coins} coins, +{t.milestone.reward.energy} energy
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────

function StatCard({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string | number;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-xl p-3 text-center shadow-sm ${
        highlight ? "bg-purple-500/20 border border-purple-500/30" : "panel-dark"
      }`}
    >
      <p className="text-sm text-gray-400">{label}</p>
      <p className={`text-xl font-bold text-number-bold ${highlight ? "text-purple-300" : "text-white"}`}>
        {typeof value === "number" ? value.toLocaleString() : value}
      </p>
    </div>
  );
}
