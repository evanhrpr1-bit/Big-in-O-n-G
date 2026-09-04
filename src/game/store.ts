import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  BUILDING_TYPES,
  MARKET,
  QUESTS,
  RESOURCE_META,
  SELLABLE,
  STARTING_RESOURCES,
  TECHS,
  makeEmptyGrid,
  startingPrices,
  upgradeCostFor,
} from "./data";
import type {
  BuildingTypeKey,
  MarketEvent,
  MarketPrices,
  PlacedBuilding,
  ProductionBonuses,
  Quest,
  Resources,
  SellableResource,
  Tech,
} from "./types";

type Grid = (PlacedBuilding | null)[];

const NEUTRAL_BONUSES: ProductionBonuses = {
  cash: 1,
  crude: 1,
  gas: 1,
  fuel: 1,
  research: 1,
};

export interface GameState {
  resources: Resources;
  grid: Grid;
  researchedTechs: string[];
  claimedQuests: string[];
  techBonuses: ProductionBonuses;
  prices: MarketPrices;
  marketEvent: MarketEvent | null;

  /** Advance production by one tick. */
  tick: () => void;
  /** Re-roll market prices and advance any active market event. */
  marketTick: () => void;
  /** Sell up to `qty` units of a commodity at the live price (Infinity = all). */
  sell: (resource: SellableResource, qty: number) => string;
  /** Place `type` at `index` if affordable and unlocked. Returns a status message. */
  build: (index: number, type: BuildingTypeKey) => string;
  /** Upgrade the building at `index`. Returns a status message. */
  upgrade: (index: number) => string;
  /** Research a tech node. Returns a status message. */
  research: (techId: string) => string;
  /** Claim the reward for a completed quest. Returns a status message. */
  claimQuest: (questId: string) => string;
  /** Wipe the save and start over. */
  reset: () => void;
}

/** Recompute the full bonus map from the set of researched techs. */
function bonusesFrom(researchedTechs: string[]): ProductionBonuses {
  const bonuses: ProductionBonuses = { ...NEUTRAL_BONUSES };
  for (const techId of researchedTechs) {
    const tech = TECHS.find((t) => t.id === techId);
    if (!tech) continue;
    for (const [res, mult] of Object.entries(tech.effect)) {
      const key = res as keyof ProductionBonuses;
      bonuses[key] = bonuses[key] * (mult as number);
    }
  }
  return bonuses;
}

