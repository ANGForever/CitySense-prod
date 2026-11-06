import { defineConfig, globalIgnores } from "eslint/config";
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

export default defineConfig([
  ...nextCoreWebVitals,
  ...nextTypescript,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    // Taro 子工程自带自己的 lint 配置，不参与 Next 的规则集
    "mp/**",
    // 打卡系统的本地文件后端
    ".data/**",
    "next-env.d.ts"
  ])
]);
