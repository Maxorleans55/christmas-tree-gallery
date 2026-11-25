import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { TREE_CONFIG } from '../constants';

// ---------- tiny helpers (shapes are merged into one mesh per character) ----------
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
    new THREE.Matrix4().compose(
      new THREE.Vector3(...p),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(...r)),
      new THREE.Vector3(...s)
    )
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
const cyl = (rt: number, rb: number, h: number, seg = 12) => new THREE.CylinderGeometry(rt, rb, h, seg);
const cone = (r: number, h: number, seg = 12) => new THREE.ConeGeometry(r, h, seg);
const tor = (r: number, t: number, seg = 16) => new THREE.TorusGeometry(r, t, 8, seg);

const SKIN = '#f6c9a4';
const WHITE = '#fbfbf8';
const RED = '#c8102e';
const DARK = '#241a16';

// ---------- character geometries (all face +Z, feet at y = 0) ----------
const santaBody = () =>
  merge([
    put(cyl(0.16, 0.2, 0.34), DARK, [-0.17, 0.17, 0.04]), // boots
    put(cyl(0.16, 0.2, 0.34), DARK, [0.17, 0.17, 0.04]),
    put(cyl(0.38, 0.62, 1.0, 16), RED, [0, 0.82, 0]), // coat
    put(tor(0.6, 0.07, 20), WHITE, [0, 0.36, 0], [Math.PI / 2, 0, 0]), // fur hem
    put(cyl(0.02, 0.02, 0.9, 6), WHITE, [0, 0.82, 0.5], [0, 0, 0], [1, 1, 1]), // front fur strip
    put(tor(0.5, 0.06, 20), DARK, [0, 0.78, 0], [Math.PI / 2, 0, 0]), // belt
    put(new THREE.BoxGeometry(0.2, 0.18, 0.06), '#f4c542', [0, 0.78, 0.5]), // buckle
    put(sph(0.3, 16, 12), SKIN, [0, 1.52, 0]), // head
    put(sph(0.3, 14, 10), WHITE, [0, 1.38, 0.1], [0, 0, 0], [1.05, 0.95, 0.8]), // beard
    put(sph(0.12), WHITE, [-0.12, 1.48, 0.28], [0, 0, 0], [1.4, 0.7, 0.8]), // moustache
    put(sph(0.12), WHITE, [0.12, 1.48, 0.28], [0, 0, 0], [1.4, 0.7, 0.8]),
    put(sph(0.06), '#f0a08c', [0, 1.52, 0.33]), // nose
    put(sph(0.03, 8, 6), DARK, [-0.11, 1.6, 0.27]), // eyes
    put(sph(0.03, 8, 6), DARK, [0.11, 1.6, 0.27]),
    put(cone(0.32, 0.6, 14), RED, [0, 1.98, -0.04], [-0.25, 0, 0]), // hat
    put(tor(0.3, 0.07, 16), WHITE, [0, 1.74, 0.0], [Math.PI / 2, 0, 0]),
    put(sph(0.1), WHITE, [0, 2.25, -0.22]), // pom-pom
    // left arm hangs by the side
    put(cyl(0.1, 0.1, 0.5), RED, [-0.46, 1.0, 0.05], [0, 0, 0.35]),
    put(sph(0.11), WHITE, [-0.57, 0.74, 0.05]),
  ]);
// right arm waves: pivot at the shoulder, geometry hangs down from the origin
const santaArm = () =>
  merge([put(cyl(0.1, 0.1, 0.5), RED, [0, -0.25, 0]), put(sph(0.12), WHITE, [0, -0.54, 0])]);
const santaSack = () =>
  merge([
    put(sph(0.45, 14, 12), '#a8743c', [0, 0.42, 0], [0, 0, 0], [1, 1.1, 0.9]),
    put(cyl(0.12, 0.2, 0.16), '#8a5a2a', [0, 0.92, 0]),
    put(tor(0.15, 0.03), RED, [0, 0.88, 0], [Math.PI / 2, 0, 0]),
    put(new THREE.BoxGeometry(0.22, 0.22, 0.22), '#388E3C', [0.1, 1.08, 0], [0.3, 0.4, 0.2]), // peeking gifts
    put(new THREE.BoxGeometry(0.2, 0.2, 0.2), '#1976D2', [-0.12, 1.04, 0.04], [0.2, -0.5, -0.2]),
  ]);

