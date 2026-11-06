import { H5_BASE, h5Host, isH5Configured } from "./config";
import {
  parseEntry,
  parseRouteId,
  parseSpotId,
  type EntrySource
} from "../shared/snow";

/**
 * 入口参数与 web-view URL 的受控构造（design 3.3 / T-502 / T-602 / T-801）。
 *
 * 三条硬约束：
 * - web-view 的 src 只能来自已核准的 H5 业务域名，且只允许 https；
 * - URL 参数只承载展示意图（spot / route / openAgent / entry），不传任何凭据；
 * - 扫码内容绝不作为跳转目标使用，只从中提取并校验 spotId。
 */

export type MapEntryParams = {
  spotId?: string | null;
  routeId?: string | null;
  openAgent?: boolean;
  entry?: EntrySource;
};

/** 域名未配置时返回 null，调用方必须显示错误页，不能拼一个 localhost 地址 */
export function buildWebViewUrl(params: MapEntryParams = {}): string | null {
  if (!isH5Configured) {
    return null;
  }

  const query: string[] = [];
  const spotId = parseSpotId(params.spotId);
  const routeId = parseRouteId(params.routeId);

  if (spotId) {
    query.push(`spot=${encodeURIComponent(spotId)}`);
  }

  if (routeId) {
    query.push(`route=${encodeURIComponent(routeId)}`);
  }

  if (params.openAgent) {
    query.push("openAgent=1");
  }

  query.push(`entry=${parseEntry(params.entry)}`);

  return `${H5_BASE}/snow?${query.join("&")}`;
}

export type ParsedEntryParams = {
  spotId: string | null;
  routeId: string | null;
  entry: EntrySource;
  /** 传入了但格式非法的参数会让 valid=false，用于跳入口错误页 */
  valid: boolean;
};

/** 兼容 spot / spotId 两种写法，NFC Scheme 与二维码可能用不同参数名 */
export function parseEntryParams(
  raw: Record<string, string | undefined>
): ParsedEntryParams {
  const spotRaw = raw.spotId ?? raw.spot;
  const routeRaw = raw.routeId ?? raw.route;
  const spotId = parseSpotId(spotRaw);
  const routeId = parseRouteId(routeRaw);

  return {
    spotId,
    routeId,
    entry: parseEntry(raw.entry),
    valid:
      (spotRaw === undefined || spotId !== null) &&
      (routeRaw === undefined || routeId !== null)
  };
}

/**
 * 从扫码结果里提取受控点位 ID。
 * 支持：纯 ID、qingtang://spot?id=XXX、已核准 H5 域名下的 /snow?spot=XXX。
 * 其他任何内容（含普通 http URL、JS、文件路径）一律返回 null。
 */
export function spotIdFromScan(raw: unknown): string | null {
  if (typeof raw !== "string" || raw.length > 512) {
    return null;
  }

  const text = raw.trim();
  const pure = parseSpotId(text);

  if (pure) {
    return pure;
  }

  if (/^qingtang:\/\/spot(?:\?|$)/i.test(text)) {
    const match = /[?&]id=([^&#]+)/i.exec(text);
    return parseSpotId(match ? decodeURIComponent(match[1]) : null);
  }

  if (/^https:\/\//i.test(text)) {
    const host = /^https:\/\/([^/?#]+)/i.exec(text);

    if (!host || !isH5Configured || host[1].toLowerCase() !== h5Host()) {
      return null;
    }

    const match = /[?&]spot=([^&#]+)/i.exec(text);

    return parseSpotId(match ? decodeURIComponent(match[1]) : null);
  }

  return null;
}
