import { defineConfig } from "@tarojs/cli";

/**
 * 小程序构建配置（design 10.2）。
 *
 * TARO_APP_API_BASE / TARO_APP_H5_BASE 由构建环境提供，编译期注入成
 * SNOW_API_BASE / SNOW_H5_BASE 两个常量。运行时服务层还会再做一次 https
 * 与 origin 校验 —— 编译期常量只是配置来源，不是安全边界。
 *
 * 不注入任何模型凭据或高德安全密钥，小程序包里永远不该出现这些值。
 */

const readEnv = (key: string): string => (process.env[key] ?? "").trim();

export default defineConfig({
  projectName: "qingtang-ice-snow",
  date: "2026-11-6",
  designWidth: 750,
  deviceRatio: {
    640: 2.34 / 2,
    750: 1,
    375: 2,
    828: 1.81 / 2
  },
  sourceRoot: "src",
  outputRoot: "dist",
  framework: "react",
  compiler: "webpack5",
  plugins: [],
  defineConstants: {
    SNOW_API_BASE: JSON.stringify(readEnv("TARO_APP_API_BASE")),
    SNOW_H5_BASE: JSON.stringify(readEnv("TARO_APP_H5_BASE"))
  },
  copy: { patterns: [], options: {} },
  mini: {
    postcss: {
      pxtransform: { enable: true, config: {} }
    }
  },
  h5: {
    publicPath: "/",
    staticDirectory: "static",
    postcss: {
      autoprefixer: { enable: true }
    }
  }
});
