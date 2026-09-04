import { Clock, TrendingDown, X } from "lucide-react";
import { RESOURCE_META } from "../game/data";
import { useGame } from "../game/store";
import type { Resources } from "../game/types";

/** Render a duration as a compact "2h 14m" / "45s". */
function formatAway(ms: number): string {
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return m > 0 ? `${h}h ${m}m` : `${h}h`;
  if (m > 0) return s > 0 ? `${m}m ${s}s` : `${m}m`;
  return `${s}s`;
}

/** Summarises what accrued while the app was closed. */
export function OfflineReportModal() {
  const report = useGame((s) => s.offlineReport);
  const dismiss = useGame((s) => s.dismissOfflineReport);
  if (!report) return null;

  const entries = Object.entries(report.gained) as [keyof Resources, number][];

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-3"
      style={{ backgroundColor: "rgba(0,0,0,0.7)" }}
      onClick={dismiss}
    >
      <div
        className="w-full max-w-sm rounded-lg border bg-crude overflow-hidden"
        style={{ borderColor: "#E3A857" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="px-4 py-3 flex items-center justify-between"
          style={{ backgroundColor: "#252320", borderBottom: "1px solid #E3A857" }}
        >
          <span className="flex items-center gap-2 text-sm font-medium text-paper">
            <Clock size={15} color="#E3A857" /> While you were away
          </span>
          <button onClick={dismiss} className="text-[#8A8477] hover:text-paper">
            <X size={16} />
          </button>
        </div>

        <div className="p-4">
          <p className="text-xs text-[#8A8477]">
            The crews kept working for {formatAway(report.awayMs)}.
          </p>

          {entries.length > 0 ? (
            <div className="grid grid-cols-2 gap-2 mt-3">
              {entries.map(([key, amount]) => {
                const meta = RESOURCE_META[key];
                const Icon = meta.icon;
                return (
                  <div
                    key={key}
                    className="border border-hair rounded-md p-2 flex items-center gap-2 bg-panel"
                  >
                    <Icon size={14} color={meta.color} />
                    <div className="flex flex-col leading-tight min-w-0">
                      <span className="text-[9px] text-[#8A8477] truncate">{meta.label}</span>
                      <span className="text-xs font-medium text-paper tabular-nums">
                        +{Math.floor(amount).toLocaleString()}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-[#5A564C] mt-3">
              Nothing was producing while you were gone.
            </p>
          )}

          {report.pipelineLoss > 0 && (
            <div className="mt-3 flex items-center gap-1.5 text-[11px] text-[#C1440E]">
              <TrendingDown size={12} />
              Pipelines lost {Math.round(report.pipelineLoss)}% condition — send an ROV.
            </div>
          )}

          <button
            onClick={dismiss}
            style={{ backgroundColor: "#E3A857", color: "#1B1A17" }}
            className="w-full rounded-md py-2 mt-4 text-sm font-semibold"
          >
            Back to work
          </button>
        </div>
      </div>
    </div>
  );
}
