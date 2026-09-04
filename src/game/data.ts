import {
  Droplet,
  Flame,
  Factory,
  Building2,
  DollarSign,
  Beaker,
  Cog,
  Gauge,
  Ship,
  Sun,
} from "lucide-react";
import type {
  BuildingType,
  BuildingTypeKey,
  Era,
  MarketPrices,
  Quest,
  Region,
  ResourceKey,
  SellableResource,
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
    color: "#8A5CF6",
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
    unlocks: ["derrick", "gasWell", "refinery", "office", "lab"],
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

/** Cash cost to upgrade a building from its current level. */
export function upgradeCostFor(type: BuildingType, level: number): number {
  return Math.round(type.cost * 0.6 * Math.pow(1.6, level - 1));
}
