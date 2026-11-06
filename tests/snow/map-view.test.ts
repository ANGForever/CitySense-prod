import assert from "node:assert/strict";
import test from "node:test";
import {
  computeOverview,
  INITIAL_ZOOM,
  OVERVIEW_ZOOM
} from "@/components/snow/map-view";
import { GATES, SPOTS } from "@/server/snow/data";

const ALL_POINTS = [...SPOTS.map((s) => s.geo), ...GATES.map((g) => g.geo)];

function midpoint(points: typeof ALL_POINTS) {
  const lngs = points.map((p) => p.longitude);
  const lats = points.map((p) => p.latitude);
  return {
    longitude: (Math.min(...lngs) + Math.max(...lngs)) / 2,
    latitude: (Math.min(...lats) + Math.max(...lats)) / 2
  };
}

test("空点位回退到固定全园缩放，不产生 NaN", () => {
  const result = computeOverview([], { width: 390, height: 844 });

  assert.equal(result.zoom, OVERVIEW_ZOOM);
  assert.ok(result.center.every(Number.isFinite));
});

test("单点这种退化包围盒也只返回有限且受限的缩放", () => {
  const result = computeOverview(
    [{ longitude: 101.7649, latitude: 36.6946 }],
    { width: 390, height: 844 }
  );

  assert.ok(Number.isFinite(result.zoom));
  assert.ok(result.zoom <= INITIAL_ZOOM);
  assert.ok(result.zoom >= OVERVIEW_ZOOM - 1.2);
  assert.ok(result.center.every(Number.isFinite));
});

test("真实点位包围盒在小屏上得到有限的镜头与合法缩放", () => {
  const result = computeOverview(ALL_POINTS, { width: 390, height: 844 });

  assert.ok(Number.isFinite(result.zoom));
  assert.ok(result.zoom >= OVERVIEW_ZOOM - 1.2 && result.zoom <= INITIAL_ZOOM);
  assert.equal(result.center.length, 2);
  assert.ok(result.center.every(Number.isFinite));
});

test("小屏底部面板遮挡更多时，中心向南偏移让园区上移", () => {
  const mid = midpoint(ALL_POINTS);
  const result = computeOverview(ALL_POINTS, { width: 390, height: 844 });

  assert.ok(result.center[1] < mid.latitude);
  assert.ok(Math.abs(result.center[0] - mid.longitude) < 1e-9);
});

test("桌面左侧信息卡遮挡更多时，中心向西偏移让园区右移", () => {
  const mid = midpoint(ALL_POINTS);
  const result = computeOverview(ALL_POINTS, { width: 1280, height: 800 });

  assert.ok(result.center[0] < mid.longitude);
});

test("非法坐标被过滤，不会污染计算结果", () => {
  const result = computeOverview(
    [
      ...ALL_POINTS,
      { longitude: Number.NaN, latitude: 36.6 },
      { longitude: 101.7, latitude: Number.POSITIVE_INFINITY },
      { longitude: 999, latitude: 99 }
    ],
    { width: 390, height: 844 }
  );

  assert.ok(Number.isFinite(result.zoom));
  assert.ok(result.center.every(Number.isFinite));
});

test("容器尺寸为 0 或 NaN 时仍返回可用兜底", () => {
  for (const viewport of [
    { width: 0, height: 0 },
    { width: Number.NaN, height: Number.NaN }
  ]) {
    const result = computeOverview(ALL_POINTS, viewport);
    assert.ok(Number.isFinite(result.zoom));
    assert.ok(result.center.every(Number.isFinite));
  }
});
