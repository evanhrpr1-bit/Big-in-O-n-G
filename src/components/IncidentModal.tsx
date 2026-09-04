import { AlertTriangle, TrendingDown } from "lucide-react";
import { INCIDENTS, RESOURCE_META, TICK_MS, scaleCost } from "../game/data";
import { useGame } from "../game/store";
import type { Incident, Resources } from "../game/types";

interface Props {
  showToast: (msg: string) => void;
}

const KIND_COLOR: Record<Incident["kind"], string> = {
  spill: "#C1440E",
  failure: "#E3A857",
  inspection: "#6E8CA0",
};

const KIND_LABEL: Record<Incident["kind"], string> = {
  spill: "SPILL",
  failure: "EQUIPMENT FAILURE",
  inspection: "INSPECTION",
};

export function IncidentModal({ showToast }: Props) {
  const activeIncident = useGame((s) => s.activeIncident);
  const resources = useGame((s) => s.resources);
  const resolveIncident = useGame((s) => s.resolveIncident);

  if (!activeIncident) return null;
  const incident = INCIDENTS.find((i) => i.id === activeIncident.id);
  if (!incident) return null;

  const accent = KIND_COLOR[incident.kind];

  return (
    // Deliberately not dismissible: the player must make a decision.
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-3"
      style={{ backgroundColor: "rgba(0,0,0,0.75)" }}
    >
      <div
        className="w-full max-w-md rounded-lg border bg-crude overflow-hidden"
        style={{ borderColor: accent }}
      >
        <div
          className="px-4 py-3 flex items-center gap-2"
          style={{ backgroundColor: "#252320", borderBottom: `1px solid ${accent}` }}
        >
          <AlertTriangle size={18} color={accent} />
          <span className="text-[10px] font-semibold tracking-wider" style={{ color: accent }}>
            {KIND_LABEL[incident.kind]}
          </span>
        </div>

        <div className="p-4">
          <h2 className="font-display text-lg font-semibold text-paper tracking-wide">
            {incident.title}
          </h2>
          <p className="text-xs text-[#8A8477] mt-1.5 leading-relaxed">{incident.desc}</p>

          <div className="flex flex-col gap-2 mt-4">
            {incident.choices.map((choice, i) => {
              const cost = scaleCost(choice.cost, activeIncident.costMult);
              const affordable = Object.entries(cost).every(
                ([res, amount]) =>
                  resources[res as keyof Resources] >= (amount as number),
              );
              const penalty = choice.penalty;
              const seconds = penalty ? Math.round((penalty.ticks * TICK_MS) / 1000) : 0;

              return (
                <button
                  key={i}
                  onClick={() => showToast(resolveIncident(i))}
                  disabled={!affordable}
                  style={{
                    borderColor: affordable ? accent : "#3A362F",
                    opacity: affordable ? 1 : 0.55,
                  }}
                  className="border rounded-md p-3 text-left bg-panel transition-colors"
                >
                  <div className="text-sm font-medium text-paper">{choice.label}</div>

                  {Object.keys(cost).length > 0 && (
                    <div className="text-xs mt-1 tabular-nums" style={{ color: accent }}>
                      {formatCost(cost)}
                      {!affordable && (
                        <span className="text-[#C1440E]"> · can't afford</span>
                      )}
                    </div>
                  )}

                  {penalty && (
                    <div className="text-xs mt-1 flex items-center gap-1 text-[#C1440E]">
                      <TrendingDown size={12} />
                      {RESOURCE_META[penalty.resource].label} −
                      {Math.round((1 - penalty.mult) * 100)}% for ~{seconds}s
                    </div>
                  )}

                  {!penalty && Object.keys(cost).length === 0 && (
                    <div className="text-xs mt-1 text-[#8A8477]">No cost</div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function formatCost(cost: Partial<Resources>): string {
  return Object.entries(cost)
    .map(([res, amount]) =>
      res === "cash" ? `$${amount}` : `${amount} ${RESOURCE_META[res as keyof Resources].label}`,
    )
    .join(" + ");
}
