# Black Gold Empire

An oil & gas themed city-building strategy game, styled after *Forge of Empires*.
Build rigs, refineries, and offices on a grid; collect resources on a real-time
tick; climb a research tree; and complete contract quests to grow your energy empire.

Progress through five eras — **Wildcatter → Industrial Drilling → Offshore Age →
Modern Refining → Renewable Transition** — each unlocking a new tier of buildings.
Built on the core build/collect loop, tech tree, market, and a starter quest chain.

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
- **Market** — sell crude, gas, and refined fuel for cash at live prices that
  drift every few seconds. Random **price spikes and crashes** reward timing your
  trades. This closes the economic loop: production → market → cash → expansion.
- **Map** — a continent of oil fields. **Scout** a field to survey its yield,
  then **acquire the lease** for a permanent production bonus that applies across
  your whole operation. Richer fields are held by rival companies and priced with
  a buyout premium; new fields open up as you advance eras.
- **Eras** — click the era name in the header to open the era timeline. Meeting
  a resource cost (and sometimes a required tech) advances you to the next era,
  unlocking a new tier of buildings (steel rigs, pipeline hubs, offshore
  platforms, LNG terminals, solar arrays). A pulsing dot on the header signals
  when advancement is available.

Progress is saved automatically. Use the reset button in the header to start over.

## Project layout

```
src/
  game/
    types.ts     # shared TypeScript types
    data.ts      # buildings, resources, techs, quests, tuning constants
    store.ts     # Zustand store (state + actions) with persistence + selectors
  components/     # ResourceBar, BuildPalette, Grid, TechTree, QuestLog, Market, ...
  hooks/
    useToast.ts  # transient status-message hook
  App.tsx        # screen composition + production tick
```

## Roadmap

The design spec calls for more than this foundation — random operational events
(spills, inspections) and Cartel (guild) / PvP features. The data-driven `game/`
layer is structured so new buildings, techs, quests, eras, regions, and market
tuning are added by editing `data.ts`.
