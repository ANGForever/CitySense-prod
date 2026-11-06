import Taro from "@tarojs/taro";
import { API_BASE, isApiConfigured } from "./config";
import {
  isSnowBootstrap,
  OFFLINE_ROUTES,
  OFFLINE_SPOTS,
  type SnowBootstrap
} from "../shared/snow";

/**
 * 原生页与 H5 复用同一份 /api/snow/bootstrap 数据（design 6.3 / T-204）。
 *
 * 三级降级：网络 → 本地缓存 → 打包的最小离线清单。任何一级都不能让页面白屏，
 * 但只有 network 数据算「完整资料」；页面会把 source 显示出来，不把离线内容
 * 冒充成已同步的园区数据。
 */

const CACHE_KEY = "snow:bootstrap:v1";
const REQUEST_TIMEOUT_MS = 8000;

export type LoadSource = "network" | "cache" | "offline";
export type LoadResult = { data: SnowBootstrap; source: LoadSource };

const OFFLINE_BOOTSTRAP: SnowBootstrap = {
  version: "offline-fallback",
  park: {
    id: "qingtang-ice-snow",
    title: "青唐冰雪节",
    subtitle: "丝路明珠 · 冰雪青唐",
    // 与 H5 layout.ts 的 Demo 核心点对齐，非实测；完整数据以网络 bootstrap 为准
    center: {
      longitude: 101.765344,
      latitude: 36.694505
    },
    coordSystem: "UNCONFIRMED",
    extentMeters: [550, 750],
    isDemo: true
  },
  spots: OFFLINE_SPOTS,
  routes: OFFLINE_ROUTES,
  social: { channelsEnabled: false, douyinAccountName: "" }
};

function readCache(): SnowBootstrap | null {
  try {
    const cached: unknown = Taro.getStorageSync(CACHE_KEY);

    return isSnowBootstrap(cached) ? cached : null;
  } catch {
    return null;
  }
}

function writeCache(data: SnowBootstrap): void {
  try {
    Taro.setStorageSync(CACHE_KEY, data);
  } catch {
    // 存储写满或权限异常不应该阻塞页面渲染
  }
}

export async function loadBootstrap(): Promise<LoadResult> {
  const cached = readCache();

  if (isApiConfigured) {
    try {
      const response = await Taro.request({
        url: `${API_BASE}/api/snow/bootstrap`,
        method: "GET",
        timeout: REQUEST_TIMEOUT_MS,
        header: { Accept: "application/json" }
      });

      if (response.statusCode === 200 && isSnowBootstrap(response.data)) {
        writeCache(response.data);
        return { data: response.data, source: "network" };
      }
    } catch {
      // 域名未加入 request 合法列表、离线、超时都走下面的降级
    }
  }

  if (cached) {
    return { data: cached, source: "cache" };
  }

  return { data: OFFLINE_BOOTSTRAP, source: "offline" };
}
