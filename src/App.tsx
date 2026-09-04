import { useEffect, useState } from "react";
import { Beaker, ChevronDown, Hammer, Map, ScrollText, Store, RotateCcw } from "lucide-react";
import { ResourceBar } from "./components/ResourceBar";
import { BuildPalette } from "./components/BuildPalette";
import { Grid } from "./components/Grid";
import { SelectedPanel } from "./components/SelectedPanel";
import { TechTree } from "./components/TechTree";
import { QuestLog } from "./components/QuestLog";
import { Market } from "./components/Market";
import { ContinentMap } from "./components/ContinentMap";
import { EraPanel } from "./components/EraPanel";
import { EffectsBar } from "./components/EffectsBar";
import { IncidentModal } from "./components/IncidentModal";
import { Toast } from "./components/Toast";
import { useToast } from "./hooks/useToast";
import { ERAS, INCIDENT_CHECK_MS, MARKET, QUESTS, TICK_MS } from "./game/data";
import { eraAdvancement, isQuestComplete, useGame } from "./game/store";
import type { BuildingTypeKey } from "./game/types";

type View = "build" | "research" | "quests" | "market" | "map";

const TABS: { id: View; label: string; icon: typeof Hammer; active: string }[] = [
  { id: "build", label: "Build", icon: Hammer, active: "#C1440E" },
  { id: "research", label: "Research", icon: Beaker, active: "#6E8CA0" },
  { id: "quests", label: "Quests", icon: ScrollText, active: "#E3A857" },
  { id: "market", label: "Market", icon: Store, active: "#5B7B6E" },
  { id: "map", label: "Map", icon: Map, active: "#8A5CF6" },
];

export default function App() {
  const { message, showToast } = useToast();
  const [view, setView] = useState<View>("build");
  const [selectedType, setSelectedType] = useState<BuildingTypeKey>("derrick");
  const [selectedCell, setSelectedCell] = useState<number | null>(null);
  const [eraOpen, setEraOpen] = useState(false);

  const tick = useGame((s) => s.tick);
  const marketTick = useGame((s) => s.marketTick);
  const incidentTick = useGame((s) => s.incidentTick);
  const reset = useGame((s) => s.reset);
  const era = useGame((s) => s.era);

  // Whether an era advancement is currently available, for the header cue.
  const canAdvanceEra = useGame((s) =>
    eraAdvancement({ era: s.era, resources: s.resources, researchedTechs: s.researchedTechs })
      .canAdvance,
  );

  // Count quests that are complete but not yet claimed, for the tab badge.
  const claimableQuests = useGame((s) =>
    QUESTS.filter(
      (q) => !s.claimedQuests.includes(q.id) && isQuestComplete(q, s),
    ).length,
  );

  // Production loop.
  useEffect(() => {
    const id = setInterval(tick, TICK_MS);
    return () => clearInterval(id);
  }, [tick]);

  // Market loop (slower cadence than production).
  useEffect(() => {
    const id = setInterval(marketTick, MARKET.tickMs);
    return () => clearInterval(id);
  }, [marketTick]);

  // Operational incident loop (slowest cadence).
  useEffect(() => {
    const id = setInterval(incidentTick, INCIDENT_CHECK_MS);
    return () => clearInterval(id);
  }, [incidentTick]);

  function handleReset() {
    if (window.confirm("Wipe your save and start a new empire?")) {
      reset();
      setSelectedCell(null);
      setSelectedType("derrick");
      showToast("New empire founded");
    }
  }

  return (
    <div className="w-full min-h-screen text-white p-3 sm:p-5 pb-24 font-body bg-crude">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl sm:text-2xl font-semibold font-display text-paper tracking-wide">
          Black Gold Empire
        </h1>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setEraOpen(true)}
            className="relative flex items-center gap-1 text-xs sm:text-sm text-[#8A8477] hover:text-paper transition-colors"
          >
            {ERAS[era].name}
            <ChevronDown size={13} />
            {canAdvanceEra && (
              <span className="absolute -top-1 -right-1.5 w-2 h-2 rounded-full bg-amber animate-pulse" />
            )}
          </button>
          <button
            onClick={handleReset}
            title="Reset save"
            className="text-[#8A8477] hover:text-paper transition-colors"
          >
            <RotateCcw size={15} />
          </button>
        </div>
      </div>

      <ResourceBar />

      <EffectsBar />

      {/* View tabs */}
      <div className="flex gap-2 mb-4">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = view === tab.id;
          const showBadge = tab.id === "quests" && claimableQuests > 0;
          return (
            <button
              key={tab.id}
              onClick={() => setView(tab.id)}
              style={{
                backgroundColor: isActive ? tab.active : "#252320",
                color: isActive ? "#1B1A17" : "#EDE6D6",
              }}
              className="relative flex-1 min-w-0 rounded-md py-2 flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1.5 text-[11px] sm:text-sm font-medium"
            >
              <Icon size={14} className="shrink-0" /> {tab.label}
              {showBadge && (
                <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-rust text-paper text-[10px] font-semibold flex items-center justify-center">
                  {claimableQuests}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {view === "build" && (
        <>
          <BuildPalette
            selectedType={selectedType}
            onSelect={setSelectedType}
            showToast={showToast}
          />
          <Grid
            selectedType={selectedType}
            selectedCell={selectedCell}
            onInspect={setSelectedCell}
            showToast={showToast}
          />
        </>
      )}

      {view === "research" && <TechTree showToast={showToast} />}

      {view === "quests" && <QuestLog showToast={showToast} />}

      {view === "market" && <Market showToast={showToast} />}

      {view === "map" && <ContinentMap showToast={showToast} />}

      {selectedCell !== null && view === "build" && (
        <SelectedPanel
          index={selectedCell}
          onClose={() => setSelectedCell(null)}
          showToast={showToast}
        />
      )}

      {eraOpen && <EraPanel onClose={() => setEraOpen(false)} showToast={showToast} />}

      <IncidentModal showToast={showToast} />

      <Toast message={message} />
    </div>
  );
}
