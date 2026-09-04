import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Lock } from "lucide-react";
import { BUILDING_ERA, BUILDING_TYPES, ERAS, TECHS } from "../game/data";
import { useGame } from "../game/store";
import { BuildingSprite } from "./BuildingSprite";
import type { BuildingTypeKey } from "../game/types";

interface Props {
  selectedType: BuildingTypeKey;
  onSelect: (type: BuildingTypeKey) => void;
  showToast: (msg: string) => void;
}

const ALL = Object.keys(BUILDING_TYPES) as BuildingTypeKey[];

export function BuildPalette({ selectedType, onSelect, showToast }: Props) {
  const researchedTechs = useGame((s) => s.researchedTechs);
  const era = useGame((s) => s.era);
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  // Close when clicking away or pressing Escape.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const selected = BUILDING_TYPES[selectedType];

  function lockReason(key: BuildingTypeKey): string | null {
    const type = BUILDING_TYPES[key];
    if (era < BUILDING_ERA[key]) return `Reach the ${ERAS[BUILDING_ERA[key]].name}`;
    if (type.requiresTech && !researchedTechs.includes(type.requiresTech)) {
      return `Research ${TECHS.find((t) => t.id === type.requiresTech)?.name}`;
    }
    return null;
  }

  return (
    <div ref={root} className="relative max-w-md mx-auto mb-4">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="w-full border border-hair bg-panel rounded-md px-3 py-2.5 flex items-center gap-2.5"
      >
        <BuildingSprite type={selectedType} size={22} color={selected.color} />
        <span className="flex flex-col items-start min-w-0 leading-tight">
          <span className="text-sm font-medium text-paper truncate">{selected.name}</span>
          <span className="text-[10px] text-[#8A8477]">
            ${selected.cost.toLocaleString()}
          </span>
        </span>
        <ChevronDown
          size={16}
          className="ml-auto shrink-0 transition-transform"
          color="#8A8477"
          style={{ transform: open ? "rotate(180deg)" : undefined }}
        />
      </button>

      {open && (
        <div className="absolute z-30 mt-1 w-full max-h-[19rem] overflow-y-auto rounded-md border border-hair bg-crude shadow-lg">
          {ERAS.map((eraDef, eraIndex) => {
            const inEra = ALL.filter((k) => BUILDING_ERA[k] === eraIndex);
            if (inEra.length === 0) return null;
            return (
              <div key={eraDef.id}>
                <div className="px-3 pt-2.5 pb-1 text-[10px] uppercase tracking-wider text-[#5A564C]">
                  {eraDef.name}
                </div>
                {inEra.map((key) => {
                  const type = BUILDING_TYPES[key];
                  const locked = lockReason(key);
                  const isSelected = key === selectedType;
                  return (
                    <button
                      key={key}
                      onClick={() => {
                        if (locked) {
                          showToast(`${locked} to build ${type.name}`);
                          return;
                        }
                        onSelect(key);
                        setOpen(false);
                      }}
                      style={{ opacity: locked ? 0.55 : 1 }}
                      className="w-full px-3 py-2 flex items-center gap-2.5 text-left hover:bg-panel"
                    >
                      {locked ? (
                        <Lock size={18} color="#5A564C" />
                      ) : (
                        <BuildingSprite type={key} size={20} color={type.color} />
                      )}
                      <span className="flex flex-col min-w-0 leading-tight">
                        <span className="text-xs font-medium text-paper truncate">
                          {type.name}
                        </span>
                        <span className="text-[10px] text-[#8A8477] truncate">
                          {locked ?? `$${type.cost.toLocaleString()}`}
                        </span>
                      </span>
                      {isSelected && <Check size={14} color="#5B7B6E" className="ml-auto" />}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
