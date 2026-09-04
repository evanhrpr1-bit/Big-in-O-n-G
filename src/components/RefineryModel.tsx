import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

/**
 * A gas-processing train, modelled from an aerial reference: a tall
 * fractionation column ringed with access platforms, an elevated rack of
 * insulated pipe, a skid of domed vessels, horizontal drums on saddles, and a
 * fin-fan air cooler up on legs.
 *
 * Like the derrick, every part is merged into three static geometries at module
 * load, so a plant of this density costs three draw calls however many are
 * built.
 */

// Cool plant palette taken from the reference: dark blue-grey steel, pale
// insulation, mid-grey grating.
const STEEL = "#39424F";
const INSULATED = "#C3CAD2";
const DECK = "#6C7480";

const PAD_TOP = 0.05;

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

const cyl = (r: number, h: number, pos: Vec3, rot: Vec3 = [0, 0, 0], seg = 14) =>
  place(new THREE.CylinderGeometry(r, r, h, seg), pos, rot);

/** A domed vessel top. */
const dome = (r: number, pos: Vec3, seg = 14) =>
  place(new THREE.SphereGeometry(r, seg, 8, 0, Math.PI * 2, 0, Math.PI / 2), pos);

function buildSteel(): THREE.BufferGeometry {
  const p: THREE.BufferGeometry[] = [];

  // Two vertical separator vessels along the west fence line.
  p.push(cyl(0.042, 0.22, [-0.26, PAD_TOP + 0.11, 0.04]));
  p.push(dome(0.042, [-0.26, PAD_TOP + 0.22, 0.04]));
  p.push(cyl(0.036, 0.18, [-0.26, PAD_TOP + 0.09, -0.16]));
  p.push(dome(0.036, [-0.26, PAD_TOP + 0.18, -0.16]));

  // Skid of three domed contactor vessels.
  for (const x of [-0.17, -0.01, 0.15]) {
    p.push(box([0.12, 0.16, 0.13], [x, PAD_TOP + 0.1, 0.22]));
    p.push(dome(0.062, [x, PAD_TOP + 0.18, 0.22]));
  }

  // Saddles under the horizontal drum.
  p.push(box([0.05, 0.06, 0.028], [0.29, PAD_TOP + 0.05, -0.07]));
  p.push(box([0.05, 0.06, 0.028], [0.29, PAD_TOP + 0.05, 0.07]));

  // Pipe-rack posts and their cap beam.
  for (const x of [-0.26, 0, 0.26]) {
    p.push(box([0.018, 0.3, 0.018], [x, PAD_TOP + 0.15, -0.3]));
  }
  p.push(box([0.56, 0.014, 0.022], [0, PAD_TOP + 0.29, -0.3]));

  // Fin-fan air cooler: a deck on legs with two fan housings on top.
  for (const dx of [-0.06, 0.06]) {
    for (const dz of [-0.05, 0.05]) {
      p.push(box([0.012, 0.24, 0.012], [0.24 + dx, PAD_TOP + 0.12, -0.19 + dz]));
    }
  }
  p.push(box([0.17, 0.022, 0.13], [0.24, PAD_TOP + 0.25, -0.19]));
  for (const dx of [-0.04, 0.04]) {
    p.push(cyl(0.042, 0.014, [0.24 + dx, PAD_TOP + 0.27, -0.19], [0, 0, 0], 16));
  }

  return mergeGeometries(p, false)!;
}

function buildInsulated(): THREE.BufferGeometry {
  const p: THREE.BufferGeometry[] = [];

  // Main fractionation column, with a narrower upper section and a domed head.
  p.push(cyl(0.05, 0.66, [0.15, PAD_TOP + 0.33, -0.08], [0, 0, 0], 18));
  p.push(cyl(0.034, 0.14, [0.15, PAD_TOP + 0.73, -0.08], [0, 0, 0], 16));
  p.push(dome(0.034, [0.15, PAD_TOP + 0.8, -0.08], 16));

  // Secondary stripper column.
  p.push(cyl(0.034, 0.4, [-0.08, PAD_TOP + 0.2, -0.22], [0, 0, 0], 16));
  p.push(dome(0.034, [-0.08, PAD_TOP + 0.4, -0.22], 16));

  // Horizontal drum on its saddles, lying north-south.
  p.push(cyl(0.033, 0.2, [0.29, PAD_TOP + 0.1, 0], [Math.PI / 2, 0, 0], 14));

  // Insulated lines running the length of the rack, plus a riser to the column.
  for (const [z, y] of [
    [-0.335, 0.33],
    [-0.3, 0.33],
    [-0.265, 0.33],
  ] as const) {
    p.push(cyl(0.013, 0.58, [0, PAD_TOP + y, z], [0, 0, Math.PI / 2], 10));
  }
  p.push(cyl(0.019, 0.58, [0, PAD_TOP + 0.37, -0.3], [0, 0, Math.PI / 2], 10));
  p.push(cyl(0.013, 0.22, [0.15, PAD_TOP + 0.33, -0.19], [Math.PI / 2, 0, 0], 10));

  return mergeGeometries(p, false)!;
}

function buildDecking(): THREE.BufferGeometry {
  const p: THREE.BufferGeometry[] = [];

  // Concrete pad.
  p.push(box([0.66, PAD_TOP, 0.66], [0, PAD_TOP / 2, 0]));

  // Access platforms ringing the main column.
  for (const y of [0.24, 0.44, 0.62]) {
    p.push(cyl(0.075, 0.01, [0.15, PAD_TOP + y, -0.08], [0, 0, 0], 16));
  }
  p.push(cyl(0.052, 0.01, [-0.08, PAD_TOP + 0.3, -0.22], [0, 0, 0], 14));

  // Skid decking and its handrail.
  p.push(box([0.52, 0.02, 0.2], [0, PAD_TOP + 0.01, 0.22]));
  p.push(box([0.52, 0.008, 0.008], [0, PAD_TOP + 0.1, 0.315]));

  // Switchback stair up to the column platform.
  p.push(box([0.06, 0.014, 0.26], [-0.02, PAD_TOP + 0.12, 0.02], [-0.75, 0, 0]));

  return mergeGeometries(p, false)!;
}

const STEEL_GEO = buildSteel();
const INSULATED_GEO = buildInsulated();
const DECK_GEO = buildDecking();

export function RefineryModel() {
  return (
    <group>
      <mesh geometry={DECK_GEO} castShadow receiveShadow>
        <meshStandardMaterial color={DECK} roughness={0.9} metalness={0.1} />
      </mesh>
      <mesh geometry={STEEL_GEO} castShadow receiveShadow>
        <meshStandardMaterial color={STEEL} roughness={0.6} metalness={0.45} />
      </mesh>
      <mesh geometry={INSULATED_GEO} castShadow receiveShadow>
        <meshStandardMaterial color={INSULATED} roughness={0.45} metalness={0.2} />
      </mesh>
    </group>
  );
}