const elfBody = (coat: string, trim: string) =>
  merge([
    put(cyl(0.1, 0.1, 0.34), '#3b2a22', [-0.1, 0.17, 0]),
    put(cyl(0.1, 0.1, 0.34), '#3b2a22', [0.1, 0.17, 0]),
    put(cone(0.1, 0.28), trim, [-0.1, 0.06, 0.16], [Math.PI / 2, 0, 0]), // curly shoes
    put(cone(0.1, 0.28), trim, [0.1, 0.06, 0.16], [Math.PI / 2, 0, 0]),
    put(cyl(0.2, 0.3, 0.6, 14), coat, [0, 0.62, 0]),
    put(tor(0.27, 0.04, 16), trim, [0, 0.4, 0], [Math.PI / 2, 0, 0]),
    put(tor(0.24, 0.03, 16), '#f4c542', [0, 0.6, 0], [Math.PI / 2, 0, 0]), // belt
    put(sph(0.26, 16, 12), SKIN, [0, 1.12, 0]),
    put(cone(0.06, 0.28, 8), SKIN, [-0.3, 1.18, 0], [0, 0, Math.PI / 2 + 0.5]), // pointy ears
    put(cone(0.06, 0.28, 8), SKIN, [0.3, 1.18, 0], [0, 0, -Math.PI / 2 - 0.5]),
    put(sph(0.03, 8, 6), DARK, [-0.09, 1.16, 0.23]),
    put(sph(0.03, 8, 6), DARK, [0.09, 1.16, 0.23]),
    put(sph(0.045), '#f0a08c', [0, 1.09, 0.26]),
    put(tor(0.07, 0.012, 10), '#b3261e', [0, 1.02, 0.22], [0, 0, 0], [1, 0.6, 1]),
    put(cone(0.28, 0.7, 14), coat, [0.02, 1.62, -0.04], [-0.2, 0, -0.18]), // hat
    put(tor(0.26, 0.05, 16), trim, [0, 1.34, 0], [Math.PI / 2, 0, 0]),
    put(sph(0.07), '#f4c542', [0.18, 1.96, -0.2]), // bell on the tip
    put(cyl(0.07, 0.07, 0.4), coat, [-0.3, 0.7, 0.04], [0, 0, 0.3]),
    put(cyl(0.07, 0.07, 0.4), coat, [0.3, 0.7, 0.04], [0, 0, -0.3]),
    put(sph(0.07), SKIN, [-0.38, 0.5, 0.04]),
    put(sph(0.07), SKIN, [0.38, 0.5, 0.04]),
  ]);

