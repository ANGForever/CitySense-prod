import Taro, { useRouter } from "@tarojs/taro";
import { Text, View } from "@tarojs/components";

/**
 * 入口错误页（design 4.1 / T-503 / T-605）。
 * NFC 未获批、二维码参数无效、业务域名未配置、H5 加载失败都落到这里，
 * 给出具体原因与回首页路径，不做静默跳转，也不把二维码成功包装成 NFC 通过。
 */

type ReasonInfo = { title: string; desc: string };

const REASONS: Record<string, ReasonInfo> = {
  "invalid-spot": {
    title: "展品编号不可用",
    desc: "入口携带的点位编号格式不正确，或不在当前园区数据中。请从首页重新进入，或换个二维码试试。"
  },
  "scan-invalid": {
    title: "这不是受支持的展品码",
    desc: "二维码内容不是本 Demo 的受控点位标识。为安全起见，页面不会跳转外部链接，也不会执行码内指令。"
  },
  "h5-not-configured": {
    title: "业务域名未配置",
    desc: "请在构建环境设置 TARO_APP_H5_BASE（仅 https origin），并在小程序后台登记 web-view 业务域名与域名所有权校验文件。"
  },
  "h5-load-failed": {
    title: "3D 地图加载失败",
    desc: "请检查网络、HTTPS 证书与业务域名白名单。地图 H5 内部也有二维示意图降级，本页是 WebView 整体加载失败的兜底。"
  },
  "nfc-unavailable": {
    title: "NFC 能力尚未开放",
    desc: "官方 NFC 标签唤起小程序能力仍在审批或当前设备不支持，请改用展牌上的二维码进入同一展品。"
  }
};

const UNKNOWN: ReasonInfo = {
  title: "这个入口暂时无法使用",
  desc: "入口参数缺失或已失效。请返回首页重新进入；若反复出现，请把入口来源与编号反馈给演示负责人。"
};

export default function EntryErrorPage() {
  const router = useRouter();
  const reason = (router.params?.reason ?? "").trim();
  const info = REASONS[reason] ?? UNKNOWN;

  return (
    <View className="page">
      <Text className="error-icon">◇</Text>
      <Text className="error-title">{info.title}</Text>
      <Text className="muted error-desc">{info.desc}</Text>

      <View className="notice">
        <Text>
          演示版不会为无效编号创建新展品，也不会把未审批通过的平台能力标为成功。
        </Text>
      </View>

      <View
        className="btn-primary"
        style={{ marginTop: "24px" }}
        hoverClass="none"
        onClick={() => void Taro.reLaunch({ url: "/pages/index/index" })}
      >
        <Text>返回首页</Text>
      </View>

      <View className="footnote">
        <Text className="muted">原因代码：{reason || "unknown"}</Text>
      </View>
    </View>
  );
}
