import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  BUILDING_ERA,
  BUILDING_TYPES,
  CARTELS,
  CARTEL_BACKING_PER_LEVEL,
  ERAS,
  INCIDENTS,
  INCIDENT_CHANCE,
  MARKET,
  RAID_APPROACHES,
  RAID_COOLDOWN_MS,
  RESEARCH_CONTRIBUTION_RATE,
  RIVALS,
  QUESTS,
  REGIONS,
  RESOURCE_META,
  SELLABLE,
  STARTING_RESOURCES,
  TECHS,
  makeEmptyGrid,
  scaleCost,
  startingPrices,
  upgradeCostFor,
} from "./data";
import type {
  ActiveEffect,
  ActiveIncident,
  BuildingTypeKey,
  Incident,
  MarketEvent,
  MarketPrices,
  PlacedBuilding,
  ProductionBonuses,
  Quest,
  ResourceKey,
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
  /** Index into ERAS of the player's current era. */
  era: number;
  /** Ids of regions that have been scouted (their terms are revealed). */
  scoutedRegions: string[];
  /** Ids of regions whose lease the player holds. */
  leasedRegions: string[];
  /** Production bonuses derived from held region leases. */
  regionBonuses: ProductionBonuses;
  /** Temporary production penalties from resolved incidents. */
  effects: ActiveEffect[];
  /** Incident awaiting a decision, if any. */
  activeIncident: ActiveIncident | null;
  /** Id of the cartel the player belongs to, if any. */
  cartelId: string | null;
  /** Contribution points banked with the current cartel. */
  cartelContribution: number;
  /** Production bonuses derived from cartel standing. */
  cartelBonuses: ProductionBonuses;
  /** Timestamp before which no further rival operation may be run. */
  raidCooldownUntil: number;

  /** Advance production by one tick. */
  tick: () => void;
  /** Re-roll market prices and advance any active market event. */
  marketTick: () => void;
  /** Sell up to `qty` units of a commodity at the live price (Infinity = all). */
  sell: (resource: SellableResource, qty: number) => string;
  /** Advance to the next era if requirements are met. Returns a status message. */
  advanceEra: () => string;
  /** Pay to scout a region, revealing its yield and lease terms. */
  scoutRegion: (id: string) => string;
  /** Acquire a scouted region's lease, activating its production bonus. */
  leaseRegion: (id: string) => string;
  /** Possibly fire a random operational incident. */
  incidentTick: () => void;
  /** Resolve the pending incident with the given choice. Returns a message. */
  resolveIncident: (choiceIndex: number) => string;
  /** Pay dues and join a cartel. */
  joinCartel: (id: string) => string;
  /** Leave the current cartel, forfeiting banked contributions. */
  leaveCartel: () => string;
  /** Contribute cash or research toward cartel standing. */
  contributeToCartel: (resource: "cash" | "research", amount: number) => string;
  /** Run an operation against a rival. Resolves immediately win or lose. */
  runRaid: (rivalId: string, approachId: string) => string;
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

/** Standing level with a cartel, from banked contribution points. */
export function cartelLevel(cartelId: string | null, contribution: number): number {
  const cartel = CARTELS.find((c) => c.id === cartelId);
  if (!cartel) return 0;
  return Math.min(cartel.maxLevel, 1 + Math.floor(contribution / cartel.contributionPerLevel));
}

/** Production bonuses granted by the current cartel at its standing level. */
function cartelBonusesFrom(cartelId: string | null, contribution: number): ProductionBonuses {
  const bonuses: ProductionBonuses = { ...NEUTRAL_BONUSES };
  const cartel = CARTELS.find((c) => c.id === cartelId);
  if (!cartel || cartel.bonus.kind !== "production") return bonuses;
  const level = cartelLevel(cartelId, contribution);
  bonuses[cartel.bonus.resource] *= 1 + cartel.bonus.perLevel * level;
  return bonuses;
}

/** Market sale-price multiplier granted by a trade-focused cartel. */
export function cartelMarketMult(cartelId: string | null, contribution: number): number {
  const cartel = CARTELS.find((c) => c.id === cartelId);
  if (!cartel || cartel.bonus.kind !== "market") return 1;
  return 1 + cartel.bonus.perLevel * cartelLevel(cartelId, contribution);
}

/** Success chance for an operation, given the target and cartel backing. */
export function raidSuccessChance(
  rivalId: string,
  approachId: string,
  cartelId: string | null,
  contribution: number,
): number {
  const rival = RIVALS.find((r) => r.id === rivalId);
  const approach = RAID_APPROACHES.find((a) => a.id === approachId);
  if (!rival || !approach) return 0;
  const backing = cartelLevel(cartelId, contribution) * CARTEL_BACKING_PER_LEVEL;
  return Math.max(0.05, Math.min(0.95, approach.baseSuccess - rival.difficulty + backing));
}

/** Incidents whose era and building prerequisites are currently satisfied. */
function eligibleIncidents(
  state: Pick<GameState, "era" | "grid">,
): Incident[] {
  return INCIDENTS.filter((incident) => {
    if ((incident.minEra ?? 0) > state.era) return false;
    if (incident.requiresBuilding) {
      const required = incident.requiresBuilding;
      if (!state.grid.some((cell) => cell && required.includes(cell.type))) return false;
    }
    return true;
  });
}

/** Combined multiplier from all active penalties affecting a resource. */
export function effectMultiplier(effects: ActiveEffect[], resource: ResourceKey): number {
  return effects.reduce((mult, e) => (e.resource === resource ? mult * e.mult : mult), 1);
}

/** Recompute the production bonus map from the set of held region leases. */
function regionBonusesFrom(leasedRegions: string[]): ProductionBonuses {
  const bonuses: ProductionBonuses = { ...NEUTRAL_BONUSES };
  for (const id of leasedRegions) {
    const region = REGIONS.find((r) => r.id === id);
    if (!region) continue;
    bonuses[region.bonus.resource] *= region.bonus.mult;
  }
  return bonuses;
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
      era: 0,
      scoutedRegions: [],
      leasedRegions: [],
      regionBonuses: { ...NEUTRAL_BONUSES },
      effects: [],
      activeIncident: null,
      cartelId: null,
      cartelContribution: 0,
      cartelBonuses: { ...NEUTRAL_BONUSES },
      raidCooldownUntil: 0,

      tick: () =>
        set((state) => {
          const next: Resources = { ...state.resources };
          for (const cell of state.grid) {
            if (!cell) continue;
            const type = BUILDING_TYPES[cell.type];
            const mult =
              (state.techBonuses[type.resource] ?? 1) *
              (state.regionBonuses[type.resource] ?? 1) *
              (state.cartelBonuses[type.resource] ?? 1) *
              effectMultiplier(state.effects, type.resource);
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
          // Age out temporary penalties.
          const effects = state.effects
            .map((e) => ({ ...e, ticksLeft: e.ticksLeft - 1 }))
            .filter((e) => e.ticksLeft > 0);

          return { resources: next, effects };
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
        const price = effectivePrice(
          resource,
          state.prices,
          state.marketEvent,
          cartelMarketMult(state.cartelId, state.cartelContribution),
        );
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

      advanceEra: () => {
        const state = get();
        const nextIndex = state.era + 1;
        if (nextIndex >= ERAS.length) return "Already at the final era";
        const current = ERAS[state.era];
        if (current.requiresTech && !state.researchedTechs.includes(current.requiresTech)) {
          const tech = TECHS.find((t) => t.id === current.requiresTech);
          return `Research ${tech?.name ?? "the required tech"} to advance`;
        }
        const cost = current.advanceCost ?? {};
        for (const [res, amount] of Object.entries(cost)) {
          if (state.resources[res as keyof Resources] < (amount as number)) {
            return `Not enough ${RESOURCE_META[res as keyof Resources].label} to advance`;
          }
        }
        const resources = { ...state.resources };
        for (const [res, amount] of Object.entries(cost)) {
          resources[res as keyof Resources] -= amount as number;
        }
        set({ resources, era: nextIndex });
        return `Advanced to the ${ERAS[nextIndex].name}`;
      },

      scoutRegion: (id) => {
        const state = get();
        const region = REGIONS.find((r) => r.id === id);
        if (!region) return "Unknown region";
        if (state.scoutedRegions.includes(id)) return `${region.name} is already scouted`;
        if (state.era < region.era) {
          return `Reach the ${ERAS[region.era].name} to scout ${region.name}`;
        }
        if (state.resources.cash < region.scoutCost) {
          return `Not enough cash to scout ${region.name}`;
        }
        set({
          resources: {
            ...state.resources,
            cash: state.resources.cash - region.scoutCost,
          },
          scoutedRegions: [...state.scoutedRegions, id],
        });
        return `${region.name} scouted`;
      },

      leaseRegion: (id) => {
        const state = get();
        const region = REGIONS.find((r) => r.id === id);
        if (!region) return "Unknown region";
        if (state.leasedRegions.includes(id)) return `You already hold ${region.name}`;
        if (!state.scoutedRegions.includes(id)) return `Scout ${region.name} first`;
        if (state.era < region.era) {
          return `Reach the ${ERAS[region.era].name} to lease ${region.name}`;
        }
        for (const [res, amount] of Object.entries(region.leaseCost)) {
          if (state.resources[res as keyof Resources] < (amount as number)) {
            return `Not enough ${RESOURCE_META[res as keyof Resources].label} for this lease`;
          }
        }
        const resources = { ...state.resources };
        for (const [res, amount] of Object.entries(region.leaseCost)) {
          resources[res as keyof Resources] -= amount as number;
        }
        const leasedRegions = [...state.leasedRegions, id];
        set({ resources, leasedRegions, regionBonuses: regionBonusesFrom(leasedRegions) });
        return region.rival
          ? `Outbid ${region.rival} for ${region.name}`
          : `Lease acquired: ${region.name}`;
      },

      incidentTick: () => {
        const state = get();
        // Only one incident is pending at a time.
        if (state.activeIncident) return;
        if (Math.random() >= INCIDENT_CHANCE) return;
        const pool = eligibleIncidents(state);
        if (pool.length === 0) return;
        const incident = pool[Math.floor(Math.random() * pool.length)];
        set({
          activeIncident: {
            id: incident.id,
            // Costs scale with era so incidents stay meaningful late game.
            costMult: 1 + state.era * 0.8,
          },
        });
      },

      resolveIncident: (choiceIndex) => {
        const state = get();
        const active = state.activeIncident;
        if (!active) return "No incident to resolve";
        const incident = INCIDENTS.find((i) => i.id === active.id);
        if (!incident) {
          set({ activeIncident: null });
          return "Incident cleared";
        }
        const choice = incident.choices[choiceIndex];
        if (!choice) return "Invalid choice";

        const cost = scaleCost(choice.cost, active.costMult);
        for (const [res, amount] of Object.entries(cost)) {
          if (state.resources[res as keyof Resources] < (amount as number)) {
            return `Not enough ${RESOURCE_META[res as keyof Resources].label} for that`;
          }
        }

        const resources = { ...state.resources };
        for (const [res, amount] of Object.entries(cost)) {
          resources[res as keyof Resources] -= amount as number;
        }

        const effects = [...state.effects];
        if (choice.penalty) {
          const { resource, mult, ticks } = choice.penalty;
          effects.push({
            id: `${incident.id}-${Date.now()}`,
            label: `${RESOURCE_META[resource].label} −${Math.round((1 - mult) * 100)}%`,
            resource,
            mult,
            ticksLeft: ticks,
          });
        }

        set({ resources, effects, activeIncident: null });
        return choice.outcome;
      },

      joinCartel: (id) => {
        const state = get();
        const cartel = CARTELS.find((c) => c.id === id);
        if (!cartel) return "Unknown cartel";
        if (state.cartelId === id) return `You already ride with ${cartel.name}`;
        if (state.resources.cash < cartel.dues) {
          return `Not enough cash for ${cartel.name} dues`;
        }
        set({
          resources: { ...state.resources, cash: state.resources.cash - cartel.dues },
          cartelId: id,
          // Standing is per-cartel and does not carry over.
          cartelContribution: 0,
          cartelBonuses: cartelBonusesFrom(id, 0),
        });
        return `Joined ${cartel.name}`;
      },

      leaveCartel: () => {
        const state = get();
        if (!state.cartelId) return "You're not in a cartel";
        const name = CARTELS.find((c) => c.id === state.cartelId)?.name ?? "the cartel";
        set({
          cartelId: null,
          cartelContribution: 0,
          cartelBonuses: { ...NEUTRAL_BONUSES },
        });
        return `Left ${name}. Standing forfeited.`;
      },

      contributeToCartel: (resource, amount) => {
        const state = get();
        if (!state.cartelId) return "Join a cartel first";
        if (state.resources[resource] < amount) {
          return `Not enough ${RESOURCE_META[resource].label}`;
        }
        const points =
          resource === "research" ? amount * RESEARCH_CONTRIBUTION_RATE : amount;
        const cartelContribution = state.cartelContribution + points;
        const before = cartelLevel(state.cartelId, state.cartelContribution);
        const after = cartelLevel(state.cartelId, cartelContribution);
        set({
          resources: {
            ...state.resources,
            [resource]: state.resources[resource] - amount,
          },
          cartelContribution,
          cartelBonuses: cartelBonusesFrom(state.cartelId, cartelContribution),
        });
        return after > before
          ? `Standing raised to level ${after}`
          : `Contributed to the cartel`;
      },

      runRaid: (rivalId, approachId) => {
        const state = get();
        if (!state.cartelId) return "You need cartel backing to move against a rival";
        if (Date.now() < state.raidCooldownUntil) return "Your crews are still lying low";
        const rival = RIVALS.find((r) => r.id === rivalId);
        const approach = RAID_APPROACHES.find((a) => a.id === approachId);
        if (!rival || !approach) return "Unknown operation";
        if (state.era < rival.minEra) {
          return `Reach the ${ERAS[rival.minEra].name} to move against ${rival.name}`;
        }

        const cost = scaleCost(approach.cost, rival.rewardScale);
        for (const [res, amount] of Object.entries(cost)) {
          if (state.resources[res as keyof Resources] < (amount as number)) {
            return `Not enough ${RESOURCE_META[res as keyof Resources].label} to fund this`;
          }
        }

        const resources = { ...state.resources };
        for (const [res, amount] of Object.entries(cost)) {
          resources[res as keyof Resources] -= amount as number;
        }

        const chance = raidSuccessChance(
          rivalId,
          approachId,
          state.cartelId,
          state.cartelContribution,
        );
        const success = Math.random() < chance;
        const effects = [...state.effects];

        if (success) {
          const reward = scaleCost(approach.reward, rival.rewardScale);
          for (const [res, amount] of Object.entries(reward)) {
            resources[res as keyof Resources] += amount as number;
          }
        } else {
          const { resource, mult, ticks } = approach.failurePenalty;
          effects.push({
            id: `raid-${rivalId}-${Date.now()}`,
            label: `${RESOURCE_META[resource].label} −${Math.round((1 - mult) * 100)}%`,
            resource,
            mult,
            ticksLeft: ticks,
          });
        }

        set({ resources, effects, raidCooldownUntil: Date.now() + RAID_COOLDOWN_MS });

        if (success) {
          return approach.id === "sabotage"
            ? `Sabotage landed — ${rival.name} dropped contracts and you took them`
            : `Deal struck with ${rival.name}'s people`;
        }
        return approach.id === "sabotage"
          ? `The job was traced back to you. ${rival.name} retaliated.`
          : `${rival.name} walked away from the table — and talked.`;
      },

      build: (index, type) => {
        const state = get();
        if (state.grid[index]) return "That lot is already occupied";
        const meta = BUILDING_TYPES[type];
        if (state.era < BUILDING_ERA[type]) {
          return `Reach the ${ERAS[BUILDING_ERA[type]].name} to build ${meta.name}`;
        }
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
          era: 0,
          scoutedRegions: [],
          leasedRegions: [],
          regionBonuses: { ...NEUTRAL_BONUSES },
          effects: [],
          activeIncident: null,
          cartelId: null,
          cartelContribution: 0,
          cartelBonuses: { ...NEUTRAL_BONUSES },
          raidCooldownUntil: 0,
        }),
    }),
    {
      name: "black-gold-empire",
      version: 6,
      // Only persist durable game state — not action functions or transient
      // market events (those start fresh each session).
      partialize: (state) => ({
        resources: state.resources,
        grid: state.grid,
        researchedTechs: state.researchedTechs,
        claimedQuests: state.claimedQuests,
        prices: state.prices,
        era: state.era,
        scoutedRegions: state.scoutedRegions,
        leasedRegions: state.leasedRegions,
        // Persisted so a reload can't dodge a pending decision or penalty.
        effects: state.effects,
        activeIncident: state.activeIncident,
        cartelId: state.cartelId,
        cartelContribution: state.cartelContribution,
        raidCooldownUntil: state.raidCooldownUntil,
      }),
      // Backfill fields added in later versions for older saves.
      migrate: (persisted, _version) => {
        const state = (persisted ?? {}) as Partial<GameState>;
        if (!state.prices) state.prices = startingPrices();
        if (typeof state.era !== "number") state.era = 0;
        if (!state.scoutedRegions) state.scoutedRegions = [];
        if (!state.leasedRegions) state.leasedRegions = [];
        if (!state.effects) state.effects = [];
        if (state.activeIncident === undefined) state.activeIncident = null;
        if (state.cartelId === undefined) state.cartelId = null;
        if (typeof state.cartelContribution !== "number") state.cartelContribution = 0;
        if (typeof state.raidCooldownUntil !== "number") state.raidCooldownUntil = 0;
        return state as GameState;
      },
      // Rehydrate derived bonuses from the saved tech and lease lists.
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        state.techBonuses = bonusesFrom(state.researchedTechs);
        if (!state.prices) state.prices = startingPrices();
        if (typeof state.era !== "number") state.era = 0;
        if (!state.scoutedRegions) state.scoutedRegions = [];
        if (!state.leasedRegions) state.leasedRegions = [];
        if (!state.effects) state.effects = [];
        if (state.activeIncident === undefined) state.activeIncident = null;
        if (state.cartelId === undefined) state.cartelId = null;
        if (typeof state.cartelContribution !== "number") state.cartelContribution = 0;
        if (typeof state.raidCooldownUntil !== "number") state.raidCooldownUntil = 0;
        state.regionBonuses = regionBonusesFrom(state.leasedRegions);
        state.cartelBonuses = cartelBonusesFrom(state.cartelId, state.cartelContribution);
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
  marketMult = 1,
): number {
  const mult = event && event.resource === resource ? event.mult : 1;
  return prices[resource] * mult * marketMult;
}

// ---- Era selectors (pure) ----

export interface EraAdvancement {
  /** Whether the player is already at the final era. */
  isFinal: boolean;
  /** The era being advanced into, if any. */
  next: (typeof ERAS)[number] | null;
  /** Per-resource advancement cost with have/need affordability. */
  costs: { resource: keyof Resources; need: number; have: number; ok: boolean }[];
  /** Required tech name, if any, and whether it's been researched. */
  requiredTech: { name: string; ok: boolean } | null;
  /** True when every requirement is satisfied. */
  canAdvance: boolean;
}

/** Compute what it takes to advance from the current era. */
export function eraAdvancement(
  state: Pick<GameState, "era" | "resources" | "researchedTechs">,
): EraAdvancement {
  const current = ERAS[state.era];
  const next = ERAS[state.era + 1] ?? null;
  if (!next) {
    return { isFinal: true, next: null, costs: [], requiredTech: null, canAdvance: false };
  }

  const costs = Object.entries(current.advanceCost ?? {}).map(([res, need]) => {
    const resource = res as keyof Resources;
    const have = Math.floor(state.resources[resource]);
    return { resource, need: need as number, have, ok: have >= (need as number) };
  });

  let requiredTech: { name: string; ok: boolean } | null = null;
  if (current.requiresTech) {
    const tech = TECHS.find((t) => t.id === current.requiresTech);
    requiredTech = {
      name: tech?.name ?? current.requiresTech,
      ok: state.researchedTechs.includes(current.requiresTech),
    };
  }

  const canAdvance = costs.every((c) => c.ok) && (requiredTech?.ok ?? true);
  return { isFinal: false, next, costs, requiredTech, canAdvance };
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
