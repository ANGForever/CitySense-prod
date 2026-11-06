"use client";

/**
 * H5 → 微信小程序原生页面的跳转桥接。
 *
 * design 3.3 的约束：
 * - web-view 自动铺满页面，H5 内不能用 Taro 原生组件做浮层，所以媒体页这类
 *   「需要微信原生 API」的功能必须由 H5 触发 navigateTo 跳到原生页。
 * - wx.miniProgram.postMessage 只在页面后退、销毁、分享等时机送达，
 *   **禁止**用它做相机或 UI 的实时控制。本模块只暴露一次性跳转，不做消息通道。
 * - 非微信环境（普通浏览器、自测 iframe）里 JSSDK 不存在，必须提供无害降级，
 *   不能让按钮点了没反应。
 */

type NavigateResult = { errMsg?: string };

type MiniProgramBridge = {
  navigateTo(options: {
    url: string;
    success?: (result: NavigateResult) => void;
    fail?: (error: NavigateResult) => void;
  }): void;
};

declare global {
  interface Window {
    wx?: { miniProgram?: MiniProgramBridge };
    __wxjs_environment?: string;
  }
}

/**
 * 允许跳转的原生页面白名单。
 * 只接受相对的小程序页面路径，URL 参数仅承载展示意图（spotId / entry），
 * 不接受外部 URL、协议、反斜杠或任意路径 —— 参数本身还要在原生页再次校验。
 */
const ALLOWED_NATIVE_PAGES = new Set([
  "/pages/index/index",
  "/pages/map/index",
  "/pages/spot/index",
  "/pages/social/index",
  "/pages/scan/index",
  "/pages/entry-error/index"
]);

export const MP_SOCIAL_PATH = "/pages/social/index";
/** 地图页中心扫码按钮的目标：原生页持有 Taro.scanCode 能力 */
export const MP_SCAN_PATH = "/pages/scan/index";

const SAFE_PATH = /^\/pages\/[a-z-]+\/index(?:\?[A-Za-z0-9_=&%-]*)?$/;

/** 微信 web-view 内 JSSDK 会注入 __wxjs_environment；UA 作为兼容兜底 */
export function isMiniProgramEnv(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  return (
    window.__wxjs_environment === "miniprogram" ||
    /miniProgram/i.test(window.navigator.userAgent)
  );
}

function isAllowedNativePath(path: string): boolean {
  if (!SAFE_PATH.test(path) || path.includes("//") || path.includes("\\")) {
    return false;
  }

  const pathname = path.split("?")[0];

  return ALLOWED_NATIVE_PAGES.has(pathname);
}

/** 微信 JSSDK：web-view 内调用 wx.miniProgram.* 必须引入，客户端不会自动提供 */
const WECHAT_JSSDK_SRC = "https://res.wx.qq.com/open/js/jweixin-1.6.0.js";
const SDK_TIMEOUT_MS = 5000;
let sdkPromise: Promise<boolean> | null = null;

function hasMiniProgramBridge(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.wx?.miniProgram?.navigateTo === "function"
  );
}

/**
 * 确保 JSSDK 就绪后再跳原生页。
 *
 * 只在微信 WebView 内发起外部请求：普通浏览器立即返回 false，由调用方落到
 * H5 降级页；加载失败或 5 秒超时同样返回 false，不会让按钮点了没反应。
 * 超时后清空缓存，下一次点击仍能重试。
 *
 * 不用 postMessage 做实时联动（design 3.3），这里只解决「JSSDK 对象是否存在」。
 */
export function ensureWechatBridge(): Promise<boolean> {
  if (typeof window === "undefined" || !isMiniProgramEnv()) {
    return Promise.resolve(false);
  }

  if (hasMiniProgramBridge()) {
    return Promise.resolve(true);
  }

  if (sdkPromise) {
    return sdkPromise;
  }

  sdkPromise = new Promise<boolean>((resolve) => {
    let script = document.querySelector<HTMLScriptElement>(
      "script[data-snow-wechat-sdk]"
    );
    let settled = false;

    const finish = () => {
      if (settled) {
        return;
      }

      settled = true;
      sdkPromise = null;
      resolve(hasMiniProgramBridge());
    };

    const timer = window.setTimeout(finish, SDK_TIMEOUT_MS);

    if (!script) {
      script = document.createElement("script");
      script.src = WECHAT_JSSDK_SRC;
      script.async = true;
      script.dataset.snowWechatSdk = "1";
      document.head.appendChild(script);
    }

    script.addEventListener(
      "load",
      () => {
        window.clearTimeout(timer);
        finish();
      },
      { once: true }
    );
    script.addEventListener(
      "error",
      () => {
        window.clearTimeout(timer);
        console.warn("[snow] 微信 JSSDK 加载失败，原生跳转降级为 H5 页面");
        finish();
      },
      { once: true }
    );
  });

  return sdkPromise;
}

/**
 * 尝试打开原生页。
 * 返回 true 只表示「已向 JSSDK 发起跳转」，不代表页面真的打开成功；
 * 返回 false 时调用方必须自己走 H5 降级，不要静默失败。
 */
export function openNativePage(path: string): boolean {
  if (typeof window === "undefined" || !isAllowedNativePath(path)) {
    return false;
  }

  const bridge = window.wx?.miniProgram;

  if (!bridge || typeof bridge.navigateTo !== "function") {
    return false;
  }

  try {
    bridge.navigateTo({
      url: path,
      fail: (error) => {
        // 原生页未注册、域名未配置时给一条可检索的诊断，不抛到渲染流程里
        console.warn("[snow] 原生页跳转失败", error?.errMsg ?? error);
      }
    });
    return true;
  } catch {
    return false;
  }
}
