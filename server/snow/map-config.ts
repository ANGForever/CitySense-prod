/**
 * 高德底图的共享配置（design 5.2 / 5.4）。
 *
 * 服务端下发、客户端 fallback、地图实例三处必须用同一套值，否则会出现
 * 「配置接口说全彩、加载失败时却回退到纸白」这种只在异常路径才暴露的漂移。
 * 这里只放纯常量，不 import 任何运行时依赖，H5 与服务端都能安全引用。
 */

/** 标准全彩底图。UI 浮层仍是 CitySense 纸白卡片，彩色只出现在地图画布 */
export const SNOW_MAP_STYLE = "amap://styles/normal";

/** 区域面 / 道路 / 兴趣点 / 建筑物：全放开才有真实街区层次 */
export const SNOW_MAP_FEATURES = ["bg", "road", "point", "building"] as const;

/** 全彩底图配淡蓝天空；原来纸白时代用的浅青在绿地和米白路上会发灰 */
export const SNOW_MAP_SKY_COLOR = "#d8e8f2";