export const useGame = create<GameState>()(
  persist(
    (set, get) => ({
      resources: { ...STARTING_RESOURCES },
      grid: makeEmptyGrid(),
      researchedTechs: [],
      claimedQuests: [],
      techBonuses: { ...NEUTRAL_BONUSES },
      prices: startingPrices(),
      marketEvent: null,

      tick: () =>
        set((state) => {
          const next: Resources = { ...state.resources };
          for (const cell of state.grid) {
            if (!cell) continue;
            const type = BUILDING_TYPES[cell.type];
            const mult = state.techBonuses[type.resource] ?? 1;
            const amount = type.baseRate * cell.level * mult;
            if (type.consumes) {
              const [consumeRes, consumeQty] = Object.entries(type.consumes)[0];
              const key = consumeRes as keyof Resources;
              const required = (consumeQty as number) * cell.level;
              if (next[key] >= required) {
                next[key] -= required;
                next[type.resource] += amount;
              }
            } else {
              next[type.resource] += amount;
            }
          }
          return { resources: next };
        }),

      marketTick: () =>
        set((state) => {
          // Mean-reverting random walk within [min, max] per commodity.
          const prices: MarketPrices = { ...state.prices };
          for (const r of SELLABLE) {
            const base = MARKET.base[r];
            const revert = (base - prices[r]) * MARKET.reversion;
            const noise = base * MARKET.drift * (Math.random() * 2 - 1);
            const p = prices[r] + revert + noise;
            prices[r] = Math.max(MARKET.min[r], Math.min(MARKET.max[r], p));
          }

          // Advance or possibly spawn a market event.
          let marketEvent = state.marketEvent;
          if (marketEvent) {
            const ticksLeft = marketEvent.ticksLeft - 1;
            marketEvent = ticksLeft <= 0 ? null : { ...marketEvent, ticksLeft };
          } else if (Math.random() < MARKET.eventChance) {
            const resource = SELLABLE[Math.floor(Math.random() * SELLABLE.length)];
            const spike = Math.random() < 0.5;
            const label = RESOURCE_META[resource].label;
            marketEvent = {
              resource,
              kind: spike ? "spike" : "crash",
              mult: spike ? MARKET.spikeMult : MARKET.crashMult,
              label: `${label} ${spike ? "price spike" : "price crash"}`,
              ticksLeft: MARKET.eventDurationTicks,
            };
          }

          return { prices, marketEvent };
        }),

      sell: (resource, qty) => {
        const state = get();
        const label = RESOURCE_META[resource].label;
        const have = Math.floor(state.resources[resource]);
        const amount = Math.min(qty, have);
        if (amount <= 0) return `No ${label.toLowerCase()} to sell`;
        const price = effectivePrice(resource, state.prices, state.marketEvent);
        const proceeds = Math.floor(price * amount);
        set({
          resources: {
            ...state.resources,
            [resource]: state.resources[resource] - amount,
            cash: state.resources.cash + proceeds,
          },
        });
        return `Sold ${amount} ${label} for $${proceeds}`;
      },

      build: (index, type) => {
        const state = get();
        if (state.grid[index]) return "That lot is already occupied";
        const meta = BUILDING_TYPES[type];
        if (meta.requiresTech && !state.researchedTechs.includes(meta.requiresTech)) {
          return `Research required to build ${meta.name}`;
        }
        if (state.resources.cash < meta.cost) {
          return `Not enough cash for a ${meta.name}`;
        }
        const grid = [...state.grid];
        grid[index] = { type, level: 1 };
        set({
          grid,
          resources: { ...state.resources, cash: state.resources.cash - meta.cost },
        });
        return `${meta.name} built`;
      },

      upgrade: (index) => {
        const state = get();
        const cell = state.grid[index];
        if (!cell) return "Nothing to upgrade";
        const meta = BUILDING_TYPES[cell.type];
        const cost = upgradeCostFor(meta, cell.level);
        if (state.resources.cash < cost) return "Not enough cash to upgrade";
        const grid = [...state.grid];
        grid[index] = { ...cell, level: cell.level + 1 };
        set({
          grid,
          resources: { ...state.resources, cash: state.resources.cash - cost },
        });
        return `${meta.name} upgraded to level ${cell.level + 1}`;
      },

      research: (techId) => {
        const state = get();
        if (state.researchedTechs.includes(techId)) return "Already researched";
        const tech = TECHS.find((t) => t.id === techId);
        if (!tech) return "Unknown technology";
        if (!tech.requires.every((r) => state.researchedTechs.includes(r))) {
          return "Prerequisite research required";
        }
        if (state.resources.research < tech.cost) {
          return "Not enough research points";
        }
        const researchedTechs = [...state.researchedTechs, techId];
        set({
          researchedTechs,
          techBonuses: bonusesFrom(researchedTechs),
          resources: {
            ...state.resources,
            research: state.resources.research - tech.cost,
          },
        });
        return `${tech.name} researched`;
      },

      claimQuest: (questId) => {
        const state = get();
        if (state.claimedQuests.includes(questId)) return "Already claimed";
        const quest = QUESTS.find((q) => q.id === questId);
        if (!quest) return "Unknown quest";
        if (!isQuestComplete(quest, state)) return "Objective not yet met";
        const resources = { ...state.resources };
        for (const [res, amount] of Object.entries(quest.reward)) {
          resources[res as keyof Resources] += amount as number;
        }
        set({ resources, claimedQuests: [...state.claimedQuests, questId] });
        return `Reward claimed: ${quest.title}`;
      },

      reset: () =>
        set({
          resources: { ...STARTING_RESOURCES },
          grid: makeEmptyGrid(),
          researchedTechs: [],
          claimedQuests: [],
          techBonuses: { ...NEUTRAL_BONUSES },
          prices: startingPrices(),
          marketEvent: null,
        }),
    }),
    {
      name: "black-gold-empire",
      version: 2,
      // Only persist durable game state — not action functions or transient
      // market events (those start fresh each session).
      partialize: (state) => ({
        resources: state.resources,
        grid: state.grid,
        researchedTechs: state.researchedTechs,
        claimedQuests: state.claimedQuests,
        prices: state.prices,
      }),
      // Saves from before market support lack `prices`; backfill them.
      migrate: (persisted, _version) => {
        const state = (persisted ?? {}) as Partial<GameState>;
        if (!state.prices) state.prices = startingPrices();
        return state as GameState;
      },
      // Rehydrate derived tech bonuses from the saved tech list.
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        state.techBonuses = bonusesFrom(state.researchedTechs);
        if (!state.prices) state.prices = startingPrices();
      },
    },
  ),
);

// ---- Market selectors (pure) ----

/** The live sale price for a commodity, including any active market event. */
export function effectivePrice(
  resource: SellableResource,
  prices: MarketPrices,
  event: MarketEvent | null,
): number {
  const mult = event && event.resource === resource ? event.mult : 1;
  return prices[resource] * mult;
}

// ---- Quest progress selectors (pure; kept out of the store) ----

/** Current progress value for a quest against the given state. */
export function questProgress(
  quest: Quest,
  state: Pick<GameState, "grid" | "resources" | "researchedTechs">,
): number {
  switch (quest.metric.kind) {
    case "buildCount": {
      const building = quest.metric.building;
      return state.grid.filter((c) => c?.type === building).length;
    }
    case "resourceTotal":
      return Math.floor(state.resources[quest.metric.resource]);
    case "techCount":
      return state.researchedTechs.length;
  }
}

export function isQuestComplete(
  quest: Quest,
  state: Pick<GameState, "grid" | "resources" | "researchedTechs">,
): boolean {
  return questProgress(quest, state) >= quest.target;
}

/** Convenience selector for the tech list with derived unlock/complete flags. */
export function techStatus(state: Pick<GameState, "researchedTechs">) {
  return TECHS.map((tech: Tech) => ({
    tech,
    done: state.researchedTechs.includes(tech.id),
    unlocked: tech.requires.every((r) => state.researchedTechs.includes(r)),
  }));
}
