import type { ChatTool } from "@/server/ai/chat-client";
import { ROUTES, SPOTS } from "@/server/snow/data";
import { routeToolSchema, spotToolSchema } from "@/server/snow/chat-schema";
import type { SnowAction, SnowCard } from "@/server/snow/types";

export const snowTools: ChatTool[] = [
  { type: "function", function: { name: "get_spot_info", description: "读取本园区已有景观的介绍与演示故事。讲解必须先调用本工具。", parameters: {
    type: "object", properties: { spotId: { type: "string" } }, required: ["spotId"], additionalProperties: false,
  } } },
  { type: "function", function: { name: "recommend_park_route", description: "从现有路线中推荐游线；时间是硬约束，无法满足时返回无匹配。受众是偏好，返回结果可能并非亲子专线。", parameters: {
    type: "object", properties: { audience: { type: "string", enum: ["family", "couple", "general"] },
      durationMinutes: { type: "integer", minimum: 10, maximum: 240 },
      interests: { type: "array", items: { type: "string" }, maxItems: 8 } }, additionalProperties: false,
  } } },
];

export type ToolResult = { content: string; cards: SnowCard[]; actions: SnowAction[] };

export function executeSnowTool(name: string, rawArguments: string): ToolResult {
  if (rawArguments.length > 4096) throw new Error("tool_arguments_too_large");
  const args: unknown = JSON.parse(rawArguments);
  if (name === "get_spot_info") {
    const { spotId } = spotToolSchema.parse(args);
    const spot = SPOTS.find(s => s.id === spotId);
    if (!spot) return { content: JSON.stringify({ error: "not_found", message: "该景观不存在，请明确告知，不能用其他景观代替。" }), cards: [], actions: [] };
    return {
      content: JSON.stringify({ name: spot.name, summary: spot.summary, story: spot.story,
        tags: spot.tags, isMock: spot.isMock, nameVerified: spot.verified }),
      cards: [{ type: "spot", spotId, name: spot.name, category: spot.category,
        summary: spot.summary ?? "该景观详细介绍尚待补充。" }],
      actions: [{ type: "focus_spot", spotId }],
    };
  }
  if (name === "recommend_park_route") {
    const { audience, durationMinutes, interests = [] } = routeToolSchema.parse(args);
    const candidates = ROUTES.filter(r => (durationMinutes === undefined || r.estimatedMinutes <= durationMinutes)
      && r.spotIds.length >= 3 && r.spotIds.every(id => SPOTS.some(s => s.id === id)));
    const score = (route: typeof ROUTES[number]) => (route.audience === audience ? 40 : 0)
      + (durationMinutes !== undefined ? 40 : 0)
      + Math.min(20, interests.filter(t => route.tags.includes(t) || route.spotIds.some(id => SPOTS.find(s => s.id === id)?.tags.includes(t))).length * 10);
    candidates.sort((a, b) => score(b) - score(a) || a.estimatedMinutes - b.estimatedMinutes);
    const route = candidates[0];
    if (!route) return { content: JSON.stringify({ matched: false, message: "没有满足时间限制的预设路线，请说明无匹配，不得编造或缩短路线时长。" }), cards: [], actions: [] };
    return {
      content: JSON.stringify({ matched: true, ...route, audienceMatched: !audience || route.audience === audience,
        stops: route.spotIds.map(id => SPOTS.find(s => s.id === id)?.name), note: "演示路线与耗时，不代表真实步道；如果受众不匹配，需明确说明这是时间范围内的替代路线。" }),
      cards: [{ type: "route", routeId: route.id, title: route.title,
        estimatedMinutes: route.estimatedMinutes, spotIds: route.spotIds }],
      actions: [{ type: "highlight_route", routeId: route.id }],
    };
  }
  throw new Error("unknown_tool");
}
