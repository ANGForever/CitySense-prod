import { useMemo } from "react";
import Taro, { useRouter } from "@tarojs/taro";
import { Text, View, WebView } from "@tarojs/components";
import { h5Host } from "../../services/config";
import { buildWebViewUrl, parseEntryParams } from "../../services/entry";

/**
 * 地图容器页（design 4.1 / T-502）。
 *
 * 页面里只能有 web-view：它会自动铺满整个小程序页面，任何同级原生组件都会被盖住。
 * 需要原生展示的加载失败态，必须先不渲染 WebView，否则用户看不到。
 *
 * 参数只在进入时消费一次，不依赖 wx.miniProgram.postMessage 做实时联动
 * （design 3.3：它只在后退/销毁/分享时送达）。
 */
export default function MapPage() {
  const router = useRouter();
  const raw = router.params as Record<string, string | undefined>;

  const parsed = useMemo(() => parseEntryParams(raw), [raw]);
  const openAgent = raw.openAgent === "1";

  const src = useMemo(
    () =>
      parsed.valid
        ? buildWebViewUrl({
            spotId: parsed.spotId,
            routeId: parsed.routeId,
            entry: parsed.entry,
            openAgent
          })
        : null,
    [parsed, openAgent]
  );

  const goEntryError = (reason: string) => {
    void Taro.redirectTo({ url: `/pages/entry-error/index?reason=${reason}` });
  };

  if (!parsed.valid) {
    return <Fallback text="入口参数不合法：点位或游线编号格式不正确。" onBack={() => goEntryError("invalid-spot")} />;
  }

  if (!src) {
    return (
      <Fallback
        text={`web-view 业务域名未配置或不是 https：${h5Host() || "未配置"}。请在构建环境设置 TARO_APP_H5_BASE 并在小程序后台登记业务域名。`}
        onBack={() => goEntryError("h5-not-configured")}
      />
    );
  }

  return (
    <WebView
      src={src}
      onError={() => goEntryError("h5-load-failed")}
    />
  );
}

function Fallback({ text, onBack }: { text: string; onBack: () => void }) {
  return (
    <View className="page">
      <Text className="error-icon">◇</Text>
      <Text className="error-title">地图暂时无法打开</Text>
      <Text className="muted error-desc">{text}</Text>
      <View className="btn-row">
        <View className="btn-ghost" hoverClass="none" onClick={onBack}>
          <Text>排查说明</Text>
        </View>
        <View
          className="btn-primary"
          hoverClass="none"
          onClick={() => void Taro.reLaunch({ url: "/pages/index/index" })}
        >
          <Text>返回首页</Text>
        </View>
      </View>
    </View>
  );
}
