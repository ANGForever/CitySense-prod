/**
 * 跨端入口契约回归（T-201 / T-502 / T-602 / T-801）。
 *
 * 直接 import mp/ 里的纯函数与只读契约：小程序与 H5 用同一套 ID 规则，
 * 否则会出现「H5 认为合法、小程序拒绝」或「离线兜底指向不存在的点位」。
 * 这里不 import 任何 @tarojs/* 运行时，mock 环境也能跑。
 */

import assert from "node:assert/strict";
import test from "node:test";
import { buildBootstrap } from "@/server/snow/data";
import {
  ENTRY_SOURCES,
  isSnowBootstrap,
  OFFLINE_ROUTES,
  OFFLINE_SPOTS,
  parseEntry,
  parseRouteId,
  parseSpotId,
  SAFE_ROUTE_ID,
  SAFE_SPOT_ID
} from "../../mp/src/shared/snow";
import {
  buildWebViewUrl,
  parseEntryParams,
  spotIdFromScan
} from "../../mp/src/services/entry";

const bootstrap = buildBootstrap();

test("服务端全部点位 ID 都能被小程序端校验接受", () => {
  assert.ok(bootstrap.spots.length > 0);

  for (const spot of bootstrap.spots) {
    assert.equal(parseSpotId(spot.id), spot.id, `点位 ${spot.id} 的格式两端不一致`);
  }
});

test("服务端全部路线 ID 都能被小程序端校验接受", () => {
  for (const route of bootstrap.routes) {
    assert.equal(parseRouteId(route.id), route.id, `路线 ${route.id} 的格式两端不一致`);
  }
});

test("服务端真实 bootstrap 能通过小程序端的最小运行时校验", () => {
  assert.equal(isSnowBootstrap(bootstrap), true);
});

test("离线兜底清单里的点位与路线都真实存在，不会漂移出园区数据", () => {
  const spotIds = new Set(bootstrap.spots.map((spot) => spot.id));
  const routeIds = new Set(bootstrap.routes.map((route) => route.id));

  for (const spot of OFFLINE_SPOTS) {
    assert.ok(spotIds.has(spot.id), `离线点位 ${spot.id} 不在真实数据中`);
  }

  for (const route of OFFLINE_ROUTES) {
    assert.ok(routeIds.has(route.id), `离线路线 ${route.id} 不在真实数据中`);
  }
});

test("ID 校验拒绝路径穿越、脚本、超长与空白", () => {
  const malicious = [
    "../etc/passwd",
    "javascript:alert(1)",
    "CT-CORE-01<script>",
    "CT CORE 01",
    "A".repeat(25),
    "",
    "https://evil.example.com"
  ];

  for (const value of malicious) {
    assert.equal(parseSpotId(value), null, `不该接受 ${value}`);
  }

  assert.equal(SAFE_SPOT_ID.test("CT-CORE-01"), true);
  assert.equal(SAFE_ROUTE_ID.test("family"), true);
  assert.equal(SAFE_ROUTE_ID.test("Family"), false);
});

test("非法 entry 一律回退 home，且不会引入白名单外的值", () => {
  assert.equal(parseEntry("qr"), "qr");
  assert.equal(parseEntry("nfc"), "nfc");
  assert.equal(parseEntry("admin"), "home");
  assert.equal(parseEntry(undefined), "home");
  assert.ok(ENTRY_SOURCES.every((source) => parseEntry(source) === source));
});

test("页面参数同时校验 spot 与 route，非法参数标记为不可用", () => {
  const ok = parseEntryParams({ spotId: "CT-CORE-01", route: "family", entry: "qr" });
  assert.deepEqual(
    { spotId: ok.spotId, routeId: ok.routeId, entry: ok.entry, valid: ok.valid },
    { spotId: "CT-CORE-01", routeId: "family", entry: "qr", valid: true }
  );

  assert.equal(parseEntryParams({ spot: "../evil" }).valid, false);
  assert.equal(parseEntryParams({ route: "NOT_A_ROUTE" }).valid, false);
  assert.equal(parseEntryParams({}).valid, true);
});

test("扫码结果只提取受控 spotId，绝不返回任意 URL", () => {
  assert.equal(spotIdFromScan("CT-CORE-01"), "CT-CORE-01");
  assert.equal(spotIdFromScan("qingtang://spot?id=CT-PLAY-01"), "CT-PLAY-01");
  assert.equal(spotIdFromScan("qingtang://spot?id=../evil"), null);
  assert.equal(spotIdFromScan("https://evil.example.com/snow?spot=CT-CORE-01"), null);
  assert.equal(spotIdFromScan("javascript:alert(1)"), null);
  assert.equal(spotIdFromScan(""), null);
  assert.equal(spotIdFromScan(undefined), null);
  assert.equal(spotIdFromScan("A".repeat(600)), null);
});

test("业务域名未配置时不会拼出 web-view 地址", () => {
  // 测试进程没有 defineConstants 注入，config 层的 https origin 校验应拒绝空值
  assert.equal(buildWebViewUrl({ spotId: "CT-CORE-01" }), null);
});

test("坏数据不会通过小程序端校验", () => {
  assert.equal(isSnowBootstrap(null), false);
  assert.equal(isSnowBootstrap({ version: "x", spots: [], routes: [], social: {} }), false);
  assert.equal(
    isSnowBootstrap({ version: "x", park: { title: "t" }, spots: [{ id: "../evil", name: "n", tags: [] }], routes: [], social: {} }),
    false
  );
});
