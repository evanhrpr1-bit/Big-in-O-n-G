import {
  Droplet,
  Flame,
  Factory,
  Building2,
  DollarSign,
  Beaker,
  Cog,
  Gauge,
  Gem,
  Route,
  Ship,
  Sun,
} from "lucide-react";
import type {
  BuildingType,
  BuildingTypeKey,
  Cartel,
  Era,
  FleetKind,
  Incident,
  MarketPrices,
  Quest,
  RaidApproach,
  Region,
  ResourceKey,
  Resources,
  Rival,
  SalvageOption,
  SellableResource,
  SurveyOption,
  Tech,
} from "./types";
import type { LucideIcon } from "lucide-react";

// ---- Design tokens ----
// Base: #1B1A17 (crude black)   Steel: #4A5560   Rust accent: #C1440E
// Amber: #E3A857   Paper: #EDE6D6   Gas green: #5B7B6E   Research blue: #6E8CA0

export const GRID_SIZE = 6;

/** How often, in milliseconds, production is collected. */
export const TICK_MS = 2000;

export const STARTING_RESOURCES = {
  cash: 400,
  crude: 0,
  gas: 0,
  fuel: 0,
  research: 0,
  // A small seed of premium currency so the player can try a rush once.
  marabou: 3,
} as const;

export const BUILDING_TYPES: Record<BuildingTypeKey, BuildingType> = {
  derrick: {
    name: "Derrick",
    icon: Droplet,
    cost: 100,
    baseRate: 2,
    resource: "crude",
    color: "#C1440E",
    blurb: "Pumps crude oil from the ground.",
  },
  gasWell: {
    name: "Gas Well",
    icon: Flame,
    cost: 120,
    baseRate: 2,
    resource: "gas",
    color: "#5B7B6E",
    blurb: "Taps natural gas deposits.",
  },
  refinery: {
    name: "Refinery",
    icon: Factory,
    cost: 250,
    baseRate: 1,
    resource: "fuel",
    consumes: { crude: 2 },
    color: "#E3A857",
    blurb: "Converts crude oil into refined fuel.",
  },
  office: {
    name: "Sales Office",
    icon: Building2,
    cost: 150,
    baseRate: 3,
    resource: "cash",
    color: "#4A5560",
    blurb: "Sells contracts, generating steady cash.",
  },
  lab: {
    name: "Research Lab",
    icon: Beaker,
    cost: 200,
    baseRate: 1,
    resource: "research",
    color: "#6E8CA0",
    blurb: "Generates research points for the tech tree.",
  },
  steelRig: {
    name: "Steel Rig",
    icon: Cog,
    cost: 300,
    baseRate: 4,
    resource: "crude",
    color: "#9AA6B2",
    blurb: "An industrial steel derrick with heavy crude output.",
  },
  pipelineHub: {
    name: "Pipeline Hub",
    icon: Gauge,
    cost: 550,
    baseRate: 6,
    resource: "gas",
    color: "#5B7B6E",
    blurb: "A high-pressure hub pulling natural gas at scale.",
  },
  offshoreRig: {
    name: "Offshore Platform",
    icon: Droplet,
    cost: 400,
    baseRate: 4,
    resource: "crude",
    // Matches the platform model, which follows its reference photo.
    color: "#E5B02A",
    blurb: "A deepwater rig with far higher output than a derrick.",
  },
  lngTerminal: {
    name: "LNG Terminal",
    icon: Ship,
    cost: 1200,
    baseRate: 5,
    resource: "fuel",
    consumes: { gas: 2 },
    color: "#E3A857",
    blurb: "Liquefies natural gas into refined fuel at industrial scale.",
  },
  road: {
    name: "Access Road",
    icon: Route,
    cost: 40,
    baseRate: 0,
    resource: "cash",
    isRoad: true,
    color: "#6B6459",
    blurb: "Carries nothing on its own — it links producers to the plants that refine them.",
  },
  solarPlant: {
    name: "Solar Array",
    icon: Sun,
    cost: 2500,
    baseRate: 12,
    resource: "cash",
    color: "#6FBF9F",
    blurb: "Clean-energy income — the prestige of a modern empire.",
  },
};

