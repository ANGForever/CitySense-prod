/**
 * 「全园视角」的纯几何计算。
 *
 * design 5.5 要求 resetView 回到能看全园的镜头。固定 16.3 在多数手机上能用，
 * 但点位范围、屏幕宽高、底部导览面板的遮挡都会变：小屏上园区容易被面板压住，
 * 桌面宽屏上左侧信息卡又会吃掉一半画布。这里按包围盒 + 可用像素反推 zoom，
 * 并把中心朝「遮挡较少的一侧」偏移，固定值只作为计算失败时的兜底。
 *
 * 刻意不依赖 AMap / Three / DOM，便于用单元测试锁住数值边界。
 */

/** 首次进入突出核心区；全园视角是另一个有意选择的值，不是笔误 */
export const INITIAL_ZOOM = 17.3;
/** 计算不可用时的兜底缩放，对应原先人工调出来的「看全园」视角 */
export const OVERVIEW_ZOOM = 16.3;

/** Web 墨卡托赤道周长（米），256px 瓦片 */
const MERCATOR_CIRCUMFERENCE = 40075016.686;
const TILE_PX = 256;
const METERS_PER_DEG_LAT = 111320;
const DEG_TO_RAD = Math.PI / 180;

export type GeoLike = { longitude: number; latitude: number };

export type OverviewViewport = { width: number; height: number };

export type OverviewTarget = {
  zoom: number;
  /** [longitude, latitude]，与高德 setZoomAndCenter 的顺序一致 */
  center: [number, number];
};

export type OverviewOptions = {
  minZoom?: number;
  maxZoom?: number;
  fallbackZoom?: number;
  fallbackCenter?: [number, number];
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * UI 遮挡 inset（像素）。
 * 与 Amap3DScene 里标签避让的阈值保持同一组数字：移动端顶部是品牌+搜索+分类，
 * 底部是导览面板；桌面端左侧还有一张 360px 的信息卡。
 */
function uiInsets(width: number) {
  return width < 700
    ? { top: 190, bottom: 230, left: 24, right: 24 }
    : { top: 85, bottom: 50, left: 420, right: 40 };
}

/**
 * 按点位包围盒计算全园视角。
 *
 * - 无效/非有限坐标会被过滤；过滤后为空时返回兜底值，不抛错。
 * - 单点或退化包围盒用最小跨度兜底，避免除零算出 Infinity zoom。
 * - pitch≈45° 时纵向可见范围会被压缩，用 0.85 系数保守估计，宁可稍远一点。
 * - 结果始终 clamp 在 [OVERVIEW_ZOOM-1.2, INITIAL_ZOOM]，防止高德 zoom 语义
 *   与墨卡托公式有偏差时把镜头拉到园区外。
 */
export function computeOverview(
  points: GeoLike[],
  viewport: OverviewViewport,
  options: OverviewOptions = {}
): OverviewTarget {
  const fallbackZoom = options.fallbackZoom ?? OVERVIEW_ZOOM;
  const fallbackCenter = options.fallbackCenter ?? [0, 0];
  const minZoom = options.minZoom ?? OVERVIEW_ZOOM - 1.2;
  const maxZoom = options.maxZoom ?? INITIAL_ZOOM;

  const valid = points.filter(
    (point) =>
      Number.isFinite(point.longitude) &&
      Number.isFinite(point.latitude) &&
      Math.abs(point.longitude) <= 180 &&
      Math.abs(point.latitude) <= 85
  );

  if (valid.length === 0) {
    return { zoom: fallbackZoom, center: [...fallbackCenter] };
  }

  let minLng = Infinity;
  let maxLng = -Infinity;
  let minLat = Infinity;
  let maxLat = -Infinity;

  for (const point of valid) {
    minLng = Math.min(minLng, point.longitude);
    maxLng = Math.max(maxLng, point.longitude);
    minLat = Math.min(minLat, point.latitude);
    maxLat = Math.max(maxLat, point.latitude);
  }

  const midLat = (minLat + maxLat) / 2;
  const midLng = (minLng + maxLng) / 2;
  const latCos = Math.max(Math.cos(midLat * DEG_TO_RAD), 1e-6);
  const metersPerDegLng = METERS_PER_DEG_LAT * latCos;

  // 留 12% 余量，避免最外圈点位贴在卡片边缘；退化包围盒按 120m 计算
  const spanLngMeters = Math.max((maxLng - minLng) * metersPerDegLng * 1.12, 120);
  const spanLatMeters = Math.max((maxLat - minLat) * METERS_PER_DEG_LAT * 1.12, 120);

  const width = Number.isFinite(viewport.width) ? Math.max(viewport.width, 240) : 390;
  const height = Number.isFinite(viewport.height) ? Math.max(viewport.height, 320) : 844;
  const inset = uiInsets(width);
  const usableWidth = Math.max(width - inset.left - inset.right, 120);
  // 倾斜视角下纵向有效像素比正射少，保守打折
  const usableHeight = Math.max((height - inset.top - inset.bottom) * 0.85, 120);

  const requiredMetersPerPixel = Math.max(
    spanLngMeters / usableWidth,
    spanLatMeters / usableHeight
  );

  const rawZoom = Math.log2(
    (MERCATOR_CIRCUMFERENCE * latCos) / (TILE_PX * requiredMetersPerPixel)
  );

  const zoom = Number.isFinite(rawZoom) ? clamp(rawZoom, minZoom, maxZoom) : fallbackZoom;

  // 把中心朝「遮挡多的一侧」反方向移动，让园区整体落在可见区域中央。
  // 分辨率按最终 zoom 反算，偏移量限幅，防止极端尺寸把镜头推出园区。
  const metersPerPixel =
    (MERCATOR_CIRCUMFERENCE * latCos) / (TILE_PX * Math.pow(2, zoom));
  const shiftXMeters = clamp(
    ((inset.left - inset.right) / 2) * metersPerPixel,
    -400,
    400
  );
  const shiftYMeters = clamp(
    ((inset.bottom - inset.top) / 2) * metersPerPixel,
    0,
    250
  );

  const center: [number, number] = [
    midLng - shiftXMeters / metersPerDegLng,
    midLat - shiftYMeters / METERS_PER_DEG_LAT
  ];

  return Number.isFinite(center[0]) && Number.isFinite(center[1])
    ? { zoom, center }
    : { zoom: fallbackZoom, center: [...fallbackCenter] };
}
