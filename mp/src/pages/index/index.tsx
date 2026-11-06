import { useCallback, useEffect, useState } from "react";
import Taro from "@tarojs/taro";
import { Text, View } from "@tarojs/components";
import { h5Host, isApiConfigured, isH5Configured } from "../../services/config";
import { loadBootstrap, type LoadResult } from "../../services/snow-api";

/**
 * 小程序品牌首页（design 4.1 / T-501）。
 *
 * 与 H5 门户共用红金雪白品牌色系，但这里不嵌 H5 的 KV 位图，用品牌色块 +
 * 文字保持统一且控制包体积。只保留真实可用的入口，不出现购物/领券等假按钮。
 */
const BRAND_FULL = "青海·青唐城第三届冰雪烩";
const BRAND_SLOGAN = "期待与您携手，点亮西宁最热闹的年";

export default function IndexPage() {
  const [result, setResult] = useState<LoadResult | null>(null);

  useEffect(() => {
    void loadBootstrap().then(setResult);
  }, []);

  const openMap = useCallback((query = "entry=home") => {
    if (!isH5Configured) {
      void Taro.navigateTo({ url: "/pages/entry-error/index?reason=h5-not-configured" });
      return;
    }

    void Taro.navigateTo({ url: `/pages/map/index?${query}` });
  }, []);

  const data = result?.data;
  const synced = result?.source === "network";
  const storyCount = data?.spots.filter((spot) => Boolean(spot.story)).length ?? 0;

  return (
    <View className="page brand-home">
      <View className="brand-hero">
        <Text className="brand-hero-kicker">青 唐 城</Text>
        <Text className="brand-hero-title">第三届冰雪烩</Text>
        <Text className="brand-hero-slogan">{BRAND_SLOGAN}</Text>
        <Text className="brand-hero-full">{BRAND_FULL}</Text>
      </View>

      <View className="brand-cta" hoverClass="none" onClick={() => openMap()}>
        <Text>进入 3D 园区</Text>
        <Text>→</Text>
      </View>

      <View className="brand-entries">
        <View className="brand-entry" hoverClass="none" onClick={() => openMap("entry=home")}>
          <Text className="brand-entry-title">精选游线</Text>
          <Text className="brand-entry-desc">
            {synced ? `${data?.routes.length} 条游线` : "按时间与人群推荐"}
          </Text>
        </View>
        <View
          className="brand-entry"
          hoverClass="none"
          onClick={() => void Taro.navigateTo({ url: "/pages/scan/index" })}
        >
          <Text className="brand-entry-title">扫展品码</Text>
          <Text className="brand-entry-desc">扫描展牌，直达点位</Text>
        </View>
        <View
          className="brand-entry"
          hoverClass="none"
          onClick={() => openMap("entry=home&openAgent=1")}
        >
          <Text className="brand-entry-title">AI 伴游</Text>
          <Text className="brand-entry-desc">问问路线与典故</Text>
        </View>
        <View
          className="brand-entry"
          hoverClass="none"
          onClick={() => void Taro.navigateTo({ url: "/pages/social/index" })}
        >
          <Text className="brand-entry-title">官方媒体</Text>
          <Text className="brand-entry-desc">视频号与抖音</Text>
        </View>
      </View>

      <View className="brand-notice">
        <Text>演示版说明：点位按设计图区域级落位，坐标、故事与游线耗时均为演示数据。</Text>
        <Text>
          {synced
            ? `已同步 ${data?.spots.length} 个点位 · ${storyCount} 处有讲解`
            : "园区规模数据待联网同步，当前展示离线清单。"}
        </Text>
        {(!isH5Configured || !isApiConfigured) && (
          <Text>
            环境配置：{!isH5Configured ? "web-view 业务域名未配置；" : ""}
            {!isApiConfigured ? "request 合法域名未配置，使用离线清单；" : ""}
            请在小程序后台登记 {h5Host() || "H5 域名"} 与校验文件。
          </Text>
        )}
      </View>

      <View className="brand-foot">
        <Text>数据版本 {data?.version ?? "加载中"}　·　坐标系 {data?.park.coordSystem ?? "—"}</Text>
        <Text>资料来源：{sourceLabel(result?.source)}</Text>
      </View>
    </View>
  );
}

function sourceLabel(source: LoadResult["source"] | undefined): string {
  if (source === "network") return "园区接口";
  if (source === "cache") return "本地缓存";
  if (source === "offline") return "离线清单";
  return "加载中";
}
