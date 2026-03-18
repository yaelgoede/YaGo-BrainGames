# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Memory Quest — a never-ending memory card game with Monopoly GO-inspired reward systems (energy, coins, upgrades, milestones, mini-games).

## Commands

```bash
bun dev          # Start dev server at localhost:3000
bun run build    # Production build (webpack — Turbopack not used for builds)
bun run lint     # ESLint
```

No test framework is configured.

## Tech Stack

- **Next.js 16** (App Router) with **React 19** and **TypeScript**
- **Tailwind CSS v4** via `@tailwindcss/postcss`
- **Bun** as package manager and runtime
- **Serwist** for PWA service worker (`app/sw.ts`, disabled in dev)
- No backend, no database — all state persists in `localStorage`

## Architecture

### Single-page game

The entire app is one page (`app/page.tsx`) — a `"use client"` component with a Phase state machine (`"idle" | "playing" | "board-clear" | "over"`). This file manages all top-level state and orchestrates phases, overlays, and sub-views.

### Library layer (pure functions, no React)

All game logic lives in `lib/` as pure functions with no React dependencies:

- **`lib/games/memory-quest.ts`** — board generation, card types, difficulty progression (16-round cycle with breather rounds)
- **`lib/games/memory-quest-economy.ts`** — energy, coins, star path (prestige), lab equipment/research, milestones, all localStorage I/O
- **`lib/games/memory-quest-events.ts`** — lucky wheel (weighted segments, spin logic)
- **`lib/games/memory-quest-timed-events.ts`** — timed collectible events, scratch cards, event cooldowns
- **`lib/games/memory-quest-shop.ts`** — coin flip, treasure chest, slot machine (mini gambling games)
- **`lib/storage.ts`** — SSR-safe localStorage helpers (`safe()` for read with fallback, `store()` for write)
- **`lib/utils.ts`** — `shuffle`, `randInt`, `pickRandom`
- **`lib/sounds.ts`** — Web Audio API synth, mute toggle

### Component layer

Components in `components/` are extracted UI pieces rendered by `app/page.tsx`:

- **Mini-games**: `CoinFlipGame`, `TreasureChestGame`, `SlotMachineGame` (each self-contained with auto-play)
- **Overlays/HUD**: `MiniGameOverlay`, `FloatingMiniGameButtons`, `FloatingUpgradeButtons`, `HUDProgressIndicators`
- **Tabs**: `BottomTabBar`, `AchievementsPage`, `ResearchLab`

### Key systems

- **Energy**: 50 base max (expandable via star path + lab), 1 per card flip, regenerates 1/minute (timestamp-based), safety net + second wind mechanics
- **Coins**: earned from matches (combo multiplier) + board clears, spent on star path, lab research, mini-games
- **Star Path**: infinite prestige leveling with cycling bonuses (coin boost, regen reduction, match energy, clear bonus, max energy)
- **Lab**: 6 equipment categories researched over real time, accelerated by gameplay, each providing stacking bonuses
- **Milestones**: ~40 achievement thresholds across 6 stat categories
- **Difficulty**: boards scale from 3×4 pairs to 6×6 quads over 16 rounds, then cycle last 4

### Key conventions

- Path alias: `@/*` maps to project root
- Phase state machine — no separate boolean flags for game state
- All game localStorage keys prefixed with `mq-` (exception: `sound-muted` in `lib/sounds.ts`)
- Dynamic grid columns via `style` prop (not Tailwind classes — they'd be purged)
- Animations defined in `app/globals.css` as CSS `@keyframes` + `.animate-*` utility classes
- All lib modules use `safe()`/`store()` from `lib/storage.ts` for localStorage — never raw `localStorage` calls

### Styling

- Playful/colorful theme with purple gradients, gold accents, dark panels
- 3D card flip via CSS `transform: rotateY()` + `backface-visibility`
- Reusable CSS classes: `.gradient-btn`, `.gradient-btn-gold`, `.panel-dark`, `.panel-dark-strong`, `.reward-frame`, `.glow-bloom`
- Font: Geist Sans via `next/font/google`

## Repository

- Remote: https://github.com/yaelgoede/YaGo-BrainGames.git
- Branch: main
