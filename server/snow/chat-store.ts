import type { ChatMessage } from "@/server/ai/chat-client";

const TTL = 24 * 60 * 60 * 1000;
type Session = { expires: number; histories: Map<string, ChatMessage[]>; busy: boolean; count: number; window: number };

/** Bounded single-process demo storage. Restart clears history/quotas; multi-instance deployment needs Redis. */
export class SnowChatStore {
  private sessions = new Map<string, Session>();
  private minute = { start: 0, count: 0 };
  private day = { start: 0, count: 0 };

  acquire(key: string, now = Date.now(), sessionId = "default"): { allowed: false; retryAfter: number } | { allowed: true; history: ChatMessage[]; release: (pair?: [ChatMessage, ChatMessage]) => void } {
    for (const [id, session] of this.sessions) if (session.expires <= now && !session.busy) this.sessions.delete(id);
    if (now - this.minute.start >= 60000) this.minute = { start: now, count: 0 };
    if (now - this.day.start >= TTL) this.day = { start: now, count: 0 };
    if (this.day.count >= 500) return { allowed: false, retryAfter: Math.ceil((this.day.start + TTL - now) / 1000) };
    if (this.minute.count >= 60) return { allowed: false, retryAfter: 60 };
    let session = this.sessions.get(key);
    if (!session) {
      if (this.sessions.size >= 500) return { allowed: false, retryAfter: 60 };
      session = { expires: now + TTL, histories: new Map(), busy: false, count: 0, window: now };
      this.sessions.set(key, session);
    }
    if (now - session.window >= 60000) { session.window = now; session.count = 0; }
    if (session.busy || session.count >= 8) return { allowed: false, retryAfter: session.busy ? 5 : 60 };
    session.busy = true; session.count++;
    this.minute.count++; this.day.count++;
    return { allowed: true, history: (session.histories.get(sessionId) ?? []).map(m => ({ ...m })), release: (pair) => {
      if (pair) {
        if (!session.histories.has(sessionId) && session.histories.size >= 10) session.histories.delete(session.histories.keys().next().value!);
        session.histories.set(sessionId, [...(session.histories.get(sessionId) ?? []), ...pair].slice(-20));
      }
      session.busy = false;
    } };
  }
}

const holder = globalThis as typeof globalThis & { snowChatStore?: SnowChatStore };
export const chatStore = holder.snowChatStore ??= new SnowChatStore();
