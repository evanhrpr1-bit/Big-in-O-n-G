import { RESOURCE_META } from "../game/data";
import { useGame } from "../game/store";
import type { ResourceKey } from "../game/types";

export function ResourceBar() {
  const resources = useGame((s) => s.resources);
  return (
    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-4">
      {(Object.entries(RESOURCE_META) as [ResourceKey, (typeof RESOURCE_META)[ResourceKey]][]).map(
        ([key, meta]) => {
          const Icon = meta.icon;
          return (
            <div
              key={key}
              className="border border-hair bg-panel rounded-md p-2 flex items-center gap-1.5"
            >
              <Icon size={14} color={meta.color} />
              <div className="flex flex-col leading-tight min-w-0">
                <span className="text-[9px] text-[#8A8477] truncate">{meta.label}</span>
                <span className="text-xs font-medium text-paper tabular-nums">
                  {Math.floor(resources[key])}
                </span>
              </div>
            </div>
          );
        },
      )}
    </div>
  );
}
