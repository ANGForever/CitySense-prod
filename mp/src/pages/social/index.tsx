import { useCallback, useEffect, useState } from "react";
import Taro from "@tarojs/taro";
import { Text, View } from "@tarojs/components";
import { loadBootstrap, type LoadResult } from "../../services/snow-api";
import { openChannelsUserProfile } from "../../services/social";

/**
 * 官方媒体页（design 9 / T-701、T-702）。
 *
 * 视频号跳转是原生 API，只能在这里调用；抖音只展示账号信息，不做 App 唤起。
 * 两类状态分开表述：视频号跳转通过 / 抖音信息展示通过 / 抖音直接跳转未实现。
 * G4 未通过时如实标注，不预报成功。
 */
export default function SocialPage() {
  const [result, setResult] = useState<LoadResult | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    void loadBootstrap().then(setResult);
  }, []);

  const social = result?.data.social;
  const finderUserName = social?.finderUserName?.trim() ?? "";
  const channelsConfigured = Boolean(social?.channelsEnabled && finderUserName);
  const douyinName = social?.douyinAccountName?.trim() ?? "";

  const openChannels = useCallback(async () => {
    if (!channelsConfigured) {
      setMessage("主办方尚未配置视频号账号，或主体关联/接口权限未通过校验。");
      return;
    }

    const outcome = await openChannelsUserProfile(finderUserName);
    setMessage(outcome.ok ? "" : outcome.message);
  }, [channelsConfigured, finderUserName]);

  return (
    <View className="page">
      <View className="hero">
        <Text className="hero-kicker">OFFICIAL CHANNELS</Text>
        <Text className="hero-title">官方媒体</Text>
        <Text className="hero-desc">园区官方账号信息与平台能力状态</Text>
      </View>

      <Text className="section-title">微信视频号</Text>
      <View className="card card-muted">
        <View className="card-body">
          <Text className="card-title">视频号主页</Text>
          <Text className="card-desc">
            {channelsConfigured
              ? "点击右侧按钮在微信内打开主办方视频号主页。"
              : "账号尚未配置或主体关联未核对，暂不开放跳转入口。"}
          </Text>
        </View>
        <Text className="badge">{channelsConfigured ? "已配置" : "待配置"}</Text>
      </View>

      {channelsConfigured && (
        <View className="btn-primary" hoverClass="none" onClick={() => void openChannels()}>
          <Text>打开视频号主页</Text>
        </View>
      )}

      {message ? <View className="notice"><Text>{message}</Text></View> : null}

      <Text className="section-title">抖音官方账号</Text>
      <View className="card">
        <View className="card-body">
          <Text className="card-title">{douyinName || "账号信息待提供"}</Text>
          <Text className="card-desc">
            {douyinName
              ? "仅展示主办方提供的官方账号名称，请自行在对应平台搜索。"
              : "主办方尚未提供可授权的账号名称与头像素材。"}
          </Text>
        </View>
        <Text className="badge">信息展示</Text>
      </View>

      <View className="notice">
        <Text>
          合规说明：本 Demo 不承诺从微信拉起抖音 App，不使用未核实的 Deep Link
          或重定向链。「抖音直接跳转」不在本轮范围内。
        </Text>
      </View>

      <View className="footnote">
        <Text className="muted">
          资料来源：{result?.source === "network" ? "园区接口" : "本地/离线清单"}　·　
          G4 真机跳转结果以验收记录为准
        </Text>
        <Text className="muted">
          未通过的平台能力不得显示为已上线；媒体入口不影响地图与 AI 伴游验收。
        </Text>
      </View>

      <View
        className="btn-ghost"
        style={{ marginTop: "20px" }}
        hoverClass="none"
        onClick={() => void Taro.reLaunch({ url: "/pages/index/index" })}
      >
        <Text>返回首页</Text>
      </View>
    </View>
  );
}
