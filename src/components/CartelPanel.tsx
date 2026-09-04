import { useEffect, useState } from "react";
import { Check, Crosshair, Handshake, Lock, TrendingUp, Users } from "lucide-react";
import {
  CARTELS,
  ERAS,
  RAID_APPROACHES,
  RESEARCH_CONTRIBUTION_RATE,
  RESOURCE_META,
  RIVALS,
  scaleCost,
} from "../game/data";
import { cartelLevel, raidSuccessChance, useGame } from "../game/store";
import type { Cartel, Resources } from "../game/types";

interface Props {
  showToast: (msg: string) => void;
}

/** Describe a cartel's benefit at a given standing level. */
function bonusLabel(cartel: Cartel, level: number): string {
  const pct = Math.round(cartel.bonus.perLevel * level * 100);
  return cartel.bonus.kind === "market"
    ? `All sale prices +${pct}%`
    : `${RESOURCE_META[cartel.bonus.resource].label} output +${pct}%`;
}

export function CartelPanel({ showToast }: Props) {
  const era = useGame((s) => s.era);
  const resources = useGame((s) => s.resources);
  const cartelId = useGame((s) => s.cartelId);
  const contribution = useGame((s) => s.cartelContribution);
  const raidCooldownUntil = useGame((s) => s.raidCooldownUntil);
  const joinCartel = useGame((s) => s.joinCartel);
  const leaveCartel = useGame((s) => s.leaveCartel);
  const contributeToCartel = useGame((s) => s.contributeToCartel);
  const runRaid = useGame((s) => s.runRaid);

  // Local clock so the cooldown counts down visibly.
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, []);

  const cartel = CARTELS.find((c) => c.id === cartelId) ?? null;
  const level = cartelLevel(cartelId, contribution);
  const cooldownLeft = Math.max(0, raidCooldownUntil - now);

  // Progress toward the next standing level.
  const nextLevelAt = cartel ? cartel.contributionPerLevel * level : 0;
  const atMax = cartel ? level >= cartel.maxLevel : false;
  const progressPct = cartel && !atMax ? Math.min(100, (contribution / nextLevelAt) * 100) : 100;

  return (
    <div className="flex flex-col gap-3 max-w-md mx-auto">
      {/* Membership */}
      {!cartel ? (
        <>
          <p className="text-xs text-[#8A8477] text-center">
            Cartels pool resources for shared bonuses — and provide the backing you need to
            move against a rival. You may belong to one at a time.
          </p>
          {CARTELS.map((c) => {
            const affordable = resources.cash >= c.dues;
            return (
              <div key={c.id} className="border border-hair rounded-md p-3 bg-panel">
                <div className="flex items-center gap-2">
                  <Users size={15} color="#6E8CA0" />
                  <span className="text-sm font-medium text-paper">{c.name}</span>
                </div>
                <p className="text-xs text-[#8A8477] mt-1 italic">"{c.motto}"</p>
                <div className="text-[11px] text-[#B7B0A2] mt-2 flex items-center gap-1">
                  <TrendingUp size={11} color="#5B7B6E" />
                  {bonusLabel(c, 1)} at level 1, up to {bonusLabel(c, c.maxLevel)} at level{" "}
                  {c.maxLevel}
                </div>
                <button
                  onClick={() => showToast(joinCartel(c.id))}
                  disabled={!affordable}
                  style={{
                    backgroundColor: affordable ? "#6E8CA0" : "#3A362F",
                    color: affordable ? "#1B1A17" : "#5A564C",
                  }}
                  className="w-full rounded-md py-2 mt-3 text-xs font-semibold"
                >
                  Join · ${c.dues} dues
                </button>
              </div>
            );
          })}
        </>
      ) : (
        <>
          {/* Current cartel standing */}
          <div className="border rounded-md p-3 bg-panel" style={{ borderColor: "#6E8CA0" }}>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <Users size={15} color="#6E8CA0" />
                <span className="text-sm font-medium text-paper truncate">{cartel.name}</span>
              </div>
              <span className="text-[10px] font-semibold text-crude bg-[#6E8CA0] rounded px-1.5 py-0.5 shrink-0">
                LEVEL {level}
              </span>
            </div>
            <p className="text-xs text-[#8A8477] mt-1 italic">"{cartel.motto}"</p>

            <div className="text-[11px] mt-2 flex items-center gap-1 text-[#5B7B6E]">
              <TrendingUp size={11} /> Active: {bonusLabel(cartel, level)}
            </div>

            {/* Standing progress */}
            <div className="mt-2 h-1.5 rounded-full bg-[#1B1A17] overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${progressPct}%`, backgroundColor: "#6E8CA0" }}
              />
            </div>
            <div className="text-[10px] mt-1 text-[#6E6A5F] tabular-nums">
              {atMax
                ? "Maximum standing reached"
                : `${Math.floor(contribution)} / ${nextLevelAt} to level ${level + 1}`}
            </div>

            <div className="flex gap-2 mt-3">
              <button
                onClick={() => showToast(contributeToCartel("cash", 1000))}
                disabled={resources.cash < 1000}
                style={{ opacity: resources.cash < 1000 ? 0.5 : 1 }}
                className="flex-1 rounded-md py-2 text-[11px] font-medium bg-[#38352E] text-paper"
              >
                Contribute $1,000
              </button>
              <button
                onClick={() => showToast(contributeToCartel("research", 50))}
                disabled={resources.research < 50}
                style={{ opacity: resources.research < 50 ? 0.5 : 1 }}
                className="flex-1 rounded-md py-2 text-[11px] font-medium bg-[#38352E] text-paper"
              >
                Contribute 50 RP
              </button>
            </div>
            <div className="text-[10px] text-center text-[#5A564C] mt-1">
              Research is worth {RESEARCH_CONTRIBUTION_RATE}× its number in standing
            </div>

            <button
              onClick={() => showToast(leaveCartel())}
              className="w-full rounded-md py-1.5 mt-2 text-[11px] text-[#8A8477] hover:text-paper"
            >
              Leave cartel
            </button>
          </div>

          {/* Rival operations */}
          <div className="border border-hair rounded-md p-3 bg-panel">
            <div className="flex items-center gap-2">
              <Crosshair size={15} color="#C1440E" />
              <span className="text-sm font-medium text-paper">Rival Operations</span>
            </div>
            <p className="text-xs text-[#8A8477] mt-1">
              Move against a competitor. Higher standing improves your odds.
            </p>
            {cooldownLeft > 0 && (
              <div className="text-[11px] text-[#E3A857] mt-2 tabular-nums">
                Crews lying low — {Math.ceil(cooldownLeft / 1000)}s
              </div>
            )}

            <div className="flex flex-col gap-2 mt-3">
              {RIVALS.map((rival) => {
                const locked = era < rival.minEra;
                return (
                  <div
                    key={rival.id}
                    className="border rounded-md p-2.5"
                    style={{
                      borderColor: locked ? "#3A362F" : "#4A463D",
                      opacity: locked ? 0.6 : 1,
                    }}
                  >
                    <div className="flex items-center gap-1.5">
                      {locked && <Lock size={11} color="#5A564C" />}
                      <span className="text-xs font-medium text-paper">{rival.name}</span>
                    </div>
                    <p className="text-[11px] text-[#8A8477] mt-0.5">{rival.blurb}</p>

                    {locked ? (
                      <div className="text-[10px] text-[#5A564C] mt-1.5">
                        Requires the {ERAS[rival.minEra].name}
                      </div>
                    ) : (
                      <div className="flex flex-col gap-1.5 mt-2">
                        {RAID_APPROACHES.map((approach) => {
                          const cost = scaleCost(approach.cost, rival.rewardScale);
                          const reward = scaleCost(approach.reward, rival.rewardScale);
                          const chance = raidSuccessChance(
                            rival.id,
                            approach.id,
                            cartelId,
                            contribution,
                          );
                          const affordable = Object.entries(cost).every(
                            ([res, amt]) =>
                              resources[res as keyof Resources] >= (amt as number),
                          );
                          const disabled = !affordable || cooldownLeft > 0;
                          return (
                            <button
                              key={approach.id}
                              onClick={() => showToast(runRaid(rival.id, approach.id))}
                              disabled={disabled}
                              title={approach.desc}
                              style={{
                                borderColor:
                                  approach.id === "sabotage" ? "#C1440E" : "#5B7B6E",
                                opacity: disabled ? 0.5 : 1,
                              }}
                              className="border rounded-md p-2 text-left bg-lot"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-[11px] font-medium text-paper flex items-center gap-1">
                                  {approach.id === "sabotage" ? (
                                    <Crosshair size={11} color="#C1440E" />
                                  ) : (
                                    <Handshake size={11} color="#5B7B6E" />
                                  )}
                                  {approach.label}
                                </span>
                                <span className="text-[10px] tabular-nums text-[#B7B0A2] shrink-0">
                                  {Math.round(chance * 100)}%
                                </span>
                              </div>
                              <div className="text-[10px] mt-0.5 tabular-nums text-[#8A8477]">
                                Cost {fmt(cost)} → win {fmt(reward)}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <p className="text-xs text-center text-[#6E6A5F] flex items-center justify-center gap-1">
            <Check size={12} color="#5B7B6E" /> Cartel bonuses stack with tech, leases, and eras.
          </p>
        </>
      )}
    </div>
  );
}

function fmt(cost: Partial<Resources>): string {
  return Object.entries(cost)
    .map(([res, amount]) =>
      res === "cash" ? `$${amount}` : `${amount} ${RESOURCE_META[res as keyof Resources].label}`,
    )
    .join(" + ");
}
