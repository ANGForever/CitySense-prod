import { useEffect, useMemo, useState } from "react";
import Taro, { useRouter } from "@tarojs/taro";
import { Text, View } from "@tarojs/components";
import { isH5Configured } from "../../services/config";
import { parseEntryParams } from "../../services/entry";
import { loadBootstrap, type LoadResult } from "../../services/snow-api";

/**
 * 原生展品详情页（design 4.1 / T-503 / T-602）。
 * 二维码、NFC、首页列表共用这一页；spotId 先过正则，再在 bootstrap 中查找，
 * 两层都不过就进错误页，不会白屏也不会跳转任意外部 URL。
 */

const CATEGORY_LABEL: Record<string, string> = {
  "ice-art": "冰雕艺术",
  "snow-play": "戏雪互动",
  lantern: "燃灯景观",
  prayer: "祈福互动",
  lake: "湖面彩灯",
  gate: "园区入口"
};

export default function SpotPage() {
  const router = useRouter();
  const raw = router.params as Record<string, string | undefined>;
  const parsed = useMemo(() => parseEntryParams(raw), [raw]);
  const [result, setResult] = useState<LoadResult | null>(null);

  useEffect(() => {
    if (!parsed.valid || !parsed.spotId) {
      void Taro.redirectTo({ url: "/pages/entry-error/index?reason=invalid-spot" });
      return;
    }

    void loadBootstrap().then(setResult);
  }, [parsed.valid, parsed.spotId]);

  if (!parsed.valid || !parsed.spotId) {
    return (
      <View className="page">
        <Text className="muted">正在校验入口参数…</Text>
      </View>
    );
  }

  const spotId = parsed.spotId;
  const spot = result?.data.spots.find((item) => item.id === spotId) ?? null;

  const openMap = (withAgent: boolean) => {
    if (!isH5Configured) {
      void Taro.showToast({ title: "业务域名未配置", icon: "none" });
      return;
    }

    const query = `spot=${spotId}&entry=${parsed.entry}${withAgent ? "&openAgent=1" : ""}`;
    void Taro.navigateTo({ url: `/pages/map/index?${query}` });
  };

  if (!result) {
    return (
      <View className="page">
        <Text className="muted">正在加载展品资料…</Text>
      </View>
    );
  }

  if (!spot) {
    return (
      <View className="page">
        <Text className="error-icon">◇</Text>
        <Text className="error-title">没有找到这个景观</Text>
        <Text className="muted error-desc">
          编号 {spotId} 不在当前园区数据中。演示数据不会为新编号临时创建展品。
        </Text>
        <View
          className="btn-primary"
          hoverClass="none"
          onClick={() => void Taro.reLaunch({ url: "/pages/index/index" })}
        >
          <Text>返回首页</Text>
        </View>
      </View>
    );
  }

  return (
    <View className="page">
      <View className="spot-art">
        <Text>{spot.name.slice(0, 2)}</Text>
      </View>

      <View style={{ marginTop: "16px" }}>
        <Text className="card-title">{spot.name}</Text>
        <Text className="badge badge-accent">演示数据</Text>
        {spot.verified === false && <Text className="badge">名称待校对</Text>}
        <Text className="muted" style={{ display: "block", marginTop: "6px" }}>
          {CATEGORY_LABEL[spot.category] ?? "园区景观"}　·　编号 {spot.id}
        </Text>
      </View>

      <View className="tag-row">
        {spot.tags.map((tag) => (
          <Text className="tag" key={tag}>{tag}</Text>
        ))}
      </View>

      <Text className="section-title">景观介绍</Text>
      <Text className="story">{spot.summary ?? "该点位暂无演示摘要。"}</Text>
      {spot.story ? (
        <Text className="story">{spot.story}</Text>
      ) : (
        <Text className="muted" style={{ display: "block", marginTop: "10px" }}>
          完整讲解需联网后从园区接口加载；当前使用离线清单，不虚构展品故事。
        </Text>
      )}

      <View className="btn-row">
        <View className="btn-ghost" hoverClass="none" onClick={() => openMap(false)}>
          <Text>3D 地图查看</Text>
        </View>
        <View className="btn-primary" hoverClass="none" onClick={() => openMap(true)}>
          <Text>AI 讲解</Text>
        </View>
      </View>

      <View className="footnote">
        <Text className="muted">
          资料来源：{sourceLabel(result.source)}　·　入口：{parsed.entry}
        </Text>
        <Text className="muted">
          入口来源仅用于标注，不代表该来源已通过平台安全校验。
        </Text>
      </View>
    </View>
  );
}

function sourceLabel(source: LoadResult["source"]): string {
  if (source === "network") return "园区接口";
  if (source === "cache") return "本地缓存";
  return "离线清单";
}
