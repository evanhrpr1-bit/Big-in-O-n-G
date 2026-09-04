import { Check, ChevronRight, Lock, X } from "lucide-react";
import { BUILDING_TYPES, ERAS, RESOURCE_META } from "../game/data";
import { eraAdvancement, useGame } from "../game/store";

interface Props {
  onClose: () => void;
  showToast: (msg: string) => void;
}

export function EraPanel({ onClose, showToast }: Props) {
  const era = useGame((s) => s.era);
  const resources = useGame((s) => s.resources);
  const researchedTechs = useGame((s) => s.researchedTechs);
  const advanceEra = useGame((s) => s.advanceEra);

  const adv = eraAdvancement({ era, resources, researchedTechs });

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3"
      style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-lg border border-hair bg-crude max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-hair sticky top-0 bg-crude">
          <h2 className="font-display text-lg font-semibold text-paper tracking-wide">Eras</h2>
          <button onClick={onClose} className="text-[#8A8477] hover:text-paper">
            <X size={18} />
          </button>
        </div>

        <div className="p-3 flex flex-col gap-2">
          {ERAS.map((e, i) => {
            const state = i < era ? "past" : i === era ? "current" : "future";
            const accent =
              state === "current" ? "#E3A857" : state === "past" ? "#5B7B6E" : "#3A362F";
            return (
              <div
                key={e.id}
                className="border rounded-md p-3"
                style={{
                  borderColor: accent,
                  backgroundColor: state === "future" ? "#211F1B" : "#252320",
                  opacity: state === "future" ? 0.75 : 1,
                }}
              >
                <div className="flex items-center gap-2">
                  {state === "past" && <Check size={14} color="#5B7B6E" />}
                  {state === "future" && <Lock size={13} color="#5A564C" />}
                  <span className="text-sm font-medium text-paper">{e.name}</span>
                  {state === "current" && (
                    <span className="text-[10px] font-semibold text-crude bg-amber rounded px-1.5 py-0.5">
                      CURRENT
                    </span>
                  )}
                </div>
                <p className="text-xs text-[#8A8477] mt-1">{e.tagline}</p>
                <div className="flex flex-wrap gap-1 mt-2">
                  {e.unlocks.map((b) => (
                    <span
                      key={b}
                      className="text-[10px] rounded px-1.5 py-0.5 border border-hair text-[#B7B0A2]"
                    >
                      {BUILDING_TYPES[b].name}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Advancement footer */}
        <div className="p-4 border-t border-hair">
          {adv.isFinal ? (
            <p className="text-xs text-center text-[#8A8477]">
              You've reached the final era. The empire is complete — for now.
            </p>
          ) : (
            <>
              <div className="flex items-center justify-center gap-1.5 text-xs text-[#8A8477] mb-2">
                <span className="text-paper font-medium">{ERAS[era].name}</span>
                <ChevronRight size={14} />
                <span className="text-amber font-medium">{adv.next?.name}</span>
              </div>

              <div className="flex flex-wrap justify-center gap-2 mb-3">
                {adv.costs.map((c) => {
                  const meta = RESOURCE_META[c.resource];
                  const Icon = meta.icon;
                  return (
                    <span
                      key={c.resource}
                      className="flex items-center gap-1 text-xs tabular-nums"
                      style={{ color: c.ok ? "#B7B0A2" : "#C1440E" }}
                    >
                      <Icon size={12} color={meta.color} />
                      {c.have} / {c.need} {meta.label}
                    </span>
                  );
                })}
                {adv.requiredTech && (
                  <span
                    className="flex items-center gap-1 text-xs"
                    style={{ color: adv.requiredTech.ok ? "#B7B0A2" : "#C1440E" }}
                  >
                    {adv.requiredTech.ok ? (
                      <Check size={12} color="#5B7B6E" />
                    ) : (
                      <Lock size={12} />
                    )}
                    {adv.requiredTech.name}
                  </span>
                )}
              </div>

              <button
                onClick={() => showToast(advanceEra())}
                disabled={!adv.canAdvance}
                style={{
                  backgroundColor: adv.canAdvance ? "#C1440E" : "#3A362F",
                  color: adv.canAdvance ? "#EDE6D6" : "#5A564C",
                }}
                className="w-full rounded-md py-2.5 text-sm font-semibold"
              >
                Advance to {adv.next?.name}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
