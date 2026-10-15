"use client";

import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

const AMBER = "#ffb020";
const AMBER_SOFT = "#ffd98a";
const RED = "#ef4444";
const GREEN = "#22c55e";

/** A "pro" racing around the job: small glowing bead on a tilted elliptical orbit. */
function Orbiter({ radius, speed, phase, tilt, size, color }: { radius: number; speed: number; phase: number; tilt: number; size: number; color: string }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    const m = ref.current;
    if (!m) return;
    const a = clock.elapsedTime * speed + phase;
    m.position.set(Math.cos(a) * radius, Math.sin(a * 1.3) * 0.35, Math.sin(a) * radius * 0.82);
  });
  return (
    <group rotation={[tilt, 0, tilt * 0.5]}>
      <mesh ref={ref}>
        <sphereGeometry args={[size, 24, 24]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.4} roughness={0.25} metalness={0.2} />
      </mesh>
    </group>
  );
}

function Ring({ radius, tube, color, rotation, speed }: { radius: number; tube: number; color: string; rotation: [number, number, number]; speed: number }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.z += dt * speed;
  });
  return (
    <group rotation={rotation}>
      <mesh ref={ref}>
        <torusGeometry args={[radius, tube, 16, 160]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.55} roughness={0.35} metalness={0.6} transparent opacity={0.9} />
      </mesh>
    </group>
  );
}

// Small seeded PRNG so the star-field is deterministic (and render stays pure).
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function Particles({ count }: { count: number }) {
  const ref = useRef<THREE.Points>(null);
  const positions = useMemo(() => {
    const rand = mulberry32(20261015);
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const r = 3.2 + rand() * 3.8;
      const th = rand() * Math.PI * 2;
      const ph = Math.acos(2 * rand() - 1);
      arr[i * 3] = r * Math.sin(ph) * Math.cos(th);
      arr[i * 3 + 1] = r * Math.sin(ph) * Math.sin(th) * 0.7;
      arr[i * 3 + 2] = r * Math.cos(ph);
    }
    return arr;
  }, [count]);
  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.y += dt * 0.025;
  });
  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial color={AMBER_SOFT} size={0.028} sizeAttenuation transparent opacity={0.75} depthWrite={false} />
    </points>
  );
}

function Core() {
  const core = useRef<THREE.Mesh>(null);
  const shell = useRef<THREE.Mesh>(null);
  const pin = useRef<THREE.Mesh>(null);
  const pulse = useRef<THREE.Mesh>(null);
  useFrame(({ clock }, dt) => {
    const t = clock.elapsedTime;
    if (core.current) {
      core.current.rotation.y += dt * 0.35;
      core.current.rotation.x += dt * 0.12;
    }
    if (shell.current) {
      shell.current.rotation.y -= dt * 0.18;
      shell.current.rotation.z += dt * 0.1;
    }
    if (pin.current) pin.current.scale.setScalar(1 + Math.sin(t * 3) * 0.08);
    if (pulse.current) {
      const k = (t % 2) / 2;
      pulse.current.scale.setScalar(1 + k * 3.2);
      (pulse.current.material as THREE.MeshBasicMaterial).opacity = 0.55 * (1 - k);
    }
  });
  return (
    <group>
      <mesh ref={core}>
        <icosahedronGeometry args={[1.05, 1]} />
        <meshPhysicalMaterial color={AMBER} emissive={AMBER} emissiveIntensity={0.28} roughness={0.28} metalness={0.55} clearcoat={0.8} clearcoatRoughness={0.25} flatShading />
      </mesh>
      <mesh ref={shell}>
        <icosahedronGeometry args={[1.5, 1]} />
        <meshBasicMaterial color={AMBER_SOFT} wireframe transparent opacity={0.22} />
      </mesh>
      {/* the "job" pin, floating on the core */}
      <mesh ref={pin} position={[0, 1.55, 0]}>
        <sphereGeometry args={[0.17, 24, 24]} />
        <meshStandardMaterial color={RED} emissive={RED} emissiveIntensity={1.6} />
      </mesh>
      <mesh ref={pulse} position={[0, 1.55, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.2, 0.24, 48]} />
        <meshBasicMaterial color={RED} transparent opacity={0.5} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
    </group>
  );
}

function Rig({ children }: { children: React.ReactNode }) {
  const group = useRef<THREE.Group>(null);
  useFrame(({ pointer, clock }) => {
    const g = group.current;
    if (!g) return;
    const tx = pointer.y * 0.28 + Math.sin(clock.elapsedTime * 0.4) * 0.06;
    const ty = pointer.x * 0.45 + clock.elapsedTime * 0.12;
    g.rotation.x += (tx - g.rotation.x) * 0.05;
    g.rotation.y += (ty - g.rotation.y) * 0.05;
  });
  return <group ref={group}>{children}</group>;
}

export default function HeroScene({ active, light, onReady }: { active: boolean; light: boolean; onReady: () => void }) {
  return (
    <Canvas
      frameloop={active ? "always" : "never"}
      dpr={[1, light ? 1.25 : 1.75]}
      camera={{ position: [0, 0, 7], fov: 38 }}
      gl={{ antialias: !light, alpha: true, powerPreference: "high-performance" }}
      onCreated={({ gl }) => {
        gl.setClearColor(0x000000, 0);
        onReady();
      }}
      aria-hidden
    >
      <ambientLight intensity={0.55} />
      <directionalLight position={[4, 5, 5]} intensity={2.4} color="#fff1d6" />
      <directionalLight position={[-5, -2, -3]} intensity={0.8} color="#6b8cff" />
      <pointLight position={[0, 0, 3]} intensity={18} color={AMBER} distance={9} />
      <Rig>
        <Core />
        <Ring radius={2.15} tube={0.018} color={AMBER} rotation={[1.2, 0.2, 0]} speed={0.18} />
        <Ring radius={2.7} tube={0.012} color="#ffffff" rotation={[0.5, 0.9, 0.3]} speed={-0.12} />
        <Orbiter radius={2.15} speed={0.9} phase={0} tilt={1.2} size={0.1} color={AMBER_SOFT} />
        <Orbiter radius={2.15} speed={0.9} phase={Math.PI} tilt={1.2} size={0.08} color={AMBER_SOFT} />
        <Orbiter radius={2.7} speed={-0.6} phase={1.2} tilt={0.5} size={0.11} color={GREEN} />
        <Orbiter radius={2.7} speed={-0.6} phase={3.9} tilt={0.5} size={0.08} color="#ffffff" />
        <Orbiter radius={3.15} speed={0.45} phase={2.1} tilt={-0.4} size={0.09} color={AMBER} />
        {!light && <Orbiter radius={1.9} speed={1.1} phase={4.4} tilt={0.2} size={0.07} color={GREEN} />}
        <Particles count={light ? 70 : 160} />
      </Rig>
    </Canvas>
  );
}
