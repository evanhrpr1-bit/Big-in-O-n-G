import { ArrowUp, X } from "lucide-react";
import { BUILDING_TYPES, upgradeCostFor } from "../game/data";
import { useGame } from "../game/store";

interface Props {
  index: number;
  onClose: () => void;
  showToast: (msg: string) => void;
}

export function SelectedPanel({ index, onClose, showToast }: Props) {
  const cell = useGame((s) => s.grid[index]);
  const upgrade = useGame((s) => s.upgrade);
  if (!cell) return null;

  const meta = BUILDING_TYPES[cell.type];
  const cost = upgradeCostFor(meta, cell.level);

  return (
    <div className="fixed bottom-0 left-0 right-0 border-t border-hair bg-panel p-4 flex items-center justify-between">
      <div>
        <div className="font-medium text-sm text-paper">
          {meta.name} · Level {cell.level}
        </div>
        <div className="text-xs text-[#8A8477]">{meta.blurb}</div>
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
