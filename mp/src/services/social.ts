import Taro from "@tarojs/taro";

/**
 * 官方媒体能力（design 9 / T-701、T-702）。
 *
 * 视频号主页只能由小程序原生侧调用 openChannelsUserProfile；H5 里没有这个能力。
 * 抖音只做账号信息展示，不实现也不承诺从微信强制唤起 App，不使用 Deep Link。
 */

export type ChannelResult = { ok: boolean; message: string };

export async function openChannelsUserProfile(
  finderUserName: string | undefined
): Promise<ChannelResult> {
  const name = (finderUserName ?? "").trim();

  if (!name) {
    return { ok: false, message: "主办方尚未配置视频号账号，暂不提供跳转。" };
  }

  try {
    await Taro.openChannelsUserProfile({ finderUserName: name });
    return { ok: true, message: "" };
  } catch {
    // 不把平台错误码/内部栈直接展示给游客，也不做自动重试死循环
    return {
      ok: false,
      message: "当前微信环境无法打开视频号主页，可能是账号关联或接口权限未通过。请稍后再试。"
    };
  }
}
