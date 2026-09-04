import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  BUILDING_TYPES,
  QUESTS,
  STARTING_RESOURCES,
  TECHS,
  makeEmptyGrid,
  upgradeCostFor,
} from "./data";
import type {
  BuildingTypeKey,
  PlacedBuilding,
  ProductionBonuses,
  Quest,
  Resources,
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

  /** Advance production by one tick. */
  tick: () => void;
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
        }),
    }),
    {
      name: "black-gold-empire",
      version: 1,
      // Only persist the durable game state, not the action functions.
      partialize: (state) => ({
        resources: state.resources,
        grid: state.grid,
        researchedTechs: state.researchedTechs,
        claimedQuests: state.claimedQuests,
      }),
      // Rehydrate derived tech bonuses from the saved tech list.
      onRehydrateStorage: () => (state) => {
        if (state) state.techBonuses = bonusesFrom(state.researchedTechs);
      },
    },
  ),
);

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