const reindeerBody = (rudolph: boolean) => {
  const BROWN = '#8a5a35', LIGHT = '#c99a6b';
  const parts: THREE.BufferGeometry[] = [
    put(sph(0.4, 16, 12), BROWN, [0, 0.95, 0], [0, 0, 0], [0.75, 0.8, 1.5]), // body (long along z)
    put(sph(0.28, 12, 10), LIGHT, [0, 0.82, 0.25], [0, 0, 0], [0.8, 0.8, 1.2]), // belly patch
    put(cyl(0.12, 0.17, 0.55), BROWN, [0, 1.35, 0.5], [0.45, 0, 0]), // neck
    put(sph(0.2, 14, 10), BROWN, [0, 1.7, 0.7], [0, 0, 0], [1, 1, 1.15]), // head
    put(sph(0.12, 10, 8), LIGHT, [0, 1.62, 0.88], [0, 0, 0], [1, 0.9, 1.1]), // snout
    put(sph(0.025, 8, 6), DARK, [-0.1, 1.76, 0.82]),
    put(sph(0.025, 8, 6), DARK, [0.1, 1.76, 0.82]),
    put(cone(0.07, 0.22, 8), BROWN, [-0.18, 1.88, 0.62], [0.2, 0, 0.9]), // ears
    put(cone(0.07, 0.22, 8), BROWN, [0.18, 1.88, 0.62], [0.2, 0, -0.9]),
    put(sph(0.11, 8, 6), '#ffffff', [0, 0.95, -0.62], [0, 0, 0], [0.8, 1, 0.8]), // tail
    // antlers (trunk + two prongs each)
    put(cyl(0.025, 0.035, 0.4, 6), '#d8c3a0', [-0.1, 2.0, 0.6], [0, 0, 0.35]),
    put(cyl(0.02, 0.025, 0.25, 6), '#d8c3a0', [-0.26, 2.12, 0.62], [0.2, 0, 0.9]),
    put(cyl(0.02, 0.025, 0.25, 6), '#d8c3a0', [-0.2, 2.2, 0.6], [-0.2, 0, 0.1]),
    put(cyl(0.025, 0.035, 0.4, 6), '#d8c3a0', [0.1, 2.0, 0.6], [0, 0, -0.35]),
    put(cyl(0.02, 0.025, 0.25, 6), '#d8c3a0', [0.26, 2.12, 0.62], [0.2, 0, -0.9]),
    put(cyl(0.02, 0.025, 0.25, 6), '#d8c3a0', [0.2, 2.2, 0.6], [-0.2, 0, -0.1]),
    // collar + bell
    put(tor(0.15, 0.03, 12), RED, [0, 1.45, 0.52], [Math.PI / 2 - 0.45, 0, 0]),
    put(sph(0.05, 8, 6), '#f4c542', [0, 1.34, 0.64]),
  ];
  [[-0.2, 0.5], [0.2, 0.5], [-0.2, -0.45], [0.2, -0.45]].forEach(([x, z]) => {
    parts.push(put(cyl(0.06, 0.05, 0.65, 8), BROWN, [x, 0.33, z]));
    parts.push(put(cyl(0.07, 0.07, 0.08, 8), DARK, [x, 0.04, z]));
  });
  parts.push(put(sph(0.07, 8, 6), rudolph ? '#ff1f3d' : DARK, [0, 1.62, 0.99])); // nose
  return merge(parts);
};

const snowmanBody = () =>
  merge([
    put(sph(0.55, 18, 14), WHITE, [0, 0.5, 0]),
    put(sph(0.4, 16, 12), WHITE, [0, 1.2, 0]),
    put(sph(0.28, 14, 10), WHITE, [0, 1.75, 0]),
    put(cone(0.05, 0.3, 8), '#ff8a1f', [0, 1.74, 0.38], [Math.PI / 2, 0, 0]), // carrot
    put(sph(0.035, 8, 6), DARK, [-0.1, 1.84, 0.24]),
    put(sph(0.035, 8, 6), DARK, [0.1, 1.84, 0.24]),
    put(sph(0.04, 8, 6), DARK, [0, 1.35, 0.38]), // buttons
    put(sph(0.04, 8, 6), DARK, [0, 1.15, 0.4]),
    put(sph(0.04, 8, 6), DARK, [0, 0.95, 0.39]),
    put(tor(0.28, 0.07, 16), RED, [0, 1.5, 0], [Math.PI / 2, 0, 0]), // scarf
    put(cyl(0.07, 0.07, 0.4), RED, [0.1, 1.38, 0.3], [0.2, 0, 0.1]),
    put(cyl(0.3, 0.3, 0.04, 16), DARK, [0, 2.0, 0]), // top hat
    put(cyl(0.18, 0.18, 0.3, 16), DARK, [0, 2.17, 0]),
    put(cyl(0.185, 0.185, 0.06, 16), RED, [0, 2.06, 0]),
    put(cyl(0.025, 0.025, 0.7, 5), '#6b4a2b', [-0.62, 1.3, 0], [0, 0, 0.9]), // twig arms
    put(cyl(0.025, 0.025, 0.7, 5), '#6b4a2b', [0.62, 1.3, 0], [0, 0, -0.9]),
  ]);

