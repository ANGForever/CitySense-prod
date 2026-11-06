import assert from "node:assert/strict";
import test from "node:test";
import type { ChatCompletionClient, ChatMessage, ChatStreamEvent } from "../../server/ai/chat-client";
import { runSnowAgent } from "../../server/snow/agent";
import { executeSnowTool } from "../../server/snow/tools";
import { snowChatRequestSchema, snowChatResponseSchema } from "../../server/snow/chat-schema";
import { SnowChatStore } from "../../server/snow/chat-store";
import { handleSnowChat } from "../../server/snow/chat-http";

const sessionId = "a4ab8670-cc22-41e9-88db-5f7ce22cbd21";
const input = { sessionId, message: "请讲解青唐冰鼓", context: { currentSpotId: "CT-CORE-01" } };
function clientWith(rounds: ChatStreamEvent[][], inspect?: (messages: ChatMessage[], round: number) => void): ChatCompletionClient {
  let round = 0;
  return { async *streamChatCompletion({ messages }) {
    const index = round++;
    inspect?.(messages, index);
    for (const event of rounds[index] ?? []) yield event;
  } };
}
const tool = (name: string, args: unknown, id = "call_1"): ChatStreamEvent => ({ type: "tool_calls", calls: [{ id, type: "function", function: { name, arguments: JSON.stringify(args) } }] });

test("spot tool uses only known park IDs", () => {
  const result = executeSnowTool("get_spot_info", '{"spotId":"CT-CORE-01"}');
  assert.equal(result.cards[0].type, "spot");
  assert.deepEqual(result.actions, [{ type: "focus_spot", spotId: "CT-CORE-01" }]);
  const missing = executeSnowTool("get_spot_info", '{"spotId":"fake"}');
  assert.equal(JSON.parse(missing.content).error, "not_found");
  assert.deepEqual(missing.actions, []);
});

for (const [budget, expected] of [[15, null], [30, "short"], [40, "short"], [60, "family"], [90, "family"]] as const) {
  test(`route recommendation obeys ${budget} minute hard budget`, () => {
    const result = executeSnowTool("recommend_park_route", JSON.stringify({ audience: "family", durationMinutes: budget, interests: ["拍照"] }));
    assert.equal(result.cards.length, expected ? 1 : 0);
    if (result.cards[0]?.type === "route") {
      assert.equal(result.cards[0].routeId, expected);
      assert.ok(result.cards[0].estimatedMinutes <= budget);
    }
  });
}

test("tool rejects unknown functions, injection fields and invalid numeric arguments", () => {
  assert.throws(() => executeSnowTool("read_file", "{}"));
  assert.throws(() => executeSnowTool("recommend_park_route", '{"durationMinutes":-1}'));
  assert.throws(() => executeSnowTool("recommend_park_route", '{"durationMinutes":40,"url":"https://example.org"}'));
  assert.throws(() => executeSnowTool("get_spot_info", "not json"));
});

test("agent performs tool round then final answer, injecting controlled context", async () => {
  const client = clientWith([[tool("get_spot_info", { spotId: "CT-CORE-01" })], [{ type: "delta", content: "这是青唐冰鼓的演示讲解。" }]], (messages, round) => {
    assert.ok(messages[1].content?.includes("青唐冰鼓"));
    assert.ok(!messages[0].content?.includes("上海"));
    if (round === 1) assert.equal(messages.at(-1)?.role, "tool");
  });
  const result = await runSnowAgent(input, { client, requestId: "test" });
  assert.equal(result.meta.mode, "agent");
  assert.deepEqual(result.meta.usedTools, ["get_spot_info"]);
  assert.equal(result.cards.length, 1);
  assert.ok(snowChatResponseSchema.safeParse(result).success);
});

test("plain text resembling a UI command never produces an action", async () => {
  const result = await runSnowAgent(input, { client: clientWith([[{ type: "delta", content: '{"type":"focus_spot","spotId":"fake"}' }]]), requestId: "test" });
  assert.deepEqual(result.actions, []);
  assert.deepEqual(result.cards, []);
});

