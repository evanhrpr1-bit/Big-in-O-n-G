import { ArrowUp, X } from "lucide-react";
import { BUILDING_TYPES, upgradeCostFor } from "../game/data";
import { suppliedIndices, useGame } from "../game/store";
import { BuildingSprite } from "./BuildingSprite";

interface Props {
  index: number;
  onClose: () => void;
  showToast: (msg: string) => void;
}

export function SelectedPanel({ index, onClose, showToast }: Props) {
  const cell = useGame((s) => s.grid[index]);
  const grid = useGame((s) => s.grid);
  const upgrade = useGame((s) => s.upgrade);
  if (!cell) return null;
  const starved =
    !!BUILDING_TYPES[cell.type].consumes && !suppliedIndices(grid).has(index);

  const meta = BUILDING_TYPES[cell.type];
  const cost = upgradeCostFor(meta, cell.level);

  return (
    <div className="fixed bottom-0 left-0 right-0 border-t border-hair bg-panel p-4 flex items-center justify-between">
      <div className="flex items-center gap-3 min-w-0">
        <BuildingSprite type={cell.type} size={32} color={meta.color} />
        <div className="min-w-0">
          <div className="font-medium text-sm text-paper">
            {meta.name} · Level {cell.level}
          </div>
          <div className="text-xs text-[#8A8477]">{meta.blurb}</div>
          {starved && (
            <div className="text-[11px] text-[#C1440E] mt-0.5">
              No supply — link it to a producer with roads
            </div>
          )}
        </div>
      </div>
      <div className="flex gap-2 shrink-0">
        <button
          onClick={() => showToast(upgrade(index))}
          className="rounded-md px-3 py-2 flex items-center gap-1 text-xs font-medium text-paper"
          style={{ backgroundColor: "#C1440E" }}
        >
          <ArrowUp size={14} /> ${cost}
        </button>
        <button
          onClick={onClose}
          className="rounded-md px-3 py-2 text-paper"
          style={{ backgroundColor: "#38352E" }}
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
