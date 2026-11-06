/**
 * 小程序侧的公开域名配置（design 10.2）。
 *
 * 常量由 config/index.ts 在编译期从 TARO_APP_API_BASE / TARO_APP_H5_BASE 注入。
 * 这里再做一次运行时校验：必须是纯 https origin，不能带路径、查询、片段或凭据。
 * 未配置时返回空串，调用方必须显示「域名未配置」而不是拼出 localhost 请求。
 *
 * 小程序 JS Core 对 URL 构造器支持不一致，用正则做校验更稳。
 */

/** 编译期注入的全局常量；声明放在本模块内，避免依赖工程级 env.d.ts */
declare const SNOW_API_BASE: string | undefined;
declare const SNOW_H5_BASE: string | undefined;

const HTTPS_ORIGIN = /^https:\/\/[a-z0-9.-]+(?::\d{1,5})?$/i;

function injected(value: unknown): string {
  return typeof value === "string" ? value.trim().replace(/\/+$/, "") : "";
}

function normalizeOrigin(value: unknown): string {
  const raw = injected(value);

  return HTTPS_ORIGIN.test(raw) ? raw.toLowerCase() : "";
}

// typeof 对「编译期常量未定义」是安全的，不会抛 ReferenceError
export const API_BASE = normalizeOrigin(
  typeof SNOW_API_BASE === "string" ? SNOW_API_BASE : ""
);
export const H5_BASE = normalizeOrigin(
  typeof SNOW_H5_BASE === "string" ? SNOW_H5_BASE : ""
);

export const isApiConfigured = API_BASE.length > 0;
export const isH5Configured = H5_BASE.length > 0;

/** 从已核准的 origin 里取出 host，用于二维码来源比对 */
export function h5Host(): string {
  return H5_BASE.replace(/^https:\/\//, "");
}
