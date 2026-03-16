# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Memory Quest — a never-ending memory card game with Monopoly GO-inspired reward systems (energy, coins, upgrades, milestones).

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

The entire app is one page (`app/page.tsx`) — a "use client" component with a Phase state machine (`"idle" | "playing" | "board-clear" | "over"`).

### File structure

1. **Economy & persistence** in `lib/games/memory-quest-economy.ts` — energy, coins, upgrades, milestones, localStorage I/O (pure functions, no React)
2. **Board & card logic** in `lib/games/memory-quest.ts` — board generation, card types, difficulty progression (pure functions, no React)
3. **Game UI** in `app/page.tsx` — manages all state, renders all phases
4. **Shared utilities** in `lib/utils.ts` (`shuffle`, `randInt`, `pickRandom`)
5. **Sound system** in `lib/sounds.ts` (Web Audio API synth, mute toggle)

### Key systems

- **Energy**: 30 max, 1 per card flip, regenerates 1/minute (timestamp-based)
- **Coins**: earned from matches (combo multiplier) + board clears
- **Upgrades**: infinite procedural tiers via `getUpgrade(level)` — exponential cost scaling
- **Milestones**: ~40 achievement thresholds across 6 stat categories
- **Difficulty**: boards scale from 3x4 pairs to 6x6 quads over 8 rounds, then repeat last config

### Key conventions

- Path alias: `@/*` maps to project root
- Phase state machine — no separate boolean flags
- All game localStorage keys prefixed with `mq-` (exception: `sound-muted` in `lib/sounds.ts`)
- Dynamic grid columns via `style` prop (not Tailwind classes — they'd be purged)
- Animations defined in `app/globals.css` as CSS @keyframes + utility classes

### Styling

- Playful/colorful theme with purple gradients, gold accents
- 3D card flip via CSS transform rotateY + backface-visibility
- Animations: card-flip, card-match, shake, combo-pop, coins-fly, board-enter, milestone-slide, etc.
- Font: Geist Sans via `next/font/google`

## Repository

- Remote: https://github.com/yaelgoede/YaGo-BrainGames.git
- Branch: main
