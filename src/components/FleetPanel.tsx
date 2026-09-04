import { useEffect, useState } from "react";
import { Gem, Plus, Radar, Waves, Zap } from "lucide-react";
import {
  FLEET_PURCHASE,
  RUSH_MS_PER_MARABOU,
  SALVAGE_OPTIONS,
  SURVEY_OPTIONS,
  fleetUnitCost,
} from "../game/data";
import { useGame } from "../game/store";
import type { FleetKind, FleetUnit, SalvageOption, SurveyOption } from "../game/types";

interface Props {
  showToast: (msg: string) => void;
}

const SECTIONS: {
  kind: FleetKind;
  title: string;
  icon: typeof Radar;
  accent: string;
  blurb: string;
}[] = [
  {
    kind: "sonar",
    title: "Sonar Boats",
    icon: Radar,
    accent: "#6E8CA0",
    blurb: "Survey open water to chart new oil fields. One mission at a time per boat.",
  },
  {
    kind: "divers",
    title: "Deep Sea Divers",
    icon: Waves,
    accent: "#5B7B6E",
    blurb: "Search wrecks and seabeds for cash and crude. Divers run in parallel.",
  },
];

function secondsLeft(returnAt: number, now: number): number {
  return Math.max(0, Math.ceil((returnAt - now) / 1000));
}

export function FleetPanel({ showToast }: Props) {
  const resources = useGame((s) => s.resources);
  const fleet = useGame((s) => s.fleet);
  const launchSurvey = useGame((s) => s.launchSurvey);
  const launchSalvage = useGame((s) => s.launchSalvage);
  const collectMission = useGame((s) => s.collectMission);
  const rushMission = useGame((s) => s.rushMission);
  const buyFleetUnit = useGame((s) => s.buyFleetUnit);

  // Local clock so mission timers count down visibly.
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex flex-col gap-4 max-w-md mx-auto">
      {SECTIONS.map((section) => {
        const units = fleet[section.kind];
        const Icon = section.icon;
        const options: (SurveyOption | SalvageOption)[] =
          section.kind === "sonar" ? SURVEY_OPTIONS : SALVAGE_OPTIONS;
        const purchase = FLEET_PURCHASE[section.kind];
        const cashPrice = fleetUnitCost(section.kind, units.length);

        return (
          <div key={section.kind} className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <Icon size={16} color={section.accent} />
              <span className="text-sm font-medium text-paper">{section.title}</span>
              <span className="text-[10px] text-[#8A8477]">({units.length})</span>
            </div>
            <p className="text-[11px] text-[#8A8477] -mt-1">{section.blurb}</p>

            {units.map((unit, i) => (
              <UnitRow
                key={unit.id}
                unit={unit}
                index={i}
                kind={section.kind}
                accent={section.accent}
                options={options}
                now={now}
                cash={resources.cash}
                marabou={resources.marabou}
                onLaunch={(key) =>
                  showToast(
                    section.kind === "sonar"
                      ? launchSurvey(unit.id, key)
                      : launchSalvage(unit.id, key),
                  )
                }
                onCollect={() => showToast(collectMission(section.kind, unit.id))}
                onRush={() => showToast(rushMission(section.kind, unit.id))}
              />
            ))}

            {/* Purchase another unit */}
            <div className="flex gap-2">
              <button
                onClick={() => showToast(buyFleetUnit(section.kind, "cash"))}
                disabled={resources.cash < cashPrice}
                style={{ opacity: resources.cash < cashPrice ? 0.5 : 1 }}
                className="flex-1 rounded-md py-2 text-[11px] font-medium bg-[#38352E] text-paper flex items-center justify-center gap-1"
              >
                <Plus size={12} /> ${cashPrice.toLocaleString()}
              </button>
              <button
                onClick={() => showToast(buyFleetUnit(section.kind, "marabou"))}
                disabled={resources.marabou < purchase.marabou}
                style={{ opacity: resources.marabou < purchase.marabou ? 0.5 : 1 }}
                className="flex-1 rounded-md py-2 text-[11px] font-medium bg-[#38352E] text-paper flex items-center justify-center gap-1"
              >
                <Gem size={12} color="#B98CD6" /> {purchase.marabou} Marabou
              </button>
            </div>
          </div>
        );
      })}

      <p className="text-xs text-center text-[#6E6A5F]">
        Mission lengths are compressed to match this game's pacing — each option notes the
        real-world duration it stands in for.
      </p>
    </div>
  );
}

