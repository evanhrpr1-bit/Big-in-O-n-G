import { Hammer } from "lucide-react";
import { BUILDING_TYPES, GRID_SIZE } from "../game/data";
import { useGame } from "../game/store";
import type { BuildingTypeKey } from "../game/types";

interface Props {
  selectedType: BuildingTypeKey;
  selectedCell: number | null;
  onInspect: (index: number) => void;
  showToast: (msg: string) => void;
}

export function Grid({ selectedType, selectedCell, onInspect, showToast }: Props) {
  const grid = useGame((s) => s.grid);
  const build = useGame((s) => s.build);

  function handleClick(index: number) {
    if (grid[index]) {
      onInspect(index);
      return;
    }
    showToast(build(index, selectedType));
  }

  return (
    <>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)`,
          gap: "6px",
          maxWidth: 420,
        }}
        className="mx-auto"
      >
        {grid.map((cell, index) => {
          const type = cell ? BUILDING_TYPES[cell.type] : null;
          const Icon = type ? type.icon : Hammer;
          const isSelected = selectedCell === index;
          return (
            <button
              key={index}
              onClick={() => handleClick(index)}
              style={{
                backgroundColor: cell ? "#2A2722" : "#211F1B",
                borderColor: isSelected ? "#EDE6D6" : cell && type ? type.color : "#38352E",
                aspectRatio: "1 / 1",
              }}
              className="border rounded-md flex flex-col items-center justify-center relative"
            >
              {cell && type ? (
                <>
                  <Icon size={18} color={type.color} />
                  <span className="text-[9px] mt-0.5 text-[#8A8477]">Lv {cell.level}</span>
                </>
              ) : (
                <span className="text-lg text-[#4A463D]">+</span>
              )}
            </button>
          );
        })}
      </div>
      <p className="text-xs text-center mt-3 text-[#6E6A5F]">
        Tap an empty lot to build the selected structure. Tap a built structure to inspect or
        upgrade it.
      </p>
    </>
  );
}