const gingerbreadBody = () => {
  const C = '#b8743a', ICING = '#ffffff';
  return merge([
    put(sph(0.3, 14, 10), C, [0, 0.58, 0], [0, 0, 0], [1, 1.2, 0.4]),
    put(sph(0.24, 14, 10), C, [0, 1.1, 0], [0, 0, 0], [1, 1, 0.4]),
    put(cyl(0.08, 0.08, 0.4, 8), C, [-0.34, 0.74, 0], [0, 0, 0.9], [1, 1, 0.5]),
    put(cyl(0.08, 0.08, 0.4, 8), C, [0.34, 0.74, 0], [0, 0, -0.9], [1, 1, 0.5]),
    put(cyl(0.09, 0.09, 0.42, 8), C, [-0.15, 0.22, 0], [0, 0, 0.1], [1, 1, 0.5]),
    put(cyl(0.09, 0.09, 0.42, 8), C, [0.15, 0.22, 0], [0, 0, -0.1], [1, 1, 0.5]),
    put(sph(0.03, 8, 6), DARK, [-0.08, 1.15, 0.1]),
    put(sph(0.03, 8, 6), DARK, [0.08, 1.15, 0.1]),
    put(tor(0.08, 0.015, 10), ICING, [0, 1.06, 0.1], [0, 0, Math.PI], [1, 0.8, 1]), // smile
    put(sph(0.04, 8, 6), RED, [0, 0.78, 0.13]), // buttons
    put(sph(0.04, 8, 6), '#388E3C', [0, 0.6, 0.13]),
    put(sph(0.04, 8, 6), RED, [0, 0.42, 0.13]),
    put(tor(0.34, 0.015, 10), ICING, [-0.37, 0.64, 0.06], [0, 0, 0], [0.2, 0.2, 1]), // icing cuffs
  ]);
};

const penguinBody = () =>
  merge([
    put(sph(0.4, 16, 12), '#1d2330', [0, 0.5, 0], [0, 0, 0], [1, 1.2, 0.9]),
    put(sph(0.3, 14, 10), WHITE, [0, 0.46, 0.14], [0, 0, 0], [0.9, 1.15, 0.7]),
    put(sph(0.26, 14, 10), '#1d2330', [0, 1.12, 0]),
    put(cone(0.06, 0.18, 8), '#ff8a1f', [0, 1.08, 0.3], [Math.PI / 2, 0, 0]),
    put(sph(0.035, 8, 6), '#ffffff', [-0.1, 1.2, 0.22]),
    put(sph(0.035, 8, 6), '#ffffff', [0.1, 1.2, 0.22]),
    put(sph(0.018, 6, 4), DARK, [-0.1, 1.2, 0.25]),
    put(sph(0.018, 6, 4), DARK, [0.1, 1.2, 0.25]),
    put(sph(0.1, 8, 6), '#ff8a1f', [-0.16, 0.03, 0.12], [0, 0, 0], [1.2, 0.4, 1.6]), // feet
    put(sph(0.1, 8, 6), '#ff8a1f', [0.16, 0.03, 0.12], [0, 0, 0], [1.2, 0.4, 1.6]),
    put(sph(0.14, 8, 6), '#1d2330', [-0.4, 0.55, 0], [0, 0, 0.5], [0.4, 1.5, 0.7]), // flippers
    put(sph(0.14, 8, 6), '#1d2330', [0.4, 0.55, 0], [0, 0, -0.5], [0.4, 1.5, 0.7]),
    put(cone(0.2, 0.4, 12), RED, [0, 1.52, -0.02], [-0.25, 0, 0]), // santa hat
    put(tor(0.2, 0.05, 14), WHITE, [0, 1.36, 0], [Math.PI / 2, 0, 0]),
    put(sph(0.07, 8, 6), WHITE, [0, 1.72, -0.12]),
  ]);

// ---------- scene pieces ----------
interface CharProps {
  geometry: THREE.BufferGeometry;
  angle: number;   // position around the tree (0 = toward the camera)
  radius: number;
  yaw?: number;    // extra turn (radians) on top of "facing outward"
  scale?: number;
  seed?: number;
  children?: React.ReactNode;
  glowNose?: V3;
}

