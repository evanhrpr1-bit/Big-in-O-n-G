import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  BUILDING_ERA,
  BUILDING_TYPES,
  CARTELS,
  CARTEL_BACKING_PER_LEVEL,
  ERAS,
  FLEET_PURCHASE,
  GRID_SIZE,
  INCIDENTS,
  INCIDENT_CHANCE,
  MARABOU_TRICKLE_AMOUNT,
  MARABOU_TRICKLE_MS,
  MARKET,
  OFFLINE_CAP_MS,
  OFFLINE_MIN_MS,
  OFFLINE_RATE,
  PIPELINE_DEGRADE_MS,
  PIPELINE_DEGRADE_PER_STEP,
  PIPELINE_REPAIR_MS,
  RUSH_MS_PER_MARABOU,
  SALVAGE_OPTIONS,
  SURVEY_OPTIONS,
  fleetUnitCost,
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
  TICK_MS,
  makeEmptyGrid,
  scaleCost,
  startingPrices,
  upgradeCostFor,
} from "./data";
import type {
  ActiveEffect,
  ActiveIncident,
  BuildingTypeKey,
  Fleet,
  FleetKind,
  Incident,
  MarketEvent,
  MarketPrices,
  OfflineReport,
  Pipelines,
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
  marabou: 1,
};

/** A fresh starting fleet: one of each unit type. */
function startingFleet(): Fleet {
  return {
    sonar: [{ id: "sonar-1", mission: null }],
    divers: [{ id: "diver-1", mission: null }],
    rovs: [{ id: "rov-1", mission: null }],
  };
}

/** Random integer in [min, max]. */
function randBetween(min: number, max: number): number {
  return Math.floor(min + Math.random() * (max - min + 1));
}

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
  /** Mobile units: sonar boats, divers, and ROVs. */
  fleet: Fleet;
  /** Timestamp of the next passive Marabou trickle. */
  nextMarabouAt: number;
  /** Pipeline condition (0–100) per leased region. */
  pipelines: Pipelines;
  /** Timestamp of the last live production tick, used to measure absences. */
  lastTickAt: number;
  /** Summary of the most recent offline settlement, until dismissed. */
  offlineReport: OfflineReport | null;

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
  /** Grant the passive Marabou trickle when its interval has elapsed. */
  marabouTick: () => void;
  /** Send a sonar boat out on a survey of the given duration. */
  launchSurvey: (unitId: string, durationKey: string) => string;
  /** Send a diver on a salvage run of the given duration. */
  launchSalvage: (unitId: string, durationKey: string) => string;
  /** Collect a finished mission, applying its rewards. */
  collectMission: (kind: FleetKind, unitId: string) => string;
  /** Spend Marabou to finish an in-progress mission immediately. */
  rushMission: (kind: FleetKind, unitId: string) => string;
  /** Buy another fleet unit with cash or Marabou. */
  buyFleetUnit: (kind: FleetKind, payWith: "cash" | "marabou") => string;
  /** Step pipeline condition down and refresh region bonuses. */
  pipelineTick: () => void;
  /** Send an idle ROV to repair a region's pipeline. */
  dispatchRov: (regionId: string) => string;
  /** Settle progress for time the app spent closed or backgrounded. */
  settleOffline: () => void;
  /** Clear the welcome-back summary. */
  dismissOfflineReport: () => void;
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

/**
 * Fill in any state a save predates, so older saves load with progress intact.
 * Shared by `migrate` and `onRehydrateStorage`, which see the same gaps.
 */
function backfill(state: Partial<GameState>): GameState {
  if (!state.prices) state.prices = startingPrices();
  if (typeof state.era !== "number") state.era = 0;
  if (!state.scoutedRegions) state.scoutedRegions = [];
  if (!state.leasedRegions) state.leasedRegions = [];
  if (!state.effects) state.effects = [];
  if (state.activeIncident === undefined) state.activeIncident = null;
  if (state.cartelId === undefined) state.cartelId = null;
  if (typeof state.cartelContribution !== "number") state.cartelContribution = 0;
  if (typeof state.raidCooldownUntil !== "number") state.raidCooldownUntil = 0;

  // Deepwater Expansion: marabou balance, fleet, trickle clock, pipelines.
  if (state.resources && typeof state.resources.marabou !== "number") {
    state.resources.marabou = STARTING_RESOURCES.marabou;
  }
  if (!state.fleet) state.fleet = startingFleet();
  // ROVs arrived after sonar boats and divers.
  if (!state.fleet.rovs) state.fleet.rovs = [{ id: "rov-1", mission: null }];
  if (typeof state.nextMarabouAt !== "number") {
    state.nextMarabouAt = Date.now() + MARABOU_TRICKLE_MS;
  }
  if (!state.pipelines) state.pipelines = {};
  // Saves predating offline settlement start their clock now, so upgrading
  // never hands out a windfall for time before the feature existed.
  if (typeof state.lastTickAt !== "number") state.lastTickAt = Date.now();
  state.offlineReport = null;
  // Leases held before pipelines existed start at full condition.
  for (const id of state.leasedRegions) {
    if (typeof state.pipelines[id] !== "number") state.pipelines[id] = 100;
  }

  return state as GameState;
}