export const RESOURCE_META: Record<
  ResourceKey,
  { label: string; icon: LucideIcon; color: string }
> = {
  cash: { label: "Cash", icon: DollarSign, color: "#E3A857" },
  crude: { label: "Crude", icon: Droplet, color: "#C1440E" },
  gas: { label: "Gas", icon: Flame, color: "#5B7B6E" },
  fuel: { label: "Fuel", icon: Factory, color: "#EDE6D6" },
  research: { label: "Research", icon: Beaker, color: "#6E8CA0" },
  marabou: { label: "Marabou", icon: Gem, color: "#B98CD6" },
};

export const TECHS: Tech[] = [
  {
    id: "rotary",
    name: "Rotary Drilling",
    cost: 40,
    requires: [],
    effect: { crude: 1.5 },
    desc: "Crude oil output +50%.",
  },
  {
    id: "compression",
    name: "Gas Compression",
    cost: 40,
    requires: [],
    effect: { gas: 1.5 },
    desc: "Natural gas output +50%.",
  },
  {
    id: "contracts",
    name: "Market Contracts",
    cost: 70,
    requires: [],
    effect: { cash: 1.5 },
    desc: "Sales office income +50%.",
  },
  {
    id: "catalytic",
    name: "Catalytic Refining",
    cost: 90,
    requires: ["rotary", "compression"],
    effect: { fuel: 1.5 },
    desc: "Refinery output +50%.",
  },
  {
    id: "offshore",
    name: "Offshore Engineering",
    cost: 150,
    requires: ["catalytic"],
    effect: {},
    desc: "Enables advancement to the Offshore Age.",
  },
];

// ---- Eras ----

/** Ordered technological eras. Advancing unlocks new building tiers. */
export const ERAS: Era[] = [
  {
    id: "wildcatter",
    name: "Wildcatter Era",
    tagline: "Strike oil with derricks and gas wells; refine and sell to build capital.",
    unlocks: ["road", "derrick", "gasWell", "refinery", "office", "lab"],
    advanceCost: { cash: 1500, research: 50 },
    requiresTech: "rotary",
  },
  {
    id: "industrial",
    name: "Industrial Drilling",
    tagline: "Steel rigs and pipeline hubs pull crude and gas at industrial scale.",
    unlocks: ["steelRig", "pipelineHub"],
    advanceCost: { cash: 4000, research: 150 },
    requiresTech: "offshore",
  },
  {
    id: "offshore",
    name: "Offshore Age",
    tagline: "Push into deepwater with high-output offshore platforms.",
    unlocks: ["offshoreRig"],
    advanceCost: { cash: 9000, research: 300 },
  },
  {
    id: "modern",
    name: "Modern Refining",
    tagline: "Automated LNG terminals scale refined-fuel output to new highs.",
    unlocks: ["lngTerminal"],
    advanceCost: { cash: 20000, research: 600 },
  },
  {
    id: "renewable",
    name: "Renewable Transition",
    tagline: "Pivot to clean energy — prestige buildings for the endgame.",
    unlocks: ["solarPlant"],
  },
];

// ---- Fleet: sonar boats & divers ----

/**
 * The design spec expresses mission lengths in real hours (2h / 8h / 24h). This
 * game runs on a 2-second production tick, so hour-long timers would be wildly
 * out of step with the rest of its pacing. Durations below are compressed to
 * the same *shape* — short / medium / long — at a scale that matches the game.
 * Each option records the spec duration it stands in for, so restoring
 * real-time pacing is just a matter of changing `ms`.
 */
export const SURVEY_OPTIONS: SurveyOption[] = [
  {
    key: "short",
    label: "Short sweep",
    specLabel: "2h",
    ms: 45000,
    cost: 300,
    discoverChance: 0.45,
    cacheScale: 1,
  },
  {
    key: "standard",
    label: "Standard survey",
    specLabel: "8h",
    ms: 120000,
    cost: 900,
    discoverChance: 0.7,
    cacheScale: 2.2,
  },
  {
    key: "deep",
    label: "Deep survey",
    specLabel: "24h",
    ms: 300000,
    cost: 2000,
    discoverChance: 0.95,
    cacheScale: 4.5,
  },
];