const Character: React.FC<CharProps> = ({ geometry, angle, radius, yaw = 0, scale = 1, seed = 0, children, glowNose }) => {
  const g = useRef<THREE.Group>(null);
  const baseY = -TREE_CONFIG.HEIGHT / 2;
  useFrame((s) => {
    if (g.current) {
      const t = s.clock.elapsedTime + seed * 2.3;
      g.current.position.y = baseY + Math.max(0, Math.sin(t * 2.2)) * 0.06; // little happy bounce
      g.current.rotation.z = Math.sin(t * 1.1) * 0.025;
    }
  });
  return (
    <group
      ref={g}
      position={[Math.sin(angle) * radius, baseY, Math.cos(angle) * radius]}
      rotation={[0, angle + yaw, 0]}
      scale={scale}
    >
      <mesh geometry={geometry}>
        <meshStandardMaterial vertexColors roughness={0.65} metalness={0} />
      </mesh>
      {glowNose && (
        <mesh position={glowNose}>
          <sphereGeometry args={[0.075, 10, 8]} />
          <meshStandardMaterial color="#ff1f3d" emissive="#ff1f3d" emissiveIntensity={2.2} toneMapped={false} />
        </mesh>
      )}
      {children}
    </group>
  );
};

const WavingArm: React.FC<{ geo: THREE.BufferGeometry }> = ({ geo }) => {
  const arm = useRef<THREE.Mesh>(null);
  useFrame((s) => {
    if (arm.current) arm.current.rotation.z = -2.5 + Math.sin(s.clock.elapsedTime * 4) * 0.4;
  });
  return (
    <mesh ref={arm} geometry={geo} position={[0.46, 1.2, 0.05]} rotation={[0, 0, -2.5]}>
      <meshStandardMaterial vertexColors roughness={0.65} />
    </mesh>
  );
};

interface CharactersProps { isExploded?: boolean; }

const Characters: React.FC<CharactersProps> = ({ isExploded = false }) => {
  const root = useRef<THREE.Group>(null);
  const scale = useRef(1);

  const geo = useMemo(
    () => ({
      santa: santaBody(), arm: santaArm(), sack: santaSack(),
      elfG: elfBody('#2e9e5b', RED), elfR: elfBody('#c8102e', '#2e9e5b'),
      rudolph: reindeerBody(true), deer: reindeerBody(false),
      snowman: snowmanBody(), ginger: gingerbreadBody(), penguin: penguinBody(),
    }),
    []
  );

  useFrame(() => {
    scale.current = THREE.MathUtils.lerp(scale.current, isExploded ? 0 : 1, 0.1);
    if (root.current) {
      root.current.scale.setScalar(Math.max(scale.current, 0.0001));
      root.current.visible = scale.current > 0.01;
    }
  });

  const R = TREE_CONFIG.RADIUS_BOTTOM + 6.2; // just outside the ring of presents
  return (
    <group ref={root}>
      <Character geometry={geo.santa} angle={-0.3} radius={R} yaw={0.25} scale={1.25} seed={1}>
        <WavingArm geo={geo.arm} />
        <mesh geometry={geo.sack} position={[-1.0, 0, -0.2]} rotation={[0, 0.6, 0]}>
          <meshStandardMaterial vertexColors roughness={0.8} />
        </mesh>
      </Character>
      <Character geometry={geo.elfG} angle={0.12} radius={R - 0.4} yaw={-0.3} scale={1.15} seed={2} />
      <Character geometry={geo.elfR} angle={0.4} radius={R - 0.2} yaw={-0.5} scale={1.1} seed={3} />
      <Character geometry={geo.ginger} angle={0.72} radius={R - 1.2} yaw={-0.4} scale={1.1} seed={4} />
      <Character geometry={geo.snowman} angle={0.98} radius={R} yaw={-0.4} scale={1.2} seed={5} />
      <Character geometry={geo.penguin} angle={-0.78} radius={R - 1.0} yaw={0.4} scale={1.1} seed={6} />
      {/* the reindeer team, Rudolph in front */}
      <Character geometry={geo.rudolph} angle={-1.12} radius={R + 0.4} yaw={Math.PI / 2 - 0.2} scale={1.35} seed={7} glowNose={[0, 1.62, 0.99]} />
      <Character geometry={geo.deer} angle={-1.42} radius={R + 0.4} yaw={Math.PI / 2 - 0.2} scale={1.3} seed={8} />
      <Character geometry={geo.deer} angle={-1.72} radius={R + 0.4} yaw={Math.PI / 2 - 0.2} scale={1.3} seed={9} />
    </group>
  );
};

export default Characters;
