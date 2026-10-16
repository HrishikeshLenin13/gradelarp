"use client";
import {
  Component,
  Suspense,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  type MutableRefObject,
  type ReactNode,
} from "react";
import { Canvas, useFrame, useLoader } from "@react-three/fiber";
import { Environment, Lightformer, RoundedBox } from "@react-three/drei";
import {
  ACESFilmicToneMapping,
  CatmullRomCurve3,
  Color,
  Group,
  DoubleSide,
  SRGBColorSpace,
  TextureLoader,
  PCFSoftShadowMap,
  InstancedMesh,
  Matrix4,
  DirectionalLight,
  Shape,
  ShapeGeometry,
  Vector3,
} from "three";
import { clamp, type StudyState } from "./study-state";
import { routeTime, settleValue } from "./scene-motion";
import { woodTexture, matTexture } from "./study-textures";
import { coverTexture, recordTexture } from "./gradebook-textures";
import {
  surfaceRelief,
  printedRoughness,
  paperGeometry,
} from "./material-details";
interface Props {
  state: MutableRefObject<StudyState>;
  registerInvalidate: (fn: () => void) => void;
  onReady: () => void;
  onFailure: () => void;
}
class SceneBoundary extends Component<
  { children: ReactNode; onFailure: () => void },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onFailure();
  }
  render() {
    return this.state.failed ? (
      <div className="scene-fallback">
        <span>GRADELARP</span>
        <div className="fallback-gradebook" />
        <p>
          Your academic life, on the same page. Interactive 3D is unavailable on
          this device.
        </p>
      </div>
    ) : (
      this.props.children
    );
  }
}
const cameras = [
  [0, 13, 0.001],
  [0, 8, 4],
  [0, 2.8, 9],
  [3.8, 2.1, 7.4],
  [-2.5, 3, 7],
  [0, 1.2, 5.7],
  [-2, 2.5, 8.5],
  [1.2, 6.2, 8],
  [0, 3.9, 8.9],
  [0, 4.7, 11.5],
].map((v) => new Vector3(...(v as [number, number, number])));
const targets = [
  [0, 0, 0],
  [0, 0.2, 0],
  [0, 0.7, 0],
  [0, 0.9, 0],
  [0, 0.5, 0],
  [0, 0.6, 0],
  [0, 0.7, 0],
  [0, 0.6, 0],
  [0, 0.9, 0],
  [0, 0.4, 0],
].map((v) => new Vector3(...(v as [number, number, number])));
const cameraCurve = new CatmullRomCurve3(cameras, false, "catmullrom", 0.35);
const targetCurve = new CatmullRomCurve3(targets, false, "catmullrom", 0.35);
const rotations = [
  [0, 0, 0],
  [0.45, -0.1, 0],
  [1.13, -0.25, -0.1],
  [1.48, 1.25, -0.12],
  [1.5, -0.2, 0.1],
  [0.06, 0.3, 0],
  [1.26, -0.2, 0.05],
  [0.25, 0.2, -0.12],
  [0.17, 0.18, 0],
  [1.1, 0.2, -0.08],
];
const rotationCurve = new CatmullRomCurve3(
  rotations.map((v) => new Vector3(...(v as [number, number, number]))),
  false,
  "catmullrom",
  0.35,
);
function Gradebook({
  state,
  ready,
}: {
  state: Props["state"];
  ready: () => void;
}) {
  const root = useRef<Group>(null);
  const cover = useRef<Group>(null);
  const sheets = useRef<Group[]>([]);
  const reported = useRef(false);
  const scratch = useMemo(
    () => ({
      position: new Vector3(),
      target: new Vector3(),
      rotation: new Vector3(),
    }),
    [],
  );
  const motion = useRef({
    pointerX: 0,
    pointerY: 0,
    yaw: 0,
    cover: 0,
    frames: 0,
  });
  const coverMap = useMemo(() => coverTexture(), []);
  const cloth = useMemo(() => surfaceRelief("cloth"), []);
  const paper = useMemo(() => surfaceRelief("paper"), []);
  const finish = useMemo(
    () => printedRoughness(coverMap.image as HTMLCanvasElement),
    [coverMap],
  );
  const curvedPage = useMemo(() => paperGeometry(), []);
  const records = useMemo(() => [0, 1, 2].map(recordTexture), []);
  useEffect(
    () => () => {
      coverMap.dispose();
      cloth.dispose();
      paper.dispose();
      finish.dispose();
      curvedPage.dispose();
      records.forEach((texture) => texture.dispose());
    },
    [coverMap, records, cloth, paper, finish, curvedPage],
  );
  useFrame(({ camera, size, gl, invalidate }, delta) => {
    const p = state.current.reduced ? 0 : state.current.progress;
    const time = routeTime(p);
    const position = cameraCurve.getPoint(time, scratch.position);
    const target = targetCurve.getPoint(time, scratch.target);
    const rotation = rotationCurve.getPoint(time, scratch.rotation);
    const frame = motion.current;
    const pointerX = state.current.reduced ? 0 : state.current.pointerX;
    const pointerY = state.current.reduced ? 0 : state.current.pointerY;
    const coverTarget =
      state.current.cover === null
        ? clamp((p - 0.04) / 0.08) * (1 - clamp((p - 0.94) / 0.06))
        : state.current.cover / 100;
    frame.pointerX = state.current.reduced
      ? 0
      : settleValue(frame.pointerX, pointerX, delta);
    frame.pointerY = state.current.reduced
      ? 0
      : settleValue(frame.pointerY, pointerY, delta);
    frame.yaw = state.current.reduced
      ? state.current.yaw
      : settleValue(frame.yaw, state.current.yaw, delta);
    frame.cover = state.current.reduced
      ? coverTarget
      : settleValue(frame.cover, coverTarget, delta);
    const moving =
      frame.pointerX !== pointerX ||
      frame.pointerY !== pointerY ||
      frame.yaw !== state.current.yaw ||
      frame.cover !== coverTarget;
    if (moving) invalidate();
    gl.domElement.dataset.motion = moving ? "settling" : "idle";
    gl.domElement.dataset.sceneFrames = String(++frame.frames);
    if (size.width < 760) {
      position.y *= 1.55;
      position.z *= 1.55;
    }
    if (!state.current.reduced) {
      position.x += frame.pointerX * 0.18;
      position.y += frame.pointerY * 0.12;
    }
    camera.position.copy(position);
    camera.lookAt(target);
    gl.domElement.dataset.cameraX = position.x.toFixed(4);
    gl.domElement.dataset.cameraY = position.y.toFixed(4);
    gl.domElement.dataset.cameraZ = position.z.toFixed(4);
    if (root.current) {
      root.current.rotation.set(rotation.x, rotation.y + frame.yaw, rotation.z);
      const productShift =
        clamp((p - 0.73) / 0.09) * (1 - clamp((p - 0.91) / 0.04)) * 2;
      const finalShift = clamp((p - 0.93) / 0.07) * -2.5;
      root.current.position.set(
        (p > 0.04 ? Math.sin(p * Math.PI * 2) * 0.32 : 0) +
          productShift +
          finalShift,
        0.2 + clamp(p / 0.055) * 0.65,
        0,
      );
      const macro = 1 + clamp(1 - Math.abs(p - 0.6) / 0.08) * 0.15;
      root.current.scale.setScalar((size.width < 760 ? 0.72 : 0.82) * macro);
    }
    const open = frame.cover;
    if (cover.current) cover.current.rotation.z = open * 2.85;
    const separation =
      state.current.cover === null
        ? clamp((p - 0.73) / 0.07) * (1 - clamp((p - 0.94) / 0.06))
        : frame.cover;
    sheets.current.forEach((sheet, index) => {
      const selectedWeight = Math.max(
        0,
        1 - Math.abs(state.current.stack - (index + 1)),
      );
      sheet.position.y =
        0.22 +
        (2 - index) * 0.024 +
        separation * (index * 0.22 + selectedWeight * 0.65);
      sheet.position.x = separation * (index - 1) * 0.32;
      sheet.rotation.set(
        0,
        separation * (index - 1) * 0.02,
        separation * (index - 1) * -0.018,
      );
    });
    gl.domElement.dataset.coverOpen = open.toFixed(3);
    gl.domElement.dataset.modelYaw = frame.yaw.toFixed(3);
    gl.domElement.dataset.selectedPage = String(
      Math.round(state.current.stack) - 1,
    );
  });
  const report = () => {
    if (!reported.current) {
      reported.current = true;
      ready();
    }
  };
  return (
    <group ref={root}>
      <RoundedBox
        args={[4.4, 0.12, 5.9]}
        radius={0.025}
        position={[0, 0.04, 0]}
        castShadow
        receiveShadow
      >
        <meshPhysicalMaterial
          color="#484961"
          roughness={0.8}
          bumpMap={cloth}
          bumpScale={0.018}
          sheen={0.18}
          sheenColor="#a8a4c4"
        />
      </RoundedBox>
      <RoundedBox
        args={[4.15, 0.3, 5.65]}
        radius={0.04}
        position={[0.03, 0.22, 0]}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial
          color="#e4ded0"
          roughness={1}
          bumpMap={paper}
          bumpScale={0.008}
        />
      </RoundedBox>
      {Array.from({ length: 9 }, (_, i) => (
        <mesh key={i} position={[0.03, 0.1 + i * 0.03, 2.83]}>
          <boxGeometry args={[4.08, 0.008, 0.006]} />
          <meshStandardMaterial color="#b5b0a6" />
        </mesh>
      ))}
      {[2, 1, 0].map((index) => (
        <group
          key={index}
          ref={(node) => {
            if (node) sheets.current[index] = node;
          }}
        >
          <mesh
            geometry={curvedPage}
            rotation={[-Math.PI / 2, 0, 0]}
            position={[0.03, 0.17, 0]}
            castShadow={false}
            receiveShadow={false}
            onAfterRender={report}
          >
            <meshStandardMaterial
              map={records[index]}
              roughness={0.93}
              bumpMap={paper}
              bumpScale={0.006}
              side={DoubleSide}
            />
          </mesh>
          <RoundedBox
            args={[0.42, 0.035, 0.75]}
            position={[2.18, 0.15, -1.7 + index * 1.35]}
            radius={0.012}
          >
            <meshStandardMaterial
              color={["#b9b3de", "#a8c7ba", "#d5b88c"][index]}
              roughness={0.8}
            />
          </RoundedBox>
        </group>
      ))}
      <group ref={cover} position={[-2.15, 0.56, 0]}>
        <RoundedBox
          args={[4.4, 0.095, 5.9]}
          radius={0.018}
          position={[2.15, 0, 0]}
          castShadow
          receiveShadow
        >
          <meshPhysicalMaterial
            color="#555775"
            roughness={0.82}
            bumpMap={cloth}
            bumpScale={0.018}
            sheen={0.18}
            sheenColor="#a8a4c4"
          />
        </RoundedBox>
        <mesh
          rotation={[-Math.PI / 2, 0, 0]}
          position={[2.15, 0.055, 0]}
          onAfterRender={report}
        >
          <planeGeometry args={[4.28, 5.78]} />
          <meshPhysicalMaterial
            map={coverMap}
            bumpMap={cloth}
            bumpScale={0.014}
            roughnessMap={finish}
            roughness={0.9}
            sheen={0.2}
            sheenColor="#a8a4c4"
            sheenRoughness={0.8}
            clearcoat={0.025}
            clearcoatRoughness={0.7}
          />
        </mesh>
      </group>
      <SpiralBinding />
      <mesh position={[1.65, 0.4, 1.95]} rotation={[0, -0.1, 0]}>
        <boxGeometry args={[0.12, 0.035, 1.6]} />
        <meshStandardMaterial color="#ada4d5" roughness={0.9} />
      </mesh>
    </group>
  );
}
function SpiralBinding() {
  const mesh = useRef<InstancedMesh>(null);
  useLayoutEffect(() => {
    if (!mesh.current) return;
    const matrix = new Matrix4().makeRotationX(Math.PI / 2);
    for (let i = 0; i < 13; i++) {
      matrix.setPosition(-2.08, 0.4, -2.52 + i * 0.42);
      mesh.current.setMatrixAt(i, matrix);
    }
    mesh.current.instanceMatrix.needsUpdate = true;
    mesh.current.computeBoundingSphere();
  }, []);
  return (
    <instancedMesh
      ref={mesh}
      args={[undefined, undefined, 13]}
      castShadow
      receiveShadow
    >
      <torusGeometry args={[0.17, 0.025, 12, 28]} />
      <meshPhysicalMaterial
        color="#c4c2bd"
        metalness={0.95}
        roughness={0.24}
        anisotropy={0.25}
      />
    </instancedMesh>
  );
}
function StudyPhoto() {
  const original = useLoader(TextureLoader, "/photos/library-books.jpg");
  const map = useMemo(() => {
    const clone = original.clone();
    clone.colorSpace = SRGBColorSpace;
    clone.needsUpdate = true;
    return clone;
  }, [original]);
  useEffect(() => () => map.dispose(), [map]);
  return (
    <group position={[-4.5, 0.07, -0.8]} rotation={[0, -0.18, 0]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[2.4, 2.1]} />
        <meshStandardMaterial color="#f5eedf" roughness={1} />
      </mesh>
      <mesh position={[0, 0.006, -0.07]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[2.16, 1.65]} />
        <meshBasicMaterial map={map} />
      </mesh>
    </group>
  );
}
function Desk({ state }: { state: Props["state"] }) {
  const root = useRef<Group>(null);
  const wood = useMemo(() => woodTexture(), []);
  const grain = useMemo(() => surfaceRelief("wood"), []);
  const mat = useMemo(() => matTexture(), []);
  const matGeometry = useMemo(() => {
    const shape = new Shape();
    const x = -7,
      y = -5,
      w = 14,
      h = 10,
      r = 0.2;
    shape.moveTo(x + r, y);
    shape.lineTo(x + w - r, y);
    shape.quadraticCurveTo(x + w, y, x + w, y + r);
    shape.lineTo(x + w, y + h - r);
    shape.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    shape.lineTo(x + r, y + h);
    shape.quadraticCurveTo(x, y + h, x, y + h - r);
    shape.lineTo(x, y + r);
    shape.quadraticCurveTo(x, y, x + r, y);
    const g = new ShapeGeometry(shape, 12);
    const a = g.getAttribute("position"),
      uv = g.getAttribute("uv");
    for (let i = 0; i < a.count; i++)
      uv.setXY(i, (a.getX(i) + 7) / 14, (a.getY(i) + 5) / 10);
    return g;
  }, []);
  useEffect(
    () => () => {
      wood.dispose();
      grain.dispose();
      mat.dispose();
      matGeometry.dispose();
    },
    [wood, grain, mat, matGeometry],
  );
  useFrame(() => {
    if (root.current) {
      const alpha = 1 - clamp((state.current.progress - 0.014) / 0.025);
      root.current.visible = alpha > 0;
      root.current.position.y =
        -clamp((state.current.progress - 0.014) / 0.03) * 4;
    }
  });
  return (
    <group ref={root}>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.05, 0]}
        receiveShadow
      >
        <planeGeometry args={[60, 60]} />
        <meshStandardMaterial
          map={wood}
          roughness={0.83}
          bumpMap={grain}
          bumpScale={0.025}
        />
      </mesh>
      <group position={[3.4, 0.035, -1.3]} rotation={[0, 0.14, 0]}>
        <mesh
          geometry={matGeometry}
          rotation={[-Math.PI / 2, 0, 0]}
          receiveShadow
        >
          <meshStandardMaterial map={mat} color="#ffffff" roughness={0.87} />
        </mesh>
      </group>
      <group position={[3.4, 0.16, -3.1]} rotation={[0, -1.03, 0]}>
        <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.075, 0.075, 3.65, 32]} />
          <meshStandardMaterial color="#e7d4aa" roughness={0.45} />
        </mesh>
        <mesh
          rotation={[0, 0, -Math.PI / 2]}
          position={[2.05, 0, 0]}
          castShadow
        >
          <coneGeometry args={[0.075, 0.45, 32]} />
          <meshStandardMaterial color="#ddc294" roughness={0.55} />
        </mesh>
        <mesh position={[-1.72, 0.025, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.078, 0.078, 0.15, 24]} />
          <meshStandardMaterial color="#f0dfbe" roughness={0.35} />
        </mesh>
      </group>
      <group position={[-6.6, 0.16, 1.3]} rotation={[0, 0.67, 0]}>
        <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.07, 0.07, 3.8, 6]} />
          <meshStandardMaterial color="#26251d" roughness={0.75} />
        </mesh>
        <mesh
          position={[2.05, 0, 0]}
          rotation={[0, 0, -Math.PI / 2]}
          castShadow
        >
          <coneGeometry args={[0.07, 0.5, 6]} />
          <meshStandardMaterial color="#9e714b" roughness={0.85} />
        </mesh>
        <mesh position={[2.3, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
          <coneGeometry args={[0.018, 0.15, 6]} />
          <meshStandardMaterial color="#1d1b18" roughness={1} />
        </mesh>
      </group>
      <group position={[5.3, 0.2, 2.6]} rotation={[0, -0.64, 0]}>
        <RoundedBox args={[2.2, 0.3, 0.65]} radius={0.08} castShadow>
          <meshStandardMaterial color="#b5a5d8" roughness={0.7} />
        </RoundedBox>
        <RoundedBox
          args={[0.6, 0.32, 0.67]}
          radius={0.07}
          position={[-0.9, 0, 0]}
          castShadow
        >
          <meshStandardMaterial color="#777088" roughness={0.75} />
        </RoundedBox>
      </group>
      <StudyPhoto />
      <group position={[-7.1, 0.12, -1.9]} rotation={[0, 0.8, 0]}>
        {[0, 1].map((index) => (
          <mesh
            key={index}
            rotation={[-Math.PI / 2, 0, 0]}
            position={[index * 0.05, 0, 0]}
          >
            <torusGeometry
              args={[0.17 + index * 0.06, 0.015, 8, 48, Math.PI * 1.7]}
            />
            <meshStandardMaterial
              color="#bbb7ad"
              metalness={1}
              roughness={0.3}
            />
          </mesh>
        ))}
      </group>
    </group>
  );
}
function SceneLighting({ state }: { state: Props["state"] }) {
  const color = useMemo(() => new Color(), []);
  const endColor = useMemo(() => new Color("#171820"), []);
  const rim = useRef<DirectionalLight>(null);
  useFrame(({ scene }, delta) => {
    const t = clamp((state.current.progress - 0.02) / 0.04);
    color.set("#37323a").lerp(endColor, t);
    scene.background = color;
    if (rim.current) {
      const x =
        -3 + t * 5 + (state.current.reduced ? 0 : state.current.pointerX * 0.9);
      rim.current.position.x = state.current.reduced
        ? -3
        : settleValue(rim.current.position.x, x, delta);
    }
  });
  return (
    <>
      <directionalLight
        ref={rim}
        position={[-3, 4, 2]}
        intensity={0.55}
        color="#d9d7ef"
      />
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.16, 0]}
        receiveShadow
      >
        <planeGeometry args={[30, 30]} />
        <shadowMaterial transparent opacity={0.2} color="#080a13" />
      </mesh>
    </>
  );
}
export default function GradelarpScene({
  state,
  registerInvalidate,
  onReady,
  onFailure,
}: Props) {
  return (
    <SceneBoundary onFailure={onFailure}>
      <Canvas
        shadows
        frameloop="demand"
        dpr={[1, 1.5]}
        camera={{ position: [0, 13, 0.001], fov: 40, near: 0.05, far: 100 }}
        gl={{
          antialias: true,
          powerPreference: "high-performance",
        }}
        fallback={
          <div className="scene-fallback">
            <div className="fallback-gradebook" />
            Interactive scene unavailable. The story remains readable.
          </div>
        }
        onCreated={({ gl, invalidate, setDpr }) => {
          setDpr(
            Math.min(
              devicePixelRatio,
              matchMedia("(pointer: coarse)").matches ? 1.25 : 1.5,
            ),
          );
          gl.shadowMap.type = PCFSoftShadowMap;
          gl.toneMapping = ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.0;
          registerInvalidate(invalidate);
        }}
      >
        <hemisphereLight args={["#fff4de", "#69513b", 1.4]} />
        <directionalLight
          castShadow
          position={[-4, 8, -5]}
          intensity={2.5}
          color="#ffe6bb"
          shadow-mapSize={[2048, 2048]}
          shadow-bias={-0.0001}
          shadow-normalBias={0.025}
          shadow-radius={3}
          shadow-camera-left={-12}
          shadow-camera-right={12}
          shadow-camera-top={12}
          shadow-camera-bottom={-12}
          shadow-camera-far={35}
        />
        <directionalLight
          position={[5, 4, 4]}
          intensity={0.7}
          color="#fff4df"
        />
        <Environment resolution={64} frames={1}>
          <Lightformer
            position={[0, 6, 0]}
            rotation={[Math.PI / 2, 0, 0]}
            scale={[10, 10, 1]}
            intensity={1.5}
            color="#fff1d5"
          />
          <Lightformer
            position={[-4, 3, 3]}
            target={[0, 0, 0]}
            scale={[2, 4, 1]}
            intensity={1.6}
            color="#f5eedf"
          />
          <Lightformer
            position={[-1.6, 3, 3]}
            target={[0, 0, 0]}
            scale={[1.2, 4, 1]}
            intensity={1.2}
            color="#f5eedf"
          />
        </Environment>
        <Suspense fallback={null}>
          <Desk state={state} />
          <Gradebook state={state} ready={onReady} />
        </Suspense>
        <SceneLighting state={state} />
      </Canvas>
    </SceneBoundary>
  );
}