export const SALVAGE_OPTIONS: SalvageOption[] = [
  {
    key: "quick",
    label: "Quick dive",
    specLabel: "30m",
    ms: 20000,
    cash: [150, 400],
    crude: [10, 30],
    marabouChance: 0.03,
  },
  {
    key: "standard",
    label: "Standard run",
    specLabel: "2h",
    ms: 45000,
    cash: [500, 1200],
    crude: [30, 80],
    marabouChance: 0.08,
  },
  {
    key: "deep",
    label: "Deep salvage",
    specLabel: "6h",
    ms: 120000,
    cash: [1500, 3200],
    crude: [80, 200],
    marabouChance: 0.18,
  },
];

// ---- Pipelines & ROVs ----

/** How often pipeline condition is stepped down. */
export const PIPELINE_DEGRADE_MS = 10000;
/** Condition points lost per degrade step. */
export const PIPELINE_DEGRADE_PER_STEP = 2;
/** How long an ROV takes to restore a pipeline to full condition. */
export const PIPELINE_REPAIR_MS = 30000;

// ---- Offline progress ----

/**
 * The game's loops are intervals, which browsers and mobile OSes suspend when
 * the app is backgrounded. On resume the elapsed time is settled up so closing
 * the app doesn't stall the empire.
 */
/** Longest absence that still accrues progress. */
export const OFFLINE_CAP_MS = 8 * 60 * 60 * 1000;
/** Fraction of normal output earned while away. */
export const OFFLINE_RATE = 1;
/** Gaps shorter than this are ignored (ordinary tab switching). */
export const OFFLINE_MIN_MS = 60000;

/** Marabou trickles in slowly — the spec's "every few hours", compressed. */
export const MARABOU_TRICKLE_MS = 120000;
export const MARABOU_TRICKLE_AMOUNT = 1;

/** One Marabou rushes this much remaining mission time. */
export const RUSH_MS_PER_MARABOU = 30000;

/** Base purchase costs for new fleet units; each one owned raises the price. */
export const FLEET_PURCHASE: Record<
  FleetKind,
  { label: string; cash: number; marabou: number; growth: number }
> = {
  sonar: { label: "Sonar Boat", cash: 2500, marabou: 5, growth: 1.6 },
  divers: { label: "Deep Sea Diver", cash: 1200, marabou: 3, growth: 1.5 },
  rovs: { label: "ROV", cash: 1800, marabou: 4, growth: 1.55 },
};

/** Cash cost of the next unit of a kind, given how many are already owned. */
export function fleetUnitCost(kind: FleetKind, owned: number): number {
  const base = FLEET_PURCHASE[kind];
  return Math.round(base.cash * Math.pow(base.growth, Math.max(0, owned - 1)));
}

// ---- Cartels & rival operations ----

/** Cooldown between operations against rivals, in milliseconds. */
export const RAID_COOLDOWN_MS = 60000;

/** Research points are worth this many contribution points each. */
export const RESEARCH_CONTRIBUTION_RATE = 20;

/** Success chance gained per level of cartel standing. */
export const CARTEL_BACKING_PER_LEVEL = 0.03;

export const CARTELS: Cartel[] = [
  {
    id: "permian",
    name: "The Permian Compact",
    motto: "Shared rigs, shared pay. Nobody drills alone out here.",
    dues: 1000,
    bonus: { kind: "production", resource: "crude", perLevel: 0.06 },
    contributionPerLevel: 2000,
    maxLevel: 5,
  },
  {
    id: "gulf",
    name: "Gulf Coast Syndicate",
    motto: "We don't pump harder. We sell smarter.",
    dues: 1200,
    bonus: { kind: "market", perLevel: 0.05 },
    contributionPerLevel: 2500,
    maxLevel: 5,
  },
  {
    id: "northern",
    name: "Northern Reach Alliance",
    motto: "Pooled labs, pooled patents. Everyone reads the results.",
    dues: 900,
    bonus: { kind: "production", resource: "research", perLevel: 0.1 },
    contributionPerLevel: 1800,
    maxLevel: 5,
  },
];

