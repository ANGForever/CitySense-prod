export default defineAppConfig({
  pages: [
    "pages/index/index",
    "pages/map/index",
    "pages/spot/index",
    "pages/social/index",
    "pages/scan/index",
    "pages/entry-error/index"
  ],
  window: {
    backgroundTextStyle: "light",
    navigationBarBackgroundColor: "#8e2b26",
    // 导航栏用短名，全称放在门户主视觉与页脚
    navigationBarTitleText: "青唐冰雪烩",
    navigationBarTextStyle: "white",
    backgroundColor: "#f7f2e8",
    enablePullDownRefresh: false
  },
  // 不使用 tabBar：web-view 必须独占整个页面，原生 tab 会遮挡 H5 内控件
  style: "v2"
});
