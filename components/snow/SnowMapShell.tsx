"use client";

/**
 * 园区地图外壳：三维场景 / 二维示意图的切换、信息卡、路线切换、展品卡。
 *
 * 视觉沿用 CitySense：纸白底、白色浮层卡、1px 细边线、深青主色。
 * 三维失败时自动退到 `SnowSchematicMap`，保留景点查询和本地打卡。
 */

import { Compass, Layers, Megaphone, Minus, Plus, RotateCcw, Search, Snowflake, MapPin, Route, ArrowUpRight, X, Sparkles, ScanLine, List as ListIcon, MoreHorizontal, LocateFixed } from "lucide-react";
import { useCallback, useMemo, useRef, useState } from "react";
import type { SnowAction, SnowBootstrap } from "@/server/snow/types";
import { Amap3DScene, type SnowMapApi } from "@/components/snow/Amap3DScene";
import { SnowSchematicMap } from "@/components/snow/SnowSchematicMap";
import { SnowSpotSheet } from "@/components/snow/SnowSpotSheet";
import {
  MP_SCAN_PATH,
  MP_SOCIAL_PATH,
  ensureWechatBridge,
  isMiniProgramEnv,
  openNativePage
} from "@/components/snow/miniprogram";

import { SnowChatPanel, type ChatLaunch } from "@/components/snow/SnowChatPanel";

type Mode = "3d" | "schematic";

/** 三条路线沿用 CitySense 的 teal / coral / amber 三色 */
const ROUTE_TONES = ["", "tone-coral", "tone-amber"];

/** 地图顶栏窄空间用短名；正式全称在门户与 about 层展示 */
const BRAND_SHORT = "青唐冰雪烩";

