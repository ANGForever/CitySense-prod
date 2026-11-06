/**
 * getCameraParams 归一化回归。
 *
 * 核心回归点：高德真实浏览器里 position/lookAt/up 返回 TypedArray，
 * 而 Array.isArray(Float32Array) === false。旧校验因此把可用参数判成
 * 「相机参数不完整」并降级到示意图。
 */

import assert from "node:assert/strict";
import test from "node:test";
import {
  normalizeCameraParams,
  readVec3
} from "@/components/snow/amap/camera";

function base() {
  return {
    fov: 60,
    near: 1,
    far: 10_000_000,
    position: [100, 200, 300],
    lookAt: [0, 0, 0],
    up: [0, 1, 0]
  };
}

test("锁住根因：TypedArray 不是 Array，但必须被接受", () => {
  assert.equal(Array.isArray(new Float32Array([1, 2, 3])), false);

  const checked = normalizeCameraParams({
    ...base(),
    position: new Float32Array([100, 200, 300]),
    lookAt: new Float32Array([0, 0, 0]),
    up: new Float32Array([0, 1, 0])
  });

  assert.equal(checked.ok, true);

  if (checked.ok) {
    assert.deepEqual(checked.params.position, [100, 200, 300]);
    assert.deepEqual(checked.params.up, [0, 1, 0]);
  }
});

test("普通数组、Float64Array 与类数组都能归一化", () => {
  const arrayLike = { 0: 1, 1: 2, 2: 3, length: 3 };

  for (const position of [
    [1, 2, 3],
    new Float64Array([1, 2, 3]),
    arrayLike
  ]) {
    const checked = normalizeCameraParams({ ...base(), position });
    assert.equal(checked.ok, true);
    if (checked.ok) assert.deepEqual(checked.params.position, [1, 2, 3]);
  }
});

test("数值字段允许字符串数字，但必须为正", () => {
  const checked = normalizeCameraParams({
    ...base(),
    fov: "60",
    near: "1",
    far: "10000000"
  });

  assert.equal(checked.ok, true);
  if (checked.ok) assert.equal(checked.params.fov, 60);

  assert.equal(normalizeCameraParams({ ...base(), fov: 0 }).ok, false);
  assert.equal(normalizeCameraParams({ ...base(), near: -1 }).ok, false);
});

test("far 必须大于 near", () => {
  assert.equal(normalizeCameraParams({ ...base(), near: 10, far: 5 }).ok, false);
});

test("返回值缺失或不是对象时，诊断带类型", () => {
  for (const raw of [null, undefined, 42, "camera"]) {
    const checked = normalizeCameraParams(raw);
    assert.equal(checked.ok, false);
    if (!checked.ok) assert.match(checked.diagnostic, /getCameraParams/);
  }
});

test("缺字段时诊断列出键名与每个字段的实际类型", () => {
  const checked = normalizeCameraParams({ ...base(), position: undefined });

  assert.equal(checked.ok, false);
  if (!checked.ok) {
    assert.match(checked.diagnostic, /keys=\[/);
    assert.match(checked.diagnostic, /position=undefined/);
    assert.match(checked.diagnostic, /fov=number/);
  }
});

test("TypedArray 长度不足或含 NaN 会被拒绝", () => {
  assert.equal(readVec3(new Float32Array([1, 2])), null);
  assert.equal(readVec3(new Float32Array([1, 2, Number.NaN])), null);
  assert.equal(readVec3(null), null);
  assert.equal(readVec3("1,2,3"), null);

  assert.equal(
    normalizeCameraParams({ ...base(), up: new Float32Array([0, 1]) }).ok,
    false
  );
});

test("形状异常不会把合法值改坏：归一化结果全是有限数", () => {
  const checked = normalizeCameraParams(base());

  assert.equal(checked.ok, true);
  if (checked.ok) {
    const values = [
      checked.params.fov,
      checked.params.near,
      checked.params.far,
      ...checked.params.position,
      ...checked.params.lookAt,
      ...checked.params.up
    ];
    assert.ok(values.every(Number.isFinite));
  }
});
