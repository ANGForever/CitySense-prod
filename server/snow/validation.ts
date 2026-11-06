/**
 * 演示数据完整性校验。
 *
 * 目的不是替代运行时校验，而是让「点位/路线配错」在构建期或首次请求时就暴露，
 * 而不是等到地图上出现一个点不出来的位置才发现。
 *
 * 返回问题列表，空数组表示通过。
 */

import { isFiniteGeo, polylineLengthMeters } from "@/server/snow/geo";
import { GATES, LAKES, ROUTES, SPOTS, ZONES } from "@/server/snow/data";
import type { DemoRoute, DemoSpot } from "@/server/snow/types";

/** 步行速度下限：按 45 米/分钟估算，低于此值说明路线耗时写得过于乐观 */
const MIN_WALK_METERS_PER_MINUTE = 45;

export function validateParkData(input?: {
  spots?: DemoSpot[];
  routes?: DemoRoute[];
}): string[] {
  const spots = input?.spots ?? SPOTS;
  const routes = input?.routes ?? ROUTES;
  const issues: string[] = [];

  const spotIds = new Set<string>();
  const gateIds = new Set(GATES.map((gate) => gate.id));
  const zoneIds = new Set(ZONES.map((zone) => zone.id));
  const lakeIds = new Set(LAKES.map((lake) => lake.id));

  for (const spot of spots) {
    if (spotIds.has(spot.id)) {
      issues.push(`点位 ID 重复：${spot.id}`);
    }
    spotIds.add(spot.id);

    if (!spot.id.startsWith("CT-")) {
      issues.push(`点位 ID 未按 CT- 前缀命名：${spot.id}`);
    }

    if (!isFiniteGeo(spot.geo)) {
      issues.push(`点位坐标非法：${spot.id}`);
    }

    if (!zoneIds.has(spot.zoneId)) {
      issues.push(`点位分区不存在：${spot.id} -> ${spot.zoneId}`);
    }

    if (spot.lakeId && !lakeIds.has(spot.lakeId)) {
      issues.push(`点位湖区分不存在：${spot.id} -> ${spot.lakeId}`);
    }

    if (spot.gateId && !gateIds.has(spot.gateId)) {
      issues.push(`点位大门不存在：${spot.id} -> ${spot.gateId}`);
    }

    if (!spot.name.trim()) {
      issues.push(`点位缺少名称：${spot.id}`);
    }

    if (spot.category !== "gate" && !spot.model) {
      issues.push(`点位缺少体块尺寸：${spot.id}`);
    }

    if (spot.model) {
      const { widthMeters, depthMeters, heightMeters } = spot.model;

      if (widthMeters <= 0 || depthMeters <= 0 || heightMeters <= 0) {
        issues.push(`点位体块尺寸必须为正数：${spot.id}`);
      }
    }
  }

  const routeIds = new Set<string>();

  for (const route of routes) {
    if (routeIds.has(route.id)) {
      issues.push(`路线 ID 重复：${route.id}`);
    }
    routeIds.add(route.id);

    if (route.spotIds.length < 3) {
      issues.push(`路线点位少于 3 个：${route.id}`);
    }

    for (const spotId of route.spotIds) {
      if (!spotIds.has(spotId)) {
        issues.push(`路线引用了不存在的点位：${route.id} -> ${spotId}`);
      }
    }

    if (new Set(route.spotIds).size !== route.spotIds.length) {
      issues.push(`路线点位重复：${route.id}`);
    }

    if (route.polyline.length < 2) {
      issues.push(`路线折线少于 2 个点：${route.id}`);
    }

    for (const point of route.polyline) {
      if (!isFiniteGeo(point)) {
        issues.push(`路线折线坐标非法：${route.id}`);
      }
    }

    if (!gateIds.has(route.entryGateId)) {
      issues.push(`路线入口大门不存在：${route.id} -> ${route.entryGateId}`);
    }

    if (!gateIds.has(route.exitGateId)) {
      issues.push(`路线出口大门不存在：${route.id} -> ${route.exitGateId}`);
    }

    if (route.estimatedMinutes <= 0) {
      issues.push(`路线耗时必须为正数：${route.id}`);
    }

    const lengthMeters = polylineLengthMeters(route.polyline);
    const minimumMinutes = lengthMeters / MIN_WALK_METERS_PER_MINUTE;

    if (route.estimatedMinutes < minimumMinutes * 0.5) {
      issues.push(
        `路线耗时明显偏短：${route.id} 折线 ${lengthMeters}m，仅标 ${route.estimatedMinutes} 分钟`
      );
    }
  }

  return issues;
}

/** 开发期启动检查：只在非生产环境抛出，避免把演示数据问题带到线上 */
export function assertParkDataValid(): void {
  const issues = validateParkData();

  if (issues.length > 0 && process.env.NODE_ENV !== "production") {
    throw new Error(`冰雪节演示数据校验失败：\n${issues.join("\n")}`);
  }
}
