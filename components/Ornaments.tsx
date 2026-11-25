import React, { useMemo, useRef, useLayoutEffect } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { TREE_CONFIG } from '../constants';
import { PhotoData } from '../types';

// ---------- tiny helpers ----------
const rand = (seed: number) => {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

/** Paint a geometry one flat colour (vertex colours) so parts can be merged into one mesh. */
const paint = (geo: THREE.BufferGeometry, hex: string) => {
  const g = geo.index ? geo.toNonIndexed() : geo;
  const c = new THREE.Color(hex);
  const n = g.attributes.position.count;
  const col = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b; }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return g;
};

const place = (geo: THREE.BufferGeometry, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) => {
  const m = new THREE.Matrix4().compose(
    new THREE.Vector3(x, y, z),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)),
    new THREE.Vector3(sx, sy, sz)
  );
  geo.applyMatrix4(m);
  return geo;
};

const merge = (parts: THREE.BufferGeometry[]) => {
  const keep = parts.map((p) => {
    const g = p.index ? p.toNonIndexed() : p;
    if (!g.attributes.uv) g.deleteAttribute('uv');
    return g;
  });
  keep.forEach((g) => g.deleteAttribute('uv'));
  return mergeGeometries(keep, false)!;
};

// ---------- geometries ----------
const makeBell = () =>
  merge([
    paint(place(new THREE.SphereGeometry(0.2, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.82), 0, 0, 0, 0, 0, 0, 1, 1.15, 1), '#f4c542'),
    paint(place(new THREE.TorusGeometry(0.2, 0.025, 6, 16), 0, -0.19, 0, Math.PI / 2), '#d9a521'),
    paint(place(new THREE.SphereGeometry(0.055, 8, 6), 0, -0.2, 0), '#8a5a12'),
    paint(place(new THREE.TorusGeometry(0.05, 0.015, 6, 10), 0, 0.27, 0), '#d9a521'),
    // little red bow
    paint(place(new THREE.ConeGeometry(0.09, 0.2, 8), -0.11, 0.33, 0, 0, 0, Math.PI / 2 + 0.2), '#c8102e'),
    paint(place(new THREE.ConeGeometry(0.09, 0.2, 8), 0.11, 0.33, 0, 0, 0, -Math.PI / 2 - 0.2), '#c8102e'),
    paint(place(new THREE.SphereGeometry(0.045, 8, 6), 0, 0.33, 0), '#9d0b24'),
  ]);

const makeDoveBody = () =>
  merge([
    paint(place(new THREE.SphereGeometry(0.34, 14, 10), 0, 0, 0, 0, 0, 0, 1.45, 0.95, 0.85), '#f1f1ec'), // body
    paint(place(new THREE.SphereGeometry(0.18, 12, 8), 0.46, 0.2, 0), '#fcfcfa'), // head
    paint(place(new THREE.ConeGeometry(0.06, 0.2, 6), 0.68, 0.17, 0, 0, 0, -Math.PI / 2), '#ff8a1f'), // beak
    paint(place(new THREE.SphereGeometry(0.025, 6, 4), 0.56, 0.26, 0.11), '#1a1a1a'), // eyes
    paint(place(new THREE.SphereGeometry(0.025, 6, 4), 0.56, 0.26, -0.11), '#1a1a1a'),
    paint(place(new THREE.ConeGeometry(0.16, 0.55, 8), -0.62, 0.02, 0, 0, 0, Math.PI / 2 + 0.25, 1, 1, 0.45), '#c9d0d6'), // tail
    paint(place(new THREE.TorusGeometry(0.2, 0.035, 6, 16, Math.PI), 0.0, -0.18, 0, 0, 0, Math.PI), '#f08a24'), // feet bar (tiny)
  ]);

const makeWing = () =>
  merge([paint(place(new THREE.SphereGeometry(0.3, 12, 8), -0.08, 0.02, 0.25, 0, 0, -0.12, 1.2, 0.85, 0.22), '#d9dfe4')]);

