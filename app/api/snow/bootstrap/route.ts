/**
 * GET /api/snow/bootstrap
 *
 * 小程序原生页与 H5 地图共用同一份演示数据。
 * 不返回任何密钥、后台信息或内部错误栈。
 */

import { NextResponse } from "next/server";
import { buildBootstrap, SNOW_DATA_VERSION } from "@/server/snow/data";
import { validateParkData } from "@/server/snow/validation";

export const runtime = "nodejs";

// 数据是静态的，允许 CDN / 客户端缓存，靠 version 字段判断是否需要刷新。
export const revalidate = 300;

export async function GET() {
  const issues = validateParkData();

  if (issues.length > 0) {
    // 开发期把问题直接抛给前端，避免带着错数据继续调地图。
    if (process.env.NODE_ENV !== "production") {
      return NextResponse.json(
        { error: "演示数据校验失败", issues, version: SNOW_DATA_VERSION },
        { status: 500 }
      );
    }

    console.error("[snow/bootstrap] 数据校验失败", issues.slice(0, 10));
  }

  return NextResponse.json(buildBootstrap(), {
    headers: {
      "Cache-Control": "public, max-age=60, stale-while-revalidate=300"
    }
  });
}
