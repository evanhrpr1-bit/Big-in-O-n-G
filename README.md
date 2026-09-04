# Black Gold Empire

An oil & gas themed city-building strategy game, styled after *Forge of Empires*.
Build rigs, refineries, and offices on a grid; collect resources on a real-time
tick; climb a research tree; and complete contract quests to grow your energy empire.

Currently implements the **Wildcatter Era** foundation described in the design
spec: the core build/collect loop, tech tree, and a starter quest chain.

## Tech stack

- **React 18 + TypeScript**
- **Vite** build tooling
- **Tailwind CSS** for styling (design tokens in `tailwind.config.js`)
- **Zustand** for state management, persisted to **localStorage**
- **lucide-react** for iconography (placeholder art)

## Getting started

```bash
npm install
npm run dev      # start the dev server (http://localhost:5173)
npm run build    # type-check + production build
npm run preview  # preview the production build
npm run lint     # type-check only
```

## Gameplay

- **Build** — pick a structure from the palette and tap an empty lot to place it.
  Tap a placed structure to inspect and upgrade it (levels raise output at an
  escalating cash cost).
- **Resources** — Cash, Crude, Gas, Refined Fuel, and Research Points accumulate
  every couple of seconds. Refineries consume crude to produce fuel.
- **Research** — spend Research Points in the tech tree for production bonuses and
  to unlock the Offshore Platform.
- **Quests** — complete contract objectives (build a derrick, stockpile fuel,
  research a tech) and claim resource rewards.

Progress is saved automatically. Use the reset button in the header to start over.

## Project layout

```
src/
  game/
    types.ts     # shared TypeScript types
    data.ts      # buildings, resources, techs, quests, tuning constants
    store.ts     # Zustand store (state + actions) with persistence + selectors
  components/     # ResourceBar, BuildPalette, Grid, TechTree, QuestLog, ...
  hooks/
    useToast.ts  # transient status-message hook
  App.tsx        # screen composition + production tick
```

## Roadmap

The design spec calls for more than this foundation — later eras and their
building tiers, a continent/expansion map, a market/trading screen, random
events, and Cartel (guild) / PvP features. The data-driven `game/` layer is
structured so new buildings, techs, and quests are added by editing `data.ts`.