const makeBerries = () => {
  const parts: THREE.BufferGeometry[] = [];
  // three holly leaves
  [-0.5, 0, 0.5].forEach((a) => {
    parts.push(paint(place(new THREE.SphereGeometry(0.2, 8, 6), Math.sin(a) * 0.22, 0.12 + Math.cos(a) * 0.1, 0, 0, 0, -a, 0.38, 1.3, 0.12), '#1f7a46'));
  });
  [[-0.06, -0.02], [0.07, -0.04], [0.0, 0.07]].forEach(([x, y]) =>
    parts.push(paint(place(new THREE.SphereGeometry(0.075, 8, 6), x, y, 0.04), '#d0172f'))
  );
  return merge(parts);
};

const makeCandyCane = () => {
  const parts: THREE.BufferGeometry[] = [];
  const stripes = 9;
  // straight shaft in alternating stripes
  for (let i = 0; i < stripes; i++) {
    const h = 0.55 / stripes;
    parts.push(paint(place(new THREE.CylinderGeometry(0.05, 0.05, h * 1.02, 8), 0, -0.275 + h * (i + 0.5), 0), i % 2 ? '#ffffff' : '#d0172f'));
  }
  // hook (half torus, striped by segments)
  const seg = 8;
  for (let i = 0; i < seg; i++) {
    const a0 = (i / seg) * Math.PI;
    const t = new THREE.TorusGeometry(0.15, 0.05, 8, 4, Math.PI / seg + 0.02);
    place(t, 0.15, 0.275, 0, 0, 0, a0 + 0);
    parts.push(paint(t, i % 2 ? '#ffffff' : '#d0172f'));
  }
  return merge(parts);
};

// ---------- placement ----------
interface Spot { pos: THREE.Vector3; yaw: number; s: number; seed: number; }

const surfaceSpots = (count: number, seed0: number, yMin: number, yMax: number, taken: THREE.Vector3[], photos: PhotoData[], minGap: number) => {
  const H = TREE_CONFIG.HEIGHT, R = TREE_CONFIG.RADIUS_BOTTOM;
  const out: Spot[] = [];
  let tries = 0;
  while (out.length < count && tries < count * 60) {
    tries++;
    const yN = yMin + rand(seed0 + tries * 1.7) * (yMax - yMin);
    const theta = rand(seed0 + tries * 3.1) * Math.PI * 2;
    const y = yN * H - H / 2;
    const r = R * (1 - yN) + 0.35;
    const p = new THREE.Vector3(Math.cos(theta) * r, y, Math.sin(theta) * r);
    if (photos.some((ph) => new THREE.Vector3(...ph.position).distanceTo(p) < 1.5)) continue;
    if (taken.some((t) => t.distanceTo(p) < minGap)) continue;
    taken.push(p);
    out.push({ pos: p, yaw: -theta + Math.PI / 2, s: 0.85 + rand(seed0 + tries) * 0.35, seed: tries });
  }
  return out;
};

// ---------- components ----------
const Dove: React.FC<{ spot: Spot; flip?: boolean }> = ({ spot, flip }) => {
  const body = useMemo(makeDoveBody, []);
  const wing = useMemo(makeWing, []);
  const wingL = useRef<THREE.Mesh>(null);
  const wingR = useRef<THREE.Mesh>(null);
  const grp = useRef<THREE.Group>(null);
  useFrame((s) => {
    const t = s.clock.elapsedTime + spot.seed;
    const flap = Math.sin(t * 1.6) > 0.92 ? Math.sin(t * 22) * 0.35 : 0; // occasional flutter
    if (wingL.current) wingL.current.rotation.x = flap;
    if (wingR.current) wingR.current.rotation.x = -flap;
    if (grp.current) grp.current.position.y = Math.sin(t * 1.2) * 0.02;
  });
  return (
    <group position={spot.pos} rotation={[0, spot.yaw + (flip ? Math.PI * 0.85 : Math.PI * 0.15), 0]} scale={spot.s * 1.15}>
      <group ref={grp}>
        <mesh geometry={body}>
          <meshStandardMaterial vertexColors roughness={0.55} metalness={0} emissive="#ffffff" emissiveIntensity={0.12} />
        </mesh>
        <mesh ref={wingL} geometry={wing}>
          <meshStandardMaterial vertexColors roughness={0.6} emissive="#ffffff" emissiveIntensity={0.1} />
        </mesh>
        <mesh ref={wingR} geometry={wing} scale={[1, 1, -1]}>
          <meshStandardMaterial vertexColors roughness={0.6} emissive="#ffffff" emissiveIntensity={0.1} />
        </mesh>
      </group>
    </group>
  );
};

