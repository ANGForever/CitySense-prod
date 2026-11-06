/**
 * 微信业务域名校验文件白名单回归（T-003）。
 *
 * 这个路由放在根级动态段上，一旦放宽就是任意文件读取面，
 * 所以把「合法文件名」和「一律拒绝的输入」都锁成用例。
 */

import assert from "node:assert/strict";
import test from "node:test";
import {
  isWechatVerifyFile,
  wechatVerifyFilePath
} from "@/server/snow/domain-verify";

test("接受微信官方校验文件的两种命名", () => {
  assert.equal(isWechatVerifyFile("MP_verify_aB3dE9xY2k.txt"), true);
  assert.equal(isWechatVerifyFile("WW_verify_1234567890abcdef.txt"), true);
  // 小程序后台「业务域名」实际下载的随机名，2026-11-06 用户提供
  assert.equal(isWechatVerifyFile("kfxW3OKXVQ.txt"), true);
  assert.equal(
    wechatVerifyFilePath("/srv/snow/public", "kfxW3OKXVQ.txt"),
    "/srv/snow/public/kfxW3OKXVQ.txt"
  );
});

test("拒绝路径穿越、任意文件名与非 txt 后缀", () => {
  const rejected = [
    "../.env",
    "MP_verify_../../secret.txt",
    "MP_verify_abc/../../.env",
    "MP_verify_a%2e%2e.txt",
    "mp_verify_abcdef.txt", // 前缀大小写不符
    "MP_verify_abc.txt", // 太短
    "MP_verify_abcdef.js",
    "MP_verify_abcdef.txt?x=1",
    "robots.txt", // 随机名分支要求 8–32 位
    "abcdefg.txt", // 7 位，太短
    "foo.bar.txt", // 随机名不允许点号
    "kfxW3OKXVQ.exe", // 后缀必须是 .txt
    "",
    null,
    undefined,
    42
  ];

  for (const value of rejected) {
    assert.equal(isWechatVerifyFile(value), false, `应拒绝: ${String(value)}`);
    assert.equal(wechatVerifyFilePath("/srv/snow/public", value), null);
  }
});

test("合法文件名拼出的路径仍在 public 目录内", () => {
  const file = wechatVerifyFilePath(
    "/srv/snow/public/",
    "MP_verify_aB3dE9xY2k.txt"
  );

  assert.equal(file, "/srv/snow/public/MP_verify_aB3dE9xY2k.txt");
});
