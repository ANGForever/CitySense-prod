/**
 * GET /MP_verify_XXXX.txt —— 微信 web-view 业务域名所有权校验文件。
 *
 * 根级动态段只服务微信官方命名的校验文件，其余任意单段路径一律 404。
 * 静态段（/snow、/api/*）优先于本动态段，不会互相遮蔽。
 *
 * 部署方式：把微信后台下载的校验文件**按原文件名**放到服务器 public/ 目录，
 * 例如 /home/server/snow/public/kfxW3OKXVQ.txt（后台下载的随机名），
 * 无需重新构建或重启。文件名白名单见 server/snow/domain-verify.ts。
 * 详见根目录 README 的「小程序业务域名」一节。
 */

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { NextResponse } from "next/server";
import { wechatVerifyFilePath } from "@/server/snow/domain-verify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ domainVerify: string }> }
) {
  const { domainVerify } = await context.params;
  const file = wechatVerifyFilePath(join(process.cwd(), "public"), domainVerify);

  if (!file) {
    return new NextResponse("Not Found", { status: 404 });
  }

  try {
    const body = await readFile(file, "utf8");

    return new NextResponse(body.trim(), {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store"
      }
    });
  } catch {
    // 文件还没上传到服务器时给干净的 404，不把服务器路径或异常泄露出去
    return new NextResponse("Not Found", { status: 404 });
  }
}