export const RIVALS: Rival[] = [
  {
    id: "meridian",
    name: "Meridian Petroleum",
    blurb: "A mid-sized operator with thin security and thinner margins.",
    difficulty: 0.05,
    rewardScale: 1,
    minEra: 0,
  },
  {
    id: "atlas",
    name: "Atlas Drilling Co.",
    blurb: "Sits on prime acreage and knows it. Well-guarded yards.",
    difficulty: 0.18,
    rewardScale: 2.2,
    minEra: 1,
  },
  {
    id: "consolidated",
    name: "Consolidated Fuels",
    blurb: "A vertically integrated giant. Moving against them is a real risk.",
    difficulty: 0.3,
    rewardScale: 4.5,
    minEra: 3,
  },
];

export const RAID_APPROACHES: RaidApproach[] = [
  {
    id: "negotiation",
    label: "Negotiate a side deal",
    desc: "Buy information and a quiet handshake. Lower payoff, far lower risk.",
    cost: { cash: 400 },
    baseSuccess: 0.85,
    reward: { cash: 900 },
    failurePenalty: { resource: "cash", mult: 0.85, ticks: 10 },
  },
  {
    id: "sabotage",
    label: "Sabotage their operation",
    desc: "Stall their rigs and pick up the contracts they drop. High payoff if it lands.",
    cost: { cash: 800 },
    baseSuccess: 0.55,
    reward: { cash: 2400, crude: 40 },
    failurePenalty: { resource: "crude", mult: 0.6, ticks: 15 },
  },
];

// ---- Operational incidents ----

/** How often a possible incident is rolled for, in milliseconds. */
export const INCIDENT_CHECK_MS = 25000;
/** Chance per check that an incident fires, when one isn't already pending. */
export const INCIDENT_CHANCE = 0.2;

/**
 * Random operational events. Every incident offers at least one free option,
 * so it can always be resolved — the free path just costs production instead
 * of cash.
 */
export const INCIDENTS: Incident[] = [
  {
    id: "blowout",
    title: "Blowout at the Wellhead",
    kind: "spill",
    desc: "Pressure control failed on one of your crude wells. There's oil on the ground and the regulator is already on the phone.",
    requiresBuilding: ["derrick", "steelRig", "offshoreRig"],
    choices: [
      {
        label: "Fund a full cleanup",
        cost: { cash: 500 },
        outcome: "Cleanup crews contained the spill. No lasting damage.",
      },
      {
        label: "Minimal containment",
        penalty: { resource: "crude", mult: 0.6, ticks: 12 },
        outcome: "You capped it cheaply — but the field is throttled while inspectors linger.",
      },
    ],
  },
  {
    id: "inspection",
    title: "Regulatory Inspection",
    kind: "inspection",
    desc: "A surprise audit flags a dozen aging safety systems across your sites.",
    choices: [
      {
        label: "Pay for compliance upgrades",
        cost: { cash: 400 },
        outcome: "Upgrades signed off. The inspector left satisfied.",
      },
      {
        label: "Contest the citation",
        penalty: { resource: "cash", mult: 0.7, ticks: 15 },
        outcome: "You're fighting it in court, and the fines are eating into revenue.",
      },
    ],
  },
  {
    id: "rupture",
    title: "Pipeline Rupture",
    kind: "failure",
    desc: "A gas line has split at a weld. Flow is down until it's dealt with.",
    requiresBuilding: ["gasWell", "pipelineHub"],
    choices: [
      {
        label: "Emergency repair crew",
        cost: { cash: 450 },
        outcome: "The weld was replaced overnight. Flow restored.",
      },
      {
        label: "Patch and monitor",
        penalty: { resource: "gas", mult: 0.6, ticks: 12 },
        outcome: "The patch holds, mostly. Throughput is down until a real fix.",
      },
    ],
  },
  {
    id: "refineryFire",
    title: "Fire in the Cracking Unit",
    kind: "failure",
    desc: "A processing unit caught fire. Nobody was hurt, but the unit is offline.",
    requiresBuilding: ["refinery", "lngTerminal"],
    choices: [
      {
        label: "Rebuild the unit",
        cost: { cash: 900 },
        outcome: "The unit is back online at full throughput.",
      },
      {
        label: "Run reduced throughput",
        penalty: { resource: "fuel", mult: 0.5, ticks: 12 },
        outcome: "You're refining at half rate around the damaged unit.",
      },
    ],
  },
  {
    id: "audit",
    title: "Environmental Audit",
    kind: "inspection",
    minEra: 2,
    desc: "Regulators want a full environmental review of your offshore operations.",
    choices: [
      {
        label: "Settle quietly",
        cost: { cash: 2000 },
        outcome: "Settled out of the press. The review is closed.",
      },
      {
        label: "Submit to a public review",
        penalty: { resource: "cash", mult: 0.75, ticks: 18 },
        outcome: "The review drags on publicly, and buyers are negotiating harder.",
      },
    ],
  },
];

