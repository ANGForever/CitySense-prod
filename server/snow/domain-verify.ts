/**
 * 微信「业务域名」所有权校验文件的白名单（design 3.3 / T-003）。
 *
 * 小程序后台配置 web-view 业务域名时，会要求把官方下发的校验文件放到
 * https://<域名>/MP_verify_XXXX.txt，且必须能从公网直接读到。
 *
 * 为什么不用 Next 的 public/ 静态目录：next start 的静态文件清单是构建时
 * 生成的，部署后再往 public/ 放文件不会生效（实测 404）。而校验文件名由
 * 微信后台随机生成，改一次就要重新构建一遍生产包，交付时太容易漏。
 * 因此改由运行时路由读取服务器 public/ 下的同名文件，放文件即生效。
 *
 * 安全约束：只接受微信官方校验文件的固定命名。正则把字符集锁死在
 * [A-Za-z0-9]，路径分隔符、点号 traversal、查询串和任意文件名都进不来，
 * 因此可以先校验再拼路径，不需要依赖各平台对 basename 的处理差异。
 */

/**
 * 校验文件有两种命名，实测都要支持：
 * - 文档常见写法 `MP_verify_XXXX.txt` / `WW_verify_XXXX.txt`；
 * - 小程序后台「业务域名」实际下载的是**随机名**，例如 `kfxW3OKXVQ.txt`
 *   （内容为 32 位十六进制 token，无换行）。
 *
 * 随机名分支锁在 8–32 位纯字母数字，不接受点号、下划线、斜杠或查询串，
 * 所以 robots.txt(6)、foo.bar.txt、../.env 都进不来；路由又只从 public/
 * 读同名文件，未放置的文件一律 404，不存在任意文件读取面。
 */
export const WECHAT_VERIFY_FILE =
  /^(?:(?:MP|WW)_verify_[A-Za-z0-9]{6,80}|[A-Za-z0-9]{8,32})\.txt$/;

export function isWechatVerifyFile(name: unknown): name is string {
  return typeof name === "string" && WECHAT_VERIFY_FILE.test(name);
}

/**
 * 返回服务器上的绝对路径，非法文件名返回 null。
 * 用 path.basename 再兜一层，避免不同平台对分隔符的处理差异。
 */
export function wechatVerifyFilePath(
  publicDir: string,
  name: unknown
): string | null {
  if (!isWechatVerifyFile(name)) {
    return null;
  }

  return `${publicDir.replace(/[\\/]+$/, "")}/${name}`;
}