export function SnowMapShell({
  data,
  initialSpotId = null,
  initialRouteId = null,
  forceSchematic = false,
  initialOpenAgent = false,
  entrySource = null
}: {
  data: SnowBootstrap;
  initialSpotId?: string | null;
  initialRouteId?: string | null;
  forceSchematic?: boolean;
  initialOpenAgent?: boolean;
  /** 仅用于入口来源标注，已由服务端白名单过滤；不作为安全凭据 */
  entrySource?: string | null;
}) {
  const [mode, setMode] = useState<Mode>(forceSchematic ? "schematic" : "3d");
  const [notice, setNotice] = useState<string | null>(
    forceSchematic ? "已按链接参数强制使用示意图" : null
  );
  const [selectedSpotId, setSelectedSpotId] = useState<string | null>(initialSpotId);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(initialRouteId);
  const [collected, setCollected] = useState<string[]>([]);
  const [category, setCategory] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [panel, setPanel] = useState<"explore" | "routes">("explore");
  const [chatLaunch, setChatLaunch] = useState<ChatLaunch | null>(initialOpenAgent ? {id:0, spotId:initialSpotId ?? undefined} : null);
  const [chatOpen, setChatOpen] = useState(initialOpenAgent);
  const [isReady, setIsReady] = useState(forceSchematic);
  /** 底部胶囊展开的面板：点位列 / 游线 / 地图工具；null 表示只留胶囊 */
  const [dockSheet, setDockSheet] = useState<"list" | "routes" | "tools" | null>(null);
  const [storyOnly, setStoryOnly] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const matches = data.spots.filter(s => (!category || s.category === category) && (!query || s.name.includes(query) || s.tags.some(t => t.includes(query))) && (!storyOnly || Boolean(s.story)));
  const featured = query || category ? matches : matches.filter(s => ["CT-CORE-01", "CT-PLAY-01", "CT-MARK-01", "CT-NEWY-05"].includes(s.id));
  const apiRef = useRef<SnowMapApi | null>(null);

  const spotById = useMemo(
    () => new Map(data.spots.map((spot) => [spot.id, spot])),
    [data.spots]
  );

  const activeSpot = selectedSpotId ? spotById.get(selectedSpotId) ?? null : null;
  const activeRoute = selectedRouteId
    ? data.routes.find((route) => route.id === selectedRouteId) ?? null
    : null;

  const handleSelectSpot = useCallback((spotId: string | null) => {
    setSelectedSpotId(spotId);
  }, []);

  const handleDegrade = useCallback((reason: string) => {
    setMode("schematic");
    setIsReady(true);
    setNotice(reason);
  }, []);

  const handleReady = useCallback(() => {
    setNotice(null);
    setIsReady(true);
  }, []);

  const handleApiReady = useCallback((api: SnowMapApi) => {
    apiRef.current = api;
  }, []);

  const toggleRoute = useCallback((routeId: string) => {
    setSelectedRouteId((current) => (current === routeId ? null : routeId));
  }, []);

  const routeStops = activeRoute
    ? activeRoute.spotIds.map((id) => spotById.get(id)?.name ?? id).join(" → ")
    : null;

  function openChat(spotId?: string) {
    setChatLaunch({ id: Date.now(), spotId, message: spotId ? `请给我讲讲${spotById.get(spotId)?.name ?? "这个景观"}，适合孩子听。` : undefined });
    setChatOpen(true);
  }
  function handleChatAction(action: SnowAction) {
    if (action.type === "focus_spot" && spotById.has(action.spotId)) {
      setCategory(null); setSelectedSpotId(action.spotId); apiRef.current?.focusSpot(action.spotId);
    } else if (action.type === "highlight_route" && data.routes.some(r => r.id === action.routeId)) {
      setCategory(null); setSelectedSpotId(null); setSelectedRouteId(action.routeId); setPanel("routes");
    } else if (action.type === "reset_view") {
      setSelectedSpotId(null); setSelectedRouteId(null); apiRef.current?.resetView();
    }
    setChatOpen(false);
  }

  function handleCollect(spotId: string) {
    // TODO(P2)：接 /api/snow/checkin，先用本地状态把交互跑通
    setCollected((current) =>
      current.includes(spotId) ? current : [...current, spotId]
    );
  }

  /**
   * 微信内跳原生媒体页，普通浏览器落到 H5 降级页（design T-307）。
   * JSSDK 是异步加载的，先等它就绪再判断，否则刚进页面就点会误判成「非微信」
   * 而直接落到降级页。
   */
  async function openSocial() {
    const ready = await ensureWechatBridge();

    if (ready && openNativePage(MP_SOCIAL_PATH)) {
      return;
    }

    window.location.assign("/snow/social");
  }

  function flash(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(null), 3200);
  }

  /** 回到全园视角，同时收起底部面板 */
  function resetView() {
    setSelectedSpotId(null);
    setSelectedRouteId(null);
    setDockSheet(null);
    apiRef.current?.resetView();
  }

  /**
   * 中心扫码：H5 web-view 内没有 Taro.scanCode，只能跳原生页。
   * 扫码结果由原生页校验后通过 URL 带 spotId 回到 /snow（会重载 WebView，
   * 3D 相机状态丢失已由用户在设计评审中确认接受）。
   */
  async function openScan() {
    if (!isMiniProgramEnv()) {
      flash("扫码需在微信内使用，请在小程序里打开");
      return;
    }

    const ready = await ensureWechatBridge();
    if (ready && openNativePage(MP_SCAN_PATH)) {
      return;
    }

    flash("微信跳转失败，请从小程序首页扫码");
  }

  return (
    <div className="snow-stage" data-entry={entrySource ?? undefined}>
      <div className="snow-canvas">
        {mode === "3d" ? (
          <Amap3DScene
            data={data}
            selectedSpotId={selectedSpotId}
            selectedRouteId={selectedRouteId}
            category={category}
            onSelectSpot={handleSelectSpot}
            onReady={handleReady}
            onDegrade={handleDegrade}
            onApiReady={handleApiReady}
          />
        ) : (
          <div className="snow-schematic">
            <SnowSchematicMap
              data={data}
              heightMode="fill"
              activeSpotId={selectedSpotId ?? undefined}
              activeRouteId={selectedRouteId ?? undefined}
              category={category}
              onSelectSpot={handleSelectSpot}
            />
          </div>
        )}
      </div>

      <header className="snow-topbar">
        <div className="snow-brand"><span className="snow-brand-icon"><Snowflake size={23} /></span><div><span className="snow-eyebrow">QING TANG · WINTER GUIDE</span><h1>{BRAND_SHORT}</h1></div><span className="snow-day">白天</span></div>
        <label className="snow-search"><Search size={17} /><input aria-label="搜索景观" placeholder="搜索景观，发现冰雪之美" value={query} onChange={e => {setQuery(e.target.value);setPanel("explore");setSelectedSpotId(null);}} />{query && <button aria-label="清除搜索" onClick={() => setQuery("")}><X size={15}/></button>}</label>
      </header>
      <nav className="snow-filters" aria-label="景观分类">
        <button className={!category ? "active" : ""} aria-pressed={!category} onClick={() => {setCategory(null);setSelectedSpotId(null);}}>全部景观</button>
        {data.categories.filter(c => c.id !== "gate" && data.spots.some(s => s.category === c.id)).map(c => <button key={c.id} className={category === c.id ? "active" : ""} aria-pressed={category === c.id} onClick={() => {setCategory(category === c.id ? null : c.id);setPanel("explore");setSelectedSpotId(null);}}><i style={{background:c.color}} />{c.label}</button>)}
        <button className={["snow-filter-chip", storyOnly ? "active" : ""].join(" ")} aria-pressed={storyOnly} title="仅看有讲解的点位" onClick={() => setStoryOnly(value => !value)}>筛选{storyOnly ? " · 已开" : ""}</button>
      </nav>
      {dockSheet === "tools" && <div className="snow-map-tools">
        <button aria-label="官方媒体" title="官方媒体" onClick={() => void openSocial()}><Megaphone size={18}/></button>
        <span />
        <button aria-label="回到全园视角" title="全园视角" disabled={mode !== "3d" || !isReady} onClick={() => {setSelectedSpotId(null);setSelectedRouteId(null);apiRef.current?.resetView();}}><RotateCcw size={19}/></button>
        <button aria-label="旋转地图" title="旋转地图" disabled={mode !== "3d" || !isReady} onClick={() => apiRef.current?.rotate()}><Compass size={19}/></button>
        <button aria-label="切换俯视与倾斜" title="俯视 / 倾斜" disabled={mode !== "3d" || !isReady} onClick={() => apiRef.current?.togglePitch()}><Layers size={19}/></button>
        <span />
        <button aria-label="放大地图" disabled={mode !== "3d" || !isReady} onClick={() => apiRef.current?.zoomBy(0.7)}><Plus size={20}/></button>
        <button aria-label="缩小地图" disabled={mode !== "3d" || !isReady} onClick={() => apiRef.current?.zoomBy(-0.7)}><Minus size={20}/></button>
      </div>}
      {!isReady && <div className="snow-loading" role="status"><Snowflake size={18}/>正在铺开冰雪园区…</div>}
      {notice && <div className="snow-notice"><strong>示意图模式</strong><span>{notice}</span></div>}
      <div className="snow-data-note">演示景观 · {data.park.coordSystem === "UNCONFIRMED" ? "坐标待校准" : "点位为模拟布局"}</div>
      {toast && <div className="snow-toast" role="status">{toast}</div>}
      {!chatOpen && <button className="snow-ai-fab" aria-label="AI 伴游" title="AI 伴游" onClick={() => openChat(selectedSpotId ?? undefined)}><Sparkles size={20}/><span>AI</span></button>}
      {chatLaunch && <div hidden={!chatOpen}><SnowChatPanel data={data} launch={chatLaunch} currentSpotId={selectedSpotId} selectedRouteId={selectedRouteId} onClose={() => setChatOpen(false)} onAction={handleChatAction}/></div>}
      {!activeSpot && !chatOpen && (dockSheet === "list" || dockSheet === "routes") && <section className="snow-guide-panel">
        <div className="snow-panel-head"><div className="snow-panel-tabs"><button className={panel === "explore" ? "active" : ""} onClick={() => {setPanel("explore");setDockSheet("list");}}><MapPin size={16}/>探索园区</button><button className={panel === "routes" ? "active" : ""} onClick={() => {setPanel("routes");setDockSheet("routes");}}><Route size={16}/>精选游线</button></div><div className="snow-panel-head-right"><span>{panel === "explore" ? `${matches.length} 处景观` : "3 种游览方式"}</span><button className="snow-sheet-close" aria-label="收起面板" title="收起面板" onClick={() => setDockSheet(null)}><X size={16}/></button></div></div>
        {panel === "explore" ? <>
          <div className="snow-panel-title"><h2>{query ? `“${query}”的搜索结果` : category ? data.categories.find(c => c.id === category)?.label : "从青唐冰鼓，开始冬日漫游"}</h2><p>轻点地图上的景观，查看介绍</p></div>
          <div className="snow-featured">{featured.map((spot,index) => <button className="snow-feature-card" key={spot.id} onClick={() => {setSelectedSpotId(spot.id);setQuery("");}}><span className={`snow-card-art art-${spot.category}`}><Snowflake size={28}/><em>{String(index+1).padStart(2,"0")}</em></span><span><strong>{spot.name}</strong><small>{spot.tags.slice(0,2).join(" · ") || "园区景观"}</small></span><ArrowUpRight size={16}/></button>)}{featured.length === 0 && <p className="snow-empty">没有找到相关景观，试试其他关键词。</p>}</div>
        </> : <><div className="snow-panel-title"><h2>选一条适合你的游线</h2><p>预设游览顺序 · 路径为演示连线</p></div><div className="snow-routes">{data.routes.map((route,index) => <button key={route.id} aria-pressed={route.id === selectedRouteId} className={["snow-route-chip",ROUTE_TONES[index],route.id === selectedRouteId ? "active" : ""].join(" ")} onClick={() => {setCategory(null);toggleRoute(route.id);}}><strong>{route.title.split(" · ")[0]}</strong><em>{route.estimatedMinutes} 分钟 · {route.spotIds.length} 站</em></button>)}</div>{routeStops && <p className="snow-route-stops">{routeStops}</p>}</>}
      </section>}

      <nav className="snow-dock" aria-label="园区工具">
        <button className="snow-dock-side" aria-label="回到全园视角" title="回到全园视角" onClick={resetView}><LocateFixed size={19}/></button>
        <div className="snow-dock-bar">
          <button className={dockSheet === "routes" ? "active" : ""} onClick={() => {setPanel("routes");setDockSheet(dockSheet === "routes" ? null : "routes");}}><Route size={16}/>线路</button>
          <button className="snow-dock-scan" onClick={() => void openScan()}><ScanLine size={18}/>扫码</button>
          <button className={dockSheet === "list" ? "active" : ""} onClick={() => {setPanel("explore");setDockSheet(dockSheet === "list" ? null : "list");}}><ListIcon size={16}/>列表</button>
        </div>
        <button className="snow-dock-side" aria-label="更多地图工具" title="更多地图工具" onClick={() => setDockSheet(dockSheet === "tools" ? null : "tools")}><MoreHorizontal size={19}/></button>
      </nav>

      {activeSpot && !chatOpen ? (
        <SnowSpotSheet
          spot={activeSpot}
          categories={data.categories}
          collected={collected.includes(activeSpot.id)}
          onClose={() => setSelectedSpotId(null)}
          onFocus={() => apiRef.current?.focusSpot(activeSpot.id)}
          onCollect={() => handleCollect(activeSpot.id)}
          onExplain={() => openChat(activeSpot.id)}
        />
      ) : null}
    </div>
  );
}