const Instances: React.FC<{ geometry: THREE.BufferGeometry; spots: Spot[]; metal?: number; rough?: number; swing?: boolean; lift?: number; tilt?: number }> = ({
  geometry, spots, metal = 0, rough = 0.5, swing = false, lift = 0, tilt = 0,
}) => {
  const ref = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const apply = (time: number) => {
    const m = ref.current;
    if (!m) return;
    spots.forEach((sp, i) => {
      dummy.position.copy(sp.pos);
      dummy.position.y += lift;
      dummy.rotation.set(tilt, sp.yaw, swing ? Math.sin(time * 1.4 + sp.seed) * 0.12 : 0);
      dummy.scale.setScalar(sp.s);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
  };
  useLayoutEffect(() => apply(0), [spots]); // eslint-disable-line react-hooks/exhaustive-deps
  useFrame((s) => { if (swing) apply(s.clock.elapsedTime); });
  return (
    <instancedMesh ref={ref} args={[geometry, undefined, spots.length]} frustumCulled={false}>
      <meshStandardMaterial vertexColors metalness={metal} roughness={rough} />
    </instancedMesh>
  );
};

interface OrnamentsProps { isExploded?: boolean; photos?: PhotoData[]; }

const Ornaments: React.FC<OrnamentsProps> = ({ isExploded = false, photos = [] }) => {
  const root = useRef<THREE.Group>(null);
  const scale = useRef(1);

  const photoKey = photos.map((p) => p.position.join(',')).join('|');
  const layout = useMemo(() => {
    const taken: THREE.Vector3[] = [];
    const centres = surfaceSpots(2, 11, 0.38, 0.72, taken, photos, 5);
    const doves: Spot[] = [];
    centres.forEach((c) => {
      // two doves side by side along the branch, facing each other
      const tx = -Math.sin(Math.atan2(c.pos.z, c.pos.x)), tz = Math.cos(Math.atan2(c.pos.z, c.pos.x));
      [-1, 1].forEach((k) =>
        doves.push({ ...c, pos: new THREE.Vector3(c.pos.x + tx * 0.55 * k, c.pos.y, c.pos.z + tz * 0.55 * k), seed: c.seed + (k > 0 ? 3 : 0) })
      );
    });
    const bells = surfaceSpots(IS_SMALL ? 10 : 14, 40, 0.1, 0.88, taken, photos, 1.5);
    const canes = surfaceSpots(8, 90, 0.1, 0.85, taken, photos, 1.4);
    const holly = surfaceSpots(9, 150, 0.08, 0.9, taken, photos, 1.2);
    return { doves, bells, canes, holly };
  }, [photoKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const bellGeo = useMemo(makeBell, []);
  const caneGeo = useMemo(makeCandyCane, []);
  const hollyGeo = useMemo(makeBerries, []);

  useFrame(() => {
    scale.current = THREE.MathUtils.lerp(scale.current, isExploded ? 0 : 1, 0.1);
    if (root.current) {
      const s = Math.max(scale.current, 0.0001);
      root.current.scale.setScalar(s);
      root.current.visible = scale.current > 0.01;
    }
  });

  return (
    <group ref={root}>
      <Instances geometry={bellGeo} spots={layout.bells} metal={0.75} rough={0.28} swing lift={-0.1} />
      <Instances geometry={caneGeo} spots={layout.canes} rough={0.4} swing tilt={0.15} />
      <Instances geometry={hollyGeo} spots={layout.holly} rough={0.5} />
      {layout.doves.map((d, i) => (
        <Dove key={i} spot={d} flip={i % 2 === 0} />
      ))}
    </group>
  );
};

const IS_SMALL = typeof navigator !== 'undefined' && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

export default Ornaments;
