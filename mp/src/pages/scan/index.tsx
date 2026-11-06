import { useCallback, useEffect, useRef, useState } from "react";
import Taro from "@tarojs/taro";
import { Text, View } from "@tarojs/components";
import { spotIdFromScan } from "../../services/entry";

/**
 * 原生扫码页（地图页中心扫码按钮的目标）。
 *
 * H5 web-view 内没有 Taro.scanCode，必须跳到这里扫；扫码内容只用于提取
 * 受控 spotId，绝不作为跳转目标（T-801）。成功后用 reLaunch 重新打开地图
 * 容器页，WebView 会按 URL 参数重载并预选点位 —— 这一重载与 3D 相机状态
 * 丢失已在设计评审中确认接受。
 */
export default function ScanPage() {
  const [status, setStatus] = useState<"scanning" | "invalid" | "failed">("scanning");
  const started = useRef(false);

  const scan = useCallback(async () => {
    setStatus("scanning");

    try {
      const scanned = await Taro.scanCode({ onlyFromCamera: false });
      const spotId = spotIdFromScan(scanned.result);

      if (!spotId) {
        setStatus("invalid");
        return;
      }

      void Taro.reLaunch({
        url: `/pages/map/index?spot=${encodeURIComponent(spotId)}&entry=qr`
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      // 用户主动取消：退回上一页，不展示错误
      if (/cancel/i.test(message)) {
        void Taro.navigateBack();
        return;
      }

      setStatus("failed");
    }
  }, []);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void scan();
  }, [scan]);

  return (
    <View className="page brand-scan">
      <View className="brand-scan-card">
        <Text className="brand-scan-title">扫描展牌二维码</Text>
        <Text className="brand-scan-desc">
          对准园区景观展牌上的二维码，即可在 3D 地图里查看这个点位。
        </Text>

        {status === "scanning" && (
          <Text className="brand-scan-state">正在打开相机…</Text>
        )}
        {status === "invalid" && (
          <Text className="brand-scan-state">
            这张码不是园区点位码，请换一张展牌再试。
          </Text>
        )}
        {status === "failed" && (
          <Text className="brand-scan-state">扫码未完成，请重试。</Text>
        )}

        {status !== "scanning" && (
          <View className="brand-scan-actions">
            <View className="brand-btn-primary" hoverClass="none" onClick={() => void scan()}>
              <Text>重新扫码</Text>
            </View>
            <View className="brand-btn-ghost" hoverClass="none" onClick={() => void Taro.navigateBack()}>
              <Text>返回地图</Text>
            </View>
          </View>
        )}
      </View>

      <View className="brand-scan-note">
        <Text>扫码内容只用于匹配点位编号，不会打开任意网页链接。</Text>
      </View>
    </View>
  );
}
