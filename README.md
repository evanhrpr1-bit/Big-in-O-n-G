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
- **Fleet** — mobile units, plus **Marabou**, the premium currency. Send **sonar
  boats** on survey missions to chart new oil fields, and **deep sea divers** on
  salvage runs for cash, crude, and the occasional rare Marabou. Sonar boats run
  one mission at a time; divers run in parallel. Any mission can be rushed home
  with Marabou. Buy more units with cash or Marabou.
- **Pipelines & ROVs** — every leased field carries a pipeline whose condition
  decays over time, and a field's lease bonus fades in proportion (a field at
  50% condition grants half its uplift). Dispatch an **ROV** to restore one to
  full, or rush the repair with Marabou. More ROVs let you keep more fields
  healthy at once.
- **Cartel** — join one of three cartels for a cooperative bonus that grows with
  your standing: crude output, research output, or market sale prices. Contribute
  cash or research points to raise standing (up to level 5). Membership also
  unlocks **rival operations** — move against Meridian, Atlas, or Consolidated by
  **negotiating a side deal** (safe, modest payoff) or **sabotaging their
  operation** (risky, big payoff). Higher standing improves your odds; a failed
  operation brings retaliation, and there's a cooldown between attempts.
- **Incidents** — blowouts, pipeline ruptures, refinery fires, and regulatory
  inspections strike your operation at random. Each forces a decision: pay to
  fix it properly, or take the free option and eat a temporary production
  penalty. Active penalties are tracked with countdowns under the resource bar.
  Incidents only fire when you have the relevant buildings, and their costs
  scale with your era.
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

All systems from the base design spec are implemented. Cartels and rival
operations run against AI competitors rather than real players — true
multiplayer (shared cartels, live PvP) would need the optional Node/Postgres
backend the spec mentions.

The **Deepwater Expansion** is partially landed: Marabou, sonar boats, divers,
and the pipeline/ROV system are in. Still to come are the Skills tree
(Marabou's main sink), Semi-Submersible Rigs, and Supply Boats.

The expansion spec assumes buildings live *inside* regions, while this game
keeps one shared build grid with regions as leases. Rather than refactor, those
mechanics are adapted to the lease model — pipelines attach to leased fields and
scale their bonus, and the remaining two will follow the same approach.

Mission timers are compressed from the expansion spec's real-world hours to
suit this game's 2-second production tick. Each mission option displays the
spec duration it stands in for, and restoring real-time pacing means changing
only the `ms` values in `SURVEY_OPTIONS` / `SALVAGE_OPTIONS`.

The data-driven `game/` layer is structured so new buildings, techs, quests,
eras, regions, incidents, cartels, rivals, and market tuning are added by
editing `data.ts`.
