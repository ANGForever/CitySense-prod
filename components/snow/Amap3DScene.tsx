"use client";

/**
 * 高德三维园区场景。
 *
 * 生命周期：加载配置 → 初始化地图 → 注册 GLCustomLayer →
 * 首次 render 时用 customCoords 校准坐标系并建场景 → 之后每帧只同步相机。
 *
 * 任何一步失败都通过 onDegrade 上报，由外壳切到二维示意图。三维不可用
 * 不等于功能不可用，对话与打卡必须继续可用。
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { Vector2 } from "three";
import type { SnowBootstrap } from "@/server/snow/types";
import {
  fetchMapConfig,
  hasWebGL,
  loadAmap
} from "@/components/snow/amap/loader";
import { normalizeCameraParams } from "@/components/snow/amap/camera";
import {
  FIXED_GATE_SIZE,
  FIXED_LAKE_SIZE
} from "@/components/snow/three/palette";
import {
  calibrate,
  createParkScene,
  type ParkSceneHandle,
  type ParkSceneObject
} from "@/components/snow/three/park-scene";
import { computeOverview, INITIAL_ZOOM } from "@/components/snow/map-view";
import {
  SNOW_MAP_FEATURES,
  SNOW_MAP_SKY_COLOR
} from "@/server/snow/map-config";
import type {
  AMapCustomCoords,
  AMapMap,
  AMapMapEvent,
  AMapNamespace,
  LngLat
} from "@/components/snow/amap/types";

const INITIAL_PITCH = 45;
const INITIAL_ROTATION = 0;
const FOCUS_ZOOM = 19;

/**
 * 三维初始化的阶段诊断。
 *
 * 三维不出来时，光看截图分不清是配置没拿到、SDK 没加载、图层没初始化，
 * 还是 customCoords 拿不到。这里把每个阶段挂到 window.__snow3d，
 * 排查时在控制台敲 __snow3d 即可，不用加断点。
 */
type Snow3dDiag = {
  phase: string;
  frames: number;
  width?: number;
  height?: number;
  hasCoords?: boolean;
  message?: string;
  calibration?: string;
  /** getCameraParams() 形状异常时的键名与类型快照 */
  camera?: string;
};

function report3d(phase: string, extra?: Partial<Snow3dDiag>): void {
  if (typeof window === "undefined") {
    return;
  }

  const holder = window as unknown as { __snow3d?: Snow3dDiag };
  const prev = holder.__snow3d;

  holder.__snow3d = {
    ...prev,
    frames: (prev?.frames ?? 0) + (phase === "render" ? 1 : 0),
    ...extra,
    phase
  };
}

export type SnowMapApi = {
  resetView(): void;
  zoomBy(delta: number): void;
  rotate(): void;
  togglePitch(): void;
  focusSpot(spotId: string): void;
};

type Props = {
  data: SnowBootstrap;
  selectedSpotId: string | null;
  selectedRouteId: string | null;
  category: string | null;
  onSelectSpot: (spotId: string | null) => void;
  onReady: () => void;
  onDegrade: (reason: string) => void;
  onApiReady: (api: SnowMapApi) => void;
};

function toLngLat(point: { longitude: number; latitude: number }): LngLat {
  return [point.longitude, point.latitude];
}

function buildObjects(data: SnowBootstrap): ParkSceneObject[] {
  const objects: ParkSceneObject[] = [];

  for (const spot of data.spots) {
    objects.push({
      id: spot.id,
      category: spot.category,
      kind: spot.id === "CT-NEWY-05" ? "camp" : spot.category === "prayer" ? "prayer" : spot.model?.kind ?? "ice-block",
      lngLat: toLngLat(spot.geo),
      widthMeters: spot.model?.widthMeters ?? 8,
      depthMeters: spot.model?.depthMeters ?? 8,
      heightMeters: spot.model?.heightMeters ?? 6
    });
  }

  for (const gate of data.gates) {
    objects.push({
      id: gate.id,
      category: "gate",
      kind: "gate",
      lngLat: toLngLat(gate.geo),
      ...FIXED_GATE_SIZE
    });
  }

  for (const lake of data.lakes) {
    objects.push({
      id: lake.id,
      category: "lake",
      kind: "lake",
      lngLat: toLngLat(lake.geo),
      ...FIXED_LAKE_SIZE
    });
  }

  return objects;
}

