import type { LucideIcon } from "lucide-react";

/** The economic resources the player accumulates and spends. */
export type ResourceKey = "cash" | "crude" | "gas" | "fuel" | "research";

/** Every resource total tracked in state. */
export type Resources = Record<ResourceKey, number>;

/** Multiplicative production bonuses granted by researched tech. */
export type ProductionBonuses = Record<ResourceKey, number>;

/** Commodities that can be sold on the market for cash. */
export type SellableResource = "crude" | "gas" | "fuel";

/** Live unit price per sellable commodity. */
export type MarketPrices = Record<SellableResource, number>;

/** A transient market swing affecting one commodity's price. */
export interface MarketEvent {
  resource: SellableResource;
  kind: "spike" | "crash";
  /** Multiplier applied to the commodity's price while active. */
  mult: number;
  /** Human-readable headline shown in the market banner. */
  label: string;
  /** Market ticks remaining before the event clears. */
  ticksLeft: number;
}

/** A building blueprint from the catalogue. `id` is the key in BUILDING_TYPES. */
export interface BuildingType {
  name: string;
  icon: LucideIcon;
  /** Cash cost to place the first level. */
  cost: number;
  /** Output per tick, per level, before tech bonuses. */
  baseRate: number;
  /** Resource this building produces. */
  resource: ResourceKey;
  /** Optional resources consumed per tick, per level (refineries). */
  consumes?: Partial<Record<ResourceKey, number>>;
  /** Swatch colour used across the UI. */
  color: string;
  /** Short flavour text shown in the inspector. */
  blurb: string;
  /** Tech id that must be researched before this can be built. */
  requiresTech?: string;
}

/** A placed building occupying a grid cell. */
export interface PlacedBuilding {
  type: BuildingTypeKey;
  level: number;
}

/** A node in the research tree. */
export interface Tech {
  id: string;
  name: string;
  cost: number;
  /** Tech ids that must be researched first. */
  requires: string[];
  /** Multiplicative production bonuses this tech grants. */
  effect: Partial<Record<ResourceKey, number>>;
  /** Building id this tech unlocks, if any. */
  unlockBuilding?: BuildingTypeKey;
  desc: string;
}

/** How a quest measures progress against the live game state. */
export type QuestMetric =
  | { kind: "buildCount"; building: BuildingTypeKey }
  | { kind: "resourceTotal"; resource: ResourceKey }
  | { kind: "techCount" };

/** A contract objective the player can complete for a reward. */
export interface Quest {
  id: string;
  title: string;
  desc: string;
  metric: QuestMetric;
  /** Target value the metric must reach for the quest to complete. */
  target: number;
  /** Resources granted when the completed quest is claimed. */
  reward: Partial<Resources>;
}

export type BuildingTypeKey =
  | "derrick"
  | "gasWell"
  | "refinery"
  | "office"
  | "lab"
  | "steelRig"
  | "pipelineHub"
  | "offshoreRig"
  | "lngTerminal"
  | "solarPlant";

/** A temporary production penalty from an operational incident. */
export interface ActiveEffect {
  /** Unique instance id (an incident can fire more than once). */
  id: string;
  label: string;
  resource: ResourceKey;
  /** Multiplier applied to production, below 1 for a penalty. */
  mult: number;
  /** Production ticks remaining before the effect clears. */
  ticksLeft: number;
}

/** One option the player can take when resolving an incident. */
export interface IncidentChoice {
  label: string;
  /** Resource cost, scaled by era at fire time. Omit for a free option. */
  cost?: Partial<Resources>;
  /** Production penalty incurred by taking this option. */
  penalty?: { resource: ResourceKey; mult: number; ticks: number };
  /** Message shown once the option is taken. */
  outcome: string;
}

/** A random operational event demanding a decision from the player. */
export interface Incident {
  id: string;
  title: string;
  desc: string;
  kind: "spill" | "inspection" | "failure";
  /** Only fires when the player has at least one of these buildings placed. */
  requiresBuilding?: BuildingTypeKey[];
  /** Minimum era index for this incident to occur. */
  minEra?: number;
  /** Always includes at least one free option, so it is never unresolvable. */
  choices: IncidentChoice[];
}

/** The incident currently awaiting a decision. */
export interface ActiveIncident {
  id: string;
  /** Cost multiplier locked in at fire time, scaling with the player's era. */
  costMult: number;
}

/** An oil field on the continent map that can be scouted and leased. */
export interface Region {
  id: string;
  name: string;
  /** Position on the map backdrop, as percentages of its box. */
  x: number;
  y: number;
  /** Minimum era index required to scout or lease this region. */
  era: number;
  /** Cash cost to scout, revealing the field's yield and lease terms. */
  scoutCost: number;
  /** Cost to acquire the lease once scouted. */
  leaseCost: Partial<Resources>;
  /** Permanent production bonus granted while the lease is held. */
  bonus: { resource: ResourceKey; mult: number };
  /** Rival company currently holding the field; their buyout premium is
   *  already priced into `leaseCost`. */
  rival?: string;
  blurb: string;
}

/** A technological era. Advancing unlocks a new tier of buildings. */
export interface Era {
  id: string;
  name: string;
  /** One-line description of the era's theme. */
  tagline: string;
  /** Buildings that become available upon reaching this era. */
  unlocks: BuildingTypeKey[];
  /** Cost to advance FROM this era to the next. Omitted on the final era. */
  advanceCost?: Partial<Resources>;
  /** Tech that must be researched before advancing to the next era. */
  requiresTech?: string;
}
