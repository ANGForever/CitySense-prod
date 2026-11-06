import { SNOW_DATA_VERSION } from "@/server/snow/data";
import { createDefaultChatClient } from "@/server/ai/chat-client";

export const dynamic = "force-dynamic";
export function GET() {
  return Response.json({ status: "ok", version: SNOW_DATA_VERSION,
    mapConfigured: Boolean(process.env.AMAP_JS_API_KEY?.trim()),
    // 用能否构造出客户端来判断，避免各处重复实现凭据优先级
    llmConfigured: Boolean(createDefaultChatClient()) }, { headers: { "Cache-Control": "no-store" } });
}
