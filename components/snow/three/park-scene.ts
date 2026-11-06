/** 高德自定义坐标为 XY 地面、Z 高度，与相机保持同一坐标系。 */

import {
  Group,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  Raycaster,
  RingGeometry,
  Scene,
  Vector3,
  WebGLRenderer
} from "three";
import type { Vector2 } from "three";
import type { AMapCustomCoords, LngLat } from "@/components/snow/amap/types";
import type { NormalizedCameraParams } from "@/components/snow/amap/camera";
import { addLights } from "@/components/snow/three/palette";
import { createLandmarkLibrary } from "@/components/snow/three/landmarks";

const METERS_PER_DEG_LAT = 110540;
const PROBE_DEGREES = 0.001;

export type Calibration = {
  /** 2 表示 lngLatsToCoords 返回 [x, y]，3 表示 [x, y, z] */
  dim: 2 | 3;
  eastAxis: 0 | 1 | 2;
  northAxis: 0 | 1 | 2;
  upAxis: 0 | 1 | 2;
  /** 每米对应的投影世界单位，随纬度变化 */
  unitsPerMeter: number;
};

export type ParkSceneObject = {
  id: string;
  category: string;
  kind: string;
  lngLat: LngLat;
  widthMeters: number;
  depthMeters: number;
  heightMeters: number;
};

export type ParkSceneHandle = {
  renderer: WebGLRenderer;
  camera: PerspectiveCamera;
  scene: Scene;
  /** 每帧由地图驱动：重置 GL 状态后渲染 */
  draw(): void;
  /** 容器尺寸变化时更新相机纵横比 */
  resize(width: number, height: number): void;
  /** 用归一化后的高德相机参数覆盖 Three 相机 */
  applyCamera(params: NormalizedCameraParams): void;
  /** 屏幕归一化坐标 → 命中的对象 id */
  pick(ndc: Vector2): string | null;
  select(id: string | null): void;
  filter(category: string | null): void;
  project(id: string): { x: number; y: number; visible: boolean } | null;
  dispose(): void;
};

/** Keep AMap's documented XY ground / Z altitude convention. Only measure projection scale. */
export function calibrate(cc: Pick<AMapCustomCoords, "lngLatsToCoords">, anchor: LngLat): Calibration {
  const [lng, lat] = anchor;
  const [base, east, north] = cc.lngLatsToCoords([
    anchor, [lng + PROBE_DEGREES, lat], [lng, lat + PROBE_DEGREES]
  ]);
  if (![base, east, north].every(p => p && p.length >= 2 && p.every(Number.isFinite))) {
    throw new Error("地图返回无效的自定义坐标");
  }
  const eastMeters = PROBE_DEGREES * 111320 * Math.cos(lat * Math.PI / 180);
  const northMeters = PROBE_DEGREES * METERS_PER_DEG_LAT;
  const unitsPerMeter = (Math.abs(east[0] - base[0]) / eastMeters + Math.abs(north[1] - base[1]) / northMeters) / 2;
  if (!Number.isFinite(unitsPerMeter) || unitsPerMeter <= 0) throw new Error("地图坐标比例无效");
  return { dim: base.length >= 3 ? 3 : 2, eastAxis: 0, northAxis: 1, upAxis: 2, unitsPerMeter };
}

export function toWorldPosition(
  calibration: Calibration,
  raw: number[],
  heightMeters: number
): [number, number, number] {
  const halfHeight = (heightMeters * calibration.unitsPerMeter) / 2;

  if (calibration.dim === 2) {
    return [raw[0], raw[1], halfHeight];
  }

  const out: [number, number, number] = [raw[0], raw[1], raw[2]];
  out[calibration.upAxis] += halfHeight;

  return out;
}

export function toWorldScale(
  calibration: Calibration,
  widthMeters: number,
  depthMeters: number,
  heightMeters: number
): [number, number, number] {
  const unit = calibration.unitsPerMeter;

  if (calibration.dim === 2) {
    return [widthMeters * unit, depthMeters * unit, heightMeters * unit];
  }

  const out: [number, number, number] = [0, 0, 0];
  out[calibration.eastAxis] = widthMeters * unit;
  out[calibration.northAxis] = depthMeters * unit;
  out[calibration.upAxis] = heightMeters * unit;

  return out;
}