/** Scale an incident's base cost by the multiplier locked in at fire time. */
export function scaleCost(
  cost: Partial<Resources> | undefined,
  mult: number,
): Partial<Resources> {
  if (!cost) return {};
  const scaled: Partial<Resources> = {};
  for (const [res, amount] of Object.entries(cost)) {
    scaled[res as ResourceKey] = Math.round((amount as number) * mult);
  }
  return scaled;
}

// ---- Continent map ----

/**
 * Oil fields on the continent map. Land fields sit on the western landmass,
 * offshore blocks out in the water to the east (see ContinentMap's backdrop).
 */
export const REGIONS: Region[] = [
  {
    id: "spindletop",
    name: "Spindletop Flats",
    x: 15,
    y: 32,
    era: 0,
    scoutCost: 200,
    leaseCost: { cash: 800 },
    bonus: { resource: "crude", mult: 1.15 },
    blurb: "Shallow, forgiving ground. The classic wildcatter's first strike.",
  },
  {
    id: "sourCreek",
    name: "Sour Creek",
    x: 35,
    y: 45,
    era: 0,
    scoutCost: 200,
    leaseCost: { cash: 900 },
    bonus: { resource: "gas", mult: 1.15 },
    blurb: "High sulphur content, but the gas comes up almost on its own.",
  },
  {
    id: "hollowRidge",
    name: "Hollow Ridge",
    x: 30,
    y: 14,
    era: 1,
    scoutCost: 600,
    leaseCost: { cash: 2500, research: 40 },
    bonus: { resource: "research", mult: 1.25 },
    rival: "Meridian Petroleum",
    blurb: "An odd geology that has drawn every survey crew on the continent.",
  },
  {
    id: "permian",
    name: "Permian Shelf",
    x: 12,
    y: 56,
    era: 1,
    scoutCost: 600,
    leaseCost: { cash: 3000 },
    bonus: { resource: "crude", mult: 1.25 },
    blurb: "Layer on layer of stacked pay. Industrial rigs were made for this.",
  },
  {
    id: "gulfBlock12",
    name: "Gulf Block 12",
    x: 72,
    y: 38,
    era: 2,
    scoutCost: 1500,
    leaseCost: { cash: 7000 },
    bonus: { resource: "crude", mult: 1.35 },
    rival: "Atlas Drilling Co.",
    blurb: "Deepwater acreage that Atlas has sat on for a decade without drilling.",
  },
  {
    id: "cormorant",
    name: "Cormorant Deep",
    x: 82,
    y: 62,
    era: 2,
    scoutCost: 1500,
    leaseCost: { cash: 7500 },
    bonus: { resource: "gas", mult: 1.35 },
    blurb: "A vast gas dome under cold water, far from any shipping lane.",
  },
  {
    id: "deltaBelt",
    name: "Delta Refinery Belt",
    x: 44,
    y: 62,
    era: 3,
    scoutCost: 4000,
    leaseCost: { cash: 16000, research: 200 },
    bonus: { resource: "fuel", mult: 1.4 },
    rival: "Consolidated Fuels",
    blurb: "Coastal refining corridor with deepwater berths and rail on both sides.",
  },
  {
    id: "aurora",
    name: "Aurora Plains",
    x: 45,
    y: 25,
    era: 4,
    scoutCost: 8000,
    leaseCost: { cash: 30000, research: 400 },
    bonus: { resource: "cash", mult: 1.5 },
    blurb: "Endless wind and sun. The future, if you can afford to buy into it.",
  },
];

