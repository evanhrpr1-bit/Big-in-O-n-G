import { BUILDING_TYPES } from "../game/data";
import { DerrickModel } from "./DerrickModel";
import { RefineryModel } from "./RefineryModel";
import { PlatformModel } from "./PlatformModel";
import type { BuildingTypeKey } from "../game/types";

/** Shared structural tones, drawn from the game's palette. */
const PAD = "#3A362F";
const STEEL = "#7C8794";
const DARK_STEEL = "#4A5560";
const FLAME = "#E3A857";

interface Props {
  type: BuildingTypeKey;
  level: number;
}

/**
 * A building rendered from primitive geometry rather than an imported model —
 * stylised low-poly, so the whole catalogue ships without external art assets.
 * Each structure is built around the palette colour its 2D icon already uses.
 */
export function Building3D({ type, level }: Props) {
  const color = BUILDING_TYPES[type].color;
  // Taller with each level, easing off so level 10 doesn't tower absurdly.
  const grow = 1 + Math.min(level - 1, 9) * 0.06;

  return (
    <group scale={[1, grow, 1]}>
      {renderBuilding(type, color)}
    </group>
  );
}

function Pad({ size = 0.62 }: { size?: number }) {
  return (
    <mesh position={[0, 0.03, 0]} castShadow receiveShadow>
      <boxGeometry args={[size, 0.06, size]} />
      <meshStandardMaterial color={PAD} roughness={0.9} />
    </mesh>
  );
}

function renderBuilding(type: BuildingTypeKey, color: string) {
  switch (type) {
    case "derrick":
      return <DerrickModel />;

    case "gasWell":
      return (
        <>
          <Pad />
          <mesh position={[-0.1, 0.2, 0]} castShadow>
            <cylinderGeometry args={[0.2, 0.2, 0.28, 14]} />
            <meshStandardMaterial color={color} roughness={0.7} metalness={0.2} />
          </mesh>
          {/* Flare stack */}
          <mesh position={[0.2, 0.34, 0.02]} castShadow>
            <cylinderGeometry args={[0.03, 0.035, 0.56, 8]} />
            <meshStandardMaterial color={STEEL} metalness={0.6} roughness={0.4} />
          </mesh>
          <mesh position={[0.2, 0.68, 0.02]}>
            <coneGeometry args={[0.055, 0.14, 8]} />
            <meshStandardMaterial color={FLAME} emissive={FLAME} emissiveIntensity={1.4} />
          </mesh>
        </>
      );

    case "refinery":
      return <RefineryModel />;

    case "office":
      return (
        <>
          <Pad />
          <mesh position={[0, 0.24, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.48, 0.42, 0.48]} />
            <meshStandardMaterial color={color} roughness={0.7} metalness={0.2} />
          </mesh>
          <mesh position={[0, 0.58, 0]} castShadow>
            <boxGeometry args={[0.3, 0.26, 0.3]} />
            <meshStandardMaterial color={STEEL} roughness={0.5} metalness={0.4} />
          </mesh>
        </>
      );

    case "lab":
      return (
        <>
          <Pad />
          <mesh position={[0, 0.19, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.5, 0.3, 0.5]} />
            <meshStandardMaterial color={color} roughness={0.7} />
          </mesh>
          {/* Observation dome */}
          <mesh position={[0, 0.34, 0]} castShadow>
            <sphereGeometry args={[0.19, 18, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <meshStandardMaterial color={STEEL} roughness={0.25} metalness={0.6} />
          </mesh>
        </>
      );

    case "steelRig":
      return (
        <>
          <Pad />
          <mesh position={[-0.05, 0.46, 0]} castShadow>
            <cylinderGeometry args={[0.07, 0.24, 0.8, 4]} />
            <meshStandardMaterial color={color} roughness={0.45} metalness={0.6} />
          </mesh>
          <mesh position={[0.22, 0.17, 0.12]} castShadow>
            <boxGeometry args={[0.22, 0.2, 0.3]} />
            <meshStandardMaterial color={DARK_STEEL} roughness={0.6} metalness={0.4} />
          </mesh>
          <mesh position={[-0.05, 0.88, 0]} castShadow>
            <boxGeometry args={[0.12, 0.07, 0.12]} />
            <meshStandardMaterial color={STEEL} metalness={0.7} roughness={0.3} />
          </mesh>
        </>
      );

    case "pipelineHub":
      return (
        <>
          <Pad />
          <mesh position={[0, 0.16, -0.08]} rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.065, 0.065, 0.66, 12]} />
            <meshStandardMaterial color={color} roughness={0.6} metalness={0.4} />
          </mesh>
          <mesh position={[0.06, 0.3, 0.1]} rotation={[Math.PI / 2, 0, 0]} castShadow>
            <cylinderGeometry args={[0.055, 0.055, 0.6, 12]} />
            <meshStandardMaterial color={STEEL} roughness={0.5} metalness={0.5} />
          </mesh>
          {/* Valve wheels */}
          <mesh position={[-0.18, 0.3, 0.1]} castShadow>
            <sphereGeometry args={[0.075, 14, 10]} />
            <meshStandardMaterial color={FLAME} roughness={0.5} metalness={0.3} />
          </mesh>
        </>
      );

    case "offshoreRig":
      return <PlatformModel />;

    case "lngTerminal":
      return (
        <>
          <Pad />
          {/* Spherical cryogenic tank */}
          <mesh position={[-0.1, 0.34, 0]} castShadow>
            <sphereGeometry args={[0.2, 20, 16]} />
            <meshStandardMaterial color={STEEL} roughness={0.3} metalness={0.6} />
          </mesh>
          <mesh position={[-0.1, 0.12, 0]} castShadow>
            <cylinderGeometry args={[0.13, 0.15, 0.16, 12]} />
            <meshStandardMaterial color={DARK_STEEL} roughness={0.7} />
          </mesh>
          <mesh position={[0.22, 0.15, 0.14]} castShadow receiveShadow>
            <boxGeometry args={[0.22, 0.24, 0.3]} />
            <meshStandardMaterial color={color} roughness={0.7} />
          </mesh>
        </>
      );

    case "solarPlant":
      return (
        <>
          <Pad />
          {[-0.19, 0.0, 0.19].map((z, i) => (
            <group key={i} position={[0, 0.16, z]} rotation={[-0.6, 0, 0]}>
              <mesh castShadow>
                <boxGeometry args={[0.5, 0.02, 0.15]} />
                <meshStandardMaterial
                  color={color}
                  roughness={0.2}
                  metalness={0.5}
                  emissive={color}
                  emissiveIntensity={0.15}
                />
              </mesh>
            </group>
          ))}
          <mesh position={[0.24, 0.13, -0.24]} castShadow>
            <boxGeometry args={[0.12, 0.18, 0.12]} />
            <meshStandardMaterial color={DARK_STEEL} roughness={0.7} />
          </mesh>
        </>
      );
  }
}
