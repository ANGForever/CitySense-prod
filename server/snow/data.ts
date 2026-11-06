/**
 * 青唐冰雪节 — 静态演示数据。
 *
 * 空间骨架来自甲方《总体规则布局》图：
 *   苏木莲路 = 沿东侧湖岸南北展开的娱乐主轴
 *   汇金路   = 向西接济湟路的互动轴，尽头为福满青唐大门
 *   青唐花街 / 青陕内街 = 湖岸以西的内街，由 S 广场连接
 *   一核     = 两轴交叉处的核心景观《青唐冰鼓》
 *
 * 点位名称与分类识读自甲方《景观落位图》的五色标签：
 *   蓝 = 冰雪艺术装置 / 绿 = 戏雪娱乐 / 品红 = 彩灯光影 / 红 = 祈福年味 / 橙 = 湖面彩灯
 *
 * 重要限制：
 * 1. 包括 park.center 在内，所有落位均按设计图和底图范围估算（isMock: true），
 *    不是实测经纬度，不得用于冰雕施工或安全疏散。
 * 2. verified: false 表示名称由设计图识读、可能有误，需甲方书面确认。
 * 3. 展品故事为演示文案，描述主题而非声称史实或真实活动时刻。
 */

import { DEMO_CORE, GATE_PLAN, LAKE_PLAN, SPOT_PLAN, planToGeo, routeVia, spotGeo } from "@/server/snow/layout";
import type {
  CategoryMeta,
  DemoRoute,
  DemoSpot,
  GeoPoint,
  ParkGate,
  ParkLake,
  ParkZone,
  SnowBootstrap,
  SnowPark
} from "@/server/snow/types";

export const SNOW_DATA_VERSION = "demo-2026-11-06.layout-2";

/** 冰鼓为设计图估落的核心点，不再把原始园区范围参考直接当冰鼓位置。 */
const ANCHOR: GeoPoint = DEMO_CORE;

export const CATEGORIES: CategoryMeta[] = [
  { id: "ice-art", label: "冰雪艺术", color: "#2F9BEF" },
  { id: "snow-play", label: "戏雪娱乐", color: "#2FC46B" },
  { id: "lantern", label: "彩灯光影", color: "#E0338C" },
  { id: "prayer", label: "祈福年味", color: "#E0392E" },
  { id: "lake", label: "湖面彩灯", color: "#F0A020" },
  { id: "gate", label: "园区大门", color: "#C81E2B" }
];

export const PARK: SnowPark = {
  id: "qingtang-ice-snow",
  // 甲方 2026-11-06 定稿：正式全称 + 主 KV 原句副标。
  // 导航栏/H5 title 等窄空间用短名「青唐冰雪烩」，由各页面自己控制。
  title: "青海·青唐城第三届冰雪烩",
  subtitle: "期待与您携手，点亮西宁最热闹的年",
  center: ANCHOR,
  coordSystem: "UNCONFIRMED",
  extentMeters: [550, 750],
  isDemo: true
};

export const ZONES: ParkZone[] = [
  {
    id: "core",
    name: "核心景观",
    road: "苏木莲路 × 汇金路",
    color: "#E0392E",
    geo: planToGeo([0, 0]),
    isMock: true
  },
  {
    id: "lantern-play",
    name: "冰雪燃灯娱乐区",
    road: "苏木莲路",
    color: "#2FC46B",
    geo: planToGeo([-150, -10]),
    isMock: true
  },
  {
    id: "newyear",
    name: "新春年味互动区",
    road: "汇金路",
    color: "#2F9BEF",
    geo: planToGeo([0, 260]),
    isMock: true
  },
  {
    id: "snow-market",
    name: "雪韵商街活力区",
    road: "青唐花街 · 青陕内街",
    color: "#9A5CE0",
    geo: planToGeo([150, 140]),
    isMock: true
  }
];

export const GATES: ParkGate[] = [
  {
    id: "fulu-yingbin",
    name: "福禄迎宾",
    role: "主入口",
    color: "#C81E2B",
    geo: planToGeo(GATE_PLAN["fulu-yingbin"]),
    isMock: true
  },
  {
    id: "pingan-nafu",
    name: "平安纳福",
    role: "主入口",
    color: "#C81E2B",
    geo: planToGeo(GATE_PLAN["pingan-nafu"]),
    isMock: true
  },
  {
    id: "fuman-qingtang",
    name: "福满青唐",
    role: "次入口",
    color: "#C81E2B",
    geo: planToGeo(GATE_PLAN["fuman-qingtang"]),
    isMock: true
  }
];

