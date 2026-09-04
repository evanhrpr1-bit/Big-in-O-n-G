import { useEffect, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
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
/** The view the board opens on, and the one Recentre returns to. */
const HOME_POSITION: [number, number, number] = [4.6, 5.0, 4.6];
const HOME_TARGET: [number, number, number] = [0, 0.2, 0];
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
  const controls = useRef<OrbitControlsImpl>(null);

  // Arrow keys pan the view too, for anyone on a keyboard.
  useEffect(() => {
    controls.current?.listenToKeyEvents(document.body);
  }, []);

  /** Return to the opening view. */
  function recentre() {
    const c = controls.current;
    if (!c) return;
    // A pan leaves a decaying panOffset that keeps nudging the target on later
    // frames. Flushing it with damping off zeroes that residue, so the view
    // actually lands on the home framing instead of drifting past it.
    const damping = c.enableDamping;
    c.enableDamping = false;
    c.update();
    c.object.position.set(...HOME_POSITION);
    c.target.set(...HOME_TARGET);
    c.update();
    c.enableDamping = damping;
  }

  /** Keep the camera's focus near the board so panning can't lose it. */
  function clampTarget() {
    const c = controls.current;
    if (!c) return;
    const REACH = 5;
    c.target.x = Math.max(-REACH, Math.min(REACH, c.target.x));
    c.target.z = Math.max(-REACH, Math.min(REACH, c.target.z));
    c.target.y = Math.max(-0.5, Math.min(2, c.target.y));
  }

  function handleTileClick(index: number) {
    if (grid[index]) onInspect(index);
    else showToast(build(index, selectedType));
  }

  return (
    <>
      <div
        className="relative w-full max-w-md mx-auto rounded-md border border-hair overflow-hidden"
        style={{ aspectRatio: "1 / 1", backgroundColor: "#16181C", touchAction: "none" }}
      >
        <button
          onClick={recentre}
          className="absolute top-2 right-2 z-10 rounded-md px-2 py-1 text-[10px] font-medium border border-hair text-[#B7B0A2] bg-panel/90"
        >
          Recentre
        </button>
        <Canvas
          shadows
          camera={{ position: HOME_POSITION, fov: 46 }}
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
            ref={controls}
            // Drag to orbit, two fingers (or right-drag) to pan, pinch/scroll to zoom.
            enablePan
            // Pan along the ground rather than the screen plane, so moving the
            // view across the field feels like sliding a map.
            screenSpacePanning={false}
            enableDamping
            dampingFactor={0.08}
            minDistance={2.2}
            maxDistance={20}
            minPolarAngle={0.15}
            // Stay just above the horizon so the board is never seen from below.
            maxPolarAngle={1.45}
            target={HOME_TARGET}
            onChange={clampTarget}
          />
        </Canvas>
      </div>

      <p className="text-xs text-center mt-3 text-[#6E6A5F]">
        Drag to orbit · two fingers or right-drag to pan · pinch, scroll or arrow keys to
        move. Tap an empty lot to build the selected structure; tap a built one to inspect
        or upgrade it.
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
