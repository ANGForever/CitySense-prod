/**
 * 园区布局校对页：/snow/preview
 *
 * 不是最终界面，目的是让甲方和开发在看三维之前先确认：
 * 分区、主轴、三大门、三个湖区、33 个点位和 3 条路线的相对关系有没有理解错。
 *
 * 视觉沿用 CitySense：纸白底、白卡、细边线、重字重。
 */

import { buildBootstrap, SNOW_DATA_VERSION } from "@/server/snow/data";
import { polylineLengthMeters } from "@/server/snow/geo";
import { SnowSchematicMap } from "@/components/snow/SnowSchematicMap";

export const dynamic = "force-static";

const CATEGORY_ORDER = ["ice-art", "snow-play", "lantern", "prayer"] as const;

export default function SnowPreviewPage() {
  const data = buildBootstrap();
  const spotById = new Map(data.spots.map((spot) => [spot.id, spot]));
  const spotCount = data.spots.length;
  const storyCount = data.spots.filter((spot) => spot.story).length;
  const unverified = data.spots.filter((spot) => !spot.verified);

  /** 湖与大门的实体不在 spots 里，图例计数要分开统计 */
  function countByCategory(categoryId: string): number {
    if (categoryId === "lake") {
      return data.lakes.length;
    }
    if (categoryId === "gate") {
      return data.gates.length;
    }
    return data.spots.filter((spot) => spot.category === categoryId).length;
  }

  return (
    <main style={{ minHeight: "100vh", background: "var(--bg)", padding: "40px 20px 64px" }}>
      <div style={{ maxWidth: 1240, margin: "0 auto" }}>
        <header style={{ marginBottom: 24 }}>
          <p
            style={{
              margin: 0,
              fontSize: 10,
              fontWeight: 850,
              letterSpacing: 1.8,
              color: "var(--muted)"
            }}
          >
            SILK ROAD CAPITAL · ICE AND SNOW QING TANG
          </p>
          <h1
            style={{
              margin: "8px 0 4px",
              fontSize: 28,
              fontWeight: 900,
              letterSpacing: -0.6,
              color: "var(--ink)"
            }}
          >
            {data.park.title} · 园区布局
          </h1>
          <p style={{ margin: 0, fontSize: 12.5, fontWeight: 700, color: "var(--muted)" }}>
            一核三区 · 三湖彩灯 · 三大门　|　数据版本 {SNOW_DATA_VERSION}
          </p>
        </header>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0,1.5fr) minmax(300px,1fr)",
            gap: 20,
            alignItems: "start"
          }}
        >
          <section style={panelStyle}>
            <SnowSchematicMap data={data} />
            <p
              style={{
                margin: "10px 4px 0",
                fontSize: 11.5,
                fontWeight: 700,
                lineHeight: 1.7,
                color: "var(--muted)"
              }}
            >
              示意投影，非真实路网。虚线为路线走向，彩色圆点为落位点位，红色方框为出入口，虚线大圆为湖面彩灯区。
            </p>
          </section>

          <aside style={{ display: "grid", gap: 14 }}>
            <Panel title="分区 · 一核三区">
              {data.zones.map((zone) => (
                <Row key={zone.id} color={zone.color} label={zone.name} note={zone.road} />
              ))}
              {data.lakes.map((lake) => (
                <Row
                  key={lake.id}
                  color={lake.color}
                  label={`${lake.name}《${lake.theme}》`}
                  note="彩灯区"
                />
              ))}
            </Panel>

            <Panel title="图例">
              {data.categories.map((category) => (
                <Row
                  key={category.id}
                  color={category.color}
                  label={category.label}
                  note={`${countByCategory(category.id)} 处`}
                />
              ))}
            </Panel>

            <Panel title="三条演示路线">
              {data.routes.map((route, index) => (
                <div
                  key={route.id}
                  style={{
                    padding: "8px 0",
                    borderBottom: index === data.routes.length - 1 ? "none" : "1px solid var(--line)"
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                    <strong style={{ fontSize: 13, fontWeight: 900 }}>{route.title}</strong>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 850,
                        color: "var(--accent-strong)",
                        whiteSpace: "nowrap"
                      }}
                    >
                      {route.estimatedMinutes} 分钟
                    </span>
                  </div>
                  <p
                    style={{
                      margin: "4px 0 0",
                      fontSize: 11.5,
                      fontWeight: 700,
                      lineHeight: 1.6,
                      color: "var(--muted)"
                    }}
                  >
                    {route.spotIds.map((id) => spotById.get(id)?.name ?? id).join(" → ")}
                  </p>
                  <p style={{ margin: "2px 0 0", fontSize: 10.5, fontWeight: 700, color: "#8a9a92" }}>
                    折线 {polylineLengthMeters(route.polyline)} 米 ·{" "}
                    {data.gates.find((g) => g.id === route.entryGateId)?.name} 进 ·{" "}
                    {data.gates.find((g) => g.id === route.exitGateId)?.name} 出
                  </p>
                </div>
              ))}
            </Panel>
          </aside>
        </div>

        <section style={{ marginTop: 26, display: "grid", gap: 16 }}>
          {CATEGORY_ORDER.map((categoryId) => {
            const category = data.categories.find((item) => item.id === categoryId);
            const spots = data.spots.filter((spot) => spot.category === categoryId);

            if (!category || spots.length === 0) {
              return null;
            }

            return (
              <div key={categoryId}>
                <h2
                  style={{
                    margin: "0 0 9px",
                    fontSize: 11,
                    fontWeight: 850,
                    letterSpacing: 0.4,
                    color: "var(--muted)"
                  }}
                >
                  {category.label} · {spots.length} 处
                </h2>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                  {spots.map((spot) => (
                    <span
                      key={spot.id}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 5,
                        fontSize: 11,
                        fontWeight: 800,
                        padding: "5px 9px",
                        borderRadius: 6,
                        background: "var(--surface)",
                        border: `1px solid ${spot.story ? "rgb(8 127 122 / 26%)" : "var(--line)"}`,
                        color: "var(--ink)"
                      }}
                    >
                      <i
                        style={{
                          width: 7,
                          height: 7,
                          borderRadius: 7,
                          background: category.color,
                          display: "block"
                        }}
                      />
                      {spot.name}
                      {spot.story ? (
                        <em style={{ fontStyle: "normal", color: "var(--accent-strong)" }}>★</em>
                      ) : null}
                      {spot.verified ? null : (
                        <em style={{ fontStyle: "normal", color: "#a8873c" }}>?</em>
                      )}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </section>

        <section
          style={{
            marginTop: 26,
            padding: "14px 18px",
            borderRadius: 8,
            background: "rgb(255 245 228 / 70%)",
            border: "1px solid rgb(183 132 25 / 34%)"
          }}
        >
          <h2 style={{ margin: "0 0 6px", fontSize: 12, fontWeight: 900, color: "#7a5510" }}>
            待确认事项
          </h2>
          <ul
            style={{
              margin: 0,
              paddingLeft: 18,
              fontSize: 12,
              fontWeight: 700,
              lineHeight: 1.9,
              color: "#6b5220"
            }}
          >
            <li>
              坐标系：当前 <code style={{ fontWeight: 900 }}>{data.park.coordSystem}</code>
              。若锚点是 WGS-84，全部点位会整体偏移 300–500 米。
            </li>
            <li>
              共 {spotCount} 个点位，其中 {storyCount} 个有完整讲解，{unverified.length} 个名称由设计图识读、需甲方书面确认（标{" "}
              <code style={{ fontWeight: 900 }}>?</code>）。
            </li>
            <li>
              含核心点在内全部为设计图估落坐标（<code style={{ fontWeight: 900 }}>isMock: true</code>），不得用于施工定位或安全疏散。
            </li>
            <li>
              图 1 为透视效果图、图 2 为正射布局图，两张图方位不一致；本页按图 2 的正射关系排布，图 1 仅用于点名称与配色。
            </li>
          </ul>
        </section>
      </div>
    </main>
  );
}

const panelStyle: React.CSSProperties = {
  background: "var(--surface)",
  border: "1px solid var(--line)",
  borderRadius: 8,
  boxShadow: "0 12px 28px rgba(31,47,41,0.07)",
  padding: 12
};

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid var(--line)",
        borderRadius: 8,
        boxShadow: "0 12px 28px rgba(31,47,41,0.07)",
        padding: "13px 15px"
      }}
    >
      <h2
        style={{
          margin: "0 0 6px",
          fontSize: 11,
          fontWeight: 850,
          letterSpacing: 0.4,
          color: "var(--muted)"
        }}
      >
        {title}
      </h2>
      {children}
    </div>
  );
}

function Row({ color, label, note }: { color: string; label: string; note?: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 9,
        padding: "6px 0",
        borderBottom: "1px solid var(--line)"
      }}
    >
      <span
        style={{
          width: 9,
          height: 9,
          borderRadius: 9,
          background: color,
          flex: "0 0 auto"
        }}
      />
      <span style={{ fontSize: 12.5, fontWeight: 800, color: "var(--ink)", flex: 1 }}>
        {label}
      </span>
      {note ? (
        <span style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)" }}>{note}</span>
      ) : null}
    </div>
  );
}
