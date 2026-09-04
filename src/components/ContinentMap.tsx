import { useState } from "react";
import { Check, Lock, Search, Handshake, TrendingUp } from "lucide-react";
import { ERAS, REGIONS, RESOURCE_META } from "../game/data";
import { useGame } from "../game/store";
import type { Region, Resources } from "../game/types";

interface Props {
  showToast: (msg: string) => void;
}

type RegionState = "locked" | "available" | "scouted" | "leased";

const PIN_COLOR: Record<RegionState, string> = {
  locked: "#4A463D",
  available: "#6E8CA0",
  scouted: "#E3A857",
  leased: "#5B7B6E",
};

export function ContinentMap({ showToast }: Props) {
  const era = useGame((s) => s.era);
  const resources = useGame((s) => s.resources);
  const scoutedRegions = useGame((s) => s.scoutedRegions);
  const leasedRegions = useGame((s) => s.leasedRegions);
  const scoutRegion = useGame((s) => s.scoutRegion);
  const leaseRegion = useGame((s) => s.leaseRegion);

  const [selectedId, setSelectedId] = useState<string>(REGIONS[0].id);

  function stateOf(region: Region): RegionState {
    if (leasedRegions.includes(region.id)) return "leased";
    if (scoutedRegions.includes(region.id)) return "scouted";
    if (era < region.era) return "locked";
    return "available";
  }

  const selected = REGIONS.find((r) => r.id === selectedId) ?? REGIONS[0];
  const selectedState = stateOf(selected);
  const bonusMeta = RESOURCE_META[selected.bonus.resource];
  const BonusIcon = bonusMeta.icon;

  return (
    <div className="flex flex-col gap-3 max-w-md mx-auto">
      {/* Map backdrop with field pins */}
      <div
        className="relative w-full rounded-md border border-hair overflow-hidden"
        style={{ aspectRatio: "4 / 3", backgroundColor: "#16232A" }}
      >
        <svg
          viewBox="0 0 100 75"
          preserveAspectRatio="none"
          className="absolute inset-0 w-full h-full"
        >
          {/* Landmass */}
          <path
            d="M0,8 L44,4 L58,19 L52,37 L61,53 L40,71 L0,68 Z"
            fill="#2A2722"
            stroke="#3A362F"
            strokeWidth="0.6"
          />
          {/* Coastal shelf hint */}
          <path
            d="M58,19 L52,37 L61,53"
            fill="none"
            stroke="#C1440E"
            strokeWidth="0.4"
            opacity="0.5"
          />
        </svg>

        {REGIONS.map((region) => {
          const rState = stateOf(region);
          const color = PIN_COLOR[rState];
          const isSelected = region.id === selectedId;
          return (
            <button
              key={region.id}
              onClick={() => setSelectedId(region.id)}
              title={rState === "locked" ? "Locked" : region.name}
              className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full flex items-center justify-center transition-transform"
              style={{
                left: `${region.x}%`,
                top: `${region.y}%`,
                width: isSelected ? 22 : 16,
                height: isSelected ? 22 : 16,
                backgroundColor: rState === "leased" ? color : "transparent",
                border: `2px ${rState === "available" ? "dashed" : "solid"} ${color}`,
                boxShadow: isSelected ? `0 0 0 3px rgba(237,230,214,0.25)` : undefined,
              }}
            >
              {rState === "leased" && <Check size={10} color="#1B1A17" />}
              {rState === "locked" && <Lock size={8} color={color} />}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 text-[10px] text-[#8A8477]">
        {(["available", "scouted", "leased", "locked"] as RegionState[]).map((s) => (
          <span key={s} className="flex items-center gap-1">
            <span
              className="inline-block w-2.5 h-2.5 rounded-full"
              style={{
                border: `2px ${s === "available" ? "dashed" : "solid"} ${PIN_COLOR[s]}`,
                backgroundColor: s === "leased" ? PIN_COLOR[s] : "transparent",
              }}
            />
            {s === "available" ? "unscouted" : s}
          </span>
        ))}
      </div>

      {/* Selected region detail */}
      <div className="border border-hair rounded-md p-3 bg-panel">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-sm font-medium text-paper">{selected.name}</div>
            <p className="text-xs text-[#8A8477] mt-0.5">{selected.blurb}</p>
          </div>
          {selectedState === "leased" && (
            <span className="text-[10px] font-semibold text-crude bg-[#5B7B6E] rounded px-1.5 py-0.5 shrink-0">
              LEASED
            </span>
          )}
        </div>

        {/* Yield — hidden until scouted */}
        <div className="mt-2 flex items-center gap-1.5 text-xs">
          <TrendingUp size={13} color="#8A8477" />
          {selectedState === "locked" || selectedState === "available" ? (
            <span className="text-[#5A564C]">Yield unknown — scout to survey</span>
          ) : (
            <span className="flex items-center gap-1 text-[#B7B0A2]">
              <BonusIcon size={12} color={bonusMeta.color} />
              {bonusMeta.label} output +{Math.round((selected.bonus.mult - 1) * 100)}%
            </span>
          )}
        </div>

        {selected.rival && selectedState !== "leased" && (
          <div className="mt-1 text-[11px] text-[#C1440E]">
            Held by {selected.rival} — buyout premium included
          </div>
        )}

        {/* Action */}
        <div className="mt-3">
          {selectedState === "locked" && (
            <div className="rounded-md py-2 text-xs text-center bg-[#3A362F] text-[#5A564C]">
              Requires the {ERAS[selected.era].name}
            </div>
          )}

          {selectedState === "available" && (
            <button
              onClick={() => showToast(scoutRegion(selected.id))}
              disabled={resources.cash < selected.scoutCost}
              style={{
                backgroundColor: resources.cash >= selected.scoutCost ? "#6E8CA0" : "#3A362F",
                color: resources.cash >= selected.scoutCost ? "#1B1A17" : "#5A564C",
              }}
              className="w-full rounded-md py-2 text-xs font-semibold flex items-center justify-center gap-1.5"
            >
              <Search size={13} /> Scout · ${selected.scoutCost}
            </button>
          )}

          {selectedState === "scouted" && (
            <button
              onClick={() => showToast(leaseRegion(selected.id))}
              disabled={!canAfford(selected.leaseCost, resources)}
              style={{
                backgroundColor: canAfford(selected.leaseCost, resources) ? "#C1440E" : "#3A362F",
                color: canAfford(selected.leaseCost, resources) ? "#EDE6D6" : "#5A564C",
              }}
              className="w-full rounded-md py-2 text-xs font-semibold flex items-center justify-center gap-1.5"
            >
              <Handshake size={13} /> Acquire lease · {formatCost(selected.leaseCost)}
            </button>
          )}

          {selectedState === "leased" && (
            <div className="rounded-md py-2 text-xs text-center bg-[#1F2A25] text-[#5B7B6E]">
              Bonus active across your whole operation
            </div>
          )}
        </div>
      </div>

      <p className="text-xs text-center text-[#6E6A5F]">
        Scout a field to survey its yield, then acquire the lease for a permanent
        production bonus. New fields open up as you advance eras.
      </p>
    </div>
  );
}

function canAfford(cost: Partial<Resources>, resources: Resources): boolean {
  return Object.entries(cost).every(
    ([res, amount]) => resources[res as keyof Resources] >= (amount as number),
  );
}

function formatCost(cost: Partial<Resources>): string {
  return Object.entries(cost)
    .map(([res, amount]) =>
      res === "cash" ? `$${amount}` : `${amount} ${RESOURCE_META[res as keyof Resources].label}`,
    )
    .join(" + ");
}
