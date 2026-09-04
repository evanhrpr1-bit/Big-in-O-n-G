import { useEffect, useState } from "react";
import { ArrowUp, RotateCw, Trash2, X } from "lucide-react";
import { BUILDING_TYPES, refundFor, upgradeCostFor } from "../game/data";
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
  const rotateBuilding = useGame((s) => s.rotateBuilding);
  const sellBuilding = useGame((s) => s.sellBuilding);

  // Selling is destructive, so the first press only arms it.
  const [armed, setArmed] = useState(false);
  useEffect(() => setArmed(false), [index]);

  if (!cell) return null;
  const meta = BUILDING_TYPES[cell.type];
  const cost = upgradeCostFor(meta, cell.level);
  const refund = refundFor(meta, cell.level);
  const starved = !!meta.consumes && !suppliedIndices(grid).has(index);

  return (
    <div className="fixed bottom-0 left-0 right-0 border-t border-hair bg-panel p-3 flex flex-col gap-2.5">
      <div className="flex items-center gap-3 min-w-0">
        <BuildingSprite type={cell.type} size={30} color={meta.color} />
        <div className="min-w-0">
          <div className="font-medium text-sm text-paper">
            {meta.name}
            {!meta.isRoad && ` · Level ${cell.level}`}
          </div>
          <div className="text-xs text-[#8A8477]">{meta.blurb}</div>
          {starved && (
            <div className="text-[11px] text-[#C1440E] mt-0.5">
              No supply — link it to a producer with roads
            </div>
          )}
        </div>
        <button onClick={onClose} className="ml-auto shrink-0 text-[#8A8477] hover:text-paper">
          <X size={16} />
        </button>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => showToast(rotateBuilding(index))}
          className="rounded-md px-3 py-2 text-xs font-medium bg-[#38352E] text-paper flex items-center gap-1.5"
        >
          <RotateCw size={14} /> Turn
        </button>

        {!meta.isRoad && (
          <button
            onClick={() => showToast(upgrade(index))}
            style={{ backgroundColor: "#C1440E" }}
            className="flex-1 rounded-md px-3 py-2 text-xs font-medium text-paper flex items-center justify-center gap-1.5"
          >
            <ArrowUp size={14} /> Upgrade · ${cost.toLocaleString()}
          </button>
        )}

        <button
          onClick={() => {
            if (!armed) {
              setArmed(true);
              return;
            }
            showToast(sellBuilding(index));
            onClose();
          }}
          onBlur={() => setArmed(false)}
          style={{
            backgroundColor: armed ? "#C1440E" : "#38352E",
            color: armed ? "#EDE6D6" : "#B7B0A2",
          }}
          className="rounded-md px-3 py-2 text-xs font-medium flex items-center gap-1.5"
        >
          <Trash2 size={14} />
          {armed ? "Confirm" : `Sell · $${refund.toLocaleString()}`}
        </button>
      </div>
    </div>
  );
}
