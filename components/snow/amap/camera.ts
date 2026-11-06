/**
 * customCoords.getCameraParams() 的运行时归一化。
 *
 * 高德 JS API 2.0 的不同构建里，position / lookAt / up 可能是普通数组，
 * 也可能是 Float32Array / Float64Array 等 TypedArray。二者都能被
 * camera.position.set(...) 消费，但 **Array.isArray(TypedArray) === false**。
 * 曾经用 Array.isArray 做形状校验，把本来可用的返回值判成「相机参数不完整」，
 * 导致真实浏览器里直接降级到示意图。
 *
 * 因此这里不信任 SDK 的静态类型：把外部数据收敛成确定的三元组，
 * 不合格时返回带键名与类型描述的诊断，供 __snow3d 与降级提示使用。
 */

export type Vec3 = [number, number, number];

export type NormalizedCameraParams = {
  near: number;
  far: number;
  fov: number;
  position: Vec3;
  lookAt: Vec3;
  up: Vec3;
};

export type CameraCheck =
  | { ok: true; params: NormalizedCameraParams }
  | { ok: false; diagnostic: string };

function typeLabel(value: unknown): string {
  if (value === null) {
    return "null";
  }

  if (value === undefined) {
    return "undefined";
  }

  if (Array.isArray(value)) {
    return `Array(${value.length})`;
  }

  if (ArrayBuffer.isView(value)) {
    const name = (value as object).constructor?.name ?? "TypedArray";
    const view = value as unknown as ArrayLike<unknown>;
    const length = typeof view.length === "number" ? String(view.length) : "?";

    return `${name}(${length})`;
  }

  return typeof value;
}

/** 接受数组、TypedArray，以及任何带 length 与 0/1/2 数字索引的类数组 */
export function readVec3(value: unknown): Vec3 | null {
  if (value === null || typeof value !== "object") {
    return null;
  }

  const candidate = value as ArrayLike<unknown>;

  if (typeof candidate.length !== "number" || candidate.length < 3) {
    return null;
  }

  const out: Vec3 = [
    Number(candidate[0]),
    Number(candidate[1]),
    Number(candidate[2])
  ];

  return out.every(Number.isFinite) ? out : null;
}

/** near / far / fov 必须是正数；字符串数字也接受，避免 SDK 返回字符串时误判 */
function readPositive(value: unknown): number | null {
  const number = Number(value);

  return Number.isFinite(number) && number > 0 ? number : null;
}

export function normalizeCameraParams(raw: unknown): CameraCheck {
  if (!raw || typeof raw !== "object") {
    return { ok: false, diagnostic: `getCameraParams() 返回 ${typeLabel(raw)}` };
  }

  const source = raw as Record<string, unknown>;
  const keys = Object.keys(source).slice(0, 12).join(",");
  const shape = ["fov", "near", "far", "position", "lookAt", "up"]
    .map((key) => `${key}=${typeLabel(source[key])}`)
    .join(" ");

  const fov = readPositive(source.fov);
  const near = readPositive(source.near);
  const far = readPositive(source.far);
  const position = readVec3(source.position);
  const lookAt = readVec3(source.lookAt);
  const up = readVec3(source.up);

  if (
    fov === null ||
    near === null ||
    far === null ||
    far <= near ||
    !position ||
    !lookAt ||
    !up
  ) {
    return { ok: false, diagnostic: `keys=[${keys}] ${shape}` };
  }

  return { ok: true, params: { fov, near, far, position, lookAt, up } };
}