export const LAKES: ParkLake[] = [
  {
    id: "lake-3",
    name: "3 号湖",
    theme: "梦回青唐",
    color: "#6C5CE7",
    geo: planToGeo(LAKE_PLAN["lake-3"]),
    isMock: true
  },
  {
    id: "lake-4",
    name: "4 号湖",
    theme: "畅游青唐",
    color: "#E08A12",
    geo: planToGeo(LAKE_PLAN["lake-4"]),
    isMock: true
  },
  {
    id: "lake-5",
    name: "5 号湖",
    theme: "青唐水韵",
    color: "#B44BD8",
    geo: planToGeo(LAKE_PLAN["lake-5"]),
    isMock: true
  }
];

export const SPOTS: DemoSpot[] = [
  {
    id: "CT-CORE-01",
    name: "青唐冰鼓",
    labelRaw: "青海冰鼓 / 青唐冰鼓",
    verified: false,
    category: "ice-art",
    zoneId: "core",
    geo: spotGeo("CT-CORE-01"),
    isMock: true,
    tags: ["核心景观", "打卡必看", "拍照"],
    summary: "全园核心景观，两轴交汇处的大型冰鼓装置，夜晚配合灯光与鼓点。",
    story:
      "冰鼓立在苏木莲路与汇金路的交叉口，是全园唯一的「一核」。鼓身由透冰堆叠成环，内圈留出可供穿行的廊道。白天看冰体的裂纹与气泡，入夜后鼓心点亮，光从冰层里往外透，站在廊道中能听见低频的震动。这是整个园区的视觉锚点，也是最容易迷路时用来找方向的地标。",
    model: { kind: "ice-block", widthMeters: 18, depthMeters: 18, heightMeters: 16 }
  },

  {
    id: "CT-PLAY-01",
    name: "戏雪区域",
    labelRaw: "戏雪区域",
    verified: true,
    category: "snow-play",
    zoneId: "lantern-play",
    geo: spotGeo("CT-PLAY-01"),
    isMock: true,
    tags: ["亲子", "玩雪", "免费"],
    summary: "人工铺雪的开放戏雪场地，适合儿童堆雪、打雪仗。",
    story:
      "苏木莲路沿湖娱乐段整片铺开的人工雪场，雪层压实过，推车和轮椅也能通行。场地不做围合，家长可以在边缘长椅上看着孩子。这里是全园唯一允许自由跑动的大面积雪地，也是「带孩子怎么逛」这类问题的默认起点。",
    model: { kind: "slope", widthMeters: 24, depthMeters: 45, heightMeters: 2 }
  },
  {
    id: "CT-PLAY-02",
    name: "主题滑梯 · 北",
    labelRaw: "主题滑梯",
    verified: false,
    category: "snow-play",
    zoneId: "lantern-play",
    geo: spotGeo("CT-PLAY-02"),
    isMock: true,
    tags: ["亲子", "滑梯"],
    summary: "雪道滑梯，靠近福禄迎宾大门。",
    model: { kind: "slope", widthMeters: 12, depthMeters: 24, heightMeters: 6 }
  },
  {
    id: "CT-PLAY-03",
    name: "主题滑梯 · 南",
    labelRaw: "主题滑梯",
    verified: false,
    category: "snow-play",
    zoneId: "lantern-play",
    geo: spotGeo("CT-PLAY-03"),
    isMock: true,
    tags: ["亲子", "滑梯"],
    summary: "雪道滑梯，位于沿湖娱乐带南段。",
    model: { kind: "slope", widthMeters: 12, depthMeters: 24, heightMeters: 6 }
  },
  {
    id: "CT-PLAY-04",
    name: "趣游雪谷 · 一",
    labelRaw: "趣游雪谷",
    verified: false,
    category: "snow-play",
    zoneId: "lantern-play",
    geo: spotGeo("CT-PLAY-04"),
    isMock: true,
    tags: ["休息", "观景"],
    summary: "主路旁的休息平台，可俯瞰戏雪区。",
    model: { kind: "installation", widthMeters: 10, depthMeters: 8, heightMeters: 3 }
  },
  {
    id: "CT-PLAY-05",
    name: "趣游雪谷 · 二",
    labelRaw: "趣游雪谷",
    verified: false,
    category: "snow-play",
    zoneId: "lantern-play",
    geo: spotGeo("CT-PLAY-05"),
    isMock: true,
    tags: ["休息", "观景"],
    summary: "主路旁的休息平台，靠滑梯一侧。",
    model: { kind: "installation", widthMeters: 10, depthMeters: 8, heightMeters: 3 }
  },
  {
    id: "CT-PLAY-06",
    name: "趣游雪谷 · 三",
    labelRaw: "趣游雪谷",
    verified: false,
    category: "snow-play",
    zoneId: "lantern-play",
    geo: spotGeo("CT-PLAY-06"),
    isMock: true,
    tags: ["休息", "观景"],
    summary: "主路东段的休息平台，靠近核心景观。",
    model: { kind: "installation", widthMeters: 10, depthMeters: 8, heightMeters: 3 }
  },

  {
    id: "CT-NEWY-01",
    name: "爱的篇章",
    labelRaw: "爱的篇章",
    verified: true,
    category: "ice-art",
    zoneId: "snow-market",
    geo: spotGeo("CT-NEWY-01"),
    isMock: true,
    tags: ["冰雕", "拍照"],
    summary: "以文字与书页为造型的冰雕组。",
    model: { kind: "ice-block", widthMeters: 8, depthMeters: 4, heightMeters: 6 }
  },
  {
    id: "CT-NEWY-02",
    name: "快乐的人",
    labelRaw: "快乐的人",
    verified: true,
    category: "ice-art",
    zoneId: "snow-market",
    geo: spotGeo("CT-NEWY-02"),
    isMock: true,
    tags: ["冰雕", "亲子"],
    summary: "人物造型冰雕群，适合合影。",
    model: { kind: "ice-block", widthMeters: 9, depthMeters: 5, heightMeters: 5 }
  },
  {
    id: "CT-NEWY-03",
    name: "温度计",
    labelRaw: "温度计",
    verified: true,
    category: "ice-art",
    zoneId: "snow-market",
    geo: spotGeo("CT-NEWY-03"),
    isMock: true,
    tags: ["装置", "互动"],
    summary: "巨型温度计装置，显示实时气温。",
    model: { kind: "installation", widthMeters: 3, depthMeters: 3, heightMeters: 12 }
  },
  {
    id: "CT-NEWY-04",
    name: "雪豹摇摇乐",
    labelRaw: "雪豹摇摇乐",
    verified: true,
    category: "snow-play",
    zoneId: "snow-market",
    geo: spotGeo("CT-NEWY-04"),
    isMock: true,
    tags: ["亲子", "游乐"],
    summary: "雪豹造型的摇摇游乐设施。",
    model: { kind: "installation", widthMeters: 4, depthMeters: 3, heightMeters: 2 }
  },
  {
    id: "CT-NEWY-05",
    name: "雪山营地",
    labelRaw: "雪山营地",
    verified: true,
    category: "snow-play",
    zoneId: "snow-market",
    geo: spotGeo("CT-NEWY-05"),
    isMock: true,
    tags: ["休息", "热饮", "亲子"],
    summary: "帐篷营地式的休息区，可避风取暖。",
    story:
      "青陕内街靠近娱乐带的帐篷休息区，几顶营地帐围成半圈，中间留出火塘式的取暖位。这里不卖票、不排队，是园区里最适合「停下来」的地方——孩子跑累了、老人走不动了、手机冻到自动关机，都可以在这里缓一缓。带孩子逛的话，把它当行程中点的休息站最合适。",
    model: { kind: "installation", widthMeters: 30, depthMeters: 20, heightMeters: 4 }
  },
  {
    id: "CT-NEWY-06",
    name: "八骏踏浪",
    labelRaw: "八骏踏浪",
    verified: true,
    category: "ice-art",
    zoneId: "newyear",
    geo: spotGeo("CT-NEWY-06"),
    isMock: true,
    tags: ["冰雕", "打卡必看"],
    summary: "八匹骏马踏浪造型的大型冰雕组。",
    model: { kind: "ice-block", widthMeters: 16, depthMeters: 6, heightMeters: 7 }
  },
  {
    id: "CT-NEWY-07",
    name: "“钱”程似锦",
    labelRaw: "“钱”程似锦",
    verified: false,
    category: "ice-art",
    zoneId: "newyear",
    geo: spotGeo("CT-NEWY-07"),
    isMock: true,
    tags: ["冰雕", "祈福"],
    summary: "谐音主题冰雕，寓意前程。",
    model: { kind: "ice-block", widthMeters: 10, depthMeters: 5, heightMeters: 6 }
  },
  {
    id: "CT-NEWY-08",
    name: "许愿瓶",
    labelRaw: "许愿瓶",
    verified: true,
    category: "prayer",
    zoneId: "snow-market",
    geo: spotGeo("CT-NEWY-08"),
    isMock: true,
    tags: ["祈福", "互动", "亲子"],
    summary: "可投递心愿卡的许愿装置。",
    story:
      "一只放大的透明瓶体，瓶口留出投递口。园区准备了纸质心愿卡，写完折好投进去，灯从瓶底往上打，卡片会像雪片一样悬在瓶里。这是全园互动性最强的一处祈福点，孩子写得慢，但往往写得最认真。没有电子流程，也不需要扫码，投完就走。",
    model: { kind: "installation", widthMeters: 5, depthMeters: 5, heightMeters: 7 }
  },
  {
    id: "CT-NEWY-09",
    name: "有福「豹」",
    labelRaw: "有福“豹”",
    verified: false,
    category: "prayer",
    zoneId: "snow-market",
    geo: spotGeo("CT-NEWY-09"),
    isMock: true,
    tags: ["祈福", "拍照", "吉祥物"],
    summary: "雪豹主题的祈福打卡点。",
    model: { kind: "installation", widthMeters: 6, depthMeters: 4, heightMeters: 4 }
  },
  {
    id: "CT-NEWY-10",
    name: "瑞霭贺岁",
    labelRaw: "瑞霭贺岁",
    verified: false,
    category: "prayer",
    zoneId: "snow-market",
    geo: spotGeo("CT-NEWY-10"),
    isMock: true,
    tags: ["祈福", "拍照"],
    summary: "贺岁主题灯光门廊。",
    model: { kind: "installation", widthMeters: 8, depthMeters: 3, heightMeters: 5 }
  },

  {
    id: "CT-MARK-01",
    name: "西宁之心",
    labelRaw: "西宁之心",
    verified: true,
    category: "ice-art",
    zoneId: "newyear",
    geo: spotGeo("CT-MARK-01"),
    isMock: true,
    tags: ["打卡必看", "冰雕", "拍照"],
    summary: "汇金路靠近冰鼓一端的爱心造型冰雕，园区的第二个视觉焦点。",
    story:
      "汇金路靠近核心景观的一端，一颗切开又合上的冰心。外壁磨得很薄，白天透出淡淡的蓝，夜里从内部打暖光，整颗心是橙红色的——这是全园最容易被拍下来的一张照片。冰心前面留了两个人的站位凹槽，设计上就是给合影用的。从核心景观走过来大约两分钟。",
    model: { kind: "ice-block", widthMeters: 9, depthMeters: 6, heightMeters: 8 }
  },
  {
    id: "CT-MARK-02",
    name: "冰钢琴",
    labelRaw: "冰钢琴",
    verified: true,
    category: "ice-art",
    zoneId: "newyear",
    geo: spotGeo("CT-MARK-02"),
    isMock: true,
    tags: ["互动", "冰雕", "亲子"],
    summary: "可实际弹奏的冰制键盘装置。",
    story:
      "琴键是真的能按下去的。冰体内部埋了感应条，手指落键会触发音箱，声音比真钢琴闷一点，像裹了一层棉。孩子通常会在前面站很久，家长可以在旁边的长椅上等。天太冷的时候琴键会变涩，园区会定时处理。",
    model: { kind: "installation", widthMeters: 6, depthMeters: 3, heightMeters: 4 }
  },
  {
    id: "CT-MARK-03",
    name: "非遗社火",
    labelRaw: "非遗社火",
    verified: true,
    category: "ice-art",
    zoneId: "snow-market",
    geo: spotGeo("CT-MARK-03"),
    isMock: true,
    tags: ["非遗", "文化", "拍照"],
    summary: "非遗题材冰雕，取材自本地传统纹样与器物。",
    story:
      "这组冰雕把本地的传统纹样刻进了冰体内部——不是表面浮雕，是分层浇筑时把纹样夹在冰层之间，所以从不同角度看，纹路会随光线的折射深浅变化。题材取自地方非遗的器物与图样，是雪韵商街里最「安静」的一处，适合慢慢看。",
    model: { kind: "ice-block", widthMeters: 12, depthMeters: 6, heightMeters: 7 }
  },
  {
    id: "CT-MARK-04",
    name: "神兽家园",
    labelRaw: "神兽家园",
    verified: true,
    category: "ice-art",
    zoneId: "snow-market",
    geo: spotGeo("CT-MARK-04"),
    isMock: true,
    tags: ["亲子", "冰雕", "IP"],
    summary: "一组神兽造型冰雕，儿童动线重点。",
    story:
      "四只神兽围成一圈，个头都不高，最高的那只也就到成年人腰线——尺寸是按孩子的视线高度定的。每只神兽脚下有一块小牌子讲它的来历。这是雪韵商街里孩子停留时间最长的一处，也是「带孩子怎么逛」路线上的固定一站。",
    model: { kind: "ice-block", widthMeters: 14, depthMeters: 10, heightMeters: 3 }
  },
  {
    id: "CT-MARK-05",
    name: "薅羊毛",
    labelRaw: "薅羊毛",
    verified: true,
    category: "snow-play",
    zoneId: "newyear",
    geo: spotGeo("CT-MARK-05"),
    isMock: true,
    tags: ["互动", "亲子", "游戏"],
    summary: "敲击类互动小游戏点位。",
    model: { kind: "installation", widthMeters: 5, depthMeters: 5, heightMeters: 3 }
  },
  {
    id: "CT-MARK-06",
    name: "三羊开泰",
    labelRaw: "三羊开泰",
    verified: true,
    category: "ice-art",
    zoneId: "newyear",
    geo: spotGeo("CT-MARK-06"),
    isMock: true,
    tags: ["冰雕", "祈福", "拍照"],
    summary: "三只羊造型的贺岁冰雕。",
    story:
      "三只羊，一大两小，朝向园区东侧。取「三阳开泰」的谐音，是春节档最应景的一组。冰体里封了干花，光打进去的时候能看到花影，远看是白，近看有颜色。这一组通常是全家福的取景点。",
    model: { kind: "ice-block", widthMeters: 11, depthMeters: 7, heightMeters: 6 }
  },
  {
    id: "CT-MARK-07",
    name: "年年有余",
    labelRaw: "年年有余",
    verified: true,
    category: "ice-art",
    zoneId: "newyear",
    geo: spotGeo("CT-MARK-07"),
    isMock: true,
    tags: ["冰雕", "祈福"],
    summary: "鱼形主题冰雕，汇金路福满青唐入口附近。",
    model: { kind: "ice-block", widthMeters: 10, depthMeters: 5, heightMeters: 5 }
  },

  {
    id: "CT-LANT-01",
    name: "桥体亮化",
    labelRaw: "桥体亮化",
    verified: false,
    category: "lantern",
    zoneId: "lantern-play",
    geo: spotGeo("CT-LANT-01"),
    isMock: true,
    tags: ["彩灯", "拍照"],
    summary: "北侧跨湖桥附近的亮化节点。",
    model: { kind: "lantern", widthMeters: 8, depthMeters: 8, heightMeters: 6 }
  },
  {
    id: "CT-LANT-02",
    name: "丁香入梦",
    labelRaw: "丁香入梦",
    verified: false,
    category: "lantern",
    zoneId: "lantern-play",
    lakeId: "lake-3",
    geo: spotGeo("CT-LANT-02"),
    isMock: true,
    tags: ["彩灯", "拍照"],
    summary: "3 号湖岸的彩灯廊道。",
    model: { kind: "lantern", widthMeters: 10, depthMeters: 6, heightMeters: 5 }
  },
  {
    id: "CT-LANT-03",
    name: "海上升明月",
    labelRaw: "海上升明月",
    verified: false,
    category: "lantern",
    zoneId: "lantern-play",
    lakeId: "lake-3",
    geo: spotGeo("CT-LANT-03"),
    isMock: true,
    tags: ["彩灯", "夜景", "拍照"],
    summary: "月亮主题灯组，位于北侧 3 号湖区域。",
    model: { kind: "lantern", widthMeters: 7, depthMeters: 7, heightMeters: 8 }
  },
  {
    id: "CT-LANT-04",
    name: "翼博梵宇",
    labelRaw: "翼博梵宇",
    verified: false,
    category: "lantern",
    zoneId: "lantern-play",
    lakeId: "lake-4",
    geo: spotGeo("CT-LANT-04"),
    isMock: true,
    tags: ["彩灯", "建筑"],
    summary: "仿古建筑轮廓的大型灯组。",
    model: { kind: "lantern", widthMeters: 16, depthMeters: 8, heightMeters: 10 }
  },
  {
    id: "CT-LANT-05",
    name: "蝶舞星河",
    labelRaw: "蝶舞星河",
    verified: false,
    category: "lantern",
    zoneId: "lantern-play",
    lakeId: "lake-4",
    geo: spotGeo("CT-LANT-05"),
    isMock: true,
    tags: ["彩灯", "运动"],
    summary: "运动主题灯组，靠近 4 号湖。",
    model: { kind: "lantern", widthMeters: 9, depthMeters: 6, heightMeters: 5 }
  },
  {
    id: "CT-LANT-06",
    name: "鹏程万里 · 北",
    labelRaw: "鹏程万里",
    verified: false,
    category: "lantern",
    zoneId: "lantern-play",
    lakeId: "lake-4",
    geo: spotGeo("CT-LANT-06"),
    isMock: true,
    tags: ["彩灯", "祈福"],
    summary: "鹏鸟造型灯组，靠近 4 号湖东岸。",
    model: { kind: "lantern", widthMeters: 12, depthMeters: 6, heightMeters: 7 }
  },
  {
    id: "CT-LANT-07",
    name: "鹏程万里 · 东",
    labelRaw: "鹏程万里",
    verified: false,
    category: "lantern",
    zoneId: "lantern-play",
    lakeId: "lake-5",
    geo: spotGeo("CT-LANT-07"),
    isMock: true,
    tags: ["彩灯", "祈福"],
    summary: "鹏鸟造型灯组，位于通往 5 号湖的路口。",
    model: { kind: "lantern", widthMeters: 12, depthMeters: 6, heightMeters: 7 }
  },
  {
    id: "CT-LANT-08",
    name: "青唐圣境",
    labelRaw: "青唐圣境",
    verified: false,
    category: "lantern",
    zoneId: "lantern-play",
    lakeId: "lake-5",
    geo: spotGeo("CT-LANT-08"),
    isMock: true,
    tags: ["彩灯", "夜景"],
    summary: "南侧 5 号湖附近的大型灯组。",
    model: { kind: "lantern", widthMeters: 14, depthMeters: 8, heightMeters: 8 }
  },
  {
    id: "CT-LANT-09",
    name: "拥抱青唐雪娃",
    labelRaw: "拥抱青唐雪娃",
    verified: true,
    category: "lantern",
    zoneId: "lantern-play",
    gateId: "fulu-yingbin",
    geo: spotGeo("CT-LANT-09"),
    isMock: true,
    tags: ["IP", "吉祥物", "亲子", "拍照"],
    summary: "园区吉祥物雪娃的大型灯组，靠近福禄迎宾大门。",
    story:
      "雪娃是全园的吉祥物，这尊是最大的一个，张开手臂做拥抱的姿势，底座留了可以钻进去的空档。它守在福禄迎宾大门内侧，是这个门进园后第一眼看到的东西，也是离园前最后一个合影点。夜里雪娃通体发暖白光，在雪地上会映出很长的影子。",
    model: { kind: "lantern", widthMeters: 10, depthMeters: 8, heightMeters: 9 }
  },
  {
    id: "CT-AXIS-01", name: "魔镜", labelRaw: "魔镜", verified: false,
    category: "ice-art", zoneId: "newyear", geo: spotGeo("CT-AXIS-01"), isMock: true,
    tags: ["设计图标注", "拍照"], summary: "互动镜面装置，位于汇金路入口段。",
    model: { kind: "installation", widthMeters: 6, depthMeters: 3, heightMeters: 4 }
  },
  {
    id: "CT-AXIS-02", name: "丁香迎宾", labelRaw: "丁香迎宾", verified: false,
    category: "ice-art", zoneId: "newyear", geo: spotGeo("CT-AXIS-02"), isMock: true,
    tags: ["设计图标注", "拍照"], summary: "汇金路靠近冰鼓一端的迎宾景观。",
    model: { kind: "installation", widthMeters: 6, depthMeters: 3, heightMeters: 4 }
  },
  {
    id: "CT-AXIS-03", name: "丁香献瑞", labelRaw: "丁香献瑞", verified: false,
    category: "ice-art", zoneId: "newyear", geo: spotGeo("CT-AXIS-03"), isMock: true,
    tags: ["设计图标注", "拍照"], summary: "汇金路中段的沿街景观。",
    model: { kind: "installation", widthMeters: 6, depthMeters: 3, heightMeters: 4 }
  },
  {
    id: "CT-AXIS-04", name: "人形打卡墙", labelRaw: "人形打卡墙", verified: false,
    category: "ice-art", zoneId: "newyear", geo: spotGeo("CT-AXIS-04"), isMock: true,
    tags: ["设计图标注", "拍照"], summary: "汇金路中段的拍照打卡墙。",
    model: { kind: "installation", widthMeters: 6, depthMeters: 3, heightMeters: 4 }
  },
  {
    id: "CT-STREET-01", name: "冰山告白", labelRaw: "冰山告白", verified: false,
    category: "ice-art", zoneId: "snow-market", geo: spotGeo("CT-STREET-01"), isMock: true,
    tags: ["设计图标注", "拍照"], summary: "青陕内街入口附近的冰雕景观。",
    model: { kind: "installation", widthMeters: 6, depthMeters: 3, heightMeters: 4 }
  },
  {
    id: "CT-STREET-02", name: "非遗香包", labelRaw: "非遗香包", verified: false,
    category: "ice-art", zoneId: "snow-market", geo: spotGeo("CT-STREET-02"), isMock: true,
    tags: ["设计图标注", "拍照"], summary: "青唐花街沿途的非遗主题景观。",
    model: { kind: "installation", widthMeters: 6, depthMeters: 3, heightMeters: 4 }
  },
  {
    id: "CT-STREET-03", name: "冰幕投影", labelRaw: "冰幕投影", verified: false,
    category: "ice-art", zoneId: "snow-market", geo: spotGeo("CT-STREET-03"), isMock: true,
    tags: ["设计图标注", "拍照"], summary: "青唐花街端部的冰幕投影节点。",
    model: { kind: "installation", widthMeters: 6, depthMeters: 3, heightMeters: 4 }
  }

];

