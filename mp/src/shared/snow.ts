/**
 * 小程序侧只读数据契约（design 10.1）。
 *
 * 这里是 `/api/snow/bootstrap` 响应的**子集**，按「构建期复制只读契约」的方式
 * 维护：小程序不得 import `server/`、Next.js 或任何 Node 内置模块，否则会把
 * 后端代码打进小程序包。服务端 `server/snow/types.ts` 是唯一契约源头。
 *
 * 字段名与服务端保持一致；小程序用不到的 geo/model/polyline 不复制进来。
 */

export type EntrySource = "home" | "nfc" | "qr" | "map" | "agent" | "stamp";
export type CoordSystem = "GCJ-02" | "WGS-84" | "UNCONFIRMED";
export type SpotCategory =
  | "ice-art"
  | "snow-play"
  | "lantern"
  | "prayer"
  | "lake"
  | "gate";

export type GeoPoint = { longitude: number; latitude: number };

export type SnowSpot = {
  id: string;
  name: string;
  summary?: string;
  story?: string;
  tags: string[];
  category: SpotCategory;
  isMock: boolean;
  verified?: boolean;
};

export type SnowRoute = {
  id: string;
  title: string;
  audience: "family" | "couple" | "general";
  estimatedMinutes: number;
  spotIds: string[];
};

export type SocialChannels = {
  channelsEnabled: boolean;
  finderUserName?: string;
  douyinAccountName?: string;
};

export type SnowPark = {
  id: string;
  title: string;
  subtitle: string;
  center: GeoPoint;
  coordSystem: CoordSystem;
  extentMeters: [number, number];
  isDemo: boolean;
};

export type SnowBootstrap = {
  version: string;
  park: SnowPark;
  spots: SnowSpot[];
  routes: SnowRoute[];
  social: SocialChannels;
};

/** design 8.3：NFC / 二维码 / URL 带来的点位 ID 必须严格匹配 */
export const SAFE_SPOT_ID = /^[A-Z0-9_-]{1,24}$/;
/** 路线 ID 是预设的小写枚举，不能接受模型或外部传入的任意字符串 */
export const SAFE_ROUTE_ID = /^[a-z0-9_-]{1,24}$/;

export const ENTRY_SOURCES: readonly EntrySource[] = [
  "home",
  "nfc",
  "qr",
  "map",
  "agent",
  "stamp"
];

export function parseSpotId(raw: unknown): string | null {
  return typeof raw === "string" && SAFE_SPOT_ID.test(raw) ? raw : null;
}

export function parseRouteId(raw: unknown): string | null {
  return typeof raw === "string" && SAFE_ROUTE_ID.test(raw) ? raw : null;
}

/** 非法 entry 一律回退 home；entry 只是来源标注，不是可信凭据 */
export function parseEntry(raw: unknown): EntrySource {
  return typeof raw === "string" && ENTRY_SOURCES.includes(raw as EntrySource)
    ? (raw as EntrySource)
    : "home";
}

/**
 * 接口数据的最小运行时校验。
 * 小程序端不能盲信 request 结果（代理返回 HTML、缓存被写坏都会白屏），
 * 这里只校验页面真正会读到的字段，不做完整 schema 复刻。
 */
export function isSnowBootstrap(value: unknown): value is SnowBootstrap {
  if (!value || typeof value !== "object") {
    return false;
  }

  const data = value as Partial<SnowBootstrap>;

  if (
    typeof data.version !== "string" ||
    !data.park ||
    typeof data.park.title !== "string" ||
    !Array.isArray(data.spots) ||
    !Array.isArray(data.routes) ||
    !data.social
  ) {
    return false;
  }

  return data.spots.every(
    (spot) =>
      spot &&
      typeof spot.id === "string" &&
      SAFE_SPOT_ID.test(spot.id) &&
      typeof spot.name === "string" &&
      Array.isArray(spot.tags)
  );
}

/**
 * 离线兜底的 5 个核心点位（design 12.3 的固定演示点）。
 *
 * 只包含 id/name/一句摘要，不含完整故事和坐标；联网后一律以 bootstrap 为准。
 * 目的是让二维码/NFC 入口在弱网或 request 域名未配置时仍能进到正确展品页，
 * 而不是白屏。这里不虚构故事、时长或活动信息。
 */
export const OFFLINE_SPOTS: SnowSpot[] = [
  { id: "CT-CORE-01", name: "青唐冰鼓", summary: "园区核心景观", tags: ["核心"], category: "ice-art", isMock: true, verified: false },
  { id: "CT-PLAY-01", name: "戏雪区域", summary: "冰雪互动区域", tags: ["亲子"], category: "snow-play", isMock: true, verified: true },
  { id: "CT-MARK-01", name: "西宁之心", summary: "雪韵商街景观", tags: ["拍照"], category: "ice-art", isMock: true, verified: true },
  { id: "CT-NEWY-05", name: "雪山营地", summary: "新春年味互动区", tags: ["休息"], category: "snow-play", isMock: true, verified: true },
  { id: "CT-LANT-09", name: "拥抱青唐雪娃", summary: "燃灯区景观", tags: ["打卡"], category: "lantern", isMock: true, verified: true }
];

export const OFFLINE_ROUTES: SnowRoute[] = [
  { id: "classic", title: "经典全线 · 一核三区", audience: "general", estimatedMinutes: 90, spotIds: ["CT-CORE-01", "CT-MARK-01"] },
  { id: "family", title: "亲子慢游 · 少走路多玩雪", audience: "family", estimatedMinutes: 60, spotIds: ["CT-NEWY-05", "CT-CORE-01"] },
  { id: "short", title: "短时精华 · 只看核心", audience: "general", estimatedMinutes: 30, spotIds: ["CT-CORE-01"] }
];
