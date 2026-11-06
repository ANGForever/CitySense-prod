"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, LoaderCircle, Send, Sparkles, X } from "lucide-react";
import { snowChatResponseSchema } from "@/server/snow/chat-schema";
import type { SnowAction, SnowBootstrap, SnowChatResponse } from "@/server/snow/types";

type Turn = { id: string; role: "user" | "assistant"; text: string; result?: SnowChatResponse };
export type ChatLaunch = { id: number; message?: string; spotId?: string };

export function SnowChatPanel({ data, launch, currentSpotId, selectedRouteId, onClose, onAction }: {
  data: SnowBootstrap; launch: ChatLaunch; currentSpotId: string | null;
  selectedRouteId: string | null; onClose: () => void; onAction: (action: SnowAction) => void;
}) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState(launch.message ?? "");
  const [previousLaunch, setPreviousLaunch] = useState(launch);
  if (previousLaunch !== launch) { setPreviousLaunch(launch); if (launch.message) setDraft(launch.message); }
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState<{ message: string; spotId?: string } | null>(null);
  const sessionRef = useRef<string | null>(null);
  const requestRef = useRef<AbortController | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const panelRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const viewport = window.visualViewport;
    const resize = () => {
      const inset = viewport ? Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop) : 0;
      panelRef.current?.style.setProperty("--snow-keyboard-gap", `${inset}px`);
    };
    resize();
    viewport?.addEventListener("resize", resize);
    viewport?.addEventListener("scroll", resize);
    return () => { viewport?.removeEventListener("resize", resize); viewport?.removeEventListener("scroll", resize); };
  }, []);

  useEffect(() => {
    try { sessionRef.current = sessionStorage.getItem("snow-chat-session"); } catch { /* private mode */ }
    if (!sessionRef.current || !/^[0-9a-f-]{36}$/i.test(sessionRef.current)) {
      sessionRef.current = crypto.randomUUID();
      try { sessionStorage.setItem("snow-chat-session", sessionRef.current); } catch { /* private mode */ }
    }
    return () => requestRef.current?.abort();
  }, []);

  useEffect(() => { listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" }); }, [turns, busy, error]);
  useEffect(() => { inputRef.current?.focus(); }, []);

  async function send(message: string, spotId?: string, isRetry = false) {
    if (requestRef.current || !message.trim()) return;
    const controller = new AbortController();
    requestRef.current = controller;
    const timer = setTimeout(() => controller.abort(), 32000);
    setBusy(true); setError(null); setRetry(null); setDraft("");
    if (!isRetry) setTurns(t => [...t, { id: crypto.randomUUID(), role: "user" as const, text: message }].slice(-40));
    try {
      const response = await fetch("/api/snow/chat", { method: "POST", headers: { "Content-Type": "application/json" },
        signal: controller.signal, body: JSON.stringify({ sessionId: sessionRef.current, message,
          context: { currentSpotId: spotId ?? currentSpotId ?? undefined, selectedRouteId: selectedRouteId ?? undefined, entrySource: "map" } }) });
      const raw: unknown = await response.json();
      if (!response.ok) {
        const detail = raw as { error?: { message?: string } };
        throw new Error(detail.error?.message ?? "暂时无法回复，请稍后重试。");
      }
      const result = snowChatResponseSchema.parse(raw);
      if (result.sessionId !== sessionRef.current) throw new Error("会话已变更，请刷新后重试。");
      // Every display ID is checked against the same bootstrap used by the map.
      if (result.cards.some(c => c.type === "spot" ? !data.spots.some(s => s.id === c.spotId)
        : !data.routes.some(r => r.id === c.routeId && r.spotIds.join() === c.spotIds.join())) ||
        result.actions.some(a => a.type === "focus_spot" ? !data.spots.some(s => s.id === a.spotId)
          : a.type === "highlight_route" && !data.routes.some(r => r.id === a.routeId))) {
        throw new Error("景观资料已更新，请刷新页面后重试。");
      }
      setTurns(t => [...t, { id: crypto.randomUUID(), role: "assistant" as const, text: result.answer, result }].slice(-40));
    } catch (e) {
      if (!controller.signal.aborted || requestRef.current === controller) {
        setError(controller.signal.aborted ? "等待超时，请重试。" : e instanceof Error && e.name !== "ZodError" ? e.message : "回复格式异常，请重试。");
        setRetry({ message, spotId });
      }
    } finally {
      clearTimeout(timer);
      if (requestRef.current === controller) { requestRef.current = null; setBusy(false); }
    }
  }

  // Opening from an exhibit pre-fills the request; sending remains an explicit visitor action.
  const contextSpot = data.spots.find(s => s.id === (launch.spotId ?? currentSpotId));
  return <section ref={panelRef} className="snow-chat-panel" aria-label="AI 伴游">
    <header className="snow-chat-head"><span className="snow-chat-icon"><Sparkles size={18}/></span><div><h2>青唐 AI 伴游</h2><p>景观讲解 · 游线建议</p></div><button onClick={onClose} aria-label="收起 AI 伴游"><X size={18}/></button></header>
    <div className="snow-chat-context">{contextSpot ? `当前景观 · ${contextSpot.name}` : "告诉我同行人、游览时间和兴趣"}</div>
    <div className="snow-chat-messages" ref={listRef} role="log" aria-live="polite" aria-relevant="additions">
      {turns.length === 0 && <div className="snow-chat-welcome"><Sparkles size={25}/><h3>一起发现青唐的冬日风景</h3><p>我可以介绍园区景观，帮你从预设游线中挑选适合的一条。</p><div>{[contextSpot ? `给我讲讲${contextSpot.name}` : "介绍一下青唐冰鼓", "带孩子，40 分钟，想拍照", "只有 15 分钟，怎么逛？"].map(q => <button key={q} disabled={busy} onClick={() => void send(q, launch.spotId)}>{q}<ArrowUpRight size={14}/></button>)}</div></div>}
      {turns.map(turn => <article className={`snow-chat-turn ${turn.role}`} key={turn.id}>
        <span className="snow-chat-author">{turn.role === "user" ? "你" : turn.result?.meta.isFallback ? "静态资料 · AI 暂不可用" : "青唐伴游"}</span>
        <p>{turn.text}</p>
        {turn.result?.cards.map(card => {
          const action = turn.result?.actions.find(a => card.type === "spot" ? a.type === "focus_spot" && a.spotId === card.spotId : a.type === "highlight_route" && a.routeId === card.routeId);
          return <div className="snow-chat-card" key={card.type === "spot" ? card.spotId : card.routeId}>
            <strong>{card.type === "spot" ? card.name : card.title.split(" · ")[0]}</strong>
            <small>{card.type === "spot" ? card.summary : `${card.estimatedMinutes} 分钟 · ${card.spotIds.length} 站 · 演示游线`}</small>
            {action && <button onClick={() => onAction(action)}>{card.type === "spot" ? "在地图查看" : "在地图高亮路线"}<ArrowUpRight size={14}/></button>}
          </div>;
        })}
      </article>)}
      {busy && <p className="snow-chat-pending" role="status"><LoaderCircle size={16}/>正在查阅园区资料…</p>}
      {error && <div className="snow-chat-error" role="alert"><p>{error}</p>{retry && <button onClick={() => void send(retry.message, retry.spotId, true)}>重试这条提问</button>}</div>}
    </div>
    <form className="snow-chat-compose" onSubmit={e => {e.preventDefault();void send(draft, launch.spotId);}}>
      <textarea ref={inputRef} aria-label="向 AI 伴游提问" placeholder={contextSpot ? `想了解${contextSpot.name}的什么？` : "比如：带孩子，40 分钟，想拍照"} value={draft} maxLength={1000} onChange={e => setDraft(e.target.value)} rows={2}
        onKeyDown={e => {if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {e.preventDefault();void send(draft, launch.spotId);}}}/>
      <button type="submit" disabled={busy || !draft.trim()} aria-label="发送提问">{busy ? <LoaderCircle size={17}/> : <Send size={17}/>}</button>
    </form>
    <p className="snow-chat-footnote">演示资料与路线 · AI 回答仅供游览参考 · 会话临时保存</p>
  </section>;
}
