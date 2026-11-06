/**
 * H5 → 小程序跳转桥接的安全边界（design 3.3 / T-307）。
 *
 * 用轻量 window mock 覆盖两条约束：跳转目标必须是白名单内的原生页；
 * 非微信环境绝不加载 JSSDK、也不假装跳转成功。
 */

import assert from "node:assert/strict";
import test from "node:test";
import {
  ensureWechatBridge,
  MP_SCAN_PATH,
  MP_SOCIAL_PATH,
  openNativePage
} from "@/components/snow/miniprogram";

type FakeWindow = {
  navigator: { userAgent: string };
  wx?: { miniProgram?: { navigateTo: (options: { url: string }) => void } };
  __wxjs_environment?: string;
  setTimeout?: typeof setTimeout;
  clearTimeout?: typeof clearTimeout;
};

function installWindow(value: FakeWindow): void {
  Object.defineProperty(globalThis, "window", {
    value,
    configurable: true,
    writable: true
  });
}

function removeWindow(): void {
  Reflect.deleteProperty(globalThis, "window");
}

function browser(userAgent = "Mozilla/5.0 (Windows NT 10.0)"): FakeWindow {
  return {
    navigator: { userAgent },
    setTimeout,
    clearTimeout
  };
}

test("只跳转白名单内的原生页", () => {
  const calls: string[] = [];
  const win = browser();
  win.wx = {
    miniProgram: { navigateTo: ({ url }) => calls.push(url) }
  };

  installWindow(win);
  try {
    assert.equal(openNativePage(MP_SOCIAL_PATH), true);
    // 地图页中心扫码按钮的目标页必须已登记，否则真机点击会静默失败
    assert.equal(openNativePage(MP_SCAN_PATH), true);
    assert.deepEqual(calls, [MP_SOCIAL_PATH, MP_SCAN_PATH]);
  } finally {
    removeWindow();
  }
});

test("拒绝外部 URL、路径穿越与带多余参数的路径", () => {
  const calls: string[] = [];
  const win = browser();
  win.wx = {
    miniProgram: { navigateTo: ({ url }) => calls.push(url) }
  };

  installWindow(win);
  try {
    const rejected = [
      "https://evil.example.com/pages/social/index",
      "/pages/../pages/social/index",
      "//pages/social/index",
      "/pages/social/index?redirect=https://evil.example.com",
      "/pages/social/index\\evil",
      "/pages/unknown/index"
    ];

    for (const path of rejected) {
      assert.equal(openNativePage(path), false, `应拒绝: ${path}`);
    }

    assert.deepEqual(calls, []);
  } finally {
    removeWindow();
  }
});

test("普通浏览器不加载 JSSDK，直接返回 false", async () => {
  installWindow(browser());
  try {
    assert.equal(await ensureWechatBridge(), false);
    assert.equal(openNativePage(MP_SOCIAL_PATH), false);
  } finally {
    removeWindow();
  }
});

test("微信 WebView 里 JSSDK 已就绪时立即放行", async () => {
  const win = browser("Mozilla/5.0 miniProgram WEIXIN");
  win.__wxjs_environment = "miniprogram";
  win.wx = { miniProgram: { navigateTo: () => undefined } };

  installWindow(win);
  try {
    assert.equal(await ensureWechatBridge(), true);
  } finally {
    removeWindow();
  }
});
