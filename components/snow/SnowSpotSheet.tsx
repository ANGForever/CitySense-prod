"use client";

import type { CategoryMeta, DemoSpot } from "@/server/snow/types";

/**
 * 展品详情卡。白底抽屉，沿用 CitySense 的卡片语言：
 * 细边线、重字重标题、深青主按钮。
 */

export function SnowSpotSheet({
  spot,
  categories,
  collected,
  onClose,
  onFocus,
  onCollect,
  onExplain
}: {
  spot: DemoSpot;
  categories: CategoryMeta[];
  collected: boolean;
  onClose: () => void;
  onFocus: () => void;
  onCollect: () => void;
  onExplain: () => void;
}) {
  const category = categories.find((item) => item.id === spot.category);
  const color = category?.color ?? "var(--muted)";

  return (
    <>
      <section className="snow-sheet" aria-label="景观详情">
        <div className="snow-sheet-grip" />

        <header className="snow-sheet-head">
          <div style={{ minWidth: 0 }}>
            <div className="snow-sheet-kicker" style={{ color }}>
              <i style={{ background: color }} />
              {category?.label ?? "点位"}
              {spot.verified ? null : <em className="snow-unverified">名称待确认</em>}
            </div>
            <h2 className="snow-sheet-title">{spot.name}</h2>
          </div>
          <button className="snow-sheet-close" onClick={onClose} aria-label="关闭">
            ✕
          </button>
        </header>

        <div className="snow-sheet-body">
          {spot.summary ? <p className="snow-sheet-summary">{spot.summary}</p> : null}
          {spot.story ? <details className="snow-story-details"><summary>读一读景观故事</summary><p className="snow-sheet-story">{spot.story}</p></details> : null}

          {spot.tags.length > 0 ? (
            <div className="snow-tags">
              {spot.tags.map((tag) => (
                <span key={tag}>{tag}</span>
              ))}
            </div>
          ) : null}
        </div>

        <button className="snow-explain-btn" onClick={onExplain}>✦ 听 AI 讲解这个景观</button>
        <footer className="snow-sheet-actions">
          <button className="snow-btn" onClick={onFocus}>
            在地图定位
          </button>
          <button
            className={collected ? "snow-btn snow-btn-done" : "snow-btn snow-btn-primary"}
            onClick={onCollect}
            disabled={collected}
          >
            {collected ? "已打卡" : "打卡"}
          </button>
        </footer>
      </section>
    </>
  );
}
