import assert from "node:assert/strict";
import test from "node:test";
import { buildBootstrap, ROUTES, SPOTS, UNVERIFIED_SPOT_IDS } from "@/server/snow/data";
import { validateParkData } from "@/server/snow/validation";

test("演示数据通过完整性校验", () => {
  const issues = validateParkData();

  assert.deepEqual(issues, [], `数据校验未通过：\n${issues.join("\n")}`);
});

test("路线引用的点位全部存在", () => {
  const ids = new Set(SPOTS.map((spot) => spot.id));

  for (const route of ROUTES) {
    for (const spotId of route.spotIds) {
      assert.ok(ids.has(spotId), `路线 ${route.id} 引用了不存在的点位 ${spotId}`);
    }
  }
});

test("路线点位不重复且至少 3 个", () => {
  for (const route of ROUTES) {
    assert.ok(route.spotIds.length >= 3, `路线 ${route.id} 点位不足 3 个`);
    assert.equal(
      new Set(route.spotIds).size,
      route.spotIds.length,
      `路线 ${route.id} 存在重复点位`
    );
  }
});

test("bootstrap 的版本号与分类图例完整", () => {
  const data = buildBootstrap();

  assert.ok(data.version.length > 0);
  assert.equal(data.categories.length, 6);
  assert.equal(data.spots.length, SPOTS.length);
  assert.equal(data.routes.length, ROUTES.length);
});

test("每个点位都有体块尺寸，除了大门", () => {
  for (const spot of SPOTS) {
    if (spot.category === "gate") {
      continue;
    }

    assert.ok(spot.model, `点位 ${spot.id} 缺少 model`);
    assert.ok(spot.model.widthMeters > 0, `点位 ${spot.id} 宽度非正数`);
  }
});

test("未校对清单与 verified 标记一致", () => {
  const expected = SPOTS.filter((spot) => !spot.verified).map((spot) => spot.id);

  assert.deepEqual(UNVERIFIED_SPOT_IDS, expected);
});

test("校验器能发现悬挂引用", () => {
  const issues = validateParkData({
    spots: SPOTS,
    routes: [
      {
        ...ROUTES[0],
        spotIds: ["CT-NOT-EXIST", ROUTES[0].spotIds[1], ROUTES[0].spotIds[2]]
      }
    ]
  });

  assert.ok(issues.some((issue) => issue.includes("不存在的点位")));
});
