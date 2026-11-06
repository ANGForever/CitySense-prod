import assert from "node:assert/strict";
import test from "node:test";
import { GATES, LAKES, PARK, ROUTES, SPOTS, ZONES } from "@/server/snow/data";
import { DEMO_CORE, SPOT_PLAN, planToGeo } from "@/server/snow/layout";
import { distanceMeters } from "@/server/snow/geo";

test("总图北箭头向左：图右向南、图下向西、湖区方向向东", () => {
  assert.ok(planToGeo([100, 0]).latitude < DEMO_CORE.latitude);
  assert.ok(planToGeo([-100, 0]).latitude > DEMO_CORE.latitude);
  assert.ok(planToGeo([0, 100]).longitude < DEMO_CORE.longitude);
  assert.ok(planToGeo([0, -100]).longitude > DEMO_CORE.longitude);
});

test("原清单和新增标注全部走同一套设计落位，不遗漏或悬挂", () => {
  assert.deepEqual(new Set(SPOTS.map(s => s.id)), new Set(Object.keys(SPOT_PLAN)));
  assert.equal(SPOTS.length, 40);
  const core = SPOTS.find(s => s.id === "CT-CORE-01")!;
  assert.ok(distanceMeters(core.geo, DEMO_CORE) < 0.2);
  assert.deepEqual(PARK.center, DEMO_CORE);
  assert.equal(PARK.coordSystem, "UNCONFIRMED");
  assert.ok(SPOTS.every(s => s.isMock));
});

test("三门方位与三湖顺序符合总规划，商街留在湖岸陆侧", () => {
  const north = GATES.find(g => g.id === "fulu-yingbin")!.geo;
  const south = GATES.find(g => g.id === "pingan-nafu")!.geo;
  const west = GATES.find(g => g.id === "fuman-qingtang")!.geo;
  assert.ok(north.latitude > DEMO_CORE.latitude && south.latitude < DEMO_CORE.latitude);
  assert.ok(west.longitude < DEMO_CORE.longitude - 0.002);
  assert.ok(LAKES[0].geo.latitude > LAKES[1].geo.latitude);
  assert.ok(LAKES[1].geo.latitude > LAKES[2].geo.latitude);
  assert.ok(LAKES.every(l => l.geo.longitude > DEMO_CORE.longitude));
  assert.ok(SPOTS.filter(s => s.zoneId === "snow-market").every(s => s.geo.longitude < DEMO_CORE.longitude));
});

test("点位、三门、三湖、分区和路线均在设计图估落包络内", () => {
  const points = [...SPOTS, ...GATES, ...LAKES, ...ZONES].map(p => p.geo)
    .concat(ROUTES.flatMap(r => r.polyline));
  // 对照当前底图的区域级包络；不把它当作实测园界。
  for (const p of points) {
    assert.ok(p.longitude >= 101.7621 && p.longitude <= 101.7675, JSON.stringify(p));
    assert.ok(p.latitude >= 36.6908 && p.latitude <= 36.6967, JSON.stringify(p));
  }
});

test("路线从对应大门起止，并按清单次序经过每个实际点位", () => {
  for (const route of ROUTES) {
    const entry = GATES.find(g => g.id === route.entryGateId)!;
    const exit = GATES.find(g => g.id === route.exitGateId)!;
    assert.ok(distanceMeters(route.polyline[0], entry.geo) < 0.2, route.id);
    assert.ok(distanceMeters(route.polyline.at(-1)!, exit.geo) < 0.2, route.id);
    let previous = -1;
    for (const id of route.spotIds) {
      const spot = SPOTS.find(s => s.id === id)!;
      const index = route.polyline.findIndex((p, i) => i > previous && distanceMeters(p, spot.geo) < 0.2);
      assert.ok(index > previous, `${route.id} 未按顺序经过 ${id}`);
      previous = index;
    }
  }
});