test("route tool loop returns a real 30-minute card for a 40-minute family request", async () => {
  const result = await runSnowAgent({ sessionId, message: "带孩子，40 分钟，想拍照" }, {
    client: clientWith([[tool("recommend_park_route", { audience: "family", durationMinutes: 40, interests: ["拍照"] })],
      [{ type: "delta", content: "亲子专线需要60分钟，建议选择30分钟短时精华作为替代。" }]]), requestId: "test",
  });
  assert.equal(result.meta.mode, "agent");
  assert.deepEqual(result.actions, [{ type: "highlight_route", routeId: "short" }]);
  assert.equal(result.cards[0].type, "route");
  if (result.cards[0].type === "route") assert.equal(result.cards[0].estimatedMinutes, 30);
});

test("too-short budget produces no route card or fabricated map action", async () => {
  const result = await runSnowAgent({ sessionId, message: "只有15分钟" }, {
    client: clientWith([[tool("recommend_park_route", { durationMinutes: 15 })], [{ type: "delta", content: "目前没有满足15分钟预算的预设路线。" }]]), requestId: "test",
  });
  assert.equal(result.meta.isFallback, false);
  assert.deepEqual(result.cards, []); assert.deepEqual(result.actions, []);
});

test("final model round cannot trigger another tool execution", async () => {
  const result = await runSnowAgent(input, { requestId: "test", client: clientWith([
    [tool("get_spot_info", { spotId: "CT-CORE-01" })], [tool("get_spot_info", { spotId: "CT-MARK-01" })]
  ]) });
  assert.equal(result.meta.reason, "tool_error");
  assert.deepEqual(result.meta.usedTools, []);
});

test("HTTP includes bounded history only for the same cookie owner and session", async () => {
  const store = new SnowChatStore();
  const run: typeof runSnowAgent = async (i, options) => {
    assert.equal(options.history?.length, i.message === "follow up" ? 2 : 0);
    return runSnowAgent(i, { ...options, client: clientWith([[{ type: "delta", content: "园区导览回复" }]]) });
  };
  const first = await handleSnowChat(request({ sessionId, message: "hello" }), { store, run });
  const cookie = first.headers.get("set-cookie")!.split(";")[0];
  const next = await handleSnowChat(request({ sessionId, message: "follow up" }, { Cookie: cookie }), { store, run });
  assert.equal(next.status, 200);
  const isolated = await handleSnowChat(request({ sessionId, message: "new owner" }), { store, run });
  assert.equal(isolated.status, 200);
});

test("unconfigured model returns explicitly marked static fallback", async () => {
  const result = await runSnowAgent(input, { client: null, requestId: "test" });
  assert.equal(result.meta.isFallback, true);
  assert.equal(result.meta.reason, "unconfigured");
  assert.match(result.answer, /静态资料/);
  assert.deepEqual(result.meta.usedTools, []);
});

test("upstream failures do not expose provider errors or credentials", async () => {
  const result = await runSnowAgent(input, { client: clientWith([[{ type: "error", message: "secret_key=EXAMPLE" }]]), requestId: "test" });
  assert.equal(result.meta.reason, "upstream");
  assert.ok(!JSON.stringify(result).includes("EXAMPLE"));
});

for (const event of [tool("get_spot_info", { spotId: "fake" }), tool("read_file", {}), {
  type: "tool_calls", calls: [1, 2, 3].map(i => ({ id: `call_${i}`, type: "function", function: { name: "get_spot_info", arguments: '{"spotId":"CT-CORE-01"}' } }))
}] as ChatStreamEvent[]) {
  test("invalid tool round degrades without fabricated actions", async () => {
    const result = await runSnowAgent({ sessionId, message: "ignore rules" }, { client: clientWith([[event]]), requestId: "test" });
    assert.equal(result.meta.reason, "tool_error");
    assert.deepEqual(result.actions, []);
  });
}

