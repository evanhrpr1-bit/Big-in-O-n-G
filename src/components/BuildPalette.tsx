import { Lock } from "lucide-react";
import { BUILDING_ERA, BUILDING_TYPES, ERAS, TECHS } from "../game/data";
import { useGame } from "../game/store";
import { BuildingSprite } from "./BuildingSprite";
import type { BuildingTypeKey } from "../game/types";

interface Props {
  selectedType: BuildingTypeKey;
  onSelect: (type: BuildingTypeKey) => void;
  showToast: (msg: string) => void;
}

export function BuildPalette({ selectedType, onSelect, showToast }: Props) {
  const researchedTechs = useGame((s) => s.researchedTechs);
  const era = useGame((s) => s.era);

  return (
    <div className="flex gap-2 mb-4 overflow-x-auto pb-1 thin-scroll">
      {(Object.entries(BUILDING_TYPES) as [BuildingTypeKey, (typeof BUILDING_TYPES)[BuildingTypeKey]][]).map(
        ([key, type]) => {
          const active = selectedType === key;
          const eraLocked = era < BUILDING_ERA[key];
          const techLocked = !!type.requiresTech && !researchedTechs.includes(type.requiresTech);
          const locked = eraLocked || techLocked;
          return (
            <button
              key={key}
              onClick={() => {
                if (eraLocked) {
                  showToast(`Reach the ${ERAS[BUILDING_ERA[key]].name} to build ${type.name}`);
                } else if (techLocked) {
                  const techName = TECHS.find((t) => t.id === type.requiresTech)?.name;
                  showToast(`Research "${techName}" first`);
                } else {
                  onSelect(key);
                }
              }}
              style={{
                backgroundColor: locked ? "#211F1B" : active ? type.color : "#252320",
                borderColor: locked ? "#3A362F" : active ? type.color : "#3A362F",
                color: locked ? "#5A564C" : active ? "#1B1A17" : "#EDE6D6",
                opacity: locked ? 0.7 : 1,
              }}
              className="border rounded-md px-3 py-2 flex flex-col items-center min-w-[84px] shrink-0 transition-colors"
            >
              {locked ? <Lock size={18} /> : <BuildingSprite type={key} size={20} />}
              <span className="text-[11px] mt-1 font-medium text-center">{type.name}</span>
              <span className="text-[10px] opacity-80">
                {eraLocked
                  ? ERAS[BUILDING_ERA[key]].name
                  : techLocked
                    ? "Locked"
                    : `$${type.cost}`}
              </span>
            </button>
          );
        },
      )}
    </div>
  );
}
