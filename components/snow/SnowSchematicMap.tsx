"use client";

/**
 * 园区俯视示意图。
 *
 * 用途有两个：
 * 1. 3D 场景不可用时的降级视图（2D 兜底不算 3D 验收通过，但必须可用）。
 * 2. 作为「设计图 → 数据结构」的校对工具。
 *
 * 视觉沿用 CitySense 的纸白语言：浅底、细线、墨色文字加白色描边光晕，
 * 分类色只用在圆点上，不做大面积填充。
 *
 * 三维已切到标准全彩底图，所以这里把底板从纯纸白挪到极淡的绿灰、
 * 道路改成米白：降级时是「彩色地图变简」，而不是突然跳到一张白纸。
 */

import { useMemo } from "react";
import { STREET_PLAN, planToGeo } from "@/server/snow/layout";
import type { DemoSpot, GeoPoint, SnowBootstrap } from "@/server/snow/types";

const VIEW_W = 900;
const VIEW_H = 900;
// 门楼的名称/角色在锚点下方，留足空间，避免底部胶囊压住最南侧入口。
const PAD = 100;

const PLATE_BG = "#eaf0e5";
const ROAD_LINE = "#faf8ef";
const ROUTE_LINE = "#97a99f";
const INK = "#18211d";
const MUTED = "#657269";
const GATE_FILL = "#c93b2e";

/** 总览只保留分散的关键标注；核心附近的相邻展品用圆点，避免收紧落位后互相遮盖。 */
const KEY_SPOT_IDS = new Set([
  "CT-CORE-01",
  "CT-PLAY-01",
  "CT-NEWY-08",
  "CT-MARK-03",
  "CT-MARK-04",
  "CT-LANT-09"
]);

/**
 * 个别标签的朝向需要手动指定：默认按左右半区自动决定，
 * 但靠近大门标记或画布边缘的点位要翻到另一侧，否则会被压住或裁切。
 */
const LABEL_SIDE: Record<string, "left" | "right"> = {
  "CT-PLAY-01": "right",
  "CT-LANT-09": "left"
};

const METERS_PER_DEG_LAT = 110540;

type Projector = (geo: GeoPoint) => { x: number; y: number };

function buildProjector(data: SnowBootstrap): Projector {
  const { center } = data.park;
  const metersPerDegLng = 111320 * Math.cos((center.latitude * Math.PI) / 180);

  const toMeters = (geo: GeoPoint) => ({
    east: (geo.longitude - center.longitude) * metersPerDegLng,
    north: (geo.latitude - center.latitude) * METERS_PER_DEG_LAT
  });

  const allPoints: GeoPoint[] = [
    ...data.spots.map((spot) => spot.geo),
    ...data.gates.map((gate) => gate.geo),
    ...data.lakes.map((lake) => lake.geo),
    ...data.routes.flatMap((route) => route.polyline)
  ];

  const meters = allPoints.map(toMeters);
  const minEast = Math.min(...meters.map((m) => m.east));
  const maxEast = Math.max(...meters.map((m) => m.east));
  const minNorth = Math.min(...meters.map((m) => m.north));
  const maxNorth = Math.max(...meters.map((m) => m.north));

  const spanEast = Math.max(maxEast - minEast, 1);
  const spanNorth = Math.max(maxNorth - minNorth, 1);
  const scale = Math.min((VIEW_W - PAD * 2) / spanEast, (VIEW_H - PAD * 2) / spanNorth);

  const offsetX = (VIEW_W - spanEast * scale) / 2;
  const offsetY = (VIEW_H - spanNorth * scale) / 2;

  return (geo) => {
    const { east, north } = toMeters(geo);

    return {
      x: offsetX + (east - minEast) * scale,
      // SVG y 轴向下，北向需要翻转
      y: offsetY + (maxNorth - north) * scale
    };
  };
}