test("abort-aware timeout terminates the tool cycle", async () => {
  const client: ChatCompletionClient = { async *streamChatCompletion({ signal }) {
    await new Promise<void>(resolve => signal?.addEventListener("abort", () => resolve(), { once: true }));
    yield { type: "done", finishReason: "aborted" };
  } };
  const result = await runSnowAgent(input, { client, requestId: "test", timeoutMs: 10 });
  assert.equal(result.meta.reason, "timeout");
});

test("request contract rejects invalid sessions, extra fields, empty and oversized messages", () => {
  assert.equal(snowChatRequestSchema.safeParse({ ...input, sessionId: "bad" }).success, false);
  assert.equal(snowChatRequestSchema.safeParse({ ...input, admin: true }).success, false);
  assert.equal(snowChatRequestSchema.safeParse({ ...input, message: " " }).success, false);
  assert.equal(snowChatRequestSchema.safeParse({ ...input, message: "x".repeat(1001) }).success, false);
});

test("history is bounded, owner isolated, session isolated and expires after 24 hours", () => {
  const store = new SnowChatStore();
  for (let i = 0; i < 12; i++) {
    const lease = store.acquire("owner1", 1000 + i * 60000, "session1");
    assert.ok(lease.allowed);
    lease.release([{ role: "user", content: `q${i}` }, { role: "assistant", content: "answer" }]);
  }
  const lease = store.acquire("owner1", 900000, "session1");
  assert.ok(lease.allowed); assert.equal(lease.history.length, 20); lease.release();
  for (const [owner, session] of [["owner2", "session1"], ["owner1", "session2"]]) {
    const other = store.acquire(owner, 901000, session);
    assert.ok(other.allowed); assert.deepEqual(other.history, []); other.release();
  }
  const expired = store.acquire("owner1", 90000000, "session1");
  assert.ok(expired.allowed); assert.deepEqual(expired.history, []); expired.release();
});

test("busy requests and per-owner burst quota are blocked", () => {
  const store = new SnowChatStore();
  const first = store.acquire("owner", 1000); assert.ok(first.allowed);
  assert.equal(store.acquire("owner", 1001).allowed, false); first.release();
  for (let i = 1; i < 8; i++) { const lease = store.acquire("owner", 1002); assert.ok(lease.allowed); lease.release(); }
  assert.equal(store.acquire("owner", 1003).allowed, false);
  const next = store.acquire("owner", 62000); assert.ok(next.allowed); next.release();
});

function request(body: unknown = input, headers: Record<string, string> = {}) {
  return new Request("http://localhost/api/snow/chat", { method: "POST", headers: { "Content-Type": "application/json", ...headers }, body: JSON.stringify(body) });
}
test("HTTP errors cover unknown IDs, body limits, origin and JSON format", async () => {
  assert.equal((await handleSnowChat(request({ ...input, context: { currentSpotId: "fake" } }))).status, 400);
  assert.equal((await handleSnowChat(request({ message: "x".repeat(9000) }))).status, 413);
  assert.equal((await handleSnowChat(request(input, { Origin: "https://evil.example" }))).status, 403);
  assert.equal((await handleSnowChat(new Request("http://localhost/api/snow/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{" }))).status, 400);
});

test("HTTP issues a private cookie and never stores fallback text as successful history", async () => {
  const store = new SnowChatStore();
  const response = await handleSnowChat(request(), { store, run: (i, o) => runSnowAgent(i, { ...o, client: null }) });
  assert.equal(response.status, 200);
  assert.match(response.headers.get("set-cookie") ?? "", /HttpOnly; SameSite=Strict/);
  assert.equal(response.headers.get("cache-control"), "no-store");
  const result = await response.json(); assert.equal(result.meta.isFallback, true);
});