/** Orthogonal neighbours of a grid index. */
function neighbours(index: number): number[] {
  const col = index % GRID_SIZE;
  const row = Math.floor(index / GRID_SIZE);
  const out: number[] = [];
  if (col > 0) out.push(index - 1);
  if (col < GRID_SIZE - 1) out.push(index + 1);
  if (row > 0) out.push(index - GRID_SIZE);
  if (row < GRID_SIZE - 1) out.push(index + GRID_SIZE);
  return out;
}

/**
 * Label each occupied tile with the id of the network it belongs to. Tiles are
 * linked by orthogonal adjacency, so buildings placed side by side are already
 * connected and roads exist to bridge the gaps between them.
 */
export function gridNetworks(grid: (PlacedBuilding | null)[]): number[] {
  const network = new Array(grid.length).fill(-1);
  let next = 0;
  for (let start = 0; start < grid.length; start++) {
    if (!grid[start] || network[start] !== -1) continue;
    const queue = [start];
    network[start] = next;
    while (queue.length > 0) {
      const cur = queue.pop()!;
      for (const n of neighbours(cur)) {
        if (grid[n] && network[n] === -1) {
          network[n] = next;
          queue.push(n);
        }
      }
    }
    next++;
  }
  return network;
}

/**
 * Indices of buildings that consume an input and can actually reach a producer
 * of it. A refinery with no crude well on its network refines nothing.
 */
export function suppliedIndices(grid: (PlacedBuilding | null)[]): Set<number> {
  const network = gridNetworks(grid);
  const producedBy = new Map<number, Set<ResourceKey>>();

  grid.forEach((cell, i) => {
    if (!cell) return;
    const type = BUILDING_TYPES[cell.type];
    if (type.baseRate <= 0) return;
    let set = producedBy.get(network[i]);
    if (!set) producedBy.set(network[i], (set = new Set()));
    set.add(type.resource);
  });

  const supplied = new Set<number>();
  grid.forEach((cell, i) => {
    if (!cell) return;
    const type = BUILDING_TYPES[cell.type];
    if (!type.consumes) return;
    const input = Object.keys(type.consumes)[0] as ResourceKey;
    if (producedBy.get(network[i])?.has(input)) supplied.add(i);
  });
  return supplied;
}

/** State a production run reads from. */
type ProductionInputs = Pick<
  GameState,
  "grid" | "resources" | "effects" | "techBonuses" | "regionBonuses" | "cartelBonuses"
>;

/**
 * Run `ticks` production ticks and return the resulting resources and effects.
 * Shared by the live tick and offline catch-up so both use identical rules —
 * including refinery input consumption and penalties ageing out mid-run.
 */
