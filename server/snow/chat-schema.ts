import { z } from "zod";

const id = z.string().min(1).max(64).regex(/^[a-zA-Z0-9_-]+$/);
export const snowChatRequestSchema = z.object({
  sessionId: z.string().uuid(),
  message: z.string().trim().min(1).max(1000),
  context: z.object({
    currentSpotId: id.optional(),
    selectedRouteId: id.optional(),
    entrySource: z.enum(["home", "nfc", "qr", "map", "agent", "stamp"]).optional(),
  }).strict().optional(),
}).strict();

export const spotToolSchema = z.object({ spotId: id }).strict();
export const routeToolSchema = z.object({
  audience: z.enum(["family", "couple", "general"]).optional(),
  durationMinutes: z.number().int().min(10).max(240).optional(),
  interests: z.array(z.string().trim().min(1).max(30)).max(8).optional(),
}).strict();

export const snowChatResponseSchema = z.object({
  requestId: z.string(), sessionId: z.string().uuid(), answer: z.string().max(6000),
  cards: z.array(z.discriminatedUnion("type", [
    z.object({ type: z.literal("spot"), spotId: id, name: z.string(),
      category: z.enum(["ice-art", "snow-play", "lantern", "prayer", "lake", "gate"]), summary: z.string() }),
    z.object({ type: z.literal("route"), routeId: id, title: z.string(),
      estimatedMinutes: z.number().positive(), spotIds: z.array(id) }),
  ])).max(2),
  actions: z.array(z.discriminatedUnion("type", [
    z.object({ type: z.literal("focus_spot"), spotId: id }),
    z.object({ type: z.literal("highlight_route"), routeId: id }),
    z.object({ type: z.literal("reset_view") }),
  ])).max(2),
  meta: z.object({ mode: z.enum(["agent", "fallback"]), usedTools: z.array(z.string()),
    isFallback: z.boolean(), history: z.enum(["memory", "none"]),
    reason: z.enum(["unconfigured", "timeout", "upstream", "tool_error"]).optional() }),
});
