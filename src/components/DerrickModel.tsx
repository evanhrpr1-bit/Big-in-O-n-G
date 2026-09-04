import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

/**
 * A wooden standard derrick, modelled after the classic Kern County rigs:
 * four tapered corner legs, X cross-bracing in every bay, horizontal girts,
 * a projecting monkey board two-thirds up, a railed crown platform, guy wires,
 * and board-sided sheds with a band wheel at the base.
 *
 * The lattice runs to well over a hundred separate members, so the parts are
 * merged into three static geometries at module load — three draw calls per
 * derrick instead of one per timber, however many are on the board.
 */

const H = 1.15; // tower height
const BASE_W = 0.17; // half-width at the sill
const TOP_W = 0.045; // half-width at the crown
const BAYS = 8;
const MONKEY_AT = 0.6; // monkey board height, as a fraction of the tower
const T = 0.016; // timber thickness

const WOOD = "#A85F30";
const WOOD_DARK = "#7C4423";
const CABLE = "#2A2620";

/** Half-width of the tower at a given fraction of its height. */
function halfWidthAt(f: number): number {
  return BASE_W + (TOP_W - BASE_W) * f;
}

/** A box placed by an optional parent transform, then its own position/rotation. */
function box(
  size: [number, number, number],
  pos: [number, number, number],
  rot: [number, number, number] = [0, 0, 0],
  parent?: THREE.Matrix4,
): THREE.BufferGeometry {
  const g = new THREE.BoxGeometry(...size);
  const local = new THREE.Matrix4().compose(
    new THREE.Vector3(...pos),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(...rot)),
    new THREE.Vector3(1, 1, 1),
  );
  g.applyMatrix4(parent ? new THREE.Matrix4().multiplyMatrices(parent, local) : local);
  return g;
}

/** Rotation about Y, used to place each of the four faces and corners. */
function spin(angle: number): THREE.Matrix4 {
  return new THREE.Matrix4().makeRotationY(angle);
}

function buildTower(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];

  // Four corner legs. Each sits on a frame spun to face its diagonal, so the
  // inward lean is a single rotation about X.
  const r0 = BASE_W * Math.SQRT2;
  const r1 = TOP_W * Math.SQRT2;
  const lean = Math.atan2(r0 - r1, H);
  const legLen = Math.hypot(H, r0 - r1);
  for (let k = 0; k < 4; k++) {
    const frame = spin(Math.PI / 4 + (k * Math.PI) / 2);
    parts.push(box([T * 1.5, legLen, T * 1.5], [0, H / 2, (r0 + r1) / 2], [-lean, 0, 0], frame));
  }

  // Per bay: a girt around all four faces, and an X brace on each face.
  const bayH = H / BAYS;
  for (let i = 0; i < BAYS; i++) {
    const f0 = i / BAYS;
    const f1 = (i + 1) / BAYS;
    const w0 = halfWidthAt(f0);
    const w1 = halfWidthAt(f1);
    const wMid = (w0 + w1) / 2;
    const yMid = ((f0 + f1) / 2) * H;

    const span = 2 * wMid;
    const braceLen = Math.hypot(span, bayH);
    const braceAngle = Math.atan2(span, bayH);

    for (let k = 0; k < 4; k++) {
      const face = spin((k * Math.PI) / 2);
      // X bracing
      parts.push(box([T, braceLen, T], [0, yMid, wMid], [0, 0, braceAngle], face));
      parts.push(box([T, braceLen, T], [0, yMid, wMid], [0, 0, -braceAngle], face));
      // Girt capping the bay
      parts.push(box([w1 * 2, T, T], [0, f1 * H, w1], [0, 0, 0], face));
    }
  }

  return mergeGeometries(parts, false)!;
}

function buildFittings(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];

  /** A railed platform: deck plus four posts and a top rail per side. */
  const platform = (y: number, half: number) => {
    parts.push(box([half * 2, 0.018, half * 2], [0, y, 0]));
    for (let k = 0; k < 4; k++) {
      const face = spin((k * Math.PI) / 2);
      parts.push(box([half * 2, 0.01, 0.012], [0, y + 0.055, half], [0, 0, 0], face));
      parts.push(box([0.012, 0.06, 0.012], [half - 0.01, y + 0.03, half], [0, 0, 0], face));
    }
  };

  // Monkey board — wider than the tower, as in the photo — and the crown.
  platform(MONKEY_AT * H, halfWidthAt(MONKEY_AT) + 0.05);
  platform(H, TOP_W + 0.035);

  // Sill deck the derrick stands on.
  parts.push(box([0.64, 0.035, 0.64], [0, 0.017, 0]));

  // Board-sided sheds: a long engine house and a squarer doghouse.
  parts.push(box([0.26, 0.14, 0.5], [-0.4, 0.09, 0.02]));
  parts.push(box([0.28, 0.015, 0.52], [-0.4, 0.17, 0.02]));
  parts.push(box([0.2, 0.13, 0.24], [0.36, 0.085, -0.12]));
  parts.push(box([0.22, 0.015, 0.26], [0.36, 0.155, -0.12]));

  // Band wheel and its hub, lying in the vertical plane like a cartwheel.
  const wheel = new THREE.CylinderGeometry(0.085, 0.085, 0.016, 16);
  wheel.applyMatrix4(
    new THREE.Matrix4().compose(
      new THREE.Vector3(0.2, 0.09, 0.22),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, Math.PI / 2)),
      new THREE.Vector3(1, 1, 1),
    ),
  );
  parts.push(wheel);
  for (let k = 0; k < 3; k++) {
    parts.push(box([0.012, 0.16, 0.012], [0.2, 0.09, 0.22], [(k * Math.PI) / 3, 0, 0]));
  }

  return mergeGeometries(parts, false)!;
}

function buildGuyWires(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const y = MONKEY_AT * H;
  const anchor = 0.58; // how far out the wires reach
  for (let k = 0; k < 4; k++) {
    const frame = spin(Math.PI / 4 + (k * Math.PI) / 2);
    const reach = anchor - halfWidthAt(MONKEY_AT);
    const len = Math.hypot(y, reach);
    parts.push(
      box([0.005, len, 0.005], [0, y / 2, anchor / 2], [-Math.atan2(reach, y), 0, 0], frame),
    );
  }
  return mergeGeometries(parts, false)!;
}

const TOWER = buildTower();
const FITTINGS = buildFittings();
const GUYS = buildGuyWires();

export function DerrickModel() {
  return (
    <group>
      <mesh geometry={TOWER} castShadow receiveShadow>
        <meshStandardMaterial color={WOOD} roughness={0.85} metalness={0.05} />
      </mesh>
      <mesh geometry={FITTINGS} castShadow receiveShadow>
        <meshStandardMaterial color={WOOD_DARK} roughness={0.9} metalness={0.05} />
      </mesh>
      <mesh geometry={GUYS}>
        <meshStandardMaterial color={CABLE} roughness={0.6} metalness={0.4} />
      </mesh>
    </group>
  );
}