export function createParkScene(input: {
  gl: WebGLRenderingContext;
  width: number;
  height: number;
  cc: AMapCustomCoords;
  calibration: Calibration;
  objects: ParkSceneObject[];
  /** 分类色板，来自 bootstrap.categories；缺失时退回深青，不阻断三维 */
  categoryColors?: Record<string, string>;
}): ParkSceneHandle {
  const { calibration } = input;
  const unit = calibration.unitsPerMeter;
  const scene = new Scene();
  const camera = new PerspectiveCamera(60, input.width / input.height, 1, 1e7);
  const renderer = new WebGLRenderer({ canvas: input.gl.canvas as HTMLCanvasElement, context: input.gl, alpha: true });
  renderer.autoClear = false;
  addLights(scene);
  const library = createLandmarkLibrary();
  const objects = new Map<string, Group>();
  const dimensions = new Map<string, ParkSceneObject>();

  /**
   * 标准全彩底图上，低饱和冰蓝/白色模型会和米白道路、绿地糊在一起。
   * 给每个点位加一个分类色地锚：既是可读的落点，也把 bootstrap 里已有、
   * 但三维链路一直没用的分类色接上。用不透明圆环而不是透明叠壳，
   * 保持共享 WebGL1 上下文里的绘制稳定；每个点位只多一次 draw call。
   */
  const padGeometry = new RingGeometry(0.74, 1, 32);
  const padFallback = new MeshBasicMaterial({
    color: "#8e2b26", transparent: true, opacity: 0.92, depthWrite: false
  });
  const padMaterials = new Map<string, MeshBasicMaterial>();
  const pads = new Map<string, Mesh>();

  const padMaterial = (category: string): MeshBasicMaterial => {
    const color = input.categoryColors?.[category];

    if (!color) {
      return padFallback;
    }

    let material = padMaterials.get(color);

    if (!material) {
      material = new MeshBasicMaterial({
        color, transparent: true, opacity: 0.92, depthWrite: false
      });
      padMaterials.set(color, material);
    }

    return material;
  };

  const raws = input.cc.lngLatsToCoords(input.objects.map((item) => item.lngLat));
  for (let i = 0; i < input.objects.length; i++) {
    const item = input.objects[i];
    const raw = raws[i];
    if (!raw || raw.length < 2 || !raw.every(Number.isFinite)) {
      throw new Error(`坐标换算失败：${item.id}`);
    }
    const group = library.build(item.kind, item.id);
    group.position.set(...toWorldPosition(calibration, raw, 0));
    group.scale.set(...toWorldScale(calibration, item.widthMeters, item.depthMeters, item.heightMeters));
    group.userData.category = item.category;
    scene.add(group);
    objects.set(item.id, group);
    dimensions.set(item.id, item);

    const pad = new Mesh(padGeometry, padMaterial(item.category));
    const radius = Math.max(item.widthMeters, item.depthMeters) * unit * 0.78;
    const [px, py, pz] = toWorldPosition(calibration, raw, 0);
    pad.scale.set(radius, radius, 1);
    pad.position.set(px, py, pz + 0.06 * unit);
    pad.renderOrder = 2;
    scene.add(pad);
    pads.set(item.id, pad);
  }
  const selection = library.selection();
  selection.visible = false;
  selection.renderOrder = 5;
  /** 朱砂红选中环外面套一圈金边，在绿地/水域上也不会和底色融掉 */
  const selectionOutline = new Mesh(
    new RingGeometry(0.5, 0.6, 48),
    new MeshBasicMaterial({
      color: "#e8c87a", transparent: true, opacity: 0.95, depthWrite: false
    })
  );
  selectionOutline.renderOrder = 4;
  selection.add(selectionOutline);
  scene.add(selection);
  const raycaster = new Raycaster();
  const projected = new Vector3();
  let width = input.width;
  let height = input.height;
  return {
    renderer, scene, camera,
    draw() {
      renderer.resetState();
      renderer.setViewport(0, 0, input.gl.drawingBufferWidth, input.gl.drawingBufferHeight);
      renderer.render(scene, camera);
      renderer.resetState();
    },
    resize(w, h) {
      width = Math.max(w, 1); height = Math.max(h, 1);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    },
    applyCamera(params) {
      camera.near = params.near; camera.far = params.far; camera.fov = params.fov;
      // 已经是归一化三元组，直接索引取值，不依赖 SDK 返回值的可迭代性
      camera.position.set(params.position[0], params.position[1], params.position[2]);
      camera.up.set(params.up[0], params.up[1], params.up[2]);
      camera.lookAt(params.lookAt[0], params.lookAt[1], params.lookAt[2]);
      camera.updateProjectionMatrix();
      camera.updateMatrixWorld();
    },
    select(id) {
      const group = id ? objects.get(id) : undefined;
      selection.visible = Boolean(group);
      if (!group || !id) return;
      const item = dimensions.get(id)!;
      const diameter = Math.max(item.widthMeters, item.depthMeters) * unit * 1.5;
      selection.scale.set(diameter, diameter, 1);
      selection.position.copy(group.position);
      selection.position.z = 0.12 * unit;
    },
    filter(category) {
      objects.forEach((group, id) => {
        group.visible = !category || group.userData.category === category || group.userData.category === "gate";
        const pad = pads.get(id);
        if (pad) pad.visible = group.visible;
      });
    },
    project(id) {
      const group = objects.get(id);
      const item = dimensions.get(id);
      if (!group || !item || !group.visible) return null;
      projected.copy(group.position);
      projected.z += item.heightMeters * unit + 3 * unit;
      projected.project(camera);
      return { x: (projected.x + 1) * width / 2, y: (1 - projected.y) * height / 2,
        visible: projected.z > -1 && projected.z < 1 && Math.abs(projected.x) < 1 && Math.abs(projected.y) < 1 };
    },
    pick(ndc) {
      scene.updateMatrixWorld(true);
      raycaster.setFromCamera(ndc, camera);
      const hits = raycaster.intersectObjects([...objects.values()].filter((group) => group.visible), true);
      const hit = hits.find((h) => !h.object.userData.decoration);
      return hit ? String(hit.object.userData.spotId) : null;
    },
    dispose() {
      library.dispose();
      renderer.dispose();
      padGeometry.dispose();
      padFallback.dispose();
      padMaterials.forEach((material) => material.dispose());
      padMaterials.clear();
      pads.clear();
      selectionOutline.geometry.dispose();
      (selectionOutline.material as MeshBasicMaterial).dispose();
      scene.clear();
      objects.clear();
      dimensions.clear();
    }
  };
}