/** Minimum era index at which each building becomes available. */
export const BUILDING_ERA: Record<BuildingTypeKey, number> = (() => {
  const map = {} as Record<BuildingTypeKey, number>;
  ERAS.forEach((era, index) => {
    for (const building of era.unlocks) map[building] = index;
  });
  return map;
})();

/** Three starter contract objectives, per the design spec. */
export const QUESTS: Quest[] = [
  {
    id: "first-well",
    title: "Spud Your First Well",
    desc: "Every empire starts with a hole in the ground. Build a Derrick.",
    metric: { kind: "buildCount", building: "derrick" },
    target: 1,
    reward: { cash: 150 },
  },
  {
    id: "refine-500",
    title: "Fill the Order",
    desc: "A buyer wants refined product. Stockpile 50 Refined Fuel.",
    metric: { kind: "resourceTotal", resource: "fuel" },
    target: 50,
    reward: { cash: 300, research: 20 },
  },
  {
    id: "first-research",
    title: "Invest in the Future",
    desc: "Knowledge compounds. Research any technology in the tech tree.",
    metric: { kind: "techCount" },
    target: 1,
    reward: { cash: 200 },
  },
];

// ---- Market ----

export const SELLABLE: SellableResource[] = ["crude", "gas", "fuel"];

/** Market tuning: base prices, bounds, and volatility. */
export const MARKET = {
  /** Fair-value price each commodity drifts toward. */
  base: { crude: 3, gas: 2.5, fuel: 8 } as MarketPrices,
  /** Hard price floor per commodity. */
  min: { crude: 1, gas: 1, fuel: 3 } as MarketPrices,
  /** Hard price ceiling per commodity. */
  max: { crude: 8, gas: 7, fuel: 20 } as MarketPrices,
  /** How often prices are re-rolled, in milliseconds. */
  tickMs: 5000,
  /** Max random step per tick, as a fraction of base price. */
  drift: 0.12,
  /** Pull back toward base each tick (0–1). */
  reversion: 0.08,
  /** Chance per tick to start an event when none is active. */
  eventChance: 0.12,
  /** How many market ticks an event lasts. */
  eventDurationTicks: 6,
  /** Price multiplier for a spike / crash. */
  spikeMult: 1.7,
  crashMult: 0.55,
};

export function startingPrices(): MarketPrices {
  return { ...MARKET.base };
}

export function makeEmptyGrid(): (null)[] {
  return Array.from({ length: GRID_SIZE * GRID_SIZE }, () => null);
}

/** Fraction of the cash sunk into a building that selling returns. */
export const SELL_REFUND = 0.5;

/** Total cash spent on a building: its purchase plus every upgrade so far. */
export function investedIn(type: BuildingType, level: number): number {
  let total = type.cost;
  for (let l = 1; l < level; l++) total += upgradeCostFor(type, l);
  return total;
}

/** What selling a building at this level pays back. */
export function refundFor(type: BuildingType, level: number): number {
  return Math.floor(investedIn(type, level) * SELL_REFUND);
}

/** Cash cost to upgrade a building from its current level. */
export function upgradeCostFor(type: BuildingType, level: number): number {
  return Math.round(type.cost * 0.6 * Math.pow(1.6, level - 1));
}
