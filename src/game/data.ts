import {
  Droplet,
  Flame,
  Factory,
  Building2,
  DollarSign,
  Beaker,
} from "lucide-react";
import type {
  BuildingType,
  BuildingTypeKey,
  MarketPrices,
  Quest,
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
  offshoreRig: {
    name: "Offshore Platform",
    icon: Droplet,
    cost: 400,
    baseRate: 4,
    resource: "crude",
    color: "#8A5CF6",
    blurb: "A deepwater rig with far higher output than a derrick.",
    requiresTech: "offshore",
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
    unlockBuilding: "offshoreRig",
    desc: "Unlocks the Offshore Platform, a high-output crude rig.",
  },
];

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