export const ROUTES: DemoRoute[] = [
  {
    id: "classic", title: "经典全线 · 一核三区", audience: "general",
    tags: ["首次到访", "全景", "拍照"], estimatedMinutes: 90,
    entryGateId: "fulu-yingbin", exitGateId: "pingan-nafu",
    spotIds: ["CT-LANT-09", "CT-PLAY-01", "CT-CORE-01", "CT-MARK-01", "CT-MARK-02", "CT-MARK-06", "CT-MARK-04", "CT-MARK-03", "CT-NEWY-08", "CT-STREET-03"],
    polyline: routeVia([
      { point: GATE_PLAN["fulu-yingbin"], streetToNext: "sumulian" },
      { point: SPOT_PLAN["CT-LANT-09"], streetToNext: "sumulian" },
      { point: SPOT_PLAN["CT-PLAY-01"], streetToNext: "sumulian" },
      { point: SPOT_PLAN["CT-CORE-01"], streetToNext: "huijin" },
      { point: SPOT_PLAN["CT-MARK-01"] }, { point: SPOT_PLAN["CT-MARK-02"], streetToNext: "huijin" },
      { point: SPOT_PLAN["CT-MARK-06"], streetToNext: "huijin" },
      { point: [0, 90] }, { point: SPOT_PLAN["CT-MARK-04"], streetToNext: "qingtang" },
      { point: SPOT_PLAN["CT-MARK-03"], streetToNext: "qingtang" },
      { point: SPOT_PLAN["CT-NEWY-08"], streetToNext: "qingtang" },
      { point: SPOT_PLAN["CT-STREET-03"] }, { point: GATE_PLAN["pingan-nafu"] }
    ]), isMock: true
  },
  {
    id: "family", title: "亲子慢游 · 少走路多玩雪", audience: "family",
    tags: ["亲子", "少步行", "有休息点"], estimatedMinutes: 60,
    entryGateId: "fuman-qingtang", exitGateId: "fulu-yingbin",
    spotIds: ["CT-AXIS-01", "CT-MARK-05", "CT-CORE-01", "CT-NEWY-04", "CT-NEWY-05", "CT-PLAY-01", "CT-PLAY-02"],
    polyline: routeVia([
      { point: GATE_PLAN["fuman-qingtang"], streetToNext: "huijin" },
      { point: SPOT_PLAN["CT-AXIS-01"], streetToNext: "huijin" },
      { point: SPOT_PLAN["CT-MARK-05"], streetToNext: "huijin" },
      { point: SPOT_PLAN["CT-CORE-01"] }, { point: [0, 75], streetToNext: "qingshan" },
      { point: SPOT_PLAN["CT-NEWY-04"], streetToNext: "qingshan" },
      { point: SPOT_PLAN["CT-NEWY-05"] }, { point: [-340, 0], streetToNext: "sumulian" },
      { point: SPOT_PLAN["CT-PLAY-01"], streetToNext: "sumulian" },
      { point: SPOT_PLAN["CT-PLAY-02"], streetToNext: "sumulian" },
      { point: GATE_PLAN["fulu-yingbin"] }
    ]), isMock: true
  },
  {
    id: "short", title: "短时精华 · 只看核心", audience: "general",
    tags: ["时间紧", "核心景观", "30 分钟"], estimatedMinutes: 30,
    entryGateId: "fulu-yingbin", exitGateId: "pingan-nafu",
    spotIds: ["CT-CORE-01", "CT-MARK-01", "CT-MARK-02"],
    polyline: routeVia([
      { point: GATE_PLAN["fulu-yingbin"], streetToNext: "sumulian" },
      { point: SPOT_PLAN["CT-CORE-01"], streetToNext: "huijin" },
      { point: SPOT_PLAN["CT-MARK-01"] }, { point: SPOT_PLAN["CT-MARK-02"], streetToNext: "huijin" },
      { point: [0, 0], streetToNext: "sumulian" }, { point: GATE_PLAN["pingan-nafu"] }
    ]), isMock: true
  }
];

