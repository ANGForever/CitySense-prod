/**
 * 高德 JS API 2.0 的最小类型定义。
 *
 * 只声明本项目真正调用的成员：一是避免引入官方 d.ts 的体积，二是
 * 把「我们依赖了哪些能力」显式写下来 —— 升级 SDK 时比翻文档可靠。
 */

export type LngLat = [lng: number, lat: number];

export type AMapSize = {
  getWidth(): number;
  getHeight(): number;
};

export type AMapMapEvent = {
  lnglat?: { getLng(): number; getLat(): number };
  /** 相对地图容器的像素坐标。各版本语义不完全一致，优先用 originEvent。 */
  pixel?: { x: number; y: number };
  /** 原始 DOM 事件，clientX/clientY 是页面坐标，减容器 rect 一定正确 */
  originEvent?: { clientX?: number; clientY?: number };
};

export type AMapLngLatLike = { getLng(): number; getLat(): number };

export type AMapMap = {
  /**
   * 坐标转换与相机矩阵。
   *
   * 文档里写作 GLCustomLayer 回调的 `this.customCoords`，但实测这个 2.0 构建
   * 把它挂在 map 实例上，图层对象上并没有（属性名还被压缩过）。
   * 取值时三个来源都要试，见 Amap3DScene 的 readCustomCoords。
   */
  customCoords?: AMapCustomCoords;
  add(overlay: unknown): void;
  remove(overlay: unknown): void;
  on(event: string, handler: (event: AMapMapEvent) => void): void;
  off(event: string, handler?: (event: AMapMapEvent) => void): void;
  getSize(): AMapSize;
  getPitch(): number;
  getRotation(): number;
  getZoom(): number;
  getCenter(): AMapLngLatLike;
  setZoomAndCenter(
    zoom: number,
    center: LngLat,
    immediately?: boolean,
    duration?: number
  ): void;
  setPitch(pitch: number, immediately?: boolean): void;
  setRotation(rotation: number): void;
  /** 2.0 里 features 作为构造参数未必生效，创建后用 setFeatures 兜底 */
  setFeatures?(features: readonly string[]): void;
  setFitView(overlays?: unknown[], immediately?: boolean, avoid?: number[]): void;
  render(): void;
  resize(): void;
  destroy(): void;
};

/**
 * 地图驱动相机的期望形状（仅作文档契约）。
 * 实测 position/lookAt/up 也可能是 TypedArray，不可直接用 Array.isArray 判定；
 * 运行时归一化见 components/snow/amap/camera.ts。
 */
export type AMapCameraParams = {
  near: number;
  far: number;
  fov: number;
  up: [number, number, number];
  lookAt: [number, number, number];
  position: [number, number, number];
};

export type AMapCustomCoords = {
  setCenter(center: LngLat): void;
  lngLatsToCoords(lnglats: LngLat[]): number[][];
  /** 外部数据，形状随 SDK 构建变化；调用方必须先经 normalizeCameraParams */
  getCameraParams(): unknown;
};

/** 文档里 GLCustomLayer 的回调 this 指向图层实例，实际各版本不一致，运行时探测 */
export type GLLayerContext = {
  customCoords: AMapCustomCoords;
};

export type GLCustomLayerOptions = {
  zIndex?: number;
  init(this: unknown, gl: WebGLRenderingContext): void;
  render(this: unknown, gl: WebGLRenderingContext): void;
};

export type AMapNamespace = {
  Map: new (container: HTMLElement, options: Record<string, unknown>) => AMapMap;
  GLCustomLayer: new (options: GLCustomLayerOptions) => unknown;
  Polyline: new (options: Record<string, unknown>) => unknown;
  Marker?: new (options: Record<string, unknown>) => unknown;
};

export type AMapLoaderGlobal = {
  load(options: {
    key: string;
    version: string;
    plugins?: string[];
  }): Promise<AMapNamespace>;
};

declare global {
  interface Window {
    AMapLoader?: AMapLoaderGlobal;
    _AMapSecurityConfig?: {
      securityJsCode?: string;
      serviceHost?: string;
    };
  }
}
