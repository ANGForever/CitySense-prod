import assert from "node:assert/strict";
import test from "node:test";
import { distanceMeters, isFiniteGeo, offsetGeo, polylineLengthMeters } from "@/server/snow/geo";

const CENTER = { longitude: 101.76493373404837, latitude: 36.694585528034665 };

/** offsetGeo 输出保留 6 位小数，未偏移的那个轴也会有亚米级取整误差 */
function assertCloseTo(actual: number, expected: number, tolerance = 1e-5) {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `期望 ${expected} ± ${tolerance}，实际 ${actual}`
  );
}

test("offsetGeo 向正东偏移只改变经度", () => {
  const point = offsetGeo(CENTER, 100, 0);

  assertCloseTo(point.latitude, CENTER.latitude);
  assert.ok(point.longitude > CENTER.longitude);
});

test("offsetGeo 向正北偏移只改变纬度", () => {
  const point = offsetGeo(CENTER, 0, 100);

  assertCloseTo(point.longitude, CENTER.longitude);
  assert.ok(point.latitude > CENTER.latitude);
});

test("offsetGeo 正南与正西用负数表达", () => {
  const south = offsetGeo(CENTER, 0, -100);
  const west = offsetGeo(CENTER, -100, 0);

  assert.ok(south.latitude < CENTER.latitude);
  assert.ok(west.longitude < CENTER.longitude);
});

test("offsetGeo 的偏移量与距离函数自洽", () => {
  for (const [east, north] of [
    [100, 0],
    [0, 100],
    [-260, 180],
    [340, -420]
  ]) {
    const point = offsetGeo(CENTER, east, north);
    const expected = Math.hypot(east, north);
    const actual = distanceMeters(CENTER, point);

    // 平面近似在 1km 内的相对误差应远小于 0.5%
    assert.ok(
      Math.abs(actual - expected) / expected < 0.005,
      `偏移 (${east}, ${north}) 期望约 ${expected}m，实际 ${actual.toFixed(2)}m`
    );
  }
});

test("polylineLengthMeters 累加折线长度", () => {
  const path = [offsetGeo(CENTER, 0, 0), offsetGeo(CENTER, 100, 0), offsetGeo(CENTER, 100, 100)];
  const length = polylineLengthMeters(path);

  assert.ok(Math.abs(length - 200) < 2, `期望约 200m，实际 ${length}m`);
});

test("isFiniteGeo 拒绝越界与非法值", () => {
  assert.equal(isFiniteGeo(CENTER), true);
  assert.equal(isFiniteGeo({ longitude: 181, latitude: 0 }), false);
  assert.equal(isFiniteGeo({ longitude: 0, latitude: 91 }), false);
  assert.equal(isFiniteGeo({ longitude: Number.NaN, latitude: 0 }), false);
});
