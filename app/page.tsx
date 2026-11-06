/**
 * 青唐冰雪烩品牌门户（H5 侧）。
 *
 * 甲方主 KV 自带书法标题与副标，所以 hero 只作为背景展示，不再叠同名文字；
 * 活动全称与 Slogan 放在主视觉下方的说明行与页脚。
 *
 * 骨架沿用 CitySense（栅格 / 重字重 / 卡片纪律），配色取 app/snow/brand.css。
 * 数据仍由 bootstrap 直接注入，保留「顺手体检数据」的原有职责。
 */

import Link from "next/link";
import { buildBootstrap, SNOW_DATA_VERSION } from "@/server/snow/data";

export const dynamic = "force-static";

const BRAND_SHORT = "青唐冰雪烩";
const BRAND_FULL = "青海·青唐城第三届冰雪烩";
const BRAND_SLOGAN = "期待与您携手，点亮西宁最热闹的年";

const CATEGORY_ORDER = ["ice-art", "snow-play", "lantern", "prayer"] as const;

export default function HomePage() {
  const data = buildBootstrap();
  const storyCount = data.spots.filter((spot) => spot.story).length;
  const routeId = data.routes[0]?.id;
  const coreSpotId =
    data.spots.find((spot) => spot.id === "CT-CORE-01")?.id ?? data.spots[0]?.id;

  const entries = [
    {
      href: routeId ? `/snow?route=${encodeURIComponent(routeId)}` : "/snow",
      title: "精选游线",
      desc: `${data.routes.length} 条游线 · 按时间与人群推荐`
    },
    {
      href: coreSpotId ? `/snow?spot=${encodeURIComponent(coreSpotId)}` : "/snow",
      title: "点位导览",
      desc: `${data.spots.length} 个点位 · ${storyCount} 处有讲解`
    },
    {
      href: "/snow?openAgent=1",
      title: "AI 伴游",
      desc: "问问路线、典故与附近有什么"
    }
  ];

  return (
    <main className="portal">
      <div className="portal-inner">
        <header className="portal-bar">
          <span className="portal-mark" aria-hidden="true" />
          <h1 className="portal-bar-title">{BRAND_SHORT}</h1>
          <span className="portal-bar-sub">{BRAND_FULL}</span>
        </header>

        <div
          className="portal-hero"
          role="img"
          aria-label={`${BRAND_FULL} 主视觉`}
        />

        <section className="portal-card">
          <div className="portal-card-head">
            <div>
              <h2 className="portal-card-title">园区导览</h2>
              <p className="portal-card-desc">
                {data.spots.length} 个点位 · {data.routes.length} 条游线
              </p>
            </div>
            <Link className="portal-cta" href="/snow">
              进入 3D 地图 <span aria-hidden="true">→</span>
            </Link>
          </div>
          <div
            className="portal-bird"
            role="img"
            aria-label="园区花灯鸟瞰图，含各点位标注"
          />
        </section>

        <p className="portal-hero-caption">
          {BRAND_FULL}
          <br />
          {BRAND_SLOGAN}
        </p>

        <h2 className="portal-section-title">从这里开始</h2>
        <section className="portal-entries">
          {entries.map((entry) => (
            <Link key={entry.title} className="portal-entry" href={entry.href}>
              <span className="portal-entry-top">
                <i className="portal-entry-dot" aria-hidden="true" />
                <strong>{entry.title}</strong>
              </span>
              <span>{entry.desc}</span>
            </Link>
          ))}
        </section>

        <h2 className="portal-section-title">点位分类</h2>
        <div className="portal-chips">
          {CATEGORY_ORDER.map((id) => {
            const category = data.categories.find((item) => item.id === id);
            if (!category) return null;
            const count = data.spots.filter((spot) => spot.category === id).length;

            return (
              <span key={id} className="portal-chip">
                <i style={{ background: category.color }} aria-hidden="true" />
                {category.label}
                <em>{count}</em>
              </span>
            );
          })}
        </div>

        <footer className="portal-foot">
          <div>
            {BRAND_FULL}　·　数据版本 {SNOW_DATA_VERSION}　·　坐标系{" "}
            {data.park.coordSystem}
          </div>
          <div>
            点位按设计图区域级落位，坐标为演示数据；名称中{" "}
            {data.spots.filter((spot) => !spot.verified).length} 个待主办方书面确认。
          </div>
        </footer>
      </div>
    </main>
  );
}
