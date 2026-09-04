import { Check, Gift, Target } from "lucide-react";
import { QUESTS, RESOURCE_META } from "../game/data";
import { isQuestComplete, questProgress, useGame } from "../game/store";
import type { Resources } from "../game/types";

interface Props {
  showToast: (msg: string) => void;
}

function rewardLabel(reward: Partial<Resources>): string {
  return Object.entries(reward)
    .map(([res, amount]) => `${amount} ${RESOURCE_META[res as keyof Resources].label}`)
    .join(" · ");
}

export function QuestLog({ showToast }: Props) {
  const claimQuest = useGame((s) => s.claimQuest);
  const claimedQuests = useGame((s) => s.claimedQuests);
  // Subscribe to the underlying state so progress bars update every tick.
  const grid = useGame((s) => s.grid);
  const resources = useGame((s) => s.resources);
  const researchedTechs = useGame((s) => s.researchedTechs);
  const state = { grid, resources, researchedTechs };

  return (
    <div className="flex flex-col gap-2 max-w-md mx-auto">
      {QUESTS.map((quest) => {
        const progress = Math.min(questProgress(quest, state), quest.target);
        const complete = isQuestComplete(quest, state);
        const claimed = claimedQuests.includes(quest.id);
        const pct = Math.round((progress / quest.target) * 100);
        return (
          <div
            key={quest.id}
            style={{ borderColor: claimed ? "#5B7B6E" : complete ? "#E3A857" : "#3A362F" }}
            className="border rounded-md p-3 bg-panel"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm font-medium flex items-center gap-1.5 text-paper">
                  {claimed ? (
                    <Check size={14} color="#5B7B6E" />
                  ) : (
                    <Target size={14} color={complete ? "#E3A857" : "#8A8477"} />
                  )}
                  {quest.title}
                </div>
                <div className="text-xs mt-0.5 text-[#8A8477]">{quest.desc}</div>
                <div className="text-[10px] mt-1 text-amber flex items-center gap-1">
                  <Gift size={11} /> {rewardLabel(quest.reward)}
                </div>
              </div>
              {claimed ? (
                <span className="text-[10px] text-[#5B7B6E] shrink-0 mt-1 font-medium">Claimed</span>
              ) : (
                <button
                  onClick={() => showToast(claimQuest(quest.id))}
                  disabled={!complete}
                  style={{
                    backgroundColor: complete ? "#E3A857" : "#3A362F",
                    color: complete ? "#1B1A17" : "#5A564C",
                  }}
                  className="rounded-md px-3 py-2 text-xs font-medium shrink-0"
                >
                  Claim
                </button>
              )}
            </div>
            {/* Progress bar */}
            <div className="mt-2 h-1.5 rounded-full bg-[#1B1A17] overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${pct}%`,
                  backgroundColor: claimed ? "#5B7B6E" : complete ? "#E3A857" : "#6E8CA0",
                }}
              />
            </div>
            <div className="text-[10px] mt-1 text-[#6E6A5F] tabular-nums">
              {progress} / {quest.target}
            </div>
          </div>
        );
      })}
    </div>
  );
}
