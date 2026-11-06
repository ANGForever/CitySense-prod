import { PropsWithChildren } from "react";
import { useDidHide, useDidShow } from "@tarojs/taro";
import "./app.scss";

/**
 * 入口只做全局样式挂载。
 * 地图 H5 在 web-view 里自己管理生命周期，这里不要缓存 WebView src 或
 * 在 App 层做 postMessage 桥接（design 3.3：它不是实时通道）。
 */
function App({ children }: PropsWithChildren) {
  useDidShow(() => {});
  useDidHide(() => {});
  return children;
}

export default App;
