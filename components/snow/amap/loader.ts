/**
 * 高德 JS API 2.0 加载器。
 *
 * 两个约束决定这里的写法：
 * 1. `_AMapSecurityConfig` 必须在 loader.js 执行之前赋值，晚一步 SDK 会按
 *    默认配置初始化，之后改不动。
 * 2. loader 脚本只注入一次，失败时要把缓存的 promise 清掉，否则重试永远拿到
 *    同一个 reject。
 */

import type { AMapNamespace } from "@/components/snow/amap/types";
import { SNOW_MAP_STYLE } from "@/server/snow/map-config";

const LOADER_SRC = "https://webapi.amap.com/loader.js";
const CONFIG_TIMEOUT_MS = 6_000;
const LOAD_TIMEOUT_MS = 12_000;

export type MapConfig = {
  jsKey: string;
  securityJsCode: string | null;
  dataVersion: string;
  mapStyle: string;
};

let loaderPromise: Promise<void> | null = null;

function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), ms);

    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });
}

export async function fetchMapConfig(): Promise<MapConfig> {
  const response = await fetch("/api/snow/config", {
    signal: AbortSignal.timeout(CONFIG_TIMEOUT_MS)
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");

    throw new Error(`地图配置获取失败 (${response.status}) ${detail.slice(0, 120)}`);
  }

  const data = (await response.json()) as Partial<MapConfig>;

  if (!data.jsKey) {
    throw new Error("地图配置缺少 jsKey");
  }

  return {
    jsKey: data.jsKey,
    securityJsCode: data.securityJsCode ?? null,
    dataVersion: data.dataVersion ?? "unknown",
    mapStyle: data.mapStyle ?? SNOW_MAP_STYLE
  };
}

function injectLoaderScript(): Promise<void> {
  if (window.AMapLoader) {
    return Promise.resolve();
  }

  if (!loaderPromise) {
    loaderPromise = new Promise<void>((resolve, reject) => {
      const script = document.createElement("script");
      script.src = LOADER_SRC;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("高德 loader.js 加载失败"));
      document.head.appendChild(script);
    }).catch((error) => {
      // 失败不缓存，允许下一次重试
      loaderPromise = null;
      throw error;
    });
  }

  return loaderPromise;
}

export async function loadAmap(config: MapConfig): Promise<AMapNamespace> {
  if (config.securityJsCode) {
    // 必须在 loader 脚本执行前设置
    window._AMapSecurityConfig = { securityJsCode: config.securityJsCode };
  }

  await withTimeout(
    injectLoaderScript(),
    LOAD_TIMEOUT_MS,
    "高德 loader.js 加载超时"
  );

  const loader = window.AMapLoader;

  if (!loader) {
    throw new Error("AMapLoader 未就绪");
  }

  const namespace = await withTimeout(
    loader.load({ key: config.jsKey, version: "2.0", plugins: [] }),
    LOAD_TIMEOUT_MS,
    "高德 JS API 初始化超时"
  );

  if (!namespace?.Map) {
    throw new Error("高德 JS API 返回的命名空间无效");
  }

  if (typeof namespace.GLCustomLayer !== "function") {
    throw new Error("当前高德 JS API 版本不提供 GLCustomLayer");
  }

  return namespace;
}

/** 供降级判定使用：有 WebGL 上下文才有必要尝试三维 */
export function hasWebGL(): boolean {
  if (typeof document === "undefined") {
    return false;
  }

  try {
    const canvas = document.createElement("canvas");

    return Boolean(
      canvas.getContext("webgl2") ??
        canvas.getContext("webgl") ??
        canvas.getContext("experimental-webgl")
    );
  } catch {
    return false;
  }
}