export function SnowSchematicMap({
  data,
  onSelectSpot,
  activeSpotId,
  activeRouteId,
  category,
  heightMode = "auto"
}: {
  data: SnowBootstrap;
  onSelectSpot?: (spotId: string) => void;
  activeSpotId?: string;
  activeRouteId?: string;
  category?: string | null;
  /** auto：按宽度撑开（预览页用）；fill：撑满容器并按比例留边（地图页用） */
  heightMode?: "auto" | "fill";
}) {
  const project = useMemo(() => buildProjector(data), [data]);
  const colorOf = (id: DemoSpot["category"]) =>
    data.categories.find((category) => category.id === id)?.color ?? MUTED;

  const labelStyle = {
    fontSize: 18,
    fill: INK,
    stroke: "#ffffff",
    strokeWidth: 5,
    paintOrder: "stroke" as const
  };

  return (
    <svg
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      style={{
        width: "100%",
        height: heightMode === "fill" ? "100%" : "auto",
        display: "block",
        borderRadius: 8,
        maxWidth: "100%",
        maxHeight: "100%"
      }}
      role="img"
      aria-label="青唐冰雪烩园区俯视示意图"
    >
      <rect x="0" y="0" width={VIEW_W} height={VIEW_H} fill={PLATE_BG} />

      {/* 与真实地图落位共用街道骨架：苏木莲路沿湖、汇金路向西、两条商街在陆侧。 */}
      {Object.entries(STREET_PLAN).map(([name, points]) => (
        <polyline key={name}
          points={points.map(point => {
            const { x, y } = project(planToGeo(point));
            return `${x},${y}`;
          }).join(" ")}
          fill="none" stroke={ROAD_LINE}
          strokeWidth={name === "sumulian" ? 38 : name === "huijin" ? 30 : 24}
          strokeLinecap="round" strokeLinejoin="round"
        />
      ))}

      {/* 湖面彩灯区 */}
      {data.lakes.map((lake) => {
        const { x, y } = project(lake.geo);

        return (
          <g key={lake.id}>
            <circle
              cx={x}
              cy={y}
              r="52"
              fill={lake.color}
              fillOpacity="0.14"
              stroke={lake.color}
              strokeWidth="1.5"
              strokeDasharray="5 4"
            />
            <text x={x} y={y - 12} textAnchor="middle" fontSize="19" fontWeight="850" fill={INK}>
              {lake.name}
            </text>
            <text x={x} y={y + 14} textAnchor="middle" fontSize="17" fill={lake.color}>
              《{lake.theme}》
            </text>
          </g>
        );
      })}

      {/* 路线：仅作走向示意 */}
      {data.routes.map((route) => (
        <polyline
          key={route.id}
          points={route.polyline
            .map((point) => {
              const { x, y } = project(point);
              return `${x},${y}`;
            })
            .join(" ")}
          fill="none"
          stroke={route.id === activeRouteId ? "#087f7a" : ROUTE_LINE}
          strokeWidth={route.id === activeRouteId ? 7 : 2}
          strokeOpacity={!activeRouteId || route.id === activeRouteId ? 1 : 0.2}
          strokeDasharray={route.id === activeRouteId ? undefined : "8 7"}
        />
      ))}

      {/* 点位 */}
      {data.spots.filter(spot => !category || spot.category === category).map((spot) => {
        const { x, y } = project(spot.geo);
        const color = colorOf(spot.category);
        const isKey = KEY_SPOT_IDS.has(spot.id);
        const isActive = spot.id === activeSpotId;
        const labelSide = LABEL_SIDE[spot.id] ?? (x < VIEW_W / 2 ? "left" : "right");

        return (
          <g
            key={spot.id}
            onClick={() => onSelectSpot?.(spot.id)}
            style={{ cursor: onSelectSpot ? "pointer" : "default" }}
          >
            <circle
              cx={x}
              cy={y}
              r={isActive ? 14 : isKey ? 10 : 7}
              fill={color}
              stroke={isActive ? INK : "#ffffff"}
              strokeWidth={isActive ? 3 : 1.8}
            />
            {isKey ? (
              <text
                x={labelSide === "left" ? x - 16 : x + 16}
                y={y + 6}
                textAnchor={labelSide === "left" ? "end" : "start"}
                fontWeight={isActive ? "900" : "700"}
                {...labelStyle}
              >
                {spot.name}
              </text>
            ) : null}
          </g>
        );
      })}

      {/* 三大门：压在点位之上，画成门形标记 */}
      {data.gates.map((gate) => {
        const { x, y } = project(gate.geo);

        return (
          <g key={gate.id}>
            <rect
              x={x - 26}
              y={y - 26}
              width="52"
              height="52"
              rx="8"
              fill={GATE_FILL}
              stroke="#ffffff"
              strokeWidth="2"
            />
            <path
              d={`M${x - 13} ${y + 9} L${x - 13} ${y - 9} L${x + 13} ${y - 9} L${x + 13} ${y + 9}`}
              fill="none"
              stroke="#ffffff"
              strokeWidth="3.5"
              strokeLinecap="round"
            />
            <text
              x={x}
              y={y + 52}
              textAnchor="middle"
              fontSize="20"
              fontWeight="850"
              fill={INK}
              stroke="#ffffff"
              strokeWidth="6"
              paintOrder="stroke"
            >
              {gate.name}
            </text>
            <text
              x={x}
              y={y + 74}
              textAnchor="middle"
              fontSize="16"
              fill={MUTED}
              stroke="#ffffff"
              strokeWidth="5"
              paintOrder="stroke"
            >
              {gate.role}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