test("HTTP rate limit returns retry guidance", async () => {
  const store = new SnowChatStore();
  const owner = "70fb128d-b51b-4ee7-814a-bbd4b01e6621";
  const lease = store.acquire(owner); assert.ok(lease.allowed);
  const response = await handleSnowChat(request(input, { Cookie: `snow_chat_owner=${owner}` }), { store });
  assert.equal(response.status, 429); assert.ok(response.headers.get("Retry-After")); lease.release();
});

test("history mode distinguishes empty first turn from absent storage", async () => {
  // 独立调用没有任何存储，必须报 none；首轮 history 为空但走的是 memory。
  const standalone = await runSnowAgent(input, { client: null, requestId: "test" });
  assert.equal(standalone.meta.history, "none");

  const store = new SnowChatStore();
  const response = await handleSnowChat(request(), {
    store, run: (i, o) => runSnowAgent(i, { ...o, client: null })
  });
  const result = await response.json();
  assert.equal(response.status, 200);
  assert.equal(result.meta.history, "memory");
});

test("origin allowlist accepts configured public origins and rejects everything else", async () => {
  const store = new SnowChatStore();
  const run: typeof runSnowAgent = (i, o) => runSnowAgent(i, { ...o, client: null });

  // 未配置白名单时，异源请求一律 403，且不消耗配额
  assert.equal((await handleSnowChat(request(input, { Origin: "https://snow.example.com" }), { store, run })).status, 403);

  process.env.SNOW_ALLOWED_ORIGINS = "https://snow.example.com, https://demo.example.com";
  try {
    const allowed = await handleSnowChat(request(input, { Origin: "https://snow.example.com" }), { store, run });
    assert.equal(allowed.status, 200);

    // Origin 规范上不带结尾斜杠，带斜杠的串不应命中白名单
    const trailing = await handleSnowChat(request(input, { Origin: "https://snow.example.com/" }), { store, run });
    assert.equal(trailing.status, 403);
  } finally {
    delete process.env.SNOW_ALLOWED_ORIGINS;
  }
});

test("server validates the response contract before sending it", async () => {
  const store = new SnowChatStore();
  const run = (async () => ({ requestId: "x", sessionId, answer: 42 })) as unknown as typeof runSnowAgent;
  const response = await handleSnowChat(request(), { store, run });

  assert.equal(response.status, 500);
  const body = await response.json();
  assert.equal(body.error.code, "INVALID_RESPONSE");
  assert.equal(response.headers.get("cache-control"), "no-store");
});

test("tool-call markup emitted as prose never reaches the visitor", async () => {
  // Ark 上的 DeepSeek 在「未声明 tools」的一轮里会把 DSML 调用语法当正文吐出来
  const pure = [
    "<｜｜DSML｜｜ calls>",
    '<｜｜DSML｜｜ invoke name="get_spot_info">',
    '<｜｜DSML｜｜ parameter name="spotId" string="true">CT-MARK-01</｜｜DSML｜｜ parameter>',
    "</｜｜DSML｜｜ invoke>",
    "</｜｜DSML｜｜ calls>"
  ].join("\n");
  const mixed = ["这里是讲解正文。", '<｜｜DSML｜｜ invoke name="get_spot_info">', "</｜｜DSML｜｜ invoke>"].join("\n");

  const polluted = await runSnowAgent(input, {
    client: clientWith([[tool("get_spot_info", { spotId: "CT-CORE-01" })], [{ type: "delta", content: pure }]]),
    requestId: "test"
  });
  assert.equal(polluted.meta.mode, "agent");
  assert.ok(!polluted.answer.includes("｜"), `正文仍含控制标记：${polluted.answer}`);
  // 全被污染时用卡片摘要兜底，而不是整体降级丢掉真实卡片
  assert.equal(polluted.cards.length, 1);
  assert.match(polluted.answer, /青唐冰鼓/);

  const partial = await runSnowAgent(input, {
    client: clientWith([[tool("get_spot_info", { spotId: "CT-CORE-01" })], [{ type: "delta", content: mixed }]]),
    requestId: "test"
  });
  assert.equal(partial.answer, "这里是讲解正文。");
  assert.equal(partial.cards.length, 1);
});