function runProduction(
  state: ProductionInputs,
  ticks: number,
  rate = 1,
): { resources: Resources; effects: ActiveEffect[] } {
  const resources: Resources = { ...state.resources };
  let effects = state.effects.map((e) => ({ ...e }));
  // The grid can't change mid-run, so supply is resolved once up front.
  const supplied = suppliedIndices(state.grid);

  for (let i = 0; i < ticks; i++) {
    for (let cellIndex = 0; cellIndex < state.grid.length; cellIndex++) {
      const cell = state.grid[cellIndex];
      if (!cell) continue;
      const type = BUILDING_TYPES[cell.type];
      // A plant cut off from its input runs dry, however much is in the bank.
      if (type.consumes && !supplied.has(cellIndex)) continue;
      const mult =
        (state.techBonuses[type.resource] ?? 1) *
        (state.regionBonuses[type.resource] ?? 1) *
        (state.cartelBonuses[type.resource] ?? 1) *
        effectMultiplier(effects, type.resource);
      const amount = type.baseRate * cell.level * mult * rate;
      if (type.consumes) {
        const [consumeRes, consumeQty] = Object.entries(type.consumes)[0];
        const key = consumeRes as keyof Resources;
        const required = (consumeQty as number) * cell.level;
        if (resources[key] >= required) {
          resources[key] -= required;
          resources[type.resource] += amount;
        }
      } else {
        resources[type.resource] += amount;
      }
    }
    // Age out temporary penalties.
    effects = effects
      .map((e) => ({ ...e, ticksLeft: e.ticksLeft - 1 }))
      .filter((e) => e.ticksLeft > 0);
  }

  return { resources, effects };
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

/**
 * Recompute production bonuses from held leases, scaled by pipeline condition.
 * A region at 100% condition grants its full bonus; at 0% it grants none, with
 * the uplift fading proportionally in between.
 */
function regionBonusesFrom(
  leasedRegions: string[],
  pipelines: Pipelines = {},
): ProductionBonuses {
  const bonuses: ProductionBonuses = { ...NEUTRAL_BONUSES };
  for (const id of leasedRegions) {
    const region = REGIONS.find((r) => r.id === id);
    if (!region) continue;
    const condition = pipelines[id] ?? 100;
    const scaled = 1 + (region.bonus.mult - 1) * (condition / 100);
    bonuses[region.bonus.resource] *= scaled;
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
      fleet: startingFleet(),
      nextMarabouAt: Date.now() + MARABOU_TRICKLE_MS,
      pipelines: {},
      lastTickAt: Date.now(),
      offlineReport: null,

      tick: () =>
        set((state) => ({ ...runProduction(state, 1), lastTickAt: Date.now() })),

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
        // A newly leased field comes with a fresh pipeline.
        const pipelines = { ...state.pipelines, [id]: 100 };
        set({
          resources,
          leasedRegions,
          pipelines,
          regionBonuses: regionBonusesFrom(leasedRegions, pipelines),
        });
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

      marabouTick: () =>
        set((state) => {
          if (Date.now() < state.nextMarabouAt) return {};
          return {
            resources: {
              ...state.resources,
              marabou: state.resources.marabou + MARABOU_TRICKLE_AMOUNT,
            },
            nextMarabouAt: Date.now() + MARABOU_TRICKLE_MS,
          };
        }),

      launchSurvey: (unitId, durationKey) => {
        const state = get();
        const unit = state.fleet.sonar.find((u) => u.id === unitId);
        if (!unit) return "Unknown sonar boat";
        if (unit.mission) return "That boat is already at sea";
        const option = SURVEY_OPTIONS.find((o) => o.key === durationKey);
        if (!option) return "Unknown survey length";
        if (state.resources.cash < option.cost) {
          return `Not enough cash to launch a ${option.label.toLowerCase()}`;
        }
        set({
          resources: { ...state.resources, cash: state.resources.cash - option.cost },
          fleet: {
            ...state.fleet,
            sonar: state.fleet.sonar.map((u) =>
              u.id === unitId
                ? { ...u, mission: { durationKey, returnAt: Date.now() + option.ms } }
                : u,
            ),
          },
        });
        return `${option.label} underway`;
      },

      launchSalvage: (unitId, durationKey) => {
        const state = get();
        const unit = state.fleet.divers.find((u) => u.id === unitId);
        if (!unit) return "Unknown diver";
        if (unit.mission) return "That diver is already down";
        const option = SALVAGE_OPTIONS.find((o) => o.key === durationKey);
        if (!option) return "Unknown dive length";
        // Salvage runs into a leased region when one is held, else open water.
        const regionId = state.leasedRegions[0];
        set({
          fleet: {
            ...state.fleet,
            divers: state.fleet.divers.map((u) =>
              u.id === unitId
                ? { ...u, mission: { durationKey, returnAt: Date.now() + option.ms, regionId } }
                : u,
            ),
          },
        });
        return `${option.label} underway`;
      },

      collectMission: (kind, unitId) => {
        const state = get();
        const unit = state.fleet[kind].find((u) => u.id === unitId);
        if (!unit || !unit.mission) return "Nothing to collect";
        if (Date.now() < unit.mission.returnAt) return "Still out on mission";

        const resources = { ...state.resources };
        let scoutedRegions = state.scoutedRegions;
        let message: string;

        if (kind === "rovs") {
          // An ROV repair restores the target pipeline to full condition.
          const regionId = unit.mission.regionId!;
          const region = REGIONS.find((r) => r.id === regionId);
          const pipelines: Pipelines = { ...state.pipelines, [regionId]: 100 };
          set({
            pipelines,
            regionBonuses: regionBonusesFrom(state.leasedRegions, pipelines),
            fleet: {
              ...state.fleet,
              rovs: state.fleet.rovs.map((u) =>
                u.id === unitId ? { ...u, mission: null } : u,
              ),
            },
          });
          return `${region?.name ?? "Pipeline"} restored to full condition`;
        }

        if (kind === "sonar") {
          const option =
            SURVEY_OPTIONS.find((o) => o.key === unit.mission!.durationKey) ?? SURVEY_OPTIONS[0];
          // Fields the player could act on but hasn't surveyed yet.
          const undiscovered = REGIONS.filter(
            (r) => !state.scoutedRegions.includes(r.id) && state.era >= r.era,
          );
          if (undiscovered.length > 0 && Math.random() < option.discoverChance) {
            const found = undiscovered[Math.floor(Math.random() * undiscovered.length)];
            scoutedRegions = [...state.scoutedRegions, found.id];
            message = `Sonar contact — ${found.name} charted`;
          } else {
            // No field found (or none left): return a resource cache instead.
            const cash = Math.round(randBetween(200, 500) * option.cacheScale);
            const crude = Math.round(randBetween(15, 40) * option.cacheScale);
            resources.cash += cash;
            resources.crude += crude;
            message = `No new field — recovered a cache worth $${cash} and ${crude} crude`;
          }
        } else {
          const option =
            SALVAGE_OPTIONS.find((o) => o.key === unit.mission!.durationKey) ?? SALVAGE_OPTIONS[0];
          const cash = randBetween(option.cash[0], option.cash[1]);
          const crude = randBetween(option.crude[0], option.crude[1]);
          resources.cash += cash;
          resources.crude += crude;
          const gotMarabou = Math.random() < option.marabouChance;
          if (gotMarabou) resources.marabou += 1;
          message = gotMarabou
            ? `Salvage: $${cash}, ${crude} crude — and a Marabou in the wreck`
            : `Salvage: $${cash} and ${crude} crude`;
        }

        set({
          resources,
          scoutedRegions,
          fleet: {
            ...state.fleet,
            [kind]: state.fleet[kind].map((u) =>
              u.id === unitId ? { ...u, mission: null } : u,
            ),
          },
        });
        return message;
      },

      rushMission: (kind, unitId) => {
        const state = get();
        const unit = state.fleet[kind].find((u) => u.id === unitId);
        if (!unit || !unit.mission) return "Nothing to rush";
        const remaining = unit.mission.returnAt - Date.now();
        if (remaining <= 0) return "That mission is already back";
        const price = Math.max(1, Math.ceil(remaining / RUSH_MS_PER_MARABOU));
        if (state.resources.marabou < price) {
          return `Rushing costs ${price} Marabou`;
        }
        set({
          resources: { ...state.resources, marabou: state.resources.marabou - price },
          fleet: {
            ...state.fleet,
            [kind]: state.fleet[kind].map((u) =>
              u.id === unitId ? { ...u, mission: { ...u.mission!, returnAt: Date.now() } } : u,
            ),
          },
        });
        return `Rushed home for ${price} Marabou`;
      },

      buyFleetUnit: (kind, payWith) => {
        const state = get();
        const owned = state.fleet[kind].length;
        const base = FLEET_PURCHASE[kind];
        const resources = { ...state.resources };
        if (payWith === "cash") {
          const price = fleetUnitCost(kind, owned);
          if (resources.cash < price) return `Not enough cash for another ${base.label}`;
          resources.cash -= price;
        } else {
          if (resources.marabou < base.marabou) {
            return `Needs ${base.marabou} Marabou`;
          }
          resources.marabou -= base.marabou;
        }
        set({
          resources,
          fleet: {
            ...state.fleet,
            [kind]: [
              ...state.fleet[kind],
              { id: `${kind}-${owned + 1}-${Date.now()}`, mission: null },
            ],
          },
        });
        return `${base.label} added to your fleet`;
      },

      pipelineTick: () =>
        set((state) => {
          if (state.leasedRegions.length === 0) return {};
          const pipelines: Pipelines = { ...state.pipelines };
          let changed = false;
          for (const id of state.leasedRegions) {
            const current = pipelines[id] ?? 100;
            const next = Math.max(0, current - PIPELINE_DEGRADE_PER_STEP);
            if (next !== current) {
              pipelines[id] = next;
              changed = true;
            }
          }
          if (!changed) return {};
          return {
            pipelines,
            regionBonuses: regionBonusesFrom(state.leasedRegions, pipelines),
          };
        }),

      dispatchRov: (regionId) => {
        const state = get();
        if (!state.leasedRegions.includes(regionId)) return "You don't hold that lease";
        const region = REGIONS.find((r) => r.id === regionId);
        if (state.fleet.rovs.some((u) => u.mission?.regionId === regionId)) {
          return `An ROV is already working ${region?.name ?? "that field"}`;
        }
        const idle = state.fleet.rovs.find((u) => !u.mission);
        if (!idle) return "No idle ROV available";
        set({
          fleet: {
            ...state.fleet,
            rovs: state.fleet.rovs.map((u) =>
              u.id === idle.id
                ? {
                    ...u,
                    mission: {
                      durationKey: "repair",
                      returnAt: Date.now() + PIPELINE_REPAIR_MS,
                      regionId,
                    },
                  }
                : u,
            ),
          },
        });
        return `ROV en route to ${region?.name ?? "the field"}`;
      },

      settleOffline: () => {
        const state = get();
        const now = Date.now();
        const rawAway = now - state.lastTickAt;
        // Ordinary tab switching shouldn't produce a "welcome back" summary.
        if (rawAway < OFFLINE_MIN_MS) {
          set({ lastTickAt: now });
          return;
        }
        const awayMs = Math.min(rawAway, OFFLINE_CAP_MS);

        // 1. Pipelines decay across the gap.
        const steps = Math.floor(awayMs / PIPELINE_DEGRADE_MS);
        const pipelines: Pipelines = { ...state.pipelines };
        const average: Pipelines = {};
        const perMs = PIPELINE_DEGRADE_PER_STEP / PIPELINE_DEGRADE_MS;
        let pipelineLoss = 0;
        for (const id of state.leasedRegions) {
          const before = pipelines[id] ?? 100;
          const after = Math.max(0, before - steps * PIPELINE_DEGRADE_PER_STEP);
          pipelineLoss += before - after;
          pipelines[id] = after;
          // Production is credited against the average condition over the gap.
          // Decay is linear but floors at zero, so once it bottoms out mid-gap
          // the average is a triangle over the whole period, not (start+end)/2 —
          // which would badly over-credit long absences.
          const msToZero = before / perMs;
          average[id] =
            awayMs <= msToZero ? (before + after) / 2 : (before / 2) * (msToZero / awayMs);
        }

        // 2. Production over the gap, using those midpoint lease bonuses.
        const ticks = Math.floor(awayMs / TICK_MS);
        const { resources, effects } = runProduction(
          { ...state, regionBonuses: regionBonusesFrom(state.leasedRegions, average) },
          ticks,
          OFFLINE_RATE,
        );

        // 3. Pay out every missed Marabou interval, not just one.
        let nextMarabouAt = state.nextMarabouAt;
        if (now >= nextMarabouAt) {
          const missed = Math.floor((now - nextMarabouAt) / MARABOU_TRICKLE_MS) + 1;
          const capped = Math.min(missed, Math.floor(OFFLINE_CAP_MS / MARABOU_TRICKLE_MS));
          resources.marabou += capped * MARABOU_TRICKLE_AMOUNT;
          nextMarabouAt = now + MARABOU_TRICKLE_MS;
        }

        // Summarise net gains for the welcome-back panel.
        const gained: Partial<Resources> = {};
        for (const key of Object.keys(resources) as (keyof Resources)[]) {
          const delta = resources[key] - state.resources[key];
          if (delta >= 1) gained[key] = delta;
        }

        set({
          resources,
          effects,
          pipelines,
          nextMarabouAt,
          regionBonuses: regionBonusesFrom(state.leasedRegions, pipelines),
          lastTickAt: now,
          offlineReport: { awayMs: rawAway, gained, pipelineLoss },
        });
      },

      dismissOfflineReport: () => set({ offlineReport: null }),

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
        if (meta.isRoad) return "Roads can't be upgraded";
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
          fleet: startingFleet(),
          nextMarabouAt: Date.now() + MARABOU_TRICKLE_MS,
          pipelines: {},
          lastTickAt: Date.now(),
          offlineReport: null,
        }),
    }),
    {
      name: "black-gold-empire",
      version: 9,
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
        fleet: state.fleet,
        nextMarabouAt: state.nextMarabouAt,
        pipelines: state.pipelines,
        lastTickAt: state.lastTickAt,
      }),
      // Backfill fields added in later versions for older saves.
      migrate: (persisted, _version) => backfill((persisted ?? {}) as Partial<GameState>),
      // Backfill, then rebuild every derived bonus map from the saved lists.
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        backfill(state);
        state.techBonuses = bonusesFrom(state.researchedTechs);
        state.regionBonuses = regionBonusesFrom(state.leasedRegions, state.pipelines);
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
