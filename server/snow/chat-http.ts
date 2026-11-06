import { randomUUID } from "node:crypto";
import { snowChatRequestSchema, snowChatResponseSchema } from "@/server/snow/chat-schema";
import { ROUTES, SPOTS } from "@/server/snow/data";
import { runSnowAgent } from "@/server/snow/agent";
import { chatStore, type SnowChatStore } from "@/server/snow/chat-store";

const MAX_BYTES = 8192;

/**
 * 允许的来源：同源，或 SNOW_ALLOWED_ORIGINS 中显式列出的公开域名。
 *
 * 不读 X-Forwarded-Host —— 那是客户端可伪造的头，信任它等于取消同源限制。
 * 反向代理必须保留原始 Host，Next 才能据 request.url 推导出正确的同源判断；
 * 若代理确实改写了 Host，就用 SNOW_ALLOWED_ORIGINS 把公开域名列进来。
 */
function originAllowed(request: Request, origin: string): boolean {
  if (origin === new URL(request.url).origin) return true;

  return (process.env.SNOW_ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((value) => value.trim().replace(/\/+$/, ""))
    .filter(Boolean)
    .includes(origin);
}

class BodyTooLarge extends Error {}
async function readJson(request: Request) {
  if (Number(request.headers.get("content-length")) > MAX_BYTES) throw new BodyTooLarge();
  const reader = request.body?.getReader();
  if (!reader) throw new Error("missing_body");
  const decoder = new TextDecoder();
  let size = 0, text = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BYTES) { await reader.cancel(); throw new BodyTooLarge(); }
      text += decoder.decode(value, { stream: true });
    }
    return JSON.parse(text + decoder.decode()) as unknown;
  } finally { reader.releaseLock(); }
}

export async function handleSnowChat(request: Request, deps: { store?: SnowChatStore; run?: typeof runSnowAgent } = {}) {
  const requestId = randomUUID();
  const headers = new Headers({ "Cache-Control": "no-store", "Content-Type": "application/json" });
  const error = (status: number, code: string, message: string) => Response.json({ requestId, error: { code, message } }, { status, headers });
  // Do not accept cross-origin spend requests. Proxy deployments must preserve the public Host.
  const origin = request.headers.get("origin");
  if (origin && !originAllowed(request, origin)) return error(403, "ORIGIN", "请从园区地图页面发起对话。");
  if (!request.headers.get("content-type")?.startsWith("application/json")) return error(415, "CONTENT_TYPE", "请使用 JSON 请求。");
  let raw: unknown;
  try { raw = await readJson(request); }
  catch (e) { return error(e instanceof BodyTooLarge ? 413 : 400, "INVALID_BODY", "消息格式错误或内容过长。"); }
  const parsed = snowChatRequestSchema.safeParse(raw);
  if (!parsed.success) return error(400, "INVALID_INPUT", "请检查会话标识和消息，消息限 1000 字。");
  const input = parsed.data;
  if ((input.context?.currentSpotId && !SPOTS.some(s => s.id === input.context?.currentSpotId)) ||
      (input.context?.selectedRouteId && !ROUTES.some(r => r.id === input.context?.selectedRouteId))) {
    return error(400, "UNKNOWN_CONTEXT", "当前景观或路线不存在，请重新选择。");
  }
  // HttpOnly cookie separates browser owners even if they submit the same sessionId.
  const cookie = request.headers.get("cookie")?.split(";").map(s => s.trim()).find(s => s.startsWith("snow_chat_owner="))?.slice(16);
  const owner = cookie && /^[0-9a-f-]{36}$/.test(cookie) ? cookie : randomUUID();
  if (owner !== cookie) headers.append("Set-Cookie", `snow_chat_owner=${owner}; Path=/api/snow; HttpOnly; SameSite=Strict; Max-Age=86400${new URL(request.url).protocol === "https:" ? "; Secure" : ""}`);
  // Per-browser limit cannot be bypassed just by rotating a client session ID.
  const lease = (deps.store ?? chatStore).acquire(owner, Date.now(), input.sessionId);
  if (!lease.allowed) {
    headers.set("Retry-After", String(lease.retryAfter));
    return error(429, "RATE_LIMIT", "提问较频繁，请稍后再试。");
  }
  try {
    const result = await (deps.run ?? runSnowAgent)(input, {
      requestId,
      history: lease.history,
      // 走了 lease 就说明有内存存储，首轮 history 为空也仍然是 memory
      historyMode: "memory",
      signal: request.signal
    });
    // 出参也要过一遍 Schema：前端会再校验一次，但服务端不该把不合契约的 JSON 发出去，
    // 否则契约漂移只能靠前端报错才发现。
    const validated = snowChatResponseSchema.safeParse(result);
    if (!validated.success) {
      // 不合契约的回复同样不能进历史
      lease.release();
      return error(500, "INVALID_RESPONSE", "AI 返回内容异常，请稍后重试。地图仍可使用。");
    }
    // Fallback is never added as model history.
    lease.release(validated.data.meta.isFallback ? undefined : [{ role: "user", content: input.message }, { role: "assistant", content: validated.data.answer }]);
    return Response.json(validated.data, { headers });
  } catch {
    lease.release();
    return error(503, "UNAVAILABLE", "AI 暂时不可用，请稍后重试。地图仍可使用。");
  }
}
