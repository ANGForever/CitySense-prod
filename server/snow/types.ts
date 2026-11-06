/**
 * 青唐冰雪节 — 数据契约。
 *
 * 坐标系约定：本文件所有 GeoPoint 均为 GCJ-02（高德、腾讯地图、微信小程序 map 组件
 * 共用同一套火星坐标）。甲方若提供 WGS-84 原始点，必须先经一次偏移转换再写入，
 * 不得对已是 GCJ-02 的坐标重复纠偏。
 *
 * 空间认知来自甲方《总体规则布局》图：
 *   一核 —— 核心景观《青唐冰鼓》，位于苏木莲路与汇金路交叉口
 *   三区 —— 冰雪燃灯娱乐区（苏木莲路）/ 新春年味互动区（汇金路）/ 雪韵商街活力区（青唐花街-青陕内街）
 *   三湖 —— 3 号湖 梦回青唐 / 4 号湖 畅游青唐 / 5 号湖 青唐水韵
 *   三门 —— 福禄迎宾（西）/ 平安纳福（东）/ 福满青唐（南）
 */

export type GeoPoint = {
  longitude: number;
  latitude: number;
};

/** 坐标来源声明。UNCONFIRMED 时界面必须保留校准提示。 */
export type CoordSystem = "GCJ-02" | "WGS-84" | "UNCONFIRMED";

/**
 * 点位分类，直接对应甲方《景观落位图》的五种标签颜色。
 * 这套分类同时是图例、地图配色和 AI 讲解语气的依据。
 */
export type SpotCategory =
  | "ice-art"
  | "snow-play"
  | "lantern"
  | "prayer"
  | "lake"
  | "gate";

export type ZoneId = "core" | "lantern-play" | "newyear" | "snow-market";

export type GateId = "fulu-yingbin" | "pingan-nafu" | "fuman-qingtang";

export type LakeId = "lake-3" | "lake-4" | "lake-5";

/** 进入来源，仅用于分析，不作为安全凭据。 */
export type EntrySource = "home" | "nfc" | "qr" | "map" | "agent" | "stamp";

/** 占位体块尺寸。Demo 阶段用程序化几何，不依赖客户 GLB。 */
export type SpotModel = {
  kind: "ice-block" | "lantern" | "gate" | "installation" | "slope";
  widthMeters: number;
  depthMeters: number;
  heightMeters: number;
};

export type DemoSpot = {
  /** 稳定 ID，形如 CT-CORE-01，一经分配不再复用 */
  id: string;
  name: string;
  /** 落位图上的原始标注。与 name 不一致时以 name 为准，此处用于甲方校对 */
  labelRaw?: string;
  /** 名称是否已由甲方书面确认。false 表示由设计图识读，可能有误 */
  verified: boolean;
  category: SpotCategory;
  zoneId: ZoneId;
  lakeId?: LakeId;
  gateId?: GateId;
  geo: GeoPoint;
  /** 演示数据标记。改为真实点位前必须逐条核对，不得批量去掉 */
  isMock: boolean;
  tags: string[];
  summary?: string;
  story?: string;
  model?: SpotModel;
};

export type ParkZone = {
  id: ZoneId;
  name: string;
  /** 副标题：所在道路 */
  road?: string;
  color: string;
  /** 分区中心，用于地图分区标注 */
  geo: GeoPoint;
  isMock: boolean;
};

export type ParkGate = {
  id: GateId;
  name: string;
  role: "主入口" | "次入口";
  color: string;
  geo: GeoPoint;
  isMock: boolean;
};

export type ParkLake = {
  id: LakeId;
  name: string;
  theme: string;
  color: string;
  geo: GeoPoint;
  isMock: boolean;
};

export type RouteAudience = "family" | "couple" | "general";

export type DemoRoute = {
  id: string;
  title: string;
  audience: RouteAudience;
  tags: string[];
  estimatedMinutes: number;
  entryGateId: GateId;
  exitGateId: GateId;
  /** 顺序即参观顺序，每一项必须存在于 spots */
  spotIds: string[];
  /** 演示折线，沿主轴连接，不代表真实步道 */
  polyline: GeoPoint[];
  isMock: boolean;
};

export type SnowPark = {
  id: "qingtang-ice-snow";
  title: string;
  subtitle: string;
  /** 核心景观《青唐冰鼓》的地理锚点；当前为按设计图估落的 Demo 坐标 */
  center: GeoPoint;
  coordSystem: CoordSystem;
  /** 暂定视野范围（米），不代表已确认的园区边界 */
  extentMeters: [number, number];
  isDemo: true;
};

export type CategoryMeta = {
  id: SpotCategory;
  label: string;
  color: string;
};

export type SocialChannels = {
  channelsEnabled: boolean;
  finderUserName?: string;
  douyinAccountName?: string;
};

/** GET /api/snow/bootstrap 的完整响应 */
export type SnowBootstrap = {
  version: string;
  park: SnowPark;
  zones: ParkZone[];
  gates: ParkGate[];
  lakes: ParkLake[];
  spots: DemoSpot[];
  routes: DemoRoute[];
  categories: CategoryMeta[];
  social: SocialChannels;
};

/** Agent 只能产出这些动作，前端按 bootstrap 白名单校验后执行 */
export type SnowAction =
  | { type: "focus_spot"; spotId: string }
  | { type: "highlight_route"; routeId: string }
  | { type: "reset_view" };

export type SnowCard =
  | {
      type: "spot";
      spotId: string;
      name: string;
      category: SpotCategory;
      summary: string;
    }
  | {
      type: "route";
      routeId: string;
      title: string;
      estimatedMinutes: number;
      spotIds: string[];
    };

export type SnowChatRequest = {
  sessionId: string;
  message: string;
  context?: {
    currentSpotId?: string;
    selectedRouteId?: string;
    entrySource?: EntrySource;
  };
};

export type SnowChatResponse = {
  requestId: string;
  sessionId: string;
  answer: string;
  cards: SnowCard[];
  actions: SnowAction[];
  meta: {
    mode: "agent" | "fallback";
    usedTools: string[];
    isFallback: boolean;
    history: "memory" | "none";
    reason?: "unconfigured" | "timeout" | "upstream" | "tool_error";
  };
};

/** 打卡记录。Demo 阶段用匿名 ID，接入微信登录后写入 openid */
export type StampRecord = {
  spotId: string;
  userId: string;
  collectedAt: string;
};
