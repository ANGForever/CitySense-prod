/**
 * 2026-11-06 设计图区域级落位。总规划图北箭头朝左，不是上北下南。
 * plan 坐标取总图相对冰鼓的像素方向：right 向图右（南），down 向图下（西）。
 * 以用户红框（玉泉街以南、纬二路以北、济湟路与北川河之间）收紧落位。
 * 横向尺度按两段湖岸估计，纵向按汇金路至济湟路估计；不作测绘坐标使用。
 * 透视详图只确定沿街顺序，不直接把屏幕左右当作东西方向。
 */
import { offsetGeo } from "@/server/snow/geo";
import type { GeoPoint } from "@/server/snow/types";

export type PlanPoint = readonly [right: number, down: number];

/** 保留客户最初给的范围参考；它不是冰鼓的实测位置。 */
export const SITE_REFERENCE: GeoPoint = {
  longitude: 101.76493373404837, latitude: 36.694585528034665
};

/** 对照当前高德底图湖岸主路与横向路口估落，仍为 Demo 坐标。 */
export const DEMO_CORE: GeoPoint = { longitude: 101.765344, latitude: 36.694505 };

export function planToGeo([right, down]: PlanPoint): GeoPoint {
  const east = right * (right < 0 ? -0.08 : 0.057) - down * 0.58;
  const north = -right * (right < 0 ? 0.557 : 0.574);
  return offsetGeo(DEMO_CORE, east, north);
}

export const GATE_PLAN = {
  "fulu-yingbin": [-406, 0],
  "pingan-nafu": [673, 60],
  "fuman-qingtang": [0, 460]
} as const satisfies Record<string, PlanPoint>;

export const LAKE_PLAN = {
  "lake-3": [-260, -190],
  "lake-4": [-40, -200],
  "lake-5": [380, -170]
} as const satisfies Record<string, PlanPoint>;

export const SPOT_PLAN = {
  "CT-CORE-01": [0, 0],
  // 苏木莲路湖岸娱乐带：体块靠步道，不再跨进西侧商场。
  "CT-PLAY-01": [-235, -18],
  "CT-PLAY-02": [-350, -12],
  "CT-PLAY-03": [210, 40],
  "CT-PLAY-04": [-382, -15],
  "CT-PLAY-05": [-135, -12],
  "CT-PLAY-06": [390, 50],
  // 青陕内街：由入口到核心方向排列；旧 ID 保留，跨端入口不变。
  "CT-NEWY-01": [-100, 73],
  "CT-NEWY-02": [-205, 80],
  "CT-NEWY-03": [-25, 87],
  "CT-NEWY-04": [-290, 65],
  "CT-NEWY-05": [-340, 95],
  "CT-NEWY-06": [22, 180],
  "CT-NEWY-07": [-18, 290],
  // 青唐花街：沿南侧内街，全部落在湖岸以西。
  "CT-NEWY-08": [350, 135],
  "CT-NEWY-09": [240, 155],
  "CT-NEWY-10": [445, 160],
  "CT-MARK-01": [12, 88],
  "CT-MARK-02": [-18, 110],
  "CT-MARK-03": [150, 130],
  "CT-MARK-04": [90, 150],
  "CT-MARK-05": [18, 215],
  "CT-MARK-06": [-18, 355],
  "CT-MARK-07": [0, 432],
  // 只有湖灯位于水域；其余装置在湖岸/内街。
  "CT-LANT-01": [-400, -150],
  "CT-LANT-02": [-320, -150],
  "CT-LANT-03": [-365, -180],
  "CT-LANT-04": [-170, -180],
  "CT-LANT-05": [15, -190],
  "CT-LANT-06": [145, -160],
  "CT-LANT-07": [510, -150],
  "CT-LANT-08": [350, -175],
  "CT-LANT-09": [-380, 20],
  // 详图中清晰可辨、原清单遗漏的沿街标注。
  "CT-AXIS-01": [0, 405], // 魔镜
  "CT-AXIS-02": [-18, 30], // 丁香迎宾
  "CT-AXIS-03": [18, 130], // 丁香献瑞
  "CT-AXIS-04": [-18, 245], // 人形打卡墙
  "CT-STREET-01": [-355, 80], // 冰山告白
  "CT-STREET-02": [555, 145], // 非遗香包
  "CT-STREET-03": [625, 155] // 冰幕投影
} as const satisfies Record<string, PlanPoint>;

export type LayoutSpotId = keyof typeof SPOT_PLAN;
export function spotGeo(id: LayoutSpotId): GeoPoint {
  return planToGeo(SPOT_PLAN[id]);
}

/** 示意图和路线共用的街道骨架，不再各自维护一套方向。 */
export const STREET_PLAN = {
  sumulian: [GATE_PLAN["fulu-yingbin"], [-240, -15], [0, 0], [210, 35], [450, 50], GATE_PLAN["pingan-nafu"]],
  huijin: [[0, 0], [0, 110], [0, 270], GATE_PLAN["fuman-qingtang"]],
  qingshan: [[-406, 75], [-240, 72], [-100, 73], [0, 90]],
  qingtang: [[0, 90], [90, 135], [350, 145], [640, 150]]
} as const satisfies Record<string, readonly PlanPoint[]>;

/** 同一条街上的两个位置，经过骨架转折；不会用直线横切商场或湖面。 */
export function alongStreet(name: keyof typeof STREET_PLAN, from: PlanPoint, to: PlanPoint): PlanPoint[] {
  const axis = name === "huijin" ? 1 : 0;
  const low = Math.min(from[axis], to[axis]);
  const high = Math.max(from[axis], to[axis]);
  const middle = STREET_PLAN[name].filter(p => p[axis] > low && p[axis] < high);
  if (from[axis] > to[axis]) middle.reverse();
  return [from, ...middle, to];
}

type RouteStop = { point: PlanPoint; streetToNext?: keyof typeof STREET_PLAN };
export function routeVia(stops: RouteStop[]): GeoPoint[] {
  const path: PlanPoint[] = [];
  stops.forEach((stop, i) => {
    const next = stops[i + 1];
    path.push(stop.point);
    if (next && stop.streetToNext) {
      path.push(...alongStreet(stop.streetToNext, stop.point, next.point).slice(1, -1));
    }
  });
  return path.map(planToGeo);
}
