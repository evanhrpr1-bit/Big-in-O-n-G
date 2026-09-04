import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

/**
 * A concrete gravity-base platform of the North Sea type: one massive concrete
 * monotower rising from the sea, flared at the seabed and again where it meets
 * hugely cantilevered topsides — several deck levels of yellow steel carrying
 * modules, a drilling tower, an angled flare boom, a crane, and lifeboat pods
 * slung outboard on davits.
 *
 * Parts are merged by material at module load, so the whole platform draws in a
 * fixed handful of calls no matter how many are built.
 */

const CONCRETE = "#9EA3A3";
const YELLOW = "#E5B02A";
const WHITE = "#D4D8DC";
const RED = "#C2382C";
const DARK = "#2C343D";
const FLAME = "#F0A83C";

const DECK_Y = 0.57; // top of the concrete shaft

type Vec3 = [number, number, number];

function place(g: THREE.BufferGeometry, pos: Vec3, rot: Vec3 = [0, 0, 0]) {
  g.applyMatrix4(
    new THREE.Matrix4().compose(
      new THREE.Vector3(...pos),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(...rot)),
      new THREE.Vector3(1, 1, 1),
    ),
  );
  return g;
}

const box = (size: Vec3, pos: Vec3, rot: Vec3 = [0, 0, 0]) =>
  place(new THREE.BoxGeometry(...size), pos, rot);

/** Cylinder or frustum — `rTop` differing from `rBottom` gives the taper. */
const cyl = (rTop: number, rBottom: number, h: number, pos: Vec3, rot: Vec3 = [0, 0, 0], seg = 16) =>
  place(new THREE.CylinderGeometry(rTop, rBottom, h, seg), pos, rot);

function buildConcrete(): THREE.BufferGeometry {
  const p: THREE.BufferGeometry[] = [];
  // Flared caisson at the seabed, the shaft, then the flare into the topsides.
  p.push(cyl(0.135, 0.215, 0.12, [0, 0.08, 0]));
  p.push(cyl(0.135, 0.135, 0.34, [0, 0.31, 0]));
  p.push(cyl(0.2, 0.135, 0.09, [0, 0.525, 0]));
  return mergeGeometries(p, false)!;
}

function buildDark(): THREE.BufferGeometry {
  const p: THREE.BufferGeometry[] = [];
  // Sea surface, and the shadowed underside of the cantilevered hull.
  p.push(box([0.84, 0.02, 0.84], [0, 0.01, 0]));
  p.push(box([0.7, 0.08, 0.54], [0, DECK_Y + 0.04, 0]));
  // Grated wind wall / equipment panel on the outboard deck.
  p.push(box([0.18, 0.012, 0.15], [0.26, DECK_Y + 0.22, -0.14]));
  return mergeGeometries(p, false)!;
}

function buildYellow(): THREE.BufferGeometry {
  const p: THREE.BufferGeometry[] = [];

  // Two deck slabs with the framework level between them. The slabs overhang
  // the concrete shaft dramatically, as on the real platform.
  p.push(box([0.74, 0.022, 0.58], [0, DECK_Y + 0.09, 0]));
  p.push(box([0.64, 0.09, 0.48], [0, DECK_Y + 0.145, 0]));
  p.push(box([0.7, 0.02, 0.54], [0, DECK_Y + 0.2, 0]));

  // Perimeter handrails on the lower deck.
  for (const z of [-0.29, 0.29]) p.push(box([0.74, 0.008, 0.008], [0, DECK_Y + 0.13, z]));
  for (const x of [-0.37, 0.37]) p.push(box([0.008, 0.008, 0.58], [x, DECK_Y + 0.13, 0]));

  // Drilling tower rising off the main deck.
  p.push(box([0.07, 0.2, 0.07], [0.02, DECK_Y + 0.31, 0.02]));
  p.push(box([0.1, 0.02, 0.1], [0.02, DECK_Y + 0.42, 0.02]));

  // Flare boom, angled up and outboard.
  const dx = 0.28;
  const dy = 0.18;
  p.push(
    box([Math.hypot(dx, dy), 0.032, 0.032], [0.3, DECK_Y + 0.36, -0.06], [0, 0, Math.atan2(dy, dx)]),
  );
  return mergeGeometries(p, false)!;
}

function buildWhite(): THREE.BufferGeometry {
  const p: THREE.BufferGeometry[] = [];
  // Accommodation and process modules on the top deck.
  p.push(box([0.16, 0.09, 0.14], [-0.2, DECK_Y + 0.255, 0.06]));
  p.push(box([0.13, 0.07, 0.12], [-0.02, DECK_Y + 0.245, -0.14]));
  p.push(box([0.14, 0.1, 0.13], [0.17, DECK_Y + 0.26, 0.11]));
  // Pedestal crane with its boom slewed inboard.
  p.push(box([0.035, 0.22, 0.035], [-0.26, DECK_Y + 0.32, -0.16]));
  p.push(box([0.2, 0.018, 0.018], [-0.17, DECK_Y + 0.455, -0.16], [0, 0, 0.37]));
  return mergeGeometries(p, false)!;
}

function buildRed(): THREE.BufferGeometry {
  const p: THREE.BufferGeometry[] = [];
  // Enclosed lifeboats slung outboard on the deck edge.
  for (const z of [-0.14, 0, 0.14]) {
    p.push(cyl(0.026, 0.026, 0.07, [-0.36, DECK_Y + 0.06, z], [0, 0, Math.PI / 2], 10));
  }
  // Deck-level safety housings.
  p.push(box([0.05, 0.03, 0.05], [0.3, DECK_Y + 0.115, 0.2]));
  p.push(box([0.05, 0.03, 0.05], [-0.3, DECK_Y + 0.115, -0.24]));
  return mergeGeometries(p, false)!;
}

const CONCRETE_GEO = buildConcrete();
const DARK_GEO = buildDark();
const YELLOW_GEO = buildYellow();
const WHITE_GEO = buildWhite();
const RED_GEO = buildRed();

export function PlatformModel() {
  return (
    <group>
      <mesh geometry={DARK_GEO} receiveShadow>
        <meshStandardMaterial color={DARK} roughness={0.5} metalness={0.4} />
      </mesh>
      <mesh geometry={CONCRETE_GEO} castShadow receiveShadow>
        <meshStandardMaterial color={CONCRETE} roughness={0.95} metalness={0.02} />
      </mesh>
      <mesh geometry={YELLOW_GEO} castShadow receiveShadow>
        <meshStandardMaterial color={YELLOW} roughness={0.6} metalness={0.25} />
      </mesh>
      <mesh geometry={WHITE_GEO} castShadow receiveShadow>
        <meshStandardMaterial color={WHITE} roughness={0.65} metalness={0.15} />
      </mesh>
      <mesh geometry={RED_GEO} castShadow>
        <meshStandardMaterial color={RED} roughness={0.7} />
      </mesh>
      {/* Flare at the boom tip */}
      <mesh position={[0.442, DECK_Y + 0.465, -0.06]}>
        <coneGeometry args={[0.034, 0.085, 10]} />
        <meshStandardMaterial color={FLAME} emissive={FLAME} emissiveIntensity={1.6} />
      </mesh>
    </group>
  );
}
