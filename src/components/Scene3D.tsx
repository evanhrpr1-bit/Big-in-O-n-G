import { useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { BUILDING_TYPES, GRID_SIZE } from "../game/data";
import { useGame } from "../game/store";
import { Building3D } from "./Building3D";
import type { BuildingTypeKey, PlacedBuilding } from "../game/types";

interface Props {
  selectedType: BuildingTypeKey;
  selectedCell: number | null;
  onInspect: (index: number) => void;
  showToast: (msg: string) => void;
}

const TILE = 1;
/** Centre the board on the origin so the camera can orbit around it. */
const OFFSET = (GRID_SIZE - 1) / 2;

/** Grid index -> world position on the ground plane. */
function tilePosition(index: number): [number, number, number] {
  const col = index % GRID_SIZE;
  const row = Math.floor(index / GRID_SIZE);
  return [(col - OFFSET) * TILE, 0, (row - OFFSET) * TILE];
}

export function Scene3D({ selectedType, selectedCell, onInspect, showToast }: Props) {
  const grid = useGame((s) => s.grid);
  const build = useGame((s) => s.build);
  const [hovered, setHovered] = useState<number | null>(null);

  function handleTileClick(index: number) {
    if (grid[index]) onInspect(index);
    else showToast(build(index, selectedType));
  }

  return (
    <>
      <div
        className="w-full max-w-md mx-auto rounded-md border border-hair overflow-hidden"
        style={{ aspectRatio: "1 / 1", backgroundColor: "#16181C", touchAction: "none" }}
      >
        <Canvas
          shadows
          camera={{ position: [4.6, 5.0, 4.6], fov: 46 }}
          dpr={[1, 2]}
          onPointerMissed={() => setHovered(null)}
        >
          {/* Dusk-industrial lighting: cool ambient, warm key from the low sun. */}
          <color attach="background" args={["#16181C"]} />
          <fog attach="fog" args={["#16181C", 18, 38]} />
          <ambientLight intensity={0.95} color="#9DB0C4" />
          <hemisphereLight args={["#AEC2D4", "#3A342A", 0.75]} />
          <directionalLight
            position={[5, 8, 3]}
            intensity={2.3}
            color="#FFD9A8"
            castShadow
            shadow-mapSize={[1024, 1024]}
            shadow-camera-left={-6}
            shadow-camera-right={6}
            shadow-camera-top={6}
            shadow-camera-bottom={-6}
          />

          {/* Ground beyond the buildable lots */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
            <planeGeometry args={[16, 16]} />
            <meshStandardMaterial color="#332E25" roughness={1} />
          </mesh>

          {grid.map((cell, index) => (
            <Tile
              key={index}
              index={index}
              cell={cell}
              isSelected={selectedCell === index}
              isHovered={hovered === index}
              onHover={setHovered}
              onClick={handleTileClick}
            />
          ))}

          <OrbitControls
            enablePan={false}
            enableDamping
            dampingFactor={0.08}
            minDistance={3.5}
            maxDistance={13}
            minPolarAngle={0.25}
            // Stay above the horizon so the board is never viewed from underneath.
            maxPolarAngle={Math.PI / 2.35}
            target={[0, 0.2, 0]}
          />
        </Canvas>
      </div>

      <p className="text-xs text-center mt-3 text-[#6E6A5F]">
        Drag to orbit, pinch or scroll to zoom. Tap an empty lot to build the selected
        structure; tap a built one to inspect or upgrade it.
      </p>
    </>
  );
}

interface TileProps {
  index: number;
  cell: PlacedBuilding | null;
  isSelected: boolean;
  isHovered: boolean;
  onHover: (index: number | null) => void;
  onClick: (index: number) => void;
}

function Tile({ index, cell, isSelected, isHovered, onHover, onClick }: TileProps) {
  const [x, , z] = tilePosition(index);
  const accent = cell ? BUILDING_TYPES[cell.type].color : null;
  const lotColor = isSelected
    ? "#EDE6D6"
    : isHovered
      ? "#4A443A"
      : cell
        ? "#3B362E"
        : "#2E2A23";

  return (
    <group position={[x, 0, z]}>
      {/* The lot itself is the click target — raycasting comes free with R3F. */}
      <mesh
        position={[0, 0, 0]}
        receiveShadow
        onClick={(e) => {
          e.stopPropagation();
          onClick(index);
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          onHover(index);
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          onHover(null);
          document.body.style.cursor = "auto";
        }}
      >
        <boxGeometry args={[TILE * 0.94, 0.04, TILE * 0.94]} />
        <meshStandardMaterial color={lotColor} roughness={0.95} />
      </mesh>

      {/* Thin ring in the building's colour, so occupied lots read at a glance */}
      {accent && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.025, 0]}>
          <ringGeometry args={[TILE * 0.4, TILE * 0.47, 4]} />
          <meshBasicMaterial color={accent} transparent opacity={0.75} />
        </mesh>
      )}

      {cell && <Building3D type={cell.type} level={cell.level} />}
    </group>
  );
}
