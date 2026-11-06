/**
 * GET /api/snow/config
 *
 * 下发浏览器初始化三维地图所需的最小配置。
 *
 * ── 关于 securityJsCode 的取舍（重要，改之前先读）──
 * 高德 JS API 2.0 要求配合安全密钥使用。理想做法是把密钥留在服务端、
 * 由代理转发带 jscode 的请求，但实测 restapi 的 /_AMapService 通道对
 * 直接拼 jscode 的调用返回 SERVICE_NOT_AVAILABLE —— 它需要 SDK 侧计算签名，
 * 不是简单拼接。在当前 Demo 阶段把这个未验证的代理接进主链路，
 * 等于让地图加载依赖一段猜出来的协议。
 *
 * 因此本阶段改为：密钥经本接口下发，由 SDK 在浏览器侧使用。
 * 这仍然优于旧做法（写进 NEXT_PUBLIC_* 打进 bundle）：
 *   - 不进入构建产物，换密钥不用重新构建
 *   - 不进 git，不进 NEXT_PUBLIC_*
 *   - 可在本接口加来源校验、灰度下发或一键关闭
 * 剩余风险是持有密钥者可消耗高德配额，用「域名白名单 + 配额告警」兜底。
 *
 * 当本项目开始调用高德服务类插件（地理编码 / POI 检索 / 路径规划）时，
 * 必须重新评估这里，改回真正的服务端代理。
 */

import { NextResponse } from "next/server";
import { SNOW_DATA_VERSION } from "@/server/snow/data";
import { SNOW_MAP_STYLE } from "@/server/snow/map-config";

export const runtime = "nodejs";

export async function GET() {
  const jsKey = process.env.AMAP_JS_API_KEY?.trim();

  if (!jsKey) {
    return NextResponse.json(
      { error: "AMAP_JS_API_KEY 未配置，三维地图不可用" },
      { status: 503 }
    );
  }

  const securityJsCode = process.env.AMAP_SECURITY_JS_CODE?.trim();

  return NextResponse.json(
    {
      jsKey,
      securityJsCode: securityJsCode ?? null,
      dataVersion: SNOW_DATA_VERSION,
      mapStyle: SNOW_MAP_STYLE
    },
    {
      headers: { "Cache-Control": "private, max-age=300" }
    }
  );
}
