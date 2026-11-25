import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

// ---------------------------------------------------------------------------
//  What is inside the presents. Edit the messages below to say whatever you like!
//  Each present on the tree is given one of these, in turn.
// ---------------------------------------------------------------------------
export const GIFT_MESSAGES = [
  'You are my greatest gift. 💕',
  'Every moment with you is my favourite memory. 🧸',
  'Will you keep choosing me, forever? 💍',
  'For the one who makes my world bloom. 🌹',
  'Merry Christmas, my love. Read this twice. 💌',
];

// ---------- tiny helpers ----------
const paint = (geo: THREE.BufferGeometry, hex: string) => {
  const g = geo.index ? geo.toNonIndexed() : geo;
  const c = new THREE.Color(hex);
  const n = g.attributes.position.count;
  const col = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b; }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return g;
};
type V3 = [number, number, number];
const put = (geo: THREE.BufferGeometry, hex: string, p: V3 = [0, 0, 0], r: V3 = [0, 0, 0], s: V3 = [1, 1, 1]) => {
  geo.applyMatrix4(
    new THREE.Matrix4().compose(new THREE.Vector3(...p), new THREE.Quaternion().setFromEuler(new THREE.Euler(...r)), new THREE.Vector3(...s))
  );
  return paint(geo, hex);
};
const merge = (parts: THREE.BufferGeometry[]) => {
  const list = parts.map((g) => {
    const x = g.index ? g.toNonIndexed() : g;
    x.deleteAttribute('uv');
    return x;
  });
  return mergeGeometries(list, false)!;
};
const sph = (r: number, w = 14, h = 10) => new THREE.SphereGeometry(r, w, h);
const cyl = (rt: number, rb: number, h: number, seg = 10) => new THREE.CylinderGeometry(rt, rb, h, seg);

const heartGeometry = (size: number, depth: number) => {
  const s = new THREE.Shape();
  s.moveTo(0, -0.5);
  s.bezierCurveTo(-0.15, -0.35, -0.55, -0.1, -0.55, 0.18);
  s.bezierCurveTo(-0.55, 0.42, -0.3, 0.52, -0.12, 0.45);
  s.bezierCurveTo(-0.05, 0.42, 0, 0.36, 0, 0.3);
  s.bezierCurveTo(0, 0.36, 0.05, 0.42, 0.12, 0.45);
  s.bezierCurveTo(0.3, 0.52, 0.55, 0.42, 0.55, 0.18);
  s.bezierCurveTo(0.55, -0.1, 0.15, -0.35, 0, -0.5);
  const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: true, bevelSize: 0.04, bevelThickness: 0.05, bevelSegments: 3, curveSegments: 14 });
  g.center();
  g.scale(size, size, size);
  return g;
};

// ---------- the gifts (origin at their base, about 0.8 tall) ----------
const makeHeart = () => merge([put(heartGeometry(0.85, 0.35), '#e0243f', [0, 0.45, 0])]);

const makeTeddy = () =>
  merge([
    put(sph(0.26, 14, 10), '#a9733f', [0, 0.28, 0], [0, 0, 0], [1, 1.1, 0.95]), // body
    put(sph(0.17, 12, 8), '#e8c9a0', [0, 0.27, 0.19], [0, 0, 0], [1, 1.1, 0.5]), // tummy
    put(sph(0.2, 14, 10), '#a9733f', [0, 0.66, 0]), // head
    put(sph(0.09, 10, 8), '#e8c9a0', [0, 0.62, 0.17], [0, 0, 0], [1, 0.8, 0.8]), // snout
    put(sph(0.03, 8, 6), '#2a1a12', [0, 0.65, 0.25]), // nose
    put(sph(0.025, 8, 6), '#2a1a12', [-0.07, 0.72, 0.17]),
    put(sph(0.025, 8, 6), '#2a1a12', [0.07, 0.72, 0.17]),
    put(sph(0.08, 10, 8), '#a9733f', [-0.16, 0.83, 0]), // ears
    put(sph(0.08, 10, 8), '#a9733f', [0.16, 0.83, 0]),
    put(sph(0.09, 10, 8), '#a9733f', [-0.27, 0.34, 0.04]), // arms
    put(sph(0.09, 10, 8), '#a9733f', [0.27, 0.34, 0.04]),
    put(sph(0.1, 10, 8), '#a9733f', [-0.14, 0.06, 0.1]), // feet
    put(sph(0.1, 10, 8), '#a9733f', [0.14, 0.06, 0.1]),
    put(new THREE.ConeGeometry(0.08, 0.1, 6), '#c8102e', [-0.08, 0.47, 0.17], [0, 0, Math.PI / 2]), // bow tie
    put(new THREE.ConeGeometry(0.08, 0.1, 6), '#c8102e', [0.08, 0.47, 0.17], [0, 0, -Math.PI / 2]),
  ]);

const makeRing = () =>
  merge([
    put(new THREE.BoxGeometry(0.5, 0.2, 0.4), '#7a1428', [0, 0.1, 0]), // velvet box base
    put(new THREE.BoxGeometry(0.5, 0.08, 0.4), '#a01c37', [0, 0.24, -0.15], [0.9, 0, 0]), // open lid
    put(new THREE.TorusGeometry(0.11, 0.025, 8, 20), '#f4c542', [0, 0.36, 0.02]), // gold ring
    put(new THREE.OctahedronGeometry(0.07), '#cfeaff', [0, 0.5, 0.02], [0, 0.6, 0], [1, 1.3, 1]), // diamond
  ]);

const makeRose = () => {
  const parts: THREE.BufferGeometry[] = [
    put(cyl(0.02, 0.025, 0.55, 6), '#2e8b4f', [0, 0.28, 0]),
    put(sph(0.12, 12, 8), '#c8102e', [0, 0.62, 0], [0, 0, 0], [1, 0.9, 1]),
    put(sph(0.09, 10, 8), '#e0243f', [0, 0.7, 0]),
    put(sph(0.05, 8, 6), '#9d0b24', [0, 0.74, 0]),
    put(sph(0.1, 10, 6), '#2e8b4f', [0.1, 0.34, 0], [0, 0, -0.6], [1.5, 0.3, 1]),
    put(sph(0.1, 10, 6), '#2e8b4f', [-0.1, 0.24, 0], [0, 0, 0.6], [1.5, 0.3, 1]),
  ];
  [0, 1, 2, 3, 4].forEach((i) => {
    const a = (i / 5) * Math.PI * 2;
    parts.push(put(sph(0.07, 8, 6), '#b50d27', [Math.cos(a) * 0.11, 0.6, Math.sin(a) * 0.11], [0, 0, 0], [1, 1.1, 0.7]));
  });
  return merge(parts);
};

const makeLetter = () =>
  merge([
    put(new THREE.BoxGeometry(0.8, 0.5, 0.05), '#f8efd8', [0, 0.35, 0]),
    put(new THREE.BoxGeometry(0.5, 0.02, 0.07), '#e3d4b0', [-0.2, 0.46, 0], [0, 0, 0.6]), // flap lines
    put(new THREE.BoxGeometry(0.5, 0.02, 0.07), '#e3d4b0', [0.2, 0.46, 0], [0, 0, -0.6]),
    put(heartGeometry(0.2, 0.05), '#c8102e', [0, 0.42, 0.05]), // wax heart seal
  ]);

export const GIFT_BUILDERS = [makeHeart, makeTeddy, makeRing, makeRose, makeLetter];
export const GIFT_COUNT = GIFT_BUILDERS.length;
