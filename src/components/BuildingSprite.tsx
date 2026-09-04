import { useState } from "react";
import { BUILDING_TYPES } from "../game/data";
import type { BuildingTypeKey } from "../game/types";

interface Props {
  type: BuildingTypeKey;
  size?: number;
  /** Colour for the lucide fallback icon. Omit to inherit `currentColor`. */
  color?: string;
  className?: string;
}

/**
 * Renders a building's pixel-art sprite from `/sprites/<type>.png`, falling
 * back to its lucide icon if the sprite is missing or fails to load. This lets
 * generated art (e.g. from the PixelLab MCP server) be dropped into
 * `public/sprites/` with no further code changes.
 */
export function BuildingSprite({ type, size = 18, color, className }: Props) {
  const meta = BUILDING_TYPES[type];
  const [failed, setFailed] = useState(false);

  if (failed) {
    const Icon = meta.icon;
    return <Icon size={size} color={color} className={className} />;
  }

  return (
    <img
      src={`${import.meta.env.BASE_URL}sprites/${type}.png`}
      alt={meta.name}
      width={size}
      height={size}
      onError={() => setFailed(true)}
      className={className}
      style={{ imageRendering: "pixelated", objectFit: "contain" }}
    />
  );
}
