import { TrendingUp, TrendingDown, Minus, AlertTriangle } from "lucide-react";
import { MARKET, RESOURCE_META, SELLABLE } from "../game/data";
import { effectivePrice, useGame } from "../game/store";
import type { SellableResource } from "../game/types";

interface Props {
  showToast: (msg: string) => void;
}

/** Compare a live price to its fair value and return a trend descriptor. */
function trendFor(resource: SellableResource, price: number) {
  const base = MARKET.base[resource];
  const delta = (price - base) / base;
  if (delta > 0.04) return { Icon: TrendingUp, color: "#5B7B6E" };
  if (delta < -0.04) return { Icon: TrendingDown, color: "#C1440E" };
  return { Icon: Minus, color: "#8A8477" };
}

export function Market({ showToast }: Props) {
  const resources = useGame((s) => s.resources);
  const prices = useGame((s) => s.prices);
  const marketEvent = useGame((s) => s.marketEvent);
  const sell = useGame((s) => s.sell);

  return (
    <div className="flex flex-col gap-2 max-w-md mx-auto">
      {/* Active-event banner */}
      {marketEvent && (
        <div
          style={{
            borderColor: marketEvent.kind === "spike" ? "#5B7B6E" : "#C1440E",
            backgroundColor: marketEvent.kind === "spike" ? "#1F2A25" : "#2A1E1B",
          }}
          className="border rounded-md p-3 flex items-center gap-2"
        >
          <AlertTriangle
            size={16}
            color={marketEvent.kind === "spike" ? "#5B7B6E" : "#C1440E"}
          />
          <div className="min-w-0">
            <div className="text-sm font-medium text-paper">{marketEvent.label}</div>
            <div className="text-[11px] text-[#8A8477]">
              {marketEvent.kind === "spike" ? "Prices surging" : "Prices depressed"} —{" "}
              {Math.round((marketEvent.mult - 1) * 100)}% for {marketEvent.ticksLeft} more
              {marketEvent.ticksLeft === 1 ? " tick" : " ticks"}
            </div>
          </div>
        </div>
      )}

      {SELLABLE.map((resource) => {
        const meta = RESOURCE_META[resource];
        const Icon = meta.icon;
        const price = effectivePrice(resource, prices, marketEvent);
        const held = Math.floor(resources[resource]);
        const { Icon: TrendIcon, color: trendColor } = trendFor(resource, price);
        const eventHere = marketEvent?.resource === resource;

        return (
          <div
            key={resource}
            style={{ borderColor: eventHere ? trendColor : "#3A362F" }}
            className="border rounded-md p-3 bg-panel"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <Icon size={18} color={meta.color} />
                <div className="min-w-0">
                  <div className="text-sm font-medium text-paper">{meta.label}</div>
                  <div className="text-[11px] text-[#8A8477] tabular-nums">
                    {held} in stock
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <TrendIcon size={14} color={trendColor} />
                <span className="text-sm font-semibold tabular-nums" style={{ color: trendColor }}>
                  ${price.toFixed(2)}
                </span>
              </div>
            </div>

            <div className="flex gap-2 mt-3">
              <button
                onClick={() => showToast(sell(resource, 10))}
                disabled={held <= 0}
                style={{ opacity: held <= 0 ? 0.5 : 1 }}
                className="flex-1 rounded-md py-2 text-xs font-medium bg-[#38352E] text-paper"
              >
                Sell 10
              </button>
              <button
                onClick={() => showToast(sell(resource, Infinity))}
                disabled={held <= 0}
                style={{ backgroundColor: meta.color, opacity: held <= 0 ? 0.5 : 1 }}
                className="flex-1 rounded-md py-2 text-xs font-medium text-crude"
              >
                Sell all · ${Math.floor(price * held)}
              </button>
            </div>
          </div>
        );
      })}

      <p className="text-xs text-center mt-1 text-[#6E6A5F]">
        Prices drift every few seconds. Watch for spikes to sell high — and crashes to hold.
      </p>
    </div>
  );
}
