/**
 * 地理计算工具。
 *
 * 甲方交付前，园区内部点位没有实测经纬度。这里提供「以核心景观为原点的局部米制网格」，
 * 把设计图上的相对关系换算成经纬度。所有换算结果都必须带 isMock: true。
 *
 * 注意：这是一个平面近似，在 800m 尺度上误差小于 1 米，可以接受；
 * 一旦获得甲方实测坐标，直接替换 spots[].geo 并去掉 isMock，不要保留两套来源。
 */

import type { GeoPoint } from "@/server/snow/types";

const EARTH_RADIUS_METERS = 6378137;

/** 保留 6 位小数，约 0.1 米精度，避免浮点噪声进入前端 diff */
function round6(value: number): number {
  return Number(value.toFixed(6));
}

/**
 * 从原点向正东 eastMeters、正北 northMeters 偏移，返回新的经纬度。
 * 正南 / 正西用负数。
 */
export function offsetGeo(
  origin: GeoPoint,
  eastMeters: number,
  northMeters: number
): GeoPoint {
  const latRadians = (origin.latitude * Math.PI) / 180;
  const deltaLat = (northMeters / EARTH_RADIUS_METERS) * (180 / Math.PI);
  const deltaLng =
    (eastMeters / (EARTH_RADIUS_METERS * Math.cos(latRadians))) * (180 / Math.PI);

  return {
    longitude: round6(origin.longitude + deltaLng),
    latitude: round6(origin.latitude + deltaLat)
  };
}

/** 两点间球面距离（米），用于路线长度与「最近点位」计算 */
export function distanceMeters(a: GeoPoint, b: GeoPoint): number {
  const lat1 = (a.latitude * Math.PI) / 180;
  const lat2 = (b.latitude * Math.PI) / 180;
  const deltaLat = lat2 - lat1;
  const deltaLng = ((b.longitude - a.longitude) * Math.PI) / 180;

  const h =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) ** 2;

  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.sqrt(h));
}

/** 折线总长度（米） */
export function polylineLengthMeters(path: GeoPoint[]): number {
  let total = 0;

  for (let i = 1; i < path.length; i += 1) {
    total += distanceMeters(path[i - 1], path[i]);
  }

  return Math.round(total);
}

export function isFiniteGeo(point: GeoPoint): boolean {
  return (
    Number.isFinite(point.longitude) &&
    Number.isFinite(point.latitude) &&
    point.longitude >= -180 &&
    point.longitude <= 180 &&
    point.latitude >= -90 &&
    point.latitude <= 90
  );
}
