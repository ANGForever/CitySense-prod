/**
 * 园区地图页。
 *
 * 服务端直接注入 bootstrap，省掉首屏一次往返 —— 地图和点位同时到，
 * 不会出现「地图先出来、点位后补」的闪烁。
 *
 * 入口参数（小程序 web-view、NFC、二维码都会用到）：
 *   ?spot=CT-CORE-01   预选某个点位
 *   ?route=family      预选某条游线
 *   ?entry=qr          入口来源，仅用于标注，不作为安全凭据
 *   ?openAgent=1       直接打开 AI 伴游（对应 T-502 的 openAgent）
 *   ?mode=schematic    强制二维示意图，用于现场演示降级与无 WebGL 环境验收
 *
 * 所有参数在服务端做格式与白名单校验：ID 必须符合 design 8.3 的
 * ^[A-Z0-9_-]{1,24}$，且必须真实存在于 bootstrap；不合法的值一律当作
 * 未提供，绝不把原始字符串带进地图或 AI 上下文（T-502 / T-801）。
 */

import { buildBootstrap } from "@/server/snow/data";
import { SnowMapShell } from "@/components/snow/SnowMapShell";

type ParamValue = string | string[] | undefined;

type SearchParams = {
  spot?: ParamValue;
  route?: ParamValue;
  entry?: ParamValue;
  mode?: ParamValue;
  openAgent?: ParamValue;
};

/**
 * design 8.3：标签/二维码/NFC 带来的点位 ID 格式。
 * 点位 ID 为大写 CT-*，游线 ID 是小写单词（classic / family / short），
 * 两者都必须限制在同一套字符集与长度内，且仍要在 bootstrap 里真实存在。
 */
const SAFE_ID = /^[A-Za-z0-9_-]{1,24}$/;

/** 与 server/snow/types.ts 的 EntrySource 保持一致 */
const ENTRY_SOURCES = new Set(["home", "nfc", "qr", "map", "agent", "stamp"]);

function first(value: ParamValue): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function SnowMapPage({
  searchParams
}: {
  searchParams: Promise<SearchParams>;
}) {
  const data = buildBootstrap();
  const params = await searchParams;

  const rawSpot = first(params.spot);
  const rawRoute = first(params.route);
  const rawEntry = first(params.entry);

  // 先过格式再查数据，避免把超长/带特殊字符的输入送进查找逻辑
  const initialSpotId =
    rawSpot && SAFE_ID.test(rawSpot) && data.spots.some((spot) => spot.id === rawSpot)
      ? rawSpot
      : null;
  const initialRouteId =
    rawRoute && SAFE_ID.test(rawRoute) && data.routes.some((route) => route.id === rawRoute)
      ? rawRoute
      : null;
  const entrySource = rawEntry && ENTRY_SOURCES.has(rawEntry) ? rawEntry : null;

  return (
    <SnowMapShell
      data={data}
      initialSpotId={initialSpotId}
      initialRouteId={initialRouteId}
      forceSchematic={first(params.mode) === "schematic"}
      initialOpenAgent={first(params.openAgent) === "1"}
      entrySource={entrySource}
    />
  );
}
