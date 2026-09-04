import { TrendingDown } from "lucide-react";
import { TICK_MS } from "../game/data";
import { useGame } from "../game/store";

/** Shows any temporary production penalties currently in force. */
export function EffectsBar() {
  const effects = useGame((s) => s.effects);
  if (effects.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 mb-4">
      {effects.map((effect) => (
        <span
          key={effect.id}
          className="flex items-center gap-1.5 text-[11px] rounded-md border px-2 py-1"
          style={{ borderColor: "#C1440E", backgroundColor: "#2A1E1B", color: "#E0A99A" }}
        >
          <TrendingDown size={12} color="#C1440E" />
          {effect.label}
          <span className="text-[#8A8477] tabular-nums">
            {Math.ceil((effect.ticksLeft * TICK_MS) / 1000)}s
          </span>
        </span>
      ))}
    </div>
  );
}
