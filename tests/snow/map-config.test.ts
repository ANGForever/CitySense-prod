/**
 * 底图配置回归（design 5.2 / 5.4）。
 *
 * 「标准全彩 + 放开 features」是明确的交付选择，最容易被后续「调回素雅」
 * 或某次合并悄悄改掉。这里把三个常量锁住，也保证异常路径的 fallback
 * 和服务端下发用同一份值，不会只在降级时才露出不一致。
 */

import assert from "node:assert/strict";
import test from "node:test";
import {
  SNOW_MAP_FEATURES,
  SNOW_MAP_SKY_COLOR,
  SNOW_MAP_STYLE
} from "@/server/snow/map-config";

test("底图锁定标准全彩样式", () => {
  assert.equal(SNOW_MAP_STYLE, "amap://styles/normal");
  assert.ok(SNOW_MAP_STYLE.startsWith("amap://styles/"));
});

test("四类地图要素全部放开", () => {
  assert.deepEqual([...SNOW_MAP_FEATURES], ["bg", "road", "point", "building"]);
});

test("天空色已适配彩底，不再是纸白时代的浅青", () => {
  assert.match(SNOW_MAP_SKY_COLOR, /^#[0-9a-f]{6}$/i);
  assert.notEqual(SNOW_MAP_SKY_COLOR, "#eaf2f0");
});