/**
 * 官方媒体账号（design 10.2 的 CHANNELS_FINDER_USER_NAME）。
 *
 * 只放可公开的账号标识，不放任何凭据。channelsEnabled 必须由「账号已提供 +
 * 主体关联已核对」共同决定，所以由显式环境变量驱动，不能因为填了名字就自动
 * 宣称 G4 通过 —— 真机跳转结果仍需在门禁表里单独记录。
 */
const FINDER_USER_NAME = process.env.CHANNELS_FINDER_USER_NAME?.trim() ?? "";
const DOUYIN_ACCOUNT_NAME = process.env.DOUYIN_ACCOUNT_NAME?.trim() ?? "";

export const SOCIAL: SnowBootstrap["social"] = {
  channelsEnabled: Boolean(FINDER_USER_NAME),
  ...(FINDER_USER_NAME ? { finderUserName: FINDER_USER_NAME } : {}),
  douyinAccountName: DOUYIN_ACCOUNT_NAME
};

/**
 * 名称尚未由甲方确认的点位。用于生成校对清单，也让界面能标注「待校对」。
 * 确认后把 verified 改为 true 并保留 labelRaw 作为溯源。
 */
export const UNVERIFIED_SPOT_IDS: string[] = SPOTS.filter((spot) => !spot.verified).map(
  (spot) => spot.id
);

export function buildBootstrap(): SnowBootstrap {
  return {
    version: SNOW_DATA_VERSION,
    park: PARK,
    zones: ZONES,
    gates: GATES,
    lakes: LAKES,
    spots: SPOTS,
    routes: ROUTES,
    categories: CATEGORIES,
    social: SOCIAL
  };
}
