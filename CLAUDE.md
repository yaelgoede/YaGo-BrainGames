# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

YaGo-BrainGames — a brain training website with 7 games across 3 categories (Memory, Math, Words).

## Commands

```bash
bun dev          # Start dev server at localhost:3000
bun run build    # Production build (Turbopack)
bun run lint     # ESLint
```

## Tech Stack

- **Next.js 16** (App Router) with **React 19** and **TypeScript**
- **Tailwind CSS v4** via `@tailwindcss/postcss`
- **Bun** as package manager and runtime
- No backend, no database — scores persist in `localStorage`

## Architecture

### Game pattern

Each game follows a strict separation:

1. **Pure logic** in `lib/games/<game>.ts` — exported functions and types, no React
2. **Page component** in `app/games/<game>/page.tsx` — `"use client"`, manages state, renders UI
3. **Shared wrapper** `components/GameShell.tsx` — provides back button, score/high-score display, timer, restart button, help toggle. It automatically persists high scores to localStorage when the `score` prop changes.

When adding a new game: create the logic file, create the page, and add an entry to the `games` array in `app/page.tsx` to show it on the dashboard.

### Key conventions

- Path alias: `@/*` maps to project root (e.g., `@/lib/utils`, `@/components/GameShell`)
- Use `lib/utils.ts` for shared utilities (currently exports `shuffle<T>`)
- Game pages use a `Phase` type/enum for state machines (e.g., `"idle" | "playing" | "over"`) — avoid separate boolean flags
- Timer-based games must track timeout IDs for cleanup on unmount/restart
- `lib/scores.ts` provides `getHighScore(gameId)` / `setHighScore(gameId, score)` — SSR-safe

### Styling

- Colors defined as CSS custom properties in `app/globals.css` via `@theme inline`
- Category accent colors: blue (Memory), green (Math), purple (Words)
- Font: Geist Sans via `next/font/google`

## Repository

- Remote: https://github.com/yaelgoede/YaGo-BrainGames.git
- Branch: main