export function Amap3DScene({
  data,
  selectedSpotId,
  selectedRouteId,
  category,
  onSelectSpot,
  onReady,
  onDegrade,
  onApiReady
}: Props) {
  const labelsRef = useRef<HTMLDivElement | null>(null);
  const activeRef = useRef(selectedSpotId);
  const categoryRef = useRef(category);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<AMapMap | null>(null);
  const sceneRef = useRef<ParkSceneHandle | null>(null);
  const amapRef = useRef<AMapNamespace | null>(null);
  const layerRef = useRef<unknown>(null);
  const glRef = useRef<WebGLRenderingContext | null>(null);
  const routeOverlaysRef = useRef<unknown[]>([]);
  const selectRef = useRef(onSelectSpot);
  const degradeRef = useRef(onDegrade);
  const [readyTick, setReadyTick] = useState(0);

  useEffect(() => {
    selectRef.current = onSelectSpot;
  }, [onSelectSpot]);

  useEffect(() => {
    degradeRef.current = onDegrade;
  }, [onDegrade]);

  const center = toLngLat(data.park.center);

  useEffect(() => {
    let disposed = false;
    /**
     * 一旦判定降级就短路后续帧。
     * render 由 AMap 的渲染循环驱动，这里抛出的异常是未捕获的，
     * 会出现「每帧报错 + 每帧 setState」的双重抖动。
     */
    let halted = false;

    const degrade = (message: string) => {
      if (halted) {
        return;
      }

      halted = true;
      report3d("degraded", { message });
      degradeRef.current(message);
    };

    if (!hasWebGL()) {
      degrade("当前设备不支持 WebGL");
      return;
    }

    const container = containerRef.current;

    if (!container) {
      return;
    }

    let resizeObserver: ResizeObserver | null = null;
    let contextLostHandler: ((event: Event) => void) | null = null;
    /** 三维未在限定时间内建好就降级。地图静止时 render 不触发，不能靠帧数判断 */
    let readyGuard: ReturnType<typeof setTimeout> | null = null;
    /** 最近一次「拿不到可用坐标能力」的具体原因，降级时写进提示 */
    let coordsIssue = "地图未暴露 customCoords";
    /**
     * 相机参数形状异常时，首帧常常只是矩阵还没算出来。
     * 前几帧只记录诊断并跳过绘制，连续无效才降级，避免瞬时抖动误杀三维。
     */
    let invalidCameraFrames = 0;
    let cameraDiagnostic: string | null = null;
    const objects = buildObjects(data);

    async function boot() {
      try {
        report3d("boot");
        const config = await fetchMapConfig();

        if (disposed || halted) {
          return;
        }

        report3d("config");
        const AMap = await loadAmap(config);

        if (disposed || halted || !container) {
          return;
        }

        report3d("amap");
        amapRef.current = AMap;

        const map = new AMap.Map(container, {
          center,
          zoom: INITIAL_ZOOM,
          viewMode: "3D",
          pitch: INITIAL_PITCH,
          rotation: INITIAL_ROTATION,
          rotateEnable: true,
          pitchEnable: true,
          mapStyle: config.mapStyle,
          features: SNOW_MAP_FEATURES,
          showLabel: true,
          /** 全彩底图配淡蓝天空，原来那层浅青在绿地/黄路上会发灰 */
          skyColor: SNOW_MAP_SKY_COLOR,
          showBuildingBlock: true
        });

        mapRef.current = map;

        // 构造参数里的 features 在部分 2.0 构建里不生效，创建后显式设置一次。
        // setFeatures 是可选能力，缺失时不能让整条三维链路挂掉。
        try {
          mapRef.current.setFeatures?.(SNOW_MAP_FEATURES);
        } catch (error) {
          console.warn("[snow] setFeatures 不可用，保留构造参数", error);
        }

        report3d("map", { width: map.getSize().getWidth(), height: map.getSize().getHeight() });

        /**
         * GLCustomLayer 回调里的 this 在各 SDK 版本里不一定是图层实例，
         * 实测这个 2.0 构建把 customCoords 挂在 **map 实例** 上，
         * 图层对象里既没有 customCoords，属性名还被压缩过。
         *
         * 三个能力缺一不可：换算坐标、钉住原点、取相机参数。
         * 只检查 lngLatsToCoords 是不够的 —— 缺了后两个，调用点会每帧抛未捕获异常。
         */
        type LayerWithCoords = { customCoords?: Partial<AMapCustomCoords> };
        let layerInstance: LayerWithCoords | null = null;

        const COORDS_APIS = ["lngLatsToCoords", "setCenter", "getCameraParams"] as const;

        const coordsCandidates = (context: unknown) =>
          [
            map.customCoords as Partial<AMapCustomCoords> | undefined,
            (context as LayerWithCoords | undefined)?.customCoords,
            layerInstance?.customCoords
          ].filter((candidate): candidate is Partial<AMapCustomCoords> => Boolean(candidate));

        const readCustomCoords = (context: unknown): AMapCustomCoords | null => {
          for (const candidate of coordsCandidates(context)) {
            if (COORDS_APIS.every((api) => typeof candidate[api] === "function")) {
              return candidate as AMapCustomCoords;
            }
          }

          return null;
        };

        const describeCoordsIssue = (context: unknown): string => {
          const [first] = coordsCandidates(context);

          if (!first) {
            return "地图未暴露 customCoords";
          }

          const missing = COORDS_APIS.filter((api) => typeof first[api] !== "function");

          return missing.length > 0
            ? `customCoords 缺少 ${missing.join(" / ")}`
            : "customCoords 不可用";
        };

        const layer = new AMap.GLCustomLayer({
          zIndex: 110,

          init(gl) {
            glRef.current = gl;
          },

          render(context) {
            if (disposed || halted) {
              return;
            }

            const gl = glRef.current;

            if (!gl) {
              report3d("no-gl");
              return;
            }

            const size = map.getSize();
            const width = size.getWidth();
            const height = size.getHeight();
            const cc = readCustomCoords(context);

            report3d("render", { width, height, hasCoords: Boolean(cc) });

            if (!cc) {
              // 拿不到坐标能力就什么都画不了。降级判断放在 map.add(layer) 之后的
              // 定时器里做 —— 地图静止时 render 只在变化时触发，靠帧数计数会永远等不到。
              coordsIssue = describeCoordsIssue(context);
              report3d("no-coords", { width, height });

              if (width >= 2 && height >= 2) {
                map.resize();
              }

              return;
            }

            /**
             * 每帧把原点钉在园区中心。
             *
             * 模型顶点和相机矩阵必须引用同一个原点；customCoords 是地图级共享能力，
             * 其他叠加层可能重设它，所以这里不能只在建场景时设置一次。
             * 但设置本身要纳入异常保护：失败说明这个 SDK 的语义与预期不符，
             * 继续渲染只会得到错位的场景。
             */
            try {
              cc.setCenter(center);
            } catch (error) {
              degrade(
                `地图坐标原点设置失败：${error instanceof Error ? error.message : "未知错误"}`
              );
              return;
            }

            if (!sceneRef.current) {
              if (width < 2 || height < 2) {
                // 微信 WebView 首帧常为 0，等下一帧
                return;
              }

              let calibrationInfo = "";

              try {
                const calibration = calibrate(cc, center);

                calibrationInfo = JSON.stringify(calibration);

                sceneRef.current = createParkScene({
                  gl,
                  width,
                  height,
                  cc,
                  calibration,
                  objects,
                  categoryColors: Object.fromEntries(
                    data.categories.map((item) => [item.id, item.color])
                  )
                });
              } catch (error) {
                degrade(
                  error instanceof Error ? error.message : "三维场景初始化失败"
                );
                return;
              }

              contextLostHandler = (event) => {
                event.preventDefault();
                degrade("图形上下文丢失");
              };
              gl.canvas.addEventListener("webglcontextlost", contextLostHandler);

              if (readyGuard) {
                clearTimeout(readyGuard);
                readyGuard = null;
              }
              report3d("scene", {
                hasCoords: true,
                width,
                height,
                calibration: calibrationInfo
              });
              setReadyTick((tick) => tick + 1);
              onReady();
            }

            const scene = sceneRef.current;

            if (!scene) {
              return;
            }

            try {
              const checked = normalizeCameraParams(cc.getCameraParams());

              if (!checked.ok) {
                invalidCameraFrames += 1;

                if (!cameraDiagnostic) {
                  cameraDiagnostic = checked.diagnostic;
                  report3d("camera-shape", { camera: checked.diagnostic });
                  console.warn("[snow] getCameraParams 形状异常", checked.diagnostic);
                }

                // 地图刚初始化时相机矩阵可能还没算出来，前 5 帧只跳过绘制，
                // 连续无效才判定为真的不可用，并在提示里带上实际形状。
                if (invalidCameraFrames < 6) {
                  return;
                }

                degrade(`相机参数不可用：${checked.diagnostic.slice(0, 180)}`);
                return;
              }

              invalidCameraFrames = 0;

              scene.resize(width, height);
              scene.applyCamera(checked.params);
              scene.filter(categoryRef.current);
              scene.draw();
              const placed: {x:number;y:number}[] = [];
              const labels = [...(labelsRef.current?.querySelectorAll<HTMLElement>("[data-spot]") ?? [])];
              labels.sort((a, b) => Number(b.dataset.spot === activeRef.current) - Number(a.dataset.spot === activeRef.current));
              for (const el of labels) {
                const id = el.dataset.spot!;
                const point = scene.project(id);
                const selected = id === activeRef.current;
                const detail = map.getZoom() >= 17.3;
                const important = el.dataset.major === "true";
                const visible = point?.visible && (selected || detail || important) &&
                  point.x > 60 && point.x < width - 60 &&
                  point.y > (width < 700 ? 190 : 85) && point.y < height - (width < 700 ? 230 : 50) &&
                  !(width >= 700 && point.x < 400 && (point.y < 185 || point.y > height - 470)) &&
                  (selected || !placed.some(p => Math.abs(p.x - point.x) < 115 && Math.abs(p.y - point.y) < 35));
                el.style.display = visible ? "block" : "none";
                if (visible && point) {
                  el.style.transform = `translate(${point.x}px, ${point.y}px) translate(-50%, -100%)`;
                  el.classList.toggle("selected", selected);
                  placed.push(point);
                }
              }
            } catch (error) {
              degrade(
                error instanceof Error ? error.message : "相机同步失败"
              );
            }
          }
        });

        layerInstance = layer as unknown as LayerWithCoords;
        layerRef.current = layer;
        map.add(layer);
        report3d("layer-added");

        // 12 秒还没建出场景才算失败。底图瓦片与样式服务在弱网下可能要好几秒，
        // 阈值太短会把「慢」误判成「坏」。
        readyGuard = setTimeout(() => {
          if (!sceneRef.current && !disposed && !halted) {
            console.warn("[snow] 三维场景未就绪，降级为二维示意图。控制台执行 __snow3d 查看阶段");
            degrade(
              `三维场景未就绪：${coordsIssue}。底图样式服务不可达或被网络策略拦截时也会这样`
            );
          }
        }, 12000);

        const handleClick = (event: AMapMapEvent) => {
          const scene = sceneRef.current;

          if (!scene || !container) {
            return;
          }

          const rect = container.getBoundingClientRect();
          let px: number | undefined;
          let py: number | undefined;

          // originEvent 是页面坐标，减去容器 rect 一定正确；
          // e.pixel 的参照系各版本不一致，只作兜底。
          if (
            event.originEvent &&
            typeof event.originEvent.clientX === "number" &&
            typeof event.originEvent.clientY === "number"
          ) {
            px = event.originEvent.clientX - rect.left;
            py = event.originEvent.clientY - rect.top;
          } else if (event.pixel) {
            px = event.pixel.x;
            py = event.pixel.y;
          }

          if (px === undefined || py === undefined) {
            return;
          }

          const ndc = new Vector2(
            (px / Math.max(rect.width, 1)) * 2 - 1,
            -((py / Math.max(rect.height, 1)) * 2 - 1)
          );

          selectRef.current(scene.pick(ndc));
        };

        map.on("click", handleClick);

        resizeObserver = new ResizeObserver(() => {
          if (disposed || halted) {
            return;
          }

          const size = map.getSize();
          map.resize();
          sceneRef.current?.resize(size.getWidth(), size.getHeight());
        });
        resizeObserver.observe(container);

        onApiReady({
          zoomBy(delta) { map.setZoomAndCenter(Math.min(20, Math.max(14, map.getZoom() + delta)), [map.getCenter().getLng(), map.getCenter().getLat()], false, 260); },
          rotate() { map.setRotation((map.getRotation() + 45) % 360); },
          togglePitch() { map.setPitch(map.getPitch() > 10 ? 0 : INITIAL_PITCH, false); },
          resetView() {
            const current = mapRef.current;

            if (!current) {
              return;
            }

            current.setPitch(INITIAL_PITCH, false);
            current.setRotation(INITIAL_ROTATION);

            // 全园视角：按最外圈点位与门楼的包围盒、当前容器尺寸、上下/左侧 UI
            // 遮挡反推镜头；计算异常时 computeOverview 会回退到 OVERVIEW_ZOOM。
            const size = current.getSize();
            const overview = computeOverview(
              [
                ...data.spots.map((spot) => spot.geo),
                ...data.gates.map((gate) => gate.geo)
              ],
              { width: size.getWidth(), height: size.getHeight() },
              { fallbackCenter: center }
            );

            current.setZoomAndCenter(overview.zoom, overview.center, false, 400);
          },
          focusSpot(spotId: string) {
            const spot = data.spots.find((item) => item.id === spotId);
            const current = mapRef.current;

            if (!spot || !current) {
              return;
            }

            current.setZoomAndCenter(FOCUS_ZOOM, toLngLat(spot.geo), false, 420);
          }
        });

      } catch (error) {
        degrade(
          error instanceof Error ? error.message : "三维地图加载失败"
        );
      }
    }

    void boot();

    return () => {
      disposed = true;
      resizeObserver?.disconnect();

      if (readyGuard) {
        clearTimeout(readyGuard);
        readyGuard = null;
      }

      const gl = glRef.current;

      if (gl && contextLostHandler) {
        gl.canvas.removeEventListener("webglcontextlost", contextLostHandler);
      }

      routeOverlaysRef.current = [];
      sceneRef.current?.dispose();
      sceneRef.current = null;

      const map = mapRef.current;

      if (map) {
        if (layerRef.current) {
          try {
            map.remove(layerRef.current);
          } catch {
            // 图层已被地图销毁时忽略
          }
        }
        map.destroy();
      }

      mapRef.current = null;
      layerRef.current = null;
      glRef.current = null;
      amapRef.current = null;
    };
    // 只在挂载时建立地图；选中态由下方 effect 处理
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 选中态同步到三维场景
  useEffect(() => {
    activeRef.current = selectedSpotId;
    sceneRef.current?.select(selectedSpotId);
    mapRef.current?.render();
  }, [selectedSpotId, readyTick]);

  useEffect(() => {
    categoryRef.current = category;
    sceneRef.current?.filter(category);
    mapRef.current?.render();
  }, [category]);

  // 路线高亮：用 AMap.Polyline，天然贴地且能带方向箭头
  useEffect(() => {
    const map = mapRef.current;
    const AMap = amapRef.current;

    if (!map || !AMap || readyTick === 0) {
      return;
    }

    if (routeOverlaysRef.current.length > 0) {
      map.remove(routeOverlaysRef.current);
      routeOverlaysRef.current = [];
    }

    const route = selectedRouteId
      ? data.routes.find((item) => item.id === selectedRouteId)
      : undefined;

    if (!route) {
      return;
    }

    const path = route.polyline.map(toLngLat);

    const glow = new AMap.Polyline({
      path,
      strokeColor: "#ffffff",
      strokeWeight: 18,
      strokeOpacity: 0.9,
      lineJoin: "round",
      lineCap: "round",
      zIndex: 55
    });

    const core = new AMap.Polyline({
      path,
      strokeColor: "#087f7a",
      strokeWeight: 7,
      strokeOpacity: 0.95,
      lineJoin: "round",
      lineCap: "round",
      showDir: true,
      zIndex: 56
    });

    map.add([glow, core]);
    routeOverlaysRef.current = [glow, core];
    map.setFitView([core], false, [72, 72, 120, 72]);
  }, [selectedRouteId, readyTick, data.routes]);

  const focus = useCallback((spotId: string) => {
    const spot = data.spots.find((item) => item.id === spotId);

    if (!spot || !mapRef.current) {
      return;
    }

    mapRef.current.setZoomAndCenter(FOCUS_ZOOM, toLngLat(spot.geo), false, 420);
  }, [data.spots]);

  useEffect(() => {
    if (selectedSpotId) {
      focus(selectedSpotId);
    }
  }, [selectedSpotId, focus, readyTick]);

  return <>
    <div ref={containerRef} style={{ position: "absolute", inset: 0 }} />
    <div ref={labelsRef} className="snow-map-labels">
      {data.spots.map(spot => <button key={spot.id} data-spot={spot.id}
        data-major={spot.id === "CT-CORE-01" || spot.id === "CT-PLAY-01" || spot.id === "CT-NEWY-05" || spot.id === "CT-LANT-09"}
        className="snow-map-label" style={{display:"none"}}
        onClick={() => onSelectSpot(spot.id)}><i />{spot.name}</button>)}
      {data.gates.map(gate => <span key={gate.id} data-spot={gate.id} data-major="true" className="snow-map-label gate" style={{display:"none"}}>↳ {gate.name}</span>)}
    </div>
  </>;
}
