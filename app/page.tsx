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
  canStartNewEvent,
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
  SLOT_SYMBOL_EMOJIS,
  CHEST_RARITY_COLORS,
  CHEST_RARITY_LABELS,
  canAffordShopItem,
  purchaseShopItem,
  playCoinFlip,
  generateTreasureChests,
  openChest,
  generateSlotResult,
  recordShopPurchase,
} from "@/lib/games/memory-quest-shop";

// ── Types ──────────────────────────────────────────────

type Phase = "idle" | "playing" | "board-clear" | "event-wheel" | "event-scratch" | "quit-summary" | "shop" | "shop-coin-flip" | "shop-treasure" | "shop-slots";

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
    totalMatches: 0, totalBoardsCleared: 0, highestCombo: 0, totalCoinsEarned: 0, highestRound: 0,
  });
  const [achievedMilestones, setAchievedMilestones] = useState<string[]>([]);
  const [highScore, setHighScore] = useState(0);
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

  // ── Helpers ──────────────────────────────────────────

  const config = getBoardConfig(round);
  const matchSize = getMatchSize(round);
  const currentUpgrade = getUpgrade(labLevel);
  const nextUpgrade = getUpgrade(labLevel + 1);

  // Derived state (no useState needed)
  const pendingScratchCard = timedEvent !== null && timedEvent.completed && !timedEvent.rewardClaimed;
  const scratchFinished = scratchPrize !== null || (scratchCells.length > 0 && isScratchComplete(scratchCells));
  const eventTimeRemaining = timedEvent && !timedEvent.completed ? getEventTimeRemaining(timedEvent) : 0;

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
        return; // No energy — block flip, wait for regen
      }
      setEnergy(newEnergy);
      saveEnergy(newEnergy);

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
      const reward = calculateMatchReward(newCombo);
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
        const clearBonus = calculateBoardClearReward(round);
        const clearedCoins = newCoins + clearBonus;
        setCoins(clearedCoins);
        saveCoins(clearedCoins);
        setSessionCoins((sc) => sc + clearBonus);

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
    [locked, phase, cards, flippedIndices, energy, combo, coins, sessionScore, round, matchSize, achievedMilestones, addCoinFloat, showMilestoneToast, eventClears, timedEvent, collectibleIndices, addCollectibleFloat, advanceToNextRound],
  );

  // ── Quit (show summary, then back to idle) ──────────

  const quit = useCallback(() => {
    if (flipBackTimeout.current) clearTimeout(flipBackTimeout.current);
    if (boardClearTimeout.current) clearTimeout(boardClearTimeout.current);
    saveHighScore(sessionScore);
    setHighScore(loadHighScore());
    setPhase("quit-summary");
  }, [sessionScore]);

  const backToMenu = useCallback(() => {
    setPhase("idle");
    setEnergy(loadEnergy());
    setCoins(loadCoins());
    setLabLevel(loadLabLevel());
    setStats(loadStats());
    setAchievedMilestones(loadMilestones());
    setHighScore(loadHighScore());
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
      if (canStartNewEvent()) {
        const newEvent = createNewEvent();
        saveTimedEvent(newEvent);
        setTimedEvent(newEvent);
      } else {
        // Fallback: give extra coins instead
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
          setSlotResult(result);

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

  const cardHeight = config.cols <= 4 ? "h-20 sm:h-24" : config.cols <= 5 ? "h-16 sm:h-20" : "h-14 sm:h-18";
  const cardFontSize = config.cols <= 4 ? "text-3xl sm:text-4xl" : config.cols <= 5 ? "text-2xl sm:text-3xl" : "text-xl sm:text-2xl";

  // ── JSX ──────────────────────────────────────────────

  return (
    <div className="relative pb-8">
      {/* ── Header ──────────────────────────────────── */}
      <div className="mb-4 flex items-center justify-between">
        <h1 className="gradient-text text-2xl font-extrabold tracking-tight sm:text-3xl">
          Memory Quest
        </h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowHelp((h) => !h)}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-purple-100 text-purple-600 transition hover:bg-purple-200"
            title="Help"
          >
            ?
          </button>
          <button
            onClick={handleMute}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-purple-100 text-purple-600 transition hover:bg-purple-200"
            title={muted ? "Unmute" : "Mute"}
          >
            {muted ? "🔇" : "🔊"}
          </button>
        </div>
      </div>

      {/* ── Help Panel ──────────────────────────────── */}
      {showHelp && (
        <div className="animate-bounce-in mb-4 rounded-2xl bg-white/80 p-4 text-sm text-gray-700 shadow-lg backdrop-blur-sm">
          <p className="mb-2 font-semibold text-purple-700">How to Play</p>
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
      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl bg-white/70 p-3 shadow-md backdrop-blur-sm">
        {/* Energy */}
        <div className="flex flex-1 items-center gap-2">
          <span className={`text-lg ${energy.amount <= 5 ? "animate-energy-pulse" : ""}`}>
            ⚡
          </span>
          <div className="flex-1">
            <div className={`h-3 overflow-hidden rounded-full bg-gray-200 ${energyOverflow ? "animate-glow-gold" : ""}`}>
              <div
                className={`h-full rounded-full transition-all duration-300 ${energyOverflow ? "bg-gradient-to-r from-yellow-400 to-amber-400" : "energy-bar-gradient"}`}
                style={{ width: `${energyPercent}%` }}
              />
            </div>
            <p className="mt-0.5 text-xs text-gray-500">
              {energy.amount}/{MAX_ENERGY}
              {energyOverflow && (
                <span className="ml-1 font-bold text-amber-500">OVERCHARGED</span>
              )}
              {!energyOverflow && energy.amount < MAX_ENERGY && timeToNextEnergy > 0 && (
                <span className="ml-1 text-gray-400">+1 in {timeToNextEnergy}s</span>
              )}
            </p>
          </div>
        </div>

        {/* Coins */}
        <div className="flex items-center gap-1 rounded-xl bg-gold-100 px-3 py-1.5">
          <span>🪙</span>
          <span className="font-bold text-gold-600">{coins.toLocaleString()}</span>
        </div>

        {/* Round (during game) */}
        {phase === "playing" && (
          <div className="flex items-center gap-1 rounded-xl bg-purple-100 px-3 py-1.5">
            <span className="text-sm font-semibold text-purple-700">R{round}</span>
          </div>
        )}

        {/* Combo (during game) */}
        {phase === "playing" && combo > 1 && (
          <div
            className={`flex items-center gap-1 rounded-xl bg-green-100 px-3 py-1.5 font-bold text-green-600 ${
              comboAnim ? "animate-combo-pop" : ""
            }`}
          >
            {combo}x
          </div>
        )}
      </div>

      {/* ── IDLE PHASE ──────────────────────────────── */}
      {phase === "idle" && (
        <div className="animate-bounce-in flex flex-col items-center gap-6 py-6">
          {/* Lab Display */}
          <div className="flex flex-col items-center gap-2">
            <div className="animate-upgrade-glow flex h-24 w-24 items-center justify-center rounded-3xl bg-purple-100 text-5xl">
              {currentUpgrade.emoji}
            </div>
            <p className="font-bold text-purple-700">{currentUpgrade.name}</p>
            <p className="text-xs text-gray-400">Lab Level {labLevel}</p>
          </div>

          {/* Upgrade Button */}
          <button
            onClick={() => setShowLab((l) => !l)}
            className="rounded-xl bg-purple-100 px-4 py-2 text-sm font-semibold text-purple-700 transition hover:bg-purple-200"
          >
            {showLab ? "Hide Lab" : "Upgrade Lab"}
          </button>

          {showLab && (
            <div className="animate-bounce-in w-full max-w-sm rounded-2xl bg-white/80 p-4 shadow-lg backdrop-blur-sm">
              <p className="mb-2 text-center text-sm font-semibold text-gray-600">Next Upgrade</p>
              <div className="mb-3 flex items-center justify-center gap-3">
                <span className="text-3xl">{nextUpgrade.emoji}</span>
                <div>
                  <p className="font-bold text-purple-700">{nextUpgrade.name}</p>
                  <p className="text-sm text-gold-600">🪙 {nextUpgrade.cost.toLocaleString()}</p>
                </div>
              </div>
              <button
                onClick={handleUpgrade}
                disabled={!canAffordUpgrade(coins, labLevel)}
                className={`w-full rounded-xl py-2.5 font-bold text-white transition ${
                  canAffordUpgrade(coins, labLevel)
                    ? "gradient-btn animate-shimmer"
                    : "cursor-not-allowed bg-gray-300"
                }`}
              >
                {canAffordUpgrade(coins, labLevel) ? "Purchase" : "Not enough coins"}
              </button>
            </div>
          )}

          {/* Shop Button */}
          <button
            onClick={handleOpenShop}
            className="rounded-xl bg-gold-100 px-4 py-2 text-sm font-semibold text-gold-600 transition hover:bg-gold-300"
          >
            🏪 Shop
          </button>

          {/* Stats */}
          <div className="grid w-full max-w-sm grid-cols-2 gap-3">
            <StatCard label="Total Matches" value={stats.totalMatches} />
            <StatCard label="Boards Cleared" value={stats.totalBoardsCleared} />
            <StatCard label="Best Combo" value={`${stats.highestCombo}x`} />
            <StatCard label="Best Round" value={stats.highestRound} />
          </div>

          {highScore > 0 && (
            <p className="text-sm text-purple-500">
              High Score: <span className="font-bold">{highScore}</span> matches in one run
            </p>
          )}

          {/* Start Button */}
          <button
            onClick={start}
            className="gradient-btn animate-gradient w-full max-w-xs rounded-2xl bg-[length:200%_200%] py-4 text-xl font-extrabold text-white shadow-lg transition"
          >
            Start Quest
          </button>
          <p className="text-xs text-gray-400">or press Enter</p>
        </div>
      )}

      {/* ── PLAYING PHASE ───────────────────────────── */}
      {phase === "playing" && (
        <div className="relative">
          {/* Quit button */}
          <div className="mb-2 flex justify-end">
            <button
              onClick={quit}
              className="rounded-lg bg-gray-100 px-3 py-1 text-xs font-medium text-gray-500 transition hover:bg-gray-200 hover:text-gray-700"
            >
              Quit
            </button>
          </div>

          {/* Event HUD Banner */}
          {timedEvent && !timedEvent.completed && !isEventExpired(timedEvent) && (
            <div
              className="animate-event-pulse mb-3 flex items-center justify-between gap-3 rounded-2xl bg-white/80 px-4 py-2.5 shadow-md backdrop-blur-sm"
              style={{ "--event-color": `${timedEvent.theme.color}40` } as React.CSSProperties}
            >
              <div className="flex items-center gap-2">
                <span className="text-lg">{timedEvent.theme.collectibleEmoji}</span>
                <div>
                  <p className="text-xs font-bold" style={{ color: timedEvent.theme.color }}>
                    {timedEvent.theme.name}
                  </p>
                  <p className="text-xs text-gray-400">
                    <span
                      className="mr-1 inline-block rounded-full px-1.5 py-0.5 text-[10px] font-bold text-white"
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
                  <div className="h-2.5 overflow-hidden rounded-full bg-gray-200">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${Math.min(100, (timedEvent.collected / timedEvent.target) * 100)}%`,
                        backgroundColor: timedEvent.theme.color,
                      }}
                    />
                  </div>
                </div>
                <span className="text-xs font-bold text-gray-600">
                  {timedEvent.collected}/{timedEvent.target}
                </span>
              </div>
            </div>
          )}

          {/* Match size indicator */}
          {matchSize > 2 && (
            <div className="mb-3 text-center">
              <span className="animate-bounce-in inline-block rounded-full bg-purple-600 px-4 py-1 text-sm font-bold text-white shadow-md">
                Match {matchSize}!
              </span>
            </div>
          )}

          {/* Card Grid */}
          <div
            ref={gridRef}
            className="relative mx-auto grid gap-2"
            style={{ gridTemplateColumns: `repeat(${config.cols}, 1fr)`, maxWidth: `${config.cols * 80}px` }}
          >
            {cards.map((card, i) => {
              const isFlipped = card.flipped || card.matched;
              const justMatched = matchedIds.has(i);
              const isShaking = shakeIds.has(i);

              return (
                <div
                  key={card.id}
                  className={`card-container ${cardHeight} relative cursor-pointer ${
                    boardEntering ? "animate-board-enter" : ""
                  } ${boardClearing ? "animate-board-clear" : ""}`}
                  style={boardEntering ? { animationDelay: `${i * 30}ms` } : undefined}
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
                        i === focusedIndex && !card.matched ? "ring-3 ring-purple-400 ring-offset-2" : ""
                      } ${card.matched ? "opacity-50" : "hover:brightness-110"}`}
                    >
                      <span className="text-white/80">?</span>
                    </div>
                    {/* Front face (emoji side) */}
                    <div
                      className={`card-front ${cardFontSize} select-none ${
                        card.matched ? "card-shadow-matched opacity-70" : "card-shadow"
                      } ${i === focusedIndex && !card.matched ? "ring-3 ring-purple-400 ring-offset-2" : ""}`}
                    >
                      {card.emoji}
                    </div>
                  </div>
                  {/* Collectible badge */}
                  {collectibleIndices.has(i) && !card.matched && timedEvent && (
                    <div className="animate-collectible-sparkle pointer-events-none absolute -right-1 -top-1 z-10 text-sm">
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
            <div className="animate-bounce-in mt-4 flex flex-col items-center gap-2 rounded-2xl bg-white/90 py-4 shadow-lg backdrop-blur-sm">
              <span className="animate-energy-pulse text-3xl">⚡</span>
              <p className="font-bold text-purple-700">Waiting for energy...</p>
              {timeToNextEnergy > 0 && (
                <p className="text-sm text-gray-500">+1 in {timeToNextEnergy}s</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── BOARD CLEAR PHASE ───────────────────────── */}
      {phase === "board-clear" && (
        <div className="animate-bounce-in flex flex-col items-center gap-4 py-12 text-center">
          <p className="text-5xl">🎉</p>
          <h2 className="gradient-text text-3xl font-extrabold">Board Cleared!</h2>
          <p className="text-lg text-gray-600">Round {round} complete</p>
          <div className="flex items-center gap-2 text-lg">
            <span>🪙</span>
            <span className="font-bold text-gold-600">+{boardCoins.toLocaleString()} coins</span>
          </div>
          <div className="mt-4 rounded-2xl bg-white/70 px-6 py-3 shadow-md backdrop-blur-sm">
            <p className="text-sm text-gray-500">Next up:</p>
            <p className="font-bold text-purple-700">
              {getBoardConfig(round + 1).rows}x{getBoardConfig(round + 1).cols} board
              {getMatchSize(round + 1) > 2 && (
                <span className="ml-2 rounded-full bg-purple-100 px-2 py-0.5 text-xs">
                  Match {getMatchSize(round + 1)}
                </span>
              )}
            </p>
          </div>
        </div>
      )}

      {/* ── LUCKY WHEEL PHASE ─────────────────────── */}
      {phase === "event-wheel" && (
        <div className="animate-bounce-in flex flex-col items-center gap-6 py-6">
          <h2 className="gradient-text text-2xl font-extrabold">Lucky Wheel!</h2>
          <p className="text-sm text-gray-500">Spin to win coins & energy</p>

          {/* Wheel container */}
          <div className="relative">
            {/* Pointer */}
            <div className={`absolute -top-3 left-1/2 z-10 -translate-x-1/2 text-2xl ${!wheelSpinning && !wheelShowResult ? "animate-pointer-bounce" : ""}`}>
              ▼
            </div>

            {/* Wheel */}
            <div
              className="relative h-64 w-64 rounded-full border-4 border-purple-300 shadow-xl sm:h-72 sm:w-72"
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
              className={`w-full max-w-xs rounded-2xl py-4 text-xl font-extrabold text-white shadow-lg transition ${
                wheelSpinning
                  ? "cursor-not-allowed bg-gray-400"
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
                        ? "animate-glow-gold border-2 border-gold-400 bg-gold-100"
                        : WHEEL_SEGMENTS[wheelResult].coins === 0 && WHEEL_SEGMENTS[wheelResult].energy === 0
                        ? "border-2 border-red-400 bg-red-100"
                        : "border-2 border-purple-300 bg-purple-100"
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
                      <p className="text-sm text-gold-600">
                        +{WHEEL_SEGMENTS[wheelResult].coins} coins & +{WHEEL_SEGMENTS[wheelResult].energy} energy
                      </p>
                    )}
                  </div>
                  <button
                    onClick={handleWheelContinue}
                    className="gradient-btn w-full max-w-xs rounded-2xl py-3 text-lg font-bold text-white shadow-lg"
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
              <h2 className="gradient-text text-2xl font-extrabold">Scratch Card!</h2>
              <p className="text-xs text-gray-500">
                <span
                  className="mr-1 inline-block rounded-full px-1.5 py-0.5 text-[10px] font-bold text-white"
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
            style={{ gridTemplateColumns: "repeat(3, 1fr)", maxWidth: "240px" }}
          >
            {scratchCells.map((cell, i) => {
              const isWinner = scratchPrize && cell.revealed && cell.symbol === scratchPrize.symbol;
              return (
                <button
                  key={i}
                  onClick={() => handleScratchReveal(i)}
                  disabled={cell.revealed || scratchFinished}
                  className={`flex h-20 w-20 items-center justify-center rounded-xl text-3xl transition-all ${
                    cell.revealed
                      ? isWinner
                        ? "animate-scratch-win border-2 border-gold-400 bg-gold-100"
                        : "border-2 border-gray-200 bg-white"
                      : "scratch-cover cursor-pointer border-2 border-purple-300 hover:brightness-110"
                  } ${cell.revealed ? "animate-scratch-reveal" : ""}`}
                >
                  {cell.revealed ? cell.emoji : "?"}
                </button>
              );
            })}
          </div>

          {/* Result */}
          {scratchFinished && (
            <div className="animate-prize-pop flex flex-col items-center gap-3">
              {scratchPrize && (scratchPrize.coins > 0 || scratchPrize.energy > 0) ? (
                <div className="animate-glow-gold rounded-2xl border-2 border-gold-400 bg-gold-100 px-6 py-4 text-center shadow-lg">
                  <p className="text-lg font-bold text-gold-600">You Won!</p>
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
                <div className="rounded-2xl border-2 border-red-400 bg-red-100 px-6 py-4 text-center shadow-lg">
                  <p className="text-lg font-bold">💀 No luck this time!</p>
                </div>
              )}
              <button
                onClick={handleScratchContinue}
                className="gradient-btn w-full max-w-xs rounded-2xl py-3 text-lg font-bold text-white shadow-lg"
              >
                Continue
              </button>
            </div>
          )}

          {!scratchFinished && (
            <p className="text-xs text-gray-400">Tap cells to reveal symbols</p>
          )}
        </div>
      )}

      {/* ── SHOP PHASE ────────────────────────────── */}
      {phase === "shop" && (
        <div className="animate-bounce-in flex flex-col items-center gap-6 py-6">
          <h2 className="gradient-gold text-2xl font-extrabold">🏪 Shop</h2>
          <p className="text-sm text-gray-500">Spend coins on mini games for a chance to win big!</p>

          <div className="flex w-full max-w-sm flex-col gap-4">
            {SHOP_ITEMS.map((item) => {
              const affordable = canAffordShopItem(coins, item);
              return (
                <div
                  key={item.id}
                  className={`rounded-2xl bg-white/80 p-4 shadow-lg backdrop-blur-sm transition ${
                    affordable ? "animate-shop-item-hover" : "opacity-60"
                  }`}
                >
                  <div className="mb-2 flex items-center gap-3">
                    <span className="text-3xl">{item.emoji}</span>
                    <div className="flex-1">
                      <p className="font-bold text-gray-800">{item.name}</p>
                      <p className="text-xs text-gray-500">{item.description}</p>
                    </div>
                    <span className="rounded-full bg-gold-100 px-3 py-1 text-sm font-bold text-gold-600">
                      🪙 {item.cost}
                    </span>
                  </div>
                  <button
                    onClick={() => handleBuyGame(item.id)}
                    disabled={!affordable}
                    className={`w-full rounded-xl py-2.5 font-bold text-white transition ${
                      affordable
                        ? "gradient-btn animate-shimmer"
                        : "cursor-not-allowed bg-gray-300"
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
            className="rounded-xl bg-gray-100 px-6 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-200"
          >
            Back to Menu
          </button>
        </div>
      )}

      {/* ── COIN FLIP PHASE ──────────────────────── */}
      {phase === "shop-coin-flip" && (
        <div className="animate-bounce-in flex flex-col items-center gap-6 py-6">
          <h2 className="gradient-gold text-2xl font-extrabold">🪙 Coin Flip</h2>
          <p className="text-sm text-gray-500">Pick a side — 50/50 shot!</p>

          {/* Coin display */}
          <div
            className={`flex h-32 w-32 items-center justify-center rounded-full text-6xl ${
              coinFlipAnimating ? "animate-coin-spin" : ""
            } ${
              coinFlipResult
                ? coinFlipResult.won
                  ? "bg-gold-100 shadow-lg"
                  : "bg-gray-200"
                : "bg-gradient-to-br from-gold-300 to-gold-500 shadow-lg"
            }`}
            style={{ perspective: "600px" }}
          >
            {coinFlipResult
              ? coinFlipResult.outcome === "heads" ? "👑" : "🛡️"
              : coinFlipChoice
                ? coinFlipChoice === "heads" ? "👑" : "🛡️"
                : "🪙"}
          </div>

          {/* Choice buttons or result */}
          {!coinFlipResult && !coinFlipAnimating && (
            <div className="flex gap-4">
              <button
                onClick={() => handleCoinFlipPick("heads")}
                className="rounded-2xl bg-gold-100 px-8 py-4 text-center transition hover:bg-gold-300"
              >
                <span className="block text-3xl">👑</span>
                <span className="mt-1 block text-sm font-bold text-gold-600">Heads</span>
              </button>
              <button
                onClick={() => handleCoinFlipPick("tails")}
                className="rounded-2xl bg-purple-100 px-8 py-4 text-center transition hover:bg-purple-200"
              >
                <span className="block text-3xl">🛡️</span>
                <span className="mt-1 block text-sm font-bold text-purple-700">Tails</span>
              </button>
            </div>
          )}

          {coinFlipAnimating && (
            <p className="text-lg font-bold text-gray-500">Flipping...</p>
          )}

          {coinFlipResult && (
            <div className="animate-reward-reveal flex flex-col items-center gap-3">
              <div
                className={`rounded-2xl px-6 py-4 text-center shadow-lg ${
                  coinFlipResult.won
                    ? "animate-glow-gold border-2 border-gold-400 bg-gold-100"
                    : "border-2 border-red-400 bg-red-100"
                }`}
              >
                <p className="text-lg font-bold">
                  {coinFlipResult.won ? "You Won!" : "No luck!"}
                </p>
                <p className="text-sm text-gray-600">
                  It was {coinFlipResult.outcome === "heads" ? "👑 Heads" : "🛡️ Tails"}
                </p>
                {coinFlipResult.won && (
                  <div className="mt-2 flex items-center justify-center gap-3">
                    {coinFlipResult.reward.coins > 0 && (
                      <span className="font-bold">🪙 +{coinFlipResult.reward.coins}</span>
                    )}
                    {coinFlipResult.reward.energy > 0 && (
                      <span className="font-bold">⚡ +{coinFlipResult.reward.energy}</span>
                    )}
                  </div>
                )}
              </div>
              <button
                onClick={handleShopGameContinue}
                className="gradient-btn w-full max-w-xs rounded-2xl py-3 text-lg font-bold text-white shadow-lg"
              >
                Continue
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── TREASURE CHEST PHASE ─────────────────── */}
      {phase === "shop-treasure" && (
        <div className="animate-bounce-in flex flex-col items-center gap-6 py-6">
          <h2 className="gradient-gold text-2xl font-extrabold">📦 Treasure Chest</h2>
          <p className="text-sm text-gray-500">Pick a chest — every one has a prize!</p>

          <div className="flex gap-4">
            {treasureChests.map((chest, i) => {
              const isSelected = treasureOpenedIndex === i;
              const isOther = treasureOpenedIndex !== null && treasureOpenedIndex !== i;

              return (
                <button
                  key={chest.id}
                  onClick={() => handleTreasureChestPick(i)}
                  disabled={treasureOpenedIndex !== null}
                  className={`flex h-28 w-24 flex-col items-center justify-center rounded-2xl text-center transition ${
                    isSelected
                      ? "animate-chest-open shadow-xl"
                      : isOther
                        ? "animate-chest-fade"
                        : "animate-chest-wiggle cursor-pointer hover:scale-105"
                  } ${
                    isSelected
                      ? "border-2 bg-white"
                      : "bg-gradient-to-b from-purple-200 to-purple-400 shadow-lg"
                  }`}
                  style={isSelected ? { borderColor: CHEST_RARITY_COLORS[chest.rarity] } : undefined}
                >
                  {isSelected ? (
                    <>
                      <span className="text-3xl">{chest.reward.triggerEvent ? "⭐" : chest.reward.coins > 0 ? "🪙" : "⚡"}</span>
                      <span
                        className="mt-1 text-[10px] font-bold"
                        style={{ color: CHEST_RARITY_COLORS[chest.rarity] }}
                      >
                        {CHEST_RARITY_LABELS[chest.rarity]}
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="text-4xl">📦</span>
                      <span className="mt-1 text-xs font-bold text-white">#{i + 1}</span>
                    </>
                  )}
                </button>
              );
            })}
          </div>

          {/* Opened chest result */}
          {treasureOpenedIndex !== null && treasureChests[treasureOpenedIndex] && (
            <div className="animate-reward-reveal flex flex-col items-center gap-3">
              <div
                className="rounded-2xl border-2 px-6 py-4 text-center shadow-lg"
                style={{ borderColor: CHEST_RARITY_COLORS[treasureChests[treasureOpenedIndex].rarity], backgroundColor: `${CHEST_RARITY_COLORS[treasureChests[treasureOpenedIndex].rarity]}15` }}
              >
                <p className="text-lg font-bold" style={{ color: CHEST_RARITY_COLORS[treasureChests[treasureOpenedIndex].rarity] }}>
                  {CHEST_RARITY_LABELS[treasureChests[treasureOpenedIndex].rarity]} Chest!
                </p>
                <div className="mt-2 flex items-center justify-center gap-3">
                  {treasureChests[treasureOpenedIndex].reward.coins > 0 && (
                    <span className="font-bold">🪙 +{treasureChests[treasureOpenedIndex].reward.coins}</span>
                  )}
                  {treasureChests[treasureOpenedIndex].reward.energy > 0 && (
                    <span className="font-bold">⚡ +{treasureChests[treasureOpenedIndex].reward.energy}</span>
                  )}
                  {treasureChests[treasureOpenedIndex].reward.triggerEvent && (
                    <span className="font-bold">🌟 Event!</span>
                  )}
                </div>
              </div>
              <button
                onClick={handleShopGameContinue}
                className="gradient-btn w-full max-w-xs rounded-2xl py-3 text-lg font-bold text-white shadow-lg"
              >
                Continue
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── SLOT MACHINE PHASE ───────────────────── */}
      {phase === "shop-slots" && (
        <div className="animate-bounce-in flex flex-col items-center gap-6 py-6">
          <h2 className="gradient-gold text-2xl font-extrabold">🎰 Slot Machine</h2>
          <p className="text-sm text-gray-500">Match symbols to win — triple 7s for the jackpot!</p>

          {/* Reels */}
          <div
            className={`flex items-center gap-3 rounded-2xl bg-gray-900 px-6 py-5 shadow-xl ${
              slotResult?.isJackpot ? "animate-slot-jackpot" : ""
            }`}
          >
            {[0, 1, 2].map((i) => {
              const stopped = slotReelsStopped[i];
              const symbol = slotResult?.reels[i];
              const isMatch = slotResult && slotResult.matchCount >= 2 && symbol === slotResult.reels[0];

              return (
                <div
                  key={i}
                  className={`flex h-20 w-20 items-center justify-center rounded-xl text-4xl transition-all ${
                    stopped && symbol
                      ? isMatch
                        ? "bg-gold-100 shadow-md"
                        : "bg-white"
                      : slotSpinning
                        ? "animate-reel-blur bg-white/80"
                        : "bg-white"
                  }`}
                >
                  {stopped && symbol
                    ? SLOT_SYMBOL_EMOJIS[symbol]
                    : slotSpinning
                      ? "?"
                      : "🎰"}
                </div>
              );
            })}
          </div>

          {/* Pull or Result */}
          {!slotResult && !slotSpinning && (
            <button
              onClick={handleSlotPull}
              className="gradient-btn animate-gradient w-full max-w-xs rounded-2xl bg-[length:200%_200%] py-4 text-xl font-extrabold text-white shadow-lg transition"
            >
              Pull!
            </button>
          )}

          {slotSpinning && (
            <p className="text-lg font-bold text-gray-500">Spinning...</p>
          )}

          {slotResult && (
            <div className="animate-reward-reveal flex flex-col items-center gap-3">
              <div
                className={`rounded-2xl px-6 py-4 text-center shadow-lg ${
                  slotResult.isJackpot
                    ? "animate-glow-gold border-2 border-gold-400 bg-gold-100"
                    : slotResult.reward.coins === 0 && slotResult.reward.energy === 0
                      ? "border-2 border-red-400 bg-red-100"
                      : slotResult.matchCount === 3
                        ? "border-2 border-purple-400 bg-purple-100"
                        : "border-2 border-blue-300 bg-blue-50"
                }`}
              >
                <p className="text-lg font-bold">
                  {slotResult.isJackpot
                    ? "🎉 JACKPOT!"
                    : slotResult.reward.coins === 0 && slotResult.reward.energy === 0
                      ? "💀 Bust!"
                      : slotResult.matchCount === 3
                        ? "Triple Match!"
                        : slotResult.matchCount === 2
                          ? "Double Match!"
                          : "Consolation Prize"}
                </p>
                {(slotResult.reward.coins > 0 || slotResult.reward.energy > 0) && (
                  <div className="mt-2 flex items-center justify-center gap-3">
                    {slotResult.reward.coins > 0 && (
                      <span className="font-bold">🪙 +{slotResult.reward.coins}</span>
                    )}
                    {slotResult.reward.energy > 0 && (
                      <span className="font-bold">⚡ +{slotResult.reward.energy}</span>
                    )}
                    {slotResult.reward.triggerEvent && (
                      <span className="font-bold">🌟 Event!</span>
                    )}
                  </div>
                )}
              </div>
              <button
                onClick={handleShopGameContinue}
                className="gradient-btn w-full max-w-xs rounded-2xl py-3 text-lg font-bold text-white shadow-lg"
              >
                Continue
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── QUIT SUMMARY PHASE ─────────────────────── */}
      {phase === "quit-summary" && (
        <div className="animate-bounce-in flex flex-col items-center gap-4 py-8 text-center">
          <p className="text-5xl">🧠</p>
          <h2 className="gradient-text text-3xl font-extrabold">Session Summary</h2>
          <div className="grid w-full max-w-sm grid-cols-2 gap-3">
            <StatCard label="Matches" value={sessionScore} highlight />
            <StatCard label="Rounds" value={round} />
            <StatCard label="Coins Earned" value={sessionCoins} />
            <StatCard label="Best Combo" value={`${stats.highestCombo}x`} />
          </div>
          {sessionScore > 0 && sessionScore >= highScore && (
            <p className="font-bold text-gold-500">New High Score! 🏆</p>
          )}
          <button
            onClick={backToMenu}
            className="gradient-btn mt-4 w-full max-w-xs rounded-2xl py-3 text-lg font-bold text-white shadow-lg"
          >
            Back to Menu
          </button>
        </div>
      )}

      {/* ── Milestone Toasts ────────────────────────── */}
      <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex flex-col gap-2">
        {milestoneToasts.map((t) => (
          <div
            key={t.key}
            className="animate-milestone pointer-events-auto rounded-2xl border-2 border-gold-400 bg-white px-4 py-3 shadow-xl"
          >
            <p className="text-sm font-bold text-purple-700">🏆 {t.milestone.description}</p>
            <p className="text-xs text-gold-600">
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
        highlight ? "bg-purple-100" : "bg-white/70 backdrop-blur-sm"
      }`}
    >
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`text-lg font-bold ${highlight ? "text-purple-700" : "text-gray-800"}`}>
        {typeof value === "number" ? value.toLocaleString() : value}
      </p>
    </div>
  );
}
