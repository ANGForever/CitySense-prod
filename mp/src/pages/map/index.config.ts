export default definePageConfig({
  navigationBarTitleText: "3D 园区地图",
  // web-view 铺满页面，原生的 navigationBar 会占掉顶部空间，
  // 真机联调时若需全屏可改为 custom，但先保留系统返回按钮便于演示回退。
  navigationStyle: "default",
  disableScroll: true
});
