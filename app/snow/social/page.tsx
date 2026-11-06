/**
 * H5 媒体页 —— 非微信环境的降级入口。
 *
 * design T-307：微信 web-view 内点击「官方媒体」应通过 JSSDK 跳原生页
 * （视频号 API 只有原生侧能调）；普通浏览器里 JSSDK 不存在，就落到这里，
 * 展示同样的账号信息但不假装能唤起任何 App。
 *
 * 这里不引入微信 JSSDK，也不尝试任何 Deep Link。G4 未通过时如实说明。
 */

import Link from "next/link";
import { buildBootstrap } from "@/server/snow/data";

// social 字段来自运行时环境变量，不能用静态生成把它固化在构建产物里
export const dynamic = "force-dynamic";

export const metadata = {
  title: "官方媒体 · 青唐冰雪节"
};

export default function SnowSocialFallbackPage() {
  const { social, park } = buildBootstrap();
  const hasDouyin = Boolean(social.douyinAccountName?.trim());
  const hasChannels = social.channelsEnabled && Boolean(social.finderUserName?.trim());

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "var(--bg)",
        padding: "48px 20px 64px"
      }}
    >
      <div style={{ maxWidth: 680, margin: "0 auto" }}>
        <p
          style={{
            margin: 0,
            fontSize: 10,
            fontWeight: 850,
            letterSpacing: 1.8,
            color: "var(--muted)"
          }}
        >
          {park.title} · OFFICIAL CHANNELS
        </p>

        <h1
          style={{
            margin: "8px 0 6px",
            fontSize: 30,
            fontWeight: 900,
            letterSpacing: -0.6,
            color: "var(--ink)"
          }}
        >
          官方媒体
        </h1>

        <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "var(--muted)" }}>
          当前为浏览器降级视图 · 微信内将从地图跳转到小程序原生页
        </p>

        <section style={{ display: "grid", gap: 10, marginTop: 26 }}>
          <Panel title="微信视频号" badge={hasChannels ? "已配置" : "待配置"}>
            {hasChannels ? (
              <p>
                在微信小程序内打开「官方媒体」页可进入视频号主页。浏览器环境不具备
                <code> Taro.openChannelsUserProfile </code>
                能力，因此这里不提供跳转按钮。
              </p>
            ) : (
              <p>
                尚未配置 <code>finderUserName</code>，或账号主体关联未通过平台校验。
                G4 门禁未通过前不开放跳转入口。
              </p>
            )}
          </Panel>

          <Panel title="抖音官方账号" badge={hasDouyin ? "信息展示" : "待配置"}>
            {hasDouyin ? (
              <p>
                官方账号名称：<strong>{social.douyinAccountName}</strong>
              </p>
            ) : (
              <p>主办方尚未提供可授权的账号名称与头像素材。</p>
            )}
            <p>
              按微信平台规则，本 Demo 只做账号信息展示，不尝试从微信强制唤起抖音 App，
              也不使用未核实的 Deep Link。
            </p>
          </Panel>
        </section>

        <Link
          href="/snow"
          style={{
            display: "inline-block",
            marginTop: 26,
            padding: "11px 18px",
            borderRadius: 8,
            background: "var(--accent)",
            color: "#fff",
            fontSize: 13,
            fontWeight: 850
          }}
        >
          返回园区地图
        </Link>

        <footer
          style={{
            marginTop: 34,
            paddingTop: 16,
            borderTop: "1px solid var(--line)",
            fontSize: 11.5,
            fontWeight: 700,
            lineHeight: 1.9,
            color: "var(--muted)"
          }}
        >
          演示版 · 媒体账号与跳转能力以平台实际审批和真机验证为准；未通过的能力不得标为已上线。
        </footer>
      </div>
    </main>
  );
}

function Panel({
  title,
  badge,
  children
}: {
  title: string;
  badge: string;
  children: React.ReactNode;
}) {
  return (
    <section
      style={{
        padding: "16px 18px",
        borderRadius: 8,
        background: "var(--surface)",
        border: "1px solid var(--line)",
        borderLeft: "4px solid var(--accent)",
        boxShadow: "0 10px 24px rgba(31,47,41,0.07)"
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <h2 style={{ margin: 0, fontSize: 15, fontWeight: 900, color: "var(--ink)" }}>
          {title}
        </h2>
        <span
          style={{
            fontSize: 10,
            fontWeight: 850,
            padding: "1px 6px",
            borderRadius: 4,
            background: "rgb(8 127 122 / 10%)",
            color: "var(--accent-strong)"
          }}
        >
          {badge}
        </span>
      </div>
      <div
        style={{
          marginTop: 8,
          fontSize: 12.5,
          fontWeight: 700,
          lineHeight: 1.85,
          color: "var(--muted)"
        }}
      >
        {children}
      </div>
    </section>
  );
}
