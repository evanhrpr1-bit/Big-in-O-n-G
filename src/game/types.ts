import type { LucideIcon } from "lucide-react";

/** The economic resources the player accumulates and spends. */
export type ResourceKey = "cash" | "crude" | "gas" | "fuel" | "research";

/** Every resource total tracked in state. */
export type Resources = Record<ResourceKey, number>;

/** Multiplicative production bonuses granted by researched tech. */
export type ProductionBonuses = Record<ResourceKey, number>;

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
  | "offshoreRig";