interface RowProps {
  unit: FleetUnit;
  index: number;
  kind: FleetKind;
  accent: string;
  options: (SurveyOption | SalvageOption)[];
  now: number;
  cash: number;
  marabou: number;
  onLaunch: (key: string) => void;
  onCollect: () => void;
  onRush: () => void;
}

function UnitRow({
  unit,
  index,
  kind,
  accent,
  options,
  now,
  cash,
  marabou,
  onLaunch,
  onCollect,
  onRush,
}: RowProps) {
  const label = `${kind === "sonar" ? "Boat" : "Diver"} ${index + 1}`;
  const mission = unit.mission;
  const done = !!mission && now >= mission.returnAt;
  const remaining = mission ? mission.returnAt - now : 0;
  const rushPrice = mission ? Math.max(1, Math.ceil(remaining / RUSH_MS_PER_MARABOU)) : 0;

  // Progress across the chosen mission's full duration.
  const option = mission ? options.find((o) => o.key === mission.durationKey) : undefined;
  const pct =
    mission && option ? Math.min(100, 100 * (1 - remaining / option.ms)) : 0;

  return (
    <div
      className="border rounded-md p-2.5 bg-panel"
      style={{ borderColor: done ? "#E3A857" : mission ? accent : "#3A362F" }}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-paper">{label}</span>
        <span className="text-[10px] tabular-nums" style={{ color: done ? "#E3A857" : "#8A8477" }}>
          {!mission ? "Idle" : done ? "Ready to collect" : `${secondsLeft(mission.returnAt, now)}s`}
        </span>
      </div>

      {mission ? (
        <>
          <div className="mt-2 h-1.5 rounded-full bg-[#1B1A17] overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${done ? 100 : pct}%`, backgroundColor: done ? "#E3A857" : accent }}
            />
          </div>
          <div className="flex gap-2 mt-2">
            {done ? (
              <button
                onClick={onCollect}
                style={{ backgroundColor: "#E3A857", color: "#1B1A17" }}
                className="flex-1 rounded-md py-1.5 text-[11px] font-semibold"
              >
                Collect
              </button>
            ) : (
              <button
                onClick={onRush}
                disabled={marabou < rushPrice}
                style={{ opacity: marabou < rushPrice ? 0.5 : 1 }}
                className="flex-1 rounded-md py-1.5 text-[11px] font-medium bg-[#38352E] text-paper flex items-center justify-center gap-1"
              >
                <Zap size={11} color="#B98CD6" /> Rush · {rushPrice} Marabou
              </button>
            )}
          </div>
        </>
      ) : (
        <div className="flex flex-col gap-1.5 mt-2">
          {options.map((o) => {
            const launchCost = "cost" in o ? o.cost : 0;
            const affordable = cash >= launchCost;
            return (
              <button
                key={o.key}
                onClick={() => onLaunch(o.key)}
                disabled={!affordable}
                style={{ borderColor: accent, opacity: affordable ? 1 : 0.5 }}
                className="border rounded-md px-2 py-1.5 text-left bg-lot"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-medium text-paper">{o.label}</span>
                  <span className="text-[10px] text-[#8A8477] tabular-nums shrink-0">
                    {Math.round(o.ms / 1000)}s
                    <span className="text-[#5A564C]"> · {o.specLabel}</span>
                  </span>
                </div>
                <div className="text-[10px] text-[#8A8477] mt-0.5 tabular-nums">
                  {"cost" in o
                    ? `$${o.cost} · ${Math.round(o.discoverChance * 100)}% to chart a field`
                    : `$${o.cash[0]}–${o.cash[1]} · ${o.crude[0]}–${o.crude[1]} crude`}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
