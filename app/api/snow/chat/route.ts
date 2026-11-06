import { handleSnowChat } from "@/server/snow/chat-http";

export const runtime = "nodejs";
export const maxDuration = 35;
export async function POST(request: Request) { return handleSnowChat(request); }
